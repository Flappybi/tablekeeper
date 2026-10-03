# Stage 1: independent offline reservation API

This folder implements the official Stage 1 API only. It is a Codex development/preflight output, not evidence of a completed Band Desktop submitted run. No browser UI, table combinations, policies, history, recurring agreements or closure planner are implemented here.

From this folder, with Docker installed:

```sh
docker build --no-cache -t tablekeeper-stage1 .
docker run --rm --name tablekeeper-stage1 -e PORT=8080 -p 8080:8080 tablekeeper-stage1
```

Access `http://localhost:8080/health` and the public JSON API at `/restaurants` and `/availability`. The container listens on `0.0.0.0`; change `PORT` and both mapping ports together if needed. Runtime needs no outbound networking, cloud account, environment file or external service. SQLite is stored in `/app/data` inside the container and does not require a volume. State need not survive container replacement.

The first startup initializes an empty SQLite database and loads four bundled synthetic restaurants, local users, tables and fixed January 2030 bookings. To start empty, add `-e DEMO_SEED=0`. Test fixtures can always replace everything with unauthenticated `POST /_test/reset`; `/_test/export` and `/_test/import` are enabled for judging. These controls and public demo credentials make this a local judging service, not a public production deployment.

Demo customer: `customer@demo.invalid`; demo manager account: `manager@demo.invalid`. Both use the safe demo password `tablekeeper-demo`. Stage 1 has only customer permissions; the manager label anticipates the demo narrative without introducing a later-stage role.

Reset running-container demo data reproducibly:

```sh
docker exec tablekeeper-stage1 sh -c 'BASE_URL=http://127.0.0.1:${PORT:-8080} node dist/reset-demo.js'
```

Local development requires Node 22.14 or later:

```sh
npm ci
npm test
npm run build
npm start
```

`npm run reset-demo` resets the default local SQLite file while the local server is stopped. For a running local server use `BASE_URL=http://127.0.0.1:8080 npm run reset-demo` (PowerShell: `$env:BASE_URL='http://127.0.0.1:8080'; npm run reset-demo`).

From the separate official challenge checkout, run the authoritative container harness with a fresh output directory:

```sh
python -m harness run --track tablekeeper --repo /absolute/path/to/submission --stage 1 --mode isolated --out /absolute/path/to/new-stage1-check
```

The submission path must contain this directory as `stage-1/`. The harness also probes Stage 2; failure of that probe is expected for this API-only stage. No later stage may be created before independent review and the current-stage clean-container gate pass. Official checks are partial; internal tests cover additional written invariants. SQLite serializes each complete state transition, including password/session changes, receipts and atomic moves. This simple state snapshot layout trades scaling throughput for easy transactional correctness within the stated judging limits.

`npm test` currently runs eleven meaningful internal checks, including real reviewer-discovered reset type and empty-display-name regressions, session migration and atomic rollback verification. `IMPLEMENTATION.md` records the rejections and repairs; independent review, rather than this document or the implementer, determines acceptance.
