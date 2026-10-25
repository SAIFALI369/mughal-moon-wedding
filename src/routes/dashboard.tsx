import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth, getUsernameFromUser } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  generateSlug,
  invitationContentSchema,
  type InvitationContent,
} from "@/components/wedding/invitation-schema";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Trash2,
  Edit3,
  Share2,
  Eye,
  HeartHandshake,
  QrCode,
  Plus,
  RefreshCw,
  UploadCloud,
  WifiOff,
} from "lucide-react";
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
import { invitationExpiry } from "@/components/wedding/invitation-details";
import { invitationArt } from "@/components/wedding/invitation-art";
import {
  invitationThemeCategories,
  invitationThemes,
} from "@/components/wedding/invitation-options";
import { PlatformShell } from "@/components/platform/platform-shell";
import { CardPrintDialog } from "@/components/platform/card-print-dialog";
import { InvitationPreview } from "@/components/platform/invitation-preview";
import { cleanupExpiredMemories, deleteSimranMemory } from "@/lib/simran-memory";
import {
  cacheCloudCards,
  cachePartnerAllowance,
  copyTextSafe,
  createOfflineDraft,
  deleteOfflineDraft,
  getCachedCloudCards,
  getCachedPartnerAllowance,
  getOfflineDraftsSync,
  isBrowserOnline,
  isOfflineDraftId,
  loadOfflineDrafts,
  publishOfflineDraftToCloud,
  subscribeOfflineDrafts,
  updateOfflineDraft,
  type OfflineInvitationDraft,
} from "@/lib/offline-studio";
import { useOnlineStatus } from "@/lib/pwa-install";

type PartnerAllowance = {
  shop_name: string;
  active: boolean;
  cards_purchased: number;
  cards_created: number;
};

