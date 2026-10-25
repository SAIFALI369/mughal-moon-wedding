import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Globe2,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  Share2,
  Trash2,
  UploadCloud,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/db";
import { useAuth, getUsernameFromUser } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InvitationDetailsFields,
  editorSectionForField,
  invitationEditorSections,
  type InvitationEditorSection,
} from "@/components/wedding/invitation-form";
import {
  emptyInvitationForm,
  invitationFormForCard,
  type InvitationForm,
} from "@/components/wedding/invitation-form-data";
import {
  invitationContentSchema,
  type InvitationContent,
} from "@/components/wedding/invitation-schema";
import { invitationArt } from "@/components/wedding/invitation-art";
import {
  invitationThemeCategories,
  invitationThemes,
} from "@/components/wedding/invitation-options";
import { PlatformShell } from "@/components/platform/platform-shell";
import { CardPrintDialog } from "@/components/platform/card-print-dialog";
import { InvitationPreview } from "@/components/platform/invitation-preview";
import {
  copyTextSafe,
  createOfflineDraft,
  deleteOfflineDraft,
  getOfflineDraftsSync,
  isBrowserOnline,
  loadOfflineDrafts,
  publishOfflineDraftToCloud,
  subscribeOfflineDrafts,
  updateOfflineDraft,
  type OfflineInvitationDraft,
} from "@/lib/offline-studio";
import { useOnlineStatus, registerOfflineServiceWorker } from "@/lib/pwa-install";

