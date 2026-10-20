-- Preserve topups after a shop has created more than ten non-deleted cards.
-- PostgreSQL checks INSERT constraints before ON CONFLICT; proposed rows for
-- existing partners must therefore use zero initial usage (the UPDATE preserves actual usage).
CREATE OR REPLACE FUNCTION public.record_partner_cash_package(requested_username text, requested_shop_name text)
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
    VALUES (account_id, trim(requested_shop_name), 10, CASE WHEN EXISTS (SELECT 1 FROM public.print_partners WHERE owner_id = account_id) THEN 0 ELSE existing_cards END)
    ON CONFLICT (owner_id) DO UPDATE SET
      cards_purchased = public.print_partners.cards_purchased + 10,
      shop_name = EXCLUDED.shop_name, active = true;
  INSERT INTO public.partner_cash_packages (owner_id) VALUES (account_id);
  RETURN account_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_partner_cash_package(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_partner_cash_package(text, text) TO service_role;
