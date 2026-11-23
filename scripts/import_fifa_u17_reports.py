#!/usr/bin/env python3
"""Conservative FIFA U17 2026 official report importer.

Only updates score/source for reports linked from the official FIFA hub and
verified against the match number, teams and the PDF's first-page score.
Never invents lineups, goals, minutes or statistics.
"""
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
HUB = "https://www.fifatrainingcentre.com/en/game/tournaments/fu17wc/2026/match-report-hub-2026.php"
REPORTS = ROOT / "data/fifa-u17-2026-official-match-reports.json"
FIXTURES = ROOT / "u17-world-cup-2026.json"
PATTERN = re.compile(r"PMSR-M(\d{1,3})-([A-Z]{3})-V-([A-Z]{3})\.pdf$", re.I)
HEADERS = {"User-Agent": "FutureRadarFC-OfficialReportIndexer/1.0 (+https://www.futureradar.es)"}


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        url = dict(attrs).get("href", "")
        if PATTERN.search(urlparse(url).path):
            self.urls.append(urljoin(HUB, url))


def download(url):
    if urlparse(url).hostname != "www.fifatrainingcentre.com":
        raise ValueError("Untrusted report host")
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=20) as response:
        data = response.read(8_000_001)
    if len(data) > 8_000_000 or not data.startswith(b"%PDF"):
        raise ValueError("Invalid or oversized FIFA PDF")
    return data


def verified_score(pdf, home, away):
    with pymupdf.open(stream=pdf, filetype="pdf") as doc:
        text = doc[0].get_text(sort=True)
    # FIFA report headers have the full team names, not necessarily 3-letter codes.
    # Accept a score only if the first-page summary contains exactly one result.
    first = text[:1800]
    scores = re.findall(r"(?<!\d)(\d{1,2})\s*[–—-]\s*(\d{1,2})(?!\d)", first)
    return tuple(map(int, scores[0])) if len(scores) == 1 else None


def main():
    fixture_list = json.loads(FIXTURES.read_text(encoding="utf-8"))["matches"]
    by_number = {int(m["number"]): m for m in fixture_list if m.get("number") is not None}
    archive = json.loads(REPORTS.read_text(encoding="utf-8"))
    existing = {r["matchKey"]: r for r in archive["reports"]}
    request = urllib.request.Request(HUB, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=25) as response:
        html = response.read(4_000_000).decode("utf-8", "replace")
    links = Links()
    links.feed(html)
    accepted = 0
    found = len(set(links.urls))
    matched = 0
    downloaded = 0
    parsed = 0
    skipped_existing = 0
    skipped_fixture = 0
    failures = 0
    verified_existing = False
    audit_all = '--audit-all' in sys.argv
    audit = []
    print(f"FIFA report links found in hub: {found}", flush=True)
    for url in sorted(set(links.urls)):
        match = PATTERN.search(urlparse(url).path)
        if not match:
            continue
        number, home, away = int(match[1]), match[2].upper(), match[3].upper()
        fixture = by_number.get(number)
        if not fixture or (fixture.get("home"), fixture.get("away")) != (home, away):
            skipped_fixture += 1
            continue
        matched += 1
        key = f"{fixture['date']}:{home}:{away}"
        is_existing = key in existing
        if is_existing and verified_existing and not audit_all:
            skipped_existing += 1
            continue
        try:
            pdf = download(url)
            downloaded += 1
            score = verified_score(pdf, home, away)
            parsed += 1
            audit.append({'matchNumber':number,'matchKey':key,'downloaded':True,'parsed':True,'scoreDetected':score is not None,'alreadyRegistered':is_existing})
        except Exception as exc:
            failures += 1
            print(f"Skipping match {number}: {type(exc).__name__}", file=sys.stderr)
            continue
        if score is None:
            failures += 1
            print(f"Skipping match {number}: ambiguous score", file=sys.stderr)
            continue
        if is_existing:
            verified_existing = True
            skipped_existing += 1
            print(f"Existing report PDF successfully downloaded and parsed: match {number}", flush=True)
            continue
        existing[key] = {
            "matchKey": key, "date": fixture["date"], "homeCode": home,
            "awayCode": away, "homeScore": score[0], "awayScore": score[1],
            "status": "FT", "matchNumber": number, "source": "FIFA Training Centre",
            "sourceType": "official_fifa_post_match_summary", "sourceUrl": url,
            "statistics": [], "lineups": None, "incidents": [],
            "notes": "Verified first-page score only; statistics and player events not yet extracted."
        }
        accepted += 1
    if accepted:
        archive["reports"] = sorted(existing.values(), key=lambda x: (x["date"], x.get("matchNumber", 999)))
        REPORTS.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"FIFA report diagnostic: links={found} fixture_matches={matched} pdf_downloaded={downloaded} pdf_parsed={parsed} existing_skipped={skipped_existing} fixture_mismatches={skipped_fixture} failures={failures}", flush=True)
    print(f"New verified official match reports: {accepted}; total: {len(existing)}", flush=True)
    if audit_all:
        print("FULL PDF AUDIT:", json.dumps(audit, ensure_ascii=False), flush=True)
        if downloaded != matched or parsed != matched:
            raise RuntimeError(f"Incomplete PDF audit: matched={matched}, downloaded={downloaded}, parsed={parsed}")
    if found == 0:
        print("WARNING: FIFA hub returned no matching PDF links; download capability NOT verified.", file=sys.stderr)
    elif downloaded == 0:
        print("WARNING: No PDF was downloaded; inspect fixture matching and report URLs.", file=sys.stderr)
    elif parsed == 0:
        print("WARNING: PDF bytes downloaded but none parsed successfully.", file=sys.stderr)


if __name__ == "__main__":
    main()
