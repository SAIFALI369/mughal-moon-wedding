-- Exclusive, cash-funded print-shop access. One cash package = INR 1000 / 10 new cards.
-- Credits are lifetime creations, NOT active slots; deletion/expiry never refunds them.
REVOKE ALL ON FUNCTION public.register_username(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_username(text, text) TO service_role;

CREATE TABLE public.print_partners (
  owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_name text NOT NULL CHECK (char_length(trim(shop_name)) BETWEEN 2 AND 120),
  active boolean NOT NULL DEFAULT true,
  cards_purchased integer NOT NULL DEFAULT 0 CHECK (cards_purchased >= 0),
  cards_created integer NOT NULL DEFAULT 0 CHECK (cards_created >= 0 AND cards_created <= cards_purchased),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.print_partners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.print_partners FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.print_partners TO authenticated;
GRANT ALL ON public.print_partners TO service_role;
CREATE POLICY "Partners read their own allowance" ON public.print_partners
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.partner_cash_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.print_partners(owner_id) ON DELETE CASCADE,
  amount_inr integer NOT NULL DEFAULT 1000 CHECK (amount_inr = 1000),
  card_credits integer NOT NULL DEFAULT 10 CHECK (card_credits = 10),
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method = 'cash'),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_cash_packages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_cash_packages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.partner_cash_packages TO authenticated;
GRANT ALL ON public.partner_cash_packages TO service_role;
CREATE POLICY "Partners read their own cash packages" ON public.partner_cash_packages
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- Owner-only operator operation; invoke ONLY after receiving INR 1000 in cash.
-- Supports enrolling an existing account or adding another ten credits.
CREATE FUNCTION public.record_partner_cash_package(requested_username text, requested_shop_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE account_id uuid; existing_cards integer;
BEGIN
  IF requested_shop_name IS NULL OR char_length(trim(requested_shop_name)) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Shop name must be 2–120 characters.';
  END IF;
  SELECT id INTO account_id FROM public.profiles WHERE lower(trim(username)) = lower(trim(requested_username));
  IF account_id IS NULL THEN RAISE EXCEPTION 'Account not found. Provision an account first.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(account_id::text));
  SELECT count(*)::integer INTO existing_cards FROM public.invitation_cards WHERE owner_id = account_id;
  IF existing_cards > 10 AND NOT EXISTS (SELECT 1 FROM public.print_partners WHERE owner_id = account_id) THEN
    RAISE EXCEPTION 'This legacy account needs an operator credit review before enrolment.';
  END IF;
  -- Existing legacy cards count against the first package; subsequent payments never reset usage.
  INSERT INTO public.print_partners (owner_id, shop_name, cards_purchased, cards_created)
    VALUES (account_id, trim(requested_shop_name), 10, existing_cards)
    ON CONFLICT (owner_id) DO UPDATE SET
      cards_purchased = public.print_partners.cards_purchased + 10,
      shop_name = EXCLUDED.shop_name, active = true;
  INSERT INTO public.partner_cash_packages (owner_id) VALUES (account_id);
  RETURN account_id;
END;
$$;

CREATE FUNCTION public.provision_print_partner(requested_username text, requested_password text, requested_shop_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  PERFORM public.register_username(requested_username, requested_password);
  RETURN public.record_partner_cash_package(requested_username, requested_shop_name);
END;
$$;
REVOKE ALL ON FUNCTION public.record_partner_cash_package(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_print_partner(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_partner_cash_package(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_print_partner(text, text, text) TO service_role;

-- Atomic row update serializes simultaneous creates. Trigger is AFTER INSERT so
-- INSERT ... ON CONFLICT DO NOTHING does not consume a credit for a skipped row.
-- Any error rolls the insert AND debit back together, including bulk inserts.
CREATE OR REPLACE FUNCTION public.enforce_invitation_card_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  UPDATE public.print_partners SET cards_created = cards_created + 1
    WHERE owner_id = NEW.owner_id AND active AND cards_created < cards_purchased;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner access is inactive or card credits are exhausted. Contact InvitingYou for a cash package.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invitation_cards_limit_trigger ON public.invitation_cards;
CREATE TRIGGER invitation_cards_limit_trigger AFTER INSERT ON public.invitation_cards
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invitation_card_limit();
REVOKE ALL ON FUNCTION public.enforce_invitation_card_limit() FROM PUBLIC, anon, authenticated;
