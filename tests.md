# Backend Test Suite — Sales Dashboard & Instructor Management

**Scope:** the tentative-booking system shared between the Sales Dashboard
(`src/routes/admin/SalesDashboard.tsx`, `src/hooks/useSalesData.ts`,
`src/lib/sales-dashboard/*`) and Instructor Management
(`src/routes/admin/instructors.tsx`). Backend/API only — no Playwright, no
UI clicking (per explicit decision). Front-end verification is done
separately by the user.

**How this works:**

1. This file is the checklist — one row per behavior that must hold.
2. `tests/backend-suite.mjs` is the runnable implementation — a plain Node
   script using the Supabase anon key (same pattern used throughout this
   project's development; no new test framework dependency needed). Run it
   with:
   ```bash
   node tests/backend-suite.mjs
   ```
3. It creates all its own test data on a dedicated, far-future, otherwise
   unused date range against two fixture instructors already used for this
   purpose elsewhere in this repo (`test_dp`,
   `test_ins_hidayat_dont_delete`), and deletes everything it created at the
   end — it never touches real schedules.
4. When you add a feature, add a row here describing the new expected
   behavior, then ask for it to be checked — the suite gets extended to
   match and run for real.

**There is no traditional REST API for this feature** — the frontend talks
to Supabase directly (table reads/writes + one RPC function), so "API
endpoints" here means: the `Schedule` table's insert/update/delete
surface, the `override_tentative_slot` RPC, the `app_settings` config row,
and the `postgres_changes` realtime channel — not HTTP routes.

---

## A. Schedule — Core CRUD

| ID | Behavior | Status |
|----|----------|--------|
| A1 | Insert a single tentative slot (Sales Dashboard shape: `status:"hold"`, `isTentative:true`, `tentative_details` populated, `learner_id`/`course_id`/`lesson_id` null) succeeds | ✅ Pass |
| A2 | Insert a multi-slot batch (3 rows, one customer, one statement) succeeds and creates exactly 3 rows | ✅ Pass |
| A3 | Update (reschedule) a tentative slot's `start_time`/`end_time` succeeds | ✅ Pass |
| A4 | Delete a tentative slot succeeds and the row is actually gone | ✅ Pass |

## B. Conflict Handling — `schedule_no_overlap_new_rows` exclusion constraint

| ID | Behavior | Status |
|----|----------|--------|
| B1 | Exact-duplicate slot (same instructor/date/start/end) is rejected | ✅ Pass |
| B2 | Partial-overlap slot is rejected | ✅ Pass |
| B3 | Two genuinely concurrent inserts for the same slot — exactly one succeeds, one is rejected (not both, not neither) | ✅ Pass |
| B4 | Multi-row batch where one row conflicts with existing data — the *whole* batch is rejected, zero partial inserts | ✅ Pass |
| B5 | Cross-module conflict: a slot booked via Instructor Management's insert shape blocks a Sales Dashboard attempt at the same slot, and vice versa | ✅ Pass |
| B6 | Two *different* instructors can be booked at the exact same date/time (constraint is correctly scoped per-instructor, not global) | ✅ Pass |
| B7 | Back-to-back non-overlapping slots for the same instructor both succeed | ✅ Pass |
| B8 | A cancelled slot does not block re-booking the same date/time | ✅ Pass |

## C. Instructor Travel-Gap Buffer

**Important scope note:** the buffer-waiver rule (`classifySlotConflict` /
`bufferWaivedForCustomer` in `SalesDashboard.tsx`) is enforced entirely in
the **frontend**, not the database — the DB itself has no concept of a
travel-gap buffer between two non-overlapping rows, only the
overlap-based exclusion constraint (section B). So this section can only
confirm the DB's (lack of a) role here — it cannot independently verify
the actual buffer/waiver behavior, which lives in a React component and
would need a frontend test (explicitly out of scope for this file) to
exercise directly.

| ID | Behavior | Status |
|----|----------|--------|
| C1 | The database itself does **not** block an adjacent (non-overlapping) slot for a different customer — confirming the buffer rule is a frontend concern, not a DB guarantee, and that section B's exclusion constraint alone would not have caught this case | ✅ Pass |
| C2/C3 | Buffer waiver logic (same-customer waived, different-customer/real-booking never waived) lives entirely in `classifySlotConflict`/`bufferWaivedForCustomer` (`SalesDashboard.tsx`) — not independently testable at the DB layer. Documented here rather than asserted. | ℹ️ Not DB-testable — see D1-D3 for the pattern used to test frontend TS logic directly (bundling the module) if this is ever worth doing for this function too |

## D. Unavailability Engine (`src/lib/sales-dashboard/availability.ts`)

| ID | Behavior | Status |
|----|----------|--------|
| D1 | A candidate slot overlapping an unavailability window with a non-grid-aligned boundary (e.g. ends at `:16`) is correctly excluded from the free grid | ✅ Pass |
| D2 | The instructor gap buffer applies *after* an unavailability window ends (a slot can't start immediately when unavailability ends) | ✅ Pass |
| D3 | A slot half inside a free window and half inside an unavailability window is excluded (not falsely shown free) | ✅ Pass |

## E. Status & Cross-Module Consistency

| ID | Behavior | Status |
|----|----------|--------|
| E1 | A tentative slot created via the Sales Dashboard's insert shape has `status:"hold"` + `isTentative:true` | ✅ Pass |
| E2 | A tentative slot created via Instructor Management's insert shape *also* has `status:"hold"` + `isTentative:true` (regression check — this was the original status-sync bug) | ✅ Pass |
| E3 | No row anywhere has `isTentative:false` with `status:"hold"` (a real booking should never be left on hold) | ✅ Pass |
| E4 | No row anywhere has `isTentative:false` with `status:"booked"` missing `learner_id`/`course_id`/`lesson_id` | ✅ Pass |

## F. Override RPC (`override_tentative_slot`)

| ID | Behavior | Status |
|----|----------|--------|
| F1 | Overriding an unpaid tentative slot with a half/full-paid replacement succeeds, deletes the old row, and inserts the new one at the same instructor/date/time | ✅ Pass |
| F2 | Overriding with `payment_status:"unpaid"` is rejected server-side | ✅ Pass |
| F3 | Overriding a schedule id that doesn't exist (already deleted/overridden) is rejected with a clear error | ✅ Pass |
| F4 | Overriding a slot that's no longer an unpaid hold (already paid) is rejected | ✅ Pass |

## G. Realtime Sync

| ID | Behavior | Status |
|----|----------|--------|
| G1 | `Schedule` table has Realtime replication enabled (implicitly confirmed by G2/G3 actually receiving events — replication was enabled earlier this project via `alter publication supabase_realtime add table "Schedule"`) | ✅ Pass |
| G2 | An INSERT on `Schedule` is received by a live `postgres_changes` subscription | ✅ Pass |
| G3 | An UPDATE on `Schedule` is received by a live `postgres_changes` subscription, with the new row's `instructor_id` present | ✅ Pass |
| G4 | A DELETE on `Schedule` is received, but its payload currently only contains the row's `id` (not `instructor_id`) under default `REPLICA IDENTITY` — documents the known gap tracked in `REALTIME_DELETE_REPLICA_IDENTITY.md` | ✅ Pass (documents current limited behavior — re-check after `REPLICA IDENTITY FULL` is approved and applied; should then also carry `instructor_id`) |

## H. Data Integrity / Constraints

| ID | Behavior | Status |
|----|----------|--------|
| H1 | Inserting with an invalid/nonexistent `instructor_id` is rejected (FK constraint) | ✅ Pass |
| H2 | Inserting with a required field missing/null where the schema disallows it is rejected | ✅ Pass |

## I. Configuration

| ID | Behavior | Status |
|----|----------|--------|
| I1 | `app_settings` has a `booking_flow` row with `enabled:true` and all fields the frontend depends on (`slot_start`, `slot_end`, `slot_grid_minutes`, `slot_duration_minutes`, `instructor_gap_minutes`, `excluded_schedule_statuses`) | ✅ Pass |

---

## Last run

- **Date:** 2026-09-20
- **Command:** `node tests/backend-suite.mjs`
- **Result:** 31/31 checks passed (30 executable checks plus C2/C3, which is a
  documentation-only row, not an assertion)
- **Test data:** created and fully cleaned up on `test_dp` /
  `test_ins_hidayat_dont_delete`, dates in `2027-05-*` (far future, unused).
  Verified zero leftover rows after the run.
- **Note:** the first version of this suite had two test-authoring bugs of
  its own (B7 and C1 computed extra "adjacent slot" times by hand without
  reserving that time range in the shared slot allocator, so they collided
  with slots later tests allocated, producing spurious exclusion-constraint
  failures in B8/E1/E2 that had nothing to do with real app behavior). Fixed
  by having the allocator take an explicit `spanMinutes` per test. Mentioned
  here as a reminder to be skeptical of a failing check — verify it's a real
  app bug before reporting it as one, the same way this whole session's
  actual bug investigations were done.

## Adding a new check

Append a row to the relevant section (or a new section) with a short,
specific, testable behavior statement — not a vague goal. Good: "A slot
adjacent to the same customer's tentative slot is allowed." Bad: "Buffer
logic works." Then ask for `tests.md` to be checked — the suite will be
extended to cover it and run for real against the live database.
