# Free AI router — how Simran answers almost without limit

## Is "unlimited free AI" actually possible?

**Not from one provider, and not with zero signups.** No company hands out an
unmetered LLM API for nothing. What _is_ possible — and what this repo now does —
is pooling **every permanent free tier** behind one router, so the ceiling is the
**sum** of all of them instead of the smallest one:

| What you configure         | Rough daily capacity for the concierge                     |
| -------------------------- | ---------------------------------------------------------- |
| Nothing at all             | Thousands of requests (3 keyless providers, per-IP limits) |
| 1 Gemini key               | ~1,500/day, plus the keyless fallback                      |
| Gemini + Groq + OpenRouter | ~3,500–5,000/day                                           |
| 8–10 providers, 1 key each | ~15,000–25,000/day                                         |
| 10 providers × 3 keys each | ~50,000+/day                                               |

A wedding with 500 guests sending 20 messages each is ~10,000 messages for the
whole event. The pool above handles that for **₹0 / $0**, and it keeps working
when any single provider goes down or rate-limits you, because the router fails
over inside the same request.

What it is **not**: a licence to resell, a way around paid tiers, or a place to
send confidential data. Free tiers are usually logged and may be used to improve
the provider's models. The concierge prompt already forbids asking guests for
private information — keep it that way.

## What was built

- **`supabase/functions/_shared/free-router.ts`** — the router. Runtime-agnostic:
  it runs unchanged in the Supabase Edge (Deno) runtime and in the Node/TanStack
  app server.
- **`src/components/wedding/gemini.server.ts`** — `generateAiReply()` replaces the
  old single-key `generateGeminiReply()` for the homepage concierge, each card's
  assistant, and the partner form reader. `generateGeminiReply` remains as a
  backwards-compatible alias.
- **`src/lib/ai-limits.ts`** — configurable daily allowances.
- **`scripts/check-free-ai.mjs`** (`npm run ai:check`) — probes every route and
  prints which ones are live.
- **`supabase/functions/wedding-concierge/index.ts`** — the Edge Function now
  calls the same pool instead of Gemini directly.

### How routing works

1. Every configured key × model becomes a route, ordered so keyed providers come
   first and the keyless safety net comes last.
2. Each request starts from a **rotating offset**, so load spreads across the
   whole pool instead of hammering the fastest provider.
3. A `429`, any `5xx`, a timeout, a network error or an empty answer moves to the
   **next route immediately** — the guest never sees it.
4. A route that fails is put in a short **cooldown** (45s, longer for a bad key),
   so the following requests skip it instead of queueing behind it.
5. Everything is bounded by a total time budget (20s by default) so a slow
   provider cannot hang the chat.

## Quick start

### 1. It already works — test it

Three providers need **no key and no signup**, and they are in the pool by
default: Kilo Code (`~200 req/hour per IP`), OVHcloud AI Endpoints (`2 RPM per IP
per model`, EU-hosted) and LLM7.io. A fresh deploy answers questions before you
configure anything.

```sh
npm run ai:check
```

### 2. Add free keys to multiply the pool

Keep your existing `GEMINI_API_KEY` where it is and add as many of these as you
like. All of them have permanent free tiers and none needs a credit card:

| Provider      | Env var                                          | Get a key                                     | Why bother                              |
| ------------- | ------------------------------------------------ | --------------------------------------------- | --------------------------------------- |
| Google Gemini | `GEMINI_API_KEY`                                 | <https://aistudio.google.com/apikey>          | Best Hindi/Urdu quality                 |
| Groq          | `GROQ_API_KEY`                                   | <https://console.groq.com/keys>               | Instant signup, very fast               |
| OpenRouter    | `OPENROUTER_API_KEY`                             | <https://openrouter.ai/keys>                  | `openrouter/free` spans ~17 free models |
| Cerebras      | `CEREBRAS_API_KEY`                               | <https://cloud.cerebras.ai>                   | ~14,400 RPD                             |
| Mistral       | `MISTRAL_API_KEY`                                | <https://console.mistral.ai/api-keys>         | Free mode on by default                 |
| NVIDIA NIM    | `NVIDIA_API_KEY`                                 | <https://build.nvidia.com>                    | 100+ models                             |
| Cloudflare    | `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` | <https://dash.cloudflare.com>                 | 10,000 Neurons/day                      |
| Z AI / GLM    | `ZAI_API_KEY`                                    | <https://open.bigmodel.cn/usercenter/apikeys> | Permanently free flash models           |
| Cohere        | `COHERE_API_KEY`                                 | <https://dashboard.cohere.com/api-keys>       | Trial key, 1,000 calls/month            |
| Hugging Face  | `HF_TOKEN`                                       | <https://huggingface.co/settings/tokens>      | Huge model catalogue                    |
| ModelScope    | `MODELSCOPE_API_KEY`                             | <https://modelscope.cn/my/myaccesstoken>      | ~2,000 requests/day                     |
| SiliconFlow   | `SILICONFLOW_API_KEY`                            | <https://cloud.siliconflow.cn/account/ak>     | Free models (verification needed)       |
| Aion Labs     | `AION_API_KEY`                                   | <https://www.aionlabs.ai/app/api-keys/>       | 15 RPM, 20K tokens/day                  |
| Ollama Cloud  | `OLLAMA_API_KEY`                                 | <https://ollama.com/settings/keys>            | Free tier, resets every 5h              |

