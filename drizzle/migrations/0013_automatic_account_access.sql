-- Every account created in Supabase Auth is issued by the operator, so its
-- existence is the permission: give it a profile (so it can sign in by username)
-- and a print-partner allowance with ten lifetime card credits.
--
-- Public signup is disabled and register_username is service_role-only, so only
-- trusted operators can create auth.users rows. Accounts that already have a
-- partner allowance are never reset or topped up by this migration.

CREATE OR REPLACE FUNCTION public.ensure_account_access(account_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, extensions
AS $$
DECLARE
  account auth.users%ROWTYPE;
  requested_handle text;
  base_handle text;
  candidate text;
  suffix integer;
  profile_email text;
  display_name text;
  existing_cards integer;
BEGIN
  SELECT * INTO account FROM auth.users WHERE id = account_id;
  IF account.id IS NULL THEN
    RETURN;
  END IF;

  -- A profile makes username sign-in work and is the parent every partner row needs.
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = account.id) THEN
    requested_handle := lower(trim(coalesce(account.raw_user_meta_data->>'username', '')));
    IF requested_handle ~ '^[a-z0-9_.-]{3,30}$'
      AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(username)) = requested_handle)
    THEN
      candidate := requested_handle;
    ELSE
      base_handle := lower(
        regexp_replace(
          split_part(lower(coalesce(account.email, '')), '@', 1),
          '[^a-z0-9_.-]',
          '-',
          'g'
        )
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
          candidate := 'account-' || left(replace(account.id::text, '-', ''), 12);
          EXIT;
        END IF;
        candidate :=
          left(base_handle, 30 - char_length(suffix::text) - 1) || '-' || suffix::text;
      END LOOP;
    END IF;

    -- profiles.email is unique. If another profile already owns this address,
    -- keep the account's real auth email and use a private profile address so
    -- provisioning (and therefore account creation) never fails.
    profile_email := lower(trim(coalesce(account.email, '')));
    IF profile_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      OR EXISTS (SELECT 1 FROM public.profiles WHERE lower(trim(email)) = profile_email)
    THEN
      profile_email := account.id::text || '@accounts.invalid';
    END IF;

    INSERT INTO public.profiles (id, username, email)
    VALUES (account.id, candidate, profile_email)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Ten lifetime creations. Existing cards count against them; a pre-existing
  -- paid allowance is never touched.
  IF NOT EXISTS (SELECT 1 FROM public.print_partners WHERE owner_id = account.id) THEN
    SELECT count(*)::integer INTO existing_cards
      FROM public.invitation_cards WHERE owner_id = account.id;
    display_name := coalesce(
      nullif(trim(account.raw_user_meta_data->>'shop_name'), ''),
      (
        SELECT initcap(replace(trim(p.username), '_', ' '))
        FROM public.profiles p WHERE p.id = account.id
      ),
      nullif(initcap(split_part(coalesce(account.email, ''), '@', 1)), ''),
      'Shop'
    );
    display_name := left(display_name, 120);
    IF char_length(display_name) < 2 THEN
      display_name := 'Shop';
    END IF;
    INSERT INTO public.print_partners
      (owner_id, shop_name, active, cards_purchased, cards_created)
    VALUES (account.id, display_name, true, 10, least(existing_cards, 10))
    ON CONFLICT (owner_id) DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_account_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_account_access(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, extensions
AS $$
BEGIN
  PERFORM public.ensure_account_access(NEW.id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ensure_account_access_on_auth_user ON auth.users;
CREATE TRIGGER ensure_account_access_on_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Give the two accounts (and any other operator-created account) access now.
DO $$
DECLARE
  account_id uuid;
BEGIN
  FOR account_id IN SELECT id FROM auth.users ORDER BY created_at, id LOOP
    PERFORM public.ensure_account_access(account_id);
  END LOOP;
END;
$$;

-- Account creation now includes the ten credits. Provisioning a named shop must
-- not also record a ₹1,000 package (that would grant twenty); cash top-ups keep
-- using record_partner_cash_package.
CREATE OR REPLACE FUNCTION public.provision_print_partner(
  requested_username text,
  requested_password text,
  requested_shop_name text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  account_id uuid;
BEGIN
  IF requested_shop_name IS NULL
    OR char_length(trim(requested_shop_name)) NOT BETWEEN 2 AND 120
  THEN
    RAISE EXCEPTION 'Shop name must be 2–120 characters.';
  END IF;
  PERFORM public.register_username(requested_username, requested_password);
  SELECT id INTO account_id
    FROM public.profiles WHERE lower(trim(username)) = lower(trim(requested_username));
  IF account_id IS NULL THEN
    RAISE EXCEPTION 'Account not found.';
  END IF;
  PERFORM public.ensure_account_access(account_id);
  UPDATE public.print_partners
    SET shop_name = trim(requested_shop_name)
    WHERE owner_id = account_id;
  RETURN account_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_print_partner(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_print_partner(text, text, text) TO service_role;
