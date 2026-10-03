# Tablekeeper

**Fokus saat ini: add-on compliance hackathon.** Hosting ditunda sesuai permintaan pengguna. Stage resmi dipisahkan dari aplikasi produk di root; lihat [status eksekusi dan batas provenance](docs/addon/EXECUTION.md). Default judging memakai SQLite dan demo lokal tanpa layanan cloud.

A restaurant reservation platform with a React/TypeScript frontend, Fastify/TypeScript API and an offline SQLite runtime. The charcoal, forest-green and amber interface includes discovery, natural-language intent search, an accessible floor plan and manager operations.

SQLite is the default for local development and Docker. Firebase remains an optional, explicitly selected integration; see [Panduan Firebase](docs/FIREBASE.md). See the [hackathon demo](docs/DEMO-HACKATHON.md) and [upgrade evidence](docs/UPGRADE-EVIDENCE.md) for measured coverage and limits.

## Hackathon stage outputs

| Directory | Scope | Current status |
| --- | --- | --- |
| [stage-1](stage-1/RUN.md) | Official JSON API, single tables, idempotent writes, atomic moves, export/import | Native gate accepted at `b18c6c0a`; 120 official + 13 independent + 10 internal tests passed |
| `stage-2/` | Accepted Stage 1 plus combined tables and required browser flows | Implementation underway from accepted Stage 1 |
| `stage-3/` | Accepted Stage 2 plus effective policies, truthful history and recurring agreements | Gated on Stage 2 acceptance |
| `stage-4/` | Accepted Stage 3 plus atomic series amendments and closure replanning | Gated on Stage 3 acceptance |

Stage folders own their complete source and dependency lock; build them from inside the respective directory, following its RUN.md. No private environment file is needed. Startup uses bundled local demo data; empty startup and deterministic reset are supported. Safe demo credentials and the fixed showcase date are documented per stage.

The root app below is the earlier product development build. Its extra features and restrictions are not presented as a compliant earlier stage. The [coverage matrix](docs/addon/COMPLIANCE.md) separates application checks from the still-missing genuine Band room and final public-clone submission gates.

The combined [preflight repository](tablekeeper-submission/README.md) integrates accepted source using Git subtrees, preserving implementation commits without nested stage repositories. It is the packaging target for clean-clone application checks; it is not claimed as a final Band submission.

## Run

Requires Node.js 22.14 or later:

```sh
npm ci
npm run build
npm start
```

Open **http://localhost:8080**. Sign in with `ada@example.com` / `tablekeeper-demo`, or create an account. The restaurants are fictional demo content. The demo account can also manage policies and seating plans.

For live development, use `npm run dev` and open http://localhost:5173. Full environment, persistence, Docker, and test instructions are in [RUN.md](RUN.md).

## Features

- Restaurant discovery, location/time/cuisine/price/feature filters, sorting, saved favorites and local natural-language intent interpretation.
- Live availability for single and combined tables, using each restaurant's local time zone.
- Account creation, persistent sessions, server-side logout, booking confirmation and calendar download.
- Upcoming, past, and cancelled reservations; lookup, modification, cancellation, and history.
- Recurring reservations, individual exceptions, future amendments and atomic future cancellations.
- Manager dashboard, reservations, settings, tables, recurring series, grounded operation summaries, closure impact and atomic seating reassignment.
- Effective-dated duration, capacity, cancellation, minimum notice, booking horizon and maximum party policies; accepted terms and history remain preserved.
- SQLite foreign keys and physical-table overlap triggers, BEGIN IMMEDIATE writer transactions, durable retry receipts, optimistic revisions and automatic legacy database migration.
- Portable state import/export available only in explicitly enabled test mode.

## Project

| Path | Purpose |
| --- | --- |
| `client/` | Responsive React UI and API client |
| `server/` | Fastify routes, domain rules, time handling, SQLite storage |
| `public/images/` | Generated restaurant photography |
| `tests/` | API integration and regression tests |
| `e2e/` | Browser flow and responsive-layout tests |
| [Application design](docs/application-design.md) | Architecture and implementation scope |
| [Design QA](docs/design/design-qa.md) | Reference comparison and browser evidence |
| [Factory blueprint](FACTORY.md) | Three-seat Codex/BAND workflow |

## Checks

```sh
npm test
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

An installed Chrome or Edge can be used instead of downloading Chromium: set `PLAYWRIGHT_CHANNEL=chrome` or `msedge` before the browser test command. On PowerShell: `$env:PLAYWRIGHT_CHANNEL='chrome'`.

## BAND factory kit

The original reusable **Architect → Implementer → Verifier** factory kit remains in `FACTORY.md`, `mandates/`, `configuration/`, `prompts/`, `templates/`, and the setup/run/submission documents in `docs/`. The selected track is Tablekeeper, with Codex for all three seats.

This root application is a local implementation. It is not evidence of an executed BAND room, incremental stage submissions, or a graded competition result. Follow [Setup](docs/SETUP.md), [Validation](docs/VALIDATION.md), and [Submission](docs/SUBMISSION.md) for an actual factory run.

The original challenge contracts were extended for the supplied upgrade specification. Test reset/import/export endpoints are disabled by default; disposable test harnesses opt in. Docker files are supplied; the container build requires a working Docker daemon. Backend TypeScript sources are `server/*.mts`; `npm run build:server` generates the sibling `.mjs` runtime files. Edit the TypeScript sources, rather than generated runtime files.
