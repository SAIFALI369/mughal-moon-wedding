-- Defense-in-depth lockdown of personal data (emails, profiles, RSVPs).
-- Idempotent re-assertion of the tightest permissions; safe to apply on top
-- of 0000–0006. Personal details stay visible only to their owner; the
-- couple's service_role account keeps full access.

-- 1) profiles: contains emails. Anonymous visitors get NOTHING; signed-in
--    users may read ONLY their own row. Sign-up/insert happens through the
--    SECURITY DEFINER function register_username(), so no direct INSERT
--    grant is needed.
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- 2) RSVPs: strictly insert-only for visitors. No SELECT/UPDATE/DELETE —
--    replies (names, messages) are visible to the couple only.
REVOKE ALL ON public.wedding_rsvps FROM PUBLIC, anon, authenticated;
GRANT INSERT (name, guests, events, diet, message) ON public.wedding_rsvps TO anon, authenticated;
DROP POLICY IF EXISTS "Guests may submit one RSVP" ON public.wedding_rsvps;
CREATE POLICY "Guests may submit one RSVP" ON public.wedding_rsvps
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3) Wishes wall: intentionally public to READ, but clients must never
--    write directly — rows are published only by the RSVP trigger.
REVOKE ALL ON public.wedding_wishes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wedding_wishes TO anon, authenticated;
DROP POLICY IF EXISTS "Everyone may read public wishes" ON public.wedding_wishes;
CREATE POLICY "Everyone may read public wishes" ON public.wedding_wishes
  FOR SELECT TO anon, authenticated USING (true);

-- 4) Gallery photos: public read stays. Direct UPDATE/DELETE policies used
--    USING (true), which let ANY signed-in visitor rewrite or wipe every
--    photo, bypassing the size/slot checks. All writes must go through the
--    add/delete/replace RPC functions instead.
REVOKE ALL ON public.wedding_photos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wedding_photos TO anon, authenticated;
DROP POLICY IF EXISTS "Public wedding gallery" ON public.wedding_photos;
CREATE POLICY "Public wedding gallery" ON public.wedding_photos
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Owners can delete photos" ON public.wedding_photos;
DROP POLICY IF EXISTS "Owners can update photos" ON public.wedding_photos;

-- 5) Invitation cards: published cards public, drafts owner-only (policies
--    from 0002). Re-assert grants so no wider role grant survives.
REVOKE ALL ON public.invitation_cards FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.invitation_cards TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.invitation_cards TO authenticated;

-- 6) Internal bookkeeping tables: no client access at all.
REVOKE ALL ON public.username_login_attempts FROM PUBLIC, anon, authenticated;
-- app_sql_migrations is created by the migration runner, not by a
-- migration, so only revoke when it already exists.
DO $$ BEGIN
  IF to_regclass('public.app_sql_migrations') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON public.app_sql_migrations FROM PUBLIC, anon, authenticated';
  END IF;
END $$;
