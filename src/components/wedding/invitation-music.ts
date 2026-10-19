import { MUSIC_LIBRARY } from "../../../supabase/functions/_shared/music";

/** Guests hear a short, curated soundtrack chosen by the host — never an open-ended player. */
export const INVITATION_SONG_LIMIT = 5;
export const INVITATION_MUSIC_EVENT = "invitation:music-command";

export type InvitationSong = { title: string; url: string };

export function getSongLabel(song: InvitationSong, index: number): string {
  return song.title.trim() || `Song ${index + 1}`;
}

/**
 * Card content is public data, so only play same-origin files or HTTPS audio.
 * Rejecting every other scheme keeps `javascript:`, `data:` and credentialed URLs out of <audio>.
 */
export function isSafeSongUrl(value: string): boolean {
  const input = value.trim();
  if (!input || input.length > 500) return false;
  if (/^\/(?!\/)/.test(input)) {
    return !input.includes("\\") && !/[\s"'<>]/.test(input);
  }
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password && !!url.hostname;
  } catch {
    return false;
  }
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
