-- Run ONLY in an empty disposable PostgreSQL database, before the migration.
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims', true)::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
CREATE TABLE public."Learner" (id uuid PRIMARY KEY, phone text, name text);
CREATE TABLE public."Admin" (id uuid PRIMARY KEY, phone text, is_admin boolean, is_super_admin boolean);
CREATE TABLE public."User" (id uuid PRIMARY KEY, phone text);
CREATE TABLE public.admin_permissions (admin_id uuid, permission text);
CREATE TABLE public.user_permissions (user_id uuid, permission text);
INSERT INTO public."Learner" VALUES
 ('00000000-0000-0000-0000-000000000001', '+917878676756', 'Test learner'),
 ('00000000-0000-0000-0000-000000000002', '9999999999', 'Other learner');
INSERT INTO public."Admin" VALUES
 ('00000000-0000-0000-0000-000000000010', '911111111111', true, true),
 ('00000000-0000-0000-0000-000000000011', '2222222222', true, false);
INSERT INTO public.admin_permissions VALUES ('00000000-0000-0000-0000-000000000011', 'game_analytics');
