-- Tighten to 2 MB, keep 5-slot cap, add owner tracking so site owner can manage photos
-- Two of the five curated spots are bride/groom portraits (enforced in code, not DB)

-- Add owner column (nullable for old anon uploads); 2 MB payload ~ 2.8 MB base64
ALTER TABLE public.wedding_photos ADD COLUMN IF NOT EXISTS owner_id uuid;
-- Update image_data size check to 2 MB equivalent (allow ~2.8M base64 chars)
ALTER TABLE public.wedding_photos DROP CONSTRAINT IF EXISTS wedding_photos_image_data_check;
ALTER TABLE public.wedding_photos ADD CONSTRAINT wedding_photos_image_data_check CHECK (octet_length(image_data) <= 2800000);
ALTER TABLE public.wedding_photos DROP CONSTRAINT IF EXISTS wedding_photos_caption_check;
ALTER TABLE public.wedding_photos ADD CONSTRAINT wedding_photos_caption_check CHECK (char_length(caption) BETWEEN 1 AND 100);

-- Owner can manage, anon can only read (keep existing SELECT policy)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wedding_photos' AND policyname='Owners can delete photos') THEN
    CREATE POLICY "Owners can delete photos" ON public.wedding_photos FOR DELETE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wedding_photos' AND policyname='Owners can update photos') THEN
    CREATE POLICY "Owners can update photos" ON public.wedding_photos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Keep anon/authenticated can read, but allow anon insert only via function; direct INSERT still blocked

-- Updated add function: 2 MB limit, owner_id tracking, still 5-slot cap
CREATE OR REPLACE FUNCTION public.add_wedding_photo(photo_data text, photo_caption text)
RETURNS smallint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE free_slot smallint; payload bytea; owner uuid;
BEGIN
  -- 2 MB strict: base64 string <= 2.8M, decoded payload <= 2_000_000 bytes, JPEG magic ok
  IF photo_data IS NULL OR octet_length(photo_data) > 2800000
     OR photo_data !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'
     OR photo_caption IS NULL OR char_length(trim(photo_caption)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid photo. Use a JPEG under 2 MB and a caption under 100 characters.';
  END IF;
  payload := decode(substring(photo_data FROM 24), 'base64');
  IF octet_length(payload) > 2000000 OR octet_length(payload) < 4
     OR encode(substring(payload FROM 1 FOR 3), 'hex') <> 'ffd8ff'
     OR encode(substring(payload FROM octet_length(payload)-1 FOR 2), 'hex') <> 'ffd9' THEN
    RAISE EXCEPTION 'Invalid JPEG image';
  END IF;
  -- Owner tracking: auth.uid() if authenticated, else null (anon guest)
  BEGIN
    owner := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    owner := NULL;
  END;
  PERFORM pg_advisory_xact_lock(20261122, 5);
  SELECT n::smallint INTO free_slot FROM generate_series(1,5) n
    WHERE NOT EXISTS (SELECT 1 FROM public.wedding_photos p WHERE p.slot = n) ORDER BY n LIMIT 1;
  IF free_slot IS NULL THEN RAISE EXCEPTION 'Gallery is full: only five guest photos are allowed.'; END IF;
  INSERT INTO public.wedding_photos(slot,image_data,caption,owner_id) VALUES(free_slot,photo_data,trim(photo_caption),owner);
  RETURN free_slot;
END;
$$;

-- Owner helpers: delete / replace (requires authentication, RLS allows)
CREATE OR REPLACE FUNCTION public.delete_wedding_photo(target_slot smallint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE caller uuid;
BEGIN
  BEGIN caller := auth.uid(); EXCEPTION WHEN OTHERS THEN caller := NULL; END;
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authorized: sign in as owner to manage photos'; END IF;
  IF target_slot NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Invalid slot'; END IF;
  DELETE FROM public.wedding_photos WHERE slot = target_slot;
  IF NOT FOUND THEN RAISE EXCEPTION 'No photo in this slot'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_wedding_photo(target_slot smallint, photo_data text, photo_caption text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE payload bytea; caller uuid;
BEGIN
  BEGIN caller := auth.uid(); EXCEPTION WHEN OTHERS THEN caller := NULL; END;
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authorized: sign in as owner to manage photos'; END IF;
  IF target_slot NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Invalid slot'; END IF;
  IF photo_data IS NULL OR octet_length(photo_data) > 2800000
     OR photo_data !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'
     OR photo_caption IS NULL OR char_length(trim(photo_caption)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid photo. Use a JPEG under 2 MB and a caption under 100 characters.';
  END IF;
  payload := decode(substring(photo_data FROM 24), 'base64');
  IF octet_length(payload) > 2000000 OR octet_length(payload) < 4
     OR encode(substring(payload FROM 1 FOR 3), 'hex') <> 'ffd8ff'
     OR encode(substring(payload FROM octet_length(payload)-1 FOR 2), 'hex') <> 'ffd9' THEN
    RAISE EXCEPTION 'Invalid JPEG image';
  END IF;
  UPDATE public.wedding_photos SET image_data = photo_data, caption = trim(photo_caption), owner_id = caller WHERE slot = target_slot;
  IF NOT FOUND THEN
    INSERT INTO public.wedding_photos(slot,image_data,caption,owner_id) VALUES(target_slot,photo_data,trim(photo_caption),caller);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.add_wedding_photo(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_wedding_photo(text,text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_wedding_photo(smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_wedding_photo(smallint) TO authenticated;
REVOKE ALL ON FUNCTION public.replace_wedding_photo(smallint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_wedding_photo(smallint,text,text) TO authenticated;
