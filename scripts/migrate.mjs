#!/usr/bin/env node
// Auto-migrate Lovable Supabase: runs all drizzle/migrations/*.sql sequentially via LOVABLE_DB_MIGRATION_URL
// Successful migrations are recorded atomically; historical 0000–0004 retain legacy duplicate-object skips.
// Run: npm run db:migrate  or  node scripts/migrate.mjs
// Configure a database URL in the build environment or the GitHub Actions secret.

import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const MIGRATIONS_DIR = resolve("drizzle/migrations");

const url =
  process.env.LOVABLE_DB_MIGRATION_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!url) {
  // Only an explicit REQUIRE_DB_MIGRATIONS=1 (set by the GitHub Actions job)
  // makes a missing URL fatal. Hosting builds such as Vercel export CI=true but
  // have no database password, so they must be able to finish the app build
  // while the schema is managed through the Supabase Dashboard or connector.
  if (process.env.REQUIRE_DB_MIGRATIONS === "1") {
    console.error(
      "[migrate] Database migrations required but no connection URL configured. Set LOVABLE_DB_MIGRATION_URL, DATABASE_URL or SUPABASE_DB_URL in the server build environment / Actions secrets.",
    );
    process.exit(1);
  }
  console.log("[migrate] No LOVABLE_DB_MIGRATION_URL found — skipping (schema is managed separately).");
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

function reportFailure(stage, error) {
  const code = typeof error?.code === "string" ? error.code : "UNKNOWN";
  // Never copy a connection string or credential from a driver error to CI logs.
  const message = String(error?.message || error)
    .replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "[redacted database URL]")
    .replace(/\b(password|token|secret)=\S+/gi, "$1=[redacted]");
  console.error(`[migrate] ✗ ${stage} (${code}): ${message}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\nMigration failed during **${stage}** (SQLSTATE/error code: \`${code}\`). See the job log for sanitized details.\n`,
    );
  }
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log(`[migrate] Found ${files.length} migrations in ${MIGRATIONS_DIR}:`, files.join(", "));
console.log(`[migrate] Connecting to DB...`);

try {
  await sql`CREATE TABLE IF NOT EXISTS public.app_sql_migrations (
    filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`ALTER TABLE public.app_sql_migrations ENABLE ROW LEVEL SECURITY`;
  await sql`REVOKE ALL ON public.app_sql_migrations FROM PUBLIC, anon, authenticated`;
} catch (error) {
  reportFailure("database connection / migration tracking", error);
  await sql.end({ timeout: 2 });
  process.exit(1);
}

for (const file of files) {
  const full = join(MIGRATIONS_DIR, file);
  const content = readFileSync(full, "utf8");
  if (!content.trim()) {
    console.log(`[migrate] Skip empty ${file}`);
    continue;
  }
  console.log(`[migrate] → Applying ${file} (${content.length} chars)`);
  try {
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(714293850)`;
      const applied =
        await tx`SELECT filename FROM public.app_sql_migrations WHERE filename = ${file}`;
      if (applied.length) return;
      await tx.unsafe(content);
      await tx`INSERT INTO public.app_sql_migrations (filename) VALUES (${file})`;
    });
    console.log(`[migrate] ✓ ${file} applied`);
  } catch (err) {
    const msg = err?.message || String(err);
    // Drizzle's "already exists" is fatal but we can treat as skipped if object already exists and migration is rerun
    // We check known safe idempotent errors; otherwise fail loudly so CI catches it
    if (
      /^000[0-4]_/.test(file) &&
      (msg.includes("already exists") || msg.includes("already published"))
    ) {
      console.warn(`[migrate] ⚠ ${file} already applied (skipped): ${msg.split("\n")[0]}`);
      continue;
    }
    reportFailure(file, err);
    await sql.end({ timeout: 2 });
    process.exit(1);
  }
}

await sql.end({ timeout: 2 });
console.log("[migrate] All migrations applied ✓");
