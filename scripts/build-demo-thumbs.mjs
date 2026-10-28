#!/usr/bin/env node
/**
 * Small, sharp thumbnails for the theme collection.
 *
 * The theme artwork is full-page art (some files are 250–380 KB) and the demo
 * gallery uses phone-size photos. Drawing 22 cards of that on a phone means
 * downloading megabytes before anything feels smooth, so every tile gets its
 * own thumbnail: same picture, a fraction of the bytes.
 *
 *   node scripts/build-demo-thumbs.mjs           # build what is missing/stale
 *   node scripts/build-demo-thumbs.mjs --force   # rebuild everything
 *
 * Output:
 *   public/demo/poster/<theme>.webp   560 px wide — theme tiles and pickers
 *   public/demo/photo/<name>.webp     320 px wide — gallery strips
 *
 * Idempotent: an output newer than its source is skipped, so a normal build
 * re-encodes nothing.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const POSTER_DIR = path.join(root, "public", "demo", "poster");
const PHOTO_DIR = path.join(root, "public", "demo", "photo");

const POSTER_W = 560;
const POSTER_Q = 72;
const PHOTO_W = 320;
const PHOTO_Q = 70;
const PHOTO_NAMES = ["g1", "g2", "g3", "g4", "g5", "g6"];

const force = process.argv.includes("--force");

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

/** Encode one still into a small webp; skip when it is already up to date. */
async function shrink(source, target, width, quality) {
  if (!force && (await exists(target))) {
    const [from, to] = await Promise.all([stat(source), stat(target)]);
    if (to.mtimeMs >= from.mtimeMs) return { skipped: true, bytes: to.size };
  }
  execFileSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      source,
      "-vf",
      `scale=${width}:-2:flags=lanczos`,
      "-c:v",
      "libwebp",
      "-quality",
      String(quality),
      "-compression_level",
      "6",
      "-frames:v",
      "1",
      target,
    ],
    { stdio: "inherit" },
  );
  return { skipped: false, bytes: (await stat(target)).size };
}

async function main() {
  await mkdir(POSTER_DIR, { recursive: true });
  await mkdir(PHOTO_DIR, { recursive: true });

  // The film folder is the theme list: every theme that ships a hero film also
  // ships a tile poster, so a new theme can never miss one.
  const films = (await readdir(path.join(root, "public", "film")))
    .filter((name) => name.endsWith(".mp4"))
    .map((name) => name.replace(/\.mp4$/, ""))
    .sort();

  let built = 0;
  let bytes = 0;

  for (const theme of films) {
    const themed = path.join(root, "src", "assets", "themes", `${theme}.webp`);
    const source = (await exists(themed))
      ? themed
      : path.join(root, "src", "assets", "eid-sky.webp");
    const result = await shrink(source, path.join(POSTER_DIR, `${theme}.webp`), POSTER_W, POSTER_Q);
    if (!result.skipped) built += 1;
    bytes += result.bytes;
  }

  for (const name of PHOTO_NAMES) {
    const source = path.join(root, "src", "assets", `${name}.webp`);
    if (!(await exists(source))) continue;
    const result = await shrink(source, path.join(PHOTO_DIR, `${name}.webp`), PHOTO_W, PHOTO_Q);
    if (!result.skipped) built += 1;
    bytes += result.bytes;
  }

  console.log(
    `[demo-thumbs] ${built} encoded, ${films.length} posters + ${PHOTO_NAMES.length} photos, ` +
      `${(bytes / 1024).toFixed(0)} KB in total`,
  );
}

await main();
