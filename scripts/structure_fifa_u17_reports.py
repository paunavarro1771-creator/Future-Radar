#!/usr/bin/env python3
"""Build validated match data from official FIFA PDF evidence.

Only emits events when player, minute, team and event type are explicit.
Ambiguous PDF text remains unstructured rather than fabricating details.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "data/fifa-u17-2026-pdf-evidence.json"
REPORTS = ROOT / "data/fifa-u17-2026-official-match-reports.json"
OUTPUT = ROOT / "data/fifa-u17-2026-pdf-structured.json"
# Actual FIFA report layout: cover, Match Summary - Teams, Attempts at Goal.
COVER = re.compile(r"^(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$", re.M)
HOME = re.compile(r"(?:^|[ \t]{2,})(\d{1,2})[ \t]+(GK|DF|MF|FW)[ \t]+([^\n]+?)(?=[ \t]{2,}|$)", re.M)
AWAY = re.compile(r"(?:^|[ \t]{2,})([^\W\d_][^\n]*?)[ \t]+(GK|DF|MF|FW)[ \t]+(\d{1,2})(?=[ \t]|$)", re.M)
SHOT = re.compile(r"^\s*(\d{1,3})\s+(\d{1,2})\s+(.+?)\s{2,}(?:Deflected )?On Target - Goal(?:\s{2,}|$)")
def starters(page):
    if "Match Summary - Teams" not in page or "SUBSTITUTES" not in page:
        return None
    block = page.split("SUBSTITUTES", 1)[0]
    home = [{"number": int(n), "position": pos, "name": name.strip()}
            for n,pos,name in HOME.findall(block)]
    away = [{"number": int(n), "position": pos, "name": re.split(r"[ \t]{2,}", name)[-1].strip()}
            for name,pos,n in AWAY.findall(block)]
    def valid(players):
        return (len(players) == 11 and len({p["number"] for p in players}) == 11
                and sum(p["position"] == "GK" for p in players) == 1
                and all(re.fullmatch(r"[^\W\d_][^\d\n]*", p["name"]) for p in players))
    return {"home": home, "away": away} if valid(home) and valid(away) else None

def extract(report, official):
    pages = report.get("pages") or []
    cover = COVER.search(pages[0]) if pages else None
    events = []
    xi = None
    if cover and (int(cover[2]), int(cover[3])) == (official["homeScore"], official["awayScore"]):
        teams = {cover[1].strip(): official["homeCode"], cover[4].strip(): official["awayCode"]}
        xi = next((x for p in pages[:3] if (x := starters(p))), None)
        for page in pages:
            header = re.search(r"Attempts at Goal[ \t]+([^\n]+)", page)
            if not header or not re.search(r"Time\s+Player\s+Outcome", page):
                continue
            team = teams.get(header[1].strip())
            if not team:
                continue
            for line in page.splitlines():
                m = SHOT.match(line)
                if not m or int(m[1]) > 130:
                    continue
                event = {"type":"goal", "minute":int(m[1]), "number":int(m[2]),
                         "player":m[3].strip(), "team":team, "sourceUrl":report["sourceUrl"],
                         "minuteConvention":"FIFA attempts-at-goal table"}
                if event not in events:
                    events.append(event)
    events.sort(key=lambda e:e["minute"])
    complete = (sum(e["team"] == official["homeCode"] for e in events) == official["homeScore"]
                and sum(e["team"] == official["awayCode"] for e in events) == official["awayScore"])
    stats = official.get("statistics") or []
    return {"matchKey":report["matchKey"], "matchNumber":report["matchNumber"],
            "sourceUrl":report["sourceUrl"], "statistics":stats,
            "incidents":events if complete else [], "lineups":xi,
            "statisticsVerified":bool(stats), "goalEventsVerified":complete,
            "lineupsVerified":bool(xi)}

def main():
    source = json.loads(EVIDENCE.read_text(encoding="utf-8"))
    reports = json.loads(REPORTS.read_text(encoding="utf-8"))
    by_key = {r["matchKey"]: r for r in reports["reports"]}
    matches = [extract(r, by_key[r["matchKey"]]) for r in source["reports"]
               if r["matchKey"] in by_key]
    output = {"competitionId": "fifa-u17-world-cup-2026",
              "method": "verified PDF evidence plus existing official team statistics",
              "matches": sorted(matches, key=lambda m: m["matchNumber"])}
    new = json.dumps(output, ensure_ascii=False, indent=2) + "\n"
    if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != new:
        OUTPUT.write_text(new, encoding="utf-8")
    print(f"Structured FIFA matches: {len(matches)}; with statistics: {sum(bool(m['statistics']) for m in matches)}; verified goal timelines: {sum(m['goalEventsVerified'] for m in matches)}; complete lineups: {sum(m['lineupsVerified'] for m in matches)}")
if __name__ == "__main__":
    main()
