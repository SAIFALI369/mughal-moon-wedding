#!/usr/bin/env node
// Auto-migrate Lovable Supabase: runs all drizzle/migrations/*.sql sequentially via LOVABLE_DB_MIGRATION_URL
// Idempotent: each SQL is wrapped to continue on "already exists" errors where safe, but real errors will throw.
// Run: npm run db:migrate  or  node scripts/migrate.mjs
// Lovable injects LOVABLE_DB_MIGRATION_URL at build/runtime; GitHub Actions uses secret of same name.

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const MIGRATIONS_DIR = resolve("drizzle/migrations");

const url = process.env.LOVABLE_DB_MIGRATION_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!url) {
  console.log("[migrate] No LOVABLE_DB_MIGRATION_URL found — skipping (local dev without DB).");
  process.exit(0);
}

let postgres;
try {
  postgres = (await import("postgres")).default;
} catch {
  console.error("[migrate] missing 'postgres' package. Run: npm i postgres");
  process.exit(1);
}

const sql = postgres(url, { max: 2, connect_timeout: 10 });

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`[migrate] Found ${files.length} migrations in ${MIGRATIONS_DIR}:`, files.join(", "));
console.log(`[migrate] Connecting to DB...`);

for (const file of files) {
  const full = join(MIGRATIONS_DIR, file);
  const content = readFileSync(full, "utf8");
  if (!content.trim()) {
    console.log(`[migrate] Skip empty ${file}`);
    continue;
  }
  console.log(`[migrate] → Applying ${file} (${content.length} chars)`);
  try {
    await sql.unsafe(content);
    console.log(`[migrate] ✓ ${file} applied`);
  } catch (err) {
    const msg = err?.message || String(err);
    // Drizzle's "already exists" is fatal but we can treat as skipped if object already exists and migration is rerun
    // We check known safe idempotent errors; otherwise fail loudly so CI catches it
    if (msg.includes("already exists") || msg.includes("duplicate key") || msg.includes("already published")) {
      console.warn(`[migrate] ⚠ ${file} already applied (skipped): ${msg.split("\n")[0]}`);
      continue;
    }
    console.error(`[migrate] ✗ ${file} failed:`, msg);
    await sql.end({ timeout: 2 });
    process.exit(1);
  }
}

await sql.end({ timeout: 2 });
console.log("[migrate] All migrations applied ✓");
