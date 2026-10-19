// Supabase Storage access for invitation songs. The bucket is private: owners write into
// their own user-id folder, and guests get short-lived signed URLs only through the
// published-card policy in the database (see migration 0010).
import { supabase } from "@/lib/db";
import {
  SONG_BUCKET,
  isSafeSongPath,
  songContentType,
  songExtension,
  songFileProblem,
  songTitleFromFileName,
  type InvitationSong,
} from "./invitation-songs";

const SIGNED_URL_SECONDS = 60 * 60;

export async function uploadInvitationSong(file: File): Promise<InvitationSong> {
  const problem = songFileProblem(file);
  if (problem) throw new Error(problem);
  const ext = songExtension(file.name);
  if (!ext) throw new Error("Choose an MP3, M4A, WAV or OGG audio file.");

  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error("Sign in again to upload a song.");

  const id = crypto.randomUUID();
  const path = `${userId}/${id}.${ext}`;
  const { error } = await supabase.storage.from(SONG_BUCKET).upload(path, file, {
    contentType: songContentType(ext),
    upsert: false,
    cacheControl: "3600",
  });
  if (error) {
    throw new Error(
      /exceeded|too large|size/i.test(error.message)
        ? "Choose a song under 10 MB."
        : "The song could not be uploaded. Please try again.",
    );
  }
  return { id, title: songTitleFromFileName(file.name) || "Untitled song", path };
}

/** Deletes objects the owner no longer references. Invalid paths are ignored, never sent. */
export async function removeInvitationSongs(paths: string[]): Promise<void> {
  const safe = [...new Set(paths)].filter(isSafeSongPath);
  if (safe.length === 0) return;
  const { error } = await supabase.storage.from(SONG_BUCKET).remove(safe);
  if (error) console.error("Could not remove invitation songs", error.message);
}

/** A signed URL that works for the owner, or for guests while the card is published. */
export async function songPlaybackUrl(path: string): Promise<string> {
  if (!isSafeSongPath(path)) throw new Error("This song is unavailable.");
  const { data, error } = await supabase.storage
    .from(SONG_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) throw new Error("This song is unavailable right now.");
  return data.signedUrl;
}

/**
 * Tracks files uploaded while an editor is open. Those files are deleted if the editor
 * closes without saving, and any unsaved removals are cleaned up after a successful save.
 */
export class SongUploadSession {
  private readonly uploaded = new Set<string>();

  track(path: string) {
    this.uploaded.add(path);
  }

  /** After a successful save: delete every song that is no longer referenced. */
  async settle(keptPaths: string[], previousPaths: string[] = []): Promise<void> {
    const kept = new Set(keptPaths);
    const stale = [...previousPaths, ...this.uploaded].filter((path) => !kept.has(path));
    this.uploaded.clear();
    await removeInvitationSongs(stale);
  }

  /** The editor was cancelled or the card was switched: nothing uploaded here is kept. */
  async discard(): Promise<void> {
    const all = [...this.uploaded];
    this.uploaded.clear();
    await removeInvitationSongs(all);
  }
}
