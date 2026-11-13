import royalRajmahal from "@/assets/themes/royal-rajmahal.webp";
import lotusGoddess from "@/assets/themes/lotus-goddess.webp";
import calligraphy from "@/assets/themes/calligraphy.webp";
import eidSky from "@/assets/eid-sky.webp";
import noorCover from "@/assets/noor-arch-cover.jpg.asset.json";
import noorFinal from "@/assets/noor-arch-final.jpg.asset.json";
import noorGateVideo from "@/assets/noor-arch-gate.mp4.asset.json";
import aladin from "@/assets/themes/aladin.webp";
import aladinPoster from "@/assets/aladin-poster.jpg.asset.json";
import aladinVideo from "@/assets/aladin-silent.mp4.asset.json";
import haldiBaagVideo from "@/assets/haldi-baag-cinema.mp4.asset.json";
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
  aladin: aladinPoster.url,
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
  // Eid hero/cards loop the calm moonlit scene; the door-opening film plays once, only at the gate.
  if (theme === "eid") return "/film/eid.mp4";
  if (theme === "sacred-mandap") return sacredMandapVideo.url;
  if (theme === "aladin") return aladinVideo.url;
  if (theme === "haldi-baag") return haldiBaagVideo.url;
  return `/film/${theme}.mp4`;
}

/**
 * Optional follow-up hero video played 2–3 seconds after the opening card
 * video finishes and the text pops up. Leave empty to stay stopped on the
 * final frame of the opening video until the full 15 MB video is provided.
 */
export const heroFollowUpVideo: Partial<Record<InvitationTheme, string>> = {};

export function heroVideoForTheme(theme: InvitationTheme): string | null {
  return heroFollowUpVideo[theme] ?? null;
}

/** First card picture for any theme — always the opening video's frame 0. */
export function openingCoverForTheme(theme: InvitationTheme): string {
  if (theme === "eid") return noorCover.url;
  return invitationArt[theme];
}

/** Stopped background frame held after the opening video finishes. */
export function openingStillForTheme(theme: InvitationTheme): string {
  if (theme === "eid") return noorFinal.url;
  return invitationArt[theme];
}

/** Opening video source per theme. Eid plays the full door-opening cut; loop clips play a zoomed opener. */
export function openingVideoForTheme(theme: InvitationTheme): {
  src: string;
  fallback: string;
  finiteOpening: boolean;
} {
  if (theme === "eid") {
    return { src: noorGateVideo.url, fallback: "/film/eid.mp4", finiteOpening: true };
  }
  const url = themeLoop(theme);
  return { src: url, fallback: `/film/${theme}.mp4`, finiteOpening: false };
}

export const invitationArtFallback: Partial<Record<InvitationTheme, string>> = {
  eid: eidSky,
  "sacred-mandap": sacredMandap,
  aladin,
};

export const invitationFilmArt = {
  palace: filmPalace,
  arch: filmArch,
  courtyard: filmCourtyard,
} as const;