type InvitationCard = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  expires_at?: string | null;
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Studio — InvitingYou" },
      { name: "description", content: "Manage your digital invitations and published cards." },
      { property: "og:title", content: "Studio — InvitingYou" },
      {
        property: "og:description",
        content: "Manage your digital invitations and published cards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

export function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [cloudCards, setCloudCards] = useState<InvitationCard[]>([]);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineInvitationDraft[]>(() =>
    getOfflineDraftsSync(),
  );
  const cards: InvitationCard[] = [...offlineDrafts, ...cloudCards];
  const [partner, setPartner] = useState<PartnerAllowance | null>(null);
  const remaining = Math.max(0, (partner?.cards_purchased ?? 0) - (partner?.cards_created ?? 0));
  const [fetching, setFetching] = useState(true);
  const canCreate = !online || (!fetching && !!partner?.active && remaining > 0);
  const [creating, setCreating] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<InvitationForm>(emptyInvitationForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<InvitationCard | null>(null);
  const [qrCard, setQrCard] = useState<InvitationCard | null>(null);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"invitations" | "templates" | "credits">(
    "invitations",
  );
  const [templateCategory, setTemplateCategory] = useState<string>("all");
  const [editorSection, setEditorSection] = useState<InvitationEditorSection>("essentials");
  const editorInitial = useRef("");
  const editorScroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorScroll.current) editorScroll.current.scrollTop = 0;
  }, [editorSection]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const filteredCards = cards.filter(
    (card) =>
      (statusFilter === "all" || card.status === statusFilter) &&
      `${card.title} ${card.slug}`.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const pageCount = Math.max(1, Math.ceil(filteredCards.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleCards = filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const editorIndex = invitationEditorSections.findIndex((item) => item.id === editorSection);

  function changeTab(next: "invitations" | "templates" | "credits") {
    setActiveTab(next);
  }

  function startNew(theme = emptyInvitationForm().theme) {
    const storybook = theme === "fairytale" || theme === "ballroom";
    const hindu = theme === "diya-utsav" || theme === "sacred-mandap";
    const next = {
      ...emptyInvitationForm(),
      theme,
      ...(storybook ? { framework: "curtain-call" as const } : {}),
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

  function closeEditor() {
    if (creating) return;
    if (
      JSON.stringify(form) !== editorInitial.current &&
      !window.confirm("Discard unsaved changes?")
    )
      return;
    setEditorOpen(false);
    setEditingId(null);
    setForm(emptyInvitationForm());
    setError("");
  }

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/sign-in" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const unsubscribe = subscribeOfflineDrafts(() => {
      setOfflineDrafts(getOfflineDraftsSync());
    });
    void loadOfflineDrafts();
    return unsubscribe;
  }, []);

  async function load() {
    if (!user) return;
    if (!online) {
      setPartner(getCachedPartnerAllowance(user.id));
      setCloudCards(getCachedCloudCards<InvitationCard>(user.id));
      setFetching(false);
      return;
    }
    setFetching(true);
    const { data: allowance, error: allowanceError } = await supabase
      .from("print_partners")
      .select("shop_name, active, cards_purchased, cards_created")
      .eq("owner_id", user.id)
      .maybeSingle();
    const resolvedPartner = allowanceError
      ? getCachedPartnerAllowance(user.id)
      : (allowance as PartnerAllowance | null);
    setPartner(resolvedPartner);
    if (!allowanceError && resolvedPartner) {
      cachePartnerAllowance(user.id, resolvedPartner);
    }
    if (allowanceError && !resolvedPartner) setError("Unable to load card credits.");
    cleanupExpiredMemories();
    try {
      await supabase.rpc("delete_expired_invitations");
    } catch {
      // Offline-safe fallback
    }
    const { data, error } = await supabase
      .from("invitation_cards")
      .select(
        "id, owner_id, title, slug, status, content, created_at, updated_at, published_at, expires_at",
      )
      .eq("owner_id", user?.id ?? "")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      const cached = getCachedCloudCards<InvitationCard>(user.id);
      if (cached.length > 0) {
        setCloudCards(cached);
      } else {
        setError(error.message);
      }
    } else {
      const filtered = (data as InvitationCard[]).filter((c) => {
        if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
          deleteSimranMemory(c.id);
          return false;
        }
        return true;
      });
      setCloudCards(filtered);
      cacheCloudCards(user.id, filtered);
    }
    setFetching(false);
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, online]);

  function validContent(): InvitationContent | null {
    const result = invitationContentSchema.safeParse(form);
    if (!result.success) {
      const message =
        result.error.issues[0]?.message || "Please fill in the couple, date and venue.";
      setEditorSection(editorSectionForField(String(result.error.issues[0]?.path[0] ?? "title")));
      setError(message);
      toast.error(message);
      return null;
    }
    return result.data;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    if (!canCreate) {
      setError("No card credits available.");
      toast.error("Card credit required.");
      return;
    }
    const title = form.title.trim();
    if (!title) {
      setEditorSection("essentials");
      setError("Title is required");
      return;
    }
    const content = validContent();
    if (!content) return;
    setCreating(true);
    setError("");
    try {
      if (!online) {
        createOfflineDraft({ title, content, ownerId: user?.id });
        toast.success("Draft saved offline on this device");
        setForm(emptyInvitationForm());
        setEditorOpen(false);
        setActiveTab("invitations");
        setSearch("");
        setStatusFilter("all");
        setPage(1);
        return;
      }
      const slug = generateSlug(title);
      const expires_at = invitationExpiry(content.date);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("invitation_cards")
        .insert({
          owner_id: session.session.user.id,
          title,
          slug,
          status: "draft",
          content,
          ...(expires_at ? { expires_at } : {}),
        })
        .select()
        .single();
      if (error) {
        setError(error.message);
        toast.error(error.message);
        return;
      }
      toast.success("Draft saved");
      setCloudCards((prev) => [data as InvitationCard, ...prev]);
      setForm(emptyInvitationForm());
      setEditorOpen(false);
      setActiveTab("invitations");
      setSearch("");
      setStatusFilter("all");
      setPage(1);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(card: InvitationCard) {
    if (!editingId || creating) return;
    setError("");
    const rawTitle = form.title.trim() || card.title;
    const rawContent = validContent();
    if (!rawContent) return;
    const { title, content } = preserveLockedCoupleIdentity(rawTitle, rawContent, card);
    if (isOfflineDraftId(card.id)) {
      updateOfflineDraft(card.id, { title, content });
      toast.success("Offline draft saved");
      setEditingId(null);
      setEditorOpen(false);
      setActiveTab("invitations");
      return;
    }
    if (!online) {
      const msg = "Connect to the internet to update a cloud card, or save a new offline draft.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase
        .from("invitation_cards")
        .update({ title, content, expires_at: invitationExpiry(content.date) })
        .eq("id", card.id)
        .eq("owner_id", user?.id ?? "");
      if (error) {
        setError(error.message);
        toast.error(error.message);
        return;
      }
      toast.success("Changes saved");
      setEditingId(null);
      setEditorOpen(false);
      setActiveTab("invitations");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setCreating(false);
    }
  }

  async function togglePublish(card: InvitationCard) {
    if (!online || !isBrowserOnline()) {
      const message = "Internet connection is required to publish.";
      setError(message);
      toast.error(message);
      return;
    }
    if (isOfflineDraftId(card.id)) {
      if (!user) return;
      try {
        await publishOfflineDraftToCloud<InvitationCard>(
          card as OfflineInvitationDraft,
          supabase,
          user.id,
        );
        toast.success("Published");
        await load();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unable to publish offline draft.";
        setError(message);
        toast.error(message);
      }
      return;
    }
    const newStatus = card.status === "draft" ? "published" : "draft";
    if (newStatus === "published" && !invitationContentSchema.safeParse(card.content).success) {
      const message = "Complete required wedding details before publishing.";
      setError(message);
      toast.error(message);
      startEdit(card);
      return;
    }
    const { error } = await supabase
      .from("invitation_cards")
      .update({ status: newStatus })
      .eq("id", card.id)
      .eq("owner_id", user?.id ?? "");
    if (error) {
      setError(error.message);
      toast.error(error.message);
      return;
    }
    toast.success(newStatus === "published" ? "Published" : "Moved to draft");
    load();
  }

  async function handleDelete(card: InvitationCard) {
    if (!confirm(`Delete "${card.title}"? This cannot be undone.`)) return;
    if (isOfflineDraftId(card.id)) {
      deleteOfflineDraft(card.id);
      toast.success("Deleted");
      return;
    }
    if (!online) {
      toast.error("Connect to the internet to delete a synced card.");
      return;
    }
    const { error } = await supabase
      .from("invitation_cards")
      .delete()
      .eq("id", card.id)
      .eq("owner_id", user?.id ?? "");
    if (error) {
      setError(error.message);
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    setCloudCards((prev) => prev.filter((c) => c.id !== card.id));
  }

  function startEdit(card: InvitationCard) {
    setEditorOpen(true);
    setEditingId(card.id);
    const next = invitationFormForCard(card.title, card.content);
    editorInitial.current = JSON.stringify(next);
    setForm(next);
    setEditorSection("essentials");
  }

  function shareUrl(card: InvitationCard) {
    return `${window.location.origin}/invite/${card.slug}`;
  }

  async function copyShare(card: InvitationCard) {
    const url = shareUrl(card);
    if (await copyTextSafe(url)) {
      toast.success("Link copied");
    } else {
      toast("Copy this link: " + url);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const editingCard = editingId ? (cards.find((item) => item.id === editingId) ?? null) : null;
  const editingCoupleLocked = isCardCoupleLocked(editingCard);
  const username = getUsernameFromUser(user);
  const publishedCount = cards.filter((c) => c.status === "published").length;
  const draftCount = cards.filter((c) => c.status === "draft").length;
  const visibleTemplates =
    templateCategory === "all"
      ? invitationThemes
      : invitationThemes.filter((theme) => theme.category === templateCategory);

  return (
    <PlatformShell workspace activeSection={activeTab} onSectionChange={changeTab}>
      <main className="studio-content admin-main">
        <header className="admin-header">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1>{partner?.shop_name || username || "Studio"}</h1>
              {!online && (
                <span className="offline-status-pill is-offline" role="status">
                  <WifiOff size={12} aria-hidden="true" /> Offline · Connect to publish
                </span>
              )}
            </div>
            <div className="admin-metrics" aria-label="Workspace summary">
              <span>
                <strong>{fetching ? "—" : remaining}</strong> credits left
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong>{fetching ? "—" : publishedCount}</strong> published
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong>{fetching ? "—" : draftCount}</strong> drafts
              </span>
            </div>
          </div>
          <button className="studio-button" disabled={!canCreate} onClick={() => startNew()}>
            <Plus size={16} /> Create invitation
          </button>
        </header>

        {online &&
          !fetching &&
          (!partner?.active || remaining === 0) &&
          activeTab !== "credits" && (
            <p className="dashboard-access-notice" role="status">
              {!partner?.active ? "Account allowance inactive." : "0 credits remaining."}{" "}
              <button onClick={() => changeTab("credits")}>View credits →</button>
            </p>
          )}

        <Tabs
          value={activeTab}
          onValueChange={(value) => changeTab(value as typeof activeTab)}
          className="dashboard-sections"
        >
          <TabsList aria-label="Workspace sections" className="dashboard-tabs">
            <TabsTrigger value="invitations">
              Invitations <span>{cards.length}</span>
            </TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="invitations">
            <section
              id="my-invitations"
              aria-label="Your invitations"
              className="dashboard-list-section"
            >
              <div className="dashboard-list-heading">
                <p className="text-xs font-medium text-muted-foreground">
                  {cards.length} active invitations
                </p>
                <div className="dashboard-filters">
                  <label className="dashboard-search">
                    <Search size={14} />
                    <input
                      aria-label="Search invitations"
                      placeholder="Search…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                  </label>
                  <select
                    aria-label="Filter invitations by status"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              {error && !editorOpen && (
                <p role="alert" className="px-5 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              {fetching ? (
                <p className="p-8 text-center text-sm text-muted-foreground" role="status">
                  Loading…
                </p>
              ) : visibleCards.length > 0 ? (
                <div className="dashboard-invitation-list">
                  {visibleCards.map((card) => (
                    <article className="dashboard-invitation-row" key={card.id}>
                      <div className="dashboard-row-title">
                        <div className="flex items-center gap-2.5">
                          <h3>{card.title}</h3>
                          <span className={`dashboard-card-status ${card.status}`}>
                            {isOfflineDraftId(card.id) ? "offline draft" : card.status}
                          </span>
                        </div>
                        <p>
                          /{card.slug} · {new Date(card.updated_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div className="dashboard-row-actions">
                        <Button size="sm" variant="outline" onClick={() => setPreviewCard(card)}>
                          <Eye size={14} /> Preview
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(card)}>
                          <Edit3 size={14} /> Edit
                        </Button>
                        {card.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => void togglePublish(card)}
                            title={
                              online
                                ? "Publish live invitation"
                                : "Connect to the internet to publish"
                            }
                          >
                            <UploadCloud size={14} /> Publish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setQrCard(card)}
                          aria-label={`Print card & QR for ${card.title}`}
                        >
                          <QrCode size={14} /> QR
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`More actions for ${card.title}`}
                            >
                              <MoreHorizontal size={17} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => void togglePublish(card)}>
                              <Eye size={14} />{" "}
                              {card.status === "draft" ? "Publish" : "Move to draft"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setQrCard(card)}>
                              <QrCode size={14} /> Print &amp; QR
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={card.status !== "published"}
                              onSelect={() => void copyShare(card)}
                            >
                              <Copy size={14} /> Copy link
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/profile" hash={`card-${card.id}`}>
                                <HeartHandshake size={14} /> Responses
                              </Link>
                            </DropdownMenuItem>
                            {card.status === "published" && (
                              <>
                                <DropdownMenuItem asChild>
                                  <a href={shareUrl(card)} target="_blank" rel="noreferrer">
                                    <ExternalLink size={14} /> Open live link
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`You're invited! ${card.title} — ${shareUrl(card)}`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <Share2 size={14} /> Share on WhatsApp
                                  </a>
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => void handleDelete(card)}
                            >
                              <Trash2 size={14} /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </article>
                  ))}
                </div>
              ) : cards.length === 0 ? (
                <div className="dashboard-empty">
                  <h3>No invitations yet</h3>
                  <button
                    className="studio-button"
                    disabled={!canCreate}
                    onClick={() => startNew()}
                  >
                    <Plus size={15} /> Create first invitation
                  </button>
                </div>
              ) : (
                <div className="dashboard-no-results">
                  <h3>No invitations match your search.</h3>
                  <button
                    className="studio-text-button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {filteredCards.length > 0 && !fetching && (
                <div className="dashboard-pagination">
                  <span>
                    {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, filteredCards.length)} of{" "}
                    {filteredCards.length}
                  </span>
                  <div>
                    <button
                      aria-label="Previous page"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span>
                      Page {currentPage} of {pageCount}
                    </span>
                    <button
                      aria-label="Next page"
                      disabled={currentPage === pageCount}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="templates">
            <section id="collection" className="admin-templates-section">
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
                    disabled={!canCreate}
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

          <TabsContent value="credits">
            <section className="partner-credit-panel" aria-label="Partner card package">
              <div>
                <h2>Credits</h2>
                <p>
                  {partner?.cards_created ?? 0} of {partner?.cards_purchased ?? 0} used · ₹1,000
                  cash = 10 cards (1 credit per new card).
                </p>
              </div>
              <div className="partner-credit-balance">
                <strong>{fetching ? "…" : remaining}</strong>
                <span>remaining</span>
                <button onClick={() => void load()} disabled={fetching}>
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
              {!fetching && (!partner?.active || remaining === 0) && (
                <p className="partner-credit-warning" role="status">
                  {!partner
                    ? "No shop allowance yet — contact your InvitingYou representative."
                    : !partner.active
                      ? "Partner access is inactive."
                      : "All credits used — contact your InvitingYou representative for another 10-card package."}
                </p>
              )}
            </section>
          </TabsContent>
        </Tabs>

        {/* EDITOR MODAL */}
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
              if (creating) e.preventDefault();
            }}
          >
            <div className="dashboard-editor-header">
              <DialogTitle>{editingId ? "Edit invitation" : "New invitation"}</DialogTitle>
              <DialogDescription className="sr-only">
                {editingId ? "Edit invitation details" : "Create a new invitation draft"}
              </DialogDescription>
            </div>
            <form
              noValidate
              className="dashboard-editor-form"
              onSubmit={
                editingId
                  ? (e) => {
                      e.preventDefault();
                      const c = cards.find((x) => x.id === editingId);
                      if (c) handleUpdate(c);
                    }
                  : handleCreate
              }
            >
              <div className="dashboard-editor-body" ref={editorScroll}>
                <InvitationDetailsFields
                  compact
                  section={editorSection}
                  onSectionChange={setEditorSection}
                  value={form}
                  onChange={setForm}
                  cardId={editingId ?? undefined}
                  simran={!!partner?.active}
                  coupleLocked={editingCoupleLocked}
                />
              </div>
              <div className="dashboard-editor-footer">
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <div className="dashboard-editor-controls">
                  <Button type="button" variant="ghost" onClick={closeEditor} disabled={creating}>
                    Cancel
                  </Button>
                  <div>
                    {editorIndex > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={creating}
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
                    <Button type="submit" disabled={creating || (!editingId && !canCreate)}>
                      {creating ? "Saving…" : editingId ? "Save" : "Create"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* PREVIEW MODAL */}
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
                        {previewCard.status}
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
