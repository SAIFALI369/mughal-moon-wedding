import { MUSIC_LIBRARY } from "../../../supabase/functions/_shared/music";

/** Guests hear a short, curated soundtrack chosen by the host — never an open-ended player. */
export const INVITATION_SONG_LIMIT = 5;
export const INVITATION_MUSIC_EVENT = "invitation:music-command";

export type InvitationSong = { title: string; url: string };

export type SongSource =
  | { kind: "audio"; src: string }
  | { kind: "youtube"; videoId: string; embedUrl: string; watchUrl: string }
  | {
      kind: "spotify";
      itemType: "track" | "playlist" | "album" | "episode";
      itemId: string;
      embedUrl: string;
      openUrl: string;
    };

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const SPOTIFY_HOSTS = new Set([
  "open.spotify.com",
  "play.spotify.com",
  "spotify.com",
  "www.spotify.com",
]);

function extractYouTubeVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);
  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = segments[0] ?? null;
  } else if (segments[0] === "watch") {
    candidate = url.searchParams.get("v");
  } else if (
    segments[0] === "shorts" ||
    segments[0] === "embed" ||
    segments[0] === "live" ||
    segments[0] === "v"
  ) {
    candidate = segments[1] ?? null;
  } else if (url.searchParams.get("v")) {
    candidate = url.searchParams.get("v");
  }

  return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

/**
 * Resolves a host-supplied soundtrack URL into a safe playback source:
 * - Built-in same-origin `/audio/...` files
 * - YouTube watch / share / Shorts / YouTube Music links
 * - Spotify track / playlist / album / episode share links (or `spotify:track:...` URIs)
 * - Direct `https://` audio stream links
 */
export function resolveSongSource(value: string): SongSource | null {
  const input = value.trim();
  if (!input || input.length > 500) return null;

  if (/^\/(?!\/)/.test(input)) {
    if (input.includes("\\") || /[\s"'<>]/.test(input)) return null;
    return { kind: "audio", src: input };
  }

  const spotifyUri = /^spotify:(track|playlist|album|episode):([A-Za-z0-9]+)$/i.exec(input);
  if (spotifyUri) {
    const itemType = spotifyUri[1].toLowerCase() as "track" | "playlist" | "album" | "episode";
    const itemId = spotifyUri[2];
    return {
      kind: "spotify",
      itemType,
      itemId,
      embedUrl: `https://open.spotify.com/embed/${itemType}/${itemId}?utm_source=generator&theme=0`,
      openUrl: `https://open.spotify.com/${itemType}/${itemId}`,
    };
  }

  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) {
      return null;
    }
    const host = url.hostname.toLowerCase();

    if (YOUTUBE_HOSTS.has(host)) {
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) return null;
      return {
        kind: "youtube",
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&playsinline=1&rel=0`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    }

    if (SPOTIFY_HOSTS.has(host)) {
      const match =
        /^(?:\/intl-[a-z0-9-]+)?\/(?:embed\/)?(track|playlist|album|episode)\/([A-Za-z0-9]+)\/?$/i.exec(
          url.pathname,
        );
      if (!match) return null;
      const itemType = match[1].toLowerCase() as "track" | "playlist" | "album" | "episode";
      const itemId = match[2];
      return {
        kind: "spotify",
        itemType,
        itemId,
        embedUrl: `https://open.spotify.com/embed/${itemType}/${itemId}?utm_source=generator&theme=0`,
        openUrl: `https://open.spotify.com/${itemType}/${itemId}`,
      };
    }

    return { kind: "audio", src: url.toString() };
  } catch {
    return null;
  }
}

export function getSongLabel(song: InvitationSong, index: number): string {
  return song.title.trim() || `Song ${index + 1}`;
}

/**
 * Card content is public data, so only play same-origin files, verified YouTube/Spotify embeds,
 * or HTTPS audio. Rejecting every other scheme keeps `javascript:`, `data:` and credentialed URLs out.
 */
export function isSafeSongUrl(value: string): boolean {
  return resolveSongSource(value) !== null;
}

/** Lenient reader for older cards and hand-edited content. */
export function sanitizeInvitationSongs(value: unknown): InvitationSong[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      title: typeof item.title === "string" ? item.title.trim().slice(0, 80) : "",
      url: typeof item.url === "string" ? item.url.trim() : "",
    }))
    .filter((song) => song.title.length > 0 && isSafeSongUrl(song.url))
    .slice(0, INVITATION_SONG_LIMIT);
}

