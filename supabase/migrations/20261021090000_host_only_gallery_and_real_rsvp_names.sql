-- Guests may look, never upload.
--
-- The shared gallery becomes host-administered: only the card's owner can add
-- or remove photos, and the database refuses anonymous calls even if somebody
-- skips the UI. Existing guest photos (if any) stay visible but can no longer
-- be created.
--
-- RSVP names become compulsory and real: letters, spaces and simple name
-- punctuation only, at least two letters. The check is NOT VALID so existing
-- replies remain readable; every new insert is validated.

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
  next_slot smallint;
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

  SELECT owner_id INTO card_owner FROM public.invitation_cards WHERE id = p_card_id;
  IF card_owner IS NULL THEN
    RAISE EXCEPTION 'Invitation not found.';
  END IF;
  -- One rule for every caller: the gallery belongs to the host alone.
  IF caller IS NULL OR caller <> card_owner THEN
    RAISE EXCEPTION 'Only the host can add photos to this invitation.';
  END IF;

  -- Serialize slot assignment per card, including two tabs saving at once.
  PERFORM pg_advisory_xact_lock(hashtext(p_card_id::text));
  SELECT count(*)::integer INTO total_count
    FROM public.invitation_photos WHERE card_id = p_card_id;
  IF total_count >= 12 THEN
    RAISE EXCEPTION 'Gallery is full: this invitation already has twelve photos.';
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
      'host',
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
BEGIN
  BEGIN
    caller := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    caller := NULL;
  END;
  SELECT owner_id INTO card_owner FROM public.invitation_cards WHERE id = p_card_id;
  IF card_owner IS NULL THEN
    RAISE EXCEPTION 'Invitation not found.';
  END IF;
  IF caller IS NULL OR caller <> card_owner THEN
    RAISE EXCEPTION 'Only the host can remove photos from this invitation.';
  END IF;
  DELETE FROM public.invitation_photos WHERE card_id = p_card_id AND slot = target_slot;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No photo in this slot.';
  END IF;
END;
$$;

-- Anonymous visitors lose both entry points; signed-in non-owners still hit the
-- ownership check above and receive a readable error.
REVOKE ALL ON FUNCTION public.add_invitation_photo(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_invitation_photo(uuid, smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_invitation_photo(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_invitation_photo(uuid, smallint) TO authenticated, service_role;

-- New rows can only ever be host photos. Legacy guest frames stay readable.
ALTER TABLE public.invitation_photos
  DROP CONSTRAINT IF EXISTS invitation_photos_host_only;
ALTER TABLE public.invitation_photos
  ADD CONSTRAINT invitation_photos_host_only CHECK (source = 'host') NOT VALID;

-- ───────── A real name on every RSVP ─────────
CREATE OR REPLACE FUNCTION public.valid_guest_name(candidate text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $$
DECLARE
  name text;
  letters text;
  word text;
  has_real_word boolean := false;
BEGIN
  IF candidate IS NULL THEN RETURN false; END IF;
  name := btrim(regexp_replace(candidate, '\s+', ' ', 'g'));
  IF char_length(name) < 2 OR char_length(name) > 100 THEN RETURN false; END IF;
  IF name ~* 'https?:|www\.|@' THEN RETURN false; END IF;
  -- Letters (any script), spaces, and the punctuation found in real names.
  IF name !~ '^[[:alpha:][:space:].''’\-]+$' THEN RETURN false; END IF;

  letters := regexp_replace(name, '[^[:alpha:]]', '', 'g');
  IF char_length(letters) < 2 THEN RETURN false; END IF;
  -- Reject "aaaa"-style strings that are one letter repeated.
  IF regexp_replace(letters, left(letters, 1), '', 'g') = '' THEN RETURN false; END IF;

  FOREACH word IN ARRAY string_to_array(name, ' ') LOOP
    IF char_length(regexp_replace(word, '[^[:alpha:]]', '', 'g')) >= 2 THEN
      has_real_word := true;
      EXIT;
    END IF;
  END LOOP;
  IF NOT has_real_word THEN RETURN false; END IF;

  IF lower(name) IN (
    'a', 'a guest', 'abc', 'abcd', 'admin', 'anon', 'anonymous', 'asdf', 'asdfasdf',
    'guest', 'guest guest', 'guest user', 'name', 'n a', 'na', 'none',
    'not sure', 'qwerty', 'some guest', 'someone', 'test', 'testing',
    'the guest', 'unknown', 'user', 'xyz'
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.valid_guest_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valid_guest_name(text) TO anon, authenticated, service_role;

ALTER TABLE public.invitation_rsvps
  DROP CONSTRAINT IF EXISTS invitation_rsvps_valid_name;
ALTER TABLE public.invitation_rsvps
  ADD CONSTRAINT invitation_rsvps_valid_name CHECK (public.valid_guest_name(name)) NOT VALID;

COMMENT ON TABLE public.invitation_photos IS
  'Host-only card gallery (up to twelve photos). Guests can read; only the card owner can add or remove.';
COMMENT ON FUNCTION public.valid_guest_name(text) IS
  'True for a plausible real guest name: letters, spaces and name punctuation only, at least two letters.';
