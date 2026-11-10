import noorCover from "@/assets/noor-arch-cover.jpg.asset.json";
import {
  getInvitationDetails,
  type InvitationDetails,
} from "@/components/wedding/invitation-details";
import { invitationThemes, type InvitationTheme } from "@/components/wedding/invitation-options";
import { envSiteOrigin, isLovableHost, normalizeOrigin } from "@/lib/site-origin";

export type SocialImage = {
  url: string;
  width?: number;
  height?: number;
  type: "image/jpeg";
};

export function sanitizeGuestParam(raw?: string | null): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * Formats an event/ceremony label naturally for link previews.
 * e.g. "Nikah ceremony" -> "Nikah Ceremony", "Shubh Vivah" -> "Shubh Vivah".
 */
export function formatCeremonyLabel(eventType?: string): string {
  const clean = (eventType ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "Wedding Ceremony";
  return clean.replace(/\b([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

/**
 * Resolves the absolute JPEG entrance-door image URL for a given theme.
 *
 * WhatsApp and Instagram crawlers require absolute HTTPS JPEG/PNG URLs and
 * frequently ignore WebP or relative paths.
 */
export function themeOgImage(theme: InvitationTheme, originInput?: string): SocialImage {
  const origin = normalizeOrigin(originInput || envSiteOrigin());
  if (theme === "eid") {
    return {
      url: isLovableHost(origin) ? `${origin}${noorCover.url}` : `${origin}/og/eid-door.jpg`,
      type: "image/jpeg",
    };
  }
  return {
    url: `${origin}/og/themes/${theme}.jpg`,
    width: 1200,
    height: 630,
    type: "image/jpeg",
  };
}

function themeDisplayName(theme: InvitationTheme): string {
  return invitationThemes.find((entry) => entry.id === theme)?.label ?? "Wedding";
}

export function buildInvitationSocialMeta({
  details,
  path,
  guest,
  origin,
  robots = "index, follow",
  imageAltPrefix,
}: {
  details: InvitationDetails;
  path: string;
  guest?: string;
  origin?: string;
  robots?: string;
  imageAltPrefix?: string;
}) {
  const baseOrigin = normalizeOrigin(origin || envSiteOrigin());
  const cleanGuest = sanitizeGuestParam(guest);
  const ceremony = formatCeremonyLabel(details.eventType);
  const couple = `${details.groomName} & ${details.brideName}`;
  const themeLabel = themeDisplayName(details.theme);
  const image = themeOgImage(details.theme, baseOrigin);

  const whenWhere = [
    details.date ? `on ${details.date}` : "",
    details.time ? `at ${details.time}` : "",
    details.venue ? `at ${details.venue}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const title = cleanGuest
    ? `${cleanGuest} is invited to ${couple}'s ${ceremony}`
    : `${couple} — ${ceremony}`;

  const description = cleanGuest
    ? `${cleanGuest} is warmly invited to ${couple}'s ${ceremony}${whenWhere ? ` ${whenWhere}` : ""}. Tap to open the invitation entrance door and RSVP.`
    : `You are warmly invited to ${couple}'s ${ceremony}${whenWhere ? ` ${whenWhere}` : ""}. Open the entrance door to view event details & RSVP.`;

  const canonicalUrl = `${baseOrigin}${path}${cleanGuest ? `?guest=${encodeURIComponent(cleanGuest)}` : ""}`;
  const imageAlt = imageAltPrefix ?? `${couple} — ${themeLabel} wedding invitation entrance door`;

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: robots },
    { property: "og:site_name", content: "InvitingYou" },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonicalUrl },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image.url },
    { property: "og:image:secure_url", content: image.url },
    { property: "og:image:type", content: image.type },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image.url },
    { name: "twitter:image:alt", content: imageAlt },
  ];

  if (image.width && image.height) {
    meta.push(
      { property: "og:image:width", content: String(image.width) },
      { property: "og:image:height", content: String(image.height) },
    );
  }

  return meta;
}

export function buildCardUnavailableMeta(origin?: string) {
  const baseOrigin = normalizeOrigin(origin || envSiteOrigin());
  const imageUrl = `${baseOrigin}/social-preview.jpg`;
  const title = "Invitation unavailable — InvitingYou";
  const description = "This invitation is not available. Ask the host for a published link.";
  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "noindex" },
    { property: "og:site_name", content: "InvitingYou" },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
  ];
}

export function buildSiteSocialMeta({
  title,
  description,
  origin,
  path = "/",
  imagePath = "/social-preview.jpg",
  ogType = "website",
  robots,
  width = 1200,
  height = 630,
}: {
  title: string;
  description: string;
  origin?: string;
  path?: string;
  imagePath?: string;
  ogType?: string;
  robots?: string;
  width?: number;
  height?: number;
}) {
  const baseOrigin = normalizeOrigin(origin || envSiteOrigin());
  const imageUrl = imagePath.startsWith("http") ? imagePath : `${baseOrigin}${imagePath}`;
  const url = `${baseOrigin}${path}`;
  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { property: "og:site_name", content: "InvitingYou" },
    { property: "og:type", content: ogType },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:secure_url", content: imageUrl },
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: String(width) },
    { property: "og:image:height", content: String(height) },
    { property: "og:image:alt", content: title },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
    { name: "twitter:image:alt", content: title },
  ];
  if (robots) meta.push({ name: "robots", content: robots });
  return meta;
}

export function demoEidDetails(): InvitationDetails {
  return getInvitationDetails({
    groomName: "Mohsin",
    brideName: "Simran",
    eventType: "Nikah, Barat & Walima",
    date: "22/11/2026",
    time: "4:00 PM IST",
    venue: "Jama Masjid Banquet Hall & The Leela Palace",
    address: "New Delhi",
    theme: "eid",
    framework: "moonlit",
  });
}
