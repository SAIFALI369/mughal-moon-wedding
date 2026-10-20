export const invitationThemeIds = [
  "eid",
  "mughal",
  "classic",
  "aladin",
  "bihari-vibe",
  "mecca_madinah",
  "luxury",
  "futuristic",
  "fairytale",
  "ballroom",
  "diya-utsav",
  "sacred-mandap",
  "riad-noor",
  "kashi-ghat",
  "mehndi-night",
  "jharokha-dawn",
  "haldi-baag",
  "vows-in-ink",
] as const;
export type InvitationTheme = (typeof invitationThemeIds)[number];

export const invitationFrameworkIds = [
  "moonlit",
  "royal-folio",
  "cinematic-stage",
  "modern-mosaic",
  "curtain-call",
] as const;
export type InvitationFramework = (typeof invitationFrameworkIds)[number];

/**
 * A layout is the *structure* of the card: what the opening is made of, how the
 * cover is framed and how the sections between are decorated. Frameworks are the
 * guest's choice of structure; three themes ship their own signature layout so
 * they are not a recolour of the shared one.
 */
export const invitationLayoutIds = [
  "moonlit",
  "curtain-call",
  "mandap",
  "chhatri-dawn",
  "baag",
  "single-stroke",
  "folio",
] as const;
export type InvitationLayout = (typeof invitationLayoutIds)[number];

/**
 * Themes are grouped so a partner can find one without scrolling a wall of
 * swatches. Order here is the order shown in the studio and the editor.
 */
export const invitationThemeCategories = [
  {
    id: "signature",
    label: "Signature Structures",
    description: "Three one-of-a-kind layouts, not recolours",
  },
  {
    id: "islamic",
    label: "Islamic & Mughal",
    description: "Arches, lanterns and moonlit palaces",
  },
  {
    id: "hindu",
    label: "Hindu & Sanskrit",
    description: "Mandaps, diyas and Devanagari blessings",
  },
  {
    id: "festive",
    label: "Festive & Shared",
    description: "Mehndi, marigolds and music for either family",
  },
  {
    id: "storybook",
    label: "Storybook",
    description: "Castles, ballrooms and cinematic depth",
  },
  {
    id: "modern",
    label: "Modern & Luxury",
    description: "Marble, glass and editorial restraint",
  },
  {
    id: "classic",
    label: "Classic",
    description: "The original timeless ivory and gold",
  },
] as const;
export type InvitationThemeCategory = (typeof invitationThemeCategories)[number]["id"];

export const invitationThemes: {
  id: InvitationTheme;
  label: string;
  description: string;
  swatch: string;
  category: InvitationThemeCategory;
  /** True when the artwork carries the page from hero to footer. */
  immersive?: boolean;
  /** Signature structure, used unless the host chooses the Grand Curtain. */
  layout?: InvitationLayout;
}[] = [
  {
    id: "eid",
    label: "Eid Light",
    description: "The original luminous moonlit sky",
    swatch: "#d7e7df",
    category: "islamic",
  },
  {
    id: "mughal",
    label: "Mughal Night",
    description: "Deep burgundy and antique gold",
    swatch: "#361a30",
    category: "islamic",
  },
  {
    id: "classic",
    label: "Classic",
    description: "Warm ivory and heirloom gold",
    swatch: "#f3e7cb",
    category: "classic",
  },
  {
    id: "aladin",
    label: "Aladin",
    description: "Lantern-lit palace at twilight",
    swatch: "#38235e",
    category: "islamic",
  },
  {
    id: "bihari-vibe",
    label: "Bihari Vibe",
    description: "Madhubani-inspired flowers and festive warmth",
    swatch: "#c76d43",
    category: "hindu",
  },
  {
    id: "mecca_madinah",
    label: "Mecca–Madinah",
    description: "Respectful emerald arches and geometric light",
    swatch: "#17493b",
    category: "islamic",
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "Black marble, velvet and champagne",
    swatch: "#241c25",
    category: "modern",
  },
  {
    id: "futuristic",
    label: "Futuristic",
    description: "Aurora, glass and holographic light",
    swatch: "#102743",
    category: "modern",
  },
  {
    id: "fairytale",
    label: "Fairytale Castle",
    description: "A storybook kingdom lit by fireworks at dusk",
    swatch: "#e9b6c6",
    category: "storybook",
    immersive: true,
  },
  {
    id: "ballroom",
    label: "Grand Ballroom",
    description: "Crystal chandeliers, candlelight and champagne gold",
    swatch: "#e8d3a8",
    category: "storybook",
    immersive: true,
  },
  {
    id: "diya-utsav",
    label: "Diya Utsav",
    description: "A hundred lamps, rangoli and fireworks for a Hindu wedding night",
    swatch: "#f0a24a",
    category: "hindu",
    immersive: true,
  },
  {
    id: "sacred-mandap",
    label: "Sacred Mandap",
    description: "A sunlit flower mandap with a living havan fire",
    swatch: "#e9c98a",
    category: "hindu",
    immersive: true,
  },
  {
    id: "riad-noor",
    label: "Riad Noor",
    description: "A Moroccan courtyard of horseshoe arches, zellige and lantern light",
    swatch: "#1f5450",
    category: "islamic",
    immersive: true,
  },
  {
    id: "kashi-ghat",
    label: "Kashi Ghat",
    description: "River steps at dusk, floating diyas and a grand evening aarti",
    swatch: "#2e6b6a",
    category: "hindu",
    immersive: true,
  },
  {
    id: "mehndi-night",
    label: "Mehndi Night",
    description: "Emerald drapes, marigold strings and a henna floor",
    swatch: "#1c5b46",
    category: "festive",
    immersive: true,
  },
  {
    id: "jharokha-dawn",
    label: "Jharokha Dawn",
    description: "A rose-sandstone balcony and two doves at first light",
    swatch: "#d79a86",
    category: "signature",
    immersive: true,
    layout: "chhatri-dawn",
  },
  {
    id: "haldi-baag",
    label: "Haldi Baag",
    description: "A marigold courtyard, brass bowls and turmeric sunshine",
    swatch: "#e8b53c",
    category: "signature",
    immersive: true,
    layout: "baag",
  },
  {
    id: "vows-in-ink",
    label: "Vows in Ink",
    description: "One brushstroke, one red thread, handmade paper",
    swatch: "#e7e0d2",
    category: "signature",
    immersive: true,
    layout: "single-stroke",
  },
];

