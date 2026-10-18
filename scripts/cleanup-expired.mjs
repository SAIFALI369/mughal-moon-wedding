#!/usr/bin/env node
// Cleanup expired invitation cards after marriage day ends
// Called via GitHub Action daily and client-side via RPC; never deletes memories (those are local)
// Run: node scripts/cleanup-expired.mjs
const url = process.env.LOVABLE_DB_MIGRATION_URL || process.env.DATABASE_URL;
if (!url) {
  console.log("[cleanup] No DB URL — skipping");
  process.exit(0);
}
import postgres from "postgres";
const sql = postgres(url, { max: 1 });
try {
  const [row] = await sql`SELECT public.delete_expired_invitations() as deleted`;
  console.log(`[cleanup] Deleted ${row?.deleted ?? 0} expired cards`);
  // also cleanup local memories is client-only (localStorage), handled in browser via expiry check
  await sql.end();
} catch (e) {
  console.error("[cleanup] failed", e.message);
  await sql.end({ timeout: 2 });
  process.exit(1);
}
