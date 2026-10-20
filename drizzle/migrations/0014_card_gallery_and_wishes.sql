-- Give every invitation card the same celebration features as the main
-- Mohsin & Simran invitation: a shared photo gallery and a live wishes wall.
-- Both are scoped to one card, so one shop's guests never see another card.

CREATE TABLE IF NOT EXISTS public.invitation_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.invitation_cards(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 12),
  image_data text NOT NULL,
  caption text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'guest' CHECK (source IN ('host', 'guest')),
  uploader_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, slot)
);
CREATE INDEX IF NOT EXISTS invitation_photos_card_idx ON public.invitation_photos (card_id, slot);

ALTER TABLE public.invitation_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invitation_photos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.invitation_photos TO anon, authenticated;
GRANT ALL ON public.invitation_photos TO service_role;

-- Published, unexpired cards share their gallery with guests; a host can always
-- read their own card, including drafts.
DROP POLICY IF EXISTS "Guests can view published card galleries" ON public.invitation_photos;
CREATE POLICY "Guests can view published card galleries" ON public.invitation_photos
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.invitation_cards c
      WHERE c.id = card_id
        AND (
          c.owner_id = (SELECT auth.uid())
          OR (
            c.status = 'published'
            AND (c.expires_at IS NULL OR c.expires_at > now())
            AND (c.content->'elements'->>'gallery' IS DISTINCT FROM 'false')
          )
        )
    )
  );

-- Uploads and deletions run through SECURITY DEFINER helpers so every rule is
-- applied server-side; clients get no direct INSERT/UPDATE/DELETE grant.
CREATE OR REPLACE FUNCTION public.add_invitation_photo(
  p_card_id uuid,
  photo_data text,
  photo_caption text
)
RETURNS smallint LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  payload bytea;
  caller uuid;
  card_owner uuid;
  card_status text;
  card_expires timestamptz;
  gallery_enabled boolean;
  source_kind text;
  next_slot smallint;
  guest_count integer;
  total_count integer;
