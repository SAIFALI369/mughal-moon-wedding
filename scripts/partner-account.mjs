#!/usr/bin/env node
// Private operator CLI. Never import this in the app or expose it through a web route.
import postgres from "postgres";
import { createInterface } from "node:readline/promises";

const mode = process.argv[2];
if (!["create", "topup"].includes(mode)) {
  console.error("Usage: npm run partner:account -- create|topup");
  process.exit(1);
}
const url =
  process.env.DATABASE_URL || process.env.LOVABLE_DB_MIGRATION_URL || process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Set DATABASE_URL (a private operator database connection, never VITE_*).");
  process.exit(1);
}
if (!process.stdin.isTTY) {
  console.error(
    "Run from an interactive terminal. Passwords are never accepted as command-line arguments.",
  );
  process.exit(1);
}

async function secretPrompt() {
  process.stdout.write("Initial password (12+ characters; hidden): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let secret = "";
    const finish = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const char of chunk.toString()) {
        if (char === "\u0003") {
          finish();
          reject(new Error("Cancelled"));
          return;
        }
        if (char === "\r" || char === "\n") {
          finish();
          resolve(secret);
          return;
        }
        if (char === "\u007f" || char === "\b") secret = secret.slice(0, -1);
        else if (char >= " ") secret += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

let sql;
try {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const username = (await rl.question("Shop username (3–30 letters/numbers/._-): ")).trim();
  const shop = (await rl.question("Shop name: ")).trim();
  let confirmation = "";
  if (mode === "topup") {
    confirmation = await rl.question(
      "Have you received ₹1,000 IN CASH for this package? Type CASH RECEIVED to continue: ",
    );
  }
  rl.close();
  if (mode === "topup" && confirmation !== "CASH RECEIVED")
    throw new Error("Cancelled. No payment or credits recorded.");
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username) || shop.length < 2 || shop.length > 120)
    throw new Error("Invalid username or shop name.");
  let password;
  if (mode === "create") {
    password = await secretPrompt();
    if (password.length < 12 || Buffer.byteLength(password) > 72)
      throw new Error("Password must be at least 12 characters and at most 72 bytes.");
  }
  sql = postgres(url, { max: 1, connect_timeout: 10 });
  if (mode === "create") {
    await sql`SELECT public.provision_print_partner(${username}, ${password}, ${shop})`;
    password = undefined;
  } else {
    await sql`SELECT public.record_partner_cash_package(${username}, ${shop})`;
  }
  console.log(
    mode === "create"
      ? "Partner account created with its 10 included credits. Hand over the username and password privately."
      : "Cash package recorded. 10 credits added without resetting past usage.",
  );
  if (mode === "topup") {
    console.log(
      "Do not run topup again to retry a successful operation: every successful topup records another ₹1,000 cash package.",
    );
  }
} catch {
  // Driver errors can include query parameters (including passwords). Never print them.
  console.error(
    "Operation failed or was cancelled. No credentials were logged. Check inputs, database connectivity, migration status, or whether the username is already in use. Inspect the private package ledger before retrying.",
  );
  process.exitCode = 1;
} finally {
  if (sql) await sql.end({ timeout: 2 });
}
