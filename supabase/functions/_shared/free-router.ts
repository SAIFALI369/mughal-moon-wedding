/**
 * Free-tier AI router.
 *
 * Simran used to depend on a single `GEMINI_API_KEY`. When that key hit its free
 * quota every guest saw an error, and the app capped everyone at five answers a
 * day to stay inside the limit. This module replaces that single point of
 * failure with a pool:
 *
 *   - ~14 free-tier providers, each with its own permanent free allowance
 *     (Gemini, Groq, OpenRouter, Cerebras, Mistral, NVIDIA NIM, Cloudflare,
 *     Cohere, Z AI, Hugging Face, ModelScope, SiliconFlow, Aion Labs, Ollama).
 *   - 3 providers that need no key at all (Kilo Code, OVHcloud, LLM7.io), so a
 *     fresh clone can answer questions before any signup.
 *   - Every `*_API_KEY` accepts a comma-separated list, so a second free
 *     account multiplies the allowance instead of sitting idle.
 *   - Automatic failover: 429 / 5xx / timeout / empty answer moves to the next
 *     route in the same request, and a route that fails is cooled down briefly
 *     so the following requests do not queue behind it.
 *
 * The result is a pool whose daily capacity is the sum of every free tier in it.
 * Add keys and the ceiling rises; add none and the keyless routes still answer.
 *
 * The file is runtime-agnostic on purpose: it runs in the Supabase Edge (Deno)
 * runtime and in the Node/TanStack app server, so every environment read goes
 * through `readEnv` and no Deno- or Node-only global is touched.
 */

export type ChatTurn = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** One concrete "provider + key + model" combination the router can call. */
export type AiRoute = {
  id: string;
  provider: string;
  label: string;
  url: string;
  model: string;
  /** Empty for keyless providers. */
  apiKey: string;
  keyless: boolean;
  headers: Record<string, string>;
};

export type AiRouteDiagnostics = {
  id: string;
  provider: string;
  label: string;
  model: string;
  keyless: boolean;
  configured: boolean;
};

export type EnvLookup = (name: string) => string | undefined;

type ProviderSpec = {
  slug: string;
  name: string;
  baseUrl: string;
  chatPath: string;
  /** Tried in order; the first model that answers wins. */
  models: string[];
  modelEnv: string;
  /** Absent means the provider answers without a key. */
  keyEnv?: string;
  /** Extra env vars that must be set before this provider is usable. */
  requires?: string[];
  /** Providers whose URL embeds an account id. */
  buildUrl?: (env: EnvLookup) => string | null;
  extraHeaders?: (env: EnvLookup) => Record<string, string>;
  signupUrl: string;
  note: string;
};

/** Dummy values shipped in tracked files must never be treated as real keys. */
const PLACEHOLDER_KEYS = new Set([
  "replace_with_your_gemini_api_key",
  "replace_me",
  "your_api_key",
  "changeme",
  "xxx",
]);

const DEFAULT_TOTAL_BUDGET_MS = 20_000;
const DEFAULT_ROUTE_TIMEOUT_MS = 12_000;
/** A route that just failed is skipped for a short while. */
const COOLDOWN_MS = 45_000;
const COOLDOWN_MAP_LIMIT = 500;

/**
 * Provider catalogue. Order matters: the cheapest, fastest, most generous free
 * tiers come first and the keyless safety net comes last.
 *
 * Defaults are refreshed from `third-party/awesome-free-llm-apis/data.json`
 * (vendored as a submodule). Override any model with its `*_MODEL` env var.
 */
