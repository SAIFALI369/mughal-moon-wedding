-- Add expiry for auto-delete after marriage day + support for per-card Simran memory (stored locally, not in DB)
-- Card expires_at is derived from content.date or explicitly set; cards auto-deleted after expiry
ALTER TABLE public.invitation_cards ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Index for efficient cleanup
CREATE INDEX IF NOT EXISTS invitation_cards_expires_at_idx ON public.invitation_cards (expires_at) WHERE expires_at IS NOT NULL;

-- Auto-set expires_at from content if not provided: parse content->>'date' as date, default +2 days from created
CREATE OR REPLACE FUNCTION public.set_invitation_expiry()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parsed timestamptz; date_str text;
BEGIN
  IF NEW.expires_at IS NULL THEN
    date_str := (NEW.content->>'date');
    IF date_str IS NOT NULL AND date_str <> '' THEN
      BEGIN
        -- Try to parse common formats: "22 November 2026", "2026-11-22", etc. Fallback to created + 2 days
        parsed := (date_str)::date + INTERVAL '1 day 23:59:59';
        NEW.expires_at := parsed;
      EXCEPTION WHEN OTHERS THEN
        NEW.expires_at := NEW.created_at + INTERVAL '2 days';
      END;
    ELSE
      NEW.expires_at := NEW.created_at + INTERVAL '2 days';
    END IF;
    -- Also check content->>'eventDate' if exists (more precise)
    IF (NEW.content->>'eventDate') IS NOT NULL THEN
      BEGIN
        parsed := (NEW.content->>'eventDate')::timestamptz + INTERVAL '1 day';
        NEW.expires_at := parsed;
      EXCEPTION WHEN OTHERS THEN
        -- keep previous
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invitation_expiry_trigger ON public.invitation_cards;
CREATE TRIGGER set_invitation_expiry_trigger BEFORE INSERT OR UPDATE OF content, expires_at ON public.invitation_cards FOR EACH ROW EXECUTE FUNCTION public.set_invitation_expiry();

-- Cleanup function for expired cards (called by cron or client)
CREATE OR REPLACE FUNCTION public.delete_expired_invitations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.invitation_cards WHERE expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_expired_invitations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_expired_invitations() TO anon, authenticated, service_role;
