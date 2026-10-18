import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildConciergeInstruction } from "../../supabase/functions/_shared/concierge-personality";
import { getInstantSmallTalk } from "@/components/wedding/concierge-smalltalk";

describe("Simran's expanded personality", () => {
  it("allows general questions without weakening wedding facts or privacy", () => {
    const prompt = buildConciergeInstruction("Simran", "हिन्दी");
    expect(prompt).toContain("Reply in हिन्दी");
    expect(prompt).toContain("questions outside the wedding");
    expect(prompt).toContain("do not impersonate");
    expect(prompt).toContain("use only the confirmed invitation facts");
    expect(prompt).toContain("Do not ask for or store private RSVP");
    expect(prompt).toContain("no live web search");
    expect(prompt).toContain("mildly dark");
    expect(prompt).toContain("drop the jokes");
    expect(prompt).toContain("22 November 2026");
    expect(prompt).toContain("[MUSIC:pause]");
  });
  it("uses the same personality builder in both Gemini backends", () => {
    for (const file of [
      "src/components/wedding/concierge.functions.ts",
      "supabase/functions/wedding-concierge/index.ts",
    ]) {
      const src = readFileSync(file, "utf8");
      expect(src).toContain("buildConciergeInstruction(");
      expect(src).toContain("AI_NAME");
      expect(src).toContain("language");
    }
  });
  it("provides instant capability and humour previews, not catch-all replies", () => {
    expect(getInstantSmallTalk("What can you do?", "English")).toContain("help with code");
    expect(getInstantSmallTalk("Tell me a dark-ish joke", "English")).toContain(
      "work-life balance",
    );
    expect(getInstantSmallTalk("तुम क्या कर सकती हो?", "हिन्दी")).toContain("एआई");
    expect(getInstantSmallTalk("تم کیا کر سکتی ہو؟", "اردو")).toContain("اے آئی");
    expect(getInstantSmallTalk("Explain gravity", "English")).toBeUndefined();
    expect(
      getInstantSmallTalk("Tell me a dark-ish joke and give directions", "English"),
    ).toBeUndefined();
  });
});
