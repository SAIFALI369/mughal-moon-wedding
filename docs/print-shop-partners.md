# Exclusive print-shop partner access

## Business rules

- Public signup is removed. `/sign-up` only redirects to partner sign-in.
- You create every account yourself in Supabase. Account creation is the permission grant, so every account automatically gets a profile plus **10 card creations**.
- Each additional **₹1,000 in cash** package buys 10 more card creations, not ten reusable active slots.
- Creating a private draft uses one credit. Editing, previewing, publishing, unpublishing and sharing are included. Deletion and automatic expiry do **not** refund credits.
- A further ₹1,000 cash package adds ten more credits; it never resets past usage.
- There is no payment gateway, self-service activation or public admin registration page.

## Deployment / security

Apply `0010_exclusive_print_partners.sql`, `0011_partner_topup_safety.sql` and `0013_automatic_account_access.sql` (matching Supabase migrations `20261019120000_exclusive_print_partners.sql`, `20261019121000_partner_topup_safety.sql` and `20261020120000_automatic_account_access.sql`). In Supabase Authentication settings, **disable new user signups**; keep email/password sign-in enabled for the existing username login flow. Disabling Auth signup alone is insufficient: this migration ALSO revokes anonymous/authenticated execution of the old `register_username` RPC.

Only a trusted database operator or `service_role` can provision accounts or record packages. Never put database passwords or service-role keys in frontend variables, source files, browser consoles, or partner accounts. No shop receives owner/admin privileges.

The database atomically consumes a credit on successful INSERT. RLS and table grants prevent partners from editing balances, activating accounts, or inserting payment records. Failed inserts roll back credits, including bulk inserts; skipped `ON CONFLICT DO NOTHING` rows do not consume credit. Guests can still open published invitations and submit RSVPs without accounts.

## Creating accounts in Supabase

`0013_automatic_account_access.sql` installs an `AFTER INSERT` trigger on `auth.users`, plus a one-time backfill for accounts that already exist. Whenever an account is created — from the Supabase dashboard, the Auth admin API, `register_username` or the CLI — the database immediately:

1. creates the matching `public.profiles` row so the account can sign in with its username;
2. creates a `public.print_partners` row with 10 lifetime credits and the shop name set (from `shop_name` metadata if you supplied it).

This runs in the same transaction as the auth insert, so an account without access cannot exist. If the profile username is taken, a unique suffix (`-2`, `-3`, …) is used. If the email is already owned by another profile, the account's profile gets its private `@accounts.invalid` address rather than failing.

Accounts with an existing partner row are never reset or topped up by this trigger, so a paid top-up is still applied with `topup`. Suspended accounts (`active = false`) stay suspended. Accounts that already existed when this migration is applied are enrolled during the backfill; their existing non-deleted cards count against the first ten credits. Shops with more than ten legacy cards need an explicit operator review, not an invented credit balance.

To set the shop name for a dashboard-created user, add this to **User Metadata** when creating them (optional):

```json
{ "shop_name": "Patna Print House", "username": "patna_print" }
```

## Create a shop account after receiving cash

From a trusted interactive terminal with the repository and dependencies installed:

1. Configure `DATABASE_URL` privately (or `LOVABLE_DB_MIGRATION_URL` / `SUPABASE_DB_URL`). Use your database operator connection; do not paste it into chat or commit it.
2. Run `npm run partner:account -- create`.
3. Enter the shop's username and shop name.
4. Enter a strong initial password (12+ characters). Input is hidden and not logged by the tool.
5. Hand the credentials to that shop privately. The account starts with its included ten credits.

The operation creates the auth account, identity, private profile and partner allowance in one transaction; the automatic-access trigger supplies the ten credits, so `create` records **no** ₹1,000 cash package. Duplicate usernames fail rather than grant a second account or silently top up. Creating accounts directly in the Supabase dashboard is equally valid — it produces the same profile and allowance.

## Add the next cash package / enrol a legacy account

Run `npm run partner:account -- topup`, enter the existing username and shop name, and confirm `CASH RECEIVED`. It records one ₹1,000 cash package and adds ten credits. Do not retry a successful topup: every successful call is a separate payment record. Check `partner_cash_packages` in Supabase if the connection dropped before the tool reported success.

## Suspend / recover access

- A trusted operator can set `print_partners.active = false` to block new card creation. This does not delete cards or break guest links. Existing owners can still maintain their previously purchased invitations. A newly recorded cash package reactivates access.
- For lost passwords, verify the shop and reset its password through Supabase's trusted Auth administration. Never tell a shop to create a new account.
- The partner dashboard reads only the signed-in shop's allowance and displays its remaining credits; public users cannot read partner data.
