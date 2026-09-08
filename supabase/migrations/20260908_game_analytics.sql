-- Launch events only: external game pages do not yet report active viewing time.
CREATE TABLE public.game_analytics_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  tracking_since timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.game_analytics_settings (singleton) VALUES (true);
ALTER TABLE public.game_analytics_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_analytics_settings FROM anon, authenticated;

CREATE TABLE public.game_launch_events (
  id uuid PRIMARY KEY,
  learner_id uuid NOT NULL REFERENCES public."Learner"(id) ON DELETE CASCADE,
  game_id text NOT NULL CHECK (game_id IN ('master-the-roads', 'crush-it', 'hazard-hero', 'speed-test')),
  opened_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX game_launch_events_learner_game_time ON public.game_launch_events (learner_id, game_id, opened_at);
ALTER TABLE public.game_launch_events ENABLE ROW LEVEL SECURITY;
-- Writes and reports only via authenticated RPCs; no client-supplied learner or timestamp.
REVOKE ALL ON public.game_launch_events FROM anon, authenticated;

CREATE FUNCTION public.game_analytics_has_permission(p_permission text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_phone text := right(regexp_replace(auth.jwt()->>'phone', '[^0-9]', '', 'g'), 10);
BEGIN
  IF auth.uid() IS NULL OR length(v_phone) IS DISTINCT FROM 10 THEN RETURN false; END IF;
  -- Team-member permissions take precedence, matching AdminHome.
  IF EXISTS (SELECT 1 FROM public."User" u WHERE right(regexp_replace(u.phone, '[^0-9]', '', 'g'), 10) = v_phone) THEN
    RETURN EXISTS (
      SELECT 1 FROM public."User" u JOIN public.user_permissions p ON p.user_id = u.id
      WHERE right(regexp_replace(u.phone, '[^0-9]', '', 'g'), 10) = v_phone AND p.permission = p_permission
    );
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public."Admin" a
    WHERE right(regexp_replace(a.phone, '[^0-9]', '', 'g'), 10) = v_phone
      AND (a.is_super_admin OR (a.is_admin AND EXISTS (
        SELECT 1 FROM public.admin_permissions p WHERE p.admin_id = a.id AND p.permission = p_permission
      )))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.game_analytics_has_permission(text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_game_launch(p_event_id uuid, p_game_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_learner uuid;
  v_phone text := right(regexp_replace(auth.jwt()->>'phone', '[^0-9]', '', 'g'), 10);
BEGIN
  IF auth.uid() IS NULL OR length(v_phone) IS DISTINCT FROM 10 THEN
    RAISE EXCEPTION 'Sign in to record game activity' USING ERRCODE = '42501';
  END IF;
  -- STRICT rejects missing or ambiguous learner matches.
  SELECT l.id INTO STRICT v_learner FROM public."Learner" l
  WHERE right(regexp_replace(l.phone, '[^0-9]', '', 'g'), 10) = v_phone;
  INSERT INTO public.game_launch_events (id, learner_id, game_id)
  VALUES (p_event_id, v_learner, p_game_id) ON CONFLICT (id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.record_game_launch(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_game_launch(uuid, text) TO authenticated;

CREATE FUNCTION public.get_game_analytics(
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
  ), filtered AS MATERIALIZED (
    SELECT l.id AS learner_id, l.name,
      CASE WHEN v_show_phone THEN l.phone ELSE '******' || right(l.phone, 4) END AS phone,
      g.game_id, coalesce(c.opens, 0) AS opens, c.first_opened_at, c.last_opened_at
    FROM public."Learner" l CROSS JOIN games g
    LEFT JOIN counts c ON c.learner_id = l.id AND c.game_id = g.game_id
    WHERE (p_game_id = '' OR g.game_id = p_game_id)
      AND (coalesce(p_search, '') = '' OR strpos(lower(coalesce(l.name, '')), lower(p_search)) > 0
        OR (v_show_phone AND strpos(l.phone, p_search) > 0))
      AND (p_activity = 'all' OR (p_activity = 'opened' AND coalesce(c.opens, 0) > 0)
        OR (p_activity = 'unrecorded' AND coalesce(c.opens, 0) = 0))
  ), page AS (
    SELECT * FROM filtered ORDER BY name NULLS LAST, learner_id, game_id LIMIT 50 OFFSET p_page * 50
  )
  SELECT jsonb_build_object(
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.name NULLS LAST, p.learner_id, p.game_id) FROM page p), '[]'::jsonb),
    'total_rows', (SELECT count(*) FROM filtered),
    'tracking_since', (SELECT tracking_since FROM public.game_analytics_settings WHERE singleton)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_game_analytics(text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_game_analytics(text, text, text, integer) TO authenticated;
