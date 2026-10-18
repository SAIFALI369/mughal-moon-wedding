import { afterEach, describe, expect, it, vi } from "vitest";
import { requestConcierge } from "@/components/wedding/concierge-client";

afterEach(() => vi.useRealTimers());

describe("concierge delivery", () => {
  it("uses an Edge reply without calling the fallback", async () => {
    const server = vi.fn();
    await expect(
      requestConcierge(async () => ({ data: { reply: " Hello " }, error: null }), server),
    ).resolves.toBe("Hello");
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
    await expect(requestConcierge(edge, async () => ({ reply: "Server answer" }))).resolves.toBe(
      "Server answer",
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
    await vi.advanceTimersByTimeAsync(18_000);
    await expect(result).resolves.toBe("Fallback answer");
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
