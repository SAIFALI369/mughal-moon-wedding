import { useEffect, useRef, useState, type FormEvent } from "react";
import confetti from "canvas-confetti";
import { Ban, CheckCircle2, HeartHandshake } from "lucide-react";
import { guestNameError, invitationRsvpSchema, normalizeGuestName } from "./invitation-rsvp-schema";
import { supabase } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionTitle } from "./ornaments";

const REPLY_STORAGE_PREFIX = "invitation-rsvp:";

/**
 * One reply per device. Only a marker is stored — never the guest's name or
 * contact details — so a shared phone or tablet reveals nothing to the next
 * person who opens the invitation.
 */
function hasStoredReply(cardId?: string): boolean {
  if (!cardId || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${REPLY_STORAGE_PREFIX}${cardId}`) !== null;
  } catch {
    return false;
  }
}

function rememberReply(cardId: string) {
  try {
    window.localStorage.setItem(
      `${REPLY_STORAGE_PREFIX}${cardId}`,
      JSON.stringify({ at: new Date().toISOString() }),
    );
  } catch {
    // Storage can be unavailable (private mode); the in-flight guard still applies.
  }
}

export function InvitationRsvp({
  cardId,
  deadline,
  preview = false,
  heading,
}: {
  cardId?: string;
  deadline?: string;
  preview?: boolean;
  /** Optional in-world copy for the two interactive themes. */
  heading?: { eyebrow: string; title: string };
}) {
  const [attending, setAttending] = useState(true);
  const [name, setName] = useState("");
  const [guests, setGuests] = useState(1);
  const [contact, setContact] = useState("");
  const [dietary, setDietary] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [invitedGuest, setInvitedGuest] = useState("");
  const [alreadyReplied, setAlreadyReplied] = useState(false);
  const submitting = useRef(false);

  // Personalised links (/invite/slug?guest=Name) greet the guest and prefill RSVP.
  useEffect(() => {
    if (preview) return;
    const invited = new URLSearchParams(window.location.search).get("guest")?.trim();
    if (!invited) return;
    const clean = normalizeGuestName(invited).slice(0, 100);
    setInvitedGuest(clean);
    // Only prefill a name that would pass validation; a messy link must not
    // put a guest in front of an error they cannot see.
    if (!guestNameError(clean)) setName((current) => current || clean);
  }, [preview]);

  // A device that already replied never gets a second form.
  useEffect(() => {
    if (preview) return;
    setAlreadyReplied(hasStoredReply(cardId));
    const onStorage = (event: StorageEvent) => {
      if (event.key === `${REPLY_STORAGE_PREFIX}${cardId}`)
        setAlreadyReplied(hasStoredReply(cardId));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [cardId, preview]);

  function canCelebrate(): boolean {
    if (typeof document === "undefined" || typeof window === "undefined") return false;
    // jsdom has no 2D canvas; skip the animation instead of logging noise.
    if (typeof window.CanvasRenderingContext2D === "undefined") return false;
    try {
      // A headless test browser has no 2D canvas; skip the animation there.
      const context = document.createElement("canvas").getContext("2d");
      return !!context && typeof context.clearRect === "function";
    } catch {
      return false;
    }
  }

  function celebrate() {
    if (!canCelebrate()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const palette = getComputedStyle(document.documentElement);
    const gold = ["--gold", "--gold-light"]
      .map((token) => palette.getPropertyValue(token).trim())
      .filter(Boolean);
    confetti({ particleCount: 160, spread: 90, origin: { y: 0.7 }, colors: gold });
    setTimeout(
      () => confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0 }, colors: gold }),
      250,
    );
    setTimeout(
      () => confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1 }, colors: gold }),
      400,
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    if (alreadyReplied) {
      setError("A reply was already sent from this device.");
      return;
    }
    if (website) {
      setSubmitted(true);
      return;
    } // honeypot: no guest data stored
    const trimmedName = normalizeGuestName(name);
    const nameIssue = guestNameError(trimmedName);
    if (nameIssue) {
      setNameError(nameIssue);
      setError(nameIssue);
      return;
    }
    setNameError("");
    setError("");
    const parsed = invitationRsvpSchema.safeParse({
      card_id: cardId,
      name: trimmedName,
      attending,
      guests: attending ? guests : 0,
      contact,
      dietary: attending ? dietary : "",
      message,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please check your reply.");
      return;
    }
    setBusy(true);
    submitting.current = true;
    setError("");
    try {
      // Insert only. Visitors cannot read other guests' replies; RLS also blocks
      // submissions to drafts, expired cards, or cards whose host disabled RSVP.
      const { error: insertError } = await supabase.from("invitation_rsvps").insert(parsed.data);
      if (insertError) throw insertError;
      rememberReply(cardId!);
      setAlreadyReplied(true);
      setSubmitted(true);
      celebrate();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "code" in err && err.code === "42501"
          ? "This invitation is no longer accepting replies. Please contact the host."
          : "Your reply could not be saved. Please try again in a moment.";
      setError(message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <section id="rsvp" className="invite-section relative bg-muted px-6 py-20 sm:py-28">
      <SectionTitle eyebrow={heading?.eyebrow ?? "The pleasure of your company"}>
        {heading?.title ?? "Kindly RSVP"}
      </SectionTitle>
      <div className="glass-card gold-corners mx-auto max-w-2xl rounded-2xl p-7 shadow-gold sm:p-12">
        {invitedGuest && !submitted && (
          <p className="invite-rsvp-greeting">
            Dear <strong>{invitedGuest}</strong>, the couple would be delighted to see you.
          </p>
        )}
        {deadline && (
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Please reply by {deadline}.
          </p>
        )}
        {preview || !cardId ? (
          <p className="text-center font-serif text-xl">
            This is a private preview. Guest replies appear here when you publish and share your
            card.
          </p>
        ) : alreadyReplied && !submitted ? (
          <div role="status" className="text-center">
            <Ban className="mx-auto h-11 w-11 text-gold" aria-hidden="true" />
            <h3 className="mt-5 font-serif text-3xl">Your reply is already with the host</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              One reply per device is accepted, and this device has already replied to this
              invitation.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Need to change your answer? Please contact the host directly.
            </p>
          </div>
        ) : submitted ? (
          <div role="status" className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-gold" aria-hidden="true" />
            <h3 className="mt-5 font-serif text-3xl">Thank you for replying!</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              The host has received your response privately.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Your full name *</Label>
              <Input
                id="guest-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(guestNameError(e.target.value) ?? "");
                }}
                onBlur={() => setNameError(name ? (guestNameError(name) ?? "") : "")}
                maxLength={100}
                required
                autoComplete="name"
                aria-invalid={nameError ? true : undefined}
                aria-describedby="guest-name-hint"
                placeholder="Your full name, as written on the invitation"
              />
              <p
                id="guest-name-hint"
                className={nameError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
                role={nameError ? "alert" : undefined}
              >
                {nameError ||
                  "Required. Use your real name — letters only, no initials, numbers or emoji."}
              </p>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-medium">Will you join us? *</legend>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { label: "Joyfully accepts", value: true },
                    { label: "Regretfully declines", value: false },
                  ] as const
                ).map(({ label, value }) => (
                  <label
                    key={label}
                    className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-center text-sm transition ${attending === value ? "border-gold bg-gold/15 text-foreground" : "border-border text-muted-foreground hover:border-gold"}`}
                  >
                    <input
                      type="radio"
                      name="attendance"
                      checked={attending === value}
                      onChange={() => setAttending(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {attending && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guest-count">Number of guests (including you) *</Label>
                  <select
                    id="guest-count"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {Array.from({ length: 10 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-dietary">Dietary notes (optional)</Label>
                  <Input
                    id="guest-dietary"
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value)}
                    maxLength={300}
                    placeholder="Allergies or preferences"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="guest-contact">Email or phone (optional)</Label>
              <Input
                id="guest-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={120}
                placeholder="If the host needs to reach you"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-message">A note for the couple (optional)</Label>
              <Textarea
                id="guest-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <Label htmlFor="guest-website">Website</Label>
              <Input
                id="guest-website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy}
              className="bg-gold-gradient w-full text-burgundy-deep hover:opacity-90"
            >
              <HeartHandshake className="mr-2 h-4 w-4" />
              {busy ? "Sending your reply…" : "Send my reply"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Only the host can see your reply, contact and dietary notes. Nothing is added to the
              public wishes wall.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
