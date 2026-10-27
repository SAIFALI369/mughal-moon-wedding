import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { useOnlineStatus } from "@/lib/pwa-install";
import { Button } from "@/components/ui/button";
import {
  InvitationDetailsFields,
  invitationEditorSections,
  editorSectionForField,
  type InvitationEditorSection,
} from "@/components/wedding/invitation-form";
import {
  emptyInvitationForm,
  invitationFormForCard,
  isCardCoupleLocked,
  preserveLockedCoupleIdentity,
  type InvitationForm,
} from "@/components/wedding/invitation-form-data";
import {
  generateSlug,
  invitationContentSchema,
  type InvitationContent,
} from "@/components/wedding/invitation-schema";
import { invitationExpiry } from "@/components/wedding/invitation-details";
import { invitationThemeIds, type InvitationTheme } from "@/components/wedding/invitation-options";
import {
  createOfflineDraft,
  getOfflineDraftsSync,
  isOfflineDraftId,
  loadOfflineDrafts,
  updateOfflineDraft,
} from "@/lib/offline-studio";
import { searchParam } from "@/lib/viewport";

type EditableCard = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  content: Record<string, unknown>;
  published_at?: string | null;
};

type PartnerAllowance = {
  shop_name: string;
  active: boolean;
  cards_purchased: number;
  cards_created: number;
};

function newFormForTheme(theme?: string): InvitationForm {
  const base = emptyInvitationForm();
  if (!theme || !(invitationThemeIds as readonly string[]).includes(theme)) return base;
  const storybook = theme === "fairytale" || theme === "ballroom";
  const hindu = theme === "diya-utsav" || theme === "sacred-mandap";
  return {
    ...base,
    theme: theme as InvitationTheme,
    ...(storybook ? { framework: "curtain-call" as const } : {}),
    ...(hindu
      ? {
          framework: "royal-folio" as const,
          eventType: "Shubh Vivah",
          riteLine: "॥ शुभ विवाह ॥",
        }
      : {}),
  };
}

export const Route = createFileRoute("/create")({
  validateSearch: (search: Record<string, unknown>) => ({
    card: typeof search.card === "string" && search.card ? search.card : "",
    theme: typeof search.theme === "string" && search.theme ? search.theme : "",
  }),
  head: () => ({
    meta: [
      { title: "New invitation — InvitingYou" },
      {
        name: "description",
        content: "Build your cinematic invitation step by step on your phone.",
      },
      { property: "og:title", content: "New invitation — InvitingYou" },
      { property: "og:type", content: "website" },
      { property: "robots", content: "noindex" },
    ],
  }),
  component: CreateInvitationPage,
});

/**
 * The card creation form as a page of its own.
 *
 * On a phone this is where every "Create invitation" and "Edit" tap lands. A
 * modal cannot show a long, keyboard-heavy form on a small screen without
 * fighting the viewport, so the form gets its own route: a sticky title bar, a
 * single scrolling column, and an action bar pinned above the home indicator.
 */
