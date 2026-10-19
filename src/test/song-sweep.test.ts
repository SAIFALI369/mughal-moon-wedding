// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SONG_SWEEP_MIN_AGE_MS,
  deleteSongObjects,
  findOrphanSongObjects,
  listSongObjects,
  songPathPattern as sweepPattern,
} from "../../scripts/song-sweep.mjs";
import { songPathPattern as appPattern } from "@/components/wedding/invitation-songs";

const owner = "11111111-2222-4333-8444-555555555555";
const other = "99999999-2222-4333-8444-555555555555";
const now = Date.parse("2026-10-19T12:00:00Z");
const old = new Date(now - 3 * SONG_SWEEP_MIN_AGE_MS).toISOString();
const fresh = new Date(now - 60 * 60 * 1000).toISOString();
const file = (folder: string, n: number, ext = "mp3") =>
  `${folder}/${n.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000.${ext}`;

describe("song sweep rules", () => {
  it("removes old files that no card references", () => {
    const kept = file(owner, 1);
    const orphan = file(owner, 2);
    const objects = [
      { path: kept, createdAt: old },
      { path: orphan, createdAt: old },
    ];
    expect(findOrphanSongObjects(objects, [kept], now)).toEqual([orphan]);
  });

  it("keeps files younger than a day, so an unsaved upload survives", () => {
    const objects = [{ path: file(owner, 3), createdAt: fresh }];
    expect(findOrphanSongObjects(objects, [], now)).toEqual([]);
  });

  it("keeps files whose age is unknown", () => {
    const objects = [
      { path: file(owner, 4), createdAt: null },
      { path: file(owner, 5), createdAt: "not a date" },
    ];
    expect(findOrphanSongObjects(objects, [], now)).toEqual([]);
  });

  it("never touches a path that is not a song file the app could have written", () => {
    const objects = [
      { path: `${owner}/cover.jpg`, createdAt: old },
      { path: `${owner}/../${file(owner, 6)}`, createdAt: old },
      { path: `${owner}/${file(owner, 7).split("/")[1]}`.replace(".mp3", ".exe"), createdAt: old },
      { path: file(owner, 8), createdAt: old },
    ];
    expect(findOrphanSongObjects(objects, [], now)).toEqual([file(owner, 8)]);
  });

  it("uses the same song path shape as the app", () => {
    expect(sweepPattern.source).toBe(appPattern.source);
  });

  it("does not remove a song that another card still uses", () => {
    const shared = file(other, 9, "wav");
    expect(
      findOrphanSongObjects([{ path: shared, createdAt: old }], new Set([shared]), now),
    ).toEqual([]);
  });
});

describe("song storage client", () => {
  function fakeStorage(
    folders: Record<string, Array<{ name: string; id: string | null; created_at?: string }>>,
  ) {
    const calls: Array<{ path: string; body: unknown }> = [];
    return {
      calls,
      post: async (path: string, body: { prefix: string; offset: number; limit: number }) => {
        calls.push({ path, body });
        const items = body.prefix === "" ? (folders[""] ?? []) : (folders[body.prefix] ?? []);
        return items.slice(body.offset, body.offset + body.limit);
      },
      remove: async (path: string, body: { prefixes: string[] }) => {
        calls.push({ path, body });
        return null;
      },
    };
  }

  it("lists files inside every owner folder, across pages", async () => {
    const storage = fakeStorage({
      "": [
        { name: owner, id: null },
        { name: other, id: null },
      ],
      [owner]: [
        { name: `${file(owner, 10).split("/")[1]}`, id: "a", created_at: old },
        { name: `${file(owner, 11).split("/")[1]}`, id: "b", created_at: old },
        { name: `${file(owner, 12).split("/")[1]}`, id: "c", created_at: old },
      ],
      [other]: [{ name: file(other, 13).split("/")[1], id: "d", created_at: old }],
    });
    const objects = await listSongObjects(storage, 2);
    expect(objects.map((object) => object.path).sort()).toEqual(
      [file(owner, 10), file(owner, 11), file(owner, 12), file(other, 13)].sort(),
    );
    expect(storage.calls.every((call) => call.path === "object/list/invitation-songs")).toBe(true);
  });

  it("deletes orphans in batches through the Storage API", async () => {
    const storage = fakeStorage({});
    const paths = Array.from({ length: 250 }, (_, i) => file(owner, 100 + i));
    expect(await deleteSongObjects(storage, paths)).toBe(250);
    const batches = storage.calls.map(
      (call) => (call.body as { prefixes: string[] }).prefixes.length,
    );
    expect(batches).toEqual([100, 100, 50]);
    expect(storage.calls.every((call) => call.path === "object/invitation-songs")).toBe(true);
  });
});

describe("cleanup wiring", () => {
  it("runs the storage sweep after the database delete, with the service role from secrets only", () => {
    const script = readFileSync("scripts/cleanup-expired.mjs", "utf8");
    const deleteAt = script.indexOf("delete_expired_invitations");
    const sweepAt = script.indexOf("listSongObjects(client)");
    expect(deleteAt).toBeGreaterThan(-1);
    expect(sweepAt).toBeGreaterThan(deleteAt);
    expect(script).toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
    expect(script).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/); // no hard-coded JWT
    expect(script).not.toMatch(/VITE_/);
  });

  it("checks that the song bucket is private in the migration workflow", () => {
    const workflow = readFileSync(".github/workflows/migrate.yml", "utf8");
    expect(workflow).toContain("storage.buckets where id='invitation-songs' and public = false");
    expect(workflow).toContain(
      "SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}",
    );
  });
});