/** Quick-adds use the six licensed local instrumentals already shipped with the app. */
export const suggestedInvitationSongs: InvitationSong[] = MUSIC_LIBRARY.map(({ title, url }) => ({
  title,
  url,
}));

export type InvitationMusicCommand =
  { action: "play"; index?: number } | { action: "pause" } | { action: "next" };

export function sendInvitationMusicCommand(command: InvitationMusicCommand) {
  window.dispatchEvent(new CustomEvent(INVITATION_MUSIC_EVENT, { detail: command }));
}

function isMusicQuestion(question: string): boolean {
  return /\b(music|song|songs|track|playlist|play|pause|next)\b|गाना|गाने|संगीत|موسیقی|گانا|گانے/i.test(
    question,
  );
}

/**
 * The model can ask the guest's player to change track, but only with a bounded marker.
 * A reply without a single valid marker is returned untouched.
 */
export function applyPersonalMusicReply(
  reply: string,
  question: string,
  songCount: number,
): string {
  const clean = reply.replace(/\[MUSIC:[^\]]*\]/g, "").trim();
  if (!isMusicQuestion(question) || songCount === 0) return clean || reply;
  const marker = /\[MUSIC:([^\]]+)\]/.exec(reply)?.[1]?.trim().toLowerCase();
  if (!marker) return clean;
  if (marker === "pause") sendInvitationMusicCommand({ action: "pause" });
  else if (marker === "next") sendInvitationMusicCommand({ action: "next" });
  else if (marker === "play") sendInvitationMusicCommand({ action: "play" });
  else if (/^\d$/.test(marker)) {
    const index = Number(marker) - 1;
    if (index >= 0 && index < songCount) {
      sendInvitationMusicCommand({ action: "play", index });
    }
  }
  return clean || "The soundtrack has been updated for your visit.";
}

/** Instant, offline music answers so the host's assistant still feels alive without an API key. */
export function getInstantPersonalMusicReply(
  question: string,
  songs: InvitationSong[],
  language: string,
): string | undefined {
  if (!songs.length) return undefined;
  const q = question
    .trim()
    .toLocaleLowerCase()
    .replace(/[.!?]+$/, "");
  const findSong = () =>
    songs.findIndex(
      (song, index) => q.includes(song.title.toLocaleLowerCase()) || q === `play song ${index + 1}`,
    );
  const pause =
    /^(pause|stop|pause the music|stop the music|pause music|stop music)$/i.test(q) ||
    /संगीत बंद|موسیقی بند/.test(question);
  const play = /^(play|play music|resume music|start the music|start music)$/i.test(q);
  const next = /^(next|next song|next track|change the song|change music|skip)$/i.test(q);
  const requested = findSong();
  if (!pause && !play && !next && requested === -1) {
    if (!isMusicQuestion(question)) return undefined;
    return language === "हिन्दी"
      ? `इस निमंत्रण की प्लेलिस्ट: ${songs.map((song, index) => `${index + 1}. ${song.title}`).join(", ")}। संगीत पैनल से कोई गाना चुनें।`
      : language === "اردو"
        ? `اس دعوت نامے کی فہرست: ${songs.map((song, index) => `${index + 1}. ${song.title}`).join("، ")}۔ میوزک پینل سے کوئی گانا منتخب کریں۔`
        : `This invitation's soundtrack: ${songs.map((song, index) => `${index + 1}. ${song.title}`).join(", ")}. Open the music panel to play one.`;
  }
  if (requested !== -1) {
    sendInvitationMusicCommand({ action: "play", index: requested });
  } else if (pause) {
    sendInvitationMusicCommand({ action: "pause" });
  } else if (next) {
    sendInvitationMusicCommand({ action: "next" });
  } else if (play) {
    sendInvitationMusicCommand({ action: "play" });
  }
  return language === "हिन्दी"
    ? "संगीत चयन अपडेट किया गया। अगर संगीत शुरू न हो तो प्लेलिस्ट में Play दबाएँ।"
    : language === "اردو"
      ? "موسیقی کا انتخاب بدل دیا گیا۔ اگر موسیقی شروع نہ ہو تو پلے لسٹ میں Play دبائیں۔"
      : "Soundtrack updated for your visit. If your browser blocks playback, tap Play in the music panel.";
}
