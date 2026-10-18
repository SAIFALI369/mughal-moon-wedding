-- Username/password accounts; no mailbox, OTP or confirmation step.
-- Supabase still requires an internal email identifier for password grants.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Previous signups may have been left awaiting email confirmation, without
-- a profile because browser-side inserts required an authenticated session.
INSERT INTO public.profiles (id, username, email)
SELECT DISTINCT ON (lower(trim(raw_user_meta_data->>'username')))
  id, trim(raw_user_meta_data->>'username'), email
FROM auth.users
WHERE raw_user_meta_data->>'username' ~ '^[a-zA-Z0-9_.-]{3,30}$'
  AND email IS NOT NULL
ORDER BY lower(trim(raw_user_meta_data->>'username')), created_at, id
ON CONFLICT DO NOTHING;

UPDATE auth.users u SET email_confirmed_at = now(), confirmation_token = ''
FROM public.profiles p WHERE p.id = u.id AND u.email_confirmed_at IS NULL;

-- Reserve usernames transactionally, not from an unauthenticated browser insert.
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.register_username(requested_username text, requested_password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, extensions
AS $$
DECLARE
  account_id uuid := gen_random_uuid();
  handle text := lower(trim(requested_username));
  internal_email text := account_id::text || '@accounts.invalid';
BEGIN
  IF handle IS NULL OR handle !~ '^[a-z0-9_.-]{3,30}$' THEN
    RAISE EXCEPTION 'Username must be 3–30 characters: letters, numbers, dot, hyphen or underscore.';
  END IF;
  -- bcrypt truncates at 72 bytes; never silently accept a truncated password.
  IF requested_password IS NULL OR char_length(requested_password) < 6 OR octet_length(requested_password) > 72 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters and at most 72 bytes.';
  END IF;

  -- Unique profile index serializes competing signups. A later failure rolls
  -- back the entire function, so there are no orphan accounts or taken handles.
  INSERT INTO public.profiles(id, username, email) VALUES (account_id, trim(requested_username), internal_email);
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', account_id, 'authenticated', 'authenticated',
    internal_email, crypt(requested_password, gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', trim(requested_username)), now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  VALUES (gen_random_uuid(), account_id, account_id::text,
    jsonb_build_object('sub', account_id::text, 'email', internal_email, 'email_verified', true),
    'email', now(), now());
END;
$$;

-- Private per-handle throttle also covers password checks performed through RPC.
CREATE TABLE IF NOT EXISTS public.username_login_attempts (
  username text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL
);
ALTER TABLE public.username_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.username_login_attempts FROM PUBLIC, anon, authenticated;

-- Only reveal an address after checking the supplied password. Supports existing
-- email-backed accounts without exposing their email/profile to anonymous reads.
CREATE OR REPLACE FUNCTION public.username_login_address(requested_username text, requested_password text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, extensions
AS $$
DECLARE
  handle text := lower(trim(requested_username));
  attempt_count integer;
  login_email text;
BEGIN
  IF handle IS NULL OR char_length(handle) NOT BETWEEN 3 AND 30
    OR requested_password IS NULL OR octet_length(requested_password) > 72 THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.username_login_attempts AS a (username, window_start, attempts)
    VALUES (handle, now(), 1)
    ON CONFLICT (username) DO UPDATE SET
      attempts = CASE WHEN a.window_start < now() - interval '1 minute' THEN 1 ELSE a.attempts + 1 END,
      window_start = CASE WHEN a.window_start < now() - interval '1 minute' THEN now() ELSE a.window_start END
    RETURNING attempts INTO attempt_count;
  IF attempt_count > 20 THEN RETURN NULL; END IF;
  SELECT u.email INTO login_email FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE lower(trim(p.username)) = handle
      AND u.encrypted_password = crypt(requested_password, u.encrypted_password)
      AND (u.banned_until IS NULL OR u.banned_until < now());
  RETURN login_email;
END;
$$;
REVOKE ALL ON FUNCTION public.register_username(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.username_login_address(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_username(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.username_login_address(text, text) TO anon, authenticated;
