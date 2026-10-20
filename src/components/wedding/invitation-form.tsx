import {
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { Check, CircleAlert, ImagePlus, Music2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InvitationForm } from "./invitation-form-data";
import { invitationArt } from "./invitation-art";
import {
  invitationCeremonyPresets,
  invitationDressCodePresets,
  invitationElementOptions,
  invitationFrameworks,
  invitationThemeCategories,
  invitationThemes,
} from "./invitation-options";
import { processInvitationPortrait } from "./portrait-upload";
import { INVITATION_SONG_LIMIT, suggestedInvitationSongs } from "./invitation-music";
import {
  getInvitationAssistantName,
  getInvitationDetails,
  parseInvitationDate,
} from "./invitation-details";
import { InvitationCover, PersonalInvitation } from "./invitation-template";
import { InvitationGalleryEditor } from "./invitation-gallery-editor";
import { SimranFormReader, applyReading } from "./form-assistant";
import type { InvitationReading, ReadingFieldKey } from "./invitation-import";

export const invitationEditorSections = [
  { id: "essentials", label: "Details" },
  { id: "design", label: "Design" },
  { id: "details", label: "Story" },
  { id: "events", label: "Events" },
  { id: "photos", label: "Photos" },
  { id: "songs", label: "Music" },
  { id: "elements", label: "Sections" },
  { id: "preview", label: "Preview" },
] as const;
export type InvitationEditorSection = (typeof invitationEditorSections)[number]["id"];
export function editorSectionForField(field: string): InvitationEditorSection {
  if (["theme", "framework"].includes(field)) return "design";
  if (["groomPhoto", "bridePhoto"].includes(field)) return "photos";
  if (field === "songs") return "songs";
  if (field === "additionalEvents") return "events";
  if (field === "elements") return "elements";
  if (
    [
      "message",
      "story",
      "hosts",
      "dressCode",
      "hashtag",
      "giftsNote",
      "livestreamUrl",
      "contactName",
      "contactPhone",
      "rsvpDeadline",
      "arrivalNotes",
    ].includes(field)
  )
    return "details";
  return "essentials";
}
type Props = {
  value: InvitationForm;
  onChange: Dispatch<SetStateAction<InvitationForm>>;
  compact?: boolean;
  section?: InvitationEditorSection;
  onSectionChange?: (section: InvitationEditorSection) => void;
  /** Present when editing a saved card, so the shared gallery can be managed. */
  cardId?: string;
  /** Simran, the form reader, is shown only for active print partners. */
  simran?: boolean;
};
function EditorPanel({
  compact,
  section,
  children,
}: {
  compact: boolean;
  section: string;
  children: ReactNode;
}) {
  return compact ? (
    <TabsContent value={section} className="editor-section-panel">
      {children}
    </TabsContent>
  ) : (
    <>{children}</>
  );
}
const requiredFields = [
  { key: "groomName", label: "Groom's name", placeholder: "Groom's name", limit: 80 },
  { key: "brideName", label: "Bride's name", placeholder: "Bride's name", limit: 80 },
  { key: "date", label: "Wedding date", placeholder: "15 December 2026 or 2026-12-15", limit: 100 },
  { key: "time", label: "Wedding time", placeholder: "4:00 PM IST", limit: 100 },
  { key: "venue", label: "Venue name", placeholder: "The Grand Palace", limit: 120 },
  {
    key: "address",
    label: "Venue address / city",
    placeholder: "Street, city and state",
    limit: 200,
  },
] as const;
/** Which editor step owns each field, so a missing detail can jump straight there. */
export function sectionForReadingField(key: ReadingFieldKey): InvitationEditorSection {
  if (key === "dressCode" || key === "hashtag" || key === "giftsNote" || key === "livestreamUrl")
    return "details";
  return "essentials";
}

function fieldDomId(key: ReadingFieldKey): string {
  return key === "eventType" ? "card-event-type" : `card-${key}`;
}

type SectionState = {
  id: InvitationEditorSection;
  label: string;
  ready: boolean;
  missing: string[];
};

/**
 * A partner can feel a form when it tells them what is done and what still
 * needs a human. This is the single source of that truth for the whole editor.
 */
function editorProgress(value: InvitationForm) {
  const missingEssentials: { key: ReadingFieldKey; label: string }[] = [
    { key: "title", label: "Card title" },
    ...requiredFields
      .filter((field) => !value[field.key].trim())
      .map((field) => ({ key: field.key as ReadingFieldKey, label: field.label as string })),
    ...(value.eventType.trim()
      ? []
      : [{ key: "eventType" as ReadingFieldKey, label: "Main ceremony" }]),
  ];
  if (value.date.trim() && !parseInvitationDate(value.date)) {
    missingEssentials.push({ key: "date", label: "A real wedding date" });
  }
  if (value.contactPhone.trim() && !/^[+0-9().\s-]*$/.test(value.contactPhone)) {
    missingEssentials.push({ key: "contactPhone", label: "A valid phone number" });
  }
  const eventsReady = value.additionalEvents.every(
    (event) => event.title.trim() && event.date.trim() && event.time.trim() && event.venue.trim(),
  );
  const songsReady = value.songs.every((song) => song.title.trim() && song.url.trim());
  const notesReady = true;

  const sections: SectionState[] = [
    {
      id: "essentials",
      label: "Details",
      ready: missingEssentials.length === 0,
      missing: missingEssentials.map((item) => item.label),
    },
    { id: "design", label: "Design", ready: !!value.theme && !!value.framework, missing: [] },
    { id: "details", label: "Story", ready: notesReady, missing: [] },
    {
      id: "events",
      label: "Events",
      ready: eventsReady,
      missing: eventsReady ? [] : ["Finish each extra event"],
    },
    { id: "photos", label: "Photos", ready: true, missing: [] },
    {
      id: "songs",
      label: "Music",
      ready: songsReady,
      missing: songsReady ? [] : ["Finish each song"],
    },
    { id: "elements", label: "Sections", ready: true, missing: [] },
    { id: "preview", label: "Preview", ready: true, missing: [] },
  ];
  return {
    sections,
    ready: sections.filter((section) => section.ready).length,
    missing: missingEssentials.map((item) => item.key),
  };
}

function EditorStatus({
  value,
  onJump,
}: {
  value: InvitationForm;
  onJump: (key: ReadingFieldKey) => void;
}) {
  const progress = useMemo(() => editorProgress(value), [value]);
  return (
    <div className="editor-status flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5">
      <span className="flex items-center gap-2 text-xs">
        {progress.missing.length === 0 ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        ) : (
          <CircleAlert className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
        )}
        <strong>
          {progress.ready} of {progress.sections.length} steps ready
        </strong>
        {progress.missing.length > 0 && (
          <span className="text-muted-foreground">
            {progress.missing.length} required{" "}
            {progress.missing.length === 1 ? "detail" : "details"} left
          </span>
        )}
      </span>
      <span className="flex flex-wrap gap-1.5">
        {progress.sections.map((section) => (
          <span
            key={section.id}
            title={
              section.ready
                ? `${section.label} is ready`
                : `${section.label}: ${section.missing.join(", ")}`
            }
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
              section.ready
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {section.ready ? "✓" : "•"} {section.label}
          </span>
        ))}
      </span>
      {progress.missing.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {progress.missing.slice(0, 4).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onJump(key)}
              className="rounded-full border border-amber-300 bg-background px-2 py-0.5 text-[10px] text-amber-900 hover:bg-amber-50"
            >
              {key === "title"
                ? "Card title"
                : (requiredFields.find((field) => field.key === key)?.label ??
                  (key === "eventType" ? "Main ceremony" : key))}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}

export function InvitationDetailsFields({
  value,
  onChange,
  compact = false,
  section,
  onSectionChange,
  cardId,
  simran = false,
}: Props) {
  const [localSection, setLocalSection] = useState<InvitationEditorSection>("essentials");
  const [photoBusy, setPhotoBusy] = useState<"groomPhoto" | "bridePhoto" | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  function change(key: keyof InvitationForm, next: string) {
    onChange((form) => ({ ...form, [key]: next }));
  }

  async function upload(key: "groomPhoto" | "bridePhoto", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoBusy(key);
    setPhotoError("");
    try {
      const photo = await processInvitationPortrait(file);
      onChange((form) => ({ ...form, [key]: photo }));
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : "Photo could not be processed.");
    } finally {
      setPhotoBusy(null);
      event.target.value = "";
    }
  }

  const assistantName = getInvitationAssistantName(getInvitationDetails(value));

  function addSong(song: { title: string; url: string } = { title: "", url: "" }) {
    onChange((form) =>
      form.songs.length >= INVITATION_SONG_LIMIT ? form : { ...form, songs: [...form.songs, song] },
    );
  }

  function updateSong(index: number, patch: Partial<{ title: string; url: string }>) {
    onChange((form) => ({
      ...form,
      songs: form.songs.map((song, position) =>
        position === index ? { ...song, ...patch } : song,
      ),
    }));
  }

  function removeSong(index: number) {
    onChange((form) => ({
      ...form,
      songs: form.songs.filter((_, position) => position !== index),
    }));
  }

  function goToSection(next: InvitationEditorSection) {
    setLocalSection(next);
    onSectionChange?.(next);
  }

  /** Take the partner to the exact input that still needs a human. */
  function jumpToField(key: ReadingFieldKey) {
    const target = sectionForReadingField(key);
    if (target !== (section ?? localSection)) goToSection(target);
    window.requestAnimationFrame(() => {
      const element = document.getElementById(fieldDomId(key));
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      (element as HTMLInputElement | null)?.focus({ preventScroll: true });
    });
  }

  function useReading(next: InvitationReading, accepted: string[]) {
    onChange((form) => applyReading(form, next, accepted));
  }

  return (
    <Tabs
      value={section ?? localSection}
      onValueChange={(next) => {
        setLocalSection(next as InvitationEditorSection);
        onSectionChange?.(next as InvitationEditorSection);
      }}
      className={
        compact ? "invitation-editor compact-invitation-editor" : "invitation-editor space-y-10"
      }
    >
      {compact && (
        <TabsList className="editor-section-tabs" aria-label="Invitation editor sections">
          {invitationEditorSections.map((item) => (
            <TabsTrigger key={item.id} value={item.id} type="button">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      )}
      <EditorPanel compact={compact} section="essentials">
        <section aria-labelledby="form-essentials" className="space-y-5">
          <div>
            <h2 id="form-essentials" className="font-serif text-2xl">
              01 — The card
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The four things every guest looks for: who, when, where and how to reply. Fields with{" "}
              <strong>*</strong> are printed on the card.
            </p>
          </div>

          <SimranFormReader enabled={simran} onApply={useReading} onJump={jumpToField} />

          <EditorStatus value={value} onJump={jumpToField} />

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-2 font-serif text-lg">The couple</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="card-title">Card title *</Label>
                <Input
                  id="card-title"
                  value={value.title}
                  onChange={(event) => change("title", event.target.value)}
                  placeholder="Our Wedding Celebration"
                  required
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground">
                  The line above your names. “Ayaan &amp; Zara — Nikah” works just as well as a
                  formal title.
                </p>
              </div>
              {(
                [
                  ["groomName", "Groom's name", "Groom's full name", 80],
                  ["brideName", "Bride's name", "Bride's full name", 80],
                ] as const
              ).map(([key, label, placeholder, limit]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`card-${key}`}>{label} *</Label>
                  <Input
                    id={`card-${key}`}
                    value={value[key]}
                    onChange={(event) => change(key, event.target.value)}
                    placeholder={placeholder}
                    required
                    maxLength={limit}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-2 font-serif text-lg">When</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="card-date">Wedding date *</Label>
                <Input
                  id="card-date"
                  value={value.date}
                  onChange={(event) => change("date", event.target.value)}
                  placeholder="15 December 2026 or 2026-12-15"
                  required
                  maxLength={100}
                  inputMode="text"
                  aria-invalid={!!value.date.trim() && !parseInvitationDate(value.date)}
                />
                <p className="text-xs text-muted-foreground">
                  {value.date.trim() && !parseInvitationDate(value.date)
                    ? "That date is not readable yet. Try 15 December 2026 or 2026-12-15."
                    : "Any clear date works — the countdown and calendar read it for you."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-time">Wedding time *</Label>
                <Input
                  id="card-time"
                  value={value.time}
                  onChange={(event) => change("time", event.target.value)}
                  placeholder="4:00 PM IST"
                  required
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  Add a time zone (IST, UTC) so Save the Date is exact.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-endTime">
                  End time <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="card-endTime"
                  value={value.endTime}
                  onChange={(event) => change("endTime", event.target.value)}
                  placeholder="10:00 PM IST"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  Used for the calendar block; without it we allow two hours.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-rsvpDeadline">Please RSVP by</Label>
                <Input
                  id="card-rsvpDeadline"
                  value={value.rsvpDeadline}
                  onChange={(event) => change("rsvpDeadline", event.target.value)}
                  placeholder="10 December 2026"
                  maxLength={100}
                />
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ["2 weeks before", -14],
                    ["1 month before", -30],
                  ].map(([label, days]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const parts = parseInvitationDate(value.date);
                        if (!parts) return;
                        const target = new Date(
                          Date.UTC(parts.year, parts.month - 1, parts.day + Number(days)),
                        );
                        change(
                          "rsvpDeadline",
                          `${target.getUTCDate()} ${target.toLocaleString("en-IN", {
                            month: "long",
                            timeZone: "UTC",
                          })} ${target.getUTCFullYear()}`,
                        );
                      }}
                      className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground hover:border-gold/70 hover:text-foreground"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-2 font-serif text-lg">Where</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="card-venue">Venue name *</Label>
                <Input
                  id="card-venue"
                  value={value.venue}
                  onChange={(event) => change("venue", event.target.value)}
                  placeholder="The Grand Palace"
                  required
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-address">Venue address / city *</Label>
                <Input
                  id="card-address"
                  value={value.address}
                  onChange={(event) => change("address", event.target.value)}
                  placeholder="Street, city and state"
                  required
                  maxLength={200}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="card-mapUrl">
                  Map or directions link{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="card-mapUrl"
                  value={value.mapUrl}
                  onChange={(event) => change("mapUrl", event.target.value)}
                  placeholder="https://maps.app.goo.gl/…"
                  inputMode="url"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank and the card builds a Google Maps search from the venue and address.
                </p>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-2 font-serif text-lg">The ceremony</legend>
            <div className="space-y-2">
              <Label htmlFor="card-event-type">Main ceremony *</Label>
              <Input
                id="card-event-type"
                value={value.eventType}
                onChange={(event) => change("eventType", event.target.value)}
                required
                maxLength={80}
                placeholder="Nikah, wedding ceremony, or reception"
              />
              <div className="flex flex-wrap gap-1.5">
                {invitationCeremonyPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      onChange((form) => ({
                        ...form,
                        eventType: preset.eventType,
                        ...(preset.riteLine ? { riteLine: preset.riteLine } : {}),
                      }))
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      value.eventType === preset.eventType
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border text-muted-foreground hover:border-gold/70 hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-rite-line">Blessing or opening line</Label>
              <Input
                id="card-rite-line"
                value={value.riteLine}
                onChange={(event) => change("riteLine", event.target.value)}
                maxLength={80}
                placeholder="A sacred celebration"
              />
              <p className="text-xs text-muted-foreground">
                The line above your names. On the Hindu themes it appears in Devanagari, for example
                “॥ शुभ विवाह ॥”. Leave blank for the default of your chosen theme.
              </p>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-2 font-serif text-lg">Hosts &amp; contact</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="card-hosts">Hosting families</Label>
                <Input
                  id="card-hosts"
                  value={value.hosts}
                  onChange={(event) => change("hosts", event.target.value)}
                  placeholder="Together with our families"
                  maxLength={160}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-hostName">
                  Host name{" "}
                  <span className="font-normal text-muted-foreground">
                    (your card&apos;s AI assistant takes this name)
                  </span>
                </Label>
                <Input
                  id="card-hostName"
                  value={value.hostName}
                  onChange={(event) => change("hostName", event.target.value)}
                  maxLength={60}
                  placeholder="Your name, e.g. Ayesha"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-contactName">Host contact name</Label>
                <Input
                  id="card-contactName"
                  value={value.contactName}
                  onChange={(event) => change("contactName", event.target.value)}
                  placeholder="The person guests can reach"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-contactPhone">Host phone</Label>
                <Input
                  id="card-contactPhone"
                  value={value.contactPhone}
                  onChange={(event) => change("contactPhone", event.target.value)}
                  placeholder="+91 98765 43210"
                  inputMode="tel"
                  maxLength={50}
                  aria-invalid={
                    !!value.contactPhone.trim() && !/^[+0-9().\s-]*$/.test(value.contactPhone)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-hashtag">
                  Wedding hashtag{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="card-hashtag"
                  value={value.hashtag}
                  onChange={(event) => change("hashtag", event.target.value)}
                  placeholder="#AyaanWedsZara"
                  maxLength={60}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The assistant name is taken from the host name, then the contact, then the family
              line.
            </p>
          </fieldset>

          <p className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-xs leading-relaxed">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span>
              Guests get an AI host assistant named <strong>{assistantName}</strong>. It answers
              only from this card&apos;s details, and you can change its name any time by editing
              the host name.
            </span>
          </p>
        </section>
      </EditorPanel>

      <EditorPanel compact={compact} section="design">
        <section aria-labelledby="form-design" className="space-y-6 border-t border-border pt-8">
          <div>
            <h2 id="form-design" className="font-serif text-2xl">
              02 — Make it yours
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick an atmosphere and a layout separately. Every combination uses your own wedding
              information.
            </p>
            {invitationThemes.find((theme) => theme.id === value.theme)?.layout && (
              <p className="mt-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-muted-foreground">
                This theme has its own opening structure and section styling, so it overrides the
                layout below. The Grand Curtain is the one exception and always parts its curtains.
              </p>
            )}
          </div>
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Theme *</legend>
            <div className="space-y-5">
              {invitationThemeCategories.map((category) => {
                const themes = invitationThemes.filter((theme) => theme.category === category.id);
                if (!themes.length) return null;
                return (
                  <section
                    key={category.id}
                    aria-label={category.label}
                    className="invitation-theme-group"
                  >
                    <header className="mb-2 flex flex-wrap items-baseline gap-x-2">
                      <h3 className="font-serif text-lg">{category.label}</h3>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </header>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {themes.map((theme) => (
                        <label
                          key={theme.id}
                          className={`invitation-choice group cursor-pointer overflow-hidden rounded-xl border-2 transition ${value.theme === theme.id ? "border-gold shadow-gold" : "border-border hover:border-gold/70"}`}
                        >
                          <input
                            type="radio"
                            name="invitation-theme"
                            value={theme.id}
                            checked={value.theme === theme.id}
                            onChange={() => onChange((form) => ({ ...form, theme: theme.id }))}
                            className="sr-only"
                          />
                          <div
                            className="relative h-20 overflow-hidden"
                            style={{ backgroundColor: theme.swatch }}
                          >
                            <img
                              src={invitationArt[theme.id]}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-3 text-sm font-semibold text-white">
                              {theme.label}
                            </span>
                          </div>
                          <p className="min-h-12 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                            {theme.description}
                          </p>
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Framework / layout *</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {invitationFrameworks.map((framework) => (
                <label
                  key={framework.id}
                  className={`invitation-choice cursor-pointer rounded-xl border-2 p-4 transition ${value.framework === framework.id ? "border-gold bg-gold/10 shadow-gold" : "border-border hover:border-gold/70"}`}
                >
                  <input
                    type="radio"
                    name="invitation-framework"
                    value={framework.id}
                    checked={value.framework === framework.id}
                    onChange={() => onChange((form) => ({ ...form, framework: framework.id }))}
                    className="sr-only"
                  />
                  <span
                    data-framework={framework.id}
                    className="invitation-framework-mark mb-4 flex h-14 items-center justify-center border border-gold/30 bg-muted/50 font-serif text-2xl text-gold"
                    aria-hidden="true"
                  >
                    A <span className="mx-2 font-script">&</span> B
                  </span>
                  <span className="block font-serif text-lg">{framework.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {framework.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      </EditorPanel>

      <EditorPanel compact={compact} section="details">
        <section aria-labelledby="form-details" className="space-y-5 border-t border-border pt-8">
          <div>
            <h2 id="form-details" className="font-serif text-2xl">
              03 — Tell your story
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Optional details add meaning to your invitation. The visibility choices below decide
              which sections guests see.
            </p>
          </div>
          <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
            <legend className="px-2 font-serif text-lg">The words</legend>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="card-message">A personal note</Label>
              <Textarea
                id="card-message"
                value={value.message}
                onChange={(event) => change("message", event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="What you would like your guests to know…"
              />
              <p className="text-xs text-muted-foreground">
                Appears as “A Note From Us”. Leave blank for a gentle default.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="card-story">Our story</Label>
              <Textarea
                id="card-story"
                value={value.story}
                onChange={(event) => change("story", event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="How your journey began…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="card-arrival">Arrival / parking notes</Label>
              <Textarea
                id="card-arrival"
                value={value.arrivalNotes}
                onChange={(event) => change("arrivalNotes", event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Parking, accessibility, accommodation…"
              />
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
            <legend className="px-2 font-serif text-lg">Dress &amp; gifts</legend>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="card-dressCode">Dress code</Label>
              <Input
                id="card-dressCode"
                value={value.dressCode}
                onChange={(event) => change("dressCode", event.target.value)}
                placeholder="Festive traditional attire"
                maxLength={160}
              />
              <div className="flex flex-wrap gap-1.5">
                {invitationDressCodePresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => change("dressCode", preset)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                      value.dressCode === preset
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border text-muted-foreground hover:border-gold/70 hover:text-foreground"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="card-giftsNote">
                Gifts &amp; blessings{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="card-giftsNote"
                value={value.giftsNote}
                onChange={(event) => change("giftsNote", event.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Your presence and duas are the only gift we ask for."
              />
              <p className="text-xs text-muted-foreground">
                Printed in a quiet Gifts section; hide it any time in Sections.
              </p>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
            <legend className="px-2 font-serif text-lg">For guests far away</legend>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="card-livestreamUrl">
                Live stream link{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="card-livestreamUrl"
                value={value.livestreamUrl}
                onChange={(event) => change("livestreamUrl", event.target.value)}
                placeholder="https://youtube.com/live/…"
                inputMode="url"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                A YouTube, Zoom or Meet link for family who cannot travel.
              </p>
            </div>
          </fieldset>
        </section>
      </EditorPanel>

      <EditorPanel compact={compact} section="events">
        <section aria-labelledby="form-events" className="space-y-4 border-t border-border pt-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="form-events" className="font-serif text-2xl">
                04 — More celebrations
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add up to four extra events, such as the sangeet or reception.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={value.additionalEvents.length >= 4}
              onClick={() =>
                onChange((form) => ({
                  ...form,
                  additionalEvents: [
                    ...form.additionalEvents,
                    { title: "", date: "", time: "", venue: "", address: "" },
                  ],
                }))
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add event
            </Button>
          </div>
          {value.additionalEvents.map((event, index) => (
            <fieldset key={index} className="rounded-xl border border-border p-4">
              <legend className="px-2 font-serif text-lg">Event {index + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["title", "date", "time", "venue", "address"] as const).map((key) => (
                  <div
                    key={key}
                    className={`space-y-2 ${key === "address" ? "sm:col-span-2" : ""}`}
                  >
                    <Label htmlFor={`event-${index}-${key}`}>
                      {key === "title" ? "Event name" : key[0].toUpperCase() + key.slice(1)}
                      {key !== "address" && " *"}
                    </Label>
                    <Input
                      id={`event-${index}-${key}`}
                      value={event[key]}
                      required={key !== "address"}
                      maxLength={key === "address" ? 200 : key === "venue" ? 120 : 100}
                      placeholder={
                        key === "date"
                          ? "16 December 2026"
                          : key === "time"
                            ? "7:00 PM IST"
                            : undefined
                      }
                      onChange={(e) =>
                        onChange((form) => ({
                          ...form,
                          additionalEvents: form.additionalEvents.map((item, i) =>
                            i === index ? { ...item, [key]: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 text-destructive"
                onClick={() =>
                  onChange((form) => ({
                    ...form,
                    additionalEvents: form.additionalEvents.filter((_, i) => i !== index),
                  }))
                }
              >
                <Trash2 className="mr-1 h-4 w-4" /> Remove event
              </Button>
            </fieldset>
          ))}
        </section>
      </EditorPanel>

      <EditorPanel compact={compact} section="photos">
        <section aria-labelledby="form-photos" className="space-y-4 border-t border-border pt-8">
          <div>
            <h2 id="form-photos" className="font-serif text-2xl">
              05 — Your portraits
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Optional groom and bride photos. JPEG, PNG or WebP up to 8 MB; compressed to a small
              JPEG in your card. Never sent to a third-party image host.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["groomPhoto", "bridePhoto"] as const).map((key) => (
              <div
                key={key}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4"
              >
                {value[key] ? (
                  <img
                    src={value[key]}
                    alt={`${key === "groomPhoto" ? "Groom" : "Bride"} portrait preview`}
                    className="h-20 w-20 rounded-full border-2 border-gold object-cover"
                  />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-gold text-gold">
                    <ImagePlus aria-hidden="true" />
                  </span>
                )}
                <div className="space-y-2">
                  <Label
                    htmlFor={`photo-${key}`}
                    className="block cursor-pointer underline underline-offset-4"
                  >
                    {photoBusy === key
                      ? "Processing photo…"
                      : `Choose ${key === "groomPhoto" ? "groom" : "bride"} photo`}
                  </Label>
                  <Input
                    id={`photo-${key}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={photoBusy !== null}
                    onChange={(event) => {
                      void upload(key, event);
                    }}
                    className="max-w-48 cursor-pointer text-xs"
                  />
                  {value[key] && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="block text-destructive"
                      onClick={() => onChange((form) => ({ ...form, [key]: null }))}
                    >
                      Remove photo
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {photoError && (
            <p role="alert" className="text-sm text-destructive">
              {photoError}
            </p>
          )}
          <InvitationGalleryEditor cardId={cardId} />
        </section>
      </EditorPanel>

      <EditorPanel compact={compact} section="songs">
        <section aria-labelledby="form-songs" className="space-y-4 border-t border-border pt-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="form-songs" className="font-serif text-2xl">
                06 — Your soundtrack
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add up to {INVITATION_SONG_LIMIT} songs for guests to play from the invitation. Your
                AI host assistant can also answer questions about this playlist.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={value.songs.length >= INVITATION_SONG_LIMIT}
              onClick={() => addSong()}
            >
              <Plus className="mr-1 h-4 w-4" /> Add song
            </Button>
          </div>

          {value.songs.length === 0 && (
            <div className="rounded-xl border border-dashed border-gold/40 bg-gold/5 px-5 py-6 text-center text-sm text-muted-foreground">
              <Music2 className="mx-auto mb-2 h-6 w-6 text-gold" aria-hidden="true" />
              No songs yet. Add your first dance, a gentle mehfil tune, or use a quick-add below.
            </div>
          )}

          {value.songs.map((song, index) => (
            <fieldset key={index} className="rounded-xl border border-border p-4">
              <legend className="px-2 font-serif text-lg">Song {index + 1}</legend>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                <div className="space-y-2">
                  <Label htmlFor={`song-title-${index}`}>Title *</Label>
                  <Input
                    id={`song-title-${index}`}
                    value={song.title}
                    maxLength={80}
                    required
                    placeholder="Moonlit Dua"
                    onChange={(event) => updateSong(index, { title: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`song-url-${index}`}>Audio link *</Label>
                  <Input
                    id={`song-url-${index}`}
                    value={song.url}
                    maxLength={500}
                    required
                    inputMode="url"
                    placeholder="https://example.com/song.mp3 or /audio/moonlit-dua.mp3"
                    onChange={(event) => updateSong(index, { url: event.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeSong(index)}
                    aria-label={`Remove song ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </fieldset>
          ))}

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Quick add from the local soundtrack
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedInvitationSongs.map((song) => {
                const added = value.songs.some((item) => item.url === song.url);
                return (
                  <button
                    key={song.url}
                    type="button"
                    disabled={value.songs.length >= INVITATION_SONG_LIMIT || added}
                    onClick={() => addSong({ title: song.title, url: song.url })}
                    className="rounded-full border border-gold/40 bg-gold/5 px-3 py-1.5 text-xs text-foreground transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {added ? "✓ " : "+ "}
                    {song.title}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use an <code>https://</code> audio URL you have permission to share, or one of the
            bundled <code>/audio/</code> files. Guests press play themselves; nothing auto-plays.
          </p>
        </section>
      </EditorPanel>

      <EditorPanel compact={compact} section="elements">
        <section aria-labelledby="form-elements" className="space-y-4 border-t border-border pt-8">
          <div>
            <h2 id="form-elements" className="font-serif text-2xl">
              07 — What guests see
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose each optional part independently. Names, wedding date, time, venue and address
              always stay visible.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {invitationElementOptions.map(({ id, label, description }) => (
              <label
                key={id}
                className="invitation-choice flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:border-gold/70"
              >
                <input
                  type="checkbox"
                  checked={value.elements[id]}
                  onChange={(e) =>
                    onChange((form) => ({
                      ...form,
                      elements: { ...form.elements, [id]: e.target.checked },
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-amber-700"
                />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      </EditorPanel>

      <EditorPanel compact={compact} section="preview">
        <section className="border-t border-border pt-8" aria-label="Design preview">
          <div className="mx-auto max-w-sm">
            <p className="mb-3 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Live cover preview
            </p>
            <InvitationCover content={value} />
          </div>
          <div className="mt-5 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPreview((current) => !current)}
              aria-expanded={showPreview}
            >
              {showPreview ? "Close full preview" : "Preview full invitation"}
            </Button>
          </div>
          {showPreview && (
            <div className="mt-5 max-h-[75vh] overflow-y-auto rounded-xl border border-border shadow-lg">
              <PersonalInvitation
                title={value.title || "Your invitation"}
                content={value}
                showGate={false}
                preview
                cardId={cardId}
              />
            </div>
          )}
        </section>
      </EditorPanel>
    </Tabs>
  );
}
