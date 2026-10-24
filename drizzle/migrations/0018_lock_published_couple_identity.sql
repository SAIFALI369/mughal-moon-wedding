-- Lock couple identity (title, groomName, brideName) after first publish so a single
-- partner card credit cannot be reused across multiple couples, while keeping design,
-- soundtrack, photos, sections, and ceremony logistics editable. Also support ordinal
-- written dates such as "26th November 2029" in automatic expiry calculation.

CREATE OR REPLACE FUNCTION public.handle_invitation_cards_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.updated_at = now();

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'owner_id cannot be changed';
  END IF;

  IF NEW.status = 'published' AND OLD.published_at IS NULL THEN
    NEW.published_at = COALESCE(NEW.published_at, now());
  ELSE
    NEW.published_at = OLD.published_at;
  END IF;

  IF OLD.status = 'published' OR OLD.published_at IS NOT NULL THEN
    IF btrim(coalesce(NEW.title, '')) IS DISTINCT FROM btrim(coalesce(OLD.title, ''))
       OR NEW.slug IS DISTINCT FROM OLD.slug
       OR btrim(coalesce(NEW.content->>'groomName', '')) IS DISTINCT FROM btrim(coalesce(OLD.content->>'groomName', ''))
       OR btrim(coalesce(NEW.content->>'brideName', '')) IS DISTINCT FROM btrim(coalesce(OLD.content->>'brideName', '')) THEN
      RAISE EXCEPTION 'Couple names and card title are locked after publishing and cannot be changed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.invitation_cards
SET published_at = COALESCE(published_at, updated_at, created_at, now())
WHERE status = 'published' AND published_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_invitation_expiry()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE parsed timestamptz; date_str text; normalized_date text;
BEGIN
  IF NEW.expires_at IS NULL THEN
    date_str := (NEW.content->>'date');
    IF date_str IS NOT NULL AND date_str <> '' THEN
      BEGIN
        normalized_date := regexp_replace(date_str, '\m(\d{1,2})(st|nd|rd|th)\M', '\1', 'gi');
        parsed := (normalized_date)::date + INTERVAL '1 day 23:59:59';
        NEW.expires_at := parsed;
      EXCEPTION WHEN OTHERS THEN
        NEW.expires_at := NEW.created_at + INTERVAL '2 days';
      END;
    ELSE
      NEW.expires_at := NEW.created_at + INTERVAL '2 days';
    END IF;
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
