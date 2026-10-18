import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { askSimranServer } from "@/components/wedding/concierge.functions";
import { supabase } from "@/integrations/supabase/client";

type Language = "en" | "hi" | "ur";
type Message = { role: "user" | "assistant"; text: string };

export const AI_NAME = "Simran";

const copy = {
  en: {
    language: "English",
    back: "← Back to invitation",
    title: "Simran",
    subtitle: "Your AI wedding concierge for the celebration",
    welcome:
      "Assalamu alaikum! I'm Simran. Ask me about the schedule, venues, dress code, directions, or RSVP.",
    placeholder: "Ask Simran about the wedding…",
    send: "Send",
    thinking: "Simran is finding the details…",
    error:
      "I couldn't reach Simran just now. Please try again, or use the RSVP section on the invitation.",
    note: "Simran uses only confirmed invitation details. Don’t share private RSVP or dietary information in chat; confirm important details with the couple.",
    rsvp: "Go to RSVP",
    quick: ["What time is the Nikah?", "What is the dress code?", "Where is the Walima?"],
  },
  hi: {
    language: "हिन्दी",
    back: "← निमंत्रण पर वापस जाएँ",
    title: "सिमरन",
    subtitle: "आपके जश्न के लिए एआई शादी सहायक",
    welcome:
      "अस्सलामु अलैकुम! मैं सिमरन हूँ। कार्यक्रम, स्थान, ड्रेस कोड, रास्ते या RSVP के बारे में पूछें।",
    placeholder: "सिमरन से शादी के बारे में पूछें…",
    send: "भेजें",
    thinking: "सिमरन जानकारी देख रही हैं…",
    error:
      "अभी सिमरन से संपर्क नहीं हो पाया। कृपया फिर कोशिश करें या निमंत्रण के RSVP अनुभाग का उपयोग करें।",
    note: "सिमरन केवल निमंत्रण की जानकारी देती हैं। निजी RSVP या खान-पान की जानकारी चैट में न भेजें; ज़रूरी बातें परिवार से पुष्टि करें।",
    rsvp: "RSVP पर जाएँ",
    quick: ["निकाह कितने बजे है?", "ड्रेस कोड क्या है?", "वलीमा कहाँ होगा?"],
  },
  ur: {
    language: "اردو",
    back: "← دعوت نامے پر واپس جائیں",
    title: "سمرن",
    subtitle: "آپ کی تقریب کے لیے اے آئی شادی معاون",
    welcome:
      "السلام علیکم! میں سمرن ہوں۔ تقریبات، مقامات، لباس، راستوں یا RSVP کے بارے میں پوچھیں۔",
    placeholder: "سمرن سے شادی کے بارے میں پوچھیں…",
    send: "بھیجیں",
    thinking: "سمرن تفصیلات دیکھ رہی ہیں…",
    error:
      "سمرن سے ابھی رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں یا دعوت نامے کا RSVP حصہ استعمال کریں۔",
    note: "سمرن صرف دعوت نامے کی معلومات دیتی ہیں۔ نجی RSVP یا کھانے کی پابندیاں چیٹ میں نہ لکھیں؛ اہم بات خاندان سے پوچھیں۔",
    rsvp: "RSVP پر جائیں",
    quick: ["نکاح کتنے بجے ہے؟", "لباس کا ضابطہ کیا ہے؟", "ولیمہ کہاں ہوگا؟"],
  },
} satisfies Record<Language, Record<string, string | string[]>>;

export const Route = createFileRoute("/ai-concierge")({
  head: () => ({
    meta: [
      { title: "Simran — AI Wedding Concierge | Mohsin & Simran" },
      {
        name: "description",
        content:
          "Ask Simran, Mohsin and Simran’s AI wedding concierge, about the 2026 schedule, venues, dress code, directions, and RSVP.",
      },
    ],
  }),
  component: AiConcierge,
});

