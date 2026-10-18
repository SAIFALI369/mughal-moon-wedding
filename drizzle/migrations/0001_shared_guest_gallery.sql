-- Five shared slots, not five per device. Public uploads are intentionally insert-only.
CREATE TABLE public.wedding_photos (
  slot smallint PRIMARY KEY CHECK (slot BETWEEN 1 AND 5),
  image_data text NOT NULL CHECK (octet_length(image_data) <= 1100000),
  caption text NOT NULL CHECK (char_length(caption) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wedding_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wedding_photos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.wedding_photos TO anon, authenticated;
GRANT ALL ON public.wedding_photos TO service_role;
CREATE POLICY "Public wedding gallery" ON public.wedding_photos FOR SELECT TO anon, authenticated USING (true);

CREATE FUNCTION public.add_wedding_photo(photo_data text, photo_caption text)
RETURNS smallint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE free_slot smallint; payload bytea;
BEGIN
  IF photo_data IS NULL OR octet_length(photo_data) > 1100000
     OR photo_data !~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'
     OR photo_caption IS NULL OR char_length(trim(photo_caption)) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid photo. Use a JPEG under 800 KB and a caption under 100 characters.';
  END IF;
  payload := decode(substring(photo_data FROM 24), 'base64');
  IF octet_length(payload) > 800000 OR octet_length(payload) < 4
     OR encode(substring(payload FROM 1 FOR 3), 'hex') <> 'ffd8ff'
     OR encode(substring(payload FROM octet_length(payload)-1 FOR 2), 'hex') <> 'ffd9' THEN
    RAISE EXCEPTION 'Invalid JPEG image';
  END IF;
  -- Serializes concurrent uploads, including requests from different devices.
  PERFORM pg_advisory_xact_lock(20261122, 5);
  SELECT n::smallint INTO free_slot FROM generate_series(1,5) n
    WHERE NOT EXISTS (SELECT 1 FROM public.wedding_photos p WHERE p.slot = n) ORDER BY n LIMIT 1;
  IF free_slot IS NULL THEN RAISE EXCEPTION 'Gallery is full: only five guest photos are allowed.'; END IF;
  INSERT INTO public.wedding_photos(slot,image_data,caption) VALUES(free_slot,photo_data,trim(photo_caption));
  RETURN free_slot;
END;
$$;
REVOKE ALL ON FUNCTION public.add_wedding_photo(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_wedding_photo(text,text) TO anon, authenticated;
-- Publish changes for other visitors (standard Supabase Realtime publication).
ALTER PUBLICATION supabase_realtime ADD TABLE public.wedding_photos;
