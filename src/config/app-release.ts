/**
 * The Offline Studio release the site is currently shipping.
 *
 * One place for the version, the date and "what's new", so the landing page,
 * `/download`, the launcher file and the service worker can never disagree.
 * Bump this when the offline app changes — `public/sw.js` carries the same
 * numbers (`APP_VERSION`, `CACHE_NAME`), and a test keeps the two in step.
 */

export const OFFLINE_APP_VERSION = "3.0";
export const OFFLINE_APP_CACHE_NAME = "invitingyou-offline-v6";
export const OFFLINE_APP_RELEASED_ON = "28 October 2026";
export const OFFLINE_APP_SIZE_LABEL = "≈ 9 MB cached (22 themes, posters, studio)";

export type ReleaseHighlight = {
  title: string;
  detail: string;
};

export const OFFLINE_APP_HIGHLIGHTS: ReleaseHighlight[] = [
  {
    title: "Opens with no internet at all",
    detail:
      "The app now downloads its own pages, scripts and styles when you install or update it — not only the page you happened to open. Flight mode, dead Wi-Fi and a dropped hotspot all still open the studio.",
  },
  {
    title: "No more white screen",
    detail:
      "If a page really cannot be reached, you get a proper offline screen with your studio one tap away instead of an empty tab.",
  },
  {
    title: "Every theme, thumbnailed",
    detail:
      "All 22 themes ship as small posters inside the app, so the theme picker is instant on a shop counter laptop.",
  },
  {
    title: "One film at a time",
    detail:
      "The studio only decodes the theme you are looking at, so scrolling a full card preview no longer stutters.",
  },
  {
    title: "Tell when you're offline",
    detail:
      "A quiet banner says what still works and what needs a connection, so nobody saves a draft into a dead publish.",
  },
];

export const OFFLINE_APP_RELEASE = {
  version: OFFLINE_APP_VERSION,
  cacheName: OFFLINE_APP_CACHE_NAME,
  releasedOn: OFFLINE_APP_RELEASED_ON,
  sizeLabel: OFFLINE_APP_SIZE_LABEL,
  highlights: OFFLINE_APP_HIGHLIGHTS,
} as const;
