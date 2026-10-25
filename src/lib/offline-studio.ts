import type { SupabaseClient } from "@supabase/supabase-js";
import { invitationExpiry } from "@/components/wedding/invitation-details";
import {
  generateSlug,
  invitationContentSchema,
  type InvitationContent,
} from "@/components/wedding/invitation-schema";

export type OfflineInvitationDraft = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft";
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  published_at: null;
  expires_at: string | null;
  localOnly: true;
};

export type CachedPartnerAllowance = {
  shop_name: string;
  active: boolean;
  cards_purchased: number;
  cards_created: number;
};

const DRAFTS_STORAGE_KEY = "invitingyou:offline-drafts:v1";
const PARTNER_CACHE_PREFIX = "invitingyou:cached-partner:v1:";
const CARDS_CACHE_PREFIX = "invitingyou:cached-cards:v1:";
const IDB_NAME = "invitingyou-offline-db";
const IDB_STORE = "kv";
const IDB_DRAFTS_KEY = "offline-drafts";

let memoryDrafts: OfflineInvitationDraft[] | null = null;
const deletedDraftIds = new Set<string>();
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) listener();
}

export function subscribeOfflineDrafts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isOfflineDraftId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("offline-");
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

function makeOfflineId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `offline-${crypto.randomUUID()}`;
  }
  return `offline-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readLocalStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalStorageJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded (e.g. multiple photos); IndexedDB still stores full payload below.
  }
}

function openOfflineIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeIdbDrafts(drafts: OfflineInvitationDraft[]): Promise<void> {
  const db = await openOfflineIdb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(drafts, IDB_DRAFTS_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function readIdbDrafts(): Promise<OfflineInvitationDraft[] | null> {
  const db = await openOfflineIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_DRAFTS_KEY);
      req.onsuccess = () => {
        resolve(Array.isArray(req.result) ? (req.result as OfflineInvitationDraft[]) : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function sanitizeStoredDrafts(raw: unknown): OfflineInvitationDraft[] {
  if (!Array.isArray(raw)) return [];
  const valid: OfflineInvitationDraft[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Partial<OfflineInvitationDraft>;
    if (typeof rec.id !== "string" || typeof rec.title !== "string") continue;
    valid.push({
      id: isOfflineDraftId(rec.id) ? rec.id : `offline-${rec.id}`,
      owner_id: typeof rec.owner_id === "string" ? rec.owner_id : "offline-local",
      title: rec.title,
      slug: typeof rec.slug === "string" && rec.slug ? rec.slug : generateSlug(rec.title),
      status: "draft",
      content:
        rec.content && typeof rec.content === "object" && !Array.isArray(rec.content)
          ? (rec.content as Record<string, unknown>)
          : {},
      created_at: typeof rec.created_at === "string" ? rec.created_at : new Date().toISOString(),
      updated_at: typeof rec.updated_at === "string" ? rec.updated_at : new Date().toISOString(),
      published_at: null,
      expires_at: typeof rec.expires_at === "string" ? rec.expires_at : null,
      localOnly: true,
    });
  }
  return valid.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getOfflineDraftsSync(): OfflineInvitationDraft[] {
  if (memoryDrafts) return memoryDrafts;
  const loaded = sanitizeStoredDrafts(readLocalStorageJson<unknown[]>(DRAFTS_STORAGE_KEY, []));
  memoryDrafts = loaded;
  return loaded;
}

export async function loadOfflineDrafts(): Promise<OfflineInvitationDraft[]> {
  const fromIdb = await readIdbDrafts();
  const fromLocal = getOfflineDraftsSync();
  if (fromIdb && fromIdb.length > 0) {
    const mergedMap = new Map<string, OfflineInvitationDraft>();
    for (const d of sanitizeStoredDrafts(fromIdb)) {
      if (!deletedDraftIds.has(d.id)) mergedMap.set(d.id, d);
    }
    for (const d of fromLocal) {
      const existing = mergedMap.get(d.id);
      if (!existing || d.updated_at > existing.updated_at) {
        mergedMap.set(d.id, d);
      }
    }
    const merged = Array.from(mergedMap.values()).sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
    const changed = JSON.stringify(merged) !== JSON.stringify(fromLocal);
    memoryDrafts = merged;
    writeLocalStorageJson(DRAFTS_STORAGE_KEY, merged);
    if (changed) notifyListeners();
    return merged;
  }
  return fromLocal;
}

function persistDrafts(next: OfflineInvitationDraft[]): OfflineInvitationDraft[] {
  const sorted = [...next].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  memoryDrafts = sorted;
  writeLocalStorageJson(DRAFTS_STORAGE_KEY, sorted);
  void writeIdbDrafts(sorted);
  notifyListeners();
  return sorted;
}

export function createOfflineDraft(input: {
  title: string;
  content: InvitationContent;
  ownerId?: string;
}): OfflineInvitationDraft {
  const now = new Date().toISOString();
  const cleanTitle = input.title.trim();
  const draft: OfflineInvitationDraft = {
    id: makeOfflineId(),
    owner_id: input.ownerId || "offline-local",
    title: cleanTitle,
    slug: generateSlug(cleanTitle),
    status: "draft",
    content: input.content as unknown as Record<string, unknown>,
    created_at: now,
    updated_at: now,
    published_at: null,
    expires_at: invitationExpiry(input.content.date) ?? null,
    localOnly: true,
  };
  const current = getOfflineDraftsSync();
  persistDrafts([draft, ...current]);
  return draft;
}

export function updateOfflineDraft(
  id: string,
  input: { title: string; content: InvitationContent },
): OfflineInvitationDraft | null {
  const current = getOfflineDraftsSync();
  const target = current.find((item) => item.id === id);
  if (!target) return null;
  const now = new Date().toISOString();
  const cleanTitle = input.title.trim() || target.title;
  const updated: OfflineInvitationDraft = {
    ...target,
    title: cleanTitle,
    content: input.content as unknown as Record<string, unknown>,
    updated_at: now,
    expires_at: invitationExpiry(input.content.date) ?? null,
  };
  persistDrafts(current.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export function deleteOfflineDraft(id: string): void {
  deletedDraftIds.add(id);
  const current = getOfflineDraftsSync();
  persistDrafts(current.filter((item) => item.id !== id));
}

export function clearOfflineDraftsMemoryForTests(): void {
  memoryDrafts = null;
  deletedDraftIds.clear();
}

/**
 * Publishes an offline draft to the cloud. Strictly requires an active internet
 * connection and an authenticated Partner account with available card credits.
 */
export async function publishOfflineDraftToCloud<
  TRow extends { id: string; slug: string; title: string; status: string },
>(
  draft: OfflineInvitationDraft,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: SupabaseClient<any>,
  ownerId: string,
): Promise<TRow> {
  if (!isBrowserOnline()) {
    throw new Error(
      "Internet connection is required to publish. Your draft remains saved offline.",
    );
  }
  const parsed = invitationContentSchema.safeParse(draft.content);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message || "Complete required wedding details before publishing.",
    );
  }
  const expires_at = invitationExpiry(parsed.data.date);
  const slug = draft.slug || generateSlug(draft.title);

  const { data: inserted, error: insertError } = await supabaseClient
    .from("invitation_cards")
    .insert({
      owner_id: ownerId,
      title: draft.title.trim(),
      slug,
      status: "draft",
      content: parsed.data,
      ...(expires_at ? { expires_at } : {}),
    })
    .select()
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message || "Unable to upload draft for publishing.");
  }

  const { data: published, error: publishError } = await supabaseClient
    .from("invitation_cards")
    .update({ status: "published" })
    .eq("id", inserted.id)
    .eq("owner_id", ownerId)
    .select()
    .single();

  // Remove the local-only draft once uploaded to the cloud so it isn't duplicated
  deleteOfflineDraft(draft.id);

  if (publishError || !published) {
    throw new Error(
      publishError?.message || "Draft uploaded to your studio, but publishing could not finish.",
    );
  }

  return published as TRow;
}

export function cachePartnerAllowance(ownerId: string, partner: CachedPartnerAllowance | null) {
  if (!ownerId || !partner) return;
  writeLocalStorageJson(`${PARTNER_CACHE_PREFIX}${ownerId}`, partner);
}

export function getCachedPartnerAllowance(ownerId: string): CachedPartnerAllowance | null {
  if (!ownerId) return null;
  return readLocalStorageJson<CachedPartnerAllowance | null>(
    `${PARTNER_CACHE_PREFIX}${ownerId}`,
    null,
  );
}

export function cacheCloudCards<T>(ownerId: string, cards: T[]) {
  if (!ownerId) return;
  writeLocalStorageJson(`${CARDS_CACHE_PREFIX}${ownerId}`, cards);
}

export function getCachedCloudCards<T>(ownerId: string): T[] {
  if (!ownerId) return [];
  return readLocalStorageJson<T[]>(`${CARDS_CACHE_PREFIX}${ownerId}`, []);
}