export const PROVIDER_CATALOG: ProviderSpec[] = [
  {
    slug: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    chatPath: "/chat/completions",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
    modelEnv: "GEMINI_MODEL",
    keyEnv: "GEMINI_API_KEY",
    signupUrl: "https://aistudio.google.com/apikey",
    note: "Free tier, no card. Best at Hindi/Urdu. ~1,500 RPD.",
  },
  {
    slug: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    chatPath: "/chat/completions",
    models: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b"],
    modelEnv: "GROQ_MODEL",
    keyEnv: "GROQ_API_KEY",
    signupUrl: "https://console.groq.com/keys",
    note: "Instant signup, no card. ~1,000 RPD per model.",
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    chatPath: "/chat/completions",
    models: [
      "openrouter/free",
      "google/gemma-4-31b-it:free",
      "nvidia/nemotron-3-super-120b-a12b:free",
    ],
    modelEnv: "OPENROUTER_MODEL",
    keyEnv: "OPENROUTER_API_KEY",
    signupUrl: "https://openrouter.ai/keys",
    note: "`openrouter/free` auto-routes across ~17 free models. 50 RPD/model.",
  },
  {
    slug: "cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    chatPath: "/chat/completions",
    models: ["llama-3.3-70b", "qwen-3-32b"],
    modelEnv: "CEREBRAS_MODEL",
    keyEnv: "CEREBRAS_API_KEY",
    signupUrl: "https://cloud.cerebras.ai",
    note: "No card. ~14,400 RPD.",
  },
  {
    slug: "mistral",
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    chatPath: "/chat/completions",
    models: ["mistral-small-latest", "ministral-8b-latest"],
    modelEnv: "MISTRAL_MODEL",
    keyEnv: "MISTRAL_API_KEY",
    signupUrl: "https://console.mistral.ai/api-keys",
    note: "Free mode is on by default; ~$10/month of credits.",
  },
  {
    slug: "nvidia",
    name: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    chatPath: "/chat/completions",
    models: ["meta/llama-3.3-70b-instruct", "nvidia/nemotron-3-super-120b-a12b"],
    modelEnv: "NVIDIA_MODEL",
    keyEnv: "NVIDIA_API_KEY",
    signupUrl: "https://build.nvidia.com",
    note: "Free with a developer account, 100+ models.",
  },
  {
    slug: "cloudflare",
    name: "Cloudflare Workers AI",
    baseUrl: "",
    chatPath: "/chat/completions",
    models: ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/openai/gpt-oss-20b"],
    modelEnv: "CLOUDFLARE_MODEL",
    keyEnv: "CLOUDFLARE_API_TOKEN",
    requires: ["CLOUDFLARE_ACCOUNT_ID"],
    buildUrl: (env) => {
      const account = (env("CLOUDFLARE_ACCOUNT_ID") || "").trim();
      if (!account || !/^[a-zA-Z0-9_-]{8,64}$/.test(account)) return null;
      return `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`;
    },
    signupUrl: "https://dash.cloudflare.com/?to=/:account/ai/workers-ai",
    note: "10,000 Neurons/day, no card. Needs account id + token.",
  },
  {
    slug: "zai",
    name: "Z AI (GLM)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    chatPath: "/chat/completions",
    models: ["glm-4.7-flash", "glm-4.5-flash"],
    modelEnv: "ZAI_MODEL",
    keyEnv: "ZAI_API_KEY",
    signupUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    note: "Permanently free flash models, no card.",
  },
  {
    slug: "cohere",
    name: "Cohere",
    baseUrl: "https://api.cohere.com/compatibility/v1",
    chatPath: "/chat/completions",
    models: ["command-r-08-2024", "command-r7b-12-2024"],
    modelEnv: "COHERE_MODEL",
    keyEnv: "COHERE_API_KEY",
    signupUrl: "https://dashboard.cohere.com/api-keys",
    note: "Free trial key, 1,000 calls/month. Non-commercial only.",
  },
  {
    slug: "huggingface",
    name: "Hugging Face",
    baseUrl: "https://router.huggingface.co/v1",
    chatPath: "/chat/completions",
    models: ["meta-llama/Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-7B-Instruct"],
    modelEnv: "HF_MODEL",
    keyEnv: "HF_TOKEN",
    signupUrl: "https://huggingface.co/settings/tokens",
    note: "Free inference credits for every account.",
  },
  {
    slug: "modelscope",
    name: "ModelScope",
    baseUrl: "https://api-inference.modelscope.cn/v1",
    chatPath: "/chat/completions",
    models: ["Qwen/Qwen3.5-35B-A3B", "Qwen/Qwen3-8B"],
    modelEnv: "MODELSCOPE_MODEL",
    keyEnv: "MODELSCOPE_API_KEY",
    signupUrl: "https://modelscope.cn/my/myaccesstoken",
    note: "~2,000 requests/day. Needs Alibaba account binding.",
  },
  {
    slug: "siliconflow",
    name: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    chatPath: "/chat/completions",
    models: ["Qwen/Qwen3-8B"],
    modelEnv: "SILICONFLOW_MODEL",
    keyEnv: "SILICONFLOW_API_KEY",
    signupUrl: "https://cloud.siliconflow.cn/account/ak",
    note: "Permanently free models; identity verification required.",
  },
  {
    slug: "aionlabs",
    name: "Aion Labs",
    baseUrl: "https://api.aionlabs.ai/v1",
    chatPath: "/chat/completions",
    models: ["aion-labs/aion-2.0", "aion-labs/aion-3.0-mini"],
    modelEnv: "AION_MODEL",
    keyEnv: "AION_API_KEY",
    signupUrl: "https://www.aionlabs.ai/app/api-keys/",
    note: "15 RPM, 20K tokens/day, no card.",
  },
  {
    slug: "ollama",
    name: "Ollama Cloud",
    baseUrl: "https://ollama.com/v1",
    chatPath: "/chat/completions",
    models: ["gpt-oss:20b", "deepseek-v4-flash"],
    modelEnv: "OLLAMA_MODEL",
    keyEnv: "OLLAMA_API_KEY",
    signupUrl: "https://ollama.com/settings/keys",
    note: "Free tier with session limits that reset every 5 hours.",
  },
  // ---- Keyless safety net: no signup, no env var, always in the pool ----
  {
    slug: "kilo",
    name: "Kilo Code (keyless)",
    baseUrl: "https://api.kilo.ai/api/gateway",
    chatPath: "/chat/completions",
    models: ["kilo-auto/free"],
    modelEnv: "KILO_MODEL",
    signupUrl: "https://kilo.ai",
    note: "No key needed. Auto-router over a free pool, ~200 requests/hour per IP.",
  },
  {
    slug: "ovh",
    name: "OVHcloud AI Endpoints (keyless)",
    baseUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
    chatPath: "/chat/completions",
    models: ["gpt-oss-20b", "gpt-oss-120b", "Qwen3.5-397B-A17B"],
    modelEnv: "OVH_MODEL",
    signupUrl: "https://endpoints.ai.cloud.ovh.net/",
    note: "Permanent anonymous tier, no key, 2 RPM per IP per model. EU hosted.",
  },
  {
    slug: "llm7",
    name: "LLM7.io (keyless)",
    baseUrl: "https://api.llm7.io/v1",
    chatPath: "/chat/completions",
    models: ["gpt-oss:20b", "mistral-Nemo-Instruct-2407"],
    modelEnv: "LLM7_MODEL",
    signupUrl: "https://token.llm7.io/",
    note: "Anonymous access reaches the `turbo` models; a free token raises the cap.",
  },
];

