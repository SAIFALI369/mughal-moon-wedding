import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  StorybookEntry,
  ScratchStory,
  FlipEvents,
  VenueHunt,
  storybookThemes,
  StorybookAtmosphere,
} from "@/components/wedding/storybook";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import { InvitationRsvp } from "@/components/wedding/invitation-rsvp";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import { invitationThemes } from "@/components/wedding/invitation-options";
import { invitationArt } from "@/components/wedding/invitation-art";
import { paletteForTheme } from "@/lib/print-sheets";
import sample from "@/config/wedding.config.json";
const insert = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock("@/lib/db", () => ({ supabase: { from: () => ({ insert }) } }));
const details = getInvitationDetails(sample);
let observe: ReturnType<typeof vi.fn>;
beforeEach(() => {
  observe = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = observe;
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  insert.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("playable keepsake suite", () => {
  it("accepts the central JSON config in the existing publishing schema", () => {
    expect(invitationContentSchema.safeParse(sample).success).toBe(true);
  });
  it.each(storybookThemes)("registers %s with art, tradition and printable palette", (theme) => {
    expect(invitationThemes.find((t) => t.id === theme)?.category).toBe("keepsakes");
    expect(invitationArt[theme]).toMatch(/webp/);
    expect(paletteForTheme(theme).ink).not.toBe(paletteForTheme("eid").ink);
    const markup = renderToStaticMarkup(
      <PersonalInvitation title={sample.title} content={{ ...sample, theme }} preview />,
    );
    for (const token of [
      "sb-entry",
      "sb-hero",
      "sb-scratch",
      "sb-flip",
      "sb-hunt",
      'id="rsvp"',
      'id="wishes"',
      'id="contact"',
    ])
      expect(markup).toContain(token);
    expect(markup).not.toContain("invite-world-dock");
  });
  it("opens on tap and restores body scroll after the opening animation", async () => {
    vi.useFakeTimers();
    render(<StorybookEntry details={details} enabled />);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Open the envelope" }));
    expect(screen.getByRole("dialog").className).toContain("is-opening");
    const { act } = await import("@testing-library/react");
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
  it("provides a keyboard alternative to scratching", () => {
    render(<ScratchStory details={details} />);
    fireEvent.click(screen.getByRole("button", { name: "Reveal without scratching" }));
    expect(screen.getByRole("status")).toHaveTextContent("A memory uncovered");
    expect(document.querySelector("canvas")).toBeNull();
    expect(screen.getByText(sample.story)).toBeVisible();
  });
  it("flips events both ways and exposes their details", () => {
    render(<FlipEvents details={details} />);
    const card = screen.getAllByRole("button")[0];
    expect(card).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(card);
    expect(card).toHaveAttribute("aria-expanded", "true");
    expect(card).toHaveTextContent(sample.additionalEvents[0].time);
    fireEvent.click(card);
    expect(card).toHaveAttribute("aria-expanded", "false");
  });
  it("reveals venue objects separately and offers a show-all escape hatch", () => {
    render(<VenueHunt details={details} />);
    fireEvent.click(screen.getByRole("button", { name: "Find our place" }));
    expect(screen.getByRole("link", { name: /Get directions/ })).toHaveAttribute(
      "href",
      sample.mapUrl,
    );
    expect(screen.getByRole("status")).toHaveTextContent("1 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Show all travel details" }));
    expect(screen.getByRole("status")).toHaveTextContent("3 of 3");
  });
  it("does not construct an audio player until a consenting gesture", () => {
    const Audio = vi.fn();
    vi.stubGlobal("Audio", Audio);
    render(<StorybookAtmosphere details={details} />);
    expect(Audio).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Enable soundtrack and effects" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
  it("demo RSVP validates names, celebrates locally, and never writes a row", async () => {
    render(<InvitationRsvp theme="royal-rajmahal" preview />);
    fireEvent.change(screen.getByLabelText("Your full name *"), {
      target: { value: "Priya Sharma" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send my reply" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Demo reaction only"));
    expect(insert).not.toHaveBeenCalled();
  });
});
