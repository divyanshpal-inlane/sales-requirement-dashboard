-- Requires 20260908_game_analytics.sql. Retains the original RPC for older web clients.
-- Paginate whole learners; their game details always stay on the same page.
CREATE FUNCTION public.get_game_analytics_by_learner(
  p_search text DEFAULT '', p_game_id text DEFAULT '',
  p_activity text DEFAULT 'all', p_page integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_result jsonb;
  v_show_phone boolean;
BEGIN
  IF NOT public.game_analytics_has_permission('game_analytics') THEN
    RAISE EXCEPTION 'Game Analytics permission required' USING ERRCODE = '42501';
  END IF;
  IF p_page IS NULL OR p_page < 0 OR p_page > 1000000 OR p_activity IS NULL OR p_activity NOT IN ('all', 'opened', 'unrecorded')
    OR p_game_id IS NULL OR p_game_id NOT IN ('', 'master-the-roads', 'crush-it', 'hazard-hero', 'speed-test') THEN
    RAISE EXCEPTION 'Invalid report filters';
  END IF;
  v_show_phone := public.game_analytics_has_permission('view_unmasked_phone_numbers');
  WITH games(game_id) AS (
    VALUES ('master-the-roads'), ('crush-it'), ('hazard-hero'), ('speed-test')
  ), counts AS (
    SELECT learner_id, game_id, count(*) AS opens, min(opened_at) AS first_opened_at, max(opened_at) AS last_opened_at
    FROM public.game_launch_events GROUP BY learner_id, game_id
  ), learner_games AS (
    SELECT l.id AS learner_id, l.name,
      CASE WHEN v_show_phone THEN l.phone ELSE '******' || right(l.phone, 4) END AS phone,
      g.game_id, coalesce(c.opens, 0) AS opens, c.first_opened_at, c.last_opened_at
    FROM public."Learner" l CROSS JOIN games g
    LEFT JOIN counts c ON c.learner_id = l.id AND c.game_id = g.game_id
    WHERE (p_game_id = '' OR g.game_id = p_game_id)
      AND (coalesce(p_search, '') = '' OR strpos(lower(coalesce(l.name, '')), lower(p_search)) > 0
        OR (v_show_phone AND strpos(l.phone, p_search) > 0))
  ), grouped AS (
    SELECT learner_id, name, phone, sum(opens) AS opens,
      count(*) FILTER (WHERE opens > 0) AS games_opened,
      count(*) AS total_games,
      min(first_opened_at) AS first_opened_at, max(last_opened_at) AS last_opened_at,
      jsonb_agg(jsonb_build_object(
        'game_id', game_id, 'opens', opens,
        'first_opened_at', first_opened_at, 'last_opened_at', last_opened_at
      ) ORDER BY game_id) AS games
    FROM learner_games GROUP BY learner_id, name, phone
  ), filtered AS MATERIALIZED (
    SELECT * FROM grouped
    WHERE p_activity = 'all' OR (p_activity = 'opened' AND opens > 0)
      OR (p_activity = 'unrecorded' AND opens = 0)
  ), page AS (
    SELECT * FROM filtered ORDER BY name NULLS LAST, learner_id LIMIT 50 OFFSET p_page * 50
  )
  SELECT jsonb_build_object(
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.name NULLS LAST, p.learner_id) FROM page p), '[]'::jsonb),
    'total_rows', (SELECT count(*) FROM filtered),
    'tracking_since', (SELECT tracking_since FROM public.game_analytics_settings WHERE singleton)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_game_analytics_by_learner(text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_game_analytics_by_learner(text, text, text, integer) TO authenticated;
