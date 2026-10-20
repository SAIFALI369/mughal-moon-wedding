-- One shared daily quota for every AI surface.
--
-- Before this, the browser, the Supabase Edge Function and the app server each
-- kept their own in-memory counter, so a guest could be told "no messages left"
-- after a single question, and failed requests still burned the allowance.
--
-- The ledger below is keyed by scope (the homepage, or one card) and a hashed
-- visitor id. Only successful answers are charged: the caller reserves a slot,
-- then refunds it if the model fails.

CREATE TABLE IF NOT EXISTS public.ai_message_usage (
  scope text NOT NULL CHECK (char_length(scope) BETWEEN 1 AND 120),
  visitor_key text NOT NULL CHECK (char_length(visitor_key) BETWEEN 8 AND 128),
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, visitor_key)
);
CREATE INDEX IF NOT EXISTS ai_message_usage_window_idx
  ON public.ai_message_usage (window_started_at);

ALTER TABLE public.ai_message_usage ENABLE ROW LEVEL SECURITY;
-- No policies: guests never read or write the ledger directly. Only the
-- security-definer functions below (service role) may touch it.
REVOKE ALL ON public.ai_message_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_message_usage TO service_role;

/**
 * Reserve one AI answer. Returns the remaining allowance and when it resets.
 * The row is locked so two devices cannot spend the last message twice.
 */
CREATE OR REPLACE FUNCTION public.consume_ai_message(
  p_scope text,
  p_visitor text,
  p_limit integer,
  p_window_hours integer DEFAULT 24
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  used_count integer;
  window_start timestamptz;
  window_end timestamptz;
BEGIN
  IF p_scope IS NULL OR char_length(p_scope) NOT BETWEEN 1 AND 120
     OR p_visitor IS NULL OR char_length(p_visitor) NOT BETWEEN 8 AND 128
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500
     OR p_window_hours IS NULL OR p_window_hours NOT BETWEEN 1 AND 168 THEN
    RAISE EXCEPTION 'Invalid AI quota request';
  END IF;

  INSERT INTO public.ai_message_usage (scope, visitor_key, used, window_started_at, updated_at)
  VALUES (p_scope, p_visitor, 0, now(), now())
  ON CONFLICT (scope, visitor_key) DO NOTHING;

  SELECT used, window_started_at INTO used_count, window_start
    FROM public.ai_message_usage
   WHERE scope = p_scope AND visitor_key = p_visitor
   FOR UPDATE;

  IF now() >= window_start + make_interval(hours => p_window_hours) THEN
    used_count := 0;
    window_start := now();
  END IF;
  window_end := window_start + make_interval(hours => p_window_hours);

  IF used_count >= p_limit THEN
    UPDATE public.ai_message_usage
       SET used = used_count, window_started_at = window_start, updated_at = now()
     WHERE scope = p_scope AND visitor_key = p_visitor;
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'limit', p_limit,
      'resetsAt', window_end
    );
  END IF;

  used_count := used_count + 1;
  UPDATE public.ai_message_usage
     SET used = used_count, window_started_at = window_start, updated_at = now()
   WHERE scope = p_scope AND visitor_key = p_visitor;

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_limit - used_count,
    'limit', p_limit,
    'resetsAt', window_end
  );
END;
$$;

/** Give back a reservation when the model failed, so an error costs nothing. */
CREATE OR REPLACE FUNCTION public.refund_ai_message(p_scope text, p_visitor text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.ai_message_usage
     SET used = greatest(used - 1, 0), updated_at = now()
   WHERE scope = p_scope AND visitor_key = p_visitor;
END;
$$;

-- Supabase grants EXECUTE to anon/authenticated by default on new functions, so
-- revoke those explicit grants too; only the service role may charge the ledger.
REVOKE ALL ON FUNCTION public.consume_ai_message(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_ai_message(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_message(text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_ai_message(text, text) TO service_role;

COMMENT ON TABLE public.ai_message_usage IS
  'Daily AI answer quota per scope and hashed visitor. Only successful answers are charged.';
COMMENT ON FUNCTION public.consume_ai_message(text, text, integer, integer) IS
  'Atomically reserve one AI answer; returns allowed, remaining, limit and resetsAt.';
