import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dailyLimit } from "@/lib/ai-limits";
import {
  normalizeInvitationDate,
  READING_LABELS,
  readInvitationText,
  REQUIRED_READING_KEYS,
  type InvitationReading,
  type ReadEvent,
  type ReadField,
  type ReadingFieldKey,
} from "./invitation-import";
import { invitationThemeIds, invitationFrameworkIds } from "./invitation-options";

/**
 * Simran reads a partner's raw notes — but only for partner admins.
 *
 * The dashboard is a partner-only workspace, yet a browser flag is never a
 * permission. Every request carries the caller's Supabase access token, and
 * this module checks (with the service role) that the token belongs to an
 * *active* print partner before a single token is spent on Gemini.
 */
export type PartnerAdmin = { userId: string; shopName: string };

export async function requirePartnerAdmin(accessToken: string): Promise<PartnerAdmin> {
  if (!accessToken.trim()) {
    throw new Error("Only partner admins can use Simran in the form.");
  }
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new Error("Your session has expired. Sign in again to use Simran.");
  }
  const partner = await fetchPartnerRow(data.user.id);
  if (!partner?.active) {
    throw new Error("Simran is reserved for active print-shop partners.");
  }
  return { userId: data.user.id, shopName: partner.shop_name ?? "" };
}

type PartnerRow = { active?: boolean; shop_name?: string };

/** The generated database types predate `print_partners`; read it over REST. */
async function fetchPartnerRow(ownerId: string): Promise<PartnerRow | null> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Invitation service is unavailable");
  const response = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/print_partners?owner_id=eq.${encodeURIComponent(ownerId)}&select=active,shop_name`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5_000),
    },
  );
  if (!response.ok) throw new Error("Could not check partner access");
  const rows = (await response.json()) as PartnerRow[];
  return Array.isArray(rows) ? (rows[0] ?? null) : null;
}

type RawReading = Record<string, unknown>;

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function asEvents(value: unknown): ReadEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => {
      const rawDate = asText(item.date, 100);
      return {
        title: asText(item.title, 80),
        date: normalizeInvitationDate(rawDate)?.value ?? rawDate,
        time: asText(item.time, 100),
        venue: asText(item.venue, 120),
        address: asText(item.address, 200),
      };
    })
    .filter((event) => event.title)
    .slice(0, 4);
}

const THEME_SET = new Set<string>(invitationThemeIds);
const FRAMEWORK_SET = new Set<string>(invitationFrameworkIds);

/**
 * Apply Simran's reading over the deterministic one. Only fields the assistant
 * actually recognised are replaced, and every value is clamped to the card's
 * own limits before it can reach the form.
 */
export function mergeSimranReading(base: InvitationReading, raw: RawReading): InvitationReading {
  const byKey = new Map<ReadingFieldKey, ReadField>(base.fields.map((field) => [field.key, field]));
  const checks = new Set(
    Array.isArray(raw.check)
      ? raw.check.filter((key): key is string => typeof key === "string")
      : [],
  );

  for (const key of Object.keys(READING_LABELS) as ReadingFieldKey[]) {
    const rawVal = asText(raw[key], key === "message" || key === "giftsNote" ? 600 : 200);
    if (!rawVal) continue;
    const normalized =
      key === "date" || key === "rsvpDeadline" ? normalizeInvitationDate(rawVal) : null;
    const value = normalized ? normalized.value : rawVal;
    byKey.set(key, {
      key,
      label: READING_LABELS[key],
      value,
      ...(checks.has(key) || normalized?.check ? { check: true } : {}),
    });
  }

  const fields = [...byKey.values()];
  const values = Object.fromEntries(fields.map((field) => [field.key, field.value]));

  const events = asEvents(raw.additionalEvents);
  const missing = REQUIRED_READING_KEYS.filter((key) => !values[key]).map((key) => ({
    key,
    label: READING_LABELS[key],
  }));

  const theme =
    typeof raw.theme === "string" && THEME_SET.has(raw.theme)
      ? (raw.theme as InvitationReading["theme"])
      : base.theme;
  const framework =
    typeof raw.framework === "string" && FRAMEWORK_SET.has(raw.framework)
      ? (raw.framework as InvitationReading["framework"])
      : base.framework;

  const aiNotes = Array.isArray(raw.notes)
    ? raw.notes
        .filter((note): note is string => typeof note === "string")
        .map((note) => note.slice(0, 220))
    : [];

  return {
    source: "simran",
    fields,
    events: events.length ? events : base.events,
    missing,
    notes: [...aiNotes, ...base.notes.filter((note) => !aiNotes.includes(note))].slice(0, 6),
    theme,
    framework,
  };
}

function buildReaderInstruction(): string {
  return `You are Simran, the form-reading assistant inside a print shop's invitation studio. A partner pastes raw notes, a WhatsApp message or the printed proof text for a wedding card.

