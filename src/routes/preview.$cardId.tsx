import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ArrowLeft,
  Check,
  Clapperboard,
  Eye,
  ImagePlus,
  Loader2,
  Music2,
  Palette,
  Pencil,
  ScrollText,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { useOnlineStatus } from "@/lib/pwa-install";
import { Button } from "@/components/ui/button";
import { DeviceFrame, usePhoneScreen } from "@/components/platform/invitation-preview";
import {
  InvitationDetailsFields,
  invitationEditorSections,
  type InvitationEditorSection,
} from "@/components/wedding/invitation-form";
import {
  invitationFormForCard,
  isCardCoupleLocked,
  preserveLockedCoupleIdentity,
  type InvitationForm,
} from "@/components/wedding/invitation-form-data";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import { invitationExpiry } from "@/components/wedding/invitation-details";
import {
  invitationThemeCategories,
  invitationThemes,
  type InvitationTheme,
} from "@/components/wedding/invitation-options";
import { ThemeLoop } from "@/components/wedding/theme-loop";
import { demoPoster } from "@/config/theme-demos";
import {
  getOfflineDraftsSync,
  isOfflineDraftId,
  loadOfflineDrafts,
  updateOfflineDraft,
} from "@/lib/offline-studio";
import { sectionForInviteTap } from "@/lib/invitation-tap-map";

type PreviewCard = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  content: Record<string, unknown>;
  published_at?: string | null;
};

export const Route = createFileRoute("/preview/$cardId")({
  head: () => ({
    meta: [
      { title: "Live invitation preview — InvitingYou" },
      {
        name: "description",
        content: "See and edit your invitation exactly as guests will see it.",
      },
      { property: "og:title", content: "Live invitation preview — InvitingYou" },
      { property: "og:type", content: "website" },
      { property: "robots", content: "noindex" },
    ],
  }),
  component: LivePreviewPage,
});

const DOCK_ACTIONS: ReadonlyArray<{
  section: InvitationEditorSection;
  label: string;
  icon: typeof Pencil;
}> = [
  { section: "essentials", label: "Details", icon: Pencil },
  { section: "design", label: "Theme", icon: Palette },
  { section: "details", label: "Story", icon: ScrollText },
  { section: "events", label: "Events", icon: Clapperboard },
  { section: "photos", label: "Photos", icon: ImagePlus },
  { section: "songs", label: "Music", icon: Music2 },
  { section: "elements", label: "Elements", icon: Eye },
];

/**
 * The invitation itself, full screen, as the guest will see it — with editing
 * built in. Nothing is a mock: taps land on the real invitation document, the
 * panel edits the same form state the card is saved from, and every keystroke
 * is pushed to the preview frame, so theme, text and element changes are live.
 */
