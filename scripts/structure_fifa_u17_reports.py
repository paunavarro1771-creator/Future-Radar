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
# Accept explicit player goal lines, not inferred goals from statistical tables.
GOAL = re.compile(
    r"^\\s*(?:(?P<minute>\\d{1,3})(?:\\+\\d{1,2})?['’]\\s+)"
    r"(?P<player>[A-Za-zÀ-ž][A-Za-zÀ-ž .'-]{2,60})\\s+"
    r"(?P<team>[A-Z]{3})\\s+(?:GOAL|Goal|Gol)\\s*$"
)
def extract(report, official):
    pages = report.get("pages") or []
    events = []
    for page in pages:
        for line in page.splitlines():
            m = GOAL.fullmatch(line.strip())
            if not m:
                continue
            minute = int(m.group("minute"))
            team = m.group("team")
            if minute > 130 or team not in (official["homeCode"], official["awayCode"]):
                continue
            event = {"type": "goal", "minute": minute,
                     "player": m.group("player").strip(), "team": team,
                     "sourceUrl": report["sourceUrl"]}
            if event not in events:
                events.append(event)
    # Do not publish a partial or inconsistent goal sequence.
    if (sum(e["team"] == official["homeCode"] for e in events) != official["homeScore"]
            or sum(e["team"] == official["awayCode"] for e in events) != official["awayScore"]):
        events = []
    stats = official.get("statistics") or []
    return {"matchKey": report["matchKey"], "matchNumber": report["matchNumber"],
            "sourceUrl": report["sourceUrl"], "statistics": stats,
            "incidents": events, "lineups": None,
            "statisticsVerified": bool(stats),
            "goalEventsVerified": bool(events) or (official["homeScore"] == official["awayScore"] == 0),
            "lineupsVerified": False}

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
    print(f"Structured FIFA matches: {len(matches)}; with statistics: {sum(bool(m['statistics']) for m in matches)}; verified goal timelines: {sum(m['goalEventsVerified'] for m in matches)}; complete lineups: 0")
if __name__ == "__main__":
    main()