BEGIN
  IF p_card_id IS NULL THEN
    RAISE EXCEPTION 'Choose an invitation first.';
  END IF;
  IF photo_data IS NULL OR octet_length(photo_data) > 2800000
     OR photo_data !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'
     OR photo_caption IS NULL
     OR char_length(trim(photo_caption)) > 100 THEN
    RAISE EXCEPTION 'Invalid photo. Use a JPEG under 2 MB and a caption under 100 characters.';
  END IF;
  payload := decode(split_part(photo_data, ',', 2), 'base64');
  IF octet_length(payload) > 2000000 OR octet_length(payload) < 4
     OR encode(substring(payload FROM 1 FOR 3), 'hex') <> 'ffd8ff'
     OR encode(substring(payload FROM octet_length(payload) - 1 FOR 2), 'hex') <> 'ffd9' THEN
    RAISE EXCEPTION 'Invalid JPEG image';
  END IF;

  BEGIN
    caller := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    caller := NULL;
  END;

  SELECT owner_id, status, expires_at, (content->'elements'->>'gallery' IS DISTINCT FROM 'false')
    INTO card_owner, card_status, card_expires, gallery_enabled
    FROM public.invitation_cards WHERE id = p_card_id;
  IF card_owner IS NULL THEN
    RAISE EXCEPTION 'Invitation not found.';
  END IF;

  IF caller = card_owner THEN
    source_kind := 'host';
  ELSE
    source_kind := 'guest';
    IF card_status <> 'published' OR (card_expires IS NOT NULL AND card_expires <= now()) THEN
      RAISE EXCEPTION 'This invitation is not accepting photos.';
    END IF;
    IF NOT gallery_enabled THEN
      RAISE EXCEPTION 'The host has turned off the gallery for this invitation.';
    END IF;
  END IF;

  -- Serialize slot assignment per card, including uploads from different devices.
  PERFORM pg_advisory_xact_lock(hashtext(p_card_id::text));
  SELECT count(*)::integer INTO total_count
    FROM public.invitation_photos WHERE card_id = p_card_id;
  SELECT count(*)::integer INTO guest_count
    FROM public.invitation_photos WHERE card_id = p_card_id AND source = 'guest';
  IF total_count >= 12 THEN
    RAISE EXCEPTION 'Gallery is full: this invitation already has twelve photos.';
  END IF;
  IF source_kind = 'guest' AND guest_count >= 5 THEN
    RAISE EXCEPTION 'Gallery is full: only five guest photos are allowed.';
  END IF;

  SELECT n::smallint INTO next_slot FROM generate_series(1, 12) n
    WHERE NOT EXISTS (SELECT 1 FROM public.invitation_photos p WHERE p.card_id = p_card_id AND p.slot = n)
    ORDER BY n LIMIT 1;
  IF next_slot IS NULL THEN
    RAISE EXCEPTION 'Gallery is full.';
  END IF;

  INSERT INTO public.invitation_photos (card_id, slot, image_data, caption, source, uploader_id)
    VALUES (
      p_card_id,
      next_slot,
      photo_data,
      coalesce(trim(photo_caption), ''),
      source_kind,
      caller
    );
  RETURN next_slot;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_invitation_photo(p_card_id uuid, target_slot smallint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  caller uuid;
  card_owner uuid;
  photo_uploader uuid;
BEGIN
  BEGIN
    caller := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    caller := NULL;
  END;
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Sign in as the host to manage photos.';
  END IF;
  SELECT owner_id INTO card_owner FROM public.invitation_cards WHERE id = p_card_id;
  IF card_owner IS NULL THEN
    RAISE EXCEPTION 'Invitation not found.';
  END IF;
  SELECT uploader_id INTO photo_uploader
    FROM public.invitation_photos WHERE card_id = p_card_id AND slot = target_slot;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No photo in this slot.';
  END IF;
  IF caller <> card_owner AND caller IS DISTINCT FROM photo_uploader THEN
    RAISE EXCEPTION 'Not authorized to remove this photo.';
  END IF;
  DELETE FROM public.invitation_photos WHERE card_id = p_card_id AND slot = target_slot;
END;
$$;

REVOKE ALL ON FUNCTION public.add_invitation_photo(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_invitation_photo(uuid, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_invitation_photo(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_invitation_photo(uuid, smallint) TO authenticated;

-- ───────── Wishes wall ─────────
CREATE TABLE IF NOT EXISTS public.invitation_wishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.invitation_cards(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitation_wishes_card_created_idx
  ON public.invitation_wishes (card_id, created_at DESC);

ALTER TABLE public.invitation_wishes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invitation_wishes FROM PUBLIC, anon, authenticated;
GRANT INSERT (card_id, name, message) ON public.invitation_wishes TO anon, authenticated;
GRANT SELECT ON public.invitation_wishes TO anon, authenticated;
GRANT ALL ON public.invitation_wishes TO service_role;

DROP POLICY IF EXISTS "Anyone can read wishes on a published card" ON public.invitation_wishes;
CREATE POLICY "Anyone can read wishes on a published card" ON public.invitation_wishes
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.invitation_cards c
      WHERE c.id = card_id
        AND c.status = 'published'
        AND (c.expires_at IS NULL OR c.expires_at > now())
    )
  );

DROP POLICY IF EXISTS "Guests can wish a published card" ON public.invitation_wishes;
CREATE POLICY "Guests can wish a published card" ON public.invitation_wishes
  FOR INSERT TO anon, authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invitation_cards c
      WHERE c.id = card_id
        AND c.status = 'published'
        AND (c.expires_at IS NULL OR c.expires_at > now())
        AND (c.content->'elements'->>'wishes' IS DISTINCT FROM 'false')
    )
  );

-- A single card cannot be flooded indefinitely.
CREATE OR REPLACE FUNCTION public.cap_invitation_wishes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF (SELECT count(*) FROM public.invitation_wishes WHERE card_id = NEW.card_id) >= 500 THEN
    RAISE EXCEPTION 'This wishes wall is full.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.cap_invitation_wishes() FROM PUBLIC;

DROP TRIGGER IF EXISTS invitation_wishes_cap ON public.invitation_wishes;
CREATE TRIGGER invitation_wishes_cap BEFORE INSERT ON public.invitation_wishes
  FOR EACH ROW EXECUTE FUNCTION public.cap_invitation_wishes();

-- Live updates for guests and hosts (guarded so reapplying is safe).
DO $$
BEGIN
  -- Hosted Supabase always has this publication; a local or test database may not.
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'invitation_photos'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.invitation_photos;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'invitation_wishes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.invitation_wishes;
    END IF;
  END IF;
END;
$$;

COMMENT ON TABLE public.invitation_photos IS
  'Card-scoped shared gallery: up to twelve photos, at most five from guests. Uploads only through add_invitation_photo.';
COMMENT ON TABLE public.invitation_wishes IS
  'Public wishes wall for one published card. RSVP contact details remain private in invitation_rsvps.';
