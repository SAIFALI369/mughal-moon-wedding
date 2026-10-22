DROP POLICY IF EXISTS "Guests may submit one RSVP" ON public.wedding_rsvps;
CREATE POLICY "Guests may submit one RSVP" ON public.wedding_rsvps
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(name)) BETWEEN 1 AND 100
  AND guests BETWEEN 1 AND 5
  AND events <@ ARRAY['Nikah','Barat','Walima']::text[]
  AND char_length(diet) <= 500
  AND char_length(message) <= 2000
);