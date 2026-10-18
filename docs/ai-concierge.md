# Mohsin & Simran — Simran AI Wedding Concierge

The guest-facing AI assistant **Simran** at `/ai-concierge` supports English, Hindi, and Urdu. It answers only from the confirmed wedding details embedded in the Supabase Edge Function.

## Files

- `src/routes/ai-concierge.tsx` — TanStack Start page and `/ai-concierge` route for chatting with Simran.
- `supabase/functions/wedding-concierge/gemini-key.ts` — Supabase Edge Function configuration file where you can paste your `GEMINI_API_KEY` and `GEMINI_MODEL`.
- `supabase/.env` — Supabase environment file for setting `GEMINI_API_KEY` locally or pushing via `supabase secrets set --env-file supabase/.env`.
- `supabase/functions/wedding-concierge/index.ts` — server-side Gemini proxy for Simran.

The invitation homepage links to Simran (`Ask Simran`). The page calls the function with:

```ts
supabase.functions.invoke("wedding-concierge", { body: { language, messages } });
```

## Where to add your Gemini API key

You can configure your Gemini API key in any of these places:

1. **Direct Supabase config file**: Open `supabase/functions/wedding-concierge/gemini-key.ts` and paste your key into `GEMINI_API_KEY = "your-gemini-api-key"`.
2. **Supabase `.env` file**: Open `supabase/.env` and set `GEMINI_API_KEY="your-gemini-api-key"`.
3. **Supabase Dashboard Secrets**: In **Supabase Dashboard → Edge Functions → Secrets**, add `GEMINI_API_KEY`.

Optionally set `GEMINI_MODEL` (defaults to `gemini-2.5-flash`) and `ALLOWED_ORIGIN` (for production origin restriction).

## Confirmed schedule

All times are India Standard Time (IST).

- Nikah: Sunday, 22 November 2026, 4:00 PM — Jama Masjid Hall, Chandni Chowk, Old Delhi.
- Barat / Reception: Sunday, 22 November 2026, 7:30 PM — The Imperial Ballroom, Janpath, New Delhi.
- Walima: Monday, 23 November 2026, 8:00 PM — The Leela Palace, Chanakyapuri, New Delhi.

The homepage hero, countdown, event cards, story milestone, and downloadable calendar use the same 2026 schedule. Verify venues, times, and dress codes with the couple before launch.
