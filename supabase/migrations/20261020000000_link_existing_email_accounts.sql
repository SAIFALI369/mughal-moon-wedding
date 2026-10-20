-- Attach existing Supabase Auth accounts to the app.
--
-- Accounts created directly in Supabase (or before the username/password
-- migration) have an auth.users row and a password, but no public.profiles
-- row. The username login RPC joins profiles, so those accounts could never
-- sign in. This migration gives each confirmed email account a profile with a
-- username derived from its email local part, and lets the login RPC accept the
-- email address itself as the identifier. Existing IDs, emails and passwords
-- are never changed.

DO $$
DECLARE
  account record;
  base_handle text;
  candidate text;
  suffix integer;
BEGIN
  FOR account IN
    SELECT u.id, lower(trim(u.email)) AS email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
      AND u.email IS NOT NULL
      AND trim(u.email) <> ''
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) NOT LIKE '%@accounts.invalid'
    ORDER BY u.created_at, u.id
  LOOP
    -- profiles.email is unique. If another profile already owns this address,
    -- leave the account for an operator instead of inventing a second identity.
    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(email)) = account.email) THEN
      CONTINUE;
    END IF;

    base_handle := lower(
      regexp_replace(split_part(account.email, '@', 1), '[^a-z0-9_.-]', '-', 'g')
    );
    base_handle := trim(both '-' from trim(both '_' from trim(both '.' from base_handle)));
    IF char_length(base_handle) < 3 THEN
      base_handle := 'account';
    END IF;
    base_handle := left(base_handle, 30);

    candidate := base_handle;
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(username)) = candidate) LOOP
      suffix := suffix + 1;
      IF suffix > 99 THEN
        -- Deterministic fallback based on the immutable auth user id.
        candidate := 'account-' || left(replace(account.id::text, '-', ''), 12);
        EXIT;
      END IF;
      candidate :=
        left(base_handle, 30 - char_length(suffix::text) - 1) || '-' || suffix::text;
    END LOOP;

    INSERT INTO public.profiles (id, username, email)
    VALUES (account.id, candidate, account.email)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Accept either the app username or the existing Supabase email in one place.
-- The password is still verified before any address is returned, the per-handle
-- throttle still applies, and wrong identifiers/passwords remain indistinguishable.
CREATE OR REPLACE FUNCTION public.username_login_address(
  requested_username text,
  requested_password text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, extensions
AS $$
DECLARE
  handle text := lower(trim(requested_username));
  attempt_count integer;
  login_email text;
BEGIN
  IF handle IS NULL OR char_length(handle) NOT BETWEEN 3 AND 254
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
  SELECT u.email INTO login_email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE (lower(trim(p.username)) = handle OR lower(trim(u.email)) = handle)
      AND u.encrypted_password = crypt(requested_password, u.encrypted_password)
      AND (u.banned_until IS NULL OR u.banned_until < now())
    ORDER BY u.created_at
    LIMIT 1;
  RETURN login_email;
END;
$$;

REVOKE ALL ON FUNCTION public.username_login_address(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.username_login_address(text, text) TO anon, authenticated;
