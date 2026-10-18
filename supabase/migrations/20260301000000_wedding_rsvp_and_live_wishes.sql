CREATE TABLE public.wedding_rsvps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
 guests integer NOT NULL CHECK (guests BETWEEN 1 AND 5),
 events text[] NOT NULL DEFAULT '{}',
 diet text NOT NULL DEFAULT '' CHECK (char_length(diet) <= 500),
 message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (events <@ ARRAY['Nikah','Barat','Walima']::text[])
);
GRANT INSERT (name, guests, events, diet, message) ON public.wedding_rsvps TO anon, authenticated;
GRANT ALL ON public.wedding_rsvps TO service_role;
ALTER TABLE public.wedding_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guests may submit one RSVP" ON public.wedding_rsvps FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE UNIQUE INDEX wedding_rsvps_unique_name ON public.wedding_rsvps (lower(regexp_replace(trim(name), '\s+', ' ', 'g')));
CREATE TABLE public.wedding_wishes (
 id uuid PRIMARY KEY,
 name text NOT NULL,
 message text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wedding_wishes TO anon, authenticated;
GRANT ALL ON public.wedding_wishes TO service_role;
ALTER TABLE public.wedding_wishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone may read public wishes" ON public.wedding_wishes FOR SELECT TO anon, authenticated USING (true);
CREATE FUNCTION public.publish_wedding_wish() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.wedding_wishes (id, name, message, created_at) VALUES (NEW.id, trim(NEW.name), trim(NEW.message), NEW.created_at);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_wedding_wish() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER publish_wedding_wish AFTER INSERT ON public.wedding_rsvps FOR EACH ROW EXECUTE FUNCTION public.publish_wedding_wish();
ALTER PUBLICATION supabase_realtime ADD TABLE public.wedding_wishes;