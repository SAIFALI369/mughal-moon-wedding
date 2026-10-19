import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InvitationForm } from "./invitation-form-data";
import { invitationArt } from "./invitation-art";
import {
  invitationElementOptions,
  invitationFrameworks,
  invitationThemes,
} from "./invitation-options";
import { processInvitationPortrait } from "./portrait-upload";
import { InvitationCover, PersonalInvitation } from "./invitation-template";

type Props = { value: InvitationForm; onChange: Dispatch<SetStateAction<InvitationForm>> };
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
const optionalFields = [
  {
    key: "hosts",
    label: "Hosting families",
    placeholder: "Together with our families",
    limit: 160,
  },
  { key: "dressCode", label: "Dress code", placeholder: "Festive traditional attire", limit: 160 },
  {
    key: "contactName",
    label: "Host contact name",
    placeholder: "The person guests can reach",
    limit: 100,
  },
  { key: "contactPhone", label: "Host phone", placeholder: "+91 98765 43210", limit: 50 },
  { key: "rsvpDeadline", label: "Please RSVP by", placeholder: "10 December 2026", limit: 100 },
] as const;

export function InvitationDetailsFields({ value, onChange }: Props) {
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

  return (
    <div className="invitation-editor space-y-10">
      <section aria-labelledby="form-essentials" className="space-y-5">
        <div>
          <h2 id="form-essentials" className="font-serif text-2xl">
            01 — The essentials
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These details are required and always visible, even when optional sections are turned
            off.
          </p>
        </div>
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
          </div>
          {requiredFields.map(({ key, label, placeholder, limit }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`card-${key}`}>{label} *</Label>
              <Input
                id={`card-${key}`}
                value={value[key]}
                onChange={(event) => change(key, event.target.value)}
                placeholder={placeholder}
                required
                maxLength={limit}
              />
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="card-event-type">Main ceremony *</Label>
            <Input
              id="card-event-type"
              value={value.eventType}
              onChange={(event) => change("eventType", event.target.value)}
              required
              maxLength={80}
              placeholder="Nikah, wedding ceremony, or reception"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Use a real date. Include a time zone (such as IST or UTC) so Save the Date has a precise
          calendar time.
        </p>
      </section>

      <section aria-labelledby="form-design" className="space-y-6 border-t border-border pt-8">
        <div>
          <h2 id="form-design" className="font-serif text-2xl">
            02 — Make it yours
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick an atmosphere and a layout separately. Every combination uses your own wedding
            information.
          </p>
        </div>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Theme *</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {invitationThemes.map((theme) => (
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
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Framework / layout *</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="grid gap-4 sm:grid-cols-2">
          {optionalFields.map(({ key, label, placeholder, limit }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`card-${key}`}>{label}</Label>
              <Input
                id={`card-${key}`}
                value={value[key]}
                onChange={(event) => change(key, event.target.value)}
                placeholder={placeholder}
                maxLength={limit}
              />
            </div>
          ))}
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
        </div>
      </section>

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
                <div key={key} className={`space-y-2 ${key === "address" ? "sm:col-span-2" : ""}`}>
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
      </section>

      <section aria-labelledby="form-elements" className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 id="form-elements" className="font-serif text-2xl">
            06 — What guests see
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
            />
          </div>
        )}
      </section>
    </div>
  );
}
