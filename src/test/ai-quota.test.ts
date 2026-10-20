// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { cardConciergeFacts } from "../../supabase/functions/_shared/card-facts";
import { hashVisitor } from "../../supabase/functions/_shared/ai-quota";

const db = new PGlite();

const VISITOR = "a".repeat(64);

type QuotaResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: string;
};

async function consume(visitor = VISITOR, limit = 2, scope = "card:test-invite") {
  const { rows } = await db.query<{ result: QuotaResult }>(
    "SELECT public.consume_ai_message($1, $2, $3) AS result",
    [scope, visitor, limit],
  );
  return rows[0].result;
}

beforeAll(async () => {
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;");
  await db.exec(
    readFileSync(
      new URL("../../drizzle/migrations/0016_shared_ai_quota.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30_000);

afterAll(() => db.close());

beforeEach(async () => {
  await db.exec("TRUNCATE public.ai_message_usage;");
});

describe("shared AI quota — database enforcement", () => {
  it("grants a fixed daily allowance and then blocks", async () => {
    const first = await consume(VISITOR, 2);
    expect(first).toMatchObject({ allowed: true, remaining: 1, limit: 2 });

    const second = await consume(VISITOR, 2);
    expect(second).toMatchObject({ allowed: true, remaining: 0, limit: 2 });

    const third = await consume(VISITOR, 2);
    expect(third).toMatchObject({ allowed: false, remaining: 0, limit: 2 });
    expect(new Date(third.resetsAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("keeps each scope and each visitor separate", async () => {
    await consume(VISITOR, 1, "card:one-invite");
    await consume(VISITOR, 1, "homepage");

    expect(await consume(VISITOR, 1, "card:one-invite")).toMatchObject({ allowed: false });
    expect(await consume(VISITOR, 1, "homepage")).toMatchObject({ allowed: false });
    expect(await consume("b".repeat(64), 1, "card:one-invite")).toMatchObject({ allowed: true });
  });

  it("refunds a failed answer so an error costs nothing", async () => {
    await consume(VISITOR, 1);
    expect(await consume(VISITOR, 1)).toMatchObject({ allowed: false });

    await db.query("SELECT public.refund_ai_message($1, $2)", ["card:test-invite", VISITOR]);
    expect(await consume(VISITOR, 1)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("never refunds below zero", async () => {
    await db.query("SELECT public.refund_ai_message($1, $2)", ["card:test-invite", VISITOR]);
    const { rows } = await db.query<{ used: number }>(
      "SELECT used FROM public.ai_message_usage WHERE scope = $1 AND visitor_key = $2",
      ["card:test-invite", VISITOR],
    );
    expect(rows).toHaveLength(0);
  });

  it("starts a fresh allowance once the 24 hour window has passed", async () => {
    await consume(VISITOR, 1);
    expect(await consume(VISITOR, 1)).toMatchObject({ allowed: false });

    await db.query(
      "UPDATE public.ai_message_usage SET window_started_at = now() - interval '25 hours' WHERE visitor_key = $1",
      [VISITOR],
    );
    expect(await consume(VISITOR, 1)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("rejects malformed scopes and visitors", async () => {
    await expect(consume(VISITOR, 2, "")).rejects.toThrow(/Invalid AI quota request/);
    await expect(consume("short")).rejects.toThrow(/Invalid AI quota request/);
  });

  it("is not callable by anonymous guests", async () => {
    await db.exec("SET ROLE anon;");
    try {
      await expect(
        db.query("SELECT public.consume_ai_message('homepage', $1, 5)", [VISITOR]),
      ).rejects.toThrow(/permission denied/i);
    } finally {
      await db.exec("RESET ROLE;");
    }
  });
});

describe("card facts — grounded in the host's own card", () => {
  it("names the assistant after the host, never the demo couple", () => {
    const facts = cardConciergeFacts({
      groomName: "Imran",
      brideName: "Ayesha",
      hostName: "Together with our families",
      contactName: "Farhan Khan",
      date: "12 December 2026",
      venue: "Pearl Hall",
      songs: [{ title: "Evening Mehfil" }],
    });
    expect(facts.couple).toBe("Imran & Ayesha");
    expect(facts.assistantName).toBe("Farhan Khan");
    expect(facts.date).toBe("12 December 2026");
    expect(facts.songs).toEqual([{ title: "Evening Mehfil" }]);
  });

  it("falls back safely when the card is sparse", () => {
    const facts = cardConciergeFacts({});
    expect(facts.couple).toBe("Groom & Bride");
    expect(facts.assistantName).toBe("Your Host");
    expect(facts.eventType).toBe("Wedding celebration");
    expect(facts.extraEvents).toEqual([]);
  });

  it("ignores malformed nested events and songs", () => {
    const facts = cardConciergeFacts({
      groomName: "Imran",
      brideName: "Ayesha",
      additionalEvents: [{ title: "Mehndi", venue: "Home" }, { title: "No venue" }, null],
      songs: [{ title: "" }, { title: "Sufi Breeze" }],
    });
    expect(facts.extraEvents).toHaveLength(1);
    expect(facts.songs).toEqual([{ title: "Sufi Breeze" }]);
  });
});

describe("visitor hashing", () => {
  it("is stable for one browser and different across visitors", async () => {
    const first = await hashVisitor("visitor-one");
    expect(await hashVisitor("visitor-one")).toBe(first);
    expect(await hashVisitor("visitor-two")).not.toBe(first);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
