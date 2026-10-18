# Wedding Background Music (`public/audio/`)

This folder holds the soothing **Balagal Ula Bi Kamalihi** (`بَلَغَ الْعُلَىٰ بِكَمَالِهِ`) audio played by the floating music button on the invitation.

- **Default included file**: `public/audio/balagal-ula-bi-kamalihi.wav` (soothing Sufi flute, rubab & tanpura rendition of _Balagal Ula Bi Kamalihi_).
- **How to use your own MP3 recording**:
  1. Upload your `.mp3` file into `public/audio/` (for example `public/audio/balagal-ula-bi-kamalihi.mp3`).
  2. In [`src/components/wedding/config.ts`](../../src/components/wedding/config.ts), set:
     ```ts
     export const CUSTOM_MUSIC_URL = "/audio/balagal-ula-bi-kamalihi.mp3";
     ```
