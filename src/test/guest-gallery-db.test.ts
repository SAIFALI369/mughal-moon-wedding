// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
// Valid JPEG signature for SQL boundary checks (client decodes real images separately).
const jpeg = "data:image/jpeg;base64,/9j/2Q==";
const insert = (image = jpeg, caption = "A happy memory") =>
  db.query("select public.add_wedding_photo($1,$2)", [image, caption]);
beforeAll(async () => {
  await db.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE PUBLICATION supabase_realtime;",
  );
  await db.exec(
    readFileSync(
      new URL("../../drizzle/migrations/0001_shared_guest_gallery.sql", import.meta.url),
      "utf8",
    ),
  );
}, 30_000);
afterAll(() => db.close());

describe("shared photo database rules", () => {
  it("rejects invalid formats, malformed base64, large photos and captions", async () => {
    await expect(insert("data:image/svg+xml;base64,PHN2Zz4=")).rejects.toThrow("Invalid photo");
    await expect(insert("data:image/jpeg;base64,YWJjZA==")).rejects.toThrow("Invalid JPEG");
    await expect(insert(jpeg, " ")).rejects.toThrow("Invalid photo");
    await expect(insert(jpeg, "a".repeat(101))).rejects.toThrow("Invalid photo");
    await expect(insert("data:image/jpeg;base64," + "a".repeat(1100001))).rejects.toThrow(
      "Invalid photo",
    );
  });
  it("allows anonymous guests to add and read but not directly insert, replace or delete", async () => {
    await db.exec("SET ROLE anon;");
    try {
      await insert();
      const rows = await db.query("select slot from public.wedding_photos");
      expect(rows.rows).toHaveLength(1);
      await expect(
        db.exec("insert into public.wedding_photos values (2, 'bad', 'bad', now())"),
      ).rejects.toThrow("permission denied");
      await expect(db.exec("delete from public.wedding_photos")).rejects.toThrow(
        "permission denied",
      );
      await expect(db.exec("update public.wedding_photos set caption='changed'")).rejects.toThrow(
        "permission denied",
      );
    } finally {
      await db.exec("RESET ROLE;");
    }
  });
  it("caps concurrent uploads at five shared slots, not five per guest", async () => {
    await db.exec("TRUNCATE public.wedding_photos;");
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => insert()));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(5);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(3);
    const rows = await db.query<{ slot: number }>(
      "select slot from public.wedding_photos order by slot",
    );
    expect(rows.rows.map((row) => row.slot)).toEqual([1, 2, 3, 4, 5]);
    await expect(insert()).rejects.toThrow("Gallery is full");
    await expect(
      db.exec("insert into public.wedding_photos values (6, 'bad', 'bad', now())"),
    ).rejects.toThrow("check constraint");
  });
});
