// Pure song rules shared by the form, the schema and the guest player.
// Kept free of Supabase imports so the server bundle and tests can use it safely.

export const SONG_BUCKET = "invitation-songs";
export const MAX_SONGS = 5;
export const MAX_SONG_BYTES = 10 * 1024 * 1024;

export type InvitationSong = {
  id: string;
  title: string;
  /** Storage object path: `<owner-user-id>/<uuid>.<ext>`. Never a URL. */
  path: string;
};

const SONG_EXTENSIONS: Record<string, { mime: string; accepted: string[] }> = {
  mp3: { mime: "audio/mpeg", accepted: ["audio/mpeg", "audio/mp3"] },
  m4a: { mime: "audio/mp4", accepted: ["audio/mp4", "audio/x-m4a", "audio/aac"] },
  wav: { mime: "audio/wav", accepted: ["audio/wav", "audio/x-wav", "audio/wave"] },
  ogg: { mime: "audio/ogg", accepted: ["audio/ogg"] },
};

/** MIME types the storage bucket accepts (kept in sync with the migration). */
export const SONG_MIME_TYPES = Object.values(SONG_EXTENSIONS).flatMap((entry) => [
  entry.mime,
  ...entry.accepted,
]);

export const songPathPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp3|m4a|wav|ogg)$/;

export function isSafeSongPath(value: unknown): value is string {
  return typeof value === "string" && songPathPattern.test(value);
}

function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
}

/** Returns a user-facing problem with the file, or null when it can be uploaded. */
export function songFileProblem(file: Pick<File, "name" | "size" | "type">): string | null {
  if (file.size === 0) return "This audio file is empty.";
  if (file.size > MAX_SONG_BYTES) return "Choose a song under 10 MB.";
  const ext = extensionOf(file.name);
  const known = SONG_EXTENSIONS[ext];
  if (!known) return "Choose an MP3, M4A, WAV or OGG audio file.";
  // Some systems leave the MIME type blank for M4A/OGG; trust the extension only then.
  if (file.type && !known.accepted.includes(file.type)) {
    return "Choose an MP3, M4A, WAV or OGG audio file.";
  }
  return null;
}

export function songExtension(name: string): string | null {
  const ext = extensionOf(name);
  return SONG_EXTENSIONS[ext] ? ext : null;
}

export function songContentType(ext: string): string {
  return SONG_EXTENSIONS[ext]?.mime ?? "application/octet-stream";
}

/** A readable default title such as "Rosewater" from "Rosewater.mp3". */
export function songTitleFromFileName(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Keeps only well-formed songs from stored JSON; anything else is ignored. */
export function normalizeSongs(value: unknown): InvitationSong[] {
  if (!Array.isArray(value)) return [];
  const songs: InvitationSong[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const path = typeof record.path === "string" ? record.path : "";
    if (!id || !title || title.length > 120 || !isSafeSongPath(path)) continue;
    songs.push({ id, title, path });
    if (songs.length === MAX_SONGS) break;
  }
  return songs;
}