export function LivePreviewPage() {
  const { cardId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const isPhone = usePhoneScreen();

  const [card, setCard] = useState<PreviewCard | null>(null);
  const [formState, setFormState] = useState<InvitationForm | null>(null);
  const form = formState;
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState<InvitationEditorSection | null>(null);
  const [themeFilter, setThemeFilter] = useState("all");
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  // A non-null setter so the form fields can stay typed once the card has loaded.
  const setForm: Dispatch<SetStateAction<InvitationForm>> = useCallback((next) => {
    setFormState((previous) => {
      if (!previous) return previous;
      return typeof next === "function"
        ? (next as (value: InvitationForm) => InvitationForm)(previous)
        : next;
    });
  }, []);
  const initial = useRef("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/sign-in" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      if (isOfflineDraftId(cardId)) {
        const drafts =
          getOfflineDraftsSync().length > 0 ? getOfflineDraftsSync() : await loadOfflineDrafts();
        const draft = drafts.find((item) => item.id === cardId);
        if (cancelled) return;
        if (!draft) {
          setMissing(true);
        } else {
          const row: PreviewCard = {
            id: draft.id,
            title: draft.title,
            slug: draft.slug,
            status: "draft",
            content: draft.content,
          };
          setCard(row);
          applyContent(row.title, row.content);
        }
        setLoading(false);
        return;
      }
      const { data, error: readError } = await supabase
        .from("invitation_cards")
        .select("id, title, slug, status, content, published_at")
        .eq("id", cardId)
        .eq("owner_id", user?.id ?? "")
        .maybeSingle();
      if (cancelled) return;
      if (readError || !data) {
        setMissing(true);
      } else {
        const row = data as PreviewCard;
        setCard(row);
        applyContent(row.title, row.content);
      }
      setLoading(false);
    }

    function applyContent(title: string, content: unknown) {
      const next = invitationFormForCard(title, content);
      initial.current = JSON.stringify(next);
      setFormState(next);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cardId, user]);

  // Tap anything inside the invitation to edit that part of it.
  const attachFrame = useCallback((frame: HTMLIFrameElement | null) => {
    frameRef.current = frame;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    // The ref callback and onLoad both fire; attach the tap map only once per document.
    if ((doc as Document & { __inviteTapBound?: boolean }).__inviteTapBound) return;
    (doc as Document & { __inviteTapBound?: boolean }).__inviteTapBound = true;
    const handler = (event: MouseEvent) => {
      const section = sectionForInviteTap(event.target as Element | null);
      if (!section) return;
      event.preventDefault();
      event.stopPropagation();
      setSheet(section);
    };
    doc.addEventListener("click", handler, true);
  }, []);

  const dirty = useMemo(() => Boolean(form) && JSON.stringify(form) !== initial.current, [form]);

  const locked = isCardCoupleLocked(card);

  function leave() {
    if (busy) return;
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    navigate({ to: "/dashboard" });
  }

  async function save() {
    if (!form || !card || busy) return;
    const parsed = invitationContentSchema.safeParse(form);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setSheet("essentials");
      setError(issue?.message ?? "Complete the couple names, date and venue to save.");
      return;
    }
    const title = form.title.trim() || card.title;
    setBusy(true);
    setError("");
    try {
      if (isOfflineDraftId(card.id)) {
        updateOfflineDraft(card.id, { title, content: parsed.data });
        toast.success("Offline draft saved");
      } else {
        if (!online) {
          setError("Connect to the internet to save changes to a synced card.");
          return;
        }
        const { title: safeTitle, content } = preserveLockedCoupleIdentity(
          title,
          parsed.data,
          card,
        );
        const { data, error: writeError } = await supabase
          .from("invitation_cards")
          .update({ title: safeTitle, content, expires_at: invitationExpiry(content.date) })
          .eq("id", card.id)
          .eq("owner_id", user?.id ?? "")
          .select("id, title, content, updated_at")
          .maybeSingle();
        if (writeError || !data) {
          setError(writeError?.message ?? "Nothing was saved. Sign in again and retry.");
          toast.error(writeError?.message ?? "Nothing was saved.");
          return;
        }
        toast.success("Invitation updated");
      }
      initial.current = JSON.stringify(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="live-preview-page live-preview-loading">
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
          Opening the live preview…
        </p>
      </main>
    );
  }

  if (missing || !form || !card) {
    return (
      <main className="live-preview-page live-preview-loading">
        <div className="text-center">
          <p className="text-sm font-medium">That invitation could not be found.</p>
          <Link to="/dashboard" className="mt-3 inline-block text-sm underline">
            Back to the studio
          </Link>
        </div>
      </main>
    );
  }

  const visibleThemes =
    themeFilter === "all"
      ? invitationThemes
      : invitationThemes.filter((theme) => theme.category === themeFilter);

  return (
    <div className="live-preview-page" data-editing="true">
      <header className="create-page-head live-preview-head">
        <button
          type="button"
          className="create-page-back"
          onClick={leave}
          aria-label="Back to studio"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="create-page-head-copy">
          <h1>{card.title || "Live preview"}</h1>
          <p>{card.status === "published" ? "Published" : "Draft"} · tap anything to edit</p>
        </div>
        {!online && (
          <span className="offline-status-pill is-offline" role="status">
            <WifiOff size={12} aria-hidden="true" /> Offline
          </span>
        )}
        <button
          type="button"
          className={`create-page-save${saved ? " is-saved" : ""}`}
          onClick={() => void save()}
          disabled={busy}
        >
          {busy ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </header>

      <div className="live-preview-stage">
        <DeviceFrame
          device="phone"
          title={form.title || card.title}
          content={form}
          cardId={card.id}
          native={isPhone}
          onFrame={attachFrame}
          className="live-preview-frame"
        />
      </div>

      {error && (
        <p className="live-preview-error" role="alert">
          {error}
        </p>
      )}

      <div className="live-preview-dock" role="toolbar" aria-label="Edit invitation">
        {DOCK_ACTIONS.map((action) => (
          <button
            key={action.section}
            type="button"
            onClick={() => {
              setSheet(action.section);
              setError("");
            }}
            className={`live-preview-dock-btn${sheet === action.section ? " is-active" : ""}`}
          >
            <action.icon size={15} aria-hidden="true" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {sheet && (
        <div className="live-preview-sheet" role="dialog" aria-label="Edit invitation">
          <div className="live-preview-sheet-head">
            <strong>
              {invitationEditorSections.find((item) => item.id === sheet)?.label ?? "Edit"}
            </strong>
            <button
              type="button"
              onClick={() => setSheet(null)}
              aria-label="Close editor"
              className="live-preview-sheet-close"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {sheet === "design" && (
            <div className="live-preview-themes">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setThemeFilter("all")}
                  className={`admin-chip ${themeFilter === "all" ? "is-active" : ""}`}
                >
                  All
                </button>
                {invitationThemeCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setThemeFilter(category.id)}
                    className={`admin-chip ${themeFilter === category.id ? "is-active" : ""}`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="live-preview-theme-grid">
                {visibleThemes.map((theme) => {
                  const active = form.theme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setForm({ ...form, theme: theme.id as InvitationTheme })}
                      className={`invitation-choice live-preview-theme${active ? " is-active" : ""}`}
                    >
                      <span className="live-preview-theme-art" style={{ background: theme.swatch }}>
                        <ThemeLoop
                          theme={theme.id}
                          className="object-cover"
                          poster={demoPoster(theme.id)}
                        />
                        {active && (
                          <span className="live-preview-theme-check">
                            <Check size={11} aria-hidden="true" />
                          </span>
                        )}
                      </span>
                      <span className="live-preview-theme-label">{theme.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="live-preview-sheet-body">
            <InvitationDetailsFields
              compact
              section={sheet}
              onSectionChange={setSheet}
              value={form}
              onChange={setForm}
              cardId={card.id}
              simran={false}
              coupleLocked={locked}
              hiddenSections={["preview"]}
            />
          </div>

          <div className="live-preview-sheet-foot">
            {locked && (
              <p className="live-preview-lock-note">
                Couple names are locked after publishing — everything else stays editable.
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setSheet(null)}>
                Done
              </Button>
              <Button type="button" onClick={() => void save()} disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
