import { getInstantSmallTalk } from "@/components/wedding/concierge-smalltalk";
import { MusicToggle } from "@/components/wedding/music-player";
import { applyMusicReply, getInstantMusicReply } from "@/components/wedding/music-control";
import {
  ConciergeAvatar,
  ConciergeControls,
  ConciergeThinking,
  ConciergeMessage,
} from "@/components/wedding/concierge-ui";
import { getInstantConciergeReply, requestConcierge } from "@/components/wedding/concierge-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
    subtitle: "Your wedding guide, everyday sidekick & resident wit",
    welcome:
      "Assalamu alaikum! I’m Simran, your AI wedding guide and cheerful sidekick. Ask about the celebration, music, or anything on your mind. I bring the answers—and occasional existential jokes.",
    placeholder: "Ask about the wedding, life, or anything…",
    send: "Send",
    thinking: "Simran is finding the details…",
    error:
      "I couldn't reach Simran just now. Please try again, or use the RSVP section on the invitation.",
    note: "Wedding answers use confirmed invitation details; general answers can be mistaken. No live web access. Don’t share private RSVP or dietary details in chat.",
    rsvp: "Go to RSVP",
    quick: [
      "What time is the Nikah?",
      "What is the dress code?",
      "Where is the Walima?",
      "What is the schedule?",
      "How do I RSVP?",
      "Play softer music",
      "Tell me a dark-ish joke",
      "What can you do?",
    ],
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
    note: "शादी के जवाब निमंत्रण पर आधारित हैं; सामान्य जवाब गलत हो सकते हैं। लाइव वेब एक्सेस नहीं है। निजी RSVP या खान-पान की जानकारी चैट में न भेजें।",
    rsvp: "RSVP पर जाएँ",
    quick: ["निकाह कितने बजे है?", "ड्रेस कोड क्या है?", "वलीमा कहाँ होगा?", "RSVP कैसे करें?"],
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
    note: "شادی کے جواب دعوت نامے پر مبنی ہیں؛ عمومی جواب غلط ہو سکتے ہیں۔ لائیو ویب رسائی نہیں ہے۔ نجی RSVP یا کھانے کی معلومات چیٹ میں نہ لکھیں۔",
    rsvp: "RSVP پر جائیں",
    quick: ["نکاح کتنے بجے ہے؟", "لباس کا ضابطہ کیا ہے؟", "ولیمہ کہاں ہوگا؟", "RSVP کیسے کریں؟"],
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
  const requestLock = useRef(false);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  const text = copy[language];
  const direction = language === "ur" ? "rtl" : "ltr";

  async function ask(question: string, retry = false) {
    const value = question.trim().slice(0, 800);
    if (!value || requestLock.current) return;
    requestLock.current = true;
    setFailedQuestion(null);

    const nextMessages = [
      ...(retry ? messages.slice(0, -2) : messages),
      { role: "user" as const, text: value },
    ].slice(-10);
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);

    const payload = {
      language: text.language,
      messages: nextMessages.map(({ role, text: content }) => ({ role, content })),
    };

    try {
      const reply =
        getInstantMusicReply(value, text.language) ??
        getInstantConciergeReply(value, text.language) ??
        getInstantSmallTalk(value, text.language) ??
        (await requestConcierge(
          (signal) =>
            supabase.functions.invoke("wedding-concierge", {
              body: payload,
              signal,
            }),
          () => askSimranServer({ data: payload }),
        ));

      const assistantMessage: Message = { role: "assistant", text: applyMusicReply(reply, value) };
      setMessages((current) => [...current, assistantMessage].slice(-10));
    } catch {
      setFailedQuestion(value);
      const errorMessage: Message = { role: "assistant", text: text.error };
      setMessages((current) => [...current, errorMessage].slice(-10));
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <main className="concierge-page min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
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
            disabled={busy}
            onChange={(event) => {
              setLanguage(event.target.value as Language);
              setMessages([]);
              setFailedQuestion(null);
            }}
            className="rounded-full border border-gold/40 bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          >
            {Object.entries(copy).map(([key, value]) => (
              <option key={key} value={key}>
                {value.language}
              </option>
            ))}
          </select>
        </div>

        <section className="concierge-panel mt-5 overflow-hidden rounded-3xl border border-gold/35 bg-card shadow-gold">
          <header className="concierge-header bg-burgundy-deep px-5 py-8 text-center text-ivory sm:px-8 sm:py-10">
            <p dir="rtl" className="font-arabic text-xl text-gold-light">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.28em] text-gold-light">
              Mohsin &amp; Simran
            </p>
            <div className="mt-5 flex justify-center">
              <ConciergeAvatar />
            </div>
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
              role="log"
              className="concierge-messages flex max-h-[48vh] min-h-24 flex-col gap-3 overflow-y-auto py-2"
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
                  <ConciergeMessage text={message.text} />
                </div>
              ))}
              {busy && (
                <div
                  className="self-start rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground"
                  dir={direction}
                >
                  <ConciergeThinking label={text.thinking} />
                </div>
              )}
              <div ref={endRef} />
            </div>

            <ConciergeControls
              language={text.language}
              busy={busy}
              hasMessages={messages.length > 0}
              failed={!!failedQuestion}
              onRetry={() => {
                if (failedQuestion) void ask(failedQuestion, true);
              }}
              onClear={() => {
                setMessages([]);
                setFailedQuestion(null);
              }}
            />
            <div className="concierge-suggestions mt-4 flex flex-wrap gap-2">
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

            <form onSubmit={submit} className="concierge-composer mt-4 flex gap-2">
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
                className="simran-action rounded-xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
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
      <MusicToggle />
    </main>
  );
}
