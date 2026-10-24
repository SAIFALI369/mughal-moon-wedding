import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorybookEntry, StorybookHero, storybookThemes } from "@/components/wedding/storybook";
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

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
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

describe("royal editions suite", () => {
  it("accepts the central JSON config in the existing publishing schema", () => {
    expect(invitationContentSchema.safeParse(sample).success).toBe(true);
  });

  it.each(storybookThemes)(
    "renders %s as a refined editorial invitation without gimmicks",
    (theme) => {
      expect(invitationThemes.find((t) => t.id === theme)?.category).toBe("keepsakes");
      expect(invitationArt[theme]).toMatch(/webp/);
      expect(paletteForTheme(theme).ink).not.toBe(paletteForTheme("eid").ink);

      const markup = renderToStaticMarkup(
        <PersonalInvitation title={sample.title} content={{ ...sample, theme }} preview />,
      );

      for (const token of [
        "sb-entry",
        "sb-door-left",
        "sb-door-right",
        "sb-hero",
        "sb-hero-art",
        "sb-hero-copy",
        "invite-story-panel",
        'id="celebration"',
        'id="schedule"',
        'id="venue"',
        'id="rsvp"',
        'id="wishes"',
        'id="contact"',
      ]) {
        expect(markup).toContain(token);
      }

      for (const removedGimmick of [
        "sb-package",
        "sb-scratch",
        "sb-flip",
        "sb-hunt",
        "sc-scene",
        "sb-character",
        "sb-falling-leaf",
        "invite-world-dock",
      ]) {
        expect(markup).not.toContain(removedGimmick);
      }
    },
  );

  it("renders framed editorial artwork and couple copy in StorybookHero", () => {
    for (const theme of storybookThemes) {
      const html = renderToStaticMarkup(
        <StorybookHero details={getInvitationDetails({ ...sample, theme })} />,
      );
      expect(html).toContain("sb-hero-frame");
      expect(html).toContain("sb-hero-art");
      expect(html).toContain("sb-hero-copy");
      expect(html).not.toContain("sc-scene");
      expect(html).not.toContain("cine-");
    }
  });

  it("opens architectural double doors on tap, fires onEnter synchronously, and restores scroll", () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    render(<StorybookEntry details={details} enabled onEnter={onEnter} />);
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: /Open invitation/i }));
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog").className).toContain("is-opening");

    act(() => vi.advanceTimersByTime(1300));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
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
