# Future Radar Data Engine v1

A zero-cost normalization layer for the existing FIFA U17 2026 aggregator. No new external subscription or credentials are needed.

## Routes

- `GET /api/data-engine?health=1`: diagnostics, including explicit limitations.
- `GET /api/data-engine?competition=fifa-u17-world-cup-2026&dates=2026-11-22,2026-11-23`: fixtures and scores in a stable schema.
- `GET /api/data-engine?competition=fifa-u17-world-cup-2026&date=2026-11-22&home=KOR&away=NCL`: statistics, lineups and incidents when providers actually return them.

## Data contract

The API uses a stable match identity `YYYY-MM-DD:HOME:AWAY`. Every list item includes a `raw` field containing the legacy provider result for compatibility. Missing scores and statistics are `null`, never zero or fabricated. Match details may contain a verified historical snapshot; consult `dataAsOf` and `sourceType` before describing a result as live.

## Limitations and next phase

This v1 is a **serverless API facade**, not a persistent database or a new live-data supplier. It reuses LiveScore and manually verified records already in the repo. It cannot guarantee all U17 fixtures, lineups or statistics, and does not run unattended polling outside requests. Memory cache is per Vercel instance and not durable.

Next steps require a source with permitted reuse and confirmed tournament coverage, followed by durable storage (for example a free-tier Postgres database) and scheduled ingestion. Do not copy proprietary private endpoints without authorization.
