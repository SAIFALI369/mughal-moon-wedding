import { MUSIC_LIBRARY } from "../../../supabase/functions/_shared/music";
export { MUSIC_LIBRARY };
export type MusicCommand = (typeof MUSIC_LIBRARY)[number]["id"] | "pause" | "play" | "next";
export const MUSIC_EVENT = "wedding:music-command";

export function isMusicCommand(value: string): value is MusicCommand {
  return ["pause", "play", "next", ...MUSIC_LIBRARY.map((t) => t.id)].includes(value);
}
export function sendMusicCommand(command: MusicCommand) {
  window.dispatchEvent(new CustomEvent(MUSIC_EVENT, { detail: command }));
}

// Model output is untrusted: whitelist IDs, never accept arbitrary URLs or code.
export function applyMusicReply(reply: string, question: string): string {
  const matches = [...reply.matchAll(/\[MUSIC:([^\]]+)\]/g)];
  const clean = reply.replace(/\[MUSIC:[^\]]*\]/g, "").trim();
  const command = matches[0]?.[1];
  const musicRequest =
    /\b(music|song|track|playlist|qawwali|qawaali|play|pause|mute)\b|गाना|संगीत|कव्वाली|गाने|موسیقی|گانا|قوالی|گانے/i.test(
      question,
    );
  if (matches.length === 1 && command && musicRequest && isMusicCommand(command)) {
    sendMusicCommand(command);
    return (
      clean ||
      "Music selection updated. Tap Play in the music panel if your browser blocks playback."
    );
  }
  return clean || "Ask me to play a track from the music panel.";
}

// Common commands remain instant/offline; Gemini handles other explicit music requests.
export function getInstantMusicReply(question: string, language: string): string | undefined {
  const q = question
    .trim()
    .toLocaleLowerCase()
    .replace(/[.!?؟]+$/, "");
  const actions: Record<string, MusicCommand> = {
    "play softer music": "moonlit-dua",
    "play sufi music": "sufi-breeze",
    "pause the music": "pause",
    "pause music": "pause",
    "stop music": "pause",
    "play music": "play",
    "resume music": "play",
    "next track": "next",
    "change the song": "next",
    "change music": "next",
    "संगीत बंद करें": "pause",
    "हल्का संगीत चलाएं": "moonlit-dua",
    "موسیقی بند کریں": "pause",
    "ہلکی موسیقی چلائیں": "moonlit-dua",
  };
  for (const track of MUSIC_LIBRARY) actions[`play ${track.title.toLocaleLowerCase()}`] = track.id;
  const action = actions[q];
  if (!action) return undefined;
  const note =
    language === "हिन्दी"
      ? "संगीत चयन अपडेट किया गया। अगर संगीत शुरू न हो तो म्यूज़िक पैनल में Play दबाएँ।"
      : language === "اردو"
        ? "موسیقی کا انتخاب بدل دیا گیا۔ اگر موسیقی شروع نہ ہو تو میوزک پینل میں Play دبائیں۔"
        : action === "pause"
          ? "Music paused for your visit."
          : "Music selection updated for your visit. If playback doesn't start, tap Play in the music panel.";
  return `${note} [MUSIC:${action}]`;
}
