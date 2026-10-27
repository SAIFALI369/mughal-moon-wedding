import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import {
  CalendarHeart,
  Check,
  Clapperboard,
  Eye,
  ImagePlus,
  ListChecks,
  Lock,
  Music2,
  Palette,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InvitationPreview } from "@/components/platform/invitation-preview";
import type { InvitationForm } from "./invitation-form-data";
import { ThemeLoop } from "./theme-loop";
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
import {
  INVITATION_SONG_LIMIT,
  defaultSongTitleForUrl,
  resolveSongSource,
  suggestedInvitationSongs,
} from "./invitation-music";
import { formatDdMmYyyyTyping, validateInvitationFormDate } from "./invitation-details";
import { InvitationCover } from "./invitation-template";
import { InvitationGalleryEditor } from "./invitation-gallery-editor";
import { SimranFormReader, applyReading } from "./form-assistant";
import type { InvitationReading, ReadingFieldKey } from "./invitation-import";

export const invitationEditorSections = [
  { id: "essentials", label: "Details", icon: CalendarHeart },
  { id: "design", label: "Design", icon: Palette },
  { id: "details", label: "Story", icon: ScrollText },
  { id: "events", label: "Events", icon: Clapperboard },
  { id: "photos", label: "Photos", icon: ImagePlus },
  { id: "songs", label: "Music", icon: Music2 },
  { id: "elements", label: "Sections", icon: ListChecks },
  { id: "preview", label: "Preview", icon: Eye },
] as const;

export type InvitationEditorSection = (typeof invitationEditorSections)[number]["id"];

export function editorSectionForField(field: string): InvitationEditorSection {
  if (["theme", "framework"].includes(field)) return "design";
  if (["groomPhoto", "bridePhoto"].includes(field)) return "photos";
  if (field === "songs") return "songs";
  if (field === "additionalEvents") return "events";
  if (field === "elements") return "elements";
  if (
    ["message", "story", "dressCode", "giftsNote", "livestreamUrl", "arrivalNotes"].includes(field)
  )
    return "details";
  return "essentials";
}

export function sectionForReadingField(key: ReadingFieldKey): InvitationEditorSection {
  if (key === "dressCode" || key === "giftsNote" || key === "livestreamUrl") return "details";
  return "essentials";
}

function fieldDomId(key: ReadingFieldKey): string {
  return key === "eventType" ? "card-event-type" : `card-${key}`;
}