/** Default provider order; `FREE_AI_PROVIDERS` overrides it. */
export const DEFAULT_PROVIDER_ORDER = PROVIDER_CATALOG.map((p) => p.slug);

type GlobalWithRuntimes = {
  Deno?: { env?: { get(name: string): string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(): GlobalWithRuntimes {
  return globalThis as GlobalWithRuntimes;
}

/**
 * Read an environment value from whichever runtime we are in. Real environment
 * variables always win; `extra` is a lower-priority layer the app server uses to
 * pick up values from the git-ignored `supabase/.env` during local development.
 */
export function readEnv(name: string, extra?: Record<string, string>): string | undefined {
  const g = runtimeEnv();
  const fromDeno = g.Deno?.env?.get?.(name);
  if (fromDeno !== undefined && fromDeno !== "") return fromDeno;
  const fromProcess = g.process?.env?.[name];
  if (fromProcess !== undefined && fromProcess !== "") return fromProcess;
  const local = extra?.[name];
  return local !== undefined && local !== "" ? local : undefined;
}

function normalise(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^["']|["']$/g, "");
}

/** Split a comma-separated secret list, dropping blanks and placeholders. */
export function parseKeyList(raw: string | undefined): string[] {
  return normalise(raw)
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && !PLACEHOLDER_KEYS.has(k.toLowerCase()));
}

function parseList(raw: string | undefined): string[] {
  return normalise(raw)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function safeModel(model: string): boolean {
  return /^[a-zA-Z0-9._:/@-]{1,120}$/.test(model);
}

function modelList(spec: ProviderSpec, env: EnvLookup): string[] {
  const configured = parseList(env(spec.modelEnv)).filter(safeModel);
  const models = configured.length > 0 ? configured : spec.models;
  return models.filter(safeModel).slice(0, 5);
}

/** Parse the optional `FREE_AI_ROUTES` escape hatch (JSON array of custom routes). */
function customRoutes(env: EnvLookup): AiRoute[] {
  const raw = normalise(env("FREE_AI_ROUTES"));
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("FREE_AI_ROUTES is not valid JSON; custom routes ignored");
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const routes: AiRoute[] = [];
  parsed.slice(0, 20).forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const item = entry as Record<string, unknown>;
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const model = typeof item.model === "string" ? item.model.trim() : "";
    if (!/^https:\/\//.test(url) || !safeModel(model)) return;
    const name =
      typeof item.name === "string" && item.name.trim() ? item.name.trim() : `custom-${index + 1}`;
    routes.push({
      id: `custom-${index + 1}:${model}`,
      provider: "custom",
      label: name,
      url,
      model,
      apiKey: typeof item.apiKey === "string" ? item.apiKey.trim() : "",
      keyless: !(typeof item.apiKey === "string" && item.apiKey.trim()),
      headers: {},
    });
  });
  return routes;
}

/**
 * Expand the catalogue into concrete routes. Each key × model pair is its own
 * route, so three Groq keys give three independent allowances.
 */
export function buildRoutes(
  envLookup: EnvLookup = (name) => readEnv(name),
  extraEnv?: Record<string, string>,
): AiRoute[] {
  const env: EnvLookup = (name) => envLookup(name) ?? readEnv(name, extraEnv);
  const disabled = new Set(
    parseList(env("FREE_AI_DISABLED_PROVIDERS")).map((s) => s.toLowerCase()),
  );
  const keylessAllowed = normalise(env("FREE_AI_ENABLE_KEYLESS")).toLowerCase() !== "false";

  const order = parseList(env("FREE_AI_PROVIDERS"));
  const slugs = (order.length > 0 ? order : DEFAULT_PROVIDER_ORDER)
    .map((s) => s.toLowerCase())
    .filter((s) => !disabled.has(s));

  const specs = slugs
    .map((slug) => PROVIDER_CATALOG.find((p) => p.slug === slug))
    .filter((spec): spec is ProviderSpec => !!spec);

  const routes: AiRoute[] = [];
  for (const spec of specs) {
    const baseUrl = spec.buildUrl ? spec.buildUrl(env) : spec.baseUrl;
    if (!baseUrl) continue;
    const models = modelList(spec, env);
    if (models.length === 0) continue;

    const keys = spec.keyEnv ? parseKeyList(env(spec.keyEnv)) : [];
    if (spec.keyEnv) {
      if (spec.requires?.some((name) => !normalise(env(name)))) continue;
      if (keys.length === 0) continue;
    } else if (!keylessAllowed) {
      continue;
    }

    const extraHeaders = spec.extraHeaders?.(env) ?? {};
    const keySlots = keys.length > 0 ? keys : [""];
    // Keys are the outer loop: rate limits are per key, so spreading across
    // keys first keeps us clear of 429s before falling back to a slower model.
    keySlots.forEach((apiKey, keyIndex) => {
      models.forEach((model) => {
        routes.push({
          id: `${spec.slug}#${keyIndex + 1}:${model}`,
          provider: spec.slug,
          label: spec.name,
          url: `${baseUrl.replace(/\/$/, "")}${spec.chatPath}`,
          model,
          apiKey,
          keyless: !apiKey,
          headers: { ...extraHeaders },
        });
      });
    });
  }

  return [...routes, ...customRoutes(env)];
}

/** Never let a secret reach a log line or a client payload. */
function fingerprint(key: string): string {
  return key ? `${key.slice(0, 3)}…${key.slice(-2)}` : "keyless";
}

// ---------------------------------------------------------------------------
// Runtime state: rotation cursor + short cooldowns for routes that just failed.
// ---------------------------------------------------------------------------

const cooldowns = new Map<string, number>();
let rotation = 0;

/** Exposed for tests so one test cannot leak state into the next. */
export function resetRouterState(): void {
  cooldowns.clear();
  rotation = 0;
}

function cooledDown(id: string, now: number): boolean {
  const until = cooldowns.get(id);
  if (until === undefined) return false;
  if (until <= now) {
    cooldowns.delete(id);
    return false;
  }
  return true;
}

function coolDown(id: string, now: number, milliseconds: number): void {
  if (cooldowns.size > COOLDOWN_MAP_LIMIT) {
    for (const [key, until] of cooldowns) if (until <= now) cooldowns.delete(key);
    if (cooldowns.size > COOLDOWN_MAP_LIMIT) cooldowns.clear();
  }
  cooldowns.set(id, now + milliseconds);
}

/**
 * Order routes for one request: healthy routes first, starting from a rotating
 * offset so load spreads across the whole pool instead of hammering the head.
 */
export function orderRoutes(routes: AiRoute[], now = Date.now()): AiRoute[] {
  const healthy = routes.filter((route) => !cooledDown(route.id, now));
  const usable = healthy.length > 0 ? healthy : routes;
  if (usable.length === 0) return [];
  const offset = rotation++ % usable.length;
  return [...usable.slice(offset), ...usable.slice(0, offset)];
}

type ChatCompletionBody = {
  choices?: Array<{
    message?: { content?: string | Array<{ text?: string } | string>; reasoning?: string };
    text?: string;
  }>;
  error?: { message?: string } | string;
};

function extractText(payload: ChatCompletionBody): string {
  const message = payload.choices?.[0]?.message;
  const content = message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : (part?.text ?? "")))
      .join("")
      .trim();
  }
  if (typeof payload.choices?.[0]?.text === "string") return payload.choices[0].text.trim();
  return "";
}

