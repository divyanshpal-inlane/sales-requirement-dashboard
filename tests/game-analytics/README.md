# Game analytics database regression tests

Use an **empty disposable PostgreSQL database**, never a deployed database. The setup creates minimal fixture tables and mock auth functions. All test objects are rolled back on success. Stop on the first SQL error.

```sh
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f tests/game-analytics/setup.sql \
  -f supabase/migrations/20260908_game_analytics.sql \
  -f tests/game-analytics/assertions.sql
```

Also executable in an ephemeral `@electric-sql/pglite` database: execute the three files in the same order with `db.exec()`. Validated with PGlite 0.5.8.

Covers authenticated learner identity, event deduplication, repeat launches, invalid game IDs, direct table write rejection, report authorization, anonymous rejection, first/latest timestamps, zero-activity rows, filters, pagination, phone masking/search restrictions, and team-member permission precedence.

## Grouped learner report

In a separate empty disposable database, run:

```sh
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f tests/game-analytics/setup.sql \
  -f supabase/migrations/20260908_game_analytics.sql \
  -f supabase/migrations/20260908103119_group_game_analytics.sql \
  -f tests/game-analytics/grouped-assertions.sql
```

Covers one row per learner, aggregate and per-game counts, learner-level activity filtering, search, masking, access restrictions, compatibility of the original RPC, and a 55-learner pagination boundary with complete game details.
