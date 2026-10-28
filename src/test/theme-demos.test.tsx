// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { invitationThemeIds } from "@/components/wedding/invitation-options";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import { demoContent, demoDateLabel, demoForTheme, themeDemos } from "@/config/theme-demos";
import { ThemeDemoCard } from "@/components/wedding/theme-demo-card";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  Link: ({
    to,
    children,
    params,
    search,
    ...props
  }: {
    to: string;
    children: ReactNode;
    params?: Record<string, string>;
    search?: Record<string, string>;
  }) => (
    <a
      href={
        to +
        (params ? `/${Object.values(params).join("/")}` : "") +
        (search ? `?${new URLSearchParams(search).toString()}` : "")
      }
      {...props}
    >
      {children}
    </a>
  ),
}));

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
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("theme demos", () => {
  it("gives every theme a demo, and no demo a theme that no longer exists", () => {
    expect(themeDemos).toHaveLength(invitationThemeIds.length);
    expect([...themeDemos.map((demo) => demo.theme)].sort()).toEqual(
      [...invitationThemeIds].sort(),
    );
  });

  it("makes every demo a different celebration", () => {
    const couples = themeDemos.map((demo) => `${demo.groomName}&${demo.brideName}`);
    const titles = themeDemos.map((demo) => demo.title);
    const venues = themeDemos.map((demo) => demo.venue);
    const dates = themeDemos.map((demo) => demo.date);
    expect(new Set(couples).size).toBe(themeDemos.length);
    expect(new Set(titles).size).toBe(themeDemos.length);
    expect(new Set(venues).size).toBe(themeDemos.length);
    expect(new Set(dates).size).toBe(themeDemos.length);
    expect(new Set(themeDemos.map((demo) => demo.story)).size).toBe(themeDemos.length);
  });

  it("fills every element of the card: portraits, gallery, ceremony order and details", () => {
    for (const demo of themeDemos) {
      expect(demo.gallery.length).toBeGreaterThanOrEqual(5);
      expect(new Set(demo.gallery.map((photo) => photo.src)).size).toBe(demo.gallery.length);
      expect(demo.portraits.groom).toBeTruthy();
      expect(demo.portraits.bride).toBeTruthy();
      expect(demo.additionalEvents.length).toBeGreaterThanOrEqual(2);
      expect(demo.message.length).toBeGreaterThan(40);
      expect(demo.story.length).toBeGreaterThan(40);
      expect(demo.dressCode).toBeTruthy();
      expect(demo.contactPhone).toMatch(/^\+?[\d\s()-]+$/);
      expect(demo.hashtag.startsWith("#")).toBe(true);
      expect(demo.giftsNote).toBeTruthy();
      expect(demo.arrivalNotes).toBeTruthy();
      expect(demo.livestreamUrl.startsWith("https://")).toBe(true);
      expect(demo.mapUrl.startsWith("https://")).toBe(true);
    }
  });

  it("attaches a real YouTube soundtrack to every demo", () => {
    for (const demo of themeDemos) {
      expect(demo.songs.length).toBeGreaterThanOrEqual(1);
      for (const song of demo.songs) {
        expect(song.url).toMatch(/^https:\/\/(youtu\.be\/|www\.youtube\.com\/)/);
        expect(song.title.length).toBeGreaterThan(2);
      }
    }
    // A demo shouldn't be silent about its music: keep a healthy spread of songs.
    const unique = new Set(themeDemos.flatMap((demo) => demo.songs.map((song) => song.url)));
    expect(unique.size).toBeGreaterThanOrEqual(12);
  });

  it("produces content the card schema accepts, with every element switched on", () => {
    for (const demo of themeDemos) {
      const parsed = invitationContentSchema.safeParse(demoContent(demo));
      expect(parsed.success, `${demo.theme}: ${parsed.error?.issues[0]?.message ?? ""}`).toBe(true);
      const content = parsed.data!;
      expect(content.theme).toBe(demo.theme);
      expect(Object.values(content.elements).every(Boolean)).toBe(true);
      expect(content.additionalEvents).toHaveLength(demo.additionalEvents.length);
    }
  });

  it("ships a small poster for every theme and every strip photo", () => {
    for (const theme of invitationThemeIds) {
      const file = join(process.cwd(), "public", "demo", "poster", `${theme}.webp`);
      expect(existsSync(file), `${theme} poster`).toBe(true);
      // Tiles must stay thumbnails: full-page art at 250–380 KB is what made the
      // collection slow in the first place.
      expect(statSync(file).size / 1024).toBeLessThan(80);
    }
    const thumbs = new Set(themeDemos.flatMap((demo) => demo.gallery.map((photo) => photo.thumb)));
    expect(thumbs.size).toBe(6);
    for (const thumb of thumbs) {
      const file = join(process.cwd(), "public", thumb);
      expect(existsSync(file), thumb).toBe(true);
      expect(statSync(file).size / 1024).toBeLessThan(40);
    }
  });

  it("falls back to a real demo instead of crashing on a stale link", () => {
    expect(demoForTheme("no-such-theme")).toBe(themeDemos[0]);
    expect(demoForTheme("kashi-ghat").theme).toBe("kashi-ghat");
  });
});

describe("ThemeDemoCard", () => {
  it("previews the demo's own film, names, date and gallery, and links to the demo", () => {
    const demo = demoForTheme("kashi-ghat");
    const { container } = render(<ThemeDemoCard demo={demo} priority />);
    const link = screen.getByRole("link", {
      name: `Open the Kashi Ghat demo invitation for ${demo.groomName} and ${demo.brideName}`,
    });
    expect(link).toHaveAttribute("href", "/theme/$themeId/kashi-ghat");
    expect(link.textContent).toContain(demo.groomName);
    expect(link.textContent).toContain(demo.brideName);
    expect(link.textContent).toContain(demoDateLabel(demo));
    expect(link.textContent).toContain(demo.songs[0].title);
    // The theme's real loop, not a stock picture.
    expect(container.querySelector("video")?.getAttribute("src")).toBe("/film/kashi-ghat.mp4");
    // Its own gallery frames are part of the tile.
    const strip = container.querySelectorAll(".theme-demo-strip img");
    expect(strip).toHaveLength(4);
  });
});