export type AiChatOptions = {
  systemInstruction: string;
  messages: ChatTurn[];
  maxOutputTokens?: number;
  temperature?: number;
  /** Ask for strict JSON where the provider supports it. */
  jsonMode?: boolean;
  env?: Record<string, string>;
  routes?: AiRoute[];
  /** Injected in tests and by scripts/check-free-ai.mjs. */
  fetchImpl?: typeof fetch;
  now?: () => number;
  totalBudgetMs?: number;
  routeTimeoutMs?: number;
};

export type AiChatResult = {
  reply: string;
  provider: string;
  model: string;
  /** How many routes were tried before one answered. */
  attempts: number;
};

export class AiPoolExhaustedError extends Error {
  readonly attempts: number;
  /** Why the last route we tried failed, for logs and `scripts/check-free-ai.mjs`. */
  readonly lastError: string;

  constructor(attempts: number, lastError = "") {
    super(lastError || "Every free AI provider failed for this request.");
    this.name = "AiPoolExhaustedError";
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Send one chat turn to the pool. Routes are tried in rotation until one
 * returns a non-empty answer; failures never surface to the guest as long as
 * any other route in the pool is healthy.
 */
export async function chat(options: AiChatOptions): Promise<AiChatResult> {
  const {
    systemInstruction,
    messages,
    maxOutputTokens = 250,
    temperature = 0.5,
    jsonMode = false,
    env,
    fetchImpl,
    now = Date.now,
    totalBudgetMs,
    routeTimeoutMs,
  } = options;

  const routes = options.routes ?? buildRoutes(undefined, env);
  if (routes.length === 0) {
    throw new AiPoolExhaustedError(0);
  }

  const doFetch = fetchImpl ?? fetch;
  const budget =
    totalBudgetMs ?? (Number(readEnv("FREE_AI_TOTAL_TIMEOUT_MS", env)) || DEFAULT_TOTAL_BUDGET_MS);
  const perRoute =
    routeTimeoutMs ??
    (Number(readEnv("FREE_AI_ROUTE_TIMEOUT_MS", env)) || DEFAULT_ROUTE_TIMEOUT_MS);
  const startedAt = now();
  const ordered = orderRoutes(routes, startedAt);

  const payloadMessages = [
    { role: "system" as const, content: systemInstruction },
    ...messages.map(({ role, content }) => ({ role, content })),
  ];

  let attempts = 0;
  let lastError = "";

  for (const route of ordered) {
    if (now() - startedAt >= budget) break;
    attempts += 1;
    const remainingBudget = budget - (now() - startedAt);
    const timeout = Math.max(1_000, Math.min(perRoute, remainingBudget));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await doFetch(route.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(route.apiKey ? { Authorization: `Bearer ${route.apiKey}` } : {}),
          ...route.headers,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: route.model,
          messages: payloadMessages,
          temperature,
          max_tokens: maxOutputTokens,
          stream: false,
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const body = await response.text().catch(() => "");
        lastError = `${route.provider}/${route.model} → HTTP ${status}`;
        // 429 and 5xx are transient: cool the route down and move on. A 400/401
        // is a bad key or model, so it is cooled longer but still skipped now.
        const penalty = status === 429 || status >= 500 ? COOLDOWN_MS : COOLDOWN_MS * 4;
        coolDown(route.id, now(), penalty);
        console.error("AI route failed", lastError, body.slice(0, 160));
        continue;
      }

      const payload = (await response.json()) as ChatCompletionBody;
      const reply = extractText(payload);
      if (!reply) {
        lastError = `${route.provider}/${route.model} → empty answer`;
        coolDown(route.id, now(), COOLDOWN_MS);
        continue;
      }
      return { reply, provider: route.provider, model: route.model, attempts };
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      lastError = `${route.provider}/${route.model} → ${aborted ? "timeout" : "network error"}`;
      coolDown(route.id, now(), COOLDOWN_MS);
      console.error(
        "AI route error",
        `${route.provider} ${route.model} ${fingerprint(route.apiKey)}`,
        aborted ? "timeout" : error instanceof Error ? error.message : "unknown",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  console.error("AI pool exhausted after", attempts, "attempts; last error:", lastError);
  throw new AiPoolExhaustedError(attempts, lastError);
}

/** True when at least one route is ready — the keyless pool makes this the norm. */
export function hasAiConfig(env?: Record<string, string>): boolean {
  return buildRoutes(undefined, env).length > 0;
}

/** Sanitised pool summary for logs, scripts and local diagnostics. Never leaks keys. */
export function describePool(env?: Record<string, string>): AiRouteDiagnostics[] {
  const configured = new Set(buildRoutes(undefined, env).map((route) => route.id));
  return PROVIDER_CATALOG.map((spec) => ({
    id: spec.slug,
    provider: spec.slug,
    label: spec.name,
    model: spec.models[0] ?? "",
    keyless: !spec.keyEnv,
    configured: [...configured].some((id) => id.startsWith(`${spec.slug}#`)),
  }));
}
