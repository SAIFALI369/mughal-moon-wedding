export const invitationThemeIds = [
  "eid",
  "mughal",
  "classic",
  "aladin",
  "bihari-vibe",
  "mecca_madinah",
  "luxury",
  "futuristic",
] as const;
export type InvitationTheme = (typeof invitationThemeIds)[number];

export const invitationFrameworkIds = [
  "moonlit",
  "royal-folio",
  "cinematic-stage",
  "modern-mosaic",
] as const;
export type InvitationFramework = (typeof invitationFrameworkIds)[number];

export const invitationThemes: {
  id: InvitationTheme;
  label: string;
  description: string;
  swatch: string;
}[] = [
  {
    id: "eid",
    label: "Eid Light",
    description: "The original luminous moonlit sky",
    swatch: "#d7e7df",
  },
  {
    id: "mughal",
    label: "Mughal Night",
    description: "Deep burgundy and antique gold",
    swatch: "#361a30",
  },
  {
    id: "classic",
    label: "Classic",
    description: "Warm ivory and heirloom gold",
    swatch: "#f3e7cb",
  },
  {
    id: "aladin",
    label: "Aladin",
    description: "Lantern-lit palace at twilight",
    swatch: "#38235e",
  },
  {
    id: "bihari-vibe",
    label: "Bihari Vibe",
    description: "Madhubani-inspired flowers and festive warmth",
    swatch: "#c76d43",
  },
  {
    id: "mecca_madinah",
    label: "Mecca–Madinah",
    description: "Respectful emerald arches and geometric light",
    swatch: "#17493b",
  },
  {
    id: "luxury",
    label: "Luxury",
    description: "Black marble, velvet and champagne",
    swatch: "#241c25",
  },
  {
    id: "futuristic",
    label: "Futuristic",
    description: "Aurora, glass and holographic light",
    swatch: "#102743",
  },
];

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
];

export const defaultInvitationElements = {
  gate: true,
  countdown: true,
  message: true,
  portraits: true,
  story: true,
  schedule: true,
  venueMap: true,
  dressCode: true,
  contact: true,
  rsvp: true,
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
    id: "schedule",
    label: "Additional events",
    description: "Reception, sangeet and other celebrations",
  },
  { id: "venueMap", label: "Venue & directions", description: "Map link and arrival details" },
  { id: "dressCode", label: "Dress code", description: "What guests should wear" },
  { id: "contact", label: "Host contact", description: "Who guests can call for questions" },
  { id: "rsvp", label: "Guest RSVP", description: "Collect replies privately in your profile" },
];
