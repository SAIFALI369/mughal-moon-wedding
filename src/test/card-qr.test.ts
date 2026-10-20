import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { buildCardInsertHtml } from "@/lib/card-insert";
import {
  buildCardQr,
  invitationShareUrl,
  QR_QUIET_ZONE,
  qrFileName,
  qrPath,
  qrSvgMarkup,
} from "@/lib/card-qr";

const URL = "https://invitingyou.example/invite/ayesha-imran";

/** Finder patterns are the three 7 × 7 squares a scanner locks onto first. */
function hasFinderPattern(qr: ReturnType<typeof buildCardQr>, top: number, left: number) {
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const border = row === 0 || row === 6 || col === 0 || col === 6;
      const core = row >= 2 && row <= 4 && col >= 2 && col <= 4;
      if (qr.isDark(top + row, left + col) !== (border || core)) return false;
    }
  }
  return true;
}

describe("invitation QR links", () => {
  it("builds the public invitation URL without a guest name", () => {
    expect(invitationShareUrl("https://invitingyou.example", "ayesha-imran")).toBe(URL);
    expect(invitationShareUrl("https://invitingyou.example/", " ayesha-imran ")).toBe(URL);
  });

  it("adds an encoded personalised greeting", () => {
    expect(invitationShareUrl("https://invitingyou.example", "ayesha-imran", "  ")).toBe(URL);
    expect(
      invitationShareUrl("https://invitingyou.example", "ayesha-imran", "Uncle Ahmed & Family"),
    ).toBe(`${URL}?guest=Uncle%20Ahmed%20%26%20Family`);
    expect(invitationShareUrl("https://invitingyou.example", "ayesha-imran", "ا")).toBe(
      `${URL}?guest=%D8%A7`,
    );
  });

  it("caps a very long guest name", () => {
    const link = invitationShareUrl("https://invitingyou.example", "ayesha-imran", "a".repeat(200));
    expect(link).toHaveLength(URL.length + "?guest=".length + 80);
  });

  it("refuses an empty link", () => {
    expect(() => buildCardQr("   ")).toThrow(/link is required/i);
  });
});

describe("QR matrix", () => {
  it("is square and carries the three finder patterns", () => {
    const qr = buildCardQr(URL);
    expect(qr.moduleCount).toBeGreaterThanOrEqual(21);
    expect(qr.moduleCount % 4).toBe(1); // every QR version is 17 + 4n modules wide
    expect(hasFinderPattern(qr, 0, 0)).toBe(true);
    expect(hasFinderPattern(qr, 0, qr.moduleCount - 7)).toBe(true);
    expect(hasFinderPattern(qr, qr.moduleCount - 7, 0)).toBe(true);
  });

  it("grows with the amount of data", () => {
    const short = buildCardQr("https://a.example/invite/x");
    const long = buildCardQr(`${URL}?guest=${encodeURIComponent("a".repeat(120))}`);
    expect(long.moduleCount).toBeGreaterThanOrEqual(short.moduleCount);
  });

  it("leaves a clear quiet zone around the modules", () => {
    const qr = buildCardQr(URL);
    const { size, path } = qrPath(qr);
    expect(size).toBe(qr.moduleCount + QR_QUIET_ZONE * 2);
    // Every command starts after the quiet zone and stays inside the code area.
    const xs = [...path.matchAll(/M(\d+)/g)].map((match) => Number(match[1]));
    const ys = [...path.matchAll(/M\d+ (\d+)/g)].map((match) => Number(match[1]));
    expect(Math.min(...xs, ...ys)).toBe(QR_QUIET_ZONE);
    expect(Math.max(...xs)).toBeLessThan(QR_QUIET_ZONE + qr.moduleCount);
    expect(Math.max(...ys)).toBeLessThan(QR_QUIET_ZONE + qr.moduleCount);
  });
});

