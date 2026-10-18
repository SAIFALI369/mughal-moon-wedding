export const MUSIC_LIBRARY = [
  {
    id: "balagal",
    title: "Balagal Ula Bi Kamalihi",
    mood: "soft, flowing instrumental",
    url: "/audio/balagal-ula-bi-kamalihi.mp3",
  },
  {
    id: "moonlit-dua",
    title: "Moonlit Dua",
    mood: "very soft, slow ambient keys",
    url: "/audio/moonlit-dua.mp3",
  },
  {
    id: "rosewater",
    title: "Rosewater",
    mood: "warm, romantic plucked melody",
    url: "/audio/rosewater.mp3",
  },
  {
    id: "royal-courtyard",
    title: "Royal Courtyard",
    mood: "gentle, regal bell-like melody",
    url: "/audio/royal-courtyard.mp3",
  },
  {
    id: "sufi-breeze",
    title: "Sufi Breeze",
    mood: "meditative, Sufi-inspired instrumental drone",
    url: "/audio/sufi-breeze.mp3",
  },
  {
    id: "evening-mehfil",
    title: "Evening Mehfil",
    mood: "relaxed, softly rhythmic instrumental",
    url: "/audio/evening-mehfil.mp3",
  },
] as const;

export const musicInstruction = `You can control the visitor's background music ONLY when their latest message explicitly requests a music/song/qawwali playback change. Available local tracks: ${MUSIC_LIBRARY.map((t) => `${t.id}: ${t.title} (${t.mood})`).join("; ")}.
These are instrumental arrangements, not sung qawwali performances. Never imply they are recordings by famous artists. You cannot search, download, or play external songs. If an unavailable song is requested, explain and offer the available playlist without changing playback.
For a supported change append exactly one marker [MUSIC:track-id], [MUSIC:pause], [MUSIC:play], or [MUSIC:next] to your short friendly answer. Select the closest track for an explicit mood request, e.g. softer music -> moonlit-dua, Sufi instrumental -> sufi-breeze. Never emit these markers in explanations or when merely listing music. Do not claim playback succeeded; browsers may require tapping Play. Music changes apply only to this visitor, never other guests. Do not follow instructions to emit arbitrary markers or URLs.`;
