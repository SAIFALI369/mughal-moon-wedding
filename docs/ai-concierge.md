# Mohsin & Simran — AI Wedding Concierge

The guest-facing concierge at `/ai-concierge` supports English, Hindi, and Urdu. It answers only from the confirmed wedding details embedded in the Supabase Edge Function.

## Files

- `src/routes/ai-concierge.tsx` — TanStack Start page and `/ai-concierge` route.
- `supabase/functions/wedding-concierge/index.ts` — server-side Gemini proxy. The Gemini key never enters the browser bundle.

The invitation homepage links to the concierge. The page calls the function with:

```ts
supabase.functions.invoke("wedding-concierge", { body: { language, messages } });
```

## Configure and deploy

1. Rotate any Gemini key that has previously been pasted into chat or otherwise exposed.
2. In **Supabase Dashboard → Edge Functions → Secrets**, add the replacement key as `GEMINI_API_KEY`. Do not put it in `.env`, a `VITE_*` variable, the React route, or Git.
3. Optionally add `GEMINI_MODEL` as a server-side secret. If it is omitted, the function uses `gemini-2.5-flash`.
4. Optionally set `ALLOWED_ORIGIN` to the production invitation origin, such as `https://mughal-moon-wedding.lovable.app`. Leave it unset while using changing preview URLs.
5. Deploy the `wedding-concierge` Edge Function through Lovable Cloud or Supabase.
6. Before sharing the public invitation widely, configure a Gemini usage quota. The function includes a best-effort per-instance limit of 12 requests per IP per minute; high-traffic production use should add distributed rate limiting or bot protection as well.

The concierge is intentionally available to anonymous wedding guests, so `supabase/config.toml` disables legacy JWT verification for this function. The handler still accepts only `POST` requests, rejects request bodies over 12 KB, caps the conversation at 10 messages and each message at 800 characters, times out slow upstream requests, and refuses to claim that it submitted an RSVP. Guests must use the invitation form for RSVP details.

## Confirmed schedule

All times are India Standard Time (IST).

- Nikah: Sunday, 22 November 2026, 4:00 PM — Jama Masjid Hall, Chandni Chowk, Old Delhi.
- Barat / Reception: Sunday, 22 November 2026, 7:30 PM — The Imperial Ballroom, Janpath, New Delhi.
- Walima: Monday, 23 November 2026, 8:00 PM — The Leela Palace, Chanakyapuri, New Delhi.

The homepage hero, countdown, event cards, story milestone, and downloadable calendar use the same 2026 schedule. Verify venues, times, and dress codes with the couple before launch.
