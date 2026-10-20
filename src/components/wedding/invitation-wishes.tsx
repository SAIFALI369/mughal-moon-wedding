import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2, Send } from "lucide-react";
import { supabase } from "@/lib/db";
import type { InvitationDetails } from "./invitation-details";
import { toast } from "sonner";
import { SuiteHeading } from "./invitation-ornaments";

type Wish = { id: string; name: string; message: string; created_at: string };

const MAX_NAME = 80;
const MAX_MESSAGE = 500;

/**
 * Public wishes wall for one card. Guests write a name and a blessing; the
 * card's own host reads and moderates from the dashboard. Nothing here touches
 * the demo couple's wishes.
 */
export function InvitationWishes({
  cardId,
  details,
  preview = false,
}: {
  cardId?: string;
  details: InvitationDetails;
  preview?: boolean;
}) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    if (!cardId) return;
    const { data, error } = await supabase
      .from("invitation_wishes")
      .select("id,name,message,created_at")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setWishes((data as Wish[]) ?? []);
  }, [cardId]);

  useEffect(() => {
    if (!cardId) return;
    void load();
    if (preview) return;
    const channel = supabase
      .channel(`invitation-wishes-${cardId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "invitation_wishes",
          filter: `card_id=eq.${cardId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cardId, preview, load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!cardId || preview) {
      setStatus("Wishes open once the invitation is published.");
      return;
    }
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedMessage) {
      setStatus("Please add your name and a short blessing.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const { error } = await supabase
        .from("invitation_wishes")
        .insert({ card_id: cardId, name: trimmedName, message: trimmedMessage });
      if (error) throw error;
      setName("");
      setMessage("");
      setStatus("Your blessing is on the wall. Thank you!");
      toast.success("Wish added — thank you!");
      await load();
    } catch {
      setStatus("Your wish could not be posted. Please try again.");
      toast.error("Your wish could not be posted");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="wishes"
      className="invite-section invite-suite invite-suite-wishes relative overflow-hidden px-6 py-20 sm:py-28"
    >
      <SuiteHeading eyebrow="Wishes">Blessings &amp; Wishes</SuiteHeading>
      <p className="invite-suite-sub">
        Leave a note for {details.groomName} &amp; {details.brideName} — every word is kept.
      </p>

      <div className="invite-wishes-layout mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {preview || !cardId ? (
          <p className="invite-wishes-note" role="status">
            Wishes open once this invitation is published.
          </p>
        ) : (
          <form className="invite-wishes-form" onSubmit={submit}>
            <label className="invite-wishes-field">
              <span>Your name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={MAX_NAME}
                placeholder="Who is wishing?"
                autoComplete="name"
                required
              />
            </label>
            <label className="invite-wishes-field">
              <span>Your blessing</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={MAX_MESSAGE}
                rows={4}
                placeholder={`Write something for ${details.groomName} & ${details.brideName}…`}
                required
              />
            </label>
            <div className="invite-wishes-form-foot">
              <span className="invite-wishes-count">
                {message.trim().length}/{MAX_MESSAGE}
              </span>
              <button type="submit" className="invite-wishes-submit" disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                {busy ? "Sending…" : "Send wish"}
              </button>
            </div>
            {status && (
              <p className="invite-wishes-status" role="status" aria-live="polite">
                {status}
              </p>
            )}
          </form>
        )}

        <div className="invite-wishes-wall" aria-live="polite">
          {wishes.length === 0 ? (
            <p className="invite-wishes-empty">
              <Heart className="h-5 w-5" aria-hidden="true" />
              No wishes yet — yours could be the first.
            </p>
          ) : (
            <ul>
              {wishes.map((wish) => (
                <li key={wish.id} className="invite-wish">
                  <p className="invite-wish-message">“{wish.message}”</p>
                  <p className="invite-wish-meta">
                    <span>{wish.name}</span>
                    <time dateTime={wish.created_at}>
                      {new Date(wish.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
