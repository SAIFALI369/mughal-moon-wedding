/**
 * RSVP summaries and spreadsheet export for a host's own card.
 *
 * The CSV is built in the browser from rows the host is already allowed to read
 * (RLS scopes them); nothing is sent anywhere. Cells are quoted per RFC 4180 and
 * neutralised against spreadsheet formula injection, because guest names are
 * attacker-controlled text.
 */

export type RsvpRecord = {
  name: string;
  attending: boolean;
  guests: number;
  contact: string;
  dietary: string;
  message: string;
  created_at: string;
};

export type RsvpSummary = {
  responses: number;
  accepting: number;
  declined: number;
  guestsExpected: number;
  /** Dietary mentions, most common first. */
  dietary: { label: string; count: number }[];
};

const DIETARY_SPLIT = /[,;\n/]+/;

function dietaryLabels(value: string): string[] {
  return value
    .split(DIETARY_SPLIT)
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.slice(0, 40));
}

export function summariseRsvps(rows: RsvpRecord[]): RsvpSummary {
  const summary: RsvpSummary = {
    responses: rows.length,
    accepting: 0,
    declined: 0,
    guestsExpected: 0,
    dietary: [],
  };
  const counts = new Map<string, { label: string; count: number }>();

  for (const row of rows) {
    if (row.attending) {
      summary.accepting += 1;
      summary.guestsExpected += Math.max(0, row.guests || 0);
    } else {
      summary.declined += 1;
    }
    for (const label of dietaryLabels(row.dietary ?? "")) {
      const key = label.toLocaleLowerCase();
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { label, count: 1 });
    }
  }

  summary.dietary = [...counts.values()].sort(
    (left, right) => right.count - left.count || left.label.localeCompare(right.label),
  );
  return summary;
}

/** Anything cell-like that a spreadsheet would treat as a formula. */
function neutraliseFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: unknown): string {
  const text = neutraliseFormula(String(value ?? ""));
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const RSVP_CSV_HEADER = [
  "Guest name",
  "Attending",
  "Guests",
  "Contact",
  "Dietary notes",
  "Message",
  "Replied at",
];

/**
 * CRLF line endings and a UTF-8 BOM so Excel opens Hindi/Urdu names correctly
 * instead of falling back to the system code page.
 */
export function rsvpsToCsv(rows: RsvpRecord[]): string {
  const lines = [RSVP_CSV_HEADER.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.attending ? "Yes" : "No",
        row.attending ? row.guests : 0,
        row.contact,
        row.dietary,
        row.message,
        row.created_at,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function rsvpFileName(slug: string): string {
  const safe = slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "invitation";
  const day = new Date().toISOString().slice(0, 10);
  return `invitation-${safe}-rsvps-${day}.csv`;
}

/** Save the CSV without leaving the page; the Blob URL is revoked right after. */
export function downloadRsvps(rows: RsvpRecord[], filename: string) {
  const blob = new Blob([rsvpsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4_000);
}
