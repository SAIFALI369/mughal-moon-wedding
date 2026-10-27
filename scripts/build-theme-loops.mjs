#!/usr/bin/env node
/**
 * Build real, looping hero films for the existing themes.
 *
 * Every cultural theme already ships one still illustration. This script turns
 * each of those illustrations into an eight-second video: a slow camera move
 * across the art plus a matching ambient layer — falling petals, rising embers,
 * twinkling stars, drifting river light or chandelier bokeh — encoded small
 * enough to load like a photo.
 *
 *   node scripts/build-theme-loops.mjs            # only rebuild what changed
 *   node scripts/build-theme-loops.mjs --force    # rebuild everything
 *   node scripts/build-theme-loops.mjs --theme riad-noor
 *
 * Output: public/film/<theme>.mp4 (H.264, 1024×576, no audio, fast-start).
 * The page keeps using the original webp as the poster frame, so the video only
 * ever streams in after the first paint.
 *
 * Requirements: ffmpeg (bundled through @ffmpeg-installer/ffmpeg) and
 * ImageMagick (`convert`) for the particle overlays.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "film");
const overlayDir = path.join(tmpdir(), "invitingyou-loops");
const FRAME_W = 1024;
const FRAME_H = 576;
const FPS = 25;
/**
 * The frame matches the illustration's own aspect ratio, so the film can fade
 * in over the still without the picture jumping. Overrides live per cut.
 */
const DEFAULT_SIZE = [FRAME_W, FRAME_H];

function ffmpegPath() {
  try {
    return require("@ffmpeg-installer/ffmpeg").path;
  } catch {
    return "ffmpeg";
  }
}

/**
 * The cut list. `move` is the camera, `air` is what drifts through the shot.
 *
 * - `push`   slow push-in, the classic cinematic move
 * - `drift`  push-in plus a lazy sideways sway
 * - `breathe` barely moving, only the light changes: for quiet, formal art
 * - `rise`   the camera travels upward, as if the lens were lifting to the sky
 * - `water`  a slow downward travel, so water and reflections read as flowing
 */
const cuts = {
  "royal-rajmahal": { art: "royal-rajmahal.webp", move: "drift", air: "lantern" },
  "lotus-goddess": { art: "lotus-goddess.webp", move: "breathe", air: "petals" },
  calligraphy: { art: "calligraphy.webp", move: "drift", air: "embers" },
  eid: { art: "../eid-sky.webp", move: "rise", air: "stars", size: [1200, 800] },
  aladin: { art: "aladin.webp", move: "drift", air: "lantern" },
  "bihari-vibe": { art: "bihari-vibe.webp", move: "drift", air: "petals" },
  mecca_madinah: { art: "mecca-madinah.webp", move: "breathe", air: "stars" },
  luxury: { art: "luxury.webp", move: "push", air: "embers" },
  futuristic: { art: "futuristic.webp", move: "rise", air: "stars" },
  fairytale: { art: "fairytale.webp", move: "push", air: "stars" },
  ballroom: { art: "ballroom.webp", move: "drift", air: "lantern" },
  "diya-utsav": { art: "diya-utsav.webp", move: "drift", air: "embers" },
  "sacred-mandap": { art: "sacred-mandap.webp", move: "breathe", air: "petals" },
  "riad-noor": { art: "riad-noor.webp", move: "drift", air: "lantern" },
  "kashi-ghat": { art: "kashi-ghat.webp", move: "water", air: "embers" },
  "mehndi-night": { art: "mehndi-night.webp", move: "drift", air: "petals" },
  "jharokha-dawn": { art: "jharokha-dawn.webp", move: "breathe", air: "petals" },
  "haldi-baag": { art: "haldi-baag.webp", move: "drift", air: "petals" },
  "vows-in-ink": { art: "vows-in-ink.webp", move: "breathe", air: "embers" },
  "chand-bagh": { art: "chand-bagh.webp", move: "rise", air: "stars" },
  "mela-maidan": { art: "mela-maidan.webp", move: "drift", air: "petals" },
  // A portrait palace: this theme's film is vertical on purpose.
  "mughal-moon-film": { art: "film-palace.webp", move: "rise", air: "stars", size: [720, 1280] },
};

/** Seconds per loop. Long enough that the repeat is not obvious. */
const DURATION = 8;

