import eidSky from "@/assets/eid-sky.webp";
import aladin from "@/assets/themes/aladin.webp";
import bihariVibe from "@/assets/themes/bihari-vibe.webp";
import meccaMadinah from "@/assets/themes/mecca-madinah.webp";
import luxury from "@/assets/themes/luxury.webp";
import futuristic from "@/assets/themes/futuristic.webp";
import fairytale from "@/assets/themes/fairytale.webp";
import ballroom from "@/assets/themes/ballroom.webp";
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
};
