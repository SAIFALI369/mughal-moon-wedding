/**
 * Turns a pasted list or a CSV export into the guest names that go on printed
 * QR inserts. Everything happens in the browser; the list is never uploaded.
 */

export const MAX_GUEST_ENTRIES = 300;
const MAX_NAME_LENGTH = 80;

export type GuestEntry = { name: string };

export type GuestListParse = {
  entries: GuestEntry[];
  /** Rows that were empty or could not be a real name. */
  skipped: number;
  /** Too many rows: the rest were dropped, not silently wrapped into the sheet. */
  truncated: number;
};

const NAME_HEADER = /^(name|full name|guest|guest name|family|family name|mehmaan|mehman|naam)$/i;
const IGNORED_HEADER =
  /^(s ?no\.?|sr\.?|serial|s\.no|#|phone|mobile|contact|email|address|notes?)$/i;

/** RFC 4180 rows: quoted cells may contain commas, newlines and doubled quotes. */
export function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const text = input.replace(/\r\n?/g, "\n");

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      // Blank lines are padding, not guests.
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normaliseName(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

/** A printable label needs letters; "1", "-", "N/A" and stray punctuation are not names. */
export function isPrintableGuestName(value: string): boolean {
  const name = normaliseName(value);
  if (name.length < 2) return false;
  if (!/\p{L}/u.test(name)) return false;
  if (!/^[\p{L}\p{M}\p{N}'’,.\-&() /]+$/u.test(name)) return false;
  return true;
}

function looksLikeHeader(row: string[]): boolean {
  return row.some((cell) => NAME_HEADER.test(cell.trim()) || IGNORED_HEADER.test(cell.trim()));
}

function detectNameColumn(rows: string[][]): { column: number; startRow: number } {
  const header = rows[0] ?? [];
  const named = header.findIndex((cell) => NAME_HEADER.test(cell.trim()));
  if (named >= 0) return { column: named, startRow: 1 };
  if (looksLikeHeader(header)) {
    // A header without a name column (S.No, Phone…): use the first column that
    // actually holds names in the body rows.
    return { column: bestBodyColumn(rows.slice(1)), startRow: 1 };
  }
  return { column: bestBodyColumn(rows), startRow: 0 };
}

function bestBodyColumn(rows: string[][]): number {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  let best = 0;
  let bestScore = -1;
  for (let column = 0; column < width; column += 1) {
    const score = rows.filter((row) => isPrintableGuestName(row[column] ?? "")).length;
    if (score > bestScore) {
      best = column;
      bestScore = score;
    }
  }
  return best;
}

export function parseGuestList(input: string, options: { limit?: number } = {}): GuestListParse {
  const limit = Math.min(options.limit ?? MAX_GUEST_ENTRIES, MAX_GUEST_ENTRIES);
  const text = input.replace(/^\uFEFF/, "").trim();
  if (!text) return { entries: [], skipped: 0, truncated: 0 };

  // A plain list (one name per line) is the most common paste; only use CSV
  // parsing when the text actually has delimiters.
  const rows = text.includes(",") ? parseCsvRows(text) : text.split("\n").map((line) => [line]);
  const { column, startRow } = detectNameColumn(rows);

  const seen = new Set<string>();
  const entries: GuestEntry[] = [];
  let skipped = 0;
  let truncated = 0;

  for (const row of rows.slice(startRow)) {
    const name = normaliseName(row[column] ?? "");
    if (!isPrintableGuestName(name)) {
      if (row.some((cell) => cell.trim())) skipped += 1;
      continue;
    }
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    if (entries.length >= limit) {
      truncated += 1;
      continue;
    }
    entries.push({ name });
  }

  return { entries, skipped, truncated };
}

/** A stable, filename-safe label for the sheet. */
export function guestSheetFileName(slug: string): string {
  const safe = slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "invitation";
  return `invitation-${safe}-guest-qr-sheet`;
}
