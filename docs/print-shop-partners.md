# Exclusive print-shop partner access

## Business rules

- Public signup is removed. `/sign-up` only redirects to partner sign-in.
- You collect **₹1,000 in cash** and issue a shop's username/password personally.
- Each cash package buys **10 card creations**, not ten reusable active slots.
- Creating a private draft uses one credit. Editing, previewing, publishing, unpublishing and sharing are included. Deletion and automatic expiry do **not** refund credits.
- A further ₹1,000 cash package adds ten more credits; it never resets past usage.
- There is no payment gateway, self-service activation or public admin registration page.

## Deployment / security

Apply `0010_exclusive_print_partners.sql` and `0011_partner_topup_safety.sql` (matching Supabase migrations `20261019120000_exclusive_print_partners.sql` and `20261019121000_partner_topup_safety.sql`). In Supabase Authentication settings, **disable new user signups**; keep email/password sign-in enabled for the existing username login flow. Disabling Auth signup alone is insufficient: this migration ALSO revokes anonymous/authenticated execution of the old `register_username` RPC.

Only a trusted database operator or `service_role` can provision accounts or record packages. Never put database passwords or service-role keys in frontend variables, source files, browser consoles, or partner accounts. No shop receives owner/admin privileges.

The database atomically consumes a credit on successful INSERT. RLS and table grants prevent partners from editing balances, activating accounts, or inserting payment records. Failed inserts roll back credits, including bulk inserts; skipped `ON CONFLICT DO NOTHING` rows do not consume credit. Guests can still open published invitations and submit RSVPs without accounts.

Existing cards and accounts are not deleted. Legacy accounts receive **no automatic paid package**; until enrolled, new creation is blocked. Use `topup` after cash collection to enrol an existing username. Existing non-deleted cards count against its first ten credits. Historical deleted legacy cards cannot be reconstructed. Shops with more than ten legacy cards need an explicit operator migration, not an invented credit balance.

## Create a shop account after receiving cash

From a trusted interactive terminal with the repository and dependencies installed:

1. Configure `DATABASE_URL` privately (or `LOVABLE_DB_MIGRATION_URL` / `SUPABASE_DB_URL`). Use your database operator connection; do not paste it into chat or commit it.
2. Run `npm run partner:account -- create`.
3. Enter the shop's username and shop name.
4. Confirm the ₹1,000 cash payment by typing `CASH RECEIVED`.
5. Enter a strong initial password (12+ characters). Input is hidden and not logged by the tool.
6. Hand the credentials to that shop privately. The account starts with ten credits.

The operation creates the auth account, identity, private profile, partner allowance, and cash ledger entry in one transaction. Duplicate usernames fail rather than grant a second account or silently top up.

## Add the next cash package / enrol a legacy account

Run `npm run partner:account -- topup`, enter the existing username and shop name, and confirm `CASH RECEIVED`. It records one ₹1,000 cash package and adds ten credits. Do not retry a successful topup: every successful call is a separate payment record. Check `partner_cash_packages` in Supabase if the connection dropped before the tool reported success.

## Suspend / recover access

- A trusted operator can set `print_partners.active = false` to block new card creation. This does not delete cards or break guest links. Existing owners can still maintain their previously purchased invitations. A newly recorded cash package reactivates access.
- For lost passwords, verify the shop and reset its password through Supabase's trusted Auth administration. Never tell a shop to create a new account.
- The partner dashboard reads only the signed-in shop's allowance and displays its remaining credits; public users cannot read partner data.
