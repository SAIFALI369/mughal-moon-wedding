#!/usr/bin/env node
/**
 * Entrance-door Open Graph previews (`1200x630` JPEGs) for all 22 themes.
 *
 * WhatsApp, Instagram and Meta link scrapers reliably render JPEG/PNG images
 * with explicit `1200x630` Open Graph dimensions (and often drop `.webp`).
 * Landscape doors fill the 1200x630 frame edge-to-edge; portrait doors keep
 * the full archway centered over a blurred bleed of the same scene.
 *
 *   node scripts/build-og-images.mjs           # build missing/stale JPEGs
 *   node scripts/build-og-images.mjs --force   # rebuild all 22 JPEGs
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const OUT_DIR = path.join(root, "public", "og", "themes");
const force = process.argv.includes("--force");

const EXTRA_SOURCES = {
  mecca_madinah: path.join(root, "src", "assets", "themes", "mecca-madinah.webp"),
  "mughal-moon-film": path.join(root, "src", "assets", "themes", "film-palace.webp"),
  eid: path.join(root, "src", "assets", "eid-sky.webp"),
};

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function probeDimensions(source) {
  const res = spawnSync(ffmpeg, ["-hide_banner", "-i", source], { encoding: "utf8" });
  const text = `${res.stderr ?? ""}${res.stdout ?? ""}`;
  const match = /\b(\d{3,5})x(\d{3,5})\b/.exec(text);
  if (!match) return { width: 1200, height: 630 };
  return { width: Number(match[1]), height: Number(match[2]) };
}

async function encodeOg(source, target) {
  if (!force && (await exists(target))) {
    const [from, to] = await Promise.all([stat(source), stat(target)]);
    if (to.mtimeMs >= from.mtimeMs) return { skipped: true, bytes: to.size };
  }
  const { width, height } = probeDimensions(source);
  const ratio = width / Math.max(1, height);
  const args =
    ratio >= 1.35
      ? [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-i",
          source,
          "-vf",
          "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630,format=yuvj420p",
          "-q:v",
          "3",
          "-frames:v",
          "1",
          target,
        ]
      : [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-i",
          source,
          "-filter_complex",
          "split[bg][fg];[bg]scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630,gblur=sigma=28,eq=brightness=-0.10[bgblur];[fg]scale=1200:630:force_original_aspect_ratio=decrease[fgfit];[bgblur][fgfit]overlay=(W-w)/2:(H-h)/2,format=yuvj420p",
          "-q:v",
          "3",
          "-frames:v",
          "1",
          target,
        ];
  execFileSync(ffmpeg, args, { stdio: "inherit" });
  return { skipped: false, bytes: (await stat(target)).size };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const films = (await readdir(path.join(root, "public", "film")))
    .filter((name) => name.endsWith(".mp4"))
    .map((name) => name.replace(/\.mp4$/, ""))
    .sort();

  let built = 0;
  let bytes = 0;

  for (const theme of films) {
    const themed = path.join(root, "src", "assets", "themes", `${theme}.webp`);
    const source = EXTRA_SOURCES[theme] ?? ((await exists(themed)) ? themed : EXTRA_SOURCES.eid);
    const result = await encodeOg(source, path.join(OUT_DIR, `${theme}.jpg`));
    if (!result.skipped) built += 1;
    bytes += result.bytes;
  }

  console.log(
    `[og-images] ${built} encoded, ${films.length} entrance-door JPEGs, ` +
      `${(bytes / 1024).toFixed(0)} KB in total`,
  );
}

await main();
