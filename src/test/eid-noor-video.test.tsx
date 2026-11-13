// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NoorArchExperience, noorArchStill } from "@/components/wedding/noor-arch-gate";
import { Footer, Hero } from "@/components/wedding/sections";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import { demoContent, demoForTheme, demoPoster } from "@/config/theme-demos";
import {
  invitationArt,
  openingCoverForTheme,
  openingVideoForTheme,
} from "@/components/wedding/invitation-art";
import { resolveAssetFallbackTheme } from "@/server";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Unified Tap-to-open card video experience across themes & demos", () => {
  it("starts directly on video frame 0 with simple calligraphy names and Tap to open, primes audio on tap, zooms video, freezes at end, and starts music after transition", () => {
    const onPrime = vi.fn();
    const onOpen = vi.fn();
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});

    const { container } = render(
      <NoorArchExperience groomName="Ayaan" brideName="Zara" onPrime={onPrime} onOpen={onOpen}>
        <Hero
          groomName="Ayaan"
          brideName="Zara"
          backgroundImage={noorArchStill}
          dateLine="15/12/2029"
          theme="eid"
        />
      </NoorArchExperience>,
    );

    const gateTitle = document.getElementById("gate-title");
    expect(gateTitle?.textContent).toContain("Ayaan");
    expect(gateTitle?.textContent).toContain("Zara");
    expect(gateTitle?.className).toContain("card-calligraphy-names");
    expect(gateTitle?.innerHTML).not.toContain("font-script");
    expect(container.textContent).not.toContain("Open the gates");
    expect(container.textContent).not.toContain("Together with their families");
    expect(container.textContent).not.toContain("Enter quietly");

    const video = container.querySelector("video")!;
    expect(video.getAttribute("src")).toContain("noor-arch-gate.mp4");
    expect(video.getAttribute("poster")).toContain("noor-arch-cover.jpg");

    fireEvent.click(screen.getByRole("button", { name: /^Tap to open$/i }));
    expect(onPrime).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
    expect(playSpy).toHaveBeenCalledOnce();
    expect(container.querySelector(".noor-gate-zoom")?.className).toContain("is-zooming");

    fireEvent.ended(video);
    expect(pauseSpy).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledOnce();
    // Hero stays cleanly stopped on the final still frame (no looping gate video behind Hero)
    expect(container.querySelectorAll(".eid-hero video")).toHaveLength(0);
    expect(container.querySelector(".eid-hero img.full-art-image")?.getAttribute("src")).toBe(
      noorArchStill,
    );
  });

  it("supports every theme first-frame cover & delayed 2.5s follow-up hero video slot", () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});

    const { container } = render(
      <NoorArchExperience
        groomName="Arjun"
        brideName="Meera"
        theme="diya-utsav"
        heroVideoSrc="/film/diya-utsav.mp4"
        heroDelayMs={2500}
      >
        <Hero
          groomName="Arjun"
          brideName="Meera"
          backgroundImage={invitationArt["diya-utsav"]}
          theme="diya-utsav"
          heroVideoSrc="/film/diya-utsav.mp4"
        />
      </NoorArchExperience>,
    );

    const openingVideo = container.querySelector("video")!;
    expect(openingVideo.getAttribute("src")).toBe("/film/diya-utsav.mp4");
    expect(openingVideo.getAttribute("poster")).toBe(invitationArt["diya-utsav"]);

    fireEvent.click(screen.getByRole("button", { name: /^Tap to open$/i }));
    act(() => vi.advanceTimersByTime(2600));
    expect(container.querySelectorAll(".eid-hero video")).toHaveLength(0);

    // 2.5 seconds after the card text pops up, the stabilized follow-up hero video fades in.
    act(() => vi.advanceTimersByTime(2500));
    expect(container.querySelector(".eid-hero video")?.getAttribute("src")).toBe(
      "/film/diya-utsav.mp4",
    );
  });

  it("falls back cleanly to /film/eid.mp4 if the CDN gate video fails", () => {
    const { container } = render(
      <NoorArchExperience groomName="Ayaan" brideName="Zara">
        <div>Content</div>
      </NoorArchExperience>,
    );

    const video = container.querySelector("video")!;
    expect(video.getAttribute("src")).toContain("noor-arch-gate.mp4");
    fireEvent.error(video);
    expect(video.getAttribute("src")).toBe("/film/eid.mp4");
  });

  it("uses Noor Arch artwork for Eid demo posters, /demo route, and universal opening gate on /theme/$themeId", () => {
    expect(demoPoster("eid")).toBe(noorArchStill);

    const demoSource = readFileSync("src/routes/demo.tsx", "utf8");
    expect(demoSource).toContain("NoorArchExperience");
    expect(demoSource).toContain("noorArchStill");
    expect(demoSource).toContain('theme="eid"');

    const themeDemoSource = readFileSync("src/routes/theme.$themeId.tsx", "utf8");
    expect(themeDemoSource).toContain("useState(true)");
  });

  it("builds personalized /demo?guest= links in the demo Footer instead of /?guest= or lovable.app", () => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    render(<Footer />);
    const input = screen.getByLabelText("Guest or family name for personalized invitation");
    fireEvent.change(input, { target: { value: "Uncle Ahmed" } });

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    fireEvent.click(screen.getByRole("button", { name: /WhatsApp/i }));
    expect(openSpy).toHaveBeenCalledOnce();
    const url = decodeURIComponent(String(openSpy.mock.calls[0]?.[0] ?? ""));
    expect(url).toContain("/demo?guest=Uncle");
    expect(url).not.toContain("lovable.app");
  });

  it("aligns aladin/sacred-mandap/haldi-baag opening assets, keeps jharokha-dawn free of Bismillah, and resolves theme-specific proxy fallbacks", () => {
    expect(openingCoverForTheme("aladin")).toContain("aladin-poster.jpg");
    expect(openingVideoForTheme("aladin")).toMatchObject({
      fallback: "/film/aladin.mp4",
      finiteOpening: false,
    });
    expect(openingVideoForTheme("aladin").src).toContain("aladin-silent.mp4");

    expect(openingCoverForTheme("sacred-mandap")).toContain("sacred-mandap-poster.jpg");
    expect(openingVideoForTheme("sacred-mandap").src).toContain("sacred-mandap-silent.mp4");
    expect(openingVideoForTheme("haldi-baag").src).toContain("haldi-baag-cinema.mp4");

    const jharokhaDemo = demoForTheme("jharokha-dawn");
    const jharokhaHtml = renderToStaticMarkup(
      <PersonalInvitation
        title={jharokhaDemo.title}
        content={demoContent(jharokhaDemo)}
        preview
        showGate={false}
      />,
    );
    expect(jharokhaHtml).not.toContain("بِسْمِ");

    expect(resolveAssetFallbackTheme("/__l5e/assets-v1/abc/sacred-mandap-silent.mp4")).toBe(
      "sacred-mandap",
    );
    expect(resolveAssetFallbackTheme("/__l5e/assets-v1/abc/aladin-poster.jpg")).toBe("aladin");
    expect(resolveAssetFallbackTheme("/__l5e/assets-v1/abc/haldi-baag-cinema.mp4")).toBe(
      "haldi-baag",
    );
    expect(resolveAssetFallbackTheme("/__l5e/assets-v1/abc/noor-arch-gate.mp4")).toBe("eid");
  });
});
