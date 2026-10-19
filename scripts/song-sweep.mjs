// Storage sweep for invitation song files. Pure helpers plus a small Storage API client, so the
// rules can be tested without a database or network. Used by scripts/cleanup-expired.mjs.
//
// Rule: a song file is removed only when no card references it AND it is at least a day old.
// The age guard protects a host who has uploaded a song but not yet saved the card.

export const SONG_BUCKET = "invitation-songs";
export const SONG_SWEEP_MIN_AGE_MS = 24 * 60 * 60 * 1000;
// Must match songPathPattern in src/components/wedding/invitation-songs.ts (checked by a test).
export const songPathPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp3|m4a|wav|ogg)$/;

/**
 * @param {Array<{path: string, createdAt: string | number | Date | null}>} objects
 * @param {Iterable<string>} referencedPaths paths still listed in any card's content.songs
 * @param {number} nowMs
 * @param {number} minAgeMs
 * @returns {string[]} paths that are safe to delete
 */
export function findOrphanSongObjects(
  objects,
  referencedPaths,
  nowMs,
  minAgeMs = SONG_SWEEP_MIN_AGE_MS,
) {
  const referenced = new Set(referencedPaths);
  const orphans = [];
  for (const object of objects) {
    if (!songPathPattern.test(object.path)) continue; // never touch anything we did not create
    if (referenced.has(object.path)) continue;
    const created = object.createdAt ? new Date(object.createdAt).getTime() : Number.NaN;
    // Unknown age counts as too new: keep the file rather than risk an unsaved upload.
    if (!Number.isFinite(created) || nowMs - created < minAgeMs) continue;
    orphans.push(object.path);
  }
  return orphans;
}

/**
 * Lists every file in the bucket. `storage.post(path, body)` must return the parsed JSON of the
 * Storage API. Top-level folders are the owners' user-id folders; files have a non-null id.
 */
export async function listSongObjects(storage, pageSize = 1000) {
  const objects = [];
  async function listFolder(prefix) {
    for (let offset = 0; ; offset += pageSize) {
      const items = await storage.post(`object/list/${SONG_BUCKET}`, {
        prefix,
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (!Array.isArray(items)) throw new Error("Unexpected storage listing response");
      for (const item of items) {
        const name = typeof item?.name === "string" ? item.name : "";
        const path = prefix ? `${prefix}/${name}` : name;
        if (item.id === null || item.id === undefined) {
          if (!prefix && name) await listFolder(name); // a user's folder
        } else {
          objects.push({ path, createdAt: item.created_at ?? null });
        }
      }
      if (items.length < pageSize) break;
    }
  }
  await listFolder("");
  return objects;
}

/** Deletes paths in batches through the Storage API. Returns how many were requested. */
export async function deleteSongObjects(storage, paths, batchSize = 100) {
  for (let start = 0; start < paths.length; start += batchSize) {
    const prefixes = paths.slice(start, start + batchSize);
    await storage.remove(`object/${SONG_BUCKET}`, { prefixes });
  }
  return paths.length;
}