const mandapThemes = new Set<string>(["diya-utsav", "sacred-mandap", "kashi-ghat"]);

/**
 * The opening structure a card actually uses. The theme's signature layout wins
 * over the shared frameworks so the three new designs are never a recolour; the
 * Grand Curtain stays opt-in on top of any theme, exactly as before.
 */
export function invitationLayoutFor(
  theme: InvitationTheme,
  framework: InvitationFramework,
): InvitationLayout {
  if (framework === "curtain-call") return "curtain-call";
  const signature = invitationThemes.find((value) => value.id === theme)?.layout;
  if (signature) return signature;
  if (framework === "moonlit") return "moonlit";
  if (mandapThemes.has(theme)) return "mandap";
  return "folio";
}

export const invitationFrameworks: {
  id: InvitationFramework;
  label: string;
  description: string;
}[] = [
  {
    id: "moonlit",
    label: "Moonlit Journey",
    description: "The original cinematic gate and sky, made personal",
  },
  {
    id: "royal-folio",
    label: "Royal Folio",
    description: "An ornate editorial keepsake with framed details",
  },
  {
    id: "cinematic-stage",
    label: "Cinematic Stage",
    description: "An immersive, layered 3D reveal that moves with you",
  },
  {
    id: "modern-mosaic",
    label: "Modern Mosaic",
    description: "Bold asymmetric panels and contemporary typography",
  },
  {
    id: "curtain-call",
    label: "Grand Curtain",
    description: "Scroll through parting velvet curtains into a storybook stage",
  },
];

export const defaultInvitationElements = {
  gate: true,
  countdown: true,
  message: true,
  portraits: true,
  story: true,
  gallery: true,
  schedule: true,
  venueMap: true,
  dressCode: true,
  contact: true,
  rsvp: true,
  wishes: true,
  gifts: true,
  livestream: true,
};
export type InvitationElements = typeof defaultInvitationElements;
export type InvitationElement = keyof InvitationElements;

export const invitationElementOptions: {
  id: InvitationElement;
  label: string;
  description: string;
}[] = [
  { id: "gate", label: "Opening gates", description: "A theatrical opening before the invitation" },
  { id: "countdown", label: "Countdown", description: "Count down the moments until the wedding" },
  { id: "message", label: "Personal message", description: "A note to your guests" },
  {
    id: "portraits",
    label: "Couple portraits",
    description: "Your optional groom and bride photos",
  },
  { id: "story", label: "Our story", description: "How your journey began" },
  {
    id: "gallery",
    label: "Photo gallery",
    description: "A shared wall of photos, with lightbox and guest uploads",
  },
  {
    id: "schedule",
    label: "Additional events",
    description: "Reception, sangeet and other celebrations",
  },
  { id: "venueMap", label: "Venue & directions", description: "Map link and arrival details" },
  { id: "dressCode", label: "Dress code", description: "What guests should wear" },
  { id: "contact", label: "Host contact", description: "Who guests can call for questions" },
  { id: "rsvp", label: "Guest RSVP", description: "Collect replies privately in your profile" },
  {
    id: "wishes",
    label: "Wishes wall",
    description: "Let guests leave a public blessing beside your invitation",
  },
  {
    id: "gifts",
    label: "Gifts & blessings",
    description: "A short note about gifts, shagun or a registry",
  },
  {
    id: "livestream",
    label: "Live stream",
    description: "A link for family who cannot travel to the celebration",
  },
];

/**
 * One-tap ceremony presets. A printing partner hears "nikah at 4" far more
 * often than a ceremony name, so each preset sets the words that shape the
 * whole card — and the couple can still edit every one of them.
 */
export const invitationCeremonyPresets: {
  id: string;
  label: string;
  eventType: string;
  riteLine: string;
}[] = [
  { id: "nikah", label: "Nikah", eventType: "Nikah ceremony", riteLine: "" },
  { id: "shubh-vivah", label: "Shubh Vivah", eventType: "Shubh Vivah", riteLine: "॥ शुभ विवाह ॥" },
  { id: "mehndi", label: "Mehndi", eventType: "Mehndi ceremony", riteLine: "A henna evening" },
  { id: "sangeet", label: "Sangeet", eventType: "Sangeet night", riteLine: "An evening of music" },
  {
    id: "reception",
    label: "Reception",
    eventType: "Wedding reception",
    riteLine: "An evening of celebration",
  },
  {
    id: "engagement",
    label: "Engagement",
    eventType: "Engagement ceremony",
    riteLine: "The beginning of forever",
  },
];

export const invitationDressCodePresets = [
  "Festive traditional attire",
  "Indian formal",
  "Black tie",
  "Pastel garden party",
  "Emerald & gold",
  "Ivory & marigold",
];
