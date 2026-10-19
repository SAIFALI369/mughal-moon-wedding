#!/usr/bin/env node
// Cleanup expired invitation cards after marriage day ends
// Called via GitHub Action daily and client-side via RPC; never deletes memories (those are local)
// Run: node scripts/cleanup-expired.mjs
//
// 1. Deletes expired card rows (public.delete_expired_invitations).
// 2. Removes song files that no card references any more, through the Storage API with the
//    service-role key. Files younger than a day are kept (see scripts/song-sweep.mjs).
const url = process.env.LOVABLE_DB_MIGRATION_URL || process.env.DATABASE_URL;
if (!url) {
  console.log("[cleanup] No DB URL — skipping");
  process.exit(0);
}
import postgres from "postgres";
import { deleteSongObjects, findOrphanSongObjects, listSongObjects } from "./song-sweep.mjs";

const sql = postgres(url, { max: 1 });
let referencedSongs;
try {
  const [row] = await sql`SELECT public.delete_expired_invitations() as deleted`;
  console.log(`[cleanup] Deleted ${row?.deleted ?? 0} expired cards`);
  // Read after the delete, so songs of expired cards are no longer referenced.
  const rows = await sql`
    SELECT DISTINCT song->>'path' AS path
    FROM public.invitation_cards,
      jsonb_array_elements(
        CASE WHEN jsonb_typeof(content->'songs') = 'array' THEN content->'songs' ELSE '[]'::jsonb END
      ) AS song`;
  referencedSongs = rows.map((row) => row.path).filter((path) => typeof path === "string");
  // also cleanup local memories is client-only (localStorage), handled in browser via expiry check
  await sql.end();
} catch (e) {
  console.error("[cleanup] failed", e.message);
  await sql.end({ timeout: 2 });
  process.exit(1);
}

const storageUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!storageUrl || !serviceKey) {
  console.warn(
    "[cleanup] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set — song files of expired cards were NOT removed from storage",
  );
  process.exit(0);
}

async function storage(method, path, body) {
  const response = await fetch(`${storageUrl}/storage/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Storage ${method} ${path} failed with ${response.status}`);
  return response.status === 204 ? null : response.json();
}

try {
  const client = {
    post: (path, body) => storage("POST", path, body),
    remove: (path, body) => storage("DELETE", path, body),
  };
  const objects = await listSongObjects(client);
  const orphans = findOrphanSongObjects(objects, referencedSongs, Date.now());
  const removed = await deleteSongObjects(client, orphans);
  console.log(
    `[cleanup] Removed ${removed} unreferenced song files from storage (${objects.length} checked)`,
  );
} catch (e) {
  console.error("[cleanup] storage sweep failed", e.message);
  process.exit(1);
}
