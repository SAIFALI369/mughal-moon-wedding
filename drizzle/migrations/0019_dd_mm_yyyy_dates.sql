-- Parse DD/MM/YYYY ("xx/xx/xxxx") explicitly in set_invitation_expiry() so
-- Postgres never misreads day-first dates under MDY DateStyle.

CREATE OR REPLACE FUNCTION public.set_invitation_expiry()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  parsed timestamptz;
  parsed_date date;
  date_str text;
  normalized_date text;
BEGIN
  IF NEW.expires_at IS NULL THEN
    date_str := btrim(coalesce(NEW.content->>'date', ''));
    IF date_str <> '' THEN
      BEGIN
        IF date_str ~ '^\d{2}/\d{2}/\d{4}$' THEN
          parsed_date := to_date(date_str, 'DD/MM/YYYY');
          IF to_char(parsed_date, 'DD/MM/YYYY') = date_str THEN
            NEW.expires_at := (parsed_date + INTERVAL '1 day 23:59:59')::timestamptz;
          ELSE
            NEW.expires_at := NEW.created_at + INTERVAL '2 days';
          END IF;
        ELSE
          normalized_date := regexp_replace(date_str, '\m(\d{1,2})(st|nd|rd|th)\M', '\1', 'gi');
          parsed := (normalized_date)::date + INTERVAL '1 day 23:59:59';
          NEW.expires_at := parsed;
        END IF;
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
