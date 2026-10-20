import { afterEach, describe, expect, it, vi } from "vitest";
import { getInstantConciergeReply, requestConcierge } from "@/components/wedding/concierge-client";

afterEach(() => vi.useRealTimers());

describe("concierge delivery", () => {
  it("uses an Edge reply without calling the fallback", async () => {
    const server = vi.fn();
    await expect(
      requestConcierge(async () => ({ data: { reply: " Hello " }, error: null }), server),
    ).resolves.toEqual({ reply: "Hello" });
    expect(server).not.toHaveBeenCalled();
  });

  it.each(["error", "empty", "throw"])("falls back on Edge %s", async (failure) => {
    const edge = async () => {
      if (failure === "throw") throw new Error("Network unavailable");
      return {
        data: { reply: failure === "empty" ? "  " : undefined },
        error: failure === "error" ? new Error("Not deployed") : null,
      };
    };
    await expect(requestConcierge(edge, async () => ({ reply: "Server answer" }))).resolves.toEqual(
      {
        reply: "Server answer",
      },
    );
  });

  it("aborts a stalled Edge call and proceeds to the fallback", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const result = requestConcierge(
      (value) => {
        signal = value;
        return new Promise(() => {});
      },
      async () => ({ reply: "Fallback answer" }),
    );
    await vi.advanceTimersByTimeAsync(6_000);
    await expect(result).resolves.toEqual({ reply: "Fallback answer" });
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects empty server replies", async () => {
    await expect(
      requestConcierge(
        async () => ({ data: null, error: true }),
        async () => ({ reply: " " }),
      ),
    ).rejects.toThrow("No answer");
  });

  it("reads the quota message out of an Edge error body", async () => {
    const server = vi.fn();
    await expect(
      requestConcierge(
        async () => ({
          data: null,
          error: {
            message: "Edge Function returned a non-2xx status code",
            context: {
              json: async () => ({ error: "You have used all 5 messages for today." }),
            },
          },
        }),
        server,
      ),
    ).rejects.toThrow("used all 5 messages");
    expect(server).not.toHaveBeenCalled();
  });

  it("bounds the server fallback too", async () => {
    vi.useFakeTimers();
    const result = requestConcierge(
      async () => ({ data: null, error: true }),
      () => new Promise(() => {}),
    );
    const assertion = expect(result).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(18_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("instant confirmed answers", () => {
  it.each([
    ["English", "What time is the Nikah?", "4:00 PM"],
    ["English", "Where is the Walima?", "The Leela Palace"],
    ["English", "What is the dress code?", "Ivory, Gold & Pastels"],
    ["हिन्दी", "निकाह कितने बजे है?", "4:00"],
    ["اردو", "نکاح کتنے بجے ہے؟", "4:00"],
  ])("answers %s suggestion %s without a network request", (language, question, expected) => {
    expect(getInstantConciergeReply(question, language)).toContain(expected);
  });
  it("does not intercept compound questions or contextual follow-ups", () => {
    expect(
      getInstantConciergeReply("What time is the Nikah? And the Barat?", "English"),
    ).toBeUndefined();
    expect(getInstantConciergeReply("What about parking?", "English")).toBeUndefined();
    expect(getInstantConciergeReply("What time is the Nikah?", "اردو")).toBeUndefined();
  });
});
