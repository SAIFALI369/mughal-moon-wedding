import royalRajmahal from "@/assets/themes/royal-rajmahal.webp";
import lotusGoddess from "@/assets/themes/lotus-goddess.webp";
import calligraphy from "@/assets/themes/calligraphy.webp";
import eidSky from "@/assets/eid-sky.webp";
import noorFinal from "@/assets/noor-arch-final.jpg.asset.json";
import noorGateVideo from "@/assets/noor-arch-gate.mp4.asset.json";
import aladin from "@/assets/themes/aladin.webp";
import bihariVibe from "@/assets/themes/bihari-vibe.webp";
import meccaMadinah from "@/assets/themes/mecca-madinah.webp";
import luxury from "@/assets/themes/luxury.webp";
import futuristic from "@/assets/themes/futuristic.webp";
import fairytale from "@/assets/themes/fairytale.webp";
import ballroom from "@/assets/themes/ballroom.webp";
import diyaUtsav from "@/assets/themes/diya-utsav.webp";
import sacredMandap from "@/assets/themes/sacred-mandap.webp";
import sacredMandapPoster from "@/assets/sacred-mandap-poster.jpg.asset.json";
import sacredMandapVideo from "@/assets/sacred-mandap-silent.mp4.asset.json";
import riadNoor from "@/assets/themes/riad-noor.webp";
import kashiGhat from "@/assets/themes/kashi-ghat.webp";
import mehndiNight from "@/assets/themes/mehndi-night.webp";
import jharokhaDawn from "@/assets/themes/jharokha-dawn.webp";
import haldiBaag from "@/assets/themes/haldi-baag.webp";
import vowsInInk from "@/assets/themes/vows-in-ink.webp";
import chandBagh from "@/assets/themes/chand-bagh.webp";
import melaMaidan from "@/assets/themes/mela-maidan.webp";
import filmPalace from "@/assets/themes/film-palace.webp";
import filmArch from "@/assets/themes/film-arch.webp";
import filmCourtyard from "@/assets/themes/film-courtyard.webp";
import type { InvitationTheme } from "./invitation-options";

export const invitationArt: Record<InvitationTheme, string> = {
  "royal-rajmahal": royalRajmahal,
  "lotus-goddess": lotusGoddess,
  calligraphy,
  eid: noorFinal.url,
  aladin,
  "bihari-vibe": bihariVibe,
  mecca_madinah: meccaMadinah,
  luxury,
  futuristic,
  fairytale,
  ballroom,
  "diya-utsav": diyaUtsav,
  "sacred-mandap": sacredMandapPoster.url,
  "riad-noor": riadNoor,
  "kashi-ghat": kashiGhat,
  "mehndi-night": mehndiNight,
  "jharokha-dawn": jharokhaDawn,
  "haldi-baag": haldiBaag,
  "vows-in-ink": vowsInInk,
  "chand-bagh": chandBagh,
  "mela-maidan": melaMaidan,
  "mughal-moon-film": filmPalace,
};

/**
 * The three camera shots of "Mughal Moon — The Film". They are the theme's own
 * artwork, so the opening film, the scroll-scrubbed stage and the act strip all
 * use the same pictures and ship with the card.
 */
/**
 * Every theme ships a real hero film beside its illustration: eight silent
 * seconds of the same scene, built by `scripts/build-theme-loops.mjs`.
 */
export function themeLoop(theme: InvitationTheme): string {
  if (theme === "eid") return noorGateVideo.url;
  if (theme === "sacred-mandap") return sacredMandapVideo.url;
  return `/film/${theme}.mp4`;
}

export const invitationArtFallback: Partial<Record<InvitationTheme, string>> = {
  eid: eidSky,
  "sacred-mandap": sacredMandap,
};

export const invitationFilmArt = {
  palace: filmPalace,
  arch: filmArch,
  courtyard: filmCourtyard,
} as const;
