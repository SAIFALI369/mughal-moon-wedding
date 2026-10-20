import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/db";
import { getAiVisitorId } from "@/lib/ai-visitor";
import { readInvitationNotes } from "./form-assistant.functions";
import {
  READING_GROUPS,
  mergeReadingIntoForm,
  readingCompleteness,
  readingValues,
  readInvitationText,
  type InvitationReading,
  type ReadingFieldKey,
} from "./invitation-import";
import type { InvitationForm } from "./invitation-form-data";

/**
 * Simran reads the notes a partner was handed and shows the card structure she
 * found — nothing is applied until the partner ticks the lines that are right.
 * The panel is rendered only inside the partner workspace; the server checks
 * the partner allowance again before the AI is called.
 */

const SAMPLE = `Ayaan weds Zara
Nikah on 22 November 2026 at 4:00 PM IST
Venue: Jama Masjid Hall, Patna, Bihar
Hosted by: The Khan family
Contact: Imran +91 98765 43210
Dress code: Indian formal
RSVP by 10 November 2026
Sangeet on 20 November 2026 at 7:00 PM at Sharma House, Patna
#AyaanWedsZara`;

const GROUP_ORDER = READING_GROUPS.map((group) => group.id);

export function SimranFormReader({
  enabled,
  onApply,
  onJump,
}: {
  /** True only for an active print partner in the dashboard. */
  enabled: boolean;
  onApply: (reading: InvitationReading, accepted: string[]) => void;
  /** Take the partner straight to the field that still needs them. */
  onJump: (key: ReadingFieldKey) => void;
}) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState<InvitationReading | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "local" | "simran" | "reader">("idle");
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(0);

  if (!enabled) return null;

  const values = reading ? readingValues(reading) : {};
  const completeness = reading ? readingCompleteness(reading) : null;

  function selectDefaults(next: InvitationReading) {
    const checked = new Set<string>(
      next.fields.filter((field) => !field.check).map((field) => field.key),
    );
    if (next.events.length) checked.add("additionalEvents");
    setAccepted(checked);
  }

  async function read() {
    if (text.trim().length < 12) {
      setError("Paste a line or two first — a name, a date and a venue are enough.");
      return;
    }
    setError("");
    setApplied(0);
    const local = readInvitationText(text);
    setReading(local);
    selectDefaults(local);
    setStatus("local");
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? "";
      if (!accessToken) throw new Error("Sign in again to use Simran.");
      const result = await readInvitationNotes({
        data: { text, accessToken, visitor: getAiVisitorId() },
      });
      setReading(result.reading);
      selectDefaults(result.reading);
      setStatus(result.aiAvailable ? "simran" : "reader");
      if (!result.aiAvailable) {
        setError("Simran is busy right now, so the built-in reader filled what it could.");
      }
    } catch (err: unknown) {
      setStatus("reader");
      setError(
        err instanceof Error
          ? `${err.message} The built-in reader filled what it could.`
          : "Simran could not be reached. The built-in reader filled what it could.",
      );
    } finally {
      setBusy(false);
    }
  }

  function toggle(key: string) {
    setAccepted((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function apply() {
    if (!reading) return;
    onApply(reading, [...accepted]);
    setApplied(accepted.size);
  }

  function reset() {
    setText("");
    setReading(null);
    setAccepted(new Set());
    setStatus("idle");
    setError("");
    setApplied(0);
  }

  return (
    <section
      aria-labelledby="simran-form-reader"
      className="simran-reader overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-card to-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gold/25 px-5 py-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/60 bg-gold/15 font-serif text-lg text-gold"
          >
            S
          </span>
          <div>
            <h3 id="simran-form-reader" className="font-serif text-xl leading-tight">
              Simran reads the notes for you
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Paste the message, the printed proof or a hurried note. Simran feels the shape of the
              card — then <strong>you</strong> decide what is true.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-gold/40 bg-background/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-gold">
          Partner admins only
        </span>
      </header>

      <div className="space-y-3 px-5 py-4">
        <label htmlFor="simran-notes" className="text-xs font-medium">
          Notes from the couple or the shop
        </label>
        <Textarea
          id="simran-notes"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          maxLength={4000}
          placeholder={`Paste anything, for example:\n${SAMPLE}`}
          className="min-h-28 bg-background/80 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void read()} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" aria-hidden="true" />
            )}
            {busy ? "Reading…" : reading ? "Read it again" : "Read this with Simran"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setText(SAMPLE)}
            disabled={busy}
          >
            <ClipboardPaste className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Use an example
          </Button>
          {(reading || text) && (
            <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={busy}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </Button>
          )}
          <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Nothing is saved until you save the card
          </span>
        </div>

        {error && (
          <p role="status" className="flex items-start gap-2 text-xs text-amber-700">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        {reading && completeness && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/70 px-4 py-3">
              <p className="text-xs">
                <strong className="font-serif text-base">
                  {completeness.found} of {completeness.total} details found
                </strong>
                <span className="ml-2 text-muted-foreground">
                  {completeness.required === 6
                    ? "All required fields are covered."
                    : `${6 - completeness.required} required still missing.`}
                </span>
              </p>
              <span
                className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
                  status === "simran"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {status === "simran" ? "Read by Simran" : "Read by the built-in reader"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {GROUP_ORDER.map((groupId) => {
                const group = READING_GROUPS.find((item) => item.id === groupId);
                if (!group) return null;
                const rows = group.keys.filter((key) => values[key]);
                if (!rows.length) return null;
                return (
                  <fieldset
                    key={group.id}
                    className="rounded-xl border border-border bg-background/60 px-3 py-2.5"
                  >
                    <legend className="px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {group.label}
                    </legend>
                    <ul className="space-y-1.5">
                      {rows.map((key) => {
                        const field = reading.fields.find((item) => item.key === key);
                        if (!field) return null;
                        return (
                          <li key={key} className="flex items-start gap-2">
                            <input
                              id={`simran-accept-${key}`}
                              type="checkbox"
                              checked={accepted.has(key)}
                              onChange={() => toggle(key)}
                              className="mt-1 h-3.5 w-3.5 accent-amber-700"
                            />
                            <label
                              htmlFor={`simran-accept-${key}`}
                              className="min-w-0 flex-1 cursor-pointer text-xs leading-snug"
                            >
                              <span className="text-muted-foreground">{field.label}: </span>
                              <span className="font-medium">{field.value}</span>
                              {field.check && (
                                <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] uppercase tracking-wide text-amber-800">
                                  check
                                </span>
                              )}
                            </label>
                            <button
                              type="button"
                              onClick={() => onJump(key)}
                              className="mt-0.5 text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                            >
                              edit
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                );
              })}
            </div>

            {reading.events.length > 0 && (
              <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Extra celebrations
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {reading.events.map((event, index) => (
                    <li key={`${event.title}-${index}`} className="flex items-start gap-2 text-xs">
                      <input
                        id={`simran-event-${index}`}
                        type="checkbox"
                        checked={accepted.has("additionalEvents")}
                        onChange={() => toggle("additionalEvents")}
                        className="mt-1 h-3.5 w-3.5 accent-amber-700"
                      />
                      <label htmlFor={`simran-event-${index}`} className="cursor-pointer">
                        <span className="font-medium">{event.title}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          — {[event.date, event.time, event.venue].filter(Boolean).join(" · ")}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reading.theme && (
              <label className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={accepted.has("theme")}
                  onChange={() => toggle("theme")}
                  className="h-3.5 w-3.5 accent-amber-700"
                />
                Suggested theme: <strong>{reading.theme}</strong>
                <span className="text-muted-foreground">
                  (optional — the current theme stays unless ticked)
                </span>
              </label>
            )}

            {reading.missing.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber-800">
                  Still needs you
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {reading.missing.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onJump(item.key)}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 text-[11px] text-amber-900 hover:bg-white"
                    >
                      {item.label}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {reading.notes.length > 0 && (
              <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
                {reading.notes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button type="button" onClick={apply}>
                <CheckCircle2 className="mr-1 h-4 w-4" aria-hidden="true" />
                Use the ticked details
              </Button>
              <span className="text-xs text-muted-foreground">
                {accepted.size} ticked · only ticked lines are copied into the form
              </span>
              {applied > 0 && (
                <span role="status" className="text-xs font-medium text-emerald-700">
                  Added {applied} detail{applied === 1 ? "" : "s"} — check them below.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Apply the reviewed reading to the live form. */
export function applyReading(
  form: InvitationForm,
  reading: InvitationReading,
  accepted: string[],
): InvitationForm {
  return mergeReadingIntoForm(form, reading, accepted);
}
