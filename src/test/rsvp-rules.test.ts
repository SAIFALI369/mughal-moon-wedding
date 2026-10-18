import { describe, expect, it } from "vitest";
import { normalizeGuestName, rsvpSchema } from "@/components/wedding/rsvp-schema";

describe("One RSVP per name", () => {
  it("treats capitalization and extra spaces as the same name", () => {
    expect(normalizeGuestName("  Saif   Khan  ")).toBe("saif khan");
    expect(normalizeGuestName("SAIF KHAN")).toBe(normalizeGuestName("Saif Khan"));
    expect(normalizeGuestName("Simran")).not.toBe(normalizeGuestName("Saif Khan"));
  });
  it("rejects blank names", () => {
    expect(
      rsvpSchema.safeParse({ name: "   ", guests: 1, events: [], diet: "", message: "" }).success,
    ).toBe(false);
  });
});