export function CreateInvitationPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const [cardId] = useState(() => searchParam("card"));
  const [theme] = useState(() => searchParam("theme"));
  const [form, setForm] = useState<InvitationForm>(() => newFormForTheme(theme));
  const [section, setSection] = useState<InvitationEditorSection>("essentials");
  const [card, setCard] = useState<EditableCard | null>(null);
  const [partner, setPartner] = useState<PartnerAllowance | null>(null);
  const [loading, setLoading] = useState(Boolean(cardId));
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initial = useRef(JSON.stringify(form));

  const stepIndex = Math.max(
    0,
    invitationEditorSections.findIndex((item) => item.id === section),
  );
  const lastStep = invitationEditorSections.length - 1;
  const remaining = Math.max(0, (partner?.cards_purchased ?? 0) - (partner?.cards_created ?? 0));
  const canCreate = !online || (!!partner?.active && remaining > 0);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/sign-in" });
  }, [authLoading, user, navigate]);

  // Keep the page exactly as tall as the visible screen: when the phone keyboard
  // opens, the action bar must stay above it instead of being pushed off-screen.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      document.documentElement.style.setProperty("--create-page-height", `${viewport.height}px`);
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      document.documentElement.style.removeProperty("--create-page-height");
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      if (online) {
        const { data: allowance } = await supabase
          .from("print_partners")
          .select("shop_name, active, cards_purchased, cards_created")
          .eq("owner_id", user?.id ?? "")
          .maybeSingle();
        if (!cancelled) setPartner((allowance as PartnerAllowance | null) ?? null);
      }
      if (!cardId) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (isOfflineDraftId(cardId)) {
        const drafts = getOfflineDraftsSync();
        const existing =
          drafts.find((draft) => draft.id === cardId) ??
          (await loadOfflineDrafts().catch(() => []))?.find((draft) => draft.id === cardId);
        if (cancelled) return;
        if (existing) {
          setCard(existing as unknown as EditableCard);
          applyCard(existing.title, existing.content);
        } else {
          setMissing(true);
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
        setCard(data as EditableCard);
        applyCard((data as EditableCard).title, (data as EditableCard).content);
      }
      setLoading(false);
    }

    function applyCard(title: string, content: unknown) {
      const next = invitationFormForCard(title, content);
      initial.current = JSON.stringify(next);
      setForm(next);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, online, cardId]);

  function leave() {
    if (busy) return;
    if (JSON.stringify(form) !== initial.current && !window.confirm("Discard unsaved changes?"))
      return;
    navigate({ to: "/dashboard" });
  }

  function readContent(): InvitationContent | null {
    if (!form.title.trim()) {
      setSection("essentials");
      setError("Give the invitation a title first.");
      return null;
    }
    const parsed = invitationContentSchema.safeParse(form);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setSection(editorSectionForField(String(issue?.path[0] ?? "title")));
      setError(issue?.message ?? "Add the couple names, date and venue to continue.");
      return null;
    }
    return parsed.data;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    const content = readContent();
    if (!content) return;
    const title = form.title.trim();

    if (cardId && card) {
      const { title: safeTitle, content: safeContent } = preserveLockedCoupleIdentity(
        title,
        content,
        card,
      );
      if (isOfflineDraftId(cardId)) {
        updateOfflineDraft(cardId, { title: safeTitle, content: safeContent });
        toast.success("Offline draft saved");
        navigate({ to: "/dashboard" });
        return;
      }
      if (!online) {
        setError("Connect to the internet to save a published card, or start a new offline draft.");
        return;
      }
      setBusy(true);
      try {
        const { error: writeError } = await supabase
          .from("invitation_cards")
          .update({
            title: safeTitle,
            content: safeContent,
            expires_at: invitationExpiry(safeContent.date),
          })
          .eq("id", cardId)
          .eq("owner_id", user?.id ?? "");
        if (writeError) {
          setError(writeError.message);
          toast.error(writeError.message);
          return;
        }
        toast.success("Changes saved");
        navigate({ to: "/dashboard" });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!canCreate) {
      setError("No card credits available. Open the studio to check your package.");
      return;
    }
    if (!online) {
      createOfflineDraft({ title, content, ownerId: user?.id });
      toast.success("Draft saved offline on this device");
      navigate({ to: "/dashboard" });
      return;
    }
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");
      const expires_at = invitationExpiry(content.date);
      const { error: writeError } = await supabase
        .from("invitation_cards")
        .insert({
          owner_id: session.session.user.id,
          title,
          slug: generateSlug(title),
          status: "draft",
          content,
          ...(expires_at ? { expires_at } : {}),
        })
        .select()
        .single();
      if (writeError) {
        setError(writeError.message);
        toast.error(writeError.message);
        return;
      }
      toast.success("Draft saved");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save the invitation.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !user) {
    return (
      <main className="create-page create-page-loading">
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
          Opening the editor…
        </p>
      </main>
    );
  }

  if (missing) {
    return (
      <main className="create-page create-page-loading">
        <div className="text-center">
          <p className="text-sm font-medium">That invitation could not be found.</p>
          <Link to="/dashboard" className="mt-3 inline-block text-sm underline">
            Back to the studio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="create-page">
      <header className="create-page-head">
        <button
          type="button"
          className="create-page-back"
          onClick={leave}
          aria-label="Back to studio"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="create-page-head-copy">
          <h1>{cardId ? "Edit invitation" : "New invitation"}</h1>
          <p>
            Step {stepIndex + 1} of {invitationEditorSections.length} ·{" "}
            {invitationEditorSections[stepIndex]?.label}
          </p>
        </div>
        {!online && (
          <span className="offline-status-pill is-offline" role="status">
            <WifiOff size={12} aria-hidden="true" /> Offline
          </span>
        )}
        <button
          type="submit"
          form="create-invitation-form"
          className="create-page-save"
          disabled={busy || (!cardId && !canCreate)}
        >
          {busy ? "Saving…" : cardId ? "Save" : "Create"}
        </button>
      </header>

      <form id="create-invitation-form" noValidate className="create-page-form" onSubmit={submit}>
        <div className="create-page-body">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading invitation…</p>
          ) : (
            <InvitationDetailsFields
              compact
              section={section}
              onSectionChange={setSection}
              value={form}
              onChange={setForm}
              cardId={cardId || undefined}
              simran={!!partner?.active}
              coupleLocked={isCardCoupleLocked(card)}
            />
          )}
        </div>

        <div className="create-page-foot">
          {error && (
            <p className="create-page-error" role="alert">
              {error}
            </p>
          )}
          {!cardId && !canCreate && (
            <p className="create-page-note" role="status">
              No credits left on this account.{" "}
              <Link to="/dashboard" className="underline">
                Check the package
              </Link>
            </p>
          )}
          <div className="create-page-actions">
            <Button type="button" variant="ghost" onClick={leave} disabled={busy}>
              Cancel
            </Button>
            <div className="create-page-steps">
              <Button
                type="button"
                variant="outline"
                disabled={busy || stepIndex === 0}
                onClick={() => setSection(invitationEditorSections[stepIndex - 1].id)}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || stepIndex === lastStep}
                onClick={() => setSection(invitationEditorSections[stepIndex + 1].id)}
              >
                Next
              </Button>
              <Button type="submit" disabled={busy || (!cardId && !canCreate)}>
                {busy ? "Saving…" : cardId ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
