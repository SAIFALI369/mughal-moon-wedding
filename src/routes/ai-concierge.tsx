import { getInstantSmallTalk } from "@/components/wedding/concierge-smalltalk";
import { MusicToggle } from "@/components/wedding/music-player";
import { applyMusicReply, getInstantMusicReply } from "@/components/wedding/music-control";
import { ConciergeAvatar, ConciergeControls, ConciergeMessage, ConciergeThinking } from "@/components/wedding/concierge-ui";
import { getInstantConciergeReply, requestConcierge } from "@/components/wedding/concierge-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { askSimranServer } from "@/components/wedding/concierge.functions";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Plus, History, Trash2, Menu, X, Send, Mic, Sparkles, ChevronDown } from "lucide-react";

type Language = "en" | "hi" | "ur";
type Message = { role: "user" | "assistant"; text: string };
type Chat = { id: string; title: string; messages: Message[]; lang: Language; at: number };

export const AI_NAME = "Simran";

const copy = {
  en: {
    language: "English",
    back: "← Back to invitation",
    title: "Simran",
    subtitle: "Your wedding guide, everyday sidekick & resident wit",
    welcome: "Assalamu alaikum! I’m Simran, your AI wedding guide and cheerful sidekick. Ask about the celebration, music, or anything on your mind. I bring the answers—and occasional existential jokes.",
    placeholder: "Ask about the wedding, life, or anything…",
    send: "Send",
    thinking: "Simran is finding the details…",
    error: "I couldn't reach Simran just now. Please try again, or use the RSVP section on the invitation.",
    note: "Wedding answers use confirmed invitation details; general answers can be mistaken. No live web access. Don’t share private RSVP or dietary details in chat.",
    rsvp: "Go to RSVP",
    quick: ["What time is the Nikah?", "What is the dress code?", "Where is the Walima?", "What is the schedule?", "How do I RSVP?", "Play softer music", "Tell me a dark-ish joke", "What can you do?"],
  },
  hi: {
    language: "हिन्दी",
    back: "← निमंत्रण पर वापस जाएँ",
    title: "सिमरन",
    subtitle: "आपके जश्न के लिए एआई शादी सहायक",
    welcome: "अस्सलामु अलैकुम! मैं सिमरन हूँ। कार्यक्रम, स्थान, ड्रेस कोड, रास्ते या RSVP के बारे में पूछें।",
    placeholder: "सिमरन से शादी के बारे में पूछें…",
    send: "भेजें",
    thinking: "सिमरन जानकारी देख रही हैं…",
    error: "अभी सिमरन से संपर्क नहीं हो पाया। कृपया फिर कोशिश करें या निमंत्रण के RSVP अनुभाग का उपयोग करें।",
    note: "शादी के जवाब निमंत्रण पर आधारित हैं; सामान्य जवाब गलत हो सकते हैं। लाइव वेब एक्सेस नहीं है। निजी RSVP या खान-पान की जानकारी चैट में न भेजें।",
    rsvp: "RSVP पर जाएँ",
    quick: ["निकाह कितने बजे है?", "ड्रेस कोड क्या है?", "वलीमा कहाँ होगा?", "RSVP कैसे करें?"],
  },
  ur: {
    language: "اردو",
    back: "← دعوت نامے پر واپس جائیں",
    title: "سمرن",
    subtitle: "آپ کی تقریب کے لیے اے آئی شادی معاون",
    welcome: "السلام علیکم! میں سمرن ہوں۔ تقریبات، مقامات، لباس، راستوں یا RSVP کے بارے میں پوچھیں۔",
    placeholder: "سمرن سے شادی کے بارے میں پوچھیں…",
    send: "بھیجیں",
    thinking: "سمرن تفصیلات دیکھ رہی ہیں…",
    error: "سمرن سے ابھی رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں یا دعوت نامے کا RSVP حصہ استعمال کریں۔",
    note: "شادی کے جواب دعوت نامے پر مبنی ہیں؛ عمومی جواب غلط ہو سکتے ہیں۔ لائیو ویب رسائی نہیں ہے۔ نجی RSVP یا کھانے کی معلومات چیٹ میں نہ لکھیں۔",
    rsvp: "RSVP پر جائیں",
    quick: ["نکاح کتنے بجے ہے؟", "لباس کا ضابطہ کیا ہے؟", "ولیمہ کہاں ہوگا؟", "RSVP کیسے کریں؟"],
  },
} satisfies Record<Language, Record<string, string | string[]>>;

