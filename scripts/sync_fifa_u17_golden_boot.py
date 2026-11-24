from playwright.sync_api import sync_playwright
import json, pathlib, re, datetime

URL = "https://www.fifa.com/en/tournaments/mens/u17worldcup/qatar-2026/statistics/player-statistics"
OUT = pathlib.Path("data/fifa-u17-2026-golden-boot.json")
def extract(page):
    return page.evaluate("""() => {
      const result=[];
      for(const table of document.querySelectorAll('table,[role=table],[role=grid]')){
        const rows=[...table.querySelectorAll('tr,[role=row]')];
        const headers=rows.find(r=>/goals/i.test(r.innerText)&&/assists/i.test(r.innerText)&&/minutes/i.test(r.innerText));
        if(!headers)continue;
        const h=[...headers.querySelectorAll('th,td,[role=columnheader],[role=cell]')].map(x=>x.innerText.toLowerCase());
        const idx=s=>h.findIndex(x=>x.includes(s));
        for(const row of rows){
          const c=[...row.querySelectorAll('td,[role=cell],[role=gridcell]')].map(x=>x.innerText.trim());
          if(c.length<h.length)continue;
          const player=c[idx('player')], goals=c[idx('goals')], assists=c[idx('assists')], minutes=c[idx('minutes')];
          if(player&&[goals,assists,minutes].every(x=>/^\\d+$/.test(x||'')))result.push({player,goals:+goals,assists:+assists,minutes:+minutes});
        }
      }
      return result;
    }""")
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={"width":1920,"height":1080},locale="en-US")
    page.goto(URL,wait_until="domcontentloaded",timeout=90000)
    page.get_by_text("adidas Golden Boot",exact=False).first.wait_for(timeout=90000)
    page.get_by_text("adidas Golden Boot",exact=False).first.click()
    page.wait_for_timeout(4000)
    results={}
    for _ in range(100):
        for r in extract(page):
            parts=r["player"].splitlines()
            team=re.search(r"\b([A-Z]{3})\s+(?:FW|MF|DF|GK)\b",r["player"])
            if not team: continue
            name=parts[0].strip()
            results[(team[1],name)]={"name":name,"team":team[1],"goals":r["goals"],"assists":r["assists"],"minutes":r["minutes"]}
        more=page.get_by_role("button",name=re.compile(r"^(show more|load more|view more|next(?: page)?)$",re.I))
        if more.count() and more.last.is_visible() and more.last.is_enabled():
            more.last.click();page.wait_for_timeout(1500)
        else:
            break
    browser.close()
if len(results)<3: raise RuntimeError("FIFA table not parsed; preserving previous snapshot")
players=sorted(results.values(),key=lambda r:(-r["goals"],-r["assists"],r["minutes"],r["name"]))
if OUT.exists():
    old=json.loads(OUT.read_text())
    if len(players)<len(old.get("players",[])): raise RuntimeError("Coverage decreased; preserving previous snapshot")
    if old.get("players")==players:
        print("No changes");raise SystemExit(0)
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps({"source":URL,"updatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"players":players,"coverage":"extracted rows; completeness not certified"},ensure_ascii=False,indent=2)+"\n")
print(f"Extracted {len(players)} FIFA player rows")