type Props = {
  value: InvitationForm;
  onChange: Dispatch<SetStateAction<InvitationForm>>;
  compact?: boolean;
  section?: InvitationEditorSection;
  onSectionChange?: (section: InvitationEditorSection) => void;
  cardId?: string;
  simran?: boolean;
  coupleLocked?: boolean;
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

export function InvitationDetailsFields({
  value,
  onChange,
  compact = false,
  section,
  onSectionChange,
  cardId,
  simran = false,
  coupleLocked = false,
}: Props) {
  const [localSection, setLocalSection] = useState<InvitationEditorSection>("essentials");
  const [themeCategory, setThemeCategory] = useState<string>("all");
  const [photoBusy, setPhotoBusy] = useState<"groomPhoto" | "bridePhoto" | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [showFullPreview, setShowFullPreview] = useState(false);

  function change(key: keyof InvitationForm, next: string) {
    if (coupleLocked && (key === "title" || key === "groomName" || key === "brideName")) {
      return;
    }
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

  function addSong(song: { title: string; url: string } = { title: "", url: "" }) {
    onChange((form) =>
      form.songs.length >= INVITATION_SONG_LIMIT ? form : { ...form, songs: [...form.songs, song] },
    );
  }

  function updateSong(index: number, patch: Partial<{ title: string; url: string }>) {
    onChange((form) => ({
      ...form,
      songs: form.songs.map((song, position) => {
        if (position !== index) return song;
        const nextUrl = patch.url ?? song.url;
        const nextTitle =
          patch.title !== undefined
            ? patch.title
            : !song.title.trim() && nextUrl.trim() && resolveSongSource(nextUrl)
              ? defaultSongTitleForUrl(nextUrl, index)
              : song.title;
        return { ...song, ...patch, title: nextTitle };
      }),
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
    const allowed = coupleLocked
      ? accepted.filter((key) => key !== "groomName" && key !== "brideName" && key !== "title")
      : accepted;
    onChange((form) => applyReading(form, next, allowed));
  }

  const [touchedDates, setTouchedDates] = useState<Record<string, boolean>>({});
  const markDateTouched = (fieldId: string) =>
    setTouchedDates((prev) => (prev[fieldId] ? prev : { ...prev, [fieldId]: true }));
  const dateFieldError = (raw: string, fieldId: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const shouldShow =
      Boolean(touchedDates[fieldId]) || trimmed.length >= 10 || !/^[\d/]+$/.test(trimmed);
    return shouldShow ? validateInvitationFormDate(trimmed) : null;
  };
  const mainDateError = dateFieldError(value.date, "card-date");
  const rsvpDateError = dateFieldError(value.rsvpDeadline, "card-rsvpDeadline");
  const invalidPhone = !!value.contactPhone.trim() && !/^[+0-9().\s-]*$/.test(value.contactPhone);
  const currentSection = (section ?? localSection) as InvitationEditorSection;
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const editorStepIndex = Math.max(
    0,
    invitationEditorSections.findIndex((item) => item.id === currentSection),
  );

  // On a phone the section rail is wider than the screen: keep the live chip centred.
  useEffect(() => {
    const rail = tabsRef.current;
    if (!rail) return;
    const active = rail.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
    if (!active || typeof active.scrollIntoView !== "function") return;
    if (typeof window !== "undefined" && window.innerWidth >= 768) return;
    active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentSection]);

  const visibleThemes =
    themeCategory === "all"
      ? invitationThemes
      : invitationThemes.filter((theme) => theme.category === themeCategory);

  return (
    <Tabs
      value={currentSection}
      onValueChange={(next) => {
        setLocalSection(next as InvitationEditorSection);
        onSectionChange?.(next as InvitationEditorSection);
      }}
      className={
        compact ? "invitation-editor compact-invitation-editor" : "invitation-editor space-y-8"
      }
    >
      {compact && (
        <div className="editor-mobile-head">
          <div className="editor-mobile-step">
            <div className="editor-mobile-step-copy">
              <span className="editor-mobile-step-label">
                Step {editorStepIndex + 1} of {invitationEditorSections.length}
                <strong>{invitationEditorSections[editorStepIndex]?.label}</strong>
              </span>
              <span className="editor-mobile-step-track">
                <span
                  style={{
                    width: `${((editorStepIndex + 1) / invitationEditorSections.length) * 100}%`,
                  }}
                />
              </span>
            </div>
            {currentSection !== "preview" && (
              <button
                type="button"
                className="editor-mobile-preview-btn"
                onClick={() => {
                  setLocalSection("preview");
                  onSectionChange?.("preview");
                }}
              >
                <Eye size={15} aria-hidden="true" />
                Preview
              </button>
            )}
          </div>
          <TabsList
            ref={tabsRef}
            className="editor-section-tabs"
            aria-label="Invitation editor sections"
          >
            {invitationEditorSections.map((item) => (
              <TabsTrigger key={item.id} value={item.id} type="button">
                <item.icon className="editor-tab-icon" size={15} aria-hidden="true" />
                <span>{item.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      )}

      {/* 1. DETAILS */}
      <EditorPanel compact={compact} section="essentials">
        <section aria-label="Wedding details" className="admin-form-section space-y-6">
          {coupleLocked ? (
            <p
              role="note"
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
            >
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Couple names and card title are locked after publishing. Design, music, photos, and
                event details remain editable.
              </span>
            </p>
          ) : (
            <SimranFormReader enabled={simran} onApply={useReading} onJump={jumpToField} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="card-title" className="inline-flex items-center gap-1.5">
                Card title *
                {coupleLocked && (
                  <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                )}
              </Label>
              <Input
                id="card-title"
                value={value.title}
                onChange={(event) => change("title", event.target.value)}
                placeholder="Ayaan & Zara"
                required
                maxLength={120}
                disabled={coupleLocked}
                readOnly={coupleLocked}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-groomName" className="inline-flex items-center gap-1.5">
                Groom&apos;s name *
                {coupleLocked && (
                  <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                )}
              </Label>
              <Input
                id="card-groomName"
                value={value.groomName}
                onChange={(event) => change("groomName", event.target.value)}
                placeholder="Ayaan"
                required
                maxLength={80}
                autoComplete="off"
                disabled={coupleLocked}
                readOnly={coupleLocked}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-brideName" className="inline-flex items-center gap-1.5">
                Bride&apos;s name *
                {coupleLocked && (
                  <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                )}
              </Label>
              <Input
                id="card-brideName"
                value={value.brideName}
                onChange={(event) => change("brideName", event.target.value)}
                placeholder="Zara"
                required
                maxLength={80}
                autoComplete="off"
                disabled={coupleLocked}
                readOnly={coupleLocked}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-event-type">Ceremony *</Label>
              <Input
                id="card-event-type"
                value={value.eventType}
                onChange={(event) => change("eventType", event.target.value)}
                required
                maxLength={80}
                placeholder="Nikah / Wedding / Reception"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
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
                    className={`admin-chip ${value.eventType === preset.eventType ? "is-active" : ""}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-rite-line">Opening blessing</Label>
              <Input
                id="card-rite-line"
                value={value.riteLine}
                onChange={(event) => change("riteLine", event.target.value)}
                maxLength={80}
                placeholder="Optional top line"
              />
            </div>
          </div>

          <div className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="card-date">Date * (DD/MM/YYYY)</Label>
              <Input
                id="card-date"
                inputMode="numeric"
                value={value.date}
                onChange={(event) =>
                  change("date", formatDdMmYyyyTyping(event.target.value, value.date))
                }
                onBlur={() => markDateTouched("card-date")}
                placeholder="DD/MM/YYYY"
                required
                maxLength={10}
                aria-invalid={Boolean(mainDateError)}
              />
              {mainDateError && <p className="text-xs text-destructive">{mainDateError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-time">Time *</Label>
              <Input
                id="card-time"
                value={value.time}
                onChange={(event) => change("time", event.target.value)}
                placeholder="4:00 PM IST"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-endTime">End time</Label>
              <Input
                id="card-endTime"
                value={value.endTime}
                onChange={(event) => change("endTime", event.target.value)}
                placeholder="Optional (e.g. 10:00 PM)"
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-rsvpDeadline">RSVP by (DD/MM/YYYY)</Label>
              <Input
                id="card-rsvpDeadline"
                inputMode="numeric"
                value={value.rsvpDeadline}
                onChange={(event) =>
                  change(
                    "rsvpDeadline",
                    formatDdMmYyyyTyping(event.target.value, value.rsvpDeadline),
                  )
                }
                onBlur={() => markDateTouched("card-rsvpDeadline")}
                placeholder="DD/MM/YYYY (optional)"
                maxLength={10}
                aria-invalid={Boolean(rsvpDateError)}
              />
              {rsvpDateError && <p className="text-xs text-destructive">{rsvpDateError}</p>}
            </div>
          </div>

          <div className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="card-venue">Venue *</Label>
              <Input
                id="card-venue"
                value={value.venue}
                onChange={(event) => change("venue", event.target.value)}
                placeholder="The Grand Palace"
                required
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-address">Address / City *</Label>
              <Input
                id="card-address"
                value={value.address}
                onChange={(event) => change("address", event.target.value)}
                placeholder="Street, city, state"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="card-mapUrl">Google Maps link</Label>
              <Input
                id="card-mapUrl"
                value={value.mapUrl}
                onChange={(event) => change("mapUrl", event.target.value)}
                placeholder="Optional — auto-generated from venue if blank"
                inputMode="url"
                maxLength={500}
              />
            </div>
          </div>

          <div className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="card-hosts">Hosted by</Label>
              <Input
                id="card-hosts"
                value={value.hosts}
                onChange={(event) => change("hosts", event.target.value)}
                placeholder="Together with our families"
                maxLength={160}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-hostName">AI host name</Label>
              <Input
                id="card-hostName"
                value={value.hostName}
                onChange={(event) => change("hostName", event.target.value)}
                maxLength={60}
                placeholder="e.g. Ayesha"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-hashtag">Hashtag</Label>
              <Input
                id="card-hashtag"
                value={value.hashtag}
                onChange={(event) => change("hashtag", event.target.value)}
                placeholder="#AyaanWedsZara"
                maxLength={60}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-contactName">Contact person</Label>
              <Input
                id="card-contactName"
                value={value.contactName}
                onChange={(event) => change("contactName", event.target.value)}
                placeholder="Optional"
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-contactPhone">Contact phone</Label>
              <Input
                id="card-contactPhone"
                value={value.contactPhone}
                onChange={(event) => change("contactPhone", event.target.value)}
                placeholder="+91 98765 43210"
                inputMode="tel"
                maxLength={50}
                aria-invalid={invalidPhone}
              />
              {invalidPhone && <p className="text-xs text-destructive">Enter digits and + only.</p>}
            </div>
          </div>
        </section>
      </EditorPanel>

      {/* 2. DESIGN */}
      <EditorPanel compact={compact} section="design">
        <section
          aria-label="Design"
          className={`space-y-6 ${compact ? "" : "border-t border-border pt-6"}`}
        >
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">Theme</legend>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setThemeCategory("all")}
                className={`admin-chip ${themeCategory === "all" ? "is-active" : ""}`}
              >
                All ({invitationThemes.length})
              </button>
              {invitationThemeCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setThemeCategory(category.id)}
                  className={`admin-chip ${themeCategory === category.id ? "is-active" : ""}`}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {visibleThemes.map((theme) => {
                const selected = value.theme === theme.id;
                return (
                  <label
                    key={theme.id}
                    className={`invitation-choice group relative cursor-pointer overflow-hidden rounded-xl border transition ${
                      selected
                        ? "border-foreground ring-2 ring-foreground/15"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="invitation-theme"
                      value={theme.id}
                      checked={selected}
                      onChange={() => onChange((form) => ({ ...form, theme: theme.id }))}
                      className="sr-only"
                    />
                    <div
                      className="relative h-24 overflow-hidden"
                      style={{ backgroundColor: theme.swatch }}
                    >
                      <img
                        src={invitationArt[theme.id]}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <ThemeLoop theme={theme.id} className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                      {selected && (
                        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-white text-black shadow-sm">
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2.5 right-2.5 truncate text-xs font-medium text-white">
                        {theme.label}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-3 border-t border-border pt-5">
            <legend className="text-sm font-medium text-foreground">Layout</legend>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {invitationFrameworks.map((framework) => {
                const selected = value.framework === framework.id;
                return (
                  <label
                    key={framework.id}
                    className={`invitation-choice flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-sm font-medium transition ${
                      selected
                        ? "border-foreground bg-muted/60 text-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="invitation-framework"
                      value={framework.id}
                      checked={selected}
                      onChange={() => onChange((form) => ({ ...form, framework: framework.id }))}
                      className="sr-only"
                    />
                    <span className="truncate">{framework.label}</span>
                    {selected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>
      </EditorPanel>

      {/* 3. STORY & NOTES */}
      <EditorPanel compact={compact} section="details">
        <section
          aria-label="Story and notes"
          className={`grid gap-4 sm:grid-cols-2 ${compact ? "" : "border-t border-border pt-6"}`}
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="card-message">Welcome message</Label>
            <Textarea
              id="card-message"
              value={value.message}
              onChange={(event) => change("message", event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="A warm note for your guests…"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="card-story">Our story</Label>
            <Textarea
              id="card-story"
              value={value.story}
              onChange={(event) => change("story", event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Optional couple story…"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="card-dressCode">Dress code</Label>
            <Input
              id="card-dressCode"
              value={value.dressCode}
              onChange={(event) => change("dressCode", event.target.value)}
              placeholder="Festive traditional attire"
              maxLength={160}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {invitationDressCodePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => change("dressCode", preset)}
                  className={`admin-chip ${value.dressCode === preset ? "is-active" : ""}`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-arrival">Arrival / parking notes</Label>
            <Textarea
              id="card-arrival"
              value={value.arrivalNotes}
              onChange={(event) => change("arrivalNotes", event.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-giftsNote">Gifts note</Label>
            <Textarea
              id="card-giftsNote"
              value={value.giftsNote}
              onChange={(event) => change("giftsNote", event.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Your blessings are the only gift we need."
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="card-livestreamUrl">Livestream link</Label>
            <Input
              id="card-livestreamUrl"
              value={value.livestreamUrl}
              onChange={(event) => change("livestreamUrl", event.target.value)}
              placeholder="https://youtube.com/live/…"
              inputMode="url"
              maxLength={500}
            />
          </div>
        </section>
      </EditorPanel>

      {/* 4. EXTRA EVENTS */}
      <EditorPanel compact={compact} section="events">
        <section
          aria-label="Additional events"
          className={`space-y-4 ${compact ? "" : "border-t border-border pt-6"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              Extra events ({value.additionalEvents.length}/4)
            </p>
            <Button
              type="button"
              size="sm"
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

          {value.additionalEvents.length === 0 && (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No extra events added (e.g. Mehndi, Sangeet, Walima).
            </p>
          )}

          {value.additionalEvents.map((event, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Event {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive"
                  onClick={() =>
                    onChange((form) => ({
                      ...form,
                      additionalEvents: form.additionalEvents.filter((_, i) => i !== index),
                    }))
                  }
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove event
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["title", "date", "time", "venue", "address"] as const).map((key) => {
                  const fieldId = `event-${index}-${key}`;
                  const eventDateError =
                    key === "date" ? dateFieldError(event.date, fieldId) : null;
                  return (
                    <div
                      key={key}
                      className={`space-y-1.5 ${key === "address" ? "sm:col-span-2" : ""}`}
                    >
                      <Label htmlFor={fieldId}>
                        {key === "title"
                          ? "Event name"
                          : key === "date"
                            ? "Date (DD/MM/YYYY)"
                            : key[0].toUpperCase() + key.slice(1)}
                        {key !== "address" && " *"}
                      </Label>
                      <Input
                        id={fieldId}
                        inputMode={key === "date" ? "numeric" : undefined}
                        value={event[key]}
                        required={key !== "address"}
                        maxLength={
                          key === "date"
                            ? 10
                            : key === "address"
                              ? 200
                              : key === "venue"
                                ? 120
                                : 100
                        }
                        aria-invalid={eventDateError ? true : undefined}
                        placeholder={
                          key === "date" ? "DD/MM/YYYY" : key === "time" ? "7:00 PM IST" : undefined
                        }
                        onBlur={key === "date" ? () => markDateTouched(fieldId) : undefined}
                        onChange={(e) => {
                          const nextVal =
                            key === "date"
                              ? formatDdMmYyyyTyping(e.target.value, event.date)
                              : e.target.value;
                          onChange((form) => ({
                            ...form,
                            additionalEvents: form.additionalEvents.map((item, i) =>
                              i === index ? { ...item, [key]: nextVal } : item,
                            ),
                          }));
                        }}
                      />
                      {eventDateError && (
                        <p className="text-xs text-destructive">{eventDateError}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </EditorPanel>

      {/* 5. PHOTOS */}
      <EditorPanel compact={compact} section="photos">
        <section
          aria-label="Photos"
          className={`space-y-4 ${compact ? "" : "border-t border-border pt-6"}`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(["groomPhoto", "bridePhoto"] as const).map((key) => (
              <div
                key={key}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                {value[key] ? (
                  <img
                    src={value[key]}
                    alt={`${key === "groomPhoto" ? "Groom" : "Bride"} portrait preview`}
                    className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                    <ImagePlus className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 space-y-1.5">
                  <Label
                    htmlFor={`photo-${key}`}
                    className="block cursor-pointer text-sm font-medium"
                  >
                    {photoBusy === key
                      ? "Processing…"
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
                    className="max-w-52 cursor-pointer text-xs"
                  />
                  {value[key] && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive"
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

      {/* 6. MUSIC */}
      <EditorPanel compact={compact} section="songs">
        <section
          aria-label="Music"
          className={`space-y-4 ${compact ? "" : "border-t border-border pt-6"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Songs ({value.songs.length}/{INVITATION_SONG_LIMIT})
              </p>
              <p className="text-xs text-muted-foreground">
                Paste a YouTube link, Spotify link (Share → Copy song link), or MP3 URL.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={value.songs.length >= INVITATION_SONG_LIMIT}
              onClick={() => addSong()}
            >
              <Plus className="mr-1 h-4 w-4" /> Add song link
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {suggestedInvitationSongs.map((song) => {
              const added = value.songs.some((item) => item.url === song.url);
              return (
                <button
                  key={song.url}
                  type="button"
                  disabled={value.songs.length >= INVITATION_SONG_LIMIT || added}
                  onClick={() => addSong({ title: song.title, url: song.url })}
                  className={`admin-chip ${added ? "is-active" : ""}`}
                >
                  {added ? "✓ " : "+ "}
                  {song.title}
                </button>
              );
            })}
          </div>

          {value.songs.length === 0 ? (
            <div className="space-y-2.5 rounded-xl border border-dashed border-border p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Music2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Paste any YouTube, Spotify, or MP3 link to play when guests enter:</span>
              </div>
              <Input
                id="song-quick-paste"
                inputMode="url"
                placeholder="https://youtu.be/… or https://open.spotify.com/track/…"
                onChange={(event) => {
                  const pasted = event.target.value.trim();
                  if (!pasted) return;
                  addSong({
                    title: resolveSongSource(pasted) ? defaultSongTitleForUrl(pasted, 0) : "",
                    url: pasted,
                  });
                }}
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {value.songs.map((song, index) => {
                const source = song.url.trim() ? resolveSongSource(song.url) : null;
                const invalidSongUrl = !!song.url.trim() && !source;
                const sourceLabel =
                  source?.kind === "youtube"
                    ? "YouTube"
                    : source?.kind === "spotify"
                      ? "Spotify"
                      : source
                        ? "Audio"
                        : null;
                return (
                  <div
                    key={index}
                    className="grid gap-2.5 rounded-xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
                  >
                    <div className="space-y-1">
                      <Label htmlFor={`song-title-${index}`}>Title *</Label>
                      <Input
                        id={`song-title-${index}`}
                        value={song.title}
                        maxLength={80}
                        required
                        placeholder="Song title"
                        onChange={(event) => updateSong(index, { title: event.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`song-url-${index}`}>Song link *</Label>
                        {sourceLabel && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {sourceLabel}
                          </span>
                        )}
                      </div>
                      <Input
                        id={`song-url-${index}`}
                        value={song.url}
                        maxLength={500}
                        required
                        inputMode="url"
                        aria-invalid={invalidSongUrl || undefined}
                        placeholder="https://youtu.be/… or https://open.spotify.com/track/…"
                        onChange={(event) => updateSong(index, { url: event.target.value })}
                      />
                      {invalidSongUrl && (
                        <p className="text-xs text-destructive">
                          Paste a valid YouTube video/song link, Spotify track/playlist link, or
                          https:// audio URL.
                        </p>
                      )}
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
                );
              })}
            </div>
          )}
        </section>
      </EditorPanel>

      {/* 7. SECTIONS */}
      <EditorPanel compact={compact} section="elements">
        <section
          aria-label="Visible sections"
          className={`space-y-3 ${compact ? "" : "border-t border-border pt-6"}`}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {invitationElementOptions.map(({ id, label }) => (
              <label
                key={id}
                className="invitation-choice flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium transition hover:border-foreground/40"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={value.elements[id]}
                  onChange={(e) =>
                    onChange((form) => ({
                      ...form,
                      elements: { ...form.elements, [id]: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 accent-emerald-700"
                />
              </label>
            ))}
          </div>
        </section>
      </EditorPanel>

      {/* 8. PREVIEW */}
      <EditorPanel compact={compact} section="preview">
        <section
          className={compact ? "" : "border-t border-border pt-6"}
          aria-label="Design preview"
        >
          {compact ? (
            <InvitationPreview
              title={value.title || "Your invitation"}
              content={value}
              cardId={cardId}
              inline
            />
          ) : (
            <div className="space-y-4">
              <div className="mx-auto max-w-sm">
                <InvitationCover content={value} />
              </div>
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFullPreview((current) => !current)}
                  aria-expanded={showFullPreview}
                >
                  {showFullPreview ? "Close preview" : "Open full preview"}
                </Button>
              </div>
              {showFullPreview && (
                <InvitationPreview
                  title={value.title || "Your invitation"}
                  content={value}
                  cardId={cardId}
                  inline
                />
              )}
            </div>
          )}
        </section>
      </EditorPanel>
    </Tabs>
  );
}