export const Route = createFileRoute("/ai-concierge")({
  head: () => ({
    meta: [
      { title: "Simran — AI Wedding Concierge | Mohsin & Simran" },
      { name: "description", content: "Ask Simran, Mohsin and Simran’s AI wedding concierge, about the 2026 schedule, venues, dress code, directions, and RSVP." },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const raw = localStorage.getItem("simran-chats");
      return raw ? (JSON.parse(raw) as Chat[]) : [];
    } catch {
      return [];
    }
  });
  const [chatId, setChatId] = useState<string>(() => Date.now().toString(36));
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const text = copy[language];
  const direction = language === "ur" ? "rtl" : "ltr";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    try {
      localStorage.setItem("simran-chats", JSON.stringify(chats.slice(0, 20)));
    } catch {}
  }, [chats]);

  function persistCurrent(next: Message[]) {
    if (next.length === 0) return;
    const title = next.find((m) => m.role === "user")?.text.slice(0, 40) || "New chat";
    setChats((prev) => {
      const without = prev.filter((c) => c.id !== chatId);
      return [{ id: chatId, title, messages: next, lang: language, at: Date.now() }, ...without].slice(0, 20);
    });
  }

  async function ask(question: string, retry = false) {
    const value = question.trim().slice(0, 800);
    if (!value || requestLock.current) return;
    requestLock.current = true;
    setFailedQuestion(null);
    const nextMessages = [...(retry ? messages.slice(0, -2) : messages), { role: "user" as const, text: value }].slice(-10);
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);
    const payload = { language: text.language, messages: nextMessages.map(({ role, text: content }) => ({ role, content })) };
    try {
      const reply =
        getInstantMusicReply(value, text.language) ??
        getInstantConciergeReply(value, text.language) ??
        getInstantSmallTalk(value, text.language) ??
        (await requestConcierge(
          (signal) => supabase.functions.invoke("wedding-concierge", { body: payload, signal }),
          () => askSimranServer({ data: payload }),
        ));
      const assistantMessage: Message = { role: "assistant", text: applyMusicReply(reply, value) };
      setMessages((cur) => {
        const nxt = [...cur, assistantMessage].slice(-10);
        persistCurrent(nxt);
        return nxt;
      });
    } catch {
      setFailedQuestion(value);
      const errMsg: Message = { role: "assistant", text: text.error };
      setMessages((cur) => [...cur, errMsg].slice(-10));
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void ask(draft);
  }

  function newChat() {
    const id = Date.now().toString(36);
    setChatId(id);
    setMessages([]);
    setFailedQuestion(null);
    setDraft("");
    setSidebarOpen(false);
  }

  function openChat(c: Chat) {
    setChatId(c.id);
    setMessages(c.messages);
    setLanguage(c.lang);
    setSidebarOpen(false);
  }

  function clearHistory() {
    if (!confirm("Clear all chat history?")) return;
    setChats([]);
    localStorage.removeItem("simran-chats");
    newChat();
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar — ChatGPT-inspired, but burgundy/gold themed */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[280px] flex-col border-r border-gold/20 bg-burgundy-deep text-ivory transition-transform duration-300 lg:static lg:translate-x-0 dark:lg:border-gold/10 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${sidebarOpen ? "shadow-2xl" : ""}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-ivory/10 px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-burgundy-deep">
              <Sparkles size={16} />
            </div>
            <span className="font-serif text-lg">Simran</span>
            <span className="rounded-full bg-ivory/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-gold-light">Wedding AI</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-full p-2 text-ivory/70 hover:bg-ivory/10 hover:text-ivory lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="p-3">
          <button onClick={newChat} className="flex w-full items-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-medium text-burgundy-deep shadow hover:bg-gold-light transition">
            <Plus size={16} /> New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          <p className="px-3 py-2 text-xs uppercase tracking-widest text-ivory/50 flex items-center gap-2"><History size={14}/> History</p>
          <div className="mt-2 space-y-1">
            {chats.length === 0 && <p className="px-3 py-4 text-xs text-ivory/50">No chats yet. Start with “What time is the Nikah?”</p>}
            {chats.map((c) => (
              <button
                key={c.id}
                onClick={() => openChat(c)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${chatId === c.id ? "bg-ivory/15 text-ivory" : "text-ivory/70 hover:bg-ivory/10 hover:text-ivory"}`}
              >
                <MessageCircle size={14} className="shrink-0 text-gold-light" />
                <span className="truncate">{c.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-ivory/10 p-3 space-y-3">
          <div className="rounded-xl bg-ivory/10 p-3">
            <p className="text-xs font-medium text-gold-light">Mohsin & Simran</p>
            <p className="text-xs text-ivory/70">22–23 Nov 2026 · Nikah · Barat · Walima</p>
            <div className="mt-2 flex gap-1 flex-wrap">
              <span className="rounded-full bg-ivory/10 px-2 py-1 text-[10px]">Nikah 22 Nov 4 PM</span>
              <span className="rounded-full bg-ivory/10 px-2 py-1 text-[10px]">Walima 23 Nov 8 PM</span>
            </div>
          </div>

          <label className="block text-xs text-ivory/60">Language</label>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => {
                const v = e.target.value as Language;
                setLanguage(v);
                // keep current chat but switch lang for next ask
              }}
              className="w-full appearance-none rounded-xl border border-ivory/20 bg-ivory/10 px-3 py-2.5 pr-8 text-sm text-ivory focus:outline-none focus:ring-2 focus:ring-gold"
            >
              {Object.entries(copy).map(([k, v]) => (
                <option key={k} value={k} className="text-burgundy-deep">
                  {v.language}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ivory/60" />
          </div>

          <div className="flex gap-2">
            <button onClick={clearHistory} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-ivory/20 px-3 py-2 text-xs text-ivory/80 hover:bg-ivory/10">
              <Trash2 size={14} /> Clear
            </button>
            <Link to="/" className="flex flex-1 items-center justify-center rounded-xl bg-ivory px-3 py-2 text-xs font-medium text-burgundy-deep hover:bg-ivory/90 text-center">
              {text.back}
            </Link>
          </div>
          <p className="text-[11px] leading-relaxed text-ivory/40">{text.note}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header — follows app theme (burgundy/gold/ivory) with blur */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gold/15 bg-background/80 px-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-full p-2 hover:bg-muted lg:hidden">
              <Menu size={18} />
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <ConciergeAvatar />
              <div>
                <h1 className="font-serif text-lg leading-none">{text.title} <span className="text-gold">— AI Concierge</span></h1>
                <p className="text-xs text-muted-foreground">{text.subtitle}</p>
              </div>
            </div>
            <div className="sm:hidden font-serif text-lg">Simran</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-burgundy">EID / MUGHAL theme</span>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Online
            </div>
          </div>
        </header>

        {/* Messages — ChatGPT-like alternating rows, but with wedding palette */}
        <div ref={listRef} className="flex-1 overflow-y-auto scroll-smooth">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
              <div className="mx-auto max-w-2xl rounded-3xl border border-gold/20 bg-card p-6 text-center shadow-gold sm:p-8">
                <div className="mx-auto flex justify-center"><ConciergeAvatar /></div>
                <h2 className="mt-4 font-serif text-3xl">Assalamu alaikum — I’m Simran</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground" dir={direction}>
                  {text.welcome}
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2 text-left">
                  {(text.quick as string[]).slice(0, 6).map((q) => (
                    <button key={q} onClick={() => void ask(q)} className="rounded-2xl border border-gold/20 bg-background px-4 py-3 text-left text-sm hover:bg-gold/5 hover:border-gold/40 transition text-foreground">
                      <span className="block text-xs uppercase tracking-widest text-gold">Try</span>
                      <span className="mt-1 line-clamp-2">{q}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border px-3 py-1">Nikah 4 PM · Jama Masjid Hall</span>
                  <span className="rounded-full border px-3 py-1">Barat 7:30 PM · Imperial</span>
                  <span className="rounded-full border px-3 py-1">Walima 8 PM · Leela Palace</span>
                </div>
              </div>
              <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">{text.note}</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {messages.map((m, i) => (
                <div key={`${i}-${m.role}`} className={`border-b border-gold/5 px-4 py-6 sm:px-6 ${m.role === "assistant" ? "bg-muted/30" : "bg-background"}`}>
                  <div className="mx-auto flex max-w-3xl gap-4">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${m.role === "user" ? "bg-burgundy text-ivory" : "bg-gold text-burgundy-deep"}`}>
                      {m.role === "user" ? "You" : "S"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{m.role === "user" ? "You" : text.title}</p>
                      <div className="prose prose-sm mt-2 max-w-none whitespace-pre-wrap break-words text-foreground dark:prose-invert" dir={direction}>
                        <ConciergeMessage text={m.text} />
                      </div>
                      {m.role === "assistant" && (
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => navigator.clipboard.writeText(m.text)} className="rounded-full border border-gold/20 px-3 py-1 text-xs hover:bg-gold/10">Copy</button>
                          <Link to="/" hash="rsvp" className="rounded-full bg-burgundy px-3 py-1 text-xs text-ivory hover:bg-burgundy/90">{text.rsvp}</Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="border-b border-gold/5 bg-muted/30 px-4 py-6 sm:px-6">
                  <div className="mx-auto flex max-w-3xl gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-burgundy-deep">S</div>
                    <div className="flex-1 text-sm text-muted-foreground"><ConciergeThinking label={text.thinking} /></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer — floating input, ChatGPT-style but gold/burgundy */}
        <div className="border-t border-gold/10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-3xl px-3 py-3 sm:px-6">
            <ConciergeControls
              language={text.language}
              busy={busy}
              hasMessages={messages.length > 0}
              failed={!!failedQuestion}
              onRetry={() => failedQuestion && void ask(failedQuestion, true)}
              onClear={() => {
                setMessages([]);
                setFailedQuestion(null);
              }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {(text.quick as string[]).slice(0, 4).map((q) => (
                <button key={q} onClick={() => void ask(q)} disabled={busy} className="rounded-full border border-gold/20 bg-card px-3 py-1.5 text-xs hover:bg-gold/10 disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="mt-3 flex items-end gap-2 rounded-3xl border border-gold/20 bg-card p-2 shadow-lg focus-within:border-gold/40 focus-within:ring-2 focus-within:ring-gold/20">
              <textarea
                ref={inputRef as any}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={800}
                rows={1}
                dir={direction}
                placeholder={text.placeholder as string}
                aria-label={text.placeholder as string}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(draft);
                  }
                }}
                className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center gap-1 pr-1">
                <button type="button" aria-label="Voice (coming soon)" className="rounded-full p-2 text-muted-foreground hover:bg-muted">
                  <Mic size={18} />
                </button>
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  aria-label={text.send as string}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-burgundy text-ivory shadow hover:bg-burgundy/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
            <p className="mt-2 text-center text-xs text-muted-foreground">Simran can make mistakes. Verify dates: 22–23 Nov 2026. <Link to="/" className="underline">Invitation</Link> • <a href="#rsvp" className="underline">RSVP</a></p>
          </div>
        </div>
      </div>

      <MusicToggle />

      {/* Mobile overlay */}
      {sidebarOpen && <button aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden" />}
    </div>
  );
}
