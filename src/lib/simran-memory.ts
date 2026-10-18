export type SimranMemory = {
  cardId: string;
  cardTitle: string;
  groomName: string;
  brideName: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  customDetails: string; // free text: what Simran should know
  updatedAt: string;
  expiresAt: string; // ISO, when marriage ends -> auto-delete
};

const PREFIX = "simran-memory-";

export function memoryKey(cardId: string) {
  return `${PREFIX}${cardId}`;
}

export function saveSimranMemory(mem: SimranMemory) {
  if (typeof window === "undefined") return;
  localStorage.setItem(memoryKey(mem.cardId), JSON.stringify(mem));
  // also keep index
  const idx = getMemoryIndex();
  if (!idx.includes(mem.cardId)) {
    localStorage.setItem("simran-memory-index", JSON.stringify([...idx, mem.cardId]));
  }
}

export function getSimranMemory(cardId: string): SimranMemory | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(memoryKey(cardId));
  if (!raw) return null;
  try {
    const mem = JSON.parse(raw) as SimranMemory;
    // auto-delete if expired
    if (mem.expiresAt && new Date(mem.expiresAt).getTime() < Date.now()) {
      deleteSimranMemory(cardId);
      return null;
    }
    return mem;
  } catch {
    return null;
  }
}

export function getAllSimranMemories(): SimranMemory[] {
  if (typeof window === "undefined") return [];
  const idx = getMemoryIndex();
  const out: SimranMemory[] = [];
  for (const id of idx) {
    const m = getSimranMemory(id);
    if (m) out.push(m);
  }
  return out;
}

export function deleteSimranMemory(cardId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(memoryKey(cardId));
  const idx = getMemoryIndex().filter((id) => id !== cardId);
  localStorage.setItem("simran-memory-index", JSON.stringify(idx));
}

export function getMemoryIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("simran-memory-index");
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function buildMemoryPrompt(memories: SimranMemory[]): string {
  if (memories.length === 0) return "";
  return memories
    .map((m) => {
      const lines = [
        `CARD "${m.cardTitle}" (id:${m.cardId}): Couple ${m.groomName} & ${m.brideName}. Date: ${m.date} ${m.time}. Venue: ${m.venue} — ${m.address}.`,
      ];
      if (m.customDetails?.trim()) lines.push(`Owner notes for Simran: ${m.customDetails.trim().slice(0, 2000)}`);
      lines.push(`(This memory is LOCAL ONLY, not saved on server, expires ${m.expiresAt})`);
      return lines.join(" ");
    })
    .join("\n");
}

export function cleanupExpiredMemories(): string[] {
  const idx = getMemoryIndex();
  const expired: string[] = [];
  for (const id of idx) {
    const raw = localStorage.getItem(memoryKey(id));
    if (!raw) continue;
    try {
      const m = JSON.parse(raw) as SimranMemory;
      if (m.expiresAt && new Date(m.expiresAt).getTime() < Date.now()) {
        deleteSimranMemory(id);
        expired.push(id);
      }
    } catch {
      deleteSimranMemory(id);
    }
  }
  return expired;
}
