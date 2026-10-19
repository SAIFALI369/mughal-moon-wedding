import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles as SparklesIcon, X } from "lucide-react";
import { supabase } from "@/lib/db";
import { requestConcierge } from "./concierge-client";
import { askHostAssistantServer } from "./concierge.functions";
import {
  ConciergeAvatar,
  ConciergeControls,
  ConciergeMessage,
  ConciergeThinking,
} from "./concierge-ui";

type Message = { role: "user" | "assistant"; text: string };

const SERVER_HISTORY = 5; // token-saving: only the latest turns go to the model
const DISPLAY_HISTORY = 10;
const SUGGESTIONS = [
  "When is the celebration?",
  "Where is the venue?",
  "What is the dress code?",
  "Who can I contact?",
];

/**
 * A personal invitation's own AI assistant, named after its host. It answers from this
 * card's details only. It is not Simran, the main wedding concierge.
 */
export function HostAssistant({
  slug,
  name,
  coupleLabel,
}: {
  slug: string;
  name: string;
  coupleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const requestLock = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy, open]);

  async function ask(question: string, retry = false) {
    const clean = question.trim().slice(0, 400);
    if (!clean || requestLock.current) return;
    requestLock.current = true;
    setFailedQuestion(null);
    const next = [
      ...(retry ? messages.slice(0, -2) : messages),
      { role: "user" as const, text: clean },
    ];
    setMessages(next.slice(-DISPLAY_HISTORY));
    setDraft("");
    setBusy(true);
    const payload = next.slice(-SERVER_HISTORY).map(({ role, text }) => ({ role, content: text }));
    try {
      const reply = await requestConcierge(
        (signal) =>
          supabase.functions.invoke("wedding-concierge", {
            body: { language: "English", card: slug, messages: payload },
            signal,
          }),
        () => askHostAssistantServer({ data: { slug, messages: payload } }),
      );
      const answer: Message = { role: "assistant", text: reply };
      setMessages((current) => [...current, answer].slice(-DISPLAY_HISTORY));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      if (/used all|message limit|5 messages/i.test(message)) {
        const limit: Message = { role: "assistant", text: message };
        setMessages((current) => [...current, limit].slice(-DISPLAY_HISTORY));
      } else {
        setFailedQuestion(clean);
        const failure: Message = {
          role: "assistant",
          text: `I couldn't reach ${name}'s assistant right now. Please try again, or contact the host directly.`,
        };
        setMessages((current) => [...current, failure].slice(-DISPLAY_HISTORY));
      }
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
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Ask ${name}, the AI assistant for this invitation`}
        aria-expanded={open}
        aria-controls="host-assistant-chat"
        className="simran-launcher fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 rounded-full border-2 border-gold-light px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-burgundy-deep shadow-gold transition hover:scale-105"
      >
        <SparklesIcon className="h-4 w-4" aria-hidden="true" />
        <span>
          Ask {name}
          <span className="simran-launcher-caption">Your AI assistant</span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            id="host-assistant-chat"
            aria-label={`${name}, AI assistant for this invitation`}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            className="simran-chat fixed bottom-24 left-4 right-4 z-50 max-w-md overflow-hidden rounded-3xl border border-gold/50 bg-card shadow-gold sm:left-6 sm:right-auto sm:w-96"
          >
            <div className="concierge-header flex items-center justify-between gap-3 bg-burgundy-deep px-5 py-5 text-ivory">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-gold-light">
                  AI assistant for this invitation
                </p>
                <h3 className="flex items-center gap-3 font-serif text-2xl">
                  <ConciergeAvatar /> {name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={`Close ${name} chat`}
                className="rounded-full p-1 text-ivory/80 hover:text-gold-light"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="mb-3 rounded-2xl border border-gold/25 bg-background/90 p-3 text-xs leading-relaxed">
                Hello! I’m {name}, the AI assistant for {coupleLabel}’s celebration. Ask about the
                schedule, venue, dress code, songs or how to reply.
              </div>

              <div
                role="log"
                aria-live="polite"
                aria-label="Conversation"
                className="concierge-messages flex max-h-56 flex-col gap-3 overflow-y-auto py-1"
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      message.role === "user"
                        ? "self-end bg-primary text-primary-foreground"
                        : "self-start border border-gold/25 bg-background"
                    }`}
                  >
                    <ConciergeMessage text={message.text} />
                  </div>
                ))}
                {busy && (
                  <div className="self-start rounded-2xl bg-muted px-3.5 py-2 text-xs text-muted-foreground">
                    <ConciergeThinking label={`${name} is checking the invitation…`} />
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <ConciergeControls
                language="English"
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

              <div className="concierge-suggestions mt-3 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={busy}
                    onClick={() => void ask(suggestion)}
                    className="rounded-full border border-gold/40 px-2.5 py-1 text-[11px] transition hover:bg-gold/10 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="concierge-composer mt-3 flex gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={400}
                  placeholder={`Ask ${name}…`}
                  aria-label={`Ask ${name} a question`}
                  className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-gold"
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  aria-label={`Send question to ${name}`}
                  className="simran-action flex items-center justify-center rounded-xl px-3.5 py-2 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </form>

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Answers come from this invitation only.</span>
                <a
                  href="#rsvp"
                  onClick={() => setOpen(false)}
                  className="underline underline-offset-4"
                >
                  Go to RSVP
                </a>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