Read the text and return ONE JSON object. Do not add markdown, comments or any prose outside the JSON.

Shape (all string values are required keys; use "" when the text does not state it):
{
  "title": "", "groomName": "", "brideName": "", "date": "", "time": "", "endTime": "",
  "venue": "", "address": "", "eventType": "", "hosts": "", "hostName": "",
  "contactName": "", "contactPhone": "", "dressCode": "", "rsvpDeadline": "",
  "hashtag": "", "giftsNote": "", "livestreamUrl": "", "mapUrl": "", "message": "",
  "additionalEvents": [{ "title": "", "date": "", "time": "", "venue": "", "address": "" }],
  "theme": "", "framework": "", "check": ["fieldName"], "notes": ["short sentence"]
}

Rules:
- Never invent a name, date, venue, phone number or link. If it is not written, leave it empty.
- Dates must be written as "DD/MM/YYYY" (for example "22/11/2029"). Times as "4:00 PM" or "4:00 PM IST". Keep a stated zone.
- Names keep the text's own spelling; do not translate or transliterate.
- "eventType" is the main ceremony: Nikah ceremony, Shubh Vivah, Wedding ceremony, Wedding reception, Engagement ceremony. Extra celebrations go in "additionalEvents" (sangeet, mehndi, haldi, walima…).
- Put anything written after "gifts", "shagun" or "registry" in "giftsNote"; a live link in "livestreamUrl"; a maps link in "mapUrl"; a phone in "contactPhone"; a #tag in "hashtag".
- "theme" may only be one of: ${invitationThemeIds.join(", ")}. Pick the closest mood (nikah/masjid → mughal; riad/lantern → riad-noor; mehndi → mehndi-night; haldi → haldi-baag (baag/courtyard); mandap → diya-utsav; balcony/jharokha/dawn → jharokha-dawn; minimal/paper/ink → vows-in-ink; reception → ballroom). Use "" if unsure.
- "framework" may only be one of: ${invitationFrameworkIds.join(", ")}. Use "" if unsure.
- "check" lists field names whose value is plausible but ambiguous (for example a numeric date like 03/04/2027).
- "notes" is at most three short sentences telling the partner what to look at. Never repeat the whole form.
- The card belongs to a real couple: clarity matters more than completeness.`;
}

function parseJson(text: string): RawReading | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as RawReading)
      : null;
  } catch {
    return null;
  }
}

export type SimranReadResult = {
  reading: InvitationReading;
  aiAvailable: boolean;
  shopName: string;
};

/** Read raw notes into a reviewable card structure. */
export async function readNotesWithSimran({
  text,
  accessToken,
  visitor,
}: {
  text: string;
  accessToken: string;
  visitor?: string;
}): Promise<SimranReadResult> {
  const admin = await requirePartnerAdmin(accessToken);
  const base = readInvitationText(text);

  const { generateAiReply, hasGeminiConfig, reserveAiQuota, refundAiQuota } =
    await import("./gemini.server");
  if (!(await hasGeminiConfig())) {
    return { reading: base, aiAvailable: false, shopName: admin.shopName };
  }

  const scope = `form-reader:${admin.userId}`;
  const { quota, hash } = await reserveAiQuota(scope, dailyLimit("AI_DAILY_LIMIT_FORM"), visitor);
  if (!quota.allowed) {
    return { reading: base, aiAvailable: false, shopName: admin.shopName };
  }

  try {
    const reply = await generateAiReply({
      systemInstruction: buildReaderInstruction(),
      messages: [{ role: "user", content: text.slice(0, 4000) }],
      maxOutputTokens: 900,
      temperature: 0.2,
      responseMimeType: "application/json",
    });
    const raw = parseJson(reply);
    if (!raw) {
      await refundAiQuota(scope, hash);
      return { reading: base, aiAvailable: false, shopName: admin.shopName };
    }
    return { reading: mergeSimranReading(base, raw), aiAvailable: true, shopName: admin.shopName };
  } catch (error) {
    await refundAiQuota(scope, hash);
    console.error("Simran form read failed", error instanceof Error ? error.message : error);
    return { reading: base, aiAvailable: false, shopName: admin.shopName };
  }
}
