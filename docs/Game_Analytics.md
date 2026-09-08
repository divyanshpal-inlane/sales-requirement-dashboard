# Game Analytics

## Where to find it

Admin dashboard → **Game Analytics** (`/admin/game-analytics`). Super admins see it automatically. Assign the new **Game Analytics** permission in Admin Management or User Management for other staff. The RPC enforces the permission, including on direct route visits. Full phone numbers require the separate `view_unmasked_phone_numbers` permission; otherwise both returned values and phone search are restricted.

The report includes one summary row per learner: total Play now clicks, games opened, and first/latest timestamps. Expand the learner using the arrow/name button to see per-game details. Search, game/activity filters, and pagination operate on whole learners (50 per page). Totals and expanded details follow the selected game filter; the activity filter applies to the learner’s combined activity within that selection. Learners without recorded launches remain visible. Time stamps use the viewer's local timezone.

## Deployment

1. For a new installation, apply `supabase/migrations/20260908_game_analytics.sql`, then `supabase/migrations/20260908103119_group_game_analytics.sql`. If launch analytics is already running, apply **only the second migration**. It adds the grouped report RPC without changing recorded events or the original RPC.
2. Deploy the web app containing this change.
3. Assign staff permissions as needed. Verify an authenticated learner can launch a game and that its count appears after refreshing the report.

The settings row records when the migration enabled tracking. Events can only arrive after the updated web app is deployed. No historical activity is backfilled.

## Measurement limits

An event is a **Play now click**, not proof the external game loaded or was played. The app opens the existing external link synchronously and records the click independently, so an analytics failure does not block the learner. Network failures can leave unrecorded clicks; there is no offline queue. Event IDs deduplicate retries of the same event. The server resolves the learner from the authenticated phone and assigns the timestamp; callers cannot provide another learner ID or an arbitrary timestamp.

“No recorded activity” is not “never played.” Existing learners start accumulating activity when using the updated app. Viewing time is not displayed because it is not measured. Actual active viewing time requires changes to all four external game apps, authenticated session correlation, periodic activity updates, and visibility-aware timing. The current repository contains their launcher, not those apps.

Events are stored in `game_launch_events`, protected with RLS and no direct authenticated/anonymous access. Reports and writes use restricted RPCs. Learner deletion cascades to its events. No payment, enrollment, schedule, or game completion records are changed.

## Validation

See `tests/game-analytics/README.md` for disposable database regression tests. Browser checks use synthetic data and exercise the real report component; live authenticated end-to-end verification remains a deployment step.
