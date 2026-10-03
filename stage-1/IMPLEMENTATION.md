# Stage 1 development revision

Governing requirement: the complete bundled `SPECIFICATION.md`, copied unchanged from official challenge commit `803560d2a678ace1414465c098eb0ab5380ffade`, `tablekeeper/spec/stage-1.md`. This source was independently authored by the Codex Implementer seat under the autonomous add-on dispatch. It does not claim Band Desktop eligibility or replace an authentic Band room export.

## Requirement mapping

- `src/app.ts`: JSON HTTP endpoints, mandatory unauthenticated test controls, public restaurant/availability access, bearer authorization, exact error envelopes and the two idempotent write paths.
- `src/domain.ts`: scrypt password hashes, independent sessions, opaque stable identities/references, caller privacy, original successful receipts, atomic creation/amendment/cancellation/batch moves, seeded fixture replacement and validated portable state export/import.
- `src/time.ts`: IANA local-time resolution, first repeated occurrence, skipped-hour rejection, absolute duration, opening-time slot grids and half-open occupancy.
- `src/store.ts`: SQLite transaction boundary over complete state snapshots. Writes, receipts and replacement either commit together or roll back. Reads obtain one atomic snapshot. No external storage or runtime API is used.
- `src/demo.ts`: four synthetic restaurants with different timezones, durations, capacities and cutoffs; local accounts; fixed January 2030 bookings. Stage 1 contains no later-stage role privileges, combined tables, policy publication, histories, series or closures.
- `test/invariants.test.mjs`: concurrency, arbitrary past dates, transactional swaps/rollback, portable credentials/tokens/original retries, DST, request-validation/replay ordering, stage isolation, privacy and repeatable bundled demo initialization.

## Implementer verification

Initial revision `npm test` passed all nine internal tests, with no failures or skips. The fixture-type repaired revision passed ten tests; the empty-name repair adds an eleventh test. `npm run build` compiles the complete independent TypeScript project. The initial 50-identical-request case completed in approximately 584 ms after warmup. These are development measurements, not guaranteed judge performance.

Actual WSL Docker command `docker build --no-cache -t tablekeeper-stage1-implementer .` succeeded. The resulting image `586ad54c3301` started as the non-root `node` user with `--network none --cpus 2 --memory 2g -e PORT=8123`; a loopback check inside the container returned healthy and exactly four demo restaurants. The temporary smoke container was then stopped and removed.

An initial host harness attempt produced infrastructure errors because the default host Python lacked pytest; this was not counted as a pass. The official current-stage host suite was then started after installing its declared requirements. Independent official isolated harness execution and review of a fresh committed revision belong to the Reviewer seat; no self-acceptance is claimed here.

## Known limits

The state snapshot persistence design intentionally favors small bounded judging workloads over large production datasets. Test controls and safe demo credentials are enabled unconditionally as required by Stage 1. This is a local grading/development application. Band-specific collaboration/provenance requirements cannot be satisfied by relabeling this native Codex run. Review must independently establish the complete clean-container gate before progression.

## Real review rejection and repair

The independent Reviewer rejected first revision `bc91e2718599ce6e29a0053b8a32f403bd205fdc`: a reset fixture with numeric user email returned 422 rather than the required 400 for a wrong JSON type (Stage 1 section 5). The implementer reproduced the failure with a newly added regression, then introduced shared required-field type checks throughout fixture arrays, objects, user values, restaurant configuration, tables, hours and seeded bookings. Missing or invalid values continue returning 422; the explicit party-size exception remains 422. Invalid imported opaque state remains 422 and atomic.

The regression checks 19 nested rejection cases and verifies every failed reset leaves the entire exported state unchanged. It also checks that Stage 1 does not impose Stage 3's policy maximum of 1440 minutes on original fixture grid/duration values. Optional Docker/Git ignore patterns now exclude local environment, SQLite and credential files; explicit image COPY already avoided such files.

Before repair, `npm test` produced nine passes and one reproduced failure. After repair it passes ten tests. Exact original command output is preserved separately in the coordinator's evidence directory, including the pre-repair successful official host run of 120 tests. Independent re-review remains required; the implementer does not accept its own repair.

The Reviewer later superseded acceptance of `b18c6c0aed4086bb33458e27f47b8c8c5187db5b` after independently finding a second unsupported constraint: signup rejected an empty string display name, although section 6 requires its string type and specifies no minimum length. A new internal test reproduced that failure (ten passed, one failed). The repair removes only the nonempty-name condition, preserves required/type checks and the stated email/password rules, and verifies signup, password login, token use and portable import for an empty display name. The final internal suite now has eleven checks; independent re-review is still required.
