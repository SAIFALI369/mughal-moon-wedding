# Mohsin & Simran — Simran AI Wedding Concierge

The guest-facing AI assistant **Simran** at `/ai-concierge` supports English, Hindi, and Urdu. It answers wedding-specific questions from confirmed invitation facts and also supports general conversation, writing, explanations and light humour.

## Files

- `src/routes/ai-concierge.tsx` — TanStack Start page and `/ai-concierge` route for chatting with Simran.
- `supabase/functions/wedding-concierge/gemini-key.ts` — non-secret defaults for the assistant name and Gemini model. Never paste credentials into this tracked file.
- `supabase/.env` — Supabase environment file for setting `GEMINI_API_KEY` locally or pushing via `supabase secrets set --env-file supabase/.env`.
- `supabase/functions/wedding-concierge/index.ts` — server-side Gemini proxy for Simran.

The invitation homepage links to Simran (`Ask Simran`). The page calls the function with:

```ts
supabase.functions.invoke("wedding-concierge", { body: { language, messages } });
```

## Where to add your Gemini API key

The checked-in key is an **intentionally invalid dummy**, not a working credential. It is present in the shared server-only config and `supabase/.env.example` so the setup locations are easy to find. Both backends use the shared `gemini-2.5-flash` model default.

For local use, copy `supabase/.env.example` to `supabase/.env` (already prepared in this workspace) and replace the dummy value there. **Do not put a real key into `gemini-key.ts` or `.env.example`**, which are tracked by Git.

Replies require a valid key on at least one backend:

- **Production (recommended):** In **Supabase Dashboard → Edge Functions → Secrets**, set `GEMINI_API_KEY`. Deploy the function to the same project as `VITE_SUPABASE_URL`:
  ```sh
  supabase functions deploy wedding-concierge --project-ref zcqlvyzlbfhdkomexihd
  ```
- **CLI alternative for production:** After replacing the dummy in your private `supabase/.env`, run `supabase secrets set --env-file supabase/.env --project-ref zcqlvyzlbfhdkomexihd`. This uploads the private environment values to Supabase; the example file alone does not configure production.
- **Local development:** Set `GEMINI_API_KEY` in the ignored `supabase/.env`, or export it in the app server environment. Restart the dev server after changing environment variables.
- **Hosted app server fallback:** Set `GEMINI_API_KEY` in your hosting provider's server secrets and redeploy. The local `supabase/.env` is not uploaded automatically.

Never use a `VITE_` prefix for the Gemini key or commit it to source control.

Optionally set `GEMINI_MODEL` (defaults to `gemini-2.5-flash`) and `ALLOWED_ORIGIN` (the exact production origin for the Edge Function). Remove any stale `gemini-3.5-flash` override or replace it with a model available to your Gemini project.

## Troubleshooting replies

Both chat surfaces try the Edge Function first, then the app server. Each attempt is bounded so a stalled service cannot leave the chat stuck on “thinking”. Upstream Gemini calls have a 15-second timeout. Backend logs report HTTP failure status without logging keys or guest messages.

- **Not configured:** Add the key to the backend secrets as above. An empty or dummy key cannot generate AI responses.
- **400/404 from Gemini:** Check the configured model is supported by your account.
- **401/403:** Check the key and API access restrictions.
- **429:** Check Gemini quota/billing and retry later.
- **Browser CORS or function not found:** Deploy the function and verify `ALLOWED_ORIGIN` matches your site.

After deployment, test a greeting and a schedule question from both the homepage chat and `/ai-concierge`. Also test Hindi and Urdu. Do not paste keys into chat or browser code.

## Confirmed schedule

All times are India Standard Time (IST).

- Nikah: Sunday, 22 November 2026, 4:00 PM — Jama Masjid Hall, Chandni Chowk, Old Delhi.
- Barat / Reception: Sunday, 22 November 2026, 7:30 PM — The Imperial Ballroom, Janpath, New Delhi.
- Walima: Monday, 23 November 2026, 8:00 PM — The Leela Palace, Chanakyapuri, New Delhi.

The homepage hero, countdown, event cards, story milestone, and downloadable calendar use the same 2026 schedule. Verify venues, times, and dress codes with the couple before launch.

## Shared gallery and music updates

See [gallery-and-music.md](./gallery-and-music.md) for deployment of the shared five-photo gallery and visitor-local soundtrack. The model prompt now includes the six-track allowlist and supports playback control markers. Redeploy the Edge Function for free-form Gemini music requests; common music commands are handled instantly in the browser. Wedding event facts now come from `supabase/functions/_shared/wedding.ts` rather than duplicate backend strings.

## General conversation and personality

Simran is also a general-purpose AI companion, not a wedding-only FAQ. Both backends use `supabase/functions/_shared/concierge-personality.ts` for the same cheerful, witty voice. She can explain concepts, help with code/studying, translate, draft messages/captions/toasts, brainstorm and chat. She may use playful, mildly dark or self-deprecating humour when appropriate, but drops jokes when someone is distressed and does not mock faith, the couple, identities or real tragedies.

Wedding-specific claims must still match the shared invitation facts. General advice must not be represented as confirmed wedding arrangements. Simran has no live search/weather/news feed, cannot submit RSVPs, and must not solicit private guest information. Common greetings, capability descriptions and humour previews are exact offline replies; open-ended questions require a working Gemini backend.

On phones below 640px the header is 52px tall, the duplicate header chat shortcut is hidden, and the floating chat/music controls are 48px touch targets. Desktop styling is retained. Real-browser checks at 375px and 320px verified fit and the offline humour flow; live Gemini and production gallery behavior still require deployment.
