import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
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
  readingValues,
  readInvitationText,
  type InvitationReading,
  type ReadingFieldKey,
} from "./invitation-import";
import type { InvitationForm } from "./invitation-form-data";

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
  enabled: boolean;
  onApply: (reading: InvitationReading, accepted: string[]) => void;
  onJump: (key: ReadingFieldKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [reading, setReading] = useState<InvitationReading | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!enabled) return null;

  const values = reading ? readingValues(reading) : {};

  function selectDefaults(next: InvitationReading) {
    const checked = new Set<string>(
      next.fields.filter((field) => !field.check).map((field) => field.key),
    );
    if (next.events.length) checked.add("additionalEvents");
    setAccepted(checked);
  }

  async function read() {
    if (text.trim().length < 12) {
      setError("Paste a few lines with names, date, and venue.");
      return;
    }
    setError("");
    const local = readInvitationText(text);
    setReading(local);
    selectDefaults(local);
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? "";
      if (!accessToken) throw new Error("Sign in again.");
      const result = await readInvitationNotes({
        data: { text, accessToken, visitor: getAiVisitorId() },
      });
      setReading(result.reading);
      selectDefaults(result.reading);
    } catch {
      // Built-in local reader result is already shown.
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
    setOpen(false);
  }

  function reset() {
    setText("");
    setReading(null);
    setAccepted(new Set());
    setError("");
  }

  return (
    <div className="admin-autofill rounded-xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted/40"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />
          Auto-fill from text
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 py-4">
          <Textarea
            id="simran-notes"
            aria-label="Paste wedding notes"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Paste WhatsApp notes or card copy (names, date, time, venue)…"
            className="bg-background text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => void read()} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              )}
              {busy ? "Extracting…" : "Extract fields"}
            </Button>
            {!text && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setText(SAMPLE)}
                disabled={busy}
              >
                Try sample
              </Button>
            )}
            {(reading || text) && (
              <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={busy}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </Button>
            )}
          </div>

          {error && (
            <p role="status" className="flex items-center gap-1.5 text-xs text-amber-700">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          {reading && (
            <div className="space-y-3 pt-1">
              <div className="grid gap-2.5 sm:grid-cols-2">
                {GROUP_ORDER.map((groupId) => {
                  const group = READING_GROUPS.find((item) => item.id === groupId);
                  if (!group) return null;
                  const rows = group.keys.filter((key) => values[key]);
                  if (!rows.length) return null;
                  return (
                    <div
                      key={group.id}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                        {group.label}
                      </p>
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
                                className="mt-0.5 h-3.5 w-3.5 accent-emerald-700"
                              />
                              <label
                                htmlFor={`simran-accept-${key}`}
                                className="min-w-0 flex-1 cursor-pointer text-xs"
                              >
                                <span className="text-muted-foreground">{field.label}: </span>
                                <span className="font-medium">{field.value}</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => onJump(key)}
                                className="text-[11px] text-muted-foreground underline hover:text-foreground"
                              >
                                edit
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {reading.events.length > 0 && (
                <div className="rounded-lg border border-border bg-background p-3">
                  <ul className="space-y-1">
                    {reading.events.map((event, index) => (
                      <li
                        key={`${event.title}-${index}`}
                        className="flex items-start gap-2 text-xs"
                      >
                        <input
                          id={`simran-event-${index}`}
                          type="checkbox"
                          checked={accepted.has("additionalEvents")}
                          onChange={() => toggle("additionalEvents")}
                          className="mt-0.5 h-3.5 w-3.5 accent-emerald-700"
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

              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={apply} disabled={accepted.size === 0}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Apply ({accepted.size})
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function applyReading(
  form: InvitationForm,
  reading: InvitationReading,
  accepted: string[],
): InvitationForm {
  return mergeReadingIntoForm(form, reading, accepted);
}
