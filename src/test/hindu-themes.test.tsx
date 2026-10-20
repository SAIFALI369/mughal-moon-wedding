// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MandapStage,
  LivingScene,
  riteBlessing,
  riteForTheme,
  themeRites,
} from "@/components/wedding/invitation-rite";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import { Preloader } from "@/components/wedding/sections";
import { invitationArt } from "@/components/wedding/invitation-art";
import {
  invitationFrameworkIds,
  invitationThemeIds,
  invitationThemes,
} from "@/components/wedding/invitation-options";

const hindu = getInvitationDetails({
  groomName: "Arjun",
  brideName: "Meera",
  date: "15 December 2030",
  time: "7:00 PM IST",
  venue: "Lotus Garden",
  address: "Varanasi, Uttar Pradesh",
  eventType: "Shubh Vivah",
  hosts: "The Sharma and Iyer families",
  theme: "diya-utsav",
  framework: "royal-folio",
  riteLine: "॥ शुभ विवाह ॥",
});

const mandap = (details = hindu) =>
  renderToStaticMarkup(
    <MandapStage
      details={details}
      backgroundImage={invitationArt[details.theme]}
      actions={<a href="#celebration">See the celebration</a>}
      scrollTo="#countdown"
      entranceDelay={0}
    />,
  );

describe("Hindu themes", () => {
  it("adds Diya Utsav and Sacred Mandap, with their own artwork", () => {
    expect(invitationThemeIds).toHaveLength(20);
    const labels = invitationThemes.map((theme) => theme.label);
    expect(labels).toContain("Diya Utsav");
    expect(labels).toContain("Sacred Mandap");
    expect(invitationArt["diya-utsav"]).toBeTruthy();
    expect(invitationArt["sacred-mandap"]).toBeTruthy();
    for (const theme of invitationThemeIds) expect(invitationArt[theme]).toBeTruthy();
  });

  it("marks both as Hindu and keeps the other themes on their own tradition", () => {
    expect(themeRites["diya-utsav"]).toBe("hindu");
    expect(themeRites["sacred-mandap"]).toBe("hindu");
    expect(themeRites.mughal).toBe("muslim");
    expect(themeRites.eid).toBe("muslim");
    expect(themeRites.classic).toBe("universal");
    expect(themeRites.fairytale).toBe("universal");
  });

  it("carries a Sanskrit blessing with the Devanagari font, and no Bismillah", () => {
    const blessing = riteBlessing("sacred-mandap");
    expect(blessing?.text).toBe("॥ श्री गणेशाय नमः ॥");
    expect(blessing?.script).toBe("sanskrit");
    expect(riteBlessing("eid")?.text).toContain("بِسْمِ");
    expect(riteBlessing("classic")).toBeNull();
  });

  it("uses the fifth layout count unchanged", () => {
    expect(invitationFrameworkIds).toHaveLength(5);
  });
});

describe("LivingScene", () => {
  it("draws fireworks, diya flames and drifting embers with no media file", () => {
    const html = renderToStaticMarkup(<LivingScene theme="diya-utsav" variant="hero" />);
    expect(html).toContain("living-fireworks");
    expect(html).toContain("burst-a");
    expect(html).toContain("living-bokeh");
    expect(html).toContain("living-diya-row");
    expect(html.match(/class="diya /g)).toHaveLength(5);
    expect(html).toContain("diya-flame");
    expect(html.match(/class="spark /g)).toHaveLength(14);
    expect(html).not.toContain("<video");
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("<img");
    expect(html).toContain('data-tone="night"');
  });

  it("shows no diya row on the small stage layer, only the sky show", () => {
    const html = renderToStaticMarkup(<LivingScene theme="mughal" variant="stage" />);
    expect(html).not.toContain("living-diya-row");
    expect(html).toContain("living-fireworks");
    expect(html).toContain('data-rite="muslim"');
  });

  it("freezes into a still frame when motion is reduced", () => {
    const html = renderToStaticMarkup(<LivingScene theme="sacred-mandap" variant="gate" reduce />);
    expect(html).toContain('data-reduced="true"');
  });
});

describe("Mandap stage", () => {
  it("stages a flower canopy, hanging bells and a living havan fire", () => {
    const html = mandap();
    expect(html).toContain("mandap-stage");
    expect(html).toContain("mandap-canopy");
    expect(html).toContain("mandap-garland-left");
    expect(html).toContain("mandap-bell");
    expect(html).toContain("mandap-havan");
    expect(html.match(/havan-flame/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain("havan-ember");
    expect(html).toContain("living-scene");
  });

  it("keeps the couple's own details and Sanskrit lines", () => {
    const html = mandap();
    expect(html).toContain("Arjun");
    expect(html).toContain("Meera");
    expect(html).toContain("॥ श्री गणेशाय नमः ॥");
    expect(html).toContain("॥ शुभ विवाह ॥");
    expect(html).toContain("Lotus Garden");
    expect(html).toContain("The Sharma and Iyer families");
    expect(html).not.toContain("Mohsin");
    expect(html).not.toContain("Simran");
  });

  it("falls back to a neutral line when the host leaves the blessing blank", () => {
    const html = mandap({ ...hindu, riteLine: "" });
    expect(html).toContain("A sacred celebration");
  });

  it("opens the gate with the Sanskrit blessing and the living fire", () => {
    const gate = renderToStaticMarkup(<Preloader onDone={() => {}} theme="diya-utsav" />);
    expect(gate).toContain("॥ श्री गणेशाय नमः ॥");
    expect(gate).toContain("living-scene");
    expect(gate).toContain("diya-flame");
    expect(gate).not.toContain("بِسْمِ");
  });

  it("keeps the Muslim gate on the Bismillah", () => {
    const gate = renderToStaticMarkup(<Preloader onDone={() => {}} theme="eid" />);
    expect(gate).toContain("بِسْمِ");
    expect(gate).not.toContain("गणेश");
  });
});
