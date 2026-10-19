-- Expired public links should not reveal card content through direct API reads
-- while waiting for the scheduled cleanup. The owner still has owner-only SELECT.
DROP POLICY IF EXISTS "Anyone can view published invitations" ON public.invitation_cards;
CREATE POLICY "Anyone can view published invitations" ON public.invitation_cards
  FOR SELECT TO anon, authenticated USING (
    status = 'published' AND (expires_at IS NULL OR expires_at > now())
  );

-- A guest can reply to a published invitation; only its owner can read the reply.
-- Kept independent from the main couple's wedding_rsvps and public wishes wall.
CREATE TABLE IF NOT EXISTS public.invitation_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.invitation_cards(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  attending boolean NOT NULL,
  guests smallint NOT NULL CHECK ((attending AND guests BETWEEN 1 AND 10) OR (NOT attending AND guests = 0)),
  contact text NOT NULL DEFAULT '' CHECK (char_length(contact) <= 120),
  dietary text NOT NULL DEFAULT '' CHECK (char_length(dietary) <= 300),
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitation_rsvps_card_created_idx ON public.invitation_rsvps (card_id, created_at DESC);
ALTER TABLE public.invitation_rsvps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invitation_rsvps FROM PUBLIC, anon, authenticated;
GRANT INSERT (card_id, name, attending, guests, contact, dietary, message) ON public.invitation_rsvps TO anon, authenticated;
GRANT SELECT ON public.invitation_rsvps TO authenticated;
GRANT ALL ON public.invitation_rsvps TO service_role;

DROP POLICY IF EXISTS "Guests can reply to published invitations" ON public.invitation_rsvps;
CREATE POLICY "Guests can reply to published invitations" ON public.invitation_rsvps
  FOR INSERT TO anon, authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invitation_cards c
      WHERE c.id = card_id AND c.status = 'published'
        AND (c.expires_at IS NULL OR c.expires_at > now())
        AND (c.content->'elements'->>'rsvp' IS DISTINCT FROM 'false')
    )
  );
DROP POLICY IF EXISTS "Owners can read their invitation replies" ON public.invitation_rsvps;
CREATE POLICY "Owners can read their invitation replies" ON public.invitation_rsvps
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.invitation_cards c WHERE c.id = card_id AND c.owner_id = (select auth.uid()))
  );
COMMENT ON TABLE public.invitation_rsvps IS 'Guest RSVP details are private to the invitation owner; anonymous guests may insert only.';

-- Portraits are tiny client-compressed JPEG data URIs inside the owner-protected
-- invitation_cards.content JSON. Reject unsafe formats and oversized payloads even
-- if somebody bypasses the form and writes straight to the public Supabase API.
CREATE OR REPLACE FUNCTION public.valid_invitation_portrait(photo text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE payload bytea;
BEGIN
  IF photo IS NULL THEN RETURN true; END IF;
  IF octet_length(photo) > 240000 OR photo !~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]+={0,2}$' THEN
    RETURN false;
  END IF;
  payload := decode(split_part(photo, ',', 2), 'base64');
  RETURN octet_length(payload) BETWEEN 4 AND 180000
    AND encode(substring(payload FROM 1 FOR 3), 'hex') = 'ffd8ff'
    AND encode(substring(payload FROM octet_length(payload)-1 FOR 2), 'hex') = 'ffd9';
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.valid_invitation_portrait(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valid_invitation_portrait(text) TO authenticated, service_role;
ALTER TABLE public.invitation_cards DROP CONSTRAINT IF EXISTS invitation_portraits_safe;
ALTER TABLE public.invitation_cards ADD CONSTRAINT invitation_portraits_safe CHECK (
  public.valid_invitation_portrait(content->>'groomPhoto')
  AND public.valid_invitation_portrait(content->>'bridePhoto')
);

-- New published cards must have all of the essential wedding details. NOT VALID
-- preserves older published cards without changing somebody's existing link;
-- every future insert/update is checked (including publishing a legacy draft).
ALTER TABLE public.invitation_cards DROP CONSTRAINT IF EXISTS invitation_published_basics;
ALTER TABLE public.invitation_cards ADD CONSTRAINT invitation_published_basics CHECK (
  status <> 'published' OR (
    char_length(btrim(coalesce(content->>'groomName', ''))) BETWEEN 1 AND 80
    AND char_length(btrim(coalesce(content->>'brideName', ''))) BETWEEN 1 AND 80
    AND char_length(btrim(coalesce(content->>'date', ''))) BETWEEN 1 AND 100
    AND char_length(btrim(coalesce(content->>'time', ''))) BETWEEN 1 AND 100
    AND char_length(btrim(coalesce(content->>'venue', ''))) BETWEEN 1 AND 120
    AND char_length(btrim(coalesce(content->>'address', ''))) BETWEEN 1 AND 200
  )
) NOT VALID;
