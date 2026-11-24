from playwright.sync_api import sync_playwright
import json, pathlib, re, datetime
from urllib.parse import urlsplit

def safe_url(url):
    u=urlsplit(url)
    return u.scheme+'://'+u.netloc+u.path

def inspect_response(response):
    if response.request.resource_type not in ('xhr','fetch'): return
    print('NETWORK',response.status,safe_url(response.url),flush=True)
    if response.status != 200 or 'json' not in response.headers.get('content-type','').lower(): return
    try:
        data=response.json()
        def walk(obj,depth=0):
            if depth>8: return
            if isinstance(obj,dict):
                keys=list(obj.keys())
                if any(re.search(r'goal|assist|minute|player',str(k),re.I) for k in keys):
                    print('JSON schema',safe_url(response.url),str(keys)[:500],flush=True)
                for v in list(obj.values())[:30]: walk(v,depth+1)
            elif isinstance(obj,list) and obj: walk(obj[0],depth+1)
        walk(data)
    except Exception as e: print('JSON inspection failed',type(e).__name__,flush=True)


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
    page.on("response", inspect_response)
    page.on("requestfailed", lambda req: print("FAILED",safe_url(req.url),req.failure,flush=True) if req.resource_type in ("xhr","fetch") else None)
    page.on("pageerror", lambda err: print("PAGE ERROR",str(err)[:300],flush=True))
    page.goto(URL,wait_until="domcontentloaded",timeout=90000)
    page.get_by_text("adidas Golden Boot",exact=False).first.wait_for(timeout=90000)
    # Dismiss OneTrust using its consent controls, not by bypassing the overlay.
    reject = page.locator("#onetrust-reject-all-handler, #reject-recommended-btn-handler")
    if reject.count() and reject.first.is_visible():
        reject.first.click(timeout=10000)
    else:
        settings = page.locator("#onetrust-pc-btn-handler")
        if settings.count() and settings.first.is_visible():
            settings.first.click(timeout=10000)
            save = page.locator(".save-preference-btn-handler")
            if save.count() and save.first.is_visible():
                save.first.click(timeout=10000)
        elif page.locator(".save-preference-btn-handler").count() and page.locator(".save-preference-btn-handler").first.is_visible():
            page.locator(".save-preference-btn-handler").first.click(timeout=10000)
    # Golden Boot is the default tab; no click is necessary if its table is already present.
    page.wait_for_timeout(2000)
    if not extract(page):
        page.get_by_text("adidas Golden Boot",exact=False).first.click(timeout=15000)
    for _ in range(60):
        if extract(page):
            break
        page.wait_for_timeout(1000)
    print("Initial table rows:", len(extract(page)))
    print("Table count:",page.locator('table,[role=table],[role=grid]').count())
    print("Body excerpt:",page.locator('body').inner_text(timeout=10000)[:2200])
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
if len(results)<3:
    raise RuntimeError("FIFA Golden Boot rows unavailable or not parsed; previous snapshot preserved")
players=sorted(results.values(),key=lambda r:(-r["goals"],-r["assists"],r["minutes"],r["name"]))
if OUT.exists():
    old=json.loads(OUT.read_text())
    if len(players)<len(old.get("players",[])): raise RuntimeError("Coverage decreased; preserving previous snapshot")
    if old.get("players")==players:
        print("No changes");raise SystemExit(0)
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps({"source":URL,"updatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"players":players,"coverage":"extracted rows; completeness not certified"},ensure_ascii=False,indent=2)+"\n")
print(f"Extracted {len(players)} FIFA player rows")
