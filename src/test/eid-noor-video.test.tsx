// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NoorArchExperience, noorArchStill } from "@/components/wedding/noor-arch-gate";
import { Footer } from "@/components/wedding/sections";
import { demoPoster } from "@/config/theme-demos";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Eid Noor Arch video experience across templates & demos", () => {
  it("renders couple greeting, Open the gates, Noor Arch gate video and keeps children mounted", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <NoorArchExperience
        groomName="Ayaan"
        brideName="Zara"
        dateLine="26/11/2029 · Patna Club"
        onOpen={onOpen}
      >
        <div data-testid="invitation-content">Wedding audio &amp; hero</div>
      </NoorArchExperience>,
    );

    expect(screen.getByTestId("invitation-content")).toBeInTheDocument();
    expect(document.getElementById("gate-title")?.textContent).toContain("Ayaan");
    expect(document.getElementById("gate-title")?.textContent).toContain("Zara");

    const video = container.querySelector("video");
    expect(video?.getAttribute("src")).toContain("noor-arch-gate.mp4");
    expect(video?.getAttribute("poster")).toContain("noor-arch-cover.jpg");

    fireEvent.click(screen.getByRole("button", { name: /Open the gates/i }));
    expect(onOpen).toHaveBeenCalledOnce();
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

  it("uses Noor Arch artwork for Eid demo posters, /demo route, and /theme/eid default gate", () => {
    expect(demoPoster("eid")).toBe(noorArchStill);

    const demoSource = readFileSync("src/routes/demo.tsx", "utf8");
    expect(demoSource).toContain("NoorArchExperience");
    expect(demoSource).toContain("noorArchStill");
    expect(demoSource).toContain('theme="eid"');

    const themeDemoSource = readFileSync("src/routes/theme.$themeId.tsx", "utf8");
    expect(themeDemoSource).toContain('demo.theme === "eid"');
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
});
