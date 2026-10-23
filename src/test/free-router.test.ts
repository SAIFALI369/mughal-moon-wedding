// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AiPoolExhaustedError,
  buildRoutes,
  chat,
  describePool,
  hasAiConfig,
  orderRoutes,
  parseKeyList,
  PROVIDER_CATALOG,
  readEnv,
  resetRouterState,
  type AiRoute,
} from "../../supabase/functions/_shared/free-router";

/** A lookup that sees nothing, so the pool is exactly what the test supplies. */
const noEnv = () => undefined;

function envOf(values: Record<string, string>) {
  return (name: string) => values[name];
}

function okReply(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: text } }] }),
    text: async () => JSON.stringify({ choices: [{ message: { content: text } }] }),
  } as unknown as Response;
}

function failStatus(status: number) {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message: "nope" } }),
    text: async () => "nope",
  } as unknown as Response;
}

beforeEach(() => {
  resetRouterState();
  vi.restoreAllMocks();
});

describe("free AI provider pool", () => {
  it("answers with keyless providers even when nothing is configured", () => {
    const routes = buildRoutes(noEnv);
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.every((route) => route.keyless)).toBe(true);
    expect(new Set(routes.map((r) => r.provider))).toEqual(new Set(["kilo", "ovh", "llm7"]));
    expect(hasAiConfig({})).toBe(true);
  });

  it("expands every comma-separated key into its own allowance", () => {
    const routes = buildRoutes(envOf({ GROQ_API_KEY: "key-one,key-two, key-three " }));
    const groq = routes.filter((r) => r.provider === "groq");
    // 3 keys x 3 default models
    expect(groq).toHaveLength(9);
    expect(new Set(groq.map((r) => r.apiKey))).toEqual(
      new Set(["key-one", "key-two", "key-three"]),
    );
    // Keys are the outer loop so rate limits spread across accounts first.
    expect(groq[0]?.apiKey).toBe("key-one");
    expect(groq[0]?.model).toBe("llama-3.3-70b-versatile");
  });

  it("ignores the placeholder key shipped in tracked files", () => {
    expect(parseKeyList("REPLACE_WITH_YOUR_GEMINI_API_KEY")).toEqual([]);
    expect(
      buildRoutes(envOf({ GEMINI_API_KEY: "REPLACE_WITH_YOUR_GEMINI_API_KEY" })).filter(
        (r) => r.provider === "gemini",
      ),
    ).toHaveLength(0);
    expect(parseKeyList("real-key,, other-key")).toEqual(["real-key", "other-key"]);
  });

  it("honours per-provider model overrides", () => {
    const routes = buildRoutes(envOf({ GROQ_API_KEY: "k", GROQ_MODEL: "llama-4-scout" }));
    expect(routes.filter((r) => r.provider === "groq").map((r) => r.model)).toEqual([
      "llama-4-scout",
    ]);
  });

  it("needs both an account id and a token for Cloudflare", () => {
    // A token alone is not enough: the URL cannot be built without the account id.
    expect(
      buildRoutes(envOf({ CLOUDFLARE_API_TOKEN: "t" })).filter((r) => r.provider === "cloudflare"),
    ).toHaveLength(0);
    const withId = buildRoutes(
      envOf({ CLOUDFLARE_API_TOKEN: "t", CLOUDFLARE_ACCOUNT_ID: "abc123def456" }),
    ).filter((r) => r.provider === "cloudflare");
    expect(withId.length).toBeGreaterThan(0);
    expect(withId[0]?.url).toContain("/accounts/abc123def456/ai/v1/chat/completions");
  });

  it("puts keyed providers ahead of the keyless safety net", () => {
    const routes = buildRoutes(envOf({ OPENROUTER_API_KEY: "k" }));
    const firstKeyless = routes.findIndex((r) => r.keyless);
    expect(firstKeyless).toBeGreaterThan(0);
    expect(routes.slice(0, firstKeyless).every((r) => !r.keyless)).toBe(true);
  });

  it("lets the deployment reorder, disable or trim the pool", () => {
    const reordered = buildRoutes(envOf({ FREE_AI_PROVIDERS: "ovh,kilo" }));
    expect(reordered[0]?.provider).toBe("ovh");

    const trimmed = buildRoutes(envOf({ FREE_AI_DISABLED_PROVIDERS: "ovh,llm7" }));
    expect(trimmed.map((r) => r.provider)).toEqual(["kilo"]);

    expect(buildRoutes(envOf({ FREE_AI_ENABLE_KEYLESS: "false" }))).toHaveLength(0);
    expect(hasAiConfig({ FREE_AI_ENABLE_KEYLESS: "false" })).toBe(false);
  });

  it("accepts custom OpenAI-compatible routes as an escape hatch", () => {
    const routes = buildRoutes(
      envOf({
        FREE_AI_ENABLE_KEYLESS: "false",
        FREE_AI_ROUTES: JSON.stringify([
          {
            name: "Self-hosted",
            url: "https://llm.example.com/v1/chat/completions",
            model: "qwen",
          },
        ]),
      }),
    );
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ provider: "custom", model: "qwen", keyless: true });
  });

  it("ignores malformed custom routes instead of throwing", () => {
    expect(buildRoutes(envOf({ FREE_AI_ROUTES: "{not json" }))).toHaveLength(6);
    expect(
      buildRoutes(
        envOf({ FREE_AI_ENABLE_KEYLESS: "false", FREE_AI_ROUTES: '[{"url":"ftp://x"}]' }),
      ),
    ).toHaveLength(0);
  });

  it("prefers real environment variables over the local .env layer", () => {
    process.env["FREE_ROUTER_TEST_VALUE"] = "from-process";
    try {
      expect(readEnv("FREE_ROUTER_TEST_VALUE", { FREE_ROUTER_TEST_VALUE: "from-file" })).toBe(
        "from-process",
      );
      expect(readEnv("FREE_ROUTER_TEST_VALUE")).toBe("from-process");
    } finally {
      delete process.env["FREE_ROUTER_TEST_VALUE"];
    }
  });

  it("documents every provider it ships", () => {
    for (const spec of PROVIDER_CATALOG) {
      expect(spec.signupUrl.startsWith("https://")).toBe(true);
      expect(spec.note.length).toBeGreaterThan(10);
      expect(spec.models.length).toBeGreaterThan(0);
    }
  });
});