/** Camera expressions over the zoompan filter, in output pixels. */
const moves = {
  // The moves are deliberately readable: a guest should see, within two
  // seconds, that this is a film and not a photograph.
  push: {
    z: `1.02+0.20*on/${DURATION * FPS}`,
    x: `iw/2-(iw/zoom/2)`,
    y: `ih/2-(ih/zoom/2)-46*on/${DURATION * FPS}`,
  },
  drift: {
    z: `1.10+0.09*sin(2*PI*on/${DURATION * FPS})`,
    x: `iw/2-(iw/zoom/2)+62*sin(2*PI*on/${DURATION * FPS})`,
    y: `ih/2-(ih/zoom/2)+28*cos(2*PI*on/${DURATION * FPS})`,
  },
  breathe: {
    z: `1.04+0.085*sin(2*PI*on/${DURATION * FPS})`,
    x: `iw/2-(iw/zoom/2)`,
    y: `ih/2-(ih/zoom/2)-14*sin(2*PI*on/${DURATION * FPS})`,
  },
  rise: {
    z: `1.04+0.14*on/${DURATION * FPS}`,
    x: `iw/2-(iw/zoom/2)+18*sin(2*PI*on/${DURATION * FPS})`,
    y: `ih/2-(ih/zoom/2)+96*on/${DURATION * FPS}`,
  },
  water: {
    z: `1.04+0.12*on/${DURATION * FPS}`,
    x: `iw/2-(iw/zoom/2)+24*sin(4*PI*on/${DURATION * FPS})`,
    y: `ih/2-(ih/zoom/2)-70*on/${DURATION * FPS}`,
  },
};

/**
 * Ambient layers are generated once as a tall, self-repeating PNG: the pattern
 * is drawn twice, one frame-height apart, so a vertical scroll wraps invisibly.
 */
const airs = {
  petals: { pixels: "petals", speed: 34, tint: "#f3d9b0", blend: "over" },
  embers: { pixels: "embers", speed: 46, tint: "#ffcf8a", blend: "over" },
  stars: { pixels: "stars", speed: 6, tint: "#fdf6e3", blend: "over" },
  lantern: { pixels: "bokeh", speed: 14, tint: "#ffd9a0", blend: "over" },
};

function drawParticles(kind, [width, height]) {
  // Deterministic: the same theme always produces the same loop.
  let state = kind.length * 773 + height;
  const rnd = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  const args = ["-size", `${width}x${height * 2}`, "xc:none"];
  const shape = (fill, draw) => {
    args.push("-fill", fill, "-draw", draw);
  };

  if (kind === "petals") {
    for (let index = 0; index < 70; index += 1) {
      const x = Math.round(rnd() * width);
      const y = Math.round(rnd() * height);
      const rx = 4 + Math.round(rnd() * 7);
      const ry = 2 + Math.round(rnd() * 4);
      const angle = Math.round(rnd() * 180);
      shape(
        `rgba(255,228,184,${(0.16 + rnd() * 0.34).toFixed(2)})`,
        `ellipse ${x},${y} ${rx},${ry} ${angle},${angle + 180}`,
      );
    }
  } else if (kind === "embers") {
    for (let index = 0; index < 190; index += 1) {
      const x = Math.round(rnd() * width);
      const y = Math.round(rnd() * height);
      const radius = Math.round(1 + rnd() * 2.4);
      shape(
        `rgba(255,214,150,${(0.2 + rnd() * 0.6).toFixed(2)})`,
        `circle ${x},${y} ${x + radius},${y}`,
      );
    }
  } else if (kind === "stars") {
    for (let index = 0; index < 220; index += 1) {
      const x = Math.round(rnd() * width);
      const y = Math.round(rnd() * height * 1.4);
      const radius = Math.round(0.6 + rnd() * 1.5);
      shape(
        `rgba(255,250,235,${(0.15 + rnd() * 0.65).toFixed(2)})`,
        `circle ${x},${y} ${x + radius},${y}`,
      );
    }
  } else {
    // bokeh: soft out-of-focus lanterns, large and dim
    for (let index = 0; index < 30; index += 1) {
      const x = Math.round(rnd() * width);
      const y = Math.round(rnd() * height);
      const radius = 8 + Math.round(rnd() * 26);
      shape(
        `rgba(255,208,140,${(0.05 + rnd() * 0.16).toFixed(2)})`,
        `circle ${x},${y} ${x + radius},${y}`,
      );
    }
    args.push("-blur", "0x6");
  }
  return args;
}

