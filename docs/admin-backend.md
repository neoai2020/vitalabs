# Admin backend — operations guide

This document covers everything you need to run, migrate, back up, and restore
the admin backend that ships alongside the Vita Labs / Peptiva storefront. The
admin lives at `/admin` in the same app; it gates on Supabase Auth +
`is_admin` JWT claim.

## Architecture

- One shared Supabase project hosts both brands.
- Every brand-scoped table has a `brand` enum column (`vitalabs`, `peptiva`).
- The deployment selects its brand via the `VITE_BRAND` env var.
- The admin can switch which brand it manages via the header brand switcher;
  switches re-fetch all data scoped to the new brand.

## First-time setup

1. **Push the migrations** in `supabase/migrations/` to your project:

   ```bash
   supabase db push
   ```

   They are numbered `0001` through `0008` and apply in order.

2. **Set the env vars** in `.env` (copy from `.env.example`):

   ```
   VITE_BRAND=vitalabs              # or peptiva
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

3. **Seed the catalogue** (one-shot import from `src/data/*.ts`):

   ```bash
   SUPABASE_URL=...                       \
   SUPABASE_SERVICE_ROLE_KEY=...          \
   BRAND=all                              \
     npx tsx scripts/seed-from-data-files.ts
   ```

   Re-running is safe — every upsert uses a stable conflict key.

4. **Grant yourself admin**. In the Supabase SQL editor:

   ```sql
   update auth.users
   set raw_app_meta_data = jsonb_set(
     coalesce(raw_app_meta_data, '{}'::jsonb),
     '{is_admin}', 'true'::jsonb)
   where email = 'you@example.com';
   ```

   You must sign out and sign back in for the new claim to land in the JWT.

5. **Visit `/admin`**. The first page is the dashboard with brand counters.

## Day-to-day flows

- **Update a tracking pixel**: `/admin/site-config/tracking`. Toggle on, paste
  the ID, save. The change ships to the next page load via `useTracking()` —
  no redeploy.
- **Edit a product**: `/admin/content/products`, click *Edit*. The page also
  hosts JSON editors for `doses` and `protocol`.
- **Issue a promo code**: `/admin/marketing/promo-codes` → *Add code*.
  Validated at checkout via `validatePromoCode` in `src/lib/marketing.ts`.
- **Reply to a customer**: `/admin/ops/support`. Replies are broadcast in
  real time to the member's chat thread.
- **Export leads**: `/admin/ops/leads` → *Export CSV* with optional search
  filter.

## Audit log

Every admin write goes through `useBrandMutation` or `useSiteConfigEditor`,
which append a row to `admin_audit_log` with `{ before, after }` diff JSON.
Query it directly in Supabase for an audit trail.

## Backup & restore

- **Backups**: rely on Supabase's daily backups (Settings → Database →
  Backups in the dashboard).
- **Point-in-time recovery**: available on Supabase Pro plans.
- **Manual snapshot before risky operations**:

   ```bash
   supabase db dump --schema public -f snapshot-$(date +%Y%m%d).sql
   ```

- **Restore from a `.sql` snapshot**:

   ```bash
   psql "$SUPABASE_DB_URL" < snapshot-20260530.sql
   ```

  For brand-scoped tables, you can also use `delete from <table> where
  brand = 'X'` followed by `insert` to surgically restore one brand without
  touching the other.

## Adding a new admin

```sql
update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}', 'true'::jsonb)
where email = 'newadmin@example.com';
```

## Revoking admin

```sql
update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{is_admin}', 'false'::jsonb)
where email = 'former@example.com';
```

## Adding a new brand

1. Extend the `brand` enum:

   ```sql
   alter type brand add value 'newbrand';
   ```

2. Run the seed script with `BRAND=newbrand`.
3. Deploy a new instance with `VITE_BRAND=newbrand`.

The admin's brand switcher hard-codes the two current brands in
`src/admin/components/BrandSwitcher.tsx`; add the new brand there as well.

## What's intentionally manual

- **Stripe / Uprails refunds**. The orders dashboard sets `status='refunded'`
  but does not call the payment provider — issue the refund in Stripe/Uprails
  manually after updating status.
- **Promo code redemption count**. The `uses` column is not incremented
  client-side. A server-side webhook (Edge Function) should bump it after
  successful payment; this is not yet wired up.
- **Members list**. `auth.users` isn't directly queryable from the browser
  with public RLS; the `Members` page points at the Supabase dashboard until
  an Edge Function is added.
- **Quiz branching logic**. Lives in `src/data/quizData.ts` as TS
  predicates. The admin quiz page is read-only viewer.