describe("free AI routing", () => {
  const pool: AiRoute[] = [
    {
      id: "a",
      provider: "a",
      label: "A",
      url: "https://a.test",
      model: "m",
      apiKey: "ka",
      keyless: false,
      headers: {},
    },
    {
      id: "b",
      provider: "b",
      label: "B",
      url: "https://b.test",
      model: "m",
      apiKey: "",
      keyless: true,
      headers: {},
    },
  ];

  it("sends a bearer token only when the route has a key", async () => {
    const spy = vi.fn().mockResolvedValue(okReply("hello"));
    await chat({
      systemInstruction: "sys",
      messages: [{ role: "user", content: "hi" }],
      routes: pool,
      fetchImpl: spy as never,
    });

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ka");
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "m",
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "hi" },
      ],
    });
  });

  it("omits the Authorization header for keyless providers", async () => {
    const spy = vi.fn().mockResolvedValue(okReply("hello"));
    await chat({
      systemInstruction: "sys",
      messages: [{ role: "user", content: "hi" }],
      routes: [pool[1]!],
      fetchImpl: spy as never,
    });
    const headers = (spy.mock.calls[0] as [string, RequestInit])[1].headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBeUndefined();
  });

  it("fails over to the next route when one is rate limited", async () => {
    const spy = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(failStatus(429))
      .mockResolvedValueOnce(okReply("second route answered"));

    const result = await chat({
      systemInstruction: "sys",
      messages: [{ role: "user", content: "hi" }],
      routes: pool,
      fetchImpl: spy as never,
    });

    expect(result.reply).toBe("second route answered");
    expect(result.provider).toBe("b");
    expect(result.attempts).toBe(2);
  });

  it("skips a route that just failed on the following request", async () => {
    const first = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(failStatus(500))
      .mockResolvedValueOnce(okReply("ok"));
    await chat({
      systemInstruction: "s",
      messages: [{ role: "user", content: "hi" }],
      routes: pool,
      fetchImpl: first as never,
    });

    const second = vi.fn<typeof fetch>().mockResolvedValue(okReply("ok"));
    await chat({
      systemInstruction: "s",
      messages: [{ role: "user", content: "hi" }],
      routes: pool,
      fetchImpl: second as never,
    });

    // Route "a" is still cooling down, so only "b" is called.
    expect(second).toHaveBeenCalledTimes(1);
    expect((second.mock.calls[0] as [string])[0]).toBe("https://b.test");
  });

  it("treats an empty answer as a failure and moves on", async () => {
    const spy = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "  " } }] }),
        text: async () => "",
      } as unknown as Response)
      .mockResolvedValueOnce(okReply("real answer"));
    const result = await chat({
      systemInstruction: "s",
      messages: [{ role: "user", content: "hi" }],
      routes: pool,
      fetchImpl: spy as never,
    });
    expect(result.reply).toBe("real answer");
  });

  it("reads array-shaped content", async () => {
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: [{ text: "part one " }, { text: "part two" }] } }],
      }),
      text: async () => "",
    } as unknown as Response);
    const result = await chat({
      systemInstruction: "s",
      messages: [{ role: "user", content: "hi" }],
      routes: pool,
      fetchImpl: spy as never,
    });
    expect(result.reply).toBe("part one part two");
  });

  it("recovers from a network error on one route", async () => {
    const spy = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(okReply("recovered"));
    const result = await chat({
      systemInstruction: "s",
      messages: [{ role: "user", content: "hi" }],
      routes: pool,
      fetchImpl: spy as never,
    });
    expect(result.reply).toBe("recovered");
  });

  it("throws when every route in the pool fails", async () => {
    const spy = vi.fn<typeof fetch>().mockResolvedValue(failStatus(503));
    await expect(
      chat({
        systemInstruction: "s",
        messages: [{ role: "user", content: "hi" }],
        routes: pool,
        fetchImpl: spy as never,
      }),
    ).rejects.toBeInstanceOf(AiPoolExhaustedError);
  });

  it("throws immediately when the pool is empty", async () => {
    await expect(
      chat({
        systemInstruction: "s",
        messages: [{ role: "user", content: "hi" }],
        routes: [],
        fetchImpl: vi.fn() as never,
      }),
    ).rejects.toBeInstanceOf(AiPoolExhaustedError);
  });

  it("stops trying once the total time budget is spent", async () => {
    let clock = 0;
    const spy = vi.fn<typeof fetch>().mockImplementation(async () => {
      clock += 9_000;
      return failStatus(500);
    });
    const threeRoutes: AiRoute[] = [
      ...pool,
      {
        id: "c",
        provider: "c",
        label: "C",
        url: "https://c.test",
        model: "m",
        apiKey: "",
        keyless: true,
        headers: {},
      },
    ];
    await expect(
      chat({
        systemInstruction: "s",
        messages: [{ role: "user", content: "hi" }],
        routes: threeRoutes,
        fetchImpl: spy as never,
        now: () => clock,
        totalBudgetMs: 10_000,
        routeTimeoutMs: 30_000,
      }),
    ).rejects.toBeInstanceOf(AiPoolExhaustedError);
    // The third route is abandoned: two slow failures already used the budget.
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("asks for JSON when the caller needs structured output", async () => {
    const spy = vi.fn().mockResolvedValue(okReply("{}"));
    await chat({
      systemInstruction: "s",
      messages: [{ role: "user", content: "hi" }],
      routes: pool,
      fetchImpl: spy as never,
      jsonMode: true,
    });
    const body = JSON.parse(String((spy.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("rotates the starting route so one key does not take every request", () => {
    const first = orderRoutes(pool).map((r) => r.id);
    const second = orderRoutes(pool).map((r) => r.id);
    expect(first).not.toEqual(second);
    expect([...first].sort()).toEqual([...second].sort());
  });

  it("falls back to cooled-down routes only when nothing else is healthy", () => {
    const failing = vi.fn<typeof fetch>().mockResolvedValue(failStatus(429));
    return chat({
      systemInstruction: "s",
      messages: [{ role: "user", content: "hi" }],
      routes: [pool[0]!],
      fetchImpl: failing as never,
    })
      .then(() => undefined)
      .catch(() => undefined)
      .then(() => {
        // Everything is cooling down, so the only route is still retried.
        expect(orderRoutes([pool[0]!])).toHaveLength(1);
      });
  });
});

describe("pool diagnostics", () => {
  it("reports which providers are configured without ever exposing a key", () => {
    const summary = describePool({ GEMINI_API_KEY: "super-secret-value", GROQ_API_KEY: "g" });
    expect(JSON.stringify(summary)).not.toContain("super-secret-value");
    expect(summary.find((p) => p.id === "gemini")?.configured).toBe(true);
    expect(summary.find((p) => p.id === "groq")?.configured).toBe(true);
    expect(summary.find((p) => p.id === "kilo")?.keyless).toBe(true);
    expect(summary.find((p) => p.id === "mistral")?.configured).toBe(false);
  });
});
