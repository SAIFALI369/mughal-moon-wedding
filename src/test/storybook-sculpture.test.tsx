import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { StorybookSculpture } from "@/components/wedding/storybook/sculpture";
import { StorybookHero } from "@/components/wedding/storybook/hero";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import { readFileSync } from "node:fs";
afterEach(cleanup);
describe("sculptural theme keepsakes", () => {
  it.each([
    ["royal-rajmahal", "Open the palace doors", "palace", "The palace is ready"],
    ["lotus-goddess", "Let the lotus bloom", "lotus", "A thousand beginnings"],
    ["calligraphy", "Light the brass diya", "diya", "A light for your next chapter"],
  ])("renders and articulates %s", (theme, action, type, message) => {
    render(<StorybookSculpture details={getInvitationDetails({ theme })} />);
    const button = screen.getByRole("button", { name: new RegExp(action) });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelector(`.sc-${type}`)).toBeTruthy();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent(message);
    expect(document.querySelector(".sc-active")).toBeTruthy();
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
  });
  it("builds physical planes rather than treating a photograph as 3D", () => {
    const palace = renderToStaticMarkup(
      <StorybookSculpture details={{ theme: "royal-rajmahal" }} />,
    );
    expect(palace.match(/sc-wall sc-wall-front/g) || []).toHaveLength(3);
    const lotus = renderToStaticMarkup(<StorybookSculpture details={{ theme: "lotus-goddess" }} />);
    expect(lotus.match(/class="sc-petal"/g) || []).toHaveLength(20);
    const diya = renderToStaticMarkup(<StorybookSculpture details={{ theme: "calligraphy" }} />);
    expect(diya.match(/translateZ\(10px\)/g) || []).toHaveLength(12);
    for (const markup of [palace, lotus, diya]) expect(markup).not.toContain("<img");
  });
  it("puts the sculpture in the visible hero of every new theme", () => {
    for (const theme of ["royal-rajmahal", "lotus-goddess", "calligraphy"]) {
      const html = renderToStaticMarkup(
        <StorybookHero details={getInvitationDetails({ theme })} />,
      );
      expect(html).toContain("sc-scene");
      expect(html).toContain("sb-hero-copy");
    }
  });
  it("supports reduced motion, offscreen pausing and non-blocking phone scrolling", () => {
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).toContain("perspective:850px");
    expect(css).toContain("touch-action:pan-y");
    expect(css).toContain(".sc-visible .sc-orbit");
    expect(css).toContain(".sc-orbit,.sc-pollen,.sc-flame { animation:none!important; }");
  });
});
