import defaultBride from "@/assets/bride.webp";
import defaultG1 from "@/assets/g1.webp";
import defaultG2 from "@/assets/g2.webp";
import defaultG3 from "@/assets/g3.webp";
import defaultG4 from "@/assets/g4.webp";
import defaultG5 from "@/assets/g5.webp";
import defaultG6 from "@/assets/g6.webp";
import defaultGroom from "@/assets/groom.webp";

/**
 * Bride & Groom Portrait Configuration
 *
 * How to use your own husband (Mohsin) & wife (Simran) photos:
 *
 * Option A — Upload into `public/photos/` in this repo:
 *   1. Upload your files to `public/photos/groom.jpg` and `public/photos/bride.jpg`.
 *   2. Set `GROOM_PHOTO_URL = "/photos/groom.jpg"` and `BRIDE_PHOTO_URL = "/photos/bride.jpg"` below.
 *
 * Option B — Replace the existing asset files directly:
 *   - Replace `src/assets/groom.jpg` and `src/assets/bride.jpg` with your own `.jpg` photos.
 *
 * Option C — Use a direct image link:
 *   - Paste any direct image URL into `GROOM_PHOTO_URL` and `BRIDE_PHOTO_URL` below.
 */
export const GROOM_PHOTO_URL = "";
export const BRIDE_PHOTO_URL = "";

export const GROOM_PHOTO = GROOM_PHOTO_URL.trim() || defaultGroom;
export const BRIDE_PHOTO = BRIDE_PHOTO_URL.trim() || defaultBride;

export const COUPLE_PROFILES = [
  {
    role: "groom" as const,
    name: "Mohsin",
    line: "The calm to her storm",
    img: GROOM_PHOTO,
  },
  {
    role: "bride" as const,
    name: "Simran",
    line: "The spark to his soul",
    img: BRIDE_PHOTO,
  },
];

/**
 * Optional custom URLs/paths for the "Moments of Us" gallery.
 * Leave an entry empty ("") to keep its default image.
 */
export const CUSTOM_GALLERY_URLS: string[] = [
  "", // Moment 1 (e.g. "/photos/g1.jpg")
  "", // Moment 2 (e.g. "/photos/g2.jpg")
  "", // Moment 3 (e.g. "/photos/g3.jpg")
  "", // Moment 4 (defaults to Groom portrait)
  "", // Moment 5 (e.g. "/photos/g4.jpg")
  "", // Moment 6 (e.g. "/photos/g5.jpg")
  "", // Moment 7 (defaults to Bride portrait)
  "", // Moment 8 (e.g. "/photos/g6.jpg")
];

const DEFAULT_GALLERY_META = [
  { src: defaultG1, caption: "Under the Mughal Arches", tag: "Together" },
  { src: defaultG2, caption: "Golden Hour Du’as", tag: "Celebration" },
  { src: defaultG3, caption: "A Promise Written in Stars", tag: "Engagement" },
  { src: GROOM_PHOTO, caption: "Mohsin — Groom Portrait", tag: "The Groom" },
  { src: defaultG4, caption: "Laughter & Lanterns", tag: "Moments" },
  { src: defaultG5, caption: "Royal Heritage & Grace", tag: "Tradition" },
  { src: BRIDE_PHOTO, caption: "Simran — Bride Portrait", tag: "The Bride" },
  { src: defaultG6, caption: "Beginning of Forever", tag: "Nikah 2026" },
];

export const GALLERY_ITEMS = DEFAULT_GALLERY_META.map((item, index) => ({
  ...item,
  src: CUSTOM_GALLERY_URLS[index]?.trim() || item.src,
}));

export const GALLERY_PHOTOS = GALLERY_ITEMS.map((item) => item.src);
