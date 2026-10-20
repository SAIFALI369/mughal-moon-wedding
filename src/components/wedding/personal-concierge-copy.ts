import type { InvitationDetails } from "./invitation-details";
import { getInvitationAssistantName, getInvitationMonogram } from "./invitation-details";
import type { InvitationSong } from "./invitation-music";

export type ConciergeLanguage = "English" | "हिन्दी" | "اردو";

export const CONCIERGE_LANGUAGES: ConciergeLanguage[] = ["English", "हिन्दी", "اردو"];

export function getAssistantIntro(details: InvitationDetails): {
  name: string;
  couple: string;
  monogram: ReturnType<typeof getInvitationMonogram>;
} {
  return {
    name: getInvitationAssistantName(details),
    couple: `${details.groomName} & ${details.brideName}`,
    monogram: getInvitationMonogram(details),
  };
}

function directions(details: InvitationDetails): string {
  const query = [details.venue, details.address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function scheduleLine(details: InvitationDetails): string {
  return details.additionalEvents
    .map(
      (event) =>
        `${event.title} — ${event.date}${event.time ? `, ${event.time}` : ""} at ${event.venue}`,
    )
    .join("\n");
}

export function getPersonalConciergeQuickPrompts(
  details: InvitationDetails,
  language: ConciergeLanguage,
): string[] {
  if (language === "हिन्दी") {
    return [
      "समारोह कब है?",
      "जगह कहाँ है?",
      "ड्रेस कोड क्या है?",
      "और कार्यक्रम कौन से हैं?",
      "गाने कौन से हैं?",
      "RSVP कैसे करें?",
    ];
  }
  if (language === "اردو") {
    return [
      "تقریب کب ہے؟",
      "مقام کہاں ہے؟",
      "لباس کا ضابطہ کیا ہے؟",
      "مزید تقریبات کون سی ہیں؟",
      "گانے کون سے ہیں؟",
      "RSVP کیسے کریں؟",
    ];
  }
  const prompts = [
    details.date ? "When is the celebration?" : "What do we know so far?",
    details.venue ? "Where is the venue?" : "Who is hosting?",
    details.dressCode ? "What is the dress code?" : "What should I wear?",
    details.additionalEvents.length ? "What else is planned?" : "What is the schedule?",
    details.songs.length ? "What songs are on the playlist?" : "What can you do?",
    "How do I RSVP?",
  ];
  return prompts;
}

/**
 * Instant, card-specific answers. They work offline and without an API key, so the
 * host's assistant never falls back to the homepage couple's facts.
 */
export function getInstantPersonalReply(
  question: string,
  details: InvitationDetails,
  language: ConciergeLanguage,
): string | undefined {
  const q = question
    .trim()
    .toLocaleLowerCase()
    .replace(/[?؟!.]+$/g, "");
  if (!q) return undefined;
  const name = getInvitationAssistantName(details);
  const couple = `${details.groomName} & ${details.brideName}`;
  const venueLine = [details.venue, details.address].filter(Boolean).join(", ");
  const map = directions(details);
  const has = (...terms: string[]) => terms.some((term) => q.includes(term));

  if (
    has("who are you", "your name", "what can you do", "help me", "तुम कौन", "कौन हो", "آپ کون")
  ) {
    return language === "हिन्दी"
      ? `मैं ${name} हूँ, ${couple} के निमंत्रण की एआई मेज़बान सहायक। मैं तारीख, जगह, ड्रेस कोड, कार्यक्रम, संगीत और RSVP के बारे में बता सकती हूँ।`
      : language === "اردو"
        ? `میں ${name} ہوں، ${couple} کے دعوت نامے کی اے آئی معاون۔ میں تاریخ، مقام، لباس، تقریبات، موسیقی اور RSVP کے بارے میں بتا سکتی ہوں۔`
        : `I'm ${name}, the AI host assistant for ${couple}'s invitation. Ask me about the date, venue, dress code, extra celebrations, the soundtrack or RSVP.`;
  }
  if (has("rsvp", "reply", "respond", "आरएसवीपी", "جواب")) {
    return language === "हिन्दी"
      ? `कृपया निमंत्रण के RSVP फ़ॉर्म से उत्तर दें${details.rsvpDeadline ? `, ${details.rsvpDeadline} तक` : ""}। मैं आपकी ओर से फ़ॉर्म नहीं भर सकती।`
      : language === "اردو"
        ? `براہ کرم دعوت نامے کے RSVP فارم سے جواب دیں${details.rsvpDeadline ? `، ${details.rsvpDeadline} تک` : ""}۔ میں آپ کی طرف سے فارم نہیں بھر سکتی۔`
        : `Please reply through the RSVP form on this invitation${details.rsvpDeadline ? ` by ${details.rsvpDeadline}` : ""}. I can't submit it for you, and your contact or dietary notes stay private to the host.`;
  }
  if (
    details.songs.length &&
    has("song", "music", "playlist", "track", "गाना", "गाने", "संगीत", "گانا", "گانے", "موسیقی")
  ) {
    const list = details.songs.map((song, index) => `${index + 1}. ${song.title}`).join(" · ");
    return language === "हिन्दी"
      ? `इस निमंत्रण की प्लेलिस्ट: ${list}। संगीत पैनल से सुनें।`
      : language === "اردو"
        ? `اس دعوت نامے کی فہرست: ${list}۔ میوزک پینل سے سنیں۔`
        : `The host's soundtrack: ${list}. Open the music panel to listen.`;
  }
  if (has("dress", "wear", "attire", "ड्रेस", "कपड़े", "لباس")) {
    if (details.dressCode) {
      return language === "हिन्दी"
        ? `ड्रेस कोड: ${details.dressCode}।`
        : language === "اردو"
          ? `لباس کا ضابطہ: ${details.dressCode}۔`
          : `The dress code is ${details.dressCode}.`;
    }
  }
  if (
    details.additionalEvents.length &&
    has("schedule", "events", "planned", "program", "कार्यक्रम", "تقریب", "تقریبات", "شیڈول")
  ) {
    return language === "हिन्दी"
      ? `कार्यक्रम:\n${details.date} — ${details.eventType}${details.time ? `, ${details.time}` : ""}.\n${scheduleLine(details)}`
      : language === "اردو"
        ? `تقریبات:\n${details.date} — ${details.eventType}${details.time ? `، ${details.time}` : ""}۔\n${scheduleLine(details)}`
        : `The celebration begins with ${details.eventType}${details.date ? ` on ${details.date}` : ""}${details.time ? ` at ${details.time}` : ""}.\n${scheduleLine(details)}`;
  }
  if (has("time", "when", "date", "day", "कब", "तारीख", "समय", "کب", "تاریخ", "وقت")) {
    if (details.date) {
      return language === "हिन्दी"
        ? `${details.eventType} ${details.date}${details.time ? ` को ${details.time} बजे` : ""} है${venueLine ? `, ${venueLine} में` : ""}।`
        : language === "اردو"
          ? `${details.eventType} ${details.date}${details.time ? ` کو ${details.time} بجے` : ""} ہے${venueLine ? `، ${venueLine} میں` : ""}۔`
          : `${details.eventType} is on ${details.date}${details.time ? ` at ${details.time}` : ""}${venueLine ? `, at ${venueLine}` : ""}.`;
    }
  }
  if (
    has(
      "where",
      "venue",
      "location",
      "address",
      "map",
      "directions",
      "कहाँ",
      "जगह",
      "पता",
      "کہاں",
      "مقام",
      "پتہ",
    )
  ) {
    if (venueLine) {
      const base =
        language === "हिन्दी"
          ? `${venueLine} में।`
          : language === "اردو"
            ? `${venueLine} میں۔`
            : `${venueLine}.`;
      return language === "हिन्दी"
        ? `${base} रास्ता: ${map}`
        : language === "اردو"
          ? `${base} راستہ: ${map}`
          : `${base} Directions: ${map}`;
    }
  }
  if (has("contact", "call", "phone", "host", "संपर्क", "फोन", "رابطہ", "فون")) {
    const contact = [details.contactName, details.contactPhone].filter(Boolean).join(" · ");
    if (contact) {
      return language === "हिन्दी"
        ? `मेज़बान से संपर्क करें: ${contact}।`
        : language === "اردو"
          ? `میزبان سے رابطہ کریں: ${contact}۔`
          : `You can reach the host at ${contact}.`;
    }
  }
  if (has("story", "how did", "love", "कहानी", "کہانی") && details.story) {
    return details.story;
  }
  if (has("note", "message", "host says", "सन्देश", "संदेश", "پیغام") && details.message) {
    return details.message;
  }
  if (has("hello", "hi", "salam", "assalam", "नमस्ते", "सलाम", "السلام", "ہیلو")) {
    return language === "हिन्दी"
      ? `अस्सलामु अलैकुम! मैं ${name} हूँ। ${couple} के जश्न के बारे में कुछ भी पूछें।`
      : language === "اردو"
        ? `السلام علیکم! میں ${name} ہوں۔ ${couple} کی تقریب کے بارے میں کچھ بھی پوچھیں۔`
        : `Assalamu alaikum! I'm ${name}, here for ${couple}'s celebration. Ask me about the schedule, venue, dress code, music or RSVP.`;
  }
  return undefined;
}

export type PersonalConciergeCopy = {
  eyebrow: string;
  greeting: string;
  placeholder: string;
  send: string;
  thinking: string;
  error: string;
  note: string;
  previewOnly: string;
  limit: string;
  notConfigured: string;
  languageLabel: string;
};

export function getPersonalConciergeCopy(
  details: InvitationDetails,
  language: ConciergeLanguage,
): PersonalConciergeCopy {
  const { name, couple } = getAssistantIntro(details);
  if (language === "हिन्दी") {
    return {
      eyebrow: "एआई मेज़बान सहायक",
      greeting: `अस्सलामु अलैकुम! मैं ${name} हूँ, ${couple} के इस निमंत्रण की एआई मेज़बान सहायक। तारीख, जगह, ड्रेस कोड, संगीत या RSVP के बारे में पूछें।`,
      placeholder: `${name} से पूछें…`,
      send: "भेजें",
      thinking: `${name} जानकारी देख रही हैं…`,
      error: `${name} से अभी संपर्क नहीं हो सका। कृपया फिर कोशिश करें या निमंत्रण के RSVP अनुभाग का उपयोग करें।`,
      note: "जवाब इसी निमंत्रण की जानकारी पर आधारित हैं। निजी RSVP या खान-पान की जानकारी चैट में न भेजें।",
      previewOnly:
        "पूरे एआई जवाबों के लिए कार्ड प्रकाशित करें। अभी मैं तारीख, जगह, ड्रेस और संगीत के सीधे जवाब दे सकती हूँ।",
      limit: "आज के संदेश पूरे हो गए। कृपया कल फिर आएँ।",
      notConfigured:
        "एआई सहायक अभी चालू नहीं है। कृपया बाद में देखें या निमंत्रण के RSVP अनुभाग का उपयोग करें।",
      languageLabel: "भाषा",
    };
  }
  if (language === "اردو") {
    return {
      eyebrow: "اے آئی میزبان معاون",
      greeting: `السلام علیکم! میں ${name} ہوں، ${couple} کے اس دعوت نامے کی اے آئی معاون۔ تاریخ، مقام، لباس، موسیقی یا RSVP کے بارے میں پوچھیں۔`,
      placeholder: `${name} سے پوچھیں…`,
      send: "بھیجیں",
      thinking: `${name} تفصیلات دیکھ رہی ہیں…`,
      error: `${name} سے ابھی رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں یا دعوت نامے کا RSVP حصہ استعمال کریں۔`,
      note: "جواب اسی دعوت نامے کی معلومات پر مبنی ہیں۔ نجی RSVP یا کھانے کی معلومات چیٹ میں نہ لکھیں۔",
      previewOnly:
        "مکمل اے آئی جوابات کے لیے کارڈ شائع کریں۔ ابھی میں تاریخ، مقام، لباس اور موسیقی کے سیدھے جواب دے سکتی ہوں۔",
      limit: "آج کے پیغامات پورے ہو گئے۔ براہ کرم کل دوبارہ آئیں۔",
      notConfigured:
        "اے آئی معاون ابھی فعال نہیں ہے۔ براہ کرم بعد میں دیکھیں یا دعوت نامے کا RSVP حصہ استعمال کریں۔",
      languageLabel: "زبان",
    };
  }
  return {
    eyebrow: "AI host assistant",
    greeting: `Assalamu alaikum! I'm ${name}, ${details.hostName ? `${details.hostName}'s` : "the"} AI assistant for ${couple}'s invitation. Ask me about the date, venue, dress code, extra celebrations, music or RSVP.`,
    placeholder: `Ask ${name} about the celebration…`,
    send: "Send",
    thinking: `${name} is checking the invitation…`,
    error: `${name} couldn't answer just now. Please try again, or use the RSVP section of the invitation.`,
    note: `Answers come from this invitation only. Please keep private RSVP, contact and dietary details out of chat.`,
    previewOnly:
      "Publish the card to unlock the full AI answers. Right now I can answer directly about the date, venue, dress code and playlist.",
    limit: "Today's messages are used up. Please come back tomorrow.",
    notConfigured:
      "The AI assistant isn't switched on for this invitation yet. Please check back soon, or use the RSVP section of the invitation.",
    languageLabel: "Language",
  };
}

export function getSongCaption(song: InvitationSong): string {
  return song.title;
}
