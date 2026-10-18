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
});
