// @vitest-environment node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("requires database authorization in automation instead of silently skipping", () => {
  const result = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
    encoding: "utf8",
    env: {
      ...process.env,
      LOVABLE_DB_MIGRATION_URL: "",
      DATABASE_URL: "",
      SUPABASE_DB_URL: "",
      REQUIRE_DB_MIGRATIONS: "1",
    },
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("no connection URL configured");
});

it("schedules migrations on every main push and every six hours, not on PRs", () => {
  const workflow = readFileSync(".github/workflows/migrate.yml", "utf8");
  expect(workflow).toContain("branches: [main]");
  expect(workflow).toContain('cron: "17 */6 * * *"');
  expect(workflow).not.toContain("pull_request:");
  expect(workflow).not.toContain("paths:");
  expect(workflow).toContain("cancel-in-progress: false");
  expect(workflow).toContain('REQUIRE_DB_MIGRATIONS: "1"');
  expect(workflow).toContain("node scripts/migrate.mjs");
  expect(workflow).toContain("public.invitation_rsvps");
  expect(workflow).toContain("invitation_published_basics");
  const journal = readFileSync("drizzle/migrations/meta/_journal.json", "utf8");
  expect(journal).toContain("0009_private_card_rsvps_and_portraits");
});

it("journals every migration in order, each with its SQL file present", () => {
  const journal = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8")) as {
    entries: Array<{ idx: number; tag: string }>;
  };
  expect(journal.entries.map((entry) => entry.idx)).toEqual(
    journal.entries.map((_, index) => index),
  );
  for (const entry of journal.entries) {
    expect(
      readFileSync(`drizzle/migrations/${entry.tag}.sql`, "utf8").length,
      entry.tag,
    ).toBeGreaterThan(0);
  }
  expect(journal.entries.at(-1)?.tag).toBe("0010_invitation_songs");
});