function AiConcierge() {
  const [language, setLanguage] = useState<Language>("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const text = copy[language];
  const direction = language === "ur" ? "rtl" : "ltr";

  async function ask(question: string) {
    const value = question.trim().slice(0, 800);
    if (!value || busy) return;

    const nextMessages = [...messages, { role: "user" as const, text: value }].slice(-10);
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);

    const payload = {
      language: text.language,
      messages: nextMessages.map(({ role, text: content }) => ({ role, content })),
    };

    try {
      let reply: string | undefined;
      try {
        const { data, error } = await supabase.functions.invoke("wedding-concierge", {
          body: payload,
        });
        if (!error && typeof data?.reply === "string") {
          reply = data.reply;
        }
      } catch {
        // Fall back to server function if Edge Function is not yet deployed or reachable
      }

      if (!reply) {
        const fallback = await askSimranServer({ data: payload });
        reply = fallback.reply;
      }

      if (typeof reply !== "string" || !reply.trim()) {
        throw new Error("No reply");
      }

      const assistantMessage: Message = { role: "assistant", text: reply };
      setMessages((current) => [...current, assistantMessage].slice(-10));
    } catch {
      const errorMessage: Message = { role: "assistant", text: text.error };
      setMessages((current) => [...current, errorMessage].slice(-10));
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-sm text-muted-foreground transition hover:text-gold">
            {text.back}
          </Link>
          <label className="sr-only" htmlFor="concierge-language">
            Language
          </label>
          <select
            id="concierge-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="rounded-full border border-gold/40 bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          >
            {Object.entries(copy).map(([key, value]) => (
              <option key={key} value={key}>
                {value.language}
              </option>
            ))}
          </select>
        </div>

        <section className="mt-5 overflow-hidden rounded-3xl border border-gold/35 bg-card shadow-gold">
          <header className="bg-burgundy-deep px-5 py-8 text-center text-ivory sm:px-8 sm:py-10">
            <p dir="rtl" className="font-arabic text-xl text-gold-light">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.28em] text-gold-light">
              Mohsin &amp; Simran
            </p>
            <h1 className="mt-2 font-serif text-4xl sm:text-5xl">{text.title}</h1>
            <p className="mt-2 text-sm text-ivory/75">{text.subtitle}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
              <span className="rounded-full border border-gold/40 px-3 py-2">
                Nikah &amp; Barat · Sun, 22 Nov 2026
              </span>
              <span className="rounded-full border border-gold/40 px-3 py-2">
                Walima · Mon, 23 Nov 2026
              </span>
            </div>
          </header>

          <div className="p-4 sm:p-6">
            <div
              className="mb-4 rounded-2xl border border-gold/25 bg-background/80 p-4 text-sm leading-relaxed"
              dir={direction}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gold">
                {text.title}
              </p>
              {text.welcome}
            </div>

            <div
              aria-live="polite"
              aria-label="Conversation"
              className="flex max-h-[48vh] min-h-24 flex-col gap-3 overflow-y-auto py-2"
            >
              {messages.map((message, index) => (
                <div
                  key={`${index}-${message.role}`}
                  dir={direction}
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start border border-gold/25 bg-background"
                  }`}
                >
                  {message.role === "assistant" && (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gold">
                      {text.title}
                    </p>
                  )}
                  {message.text}
                </div>
              ))}
              {busy && (
                <div
                  className="self-start rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground"
                  dir={direction}
                >
                  {text.thinking}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(text.quick as string[]).map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(question)}
                  className="rounded-full border border-gold/40 px-3 py-2 text-xs transition hover:bg-gold/10 focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-4 flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={800}
                placeholder={text.placeholder as string}
                aria-label={text.placeholder as string}
                dir={direction}
                className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="rounded-xl bg-gold-gradient px-5 py-3 text-sm font-semibold text-burgundy-deep transition hover:shadow-gold focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
              >
                {text.send}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>{text.note}</p>
              <Link
                to="/"
                hash="rsvp"
                className="font-medium text-primary underline underline-offset-4"
              >
                {text.rsvp}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
