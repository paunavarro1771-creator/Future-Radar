#!/usr/bin/env python3
"""Collect *published* FIFA U17 scores from FIFA's official player-of-the-match list.
No paid API; no fabricated scores; fail closed on ambiguous matches.
"""
import json,re,unicodedata,datetime
from pathlib import Path
import requests
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
FIXTURES=json.loads((ROOT/'u17-world-cup-2026.json').read_text())
DEST=ROOT/'data/fifa-u17-2026-official-results.json'
URL='https://www.fifa.com/en/tournaments/mens/u17worldcup/qatar-2026/articles/every-player-of-the-match-doha'
MONTHS={'noviembre':11,'diciembre':12,'november':11,'december':12}
ALIASES={
 'korea republic':'KOR','republic of ireland':'IRL','cote divoire':'CIV','china pr':'CHN','saudi arabia':'KSA','new caledonia':'NCL','new zealand':'NZL','dominican republic':'DOM','tajikistan':'TJK','fiji':'FIJ','morocco':'MAR','algeria':'ALG','cameroon':'CMR','ivory coast':'CIV','haiti':'HAI','mozambique':'MOZ','croatia':'CRO','tanzania':'TAN','uzbekistan':'UZB','montenegro':'MNE','romania':'ROU','serbia':'SRB','honduras':'HON','vietnam':'VIE','uganda':'UGA','ecuador':'ECU','australia':'AUS','denmark':'DEN','greece':'GRE','egypt':'EGY','panama':'PAN','qatar':'QAT','argentina':'ARG','uruguay':'URU','france':'FRA','spain':'ESP','italy':'ITA','jamaica':'JAM','senegal':'SEN','belgium':'BEL','mali':'MLI','mexico':'MEX','brazil':'BRA','japan':'JPN','colombia':'COL','chile':'CHI','venezuela':'VEN','costa rica':'CRC','cuba':'CUB',
 'republica de corea':'KOR','rp china':'CHN','china pr':'CHN','china':'CHN',
 'catar':'QAT','qatar':'QAT','costa de marfil':'CIV','cote d ivoire':'CIV',
 'republica de irlanda':'IRL','irlanda':'IRL','arabia saudi':'KSA',
 'republica dominicana':'DOM','corea del sur':'KOR',
 'nueva zelanda':'NZL','nueva caledonia':'NCL','fiyi':'FIJ',
 'tayikistan':'TJK','uzbekistan':'UZB','montenegro':'MNE',
 'argelia':'ALG','tanzania':'TAN','haiti':'HAI','marruecos':'MAR',
 'vietnam':'VIE','croacia':'CRO','belgica':'BEL','brasil':'BRA',
 'japon':'JPN','espana':'ESP','francia':'FRA','mexico':'MEX',
 'serbia':'SRB','honduras':'HON','venezuela':'VEN','rumania':'ROU',
 'chile':'CHI','colombia':'COL','mali':'MLI','senegal':'SEN',
 'uganda':'UGA','ecuador':'ECU','egipto':'EGY','grecia':'GRE',
 'panama':'PAN','argentina':'ARG','australia':'AUS',
 'mozambique':'MOZ','dinamarca':'DEN','uruguay':'URU',
 'jamaica':'JAM','cuba':'CUB','italia':'ITA','costa rica':'CRC',
 'camerun':'CMR'
}
def norm(s):
 s=unicodedata.normalize('NFKD',s.lower())
 return re.sub(r'[^a-z0-9 ]','', ''.join(c for c in s if not unicodedata.combining(c))).strip()
for t in FIXTURES['teams']:ALIASES[norm(t['name'])]=t['code']
def parse_html(html):
 soup=BeautifulSoup(html,'html.parser')
 for node in soup(['script','style','nav','footer']):node.decompose()
 lines=[re.sub(r'\s+',' ',s).strip() for s in soup.get_text('\n').splitlines()]
 lines=[s for s in lines if s]
 results={}
 date=None
 for line in lines:
  day=re.search(r'(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d{1,2})\s+de\s+(noviembre|diciembre)',norm(line))
  if day:date='2026-%02d-%02d'%(MONTHS[day.group(2)],int(day.group(1)))
  if not date:continue
  # Official FIFA lines: Grupo A: Egipto 1-2 Grecia - Player (Greece)
  m=re.search(r'Group\s+([A-L])\s*:\s*(.+?)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(.+?)\s*[|–-]\s*.+',line,re.I)
  if not m:continue
  group,h,hs,aws,a=m.groups()
  hc,ac=ALIASES.get(norm(h)),ALIASES.get(norm(a))
  if not hc or not ac:continue
  matching=[f for f in FIXTURES['matches'] if f['date']==date and f.get('stage')=='group' and f['home']==hc and f['away']==ac]
  if len(matching)!=1:continue
  k=f'{date}:{hc}:{ac}'
  results[k]={'matchKey':k,'date':date,'homeCode':hc,'awayCode':ac,'homeScore':int(hs),'awayScore':int(aws),'status':'FT','sourceUrl':URL,'sourceType':'official_fifa_article'}
 return results
def main():
 response=requests.get(URL,headers={'User-Agent':'FutureRadarFC/1.0 (public official FIFA results)'},timeout=45)
 response.raise_for_status()
 incoming=parse_html(response.text)
 if len(incoming)<20:raise SystemExit(f'Only {len(incoming)} official results parsed; refusing to overwrite')
 old={}
 if DEST.exists():old={x['matchKey']:x for x in json.loads(DEST.read_text()).get('results',[])}
 for k,v in incoming.items():
  if k in old and (old[k]['homeScore'],old[k]['awayScore'])!=(v['homeScore'],v['awayScore']):
   raise SystemExit(f'Conflicting official result {k}: manual review required')
 old.update(incoming)
 payload={'competitionId':'fifa-u17-world-cup-2026','source':URL,'coverage':'published_only','results':sorted(old.values(),key=lambda x:x['matchKey'])}
 DEST.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
 print(f'Official FIFA results: {len(incoming)} parsed, {len(old)} total')
if __name__=='__main__':main()
