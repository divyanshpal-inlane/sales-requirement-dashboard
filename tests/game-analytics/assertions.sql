SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","phone":"917878676756"}', false);
SELECT public.record_game_launch('00000000-0000-0000-0000-000000000201', 'master-the-roads');
SELECT public.record_game_launch('00000000-0000-0000-0000-000000000201', 'master-the-roads');
SELECT public.record_game_launch('00000000-0000-0000-0000-000000000202', 'master-the-roads');
DO $$ BEGIN
  BEGIN
    PERFORM public.get_game_analytics();
    RAISE EXCEPTION 'Learner incorrectly allowed report access';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.game_launch_events VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'crush-it', now());
    RAISE EXCEPTION 'Direct insert incorrectly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.record_game_launch(gen_random_uuid(), 'unknown-game');
    RAISE EXCEPTION 'Unknown game accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
  ASSERT (SELECT count(*) = 2 FROM public.game_launch_events), 'Duplicate launch counted';
  ASSERT (SELECT bool_and(learner_id = '00000000-0000-0000-0000-000000000001') FROM public.game_launch_events), 'Incorrect learner linkage';
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000110","phone":"1111111111"}', false);
DO $$ DECLARE r jsonb; BEGIN
 r := public.get_game_analytics();
 ASSERT (r->>'total_rows')::int = 8, 'Missing learner/game combinations';
 ASSERT r->>'tracking_since' IS NOT NULL, 'Tracking start absent';
 r := public.get_game_analytics('', '', 'opened');
 ASSERT (r->>'total_rows')::int = 1, 'Opened filter incorrect';
 ASSERT (r->'rows'->0->>'opens')::int = 2, 'Launch count incorrect';
 ASSERT r->'rows'->0->>'first_opened_at' IS NOT NULL, 'First opening absent';
 ASSERT r->'rows'->0->>'last_opened_at' IS NOT NULL, 'Latest opening absent';
 ASSERT r->'rows'->0->>'phone' = '+917878676756', 'Super admin phone access incorrect';
 ASSERT (public.get_game_analytics('', '', 'unrecorded')->>'total_rows')::int = 7, 'Unrecorded filter incorrect';
 ASSERT (public.get_game_analytics('Test learner', 'crush-it')->>'total_rows')::int = 1, 'Search/game filter incorrect';
 ASSERT jsonb_array_length(public.get_game_analytics('', '', 'all', 1)->'rows') = 0, 'Pagination incorrect';
 BEGIN
   PERFORM public.get_game_analytics('', '', 'all', -1);
   RAISE EXCEPTION 'Negative page accepted';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Invalid report filters' THEN RAISE; END IF;
 END;
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000111","phone":"2222222222"}', false);
DO $$ DECLARE r jsonb; BEGIN
 r := public.get_game_analytics('Test learner');
 ASSERT r->'rows'->0->>'phone' = '******6756', 'Phone masking failed';
 ASSERT (public.get_game_analytics('7878676756')->>'total_rows')::int = 0, 'Hidden phone searchable';
END $$;
RESET ROLE;
-- A team member sharing an Admin record must not inherit its broader permissions.
INSERT INTO public."User" VALUES ('00000000-0000-0000-0000-000000000011', '2222222222');
SET ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.get_game_analytics(); RAISE EXCEPTION 'Team member inherited admin permission';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
INSERT INTO public.user_permissions VALUES ('00000000-0000-0000-0000-000000000011', 'game_analytics');
SET ROLE authenticated;
DO $$ BEGIN
 ASSERT (public.get_game_analytics()->>'total_rows')::int = 8, 'Assigned team permission not honored';
END $$;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000199","phone":"3333333333"}', false);
DO $$ BEGIN
 BEGIN
  PERFORM public.record_game_launch(gen_random_uuid(), 'crush-it'); RAISE EXCEPTION 'Missing learner accepted';
 EXCEPTION WHEN no_data_found THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM public.record_game_launch(gen_random_uuid(), 'crush-it'); RAISE EXCEPTION 'Anonymous launch accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.get_game_analytics(); RAISE EXCEPTION 'Anonymous report access accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
