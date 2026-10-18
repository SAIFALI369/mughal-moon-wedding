-- Personal wedding invitations with username, email, password accounts.
-- Each person may have up to 3 active cards, enforced in database.
-- Cards start as private drafts; only owner can edit/delete; published cards are publicly readable via slug.

-- Profiles: username for account (unique, case-insensitive) alongside email
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  username text NOT NULL CHECK (char_length(trim(username)) BETWEEN 3 AND 30),
  email text NOT NULL CHECK (char_length(trim(email)) BETWEEN 5 AND 254),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Enforce uniqueness case-insensitively
CREATE UNIQUE INDEX profiles_username_lower_unique ON public.profiles (lower(trim(username)));
CREATE UNIQUE INDEX profiles_email_lower_unique ON public.profiles (lower(trim(email)));
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
-- Anyone can read profiles for display, but only owners can manage own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users can create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Invitation cards
CREATE TABLE public.invitation_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (char_length(slug) BETWEEN 8 AND 64 AND slug ~ '^[a-z0-9-]+$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE UNIQUE INDEX invitation_cards_slug_key ON public.invitation_cards (slug);
CREATE INDEX invitation_cards_owner_idx ON public.invitation_cards (owner_id);

ALTER TABLE public.invitation_cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invitation_cards FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.invitation_cards TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.invitation_cards TO authenticated;
GRANT ALL ON public.invitation_cards TO service_role;

-- Public can view published cards; owners can view all their own cards (including drafts)
CREATE POLICY "Anyone can view published invitations" ON public.invitation_cards
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Owners can view own cards" ON public.invitation_cards
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated can create own cards" ON public.invitation_cards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own cards" ON public.invitation_cards
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own cards" ON public.invitation_cards
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Keep updated_at fresh and manage published_at
CREATE OR REPLACE FUNCTION public.handle_invitation_cards_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    NEW.published_at = now();
  ELSIF NEW.status = 'draft' THEN
    NEW.published_at = NULL;
  END IF;
  -- Prevent owner_id tampering: keep original owner on update
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'owner_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invitation_cards_updated_at
  BEFORE UPDATE ON public.invitation_cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_invitation_cards_updated_at();

-- Enforce max 3 active cards per owner (hard delete frees slot; draft + published both count)
CREATE OR REPLACE FUNCTION public.enforce_invitation_card_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Serialize concurrent inserts per owner to avoid race
  PERFORM pg_advisory_xact_lock(hashtext(NEW.owner_id::text));
  IF (SELECT count(*) FROM public.invitation_cards WHERE owner_id = NEW.owner_id) >= 3 THEN
    RAISE EXCEPTION 'You may have at most 3 active cards. Delete one before creating another.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invitation_cards_limit_trigger
  BEFORE INSERT ON public.invitation_cards
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invitation_card_limit();

-- Allow public realtime for published cards (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.invitation_cards;
