import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CinematicHero } from "@/components/wedding/cinematic-hero";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("cinematic motion lifecycle", () => {
  it("waits for the invitation gate before revealing", () => {
    const { container } = render(<CinematicHero theme="eid" waitingForGate><p>Names</p></CinematicHero>);
    const hero = container.firstElementChild;
    expect(hero?.getAttribute("data-revealed")).toBe("false");
    act(() => { window.dispatchEvent(new Event("storybook:opened")); });
    expect(hero?.getAttribute("data-revealed")).toBe("true");
  });

  it("pauses outside the viewport and resumes when visible", () => {
    let intersect: ((entries: Array<{ isIntersecting: boolean }>) => void) | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof intersect) { intersect = callback; }
      observe() {}
      disconnect = disconnect;
    });
    const { container, unmount } = render(<CinematicHero theme="mughal"><p>Names</p></CinematicHero>);
    act(() => { intersect?.([{ isIntersecting: false }]); });
    expect(container.firstElementChild?.getAttribute("data-paused")).toBe("true");
    act(() => { intersect?.([{ isIntersecting: true }]); });
    expect(container.firstElementChild?.getAttribute("data-paused")).toBe("false");
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it.each(["(max-width: 640px)", "(prefers-reduced-motion: reduce)"])("does not schedule scroll animation frames for %s", (preference) => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === preference,
      media: query,
      onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {},
      dispatchEvent: () => true,
    }));
    const frame = vi.spyOn(window, "requestAnimationFrame");
    render(<CinematicHero theme="eid"><p>Names</p></CinematicHero>);
    act(() => { window.dispatchEvent(new Event("scroll")); });
    expect(frame).not.toHaveBeenCalled();
  });

  it("pauses while the tab is hidden and resumes on return", () => {
    let hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    const { container } = render(<CinematicHero theme="eid"><p>Names</p></CinematicHero>);
    act(() => { hidden = true; document.dispatchEvent(new Event("visibilitychange")); });
    expect(container.firstElementChild?.getAttribute("data-paused")).toBe("true");
    act(() => { hidden = false; document.dispatchEvent(new Event("visibilitychange")); });
    expect(container.firstElementChild?.getAttribute("data-paused")).toBe("false");
  });
});