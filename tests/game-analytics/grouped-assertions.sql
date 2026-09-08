-- After setup.sql, the original analytics migration, and the grouped migration.
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","phone":"917878676756"}', false);
SELECT public.record_game_launch('00000000-0000-0000-0000-000000000201', 'master-the-roads');
SELECT public.record_game_launch('00000000-0000-0000-0000-000000000202', 'master-the-roads');
SELECT public.record_game_launch('00000000-0000-0000-0000-000000000203', 'crush-it');
DO $$ BEGIN
 BEGIN
  PERFORM public.get_game_analytics_by_learner(); RAISE EXCEPTION 'Learner report access accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000110","phone":"1111111111"}', false);
DO $$ DECLARE r jsonb; BEGIN
 r := public.get_game_analytics_by_learner();
 ASSERT (r->>'total_rows')::int = 2, 'Report must count learners, not games';
 ASSERT jsonb_array_length(r->'rows') = 2, 'Duplicate learner rows';
 r := public.get_game_analytics_by_learner('Test learner');
 ASSERT (r->>'total_rows')::int = 1, 'Search must yield one learner';
 ASSERT jsonb_array_length(r->'rows'->0->'games') = 4, 'Missing expanded game details';
 ASSERT (r->'rows'->0->>'opens')::int = 3, 'Total openings incorrect';
 ASSERT (r->'rows'->0->>'games_opened')::int = 2, 'Distinct played games incorrect';
 ASSERT (r->'rows'->0->>'total_games')::int = 4, 'Game denominator incorrect';
 ASSERT r->'rows'->0->>'first_opened_at' IS NOT NULL, 'First opening missing';
 ASSERT r->'rows'->0->>'last_opened_at' IS NOT NULL, 'Latest opening missing';
 ASSERT (public.get_game_analytics_by_learner('', '', 'unrecorded')->>'total_rows')::int = 1, 'Partial players incorrectly counted as no activity';
 ASSERT (public.get_game_analytics_by_learner('', '', 'opened')->>'total_rows')::int = 1, 'Opened filter incorrect';
 r := public.get_game_analytics_by_learner('Test learner', 'master-the-roads');
 ASSERT (r->'rows'->0->>'opens')::int = 2, 'Selected game totals incorrect';
 ASSERT jsonb_array_length(r->'rows'->0->'games') = 1, 'Game filter details incorrect';
 ASSERT (public.get_game_analytics_by_learner('', 'speed-test', 'unrecorded')->>'total_rows')::int = 2, 'Game-specific no activity incorrect';
 ASSERT (public.get_game_analytics_by_learner('Missing learner')->>'total_rows')::int = 0, 'Empty search incorrect';
 -- The old report still works during a rolling deployment.
 ASSERT (public.get_game_analytics()->>'total_rows')::int = 8, 'Legacy report changed';
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000111","phone":"2222222222"}', false);
DO $$ BEGIN
 ASSERT public.get_game_analytics_by_learner('Test learner')->'rows'->0->>'phone' = '******6756', 'Phone masking failed';
 ASSERT (public.get_game_analytics_by_learner('7878676756')->>'total_rows')::int = 0, 'Hidden phone searchable';
END $$;
RESET ROLE;
INSERT INTO public."Learner" (id, phone, name)
SELECT gen_random_uuid(), (8000000000 + n)::text, 'Page fixture ' || lpad(n::text, 2, '0') FROM generate_series(1,55) n;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000110","phone":"1111111111"}', false);
DO $$ DECLARE first_page jsonb; second_page jsonb; BEGIN
 first_page := public.get_game_analytics_by_learner('Page fixture', '', 'all', 0);
 second_page := public.get_game_analytics_by_learner('Page fixture', '', 'all', 1);
 ASSERT (first_page->>'total_rows')::int = 55, 'Pagination total wrong';
 ASSERT jsonb_array_length(first_page->'rows') = 50, 'First page must contain 50 learners';
 ASSERT jsonb_array_length(second_page->'rows') = 5, 'Second page must contain 5 learners';
 ASSERT NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(first_page->'rows') a, jsonb_array_elements(second_page->'rows') b
  WHERE a->>'learner_id' = b->>'learner_id'
 ), 'Learner split across pages';
 ASSERT NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements((first_page->'rows') || (second_page->'rows')) r
  WHERE jsonb_array_length(r->'games') <> 4
 ), 'Game details split across pages';
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM public.get_game_analytics_by_learner(); RAISE EXCEPTION 'Anonymous report access accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
