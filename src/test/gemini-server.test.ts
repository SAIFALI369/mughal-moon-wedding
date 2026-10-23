// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateAiReply,
  hasGeminiConfig,
  reserveAiQuota,
} from "@/components/wedding/gemini.server";
import { resetRouterState } from "../../supabase/functions/_shared/free-router";

function stubFetch(handler: typeof fetch) {
  return vi.stubGlobal("fetch", handler);
}

function okReply(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: text } }] }),
    text: async () => "",
  } as unknown as Response;
}

function failStatus(status: number) {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => "nope",
  } as unknown as Response;
}

afterEach(() => {
  resetRouterState();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("app-server AI entry point", () => {
  it("reports a usable pool, so card chat no longer needs the Edge Function", async () => {
    // The keyless providers are always in the pool, even with no keys set.
    await expect(hasGeminiConfig()).resolves.toBe(true);
  });

  it("returns the first answer that arrives from the pool", async () => {
    const spy = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(failStatus(429))
      .mockResolvedValueOnce(okReply("Assalamu alaikum!"));
    stubFetch(spy as never);

    const reply = await generateAiReply({
      systemInstruction: "You are Simran.",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(reply).toBe("Assalamu alaikum!");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("turns an exhausted pool into a guest-safe message", async () => {
    stubFetch(vi.fn<typeof fetch>().mockResolvedValue(failStatus(503)) as never);
    await expect(
      generateAiReply({ systemInstruction: "s", messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(/could not answer right now/i);
  });

  it("asks for JSON when the partner form reader needs structured output", async () => {
    const spy = vi.fn<typeof fetch>().mockResolvedValue(okReply('{"ok":true}'));
    stubFetch(spy as never);
    await generateAiReply({
      systemInstruction: "s",
      messages: [{ role: "user", content: "notes" }],
      responseMimeType: "application/json",
      maxOutputTokens: 900,
    });
    const body = JSON.parse(String((spy.mock.calls[0] as [string, RequestInit])[1].body));
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.max_tokens).toBe(900);
  });

  it("skips the quota ledger entirely when a surface is uncapped", async () => {
    const spy = vi.fn<typeof fetch>();
    stubFetch(spy as never);
    const { quota } = await reserveAiQuota("homepage", 0, "abcdefghijkl");
    expect(quota).toMatchObject({ allowed: true, remaining: 0, limit: 0 });
    // No Supabase REST call was made for the allowance.
    expect(spy).not.toHaveBeenCalled();
  });
});
