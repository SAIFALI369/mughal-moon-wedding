// @vitest-environment node
import { describe, expect, it } from "vitest";
import { dailyLimit, DEFAULT_AI_LIMITS } from "@/lib/ai-limits";

const env = (values: Record<string, string | undefined>) => values;

describe("daily AI allowance", () => {
  it("defaults to a generous allowance now that the pool is shared", () => {
    expect(dailyLimit("AI_DAILY_LIMIT_HOMEPAGE", env({}))).toBe(100);
    expect(dailyLimit("AI_DAILY_LIMIT_CARD", env({}))).toBe(100);
    expect(dailyLimit("AI_DAILY_LIMIT_FORM", env({}))).toBe(40);
    expect(DEFAULT_AI_LIMITS.AI_DAILY_LIMIT_HOMEPAGE).toBeGreaterThan(5);
  });

  it("reads an override", () => {
    expect(dailyLimit("AI_DAILY_LIMIT_HOMEPAGE", env({ AI_DAILY_LIMIT_HOMEPAGE: "500" }))).toBe(
      500,
    );
  });

  it("treats 0 as an explicit 'no cap' rather than a mistake", () => {
    expect(dailyLimit("AI_DAILY_LIMIT_CARD", env({ AI_DAILY_LIMIT_CARD: "0" }))).toBe(0);
  });

  it("falls back to the default for junk instead of silently removing the cap", () => {
    expect(dailyLimit("AI_DAILY_LIMIT_CARD", env({ AI_DAILY_LIMIT_CARD: "abc" }))).toBe(100);
    expect(dailyLimit("AI_DAILY_LIMIT_CARD", env({ AI_DAILY_LIMIT_CARD: "-3" }))).toBe(100);
    expect(dailyLimit("AI_DAILY_LIMIT_CARD", env({ AI_DAILY_LIMIT_CARD: "" }))).toBe(100);
  });

  it("floors fractional values", () => {
    expect(dailyLimit("AI_DAILY_LIMIT_FORM", env({ AI_DAILY_LIMIT_FORM: "12.9" }))).toBe(12);
  });
});