async function overlayFor(kind, size) {
  await mkdir(overlayDir, { recursive: true });
  const file = path.join(overlayDir, `${kind}-${size[0]}x${size[1]}.png`);
  execFileSync("convert", [...drawParticles(kind, size), file], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  return file;
}

function filterFor(cut, overlayPath) {
  const move = moves[cut.move] ?? moves.drift;
  const air = airs[cut.air] ?? airs.stars;
  const [width, height] = cut.size ?? DEFAULT_SIZE;
  const base = [
    `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase`,
    `crop=${width * 2}:${height * 2}`,
    `zoompan=z='${move.z}':x='${move.x}':y='${move.y}':d=1:s=${width}x${height}:fps=${FPS}`,
  ].join(",");
  const grade = [
    "eq=saturation=1.06:contrast=1.02",
    "noise=alls=3:allf=t+u",
    "vignette=PI/5",
    "format=yuv420p",
  ].join(",");
  return [
    `[0:v]${base}[plate]`,
    `[1:v]format=rgba,fade=t=in:st=0:d=1.4:alpha=1[air]`,
    `[plate][air]overlay=x=0:y='-mod(t*${air.speed}\\,${height})':eval=frame:shortest=1[lit]`,
    `[lit]${grade}[out]`,
  ].join(";");
}

async function upToDate(artPath, target) {
  try {
    const [art, video, self] = await Promise.all([
      stat(artPath),
      stat(target),
      stat(fileURLToPath(import.meta.url)),
    ]);
    return video.mtimeMs > Math.max(art.mtimeMs, self.mtimeMs);
  } catch {
    return false;
  }
}

async function main() {
  const force = process.argv.includes("--force");
  const only = process.argv.indexOf("--theme");
  const filter = only > -1 ? process.argv[only + 1] : null;
  const ffmpeg = ffmpegPath();
  await mkdir(outDir, { recursive: true });

  const overlays = new Map();
  const summary = [];
  let failed = 0;

  for (const [theme, cut] of Object.entries(cuts)) {
    if (filter && theme !== filter) continue;
    const artPath = path.join(root, "src", "assets", "themes", cut.art);
    const target = path.join(outDir, `${theme}.mp4`);
    if (!force && (await upToDate(artPath, target))) {
      summary.push(`${theme.padEnd(20)} up to date`);
      continue;
    }
    const size = cut.size ?? DEFAULT_SIZE;
    const key = `${cut.air}-${size[0]}x${size[1]}`;
    if (!overlays.has(key)) overlays.set(key, await overlayFor(cut.air, size));
    const overlay = overlays.get(key);
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-loop",
      "1",
      "-framerate",
      String(FPS),
      "-t",
      String(DURATION),
      "-i",
      artPath,
      "-loop",
      "1",
      "-framerate",
      String(FPS),
      "-t",
      String(DURATION),
      "-i",
      overlay,
      "-filter_complex",
      filterFor(cut, overlay),
      "-map",
      "[out]",
      "-an",
      "-t",
      String(DURATION),
      "-c:v",
      "libx264",
      "-profile:v",
      "main",
      "-level",
      "3.1",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "31",
      "-maxrate",
      "1200k",
      "-bufsize",
      "2400k",
      "-g",
      String(FPS * 2),
      "-movflags",
      "+faststart",
      target,
    ];
    const started = Date.now();
    try {
      execFileSync(ffmpeg, args, { stdio: ["ignore", "ignore", "inherit"] });
      const { size: bytes } = await stat(target);
      summary.push(
        `${theme.padEnd(20)} ${`${cut.size?.[0] ?? DEFAULT_SIZE[0]}x${cut.size?.[1] ?? DEFAULT_SIZE[1]}`.padEnd(9)} ${cut.move.padEnd(8)} ${cut.air.padEnd(8)} ${(bytes / 1024).toFixed(0).padStart(4)} KB  ${((Date.now() - started) / 1000).toFixed(1)}s`,
      );
    } catch (error) {
      failed += 1;
      summary.push(`${theme.padEnd(20)} FAILED ${error.message}`);
    }
  }

  await writeFile(
    path.join(outDir, "README.md"),
    `# Theme loops\n\nGenerated by \`node scripts/build-theme-loops.mjs\` — do not edit by hand.\n\n` +
      `Each file is an 8-second, silent, 1024×576 H.264 loop built from the theme's own\n` +
      `illustration in \`src/assets/themes\`: a slow camera move plus its ambient layer\n` +
      `(petals, embers, stars or lantern bokeh). The still illustration stays the poster\n` +
      `frame, so the video only streams in after the first paint.\n`,
  );

  console.log(summary.join("\n"));
  if (failed) process.exitCode = 1;
}

await main();