describe("printable output", () => {
  it("renders a crisp SVG with a quiet zone and accessible title", () => {
    const qr = buildCardQr(URL);
    const svg = qrSvgMarkup(qr, { label: "QR code for Ayesha & Imran's card" });
    const expectedSize = qr.moduleCount + QR_QUIET_ZONE * 2;
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${expectedSize} ${expectedSize}"`);
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toMatch(/<path d="M[^"]+" fill="#000000"\/>/);
    // The ampersand in the label must not break the markup.
    expect(svg).toContain("Ayesha &amp; Imran");
    expect(svg).not.toContain("Ayesha & Imran");
  });

  it("is deterministic, so reprints match the proof", () => {
    expect(qrSvgMarkup(buildCardQr(URL))).toBe(qrSvgMarkup(buildCardQr(URL)));
  });

  it("merges horizontal runs instead of one rect per module", () => {
    const qr = buildCardQr(URL);
    const { path } = qrPath(qr);
    const commands = path.match(/M/g) ?? [];
    let darkModules = 0;
    for (let row = 0; row < qr.moduleCount; row += 1) {
      for (let col = 0; col < qr.moduleCount; col += 1) {
        if (qr.isDark(row, col)) darkModules += 1;
      }
    }
    expect(commands.length).toBeLessThan(darkModules);
    expect(path).not.toMatch(/[^Mhvz0-9\- ]/);
  });

  it("decodes back to the invitation link, as a phone camera would", () => {
    const link = `${URL}?guest=${encodeURIComponent("Uncle Ahmed & Family")}`;
    const qr = buildCardQr(link);
    const { size } = qrPath(qr);
    const scale = 8;
    const pixels = size * scale;
    const data = new Uint8ClampedArray(pixels * pixels * 4).fill(255);
    for (let row = 0; row < qr.moduleCount; row += 1) {
      for (let col = 0; col < qr.moduleCount; col += 1) {
        if (!qr.isDark(row, col)) continue;
        for (let y = 0; y < scale; y += 1) {
          for (let x = 0; x < scale; x += 1) {
            const px = (col + QR_QUIET_ZONE) * scale + x;
            const py = (row + QR_QUIET_ZONE) * scale + y;
            const offset = (py * pixels + px) * 4;
            data[offset] = 0;
            data[offset + 1] = 0;
            data[offset + 2] = 0;
          }
        }
      }
    }
    const decoded = jsQR(data, pixels, pixels);
    expect(decoded?.data).toBe(link);
  });

  it("names downloads after the invitation slug", () => {
    expect(qrFileName("ayesha-imran", "png")).toBe("invitation-ayesha-imran-qr.png");
    expect(qrFileName("Ayesha & Imran / 2026", "svg")).toBe("invitation-Ayesha-Imran-2026-qr.svg");
    expect(qrFileName("///", "png")).toBe("invitation-invitation-qr.png");
  });
});

describe("printable card insert", () => {
  const svg = qrSvgMarkup(buildCardQr(URL));

  it("lays out one 90 × 55 mm insert with the QR and the couple's details", () => {
    const html = buildCardInsertHtml({
      title: "Ayesha & Imran",
      names: "Ayesha & Imran",
      when: "12 December 2026 · 7:00 PM",
      where: "Pearl Hall, Patna",
      footer: "The Khan family",
      qrSvg: svg,
    });
    expect(html).toContain("width: 90mm; height: 55mm");
    expect(html).toContain("@page { size: A4; margin: 12mm; }");
    expect(html).toContain("Ayesha &amp; Imran");
    expect(html).toContain(svg);
    expect(html).toContain("Pearl Hall, Patna");
    expect(html).toContain("The Khan family");
    expect(html).toContain("window.print()");
    // A print window must not pull remote resources or scripts.
    expect(html).not.toContain("<script src");
    expect(html).not.toContain("<link");
    expect(html).not.toContain('href="http');
    // The only URL is the SVG namespace, so nothing loads from the network.
    expect(html.match(/https?:\/\/[^\s"']+/g)).toEqual(["http://www.w3.org/2000/svg"]);
  });

  it("omits optional lines instead of printing blanks", () => {
    const html = buildCardInsertHtml({ title: "Draft", names: "Groom & Bride", qrSvg: svg });
    expect(html).not.toContain('class="meta"');
    expect(html).not.toContain('class="footer"');
    expect(html).toContain('class="scan"');
  });

  it("escapes host-supplied text so a venue cannot inject markup", () => {
    const html = buildCardInsertHtml({
      title: "Card",
      names: '<script>alert("x")</script>',
      where: 'Hall <img src=x onerror="alert(1)">',
      qrSvg: svg,
    });
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x");
  });
});
