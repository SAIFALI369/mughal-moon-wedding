#!/usr/bin/env node
/**
 * Free AI pool health check.
 *
 *   node scripts/check-free-ai.mjs
 *
 * Loads `.env` and `supabase/.env`, builds the same route pool the concierge
 * uses, and sends one tiny request down each route. Anything that answers is
 * live quota you can spend today; anything that fails tells you why, so a dead
 * key never surprises you on the wedding day.
 *
 * Secrets are read locally and never printed — only a short fingerprint and the
 * HTTP status appear in the output.
 *
 * Requires Node 22.18+ (TypeScript type stripping) or Node 22.6+ with
 * `--experimental-strip-types`.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  PROVIDER_CATALOG,
  buildRoutes,
  chat,
  describePool,
} from "../supabase/functions/_shared/free-router.ts";

const PROMPT = "Reply with exactly: OK";
const TIMEOUT_MS = Number(process.env.FREE_AI_PROBE_TIMEOUT_MS) || 15_000;

const C = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  bold: "\u001b[1m",
  green: "\u001b[32m",
  red: "\u001b[31m",
  yellow: "\u001b[33m",
  cyan: "\u001b[36m",
};
const paint = (colour, text) => (process.stdout.isTTY ? `${colour}${text}${C.reset}` : text);

function parseDotEnv(file) {
  try {
    const raw = readFileSync(file, "utf8");
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
      if (!match) continue;
      out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const root = process.cwd();
const fileEnv = {
  ...parseDotEnv(path.join(root, ".env")),
  ...parseDotEnv(path.join(root, "supabase", ".env")),
};

function fingerprint(key) {
  if (!key) return "keyless";
  return `${key.slice(0, 3)}\u2026${key.slice(-2)}`;
}

const routes = buildRoutes(undefined, fileEnv);
const summary = describePool(fileEnv);

console.log(`\n${paint(C.bold, "Free AI pool")} \u2014 ${root}\n`);

if (routes.length === 0) {
  console.log(paint(C.red, "No routes configured."));
  console.log(
    "Set FREE_AI_ENABLE_KEYLESS=false only if you intend to run keys-only; otherwise add at least one *_API_KEY.\n",
  );
}

/**
 * The router logs each failure as it goes, which is exactly what you want in
 * production and noise in a table. Mute it while probing.
 */
async function probe(route) {
  const originalError = console.error;
  console.error = () => {};
  try {
    return await chat({
      systemInstruction: "You reply with one word.",
      messages: [{ role: "user", content: PROMPT }],
      maxOutputTokens: 8,
      temperature: 0,
      routes: [route],
      routeTimeoutMs: TIMEOUT_MS,
      totalBudgetMs: TIMEOUT_MS,
      env: fileEnv,
    });
  } finally {
    console.error = originalError;
  }
}

const results = [];
for (const route of routes) {
  const started = Date.now();
  let status = "FAIL";
  let detail = "";
  try {
    const answer = await probe(route);
    status = "PASS";
    detail = answer.reply.replace(/\s+/g, " ").slice(0, 40);
  } catch (error) {
    detail =
      error instanceof Error && typeof error.lastError === "string" && error.lastError
        ? error.lastError
        : error instanceof Error
          ? error.message
          : String(error);
  }
  const latency = Date.now() - started;
  results.push({ route, status, detail, latency });
  const colour = status === "PASS" ? C.green : C.red;
  console.log(
    `  ${paint(colour, status.padEnd(4))} ${route.provider.padEnd(12)} ${route.model
      .slice(0, 38)
      .padEnd(38)} ${paint(C.dim, fingerprint(route.apiKey).padEnd(10))} ${String(latency).padStart(
      6,
    )}ms  ${paint(C.dim, detail)}`,
  );
}

const passed = results.filter((r) => r.status === "PASS");
const keyedPassed = passed.filter((r) => !r.route.keyless).length;
const keylessPassed = passed.filter((r) => r.route.keyless).length;

console.log(`\n${paint(C.bold, "Summary")}`);
console.log(`  ${results.length} routes probed, ${paint(C.green, `${passed.length} answered`)}`);
console.log(`  keyed routes answering:   ${keyedPassed}`);
console.log(`  keyless routes answering: ${keylessPassed}`);

const unconfigured = summary.filter((p) => !p.keyless && !p.configured);
if (unconfigured.length > 0) {
  console.log(
    `\n${paint(C.bold, "Free keys you have not added yet")} ${paint(C.dim, "(each one multiplies the pool)")}`,
  );
  for (const provider of unconfigured) {
    const spec = PROVIDER_CATALOG.find((p) => p.slug === provider.id);
    console.log(`  ${paint(C.cyan, provider.id.padEnd(13))} ${provider.label}`);
    console.log(`  ${" ".repeat(13)} ${paint(C.dim, spec?.note ?? "")}`);
    console.log(`  ${" ".repeat(13)} ${paint(C.dim, spec?.signupUrl ?? "")}`);
  }
}

const broken = results.filter((r) => r.status !== "PASS");
if (broken.length > 0) {
  const providers = [...new Set(broken.map((r) => r.route.provider))];
  console.log(
    `\n${paint(C.yellow, "Not answering:")} ${providers.join(", ")} \u2014 check the key, the model name, or the provider status page.`,
  );
}

console.log("");
process.exit(passed.length > 0 ? 0 : 1);
