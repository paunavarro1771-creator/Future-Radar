#!/usr/bin/env python3
"""Import published FIFA U17 2026 post-match PDF summaries. Requires requests, beautifulsoup4, pymupdf."""
import json,re,sys,datetime
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
import fitz

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'data/fifa-u17-2026-official-match-reports.json'
HUB='https://www.fifatrainingcentre.com/en/game/tournaments/fu17wc/2026/match-report-hub-2026.php'
BASE='https://www.fifatrainingcentre.com'
UA={'User-Agent':'FutureRadarFC/1.0 (+https://www.futureradar.es; public FIFA report index)'}
METRICS=[
 ('xG','xG (Expected Goals)',r'(\d+(?:\.\d+)?)\s+xG \(Expected Goals\)\s+(\d+(?:\.\d+)?)'),
 ('Remates','Attempts at Goal (On Target)',r'(\d+) \((\d+)\) Attempts at Goal \(On Target\) (\d+) \((\d+)\)'),
 ('Pases','Total Passes (Complete)',r'(\d+) \((\d+)\) Total Passes \(Complete\) (\d+) \((\d+)\)'),
 ('Precisión de pase','Pass Completion %',r'(\d+)\s*% Pass Completion % (\d+)\s*%'),
 ('Centros','Crosses',r'(\d+) Crosses (\d+)'),
 ('Progresiones de balón','Ball Progressions',r'(\d+) Ball Progressions (\d+)'),
 ('Recuperaciones forzadas','Forced Turnovers',r'(\d+) Forced Turnovers (\d+)'),
 ('Distancia recorrida','Total Distance Covered',r'(\d+(?:\.\d+)?) km Total Distance Covered (\d+(?:\.\d+)?) km'),
]
def get(url,timeout=40):
 r=requests.get(url,headers=UA,timeout=timeout);r.raise_for_status();return r
def parse(pdf,url):
 doc=fitz.open(stream=pdf,filetype='pdf')
 if len(doc)<3:raise ValueError('Report has fewer than 3 pages')
 cover=' '.join(doc[0].get_text().split())
 summary=' '.join(doc[2].get_text().split())
 m=re.search(r'([A-Za-z][A-Za-z .’\'-]+?)\s+(\d+)\s*[-–]\s*(\d+)\s+([A-Za-z][A-Za-z .’\'-]+?)\s+Group\s+([A-L])\s*[-–]\s*Match\s+(\d+)',cover)
 if not m:raise ValueError('Unrecognized FIFA report cover: '+cover[:140])
 date=re.search(r'(\d{1,2}) (November|December) 2026',cover)
 if not date:raise ValueError('Match date missing')
 dt=datetime.datetime.strptime(date.group(0),'%d %B %Y').strftime('%Y-%m-%d')
 filematch=re.search(r'PMSR-M(\d+)-([A-Z]{3})-V-([A-Z]{3})\.pdf',url,re.I)
 if not filematch:raise ValueError('Filename missing team codes')
 home,away=filematch.group(2).upper(),filematch.group(3).upper()
 stats=[{'name':'Goles','home':int(m.group(2)),'away':int(m.group(3))}]
 for name,_,pattern in METRICS:
  x=re.search(pattern,summary,re.I)
  if x:
   a,b=(x.group(1),x.group(3)) if name in ('Remates','Pases') else (x.group(1),x.group(2))
   if name=='Precisión de pase':a+='%' ;b+='%'
   if name=='Distancia recorrida':a+=' km';b+=' km'
   stats.append({'name':name,'home':a,'away':b})
   if name=='Remates':
    stats.append({'name':'Remates a puerta','home':int(x.group(2)),'away':int(x.group(4))})
   if name=='Pases':
    stats.append({'name':'Pases completados','home':int(x.group(2)),'away':int(x.group(4))})
 if len(stats)<4:raise ValueError('Too few verified metrics: '+str(len(stats)))
 return {'matchKey':f'{dt}:{home}:{away}','date':dt,'homeCode':home,'awayCode':away,
 'homeScore':int(m.group(2)),'awayScore':int(m.group(3)),'status':'FT',
 'source':'FIFA Training Centre','sourceType':'official_fifa_post_match_summary',
 'sourceUrl':url,'matchNumber':int(filematch.group(1)),'statistics':stats,
 'lineups':None,'incidents':[],'notes':'Automated import of team statistics; starting XIs and player-level tables require separate verification.'}
def main():
 existing=json.loads(DEST.read_text())
 old={x['matchKey']:x for x in existing.get('reports',[])}
 soup=BeautifulSoup(get(HUB).text,'html.parser')
 links=sorted(set(urljoin(BASE,a.get('href')) for a in soup.select('a[href]') if re.search(r'/PMSR-M\d+-[A-Z]{3}-V-[A-Z]{3}\.pdf(?:\?.*)?$',a.get('href',''),re.I)))
 if not links:raise SystemExit('No FIFA PDF links discovered: refusing to overwrite')
 failures=[]
 def download_and_parse(url):
  return parse(get(url,timeout=65).content,url)
 # Process all published PDFs in one batch instead of sequential requests.
 with ThreadPoolExecutor(max_workers=8) as pool:
  jobs={pool.submit(download_and_parse,url):url for url in links}
  for future in as_completed(jobs):
   url=jobs[future]
   try:
    report=future.result()
    prev=old.get(report['matchKey'])
    if prev and prev.get('sourceUrl')==url:
     if prev.get('lineups'):report['lineups']=prev['lineups']
     if prev.get('incidents'):report['incidents']=prev['incidents']
    old[report['matchKey']]=report
    print('OK',report['matchKey'],len(report['statistics']),'stats',flush=True)
   except Exception as e:
    failures.append({'url':url,'error':str(e)[:180]})
    print('SKIP',url,str(e)[:150],file=sys.stderr,flush=True)
 if not old:raise SystemExit('No verified reports: refusing to overwrite')
 result={'competitionId':'fifa-u17-world-cup-2026','importMethod':'FIFA public post-match PDF; first and third pages parsed; unverified fields omitted','coverage':'partial','reports':sorted(old.values(),key=lambda x:(x['date'],x['matchNumber']))}
 DEST.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'pdfLinks':len(links),'reports':len(old),'failed':len(failures),'errors':failures},ensure_ascii=False))
if __name__=='__main__':main()
