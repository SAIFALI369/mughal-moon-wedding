import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { ConciergeAvatar, ConciergeMessage, ConciergeThinking } from "./concierge-ui";
import type { InvitationDetails } from "./invitation-details";
import { askCardConcierge } from "./card-concierge.functions";
import {
  CONCIERGE_LANGUAGES,
  getInstantPersonalReply,
  getAssistantIntro,
  getPersonalConciergeCopy,
  getPersonalConciergeQuickPrompts,
  type ConciergeLanguage,
} from "./personal-concierge-copy";
import { applyPersonalMusicReply, getInstantPersonalMusicReply } from "./invitation-music";
import { getAiVisitorId } from "@/lib/ai-visitor";

type Message = { role: "user" | "assistant"; text: string };

const DAILY_LIMIT = 6;

/**
 * The host-named concierge that belongs to this card. Guests can chat about this
 * celebration only; the server grounds answers in the published card's content.
 */
export function PersonalConcierge({
  details,
  slug,
  preview = false,
  inline = false,
}: {
  details: InvitationDetails;
  slug?: string;
  preview?: boolean;
  inline?: boolean;
}) {
  const { name } = getAssistantIntro(details);
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<ConciergeLanguage>("English");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  // Start from the server-safe value, then hydrate the guest's local count after mount.
  const [remaining, setRemaining] = useState(DAILY_LIMIT);
  const requestLock = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = getPersonalConciergeCopy(details, language);
  const prompts = getPersonalConciergeQuickPrompts(details, language);
  const dir = language === "اردو" ? "rtl" : "ltr";

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    const closePanel = () => setOpen(false);
    window.addEventListener("invite:open-concierge", openPanel);
    window.addEventListener("invite:close-concierge", closePanel);
    return () => {
      window.removeEventListener("invite:open-concierge", openPanel);
      window.removeEventListener("invite:close-concierge", closePanel);
    };
  }, []);

  useEffect(() => {
    if (open) logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  async function ask(question: string, retry = false) {
    const value = question.trim().slice(0, 400);
    if (!value || requestLock.current) return;
    requestLock.current = true;
    setFailedQuestion(null);
    const next = [
      ...(retry ? messages.slice(0, -2) : messages),
      { role: "user" as const, text: value },
    ].slice(-5);
    setMessages(next);
    setDraft("");
    setBusy(true);

    try {
      const instant =
        getInstantPersonalMusicReply(value, details.songs, language) ??
        getInstantPersonalReply(value, details, language);

      if (instant) {
        const rendered = applyPersonalMusicReply(instant, value, details.songs.length);
        setMessages((current) => [...current, { role: "assistant", text: rendered }]);
        return;
      }

      if (preview || !slug) {
        setMessages((current) => [...current, { role: "assistant", text: copy.previewOnly }]);
        return;
      }

      if (remaining <= 0) {
        setMessages((current) => [...current, { role: "assistant", text: copy.limit }]);
        return;
      }

      const result = await askCardConcierge({
        data: {
          slug,
          language,
          visitor: getAiVisitorId() || undefined,
          messages: next.map(({ role, text }) => ({ role, content: text })),
        },
      });
      setRemaining(
        typeof result.remaining === "number" ? result.remaining : Math.max(0, remaining - 1),
      );
      const rendered = applyPersonalMusicReply(result.reply, value, details.songs.length);
      setMessages((current) => [...current, { role: "assistant", text: rendered }]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      if (/used all|message limit/i.test(message)) {
        setRemaining(0);
        setMessages((current) => [...current, { role: "assistant", text: copy.limit }]);
      } else if (/not configured/i.test(message)) {
        setFailedQuestion(null);
        setMessages((current) => [...current, { role: "assistant", text: copy.notConfigured }]);
      } else if (/no longer available/i.test(message)) {
        setFailedQuestion(null);
        setMessages((current) => [...current, { role: "assistant", text: copy.error }]);
      } else {
        setFailedQuestion(value);
        setMessages((current) => [...current, { role: "assistant", text: copy.error }]);
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

  const panel = (
    <aside
      id="invite-concierge-panel"
      role="dialog"
      aria-label={`${name}, AI host assistant`}
      className={`invite-concierge-panel ${inline ? "invite-concierge-panel-inline" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <header className="invite-concierge-header">
        <div className="flex min-w-0 items-center gap-3">
          <ConciergeAvatar />
          <div className="min-w-0">
            <p className="invite-concierge-eyebrow">{copy.eyebrow}</p>
            <h3 className="truncate font-serif text-2xl leading-tight text-ivory">{name}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            aria-label={copy.languageLabel}
            value={language}
            disabled={busy}
            onChange={(event) => {
              setLanguage(event.target.value as ConciergeLanguage);
              setMessages([]);
              setFailedQuestion(null);
            }}
            className="invite-concierge-select"
          >
            {CONCIERGE_LANGUAGES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {!inline && (
            <button
              type="button"
              className="rounded-full p-1.5 text-ivory/70 transition hover:text-gold"
              aria-label={`Close ${name} chat`}
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="invite-concierge-body" dir={dir}>
        <p className="invite-concierge-greeting">{copy.greeting}</p>
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation"
          className="invite-concierge-log"
        >
          {messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`invite-concierge-bubble ${
                message.role === "user"
                  ? "invite-concierge-bubble-user"
                  : "invite-concierge-bubble-assistant"
              }`}
            >
              <ConciergeMessage text={message.text} />
            </div>
          ))}
          {busy && <ConciergeThinking label={copy.thinking} />}
        </div>

        <div className="invite-concierge-prompts">
          {prompts.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="invite-concierge-prompt"
              disabled={busy}
              onClick={() => void ask(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <form className="invite-concierge-composer" onSubmit={submit}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={400}
            disabled={busy}
            placeholder={copy.placeholder}
            aria-label={copy.placeholder}
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={copy.send}
            className="invite-concierge-send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {failedQuestion && (
          <button
            type="button"
            className="invite-concierge-retry"
            disabled={busy}
            onClick={() => void ask(failedQuestion, true)}
          >
            Try again
          </button>
        )}
        <p className="invite-concierge-note">{copy.note}</p>
        {!preview && slug && (
          <p className="invite-concierge-remaining" aria-live="polite">
            {remaining} of {DAILY_LIMIT} AI answers left today
          </p>
        )}
      </div>
    </aside>
  );

  if (inline) {
    return <div className="invite-concierge invite-concierge-inline">{panel}</div>;
  }

  return (
    <div className="invite-concierge">
      <button
        type="button"
        className="invite-concierge-launcher"
        aria-expanded={open}
        aria-controls="invite-concierge-panel"
        aria-label={`Ask ${name}, the AI host assistant`}
        onClick={() =>
          setOpen((current) => {
            const next = !current;
            if (next) window.dispatchEvent(new CustomEvent("invite:close-music"));
            return next;
          })
        }
      >
        <span className="invite-concierge-launcher-icon" aria-hidden="true">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="invite-concierge-launcher-copy">
          <span className="invite-concierge-launcher-eyebrow">Ask</span>
          <span className="invite-concierge-launcher-name">{name}</span>
          <span className="invite-concierge-launcher-caption">AI host assistant</span>
        </span>
      </button>

      {open && panel}
    </div>
  );
}
