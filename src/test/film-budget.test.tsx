// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeLoop } from "@/components/wedding/theme-loop";
import { activeFilmCount, filmBudgetLimit, resetFilmBudget } from "@/lib/film-budget";

/**
 * The film budget is the reason the studio stays smooth: a page can show twenty
 * theme tiles and only one or two of them may decode at a time.
 */

type Entry = {
  isIntersecting: boolean;
  intersectionRect: { height: number };
  boundingClientRect: { height: number };
};

let observers: { callback: (entries: Entry[]) => void; element: Element }[] = [];

class FakeObserver {
  callback: (entries: Entry[]) => void;
  element!: Element;
  constructor(callback: (entries: Entry[]) => void) {
    this.callback = callback;
  }
  observe(element: Element) {
    this.element = element;
    observers.push({ callback: this.callback, element });
  }
  disconnect() {}
  unobserve() {}
}

const shown: Entry = {
  isIntersecting: true,
  intersectionRect: { height: 200 },
  boundingClientRect: { height: 200 },
};
const hidden: Entry = {
  isIntersecting: false,
  intersectionRect: { height: 0 },
  boundingClientRect: { height: 200 },
};

function reveal(index: number, entry: Entry = shown) {
  observers[index]?.callback([entry]);
}

function matchMedia(matches: (query: string) => boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches: matches(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function tile(theme: "eid" | "kashi-ghat" | "ballroom" | "luxury" | "fairytale" | "calligraphy") {
  return <ThemeLoop key={theme} theme={theme} className="object-cover" />;
}

beforeEach(() => {
  resetFilmBudget();
  observers = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal("ResizeObserver", class {});
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: matchMedia(() => false),
  });
});

afterEach(() => {
  cleanup();
  resetFilmBudget();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("film budget", () => {
  it("allows one film on a phone and two on a desktop", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMedia((query) => query.includes("max-width: 767px")),
    });
    expect(filmBudgetLimit()).toBe(1);

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMedia(() => false),
    });
    expect(filmBudgetLimit()).toBe(2);
  });

  it("allows no film at all when the guest asked for reduced motion", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMedia((query) => query.includes("prefers-reduced-motion")),
    });
    expect(filmBudgetLimit()).toBe(0);
  });

  it("decodes one tile at a time on a phone, no matter how many are visible", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMedia((query) => query.includes("max-width: 767px")),
    });
    const { container } = render(
      <div>
        {tile("eid")}
        {tile("kashi-ghat")}
        {tile("ballroom")}
        {tile("luxury")}
        {tile("fairytale")}
        {tile("calligraphy")}
      </div>,
    );
    // Nothing plays before a tile is actually on screen.
    expect(container.querySelectorAll("video")).toHaveLength(0);

    for (let index = 0; index < 6; index += 1) reveal(index);
    await waitFor(() => expect(container.querySelectorAll("video")).toHaveLength(1));
    expect(activeFilmCount()).toBe(1);
  });

  it("hands the decoder to the tile the guest scrolled to", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMedia((query) => query.includes("max-width: 767px")),
    });
    const { container } = render(
      <div>
        {tile("eid")}
        {tile("kashi-ghat")}
      </div>,
    );
    reveal(0);
    await waitFor(() => expect(container.querySelectorAll("video")).toHaveLength(1));
    expect(container.querySelector("video")?.getAttribute("src")).toBe("/film/eid.mp4");

    // Scrolling on: the first tile leaves the screen, the second takes over.
    reveal(0, hidden);
    reveal(1);
    await waitFor(() =>
      expect(container.querySelector("video")?.getAttribute("src")).toBe("/film/kashi-ghat.mp4"),
    );
    expect(container.querySelectorAll("video")).toHaveLength(1);
  });

  it("lets two films play side by side on a wide screen", async () => {
    const { container } = render(
      <div>
        {tile("eid")}
        {tile("kashi-ghat")}
        {tile("ballroom")}
        {tile("luxury")}
      </div>,
    );
    for (let index = 0; index < 4; index += 1) reveal(index);
    await waitFor(() => expect(container.querySelectorAll("video")).toHaveLength(2));
  });

  it("keeps a playing film while the next tile is only a little more visible", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMedia((query) => query.includes("max-width: 767px")),
    });
    const { container } = render(
      <div>
        {tile("eid")}
        {tile("kashi-ghat")}
      </div>,
    );
    reveal(0, { ...shown, intersectionRect: { height: 160 } });
    await waitFor(() => expect(container.querySelector("video")).not.toBeNull());
    // The next card is 10% more visible: not worth tearing the film down.
    reveal(1, { ...shown, intersectionRect: { height: 176 } });
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(container.querySelector("video")?.getAttribute("src")).toBe("/film/eid.mp4");
    // Clearly more visible: now the decoder changes hands.
    reveal(1, shown);
    reveal(0, { ...shown, intersectionRect: { height: 60 } });
    await waitFor(() =>
      expect(container.querySelector("video")?.getAttribute("src")).toBe("/film/kashi-ghat.mp4"),
    );
  });

  it("stops decoding when every tile has scrolled away", async () => {
    const { container } = render(
      <div>
        {tile("eid")}
        {tile("kashi-ghat")}
      </div>,
    );
    reveal(0);
    await waitFor(() => expect(container.querySelectorAll("video")).toHaveLength(1));
    reveal(0, hidden);
    await waitFor(() => expect(container.querySelectorAll("video")).toHaveLength(0));
    expect(activeFilmCount()).toBe(0);
  });
});
