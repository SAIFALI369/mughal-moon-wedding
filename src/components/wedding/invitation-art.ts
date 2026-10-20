import eidSky from "@/assets/eid-sky.webp";
import aladin from "@/assets/themes/aladin.webp";
import bihariVibe from "@/assets/themes/bihari-vibe.webp";
import meccaMadinah from "@/assets/themes/mecca-madinah.webp";
import luxury from "@/assets/themes/luxury.webp";
import futuristic from "@/assets/themes/futuristic.webp";
import fairytale from "@/assets/themes/fairytale.webp";
import ballroom from "@/assets/themes/ballroom.webp";
import diyaUtsav from "@/assets/themes/diya-utsav.webp";
import sacredMandap from "@/assets/themes/sacred-mandap.webp";
import riadNoor from "@/assets/themes/riad-noor.webp";
import kashiGhat from "@/assets/themes/kashi-ghat.webp";
import mehndiNight from "@/assets/themes/mehndi-night.webp";
import jharokhaDawn from "@/assets/themes/jharokha-dawn.webp";
import haldiBaag from "@/assets/themes/haldi-baag.webp";
import vowsInInk from "@/assets/themes/vows-in-ink.webp";
import type { InvitationTheme } from "./invitation-options";

export const invitationArt: Record<InvitationTheme, string> = {
  eid: eidSky,
  mughal: eidSky,
  classic: eidSky,
  aladin,
  "bihari-vibe": bihariVibe,
  mecca_madinah: meccaMadinah,
  luxury,
  futuristic,
  fairytale,
  ballroom,
  "diya-utsav": diyaUtsav,
  "sacred-mandap": sacredMandap,
  "riad-noor": riadNoor,
  "kashi-ghat": kashiGhat,
  "mehndi-night": mehndiNight,
  "jharokha-dawn": jharokhaDawn,
  "haldi-baag": haldiBaag,
  "vows-in-ink": vowsInInk,
};