**Every `*_API_KEY` accepts a comma-separated list**, and each key becomes its own
independent allowance:

```sh
GROQ_API_KEY="gsk_key-one,gsk_key-two,gsk_key-three"
```

Three free Groq accounts = three times the requests. This is the single easiest
way to scale the pool, and it is entirely within each provider's own terms (one
key per account; do **not** share, scrape or buy keys).

### 3. Put the secrets where each backend can see them

The browser tries the **Supabase Edge Function** first, then the **app server**.
To get the full pool on both paths, set the same values in both places:

```sh
# Edge Function (Supabase)
cp supabase/.env.example supabase/.env      # fill in, then:
supabase secrets set --env-file supabase/.env --project-ref ibqkslwleelhijhujjcm
supabase functions deploy wedding-concierge --project-ref ibqkslwleelhijhujjcm
```

- **Vercel** (app server): Project → Settings → Environment Variables.
- **Local**: the git-ignored `supabase/.env`; `gemini.server.ts` reads it
  automatically. Real environment variables always win over the file.

Never use a `VITE_` prefix for any of these, and never commit them.

## Raising the daily allowance

The old caps (5 on the homepage, 6 per card) existed to protect one small quota.
They are now environment-driven:

| Variable                  | Default | Meaning                                                         |
| ------------------------- | ------- | --------------------------------------------------------------- |
| `AI_DAILY_LIMIT_HOMEPAGE` | `100`   | Answers per guest/day for `/ai-concierge` and the homepage chat |
| `AI_DAILY_LIMIT_CARD`     | `100`   | Answers per guest/day for one host's card assistant             |
| `AI_DAILY_LIMIT_FORM`     | `40`    | Partner form reads per partner/day                              |
| `AI_BURST_PER_MINUTE`     | `30`    | Per-visitor burst guard in the Edge Function                    |

Set any of them to **`0`** to remove that cap entirely — the UI hides its counter
and shows "Unlimited messages" instead. The Postgres ledger
(`public.ai_message_usage`) still counts everything, so you keep the telemetry
either way.

## Pool controls

| Variable                     | Purpose                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `FREE_AI_PROVIDERS`          | Comma-separated provider order (default: the catalogue order)     |
| `FREE_AI_DISABLED_PROVIDERS` | Drop providers, e.g. `llm7,modelscope`                            |
| `FREE_AI_ENABLE_KEYLESS`     | `false` to run keys-only and never touch a keyless provider       |
| `FREE_AI_ROUTES`             | JSON array of extra OpenAI-compatible endpoints                   |
| `FREE_AI_ROUTE_TIMEOUT_MS`   | Per-route timeout (default `12000`)                               |
| `FREE_AI_TOTAL_TIMEOUT_MS`   | Total budget for one answer (default `20000`)                     |
| `<PROVIDER>_MODEL`           | Override a provider's model list, comma-separated, tried in order |

Custom endpoint example — useful for a self-hosted Ollama or LM Studio box:

```sh
FREE_AI_ROUTES='[{"name":"Home server","url":"http://127.0.0.1:1234/v1/chat/completions","model":"qwen2.5-7b"}]'
```

Only `https://` URLs are accepted, so the loopback example above needs the
router's own network to allow it.

## Reference sources

Three upstream catalogues are vendored as git submodules under `third-party/`,
and the provider defaults here are taken from them:

- **`third-party/awesome-free-llm-apis`** — [mnfst/awesome-free-llm-apis](https://github.com/mnfst/awesome-free-llm-apis),
  a verified list of permanent free LLM APIs. `data.json` is the source for the
  model names and rate-limit notes in the catalogue.
- **`third-party/freeroute`** — [neuralnexustech/freeroute](https://github.com/neuralnexustech/freeroute),
  a self-hosted OpenAI gateway. Its provider registry is where the
  "pool free tiers behind one endpoint, failover on 429/5xx" pattern comes from.
- **`third-party/free-llm-api-keys`** — [freellms/free-llm-api-keys](https://github.com/freellms/free-llm-api-keys),
  a directory of where to get each free key.

Pull them with:

```sh
git submodule update --init --remote third-party/awesome-free-llm-apis
```

Re-running `npm run ai:check` after an update tells you which defaults still
answer, because free catalogues change often — models get retired, rate limits
move, and keyless pools come and go.

## Troubleshooting

| Symptom                           | Fix                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run ai:check` shows all FAIL | No outbound network (CI, firewall). Run it from your machine.                                        |
| One provider FAILs, others pass   | Expected — that key is exhausted or the model was retired. Remove it or override `<PROVIDER>_MODEL`. |
| Every route FAILs                 | Check outbound HTTPS from your host; then `FREE_AI_DISABLED_PROVIDERS` to isolate.                   |
| Answers are slow                  | Drop the slow providers with `FREE_AI_DISABLED_PROVIDERS`, or lower `FREE_AI_ROUTE_TIMEOUT_MS`.      |
| "AI service is not configured"    | The pool is empty — you set `FREE_AI_ENABLE_KEYLESS=false` without adding keys.                      |
| Guest sees "used all N messages"  | Raise or zero the `AI_DAILY_LIMIT_*` value for that surface.                                         |

See [ai-concierge.md](./ai-concierge.md) for the concierge itself and
[hosting.md](./hosting.md) for the full environment variable reference.
