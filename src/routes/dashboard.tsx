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
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import {
  InvitationDetailsFields,
  invitationEditorSections,
  editorSectionForField,
  type InvitationEditorSection,
} from "@/components/wedding/invitation-form";
import {
  emptyInvitationForm,
  invitationFormForCard,
  type InvitationForm,
} from "@/components/wedding/invitation-form-data";
import {
  getInvitationAssistantName,
  getInvitationDetails,
  invitationExpiry,
} from "@/components/wedding/invitation-details";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import {
  Copy,
  ExternalLink,
  Trash2,
  Edit3,
  Share2,
  Eye,
  HeartHandshake,
  Sparkles,
  Music2,
} from "lucide-react";
import { invitationThemes } from "@/components/wedding/invitation-options";
import { PlatformShell } from "@/components/platform/platform-shell";
import { Plus, FileHeart, Globe2, FileEdit, ArrowRight } from "lucide-react";
import { cleanupExpiredMemories, deleteSimranMemory } from "@/lib/simran-memory";

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
      { title: "Your invitation studio — InvitingYou" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

export function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<InvitationCard[]>([]);
  const [partner, setPartner] = useState<PartnerAllowance | null>(null);
  const remaining = Math.max(0, (partner?.cards_purchased ?? 0) - (partner?.cards_created ?? 0));
  const [fetching, setFetching] = useState(true);
  const canCreate = !fetching && !!partner?.active && remaining > 0;
  const [creating, setCreating] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<InvitationForm>(emptyInvitationForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<InvitationCard | null>(null);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"invitations" | "templates" | "credits">(
    "invitations",
  );
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
    const next = { ...emptyInvitationForm(), theme };
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
      !window.confirm("Discard your unsaved changes?")
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

  async function load() {
    if (!user) return;
    setFetching(true);
    const { data: allowance, error: allowanceError } = await supabase
      .from("print_partners")
      .select("shop_name, active, cards_purchased, cards_created")
      .eq("owner_id", user.id)
      .maybeSingle();
    setPartner(allowanceError ? null : (allowance as PartnerAllowance | null));
    if (allowanceError)
      setError(
        "Unable to load your card credits. Please retry or contact your InvitingYou representative.",
      );
    // cleanup expired local memories first (never saved on server)
    cleanupExpiredMemories();
    // auto-delete expired cards (client-side, server also has RPC)
    try {
      await supabase.rpc("delete_expired_invitations");
    } catch {
      // Cleanup can fail offline; the dashboard and public route also hide expired cards.
    }
    // Defense in depth: RLS already restricts rows to the owner;
    // always scope queries by owner_id so no other row can leak.
    const { data, error } = await supabase
      .from("invitation_cards")
      .select(
        "id, owner_id, title, slug, status, content, created_at, updated_at, published_at, expires_at",
      )
      .eq("owner_id", user?.id ?? "")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      const filtered = (data as InvitationCard[]).filter((c) => {
        if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
          // card expired -> will be deleted by RPC next load, hide for now and clear local memory
          deleteSimranMemory(c.id);
          return false;
        }
        return true;
      });
      setCards(filtered);
    }
    setFetching(false);
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      setError(
        "No card credits available. Contact your InvitingYou representative for a ₹1,000 cash package (10 cards).",
      );
      toast.error("Partner access and a card credit are required.");
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
      const slug = generateSlug(title);
      // Store a new expiry based on this card's date, not the homepage date.
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
        if (error.code === "23505" || error.message.includes("credits")) {
          setError(error.message);
          toast.error(error.message);
        } else {
          setError(error.message);
        }
        return;
      }
      toast.success("Card created as draft (private). Only you can see it until published.");
      setCards((prev) => [data as InvitationCard, ...prev]);
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
    const title = form.title.trim() || card.title;
    const content = validContent();
    if (!content) return;
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
      toast.success("Card updated");
      setEditingId(null);
      setEditorOpen(false);
      setActiveTab("invitations");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save changes. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function togglePublish(card: InvitationCard) {
    const newStatus = card.status === "draft" ? "published" : "draft";
    if (newStatus === "published" && !invitationContentSchema.safeParse(card.content).success) {
      const message = "Complete the required wedding details before publishing this card.";
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
    toast.success(
      newStatus === "published" ? "Published! Share your link." : "Moved back to draft (private).",
    );
    load();
  }

  async function handleDelete(card: InvitationCard) {
    if (
      !confirm(`Delete "${card.title}"? This cannot be undone and does not restore a card credit.`)
    )
      return;
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
    toast.success("Card deleted");
    setCards((prev) => prev.filter((c) => c.id !== card.id));
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
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied!");
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Loading your account…</p>
      </main>
    );
  }

  const username = getUsernameFromUser(user);

  return (
    <PlatformShell workspace activeSection={activeTab} onSectionChange={changeTab}>
      <div className="studio-topbar">
        <span>
          Your workspace /{" "}
          {activeTab === "invitations"
            ? "Invitations"
            : activeTab === "templates"
              ? "Templates"
              : "Credits"}
        </span>
        <div>
          <span className="studio-status-dot" /> Your next chapter, organised
        </div>
      </div>
      <main className="studio-content studio-dashboard compact-dashboard">
        <header className="studio-dashboard-heading">
          <div>
            <span className="studio-eyebrow">YOUR EXCLUSIVE PRINT-SHOP WORKSPACE</span>
            <h1>Welcome back, {partner?.shop_name || username || "partner"}.</h1>
            <p>Create digital invitations for your customers. Your shop, your workspace.</p>
          </div>
          <button className="studio-button" disabled={!canCreate} onClick={() => startNew()}>
            <Plus size={17} /> Create invitation
          </button>
        </header>
        <div className="studio-stats">
          {[
            {
              label: "Card credits remaining",
              value: remaining,
              icon: FileHeart,
              note: `${partner?.cards_created ?? 0} of ${partner?.cards_purchased ?? 0} credits used`,
            },
            {
              label: "Published & ready",
              value: cards.filter((c) => c.status === "published").length,
              icon: Globe2,
              note: "Ready to share with your people",
            },
            {
              label: "Works in progress",
              value: cards.filter((c) => c.status === "draft").length,
              icon: FileEdit,
              note: "Private, until you say otherwise",
            },
          ].map((stat) => (
            <div className="studio-stat" key={stat.label}>
              <span className="studio-stat-icon">
                <stat.icon size={20} />
              </span>
              <div>
                <span>{stat.label}</span>
                <strong>{fetching ? "—" : stat.value}</strong>
                <p>{stat.note}</p>
              </div>
            </div>
          ))}
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => changeTab(value as typeof activeTab)}
          className="dashboard-sections"
        >
          <TabsList aria-label="Workspace sections" className="dashboard-tabs">
            <TabsTrigger value="invitations">
              <FileHeart size={15} /> Invitations <span>{cards.length}</span>
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Sparkles size={15} /> Templates
            </TabsTrigger>
            <TabsTrigger value="credits">
              <Wallet size={15} /> Credits & access
            </TabsTrigger>
          </TabsList>
          <TabsContent value="invitations">
            <section
              id="my-invitations"
              aria-label="Your invitations"
              className="dashboard-list-section"
            >
              <div className="dashboard-list-heading">
                <div>
                  <h2>Your invitations</h2>
                  <p>{cards.length} active invitations</p>
                </div>
                <div className="dashboard-filters">
                  <label className="dashboard-search">
                    <Search size={15} />
                    <input
                      aria-label="Search invitations"
                      placeholder="Search invitations…"
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
                    <option value="all">All statuses</option>
                    <option value="draft">Drafts</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              {error && !editorOpen && (
                <p role="alert" className="text-sm text-destructive p-4">
                  {error}
                </p>
              )}
              {fetching ? (
                <p className="p-8 text-sm text-muted-foreground" role="status">
                  Loading invitations…
                </p>
              ) : visibleCards.length > 0 ? (
                <div className="dashboard-invitation-list">
                  {visibleCards.map((card) => (
                    <article className="dashboard-invitation-row" key={card.id}>
                      <span className="dashboard-card-icon" aria-hidden="true">
                        <FileHeart size={21} />
                      </span>
                      <div className="dashboard-row-title">
                        <h3>{card.title}</h3>
                        <p>
                          Updated {new Date(card.updated_at).toLocaleDateString("en-IN")} · /
                          {card.slug}
                        </p>
                      </div>
                      <span className={`dashboard-card-status ${card.status}`}>{card.status}</span>
                      <div className="dashboard-row-actions">
                        <Button size="sm" variant="outline" onClick={() => setPreviewCard(card)}>
                          <Eye size={14} /> Preview
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(card)}>
                          <Edit3 size={14} /> Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`More actions for ${card.title}`}
                            >
                              <MoreHorizontal size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => void togglePublish(card)}>
                              <Eye size={14} />{" "}
                              {card.status === "draft"
                                ? "Publish invitation"
                                : "Unpublish invitation"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={card.status !== "published"}
                              onSelect={() => void copyShare(card)}
                            >
                              <Copy size={14} /> Copy share link
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/profile" hash={`card-${card.id}`}>
                                <HeartHandshake size={14} /> Guest responses
                              </Link>
                            </DropdownMenuItem>
                            {card.status === "published" && (
                              <>
                                <DropdownMenuItem asChild>
                                  <a href={shareUrl(card)} target="_blank" rel="noreferrer">
                                    <ExternalLink size={14} /> View live invitation
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
                              <Trash2 size={14} /> Delete invitation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </article>
                  ))}
                </div>
              ) : cards.length === 0 ? (
                <div className="studio-empty dashboard-empty">
                  <span>✧</span>
                  <h3>Your next customer’s story starts here.</h3>
                  <p>Create a private draft, personalise it, then share when ready.</p>
                  <button
                    className="studio-button"
                    disabled={!canCreate}
                    onClick={() => startNew()}
                  >
                    <Plus size={16} /> Create your first invitation
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
                    {filteredCards.length} invitations
                  </span>
                  <div>
                    <button
                      aria-label="Previous page"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>
                      Page {currentPage} of {pageCount}
                    </span>
                    <button
                      aria-label="Next page"
                      disabled={currentPage === pageCount}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </TabsContent>
          <TabsContent value="templates">
            {" "}
            <section id="collection" className="studio-collection">
              <div className="studio-section-heading">
                <div>
                  <span className="studio-eyebrow">A LOOK THAT FEELS LIKE YOU</span>
                  <h2>Find your invitation’s mood.</h2>
                </div>
                <span className="studio-collection-tag">8 themes · 4 layouts</span>
              </div>
              <div className="studio-theme-options">
                {invitationThemes.map((theme) => (
                  <button key={theme.id} disabled={!canCreate} onClick={() => startNew(theme.id)}>
                    <span style={{ background: theme.swatch }} aria-hidden="true">
                      ✧
                    </span>
                    <strong>{theme.label}</strong>
                    <span>{theme.description}</span>
                    <span className="studio-theme-action">
                      Start with this theme <Plus size={12} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </TabsContent>
          <TabsContent value="credits">
            {" "}
            <section className="partner-credit-panel" aria-label="Partner card package">
              <div>
                <span className="studio-eyebrow">EXCLUSIVE PARTNER PACKAGE</span>
                <h2>₹1,000 cash. 10 digital cards.</h2>
                <p>
                  One credit is used when a new draft is created. Editing, publishing and sharing do
                  not use extra credits. Deleting or expiry does not restore a credit.
                </p>
              </div>
              <div className="partner-credit-balance">
                <strong>{fetching ? "…" : remaining}</strong>
                <span>credits remaining</span>
                <button onClick={() => void load()} disabled={fetching}>
                  Refresh balance
                </button>
              </div>
              {!fetching && (!partner?.active || remaining === 0) && (
                <p className="partner-credit-warning" role="status">
                  {!partner
                    ? "Your account has not been activated as a print-shop partner."
                    : !partner.active
                      ? "Your partner access is inactive."
                      : "You have used all your card credits."}{" "}
                  Contact your InvitingYou representative. Accounts and additional packages are
                  issued personally after cash payment—there is no online checkout.
                </p>
              )}
            </section>
          </TabsContent>
        </Tabs>
        {!fetching && (!partner?.active || remaining === 0) && activeTab !== "credits" && (
          <p className="dashboard-access-notice" role="status">
            {!partner?.active ? "Partner access needs activation." : "No card credits remaining."}{" "}
            <button onClick={() => changeTab("credits")}>View credits & access →</button>
          </p>
        )}
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
              <DialogDescription>
                {editingId
                  ? "Changes to an existing invitation do not use another credit."
                  : "Build your private draft. One credit is used only when you save it."}
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
                />
              </div>
              <div className="dashboard-editor-footer">
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <div className="dashboard-editor-controls">
                  <span>
                    Section {editorIndex + 1} of {invitationEditorSections.length}
                  </span>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeEditor}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={editorIndex === 0 || creating}
                      onClick={() => setEditorSection(invitationEditorSections[editorIndex - 1].id)}
                    >
                      Back
                    </Button>
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
                      {creating ? "Saving…" : editingId ? "Save changes" : "Save draft · 1 credit"}
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
          <DialogContent className="max-h-[92dvh] w-[96vw] max-w-[1100px] gap-0 overflow-y-auto p-0 sm:max-w-[1100px]">
            {previewCard && (
              <>
                <div className="bg-background px-6 py-5">
                  <DialogTitle className="font-serif text-2xl">
                    {previewCard.title} — preview
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {previewCard.status === "draft"
                      ? "Private draft: only you can see this preview. Publish to share a live link."
                      : "This is what guests see at your published link."}
                  </DialogDescription>
                </div>
                <PersonalInvitation
                  title={previewCard.title}
                  content={previewCard.content}
                  showGate={false}
                  preview
                />
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </PlatformShell>
  );
}
