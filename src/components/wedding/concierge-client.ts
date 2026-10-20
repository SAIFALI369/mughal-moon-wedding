// Both chat surfaces use the same bounded Edge → server fallback flow.
import { EVENTS } from "./config";
export type ConciergePayload = {
  language: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

type Reply = { reply?: unknown };

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  milliseconds = 18_000,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("The concierge request timed out"));
    }, milliseconds);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function requestConcierge(
  edge: (signal: AbortSignal) => Promise<{ data: Reply | null; error: unknown }>,
  server: () => Promise<Reply>,
): Promise<string> {  try {
    const { data, error } = await withTimeout(edge, 5_000);
    if (!error && typeof data?.reply === "string" && data.reply.trim()) {
      return data.reply.trim();
    }
    const msg = (error as any)?.message || (error as any)?.toString?.() || "";
    if (typeof msg === "string" && /used all|message limit|5 messages/i.test(msg)) throw new Error(msg);
  } catch (e) {
    const m = (e as any)?.message || "";
    if (typeof m === "string" && /used all|message limit|5 messages/i.test(m)) throw e;
    // Unavailable, undeployed, or slow Edge Functions must not block the fallback.
  }

  const result = await withTimeout(() => server());
  if (typeof result.reply !== "string" || !result.reply.trim()) {
    throw new Error("No answer was returned");
  }
  return result.reply.trim();
}

// Exact, standalone suggestions only: never shortcut a follow-up or a compound request.
export function getInstantConciergeReply(question: string, language: string): string | undefined {
  const q = question
    .trim()
    .toLocaleLowerCase()
    .replace(/[?؟]+$/, "");
  const [nikah, , walima] = EVENTS;
  const replies: Record<string, Record<string, string>> = {
    English: {
      "what time is the nikah": `The Nikah is on ${nikah.date} at ${nikah.time} IST at ${nikah.venue}, ${nikah.address}.`,
      "what is the dress code": EVENTS.map((e) => `${e.title}: ${e.dress}.`).join("\n"),
      "where is the walima": `The Walima is at ${walima.venue}, ${walima.address}, on ${walima.date} at ${walima.time} IST.\nhttps://www.google.com/maps/search/?api=1&query=${encodeURIComponent(walima.mapQuery)}`,
    },
    हिन्दी: {
      "निकाह कितने बजे है":
        "निकाह रविवार, 22 नवंबर 2026 को शाम 4:00 बजे (IST), जामा मस्जिद हॉल, चाँदनी चौक, पुरानी दिल्ली में है।",
      "ड्रेस कोड क्या है":
        "निकाह: आइवरी, गोल्ड और पेस्टल।\nबारात: बरगंडी और गोल्ड फॉर्मल।\nवलीमा: एमराल्ड और रॉयल नेवी।",
      "वलीमा कहाँ होगा":
        "वलीमा द लीला पैलेस, चाणक्यपुरी, नई दिल्ली में सोमवार, 23 नवंबर 2026 को रात 8:00 बजे (IST) होगा।",
    },
    اردو: {
      "نکاح کتنے بجے ہے":
        "نکاح اتوار، 22 نومبر 2026 کو شام 4:00 بجے (IST)، جامع مسجد ہال، چاندنی چوک، پرانی دہلی میں ہے۔",
      "لباس کا ضابطہ کیا ہے":
        "نکاح: آئیوری، گولڈ اور پیسٹل۔\nبارات: برگنڈی اور گولڈ فارمل۔\nولیمہ: ایمرلڈ اور رائل نیوی۔",
      "ولیمہ کہاں ہوگا":
        "ولیمہ دی لیلا پیلس، چانکیہ پوری، نئی دہلی میں پیر، 23 نومبر 2026 کو رات 8:00 بجے (IST) ہوگا۔",
    },
  };
  const additional: Record<string, Record<string, string>> = {
    English: {
      "what is the schedule": EVENTS.map(
        (e) => `${e.title}: ${e.date}, ${e.time} IST. ${e.venue}.`,
      ).join("\n"),
      "how do i rsvp":
        "Please use the RSVP form on the invitation to confirm your attendance: /demo#rsvp. I cannot submit it for you. Keep private guest and dietary details out of chat.",
      "where are the venues": EVENTS.map(
        (e) =>
          `${e.title}: ${e.venue}, ${e.address}.\nhttps://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.mapQuery)}`,
      ).join("\n\n"),
      "what music is available":
        "Choose Balagal Ula Bi Kamalihi, Moonlit Dua, Rosewater, Royal Courtyard, Sufi Breeze or Evening Mehfil in the music panel. These are gentle instrumentals, not sung qawwali recordings. Ask me to play a track, play softer music, or pause the music.",
    },
    हिन्दी: {
      "rsvp कैसे करें":
        "अपनी उपस्थिति निमंत्रण के RSVP फ़ॉर्म में दर्ज करें: /demo#rsvp। मैं आपकी ओर से फ़ॉर्म जमा नहीं कर सकती। निजी जानकारी चैट में न भेजें।",
      "कार्यक्रम क्या है":
        "निकाह: 22 नवंबर 2026, शाम 4:00 बजे।\nबारात: 22 नवंबर 2026, शाम 7:30 बजे।\nवलीमा: 23 नवंबर 2026, रात 8:00 बजे। सभी समय IST हैं।",
    },
    اردو: {
      "rsvp کیسے کریں":
        "دعوت نامے کے RSVP فارم میں اپنی شرکت کی تصدیق کریں: /demo#rsvp۔ میں آپ کی طرف سے فارم جمع نہیں کر سکتی۔ نجی معلومات چیٹ میں نہ بھیجیں۔",
      "تقریبات کا شیڈول کیا ہے":
        "نکاح: 22 نومبر 2026، شام 4:00 بجے۔\nبارات: 22 نومبر 2026، شام 7:30 بجے۔\nولیمہ: 23 نومبر 2026، رات 8:00 بجے۔ تمام اوقات IST ہیں۔",
    },
  };
  return replies[language]?.[q] ?? additional[language]?.[q];
}