type PublishedSummary = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "published";
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export const Route = createFileRoute("/offline-studio")({
  head: () => ({
    meta: [
      { title: "Offline Studio — InvitingYou" },
      {
        name: "description",
        content:
          "Create, edit, and preview wedding invitations completely offline. Connect to the internet only when ready to publish.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OfflineStudioPage,
});

export function OfflineStudioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();

  const [drafts, setDrafts] = useState<OfflineInvitationDraft[]>(() => getOfflineDraftsSync());
  const [recentlyPublished, setRecentlyPublished] = useState<PublishedSummary[]>([]);
  const [activeTab, setActiveTab] = useState<"invitations" | "templates">("invitations");
  const [templateCategory, setTemplateCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorSection, setEditorSection] = useState<InvitationEditorSection>("essentials");
  const [form, setForm] = useState<InvitationForm>(emptyInvitationForm);
  const [busy, setBusy] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [previewCard, setPreviewCard] = useState<OfflineInvitationDraft | PublishedSummary | null>(
    null,
  );
  const [qrCard, setQrCard] = useState<OfflineInvitationDraft | PublishedSummary | null>(null);

  const editorInitial = useRef("");
  const editorScroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerOfflineServiceWorker();
    const unsubscribe = subscribeOfflineDrafts(() => {
      setDrafts(getOfflineDraftsSync());
    });
    void loadOfflineDrafts();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (editorScroll.current) editorScroll.current.scrollTop = 0;
  }, [editorSection]);

  const editorIndex = invitationEditorSections.findIndex((item) => item.id === editorSection);
  const username = getUsernameFromUser(user);

  const visibleDrafts = drafts.filter((draft) =>
    `${draft.title} ${draft.slug}`.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const visibleTemplates =
    templateCategory === "all"
      ? invitationThemes
      : invitationThemes.filter((theme) => theme.category === templateCategory);

  function startNew(theme = emptyInvitationForm().theme) {
    const theatrical = theme === "fairytale" || theme === "ballroom";
    const hindu = theme === "diya-utsav" || theme === "sacred-mandap";
    const next: InvitationForm = {
      ...emptyInvitationForm(),
      theme,
      ...(theatrical ? { framework: "curtain-call" as const } : {}),
      ...(hindu
        ? {
            framework: "royal-folio" as const,
            eventType: "Shubh Vivah",
            riteLine: "॥ शुभ विवाह ॥",
          }
        : {}),
    };
    editorInitial.current = JSON.stringify(next);
    setForm(next);
    setEditingId(null);
    setError("");
    setEditorSection("essentials");
    setEditorOpen(true);
  }

  function startEdit(draft: OfflineInvitationDraft) {
    const next = invitationFormForCard(draft.title, draft.content);
    editorInitial.current = JSON.stringify(next);
    setForm(next);
    setEditingId(draft.id);
    setError("");
    setEditorSection("essentials");
    setEditorOpen(true);
  }

  function closeEditor() {
    if (busy) return;
    if (
      JSON.stringify(form) !== editorInitial.current &&
      !window.confirm("Discard unsaved changes?")
    ) {
      return;
    }
    setEditorOpen(false);
    setEditingId(null);
    setForm(emptyInvitationForm());
    setError("");
  }

  function validateForm(): InvitationContent | null {
    const result = invitationContentSchema.safeParse(form);
    if (!result.success) {
      const message =
        result.error.issues[0]?.message || "Please complete the couple, date and venue.";
      setEditorSection(editorSectionForField(String(result.error.issues[0]?.path[0] ?? "title")));
      setError(message);
      toast.error(message);
      return null;
    }
    return result.data;
  }

  function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const title = form.title.trim();
    if (!title) {
      setEditorSection("essentials");
      setError("Card title is required.");
      return;
    }
    const content = validateForm();
    if (!content) return;

    setBusy(true);
    setError("");
    try {
      if (editingId) {
        updateOfflineDraft(editingId, { title, content });
        toast.success("Draft saved offline");
      } else {
        createOfflineDraft({ title, content, ownerId: user?.id });
        toast.success("Draft saved offline on this device");
      }
      setEditorOpen(false);
      setEditingId(null);
      setForm(emptyInvitationForm());
      setActiveTab("invitations");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(draft: OfflineInvitationDraft) {
    setError("");
    if (!online || !isBrowserOnline()) {
      const msg = "Internet connection is required to publish. Your draft remains saved offline.";
      setError(msg);
      toast.error("Connect to the internet to publish.");
      return;
    }

    if (!invitationContentSchema.safeParse(draft.content).success) {
      const msg = "Complete required wedding details before publishing.";
      setError(msg);
      toast.error(msg);
      startEdit(draft);
      return;
    }

    if (!user) {
      toast.info("Sign in with your partner account to publish online.");
      await navigate({ to: "/sign-in", search: { redirect: "/offline-studio" } });
      return;
    }

    setPublishingId(draft.id);
    try {
      const published = await publishOfflineDraftToCloud<PublishedSummary>(
        draft,
        supabase,
        user.id,
      );
      setRecentlyPublished((prev) => [published, ...prev]);
      toast.success("Invitation published live");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to publish invitation.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPublishingId(null);
    }
  }

  function handleDelete(draft: OfflineInvitationDraft) {
    if (!window.confirm(`Delete offline draft "${draft.title}"?`)) return;
    deleteOfflineDraft(draft.id);
    toast.success("Offline draft deleted");
  }

  function shareUrl(slug: string) {
    return `${window.location.origin}/invite/${slug}`;
  }

  async function copyShare(slug: string) {
    const url = shareUrl(slug);
    if (await copyTextSafe(url)) {
      toast.success("Live link copied");
    } else {
      toast("Copy this link: " + url);
    }
  }

  return (
    <PlatformShell workspace>
      <main className="studio-content admin-main">
        <header className="admin-header">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1>Offline Studio</h1>
              <span
                className={`offline-status-pill ${online ? "is-online" : "is-offline"}`}
                role="status"
              >
                {online ? (
                  <>
                    <Globe2 size={12} aria-hidden="true" /> Online · Ready to publish
                  </>
                ) : (
                  <>
                    <WifiOff size={12} aria-hidden="true" /> Offline · Drafts saved on device
                  </>
                )}
              </span>
            </div>
            <div className="admin-metrics" aria-label="Offline workspace summary">
              <span>
                <strong>{drafts.length}</strong> offline {drafts.length === 1 ? "draft" : "drafts"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {user
                  ? `Signed in as ${username || "Partner"}`
                  : "No internet needed until you publish"}
              </span>
              {user && online && (
                <>
                  <span aria-hidden="true">·</span>
                  <Link to="/dashboard" className="underline underline-offset-2">
                    Open cloud dashboard
                  </Link>
                </>
              )}
            </div>
          </div>
          <button type="button" className="studio-button" onClick={() => startNew()}>
            <Plus size={16} /> New offline draft
          </button>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="dashboard-sections"
        >
          <TabsList aria-label="Offline studio sections" className="dashboard-tabs">
            <TabsTrigger value="invitations">
              Offline drafts <span>{drafts.length}</span>
            </TabsTrigger>
            <TabsTrigger value="templates">Templates ({invitationThemes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="invitations">
            <section aria-label="Offline drafts" className="dashboard-list-section">
              <div className="dashboard-list-heading">
                <p className="text-xs font-medium text-muted-foreground">
                  Saved locally on this device · Publishing requires internet
                </p>
                {drafts.length > 0 && (
                  <div className="dashboard-filters">
                    <label className="dashboard-search">
                      <Search size={14} />
                      <input
                        aria-label="Search offline drafts"
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </div>

              {error && !editorOpen && (
                <p role="alert" className="px-5 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              {recentlyPublished.length > 0 && (
                <div className="border-b border-border bg-emerald-50/50 px-5 py-3.5">
                  {recentlyPublished.map((pub) => (
                    <div
                      key={pub.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-1"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                        <strong>{pub.title}</strong>
                        <span className="text-xs text-muted-foreground">is now live</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void copyShare(pub.slug)}
                        >
                          <Copy size={13} /> Copy link
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setQrCard(pub)}>
                          <QrCode size={13} /> QR
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`You're invited! ${pub.title} — ${shareUrl(pub.slug)}`)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Share2 size={13} /> WhatsApp
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <a href={shareUrl(pub.slug)} target="_blank" rel="noreferrer">
                            <ExternalLink size={13} /> View
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {visibleDrafts.length > 0 ? (
                <div className="dashboard-invitation-list">
                  {visibleDrafts.map((draft) => {
                    const isPublishing = publishingId === draft.id;
                    return (
                      <article className="dashboard-invitation-row" key={draft.id}>
                        <div className="dashboard-row-title">
                          <div className="flex items-center gap-2.5">
                            <h3>{draft.title}</h3>
                            <span className="dashboard-card-status draft">offline draft</span>
                          </div>
                          <p>
                            /{draft.slug} · Saved{" "}
                            {new Date(draft.updated_at).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        <div className="dashboard-row-actions">
                          <Button size="sm" variant="outline" onClick={() => setPreviewCard(draft)}>
                            <Eye size={14} /> Preview
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => startEdit(draft)}>
                            <Edit3 size={14} /> Edit
                          </Button>
                          <Button
                            size="sm"
                            disabled={isPublishing}
                            title={
                              online
                                ? "Publish online (uses 1 partner credit)"
                                : "Connect to the internet to publish"
                            }
                            onClick={() => void handlePublish(draft)}
                          >
                            <UploadCloud size={14} /> {isPublishing ? "Publishing…" : "Publish"}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`More actions for ${draft.title}`}
                              >
                                <MoreHorizontal size={17} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setQrCard(draft)}>
                                <QrCode size={14} /> Print proof &amp; QR
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => handleDelete(draft)}
                              >
                                <Trash2 size={14} /> Delete draft
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : drafts.length === 0 ? (
                <div className="dashboard-empty">
                  <h3>No offline drafts yet</h3>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Create and preview cards completely offline. Connect to the internet only when
                    ready to publish.
                  </p>
                  <button type="button" className="studio-button" onClick={() => startNew()}>
                    <Plus size={15} /> Create offline draft
                  </button>
                </div>
              ) : (
                <div className="dashboard-no-results">
                  <h3>No drafts match your search.</h3>
                  <button
                    type="button"
                    className="studio-text-button"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </button>
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="templates">
            <section className="admin-templates-section">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setTemplateCategory("all")}
                  className={`admin-chip ${templateCategory === "all" ? "is-active" : ""}`}
                >
                  All ({invitationThemes.length})
                </button>
                {invitationThemeCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setTemplateCategory(category.id)}
                    className={`admin-chip ${templateCategory === category.id ? "is-active" : ""}`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              <div className="admin-template-grid">
                {visibleTemplates.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => startNew(theme.id)}
                    className="admin-template-card group"
                  >
                    <div className="admin-template-thumb" style={{ backgroundColor: theme.swatch }}>
                      <img
                        src={invitationArt[theme.id]}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="admin-template-meta">
                      <strong>{theme.label}</strong>
                      <Plus size={14} aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <Dialog
          open={editorOpen}
          onOpenChange={(open) => {
            if (!open) closeEditor();
          }}
        >
          <DialogContent
            className="studio-editor-dialog"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => {
              if (busy) e.preventDefault();
            }}
          >
            <div className="dashboard-editor-header">
              <DialogTitle>
                {editingId ? "Edit offline draft" : "New offline invitation"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Design your invitation offline and save locally on this device
              </DialogDescription>
            </div>
            <form noValidate className="dashboard-editor-form" onSubmit={handleSaveDraft}>
              <div className="dashboard-editor-body" ref={editorScroll}>
                <InvitationDetailsFields
                  compact
                  section={editorSection}
                  onSectionChange={setEditorSection}
                  value={form}
                  onChange={setForm}
                  cardId={editingId ?? undefined}
                  simran={false}
                  coupleLocked={false}
                />
              </div>
              <div className="dashboard-editor-footer">
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <div className="dashboard-editor-controls">
                  <Button type="button" variant="ghost" onClick={closeEditor} disabled={busy}>
                    Cancel
                  </Button>
                  <div>
                    {editorIndex > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          setEditorSection(invitationEditorSections[editorIndex - 1].id)
                        }
                      >
                        Back
                      </Button>
                    )}
                    {editorIndex < invitationEditorSections.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setEditorSection(invitationEditorSections[editorIndex + 1].id)
                        }
                      >
                        Next
                      </Button>
                    )}
                    <Button type="submit" disabled={busy}>
                      {busy ? "Saving…" : "Save offline"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={previewCard !== null}
          onOpenChange={(open) => {
            if (!open) setPreviewCard(null);
          }}
        >
          <DialogContent className="admin-preview-dialog">
            {previewCard && (
              <>
                <DialogDescription className="sr-only">
                  Preview of {previewCard.title}
                </DialogDescription>
                <InvitationPreview
                  title={previewCard.title}
                  content={previewCard.content}
                  cardId={previewCard.id}
                  header={
                    <div className="flex min-w-0 items-center gap-2.5">
                      <DialogTitle className="truncate text-base font-semibold">
                        {previewCard.title}
                      </DialogTitle>
                      <span className={`dashboard-card-status ${previewCard.status}`}>
                        {previewCard.status === "published" ? "published" : "offline draft"}
                      </span>
                    </div>
                  }
                />
              </>
            )}
          </DialogContent>
        </Dialog>

        <CardPrintDialog card={qrCard} onOpenChange={(open) => !open && setQrCard(null)} />
      </main>
    </PlatformShell>
  );
}
