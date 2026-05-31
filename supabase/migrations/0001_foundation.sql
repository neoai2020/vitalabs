-- Phase 0 foundation: brand enum, admin audit log, helper functions.
-- Both vitalabs and peptiva share one Supabase project; every brand-scoped
-- table created in later migrations carries a `brand` column of this enum.
--
-- Admins are identified by `is_admin = true` inside
-- auth.users.raw_app_meta_data (which surfaces as `app_metadata.is_admin`
-- in the client-side JWT). To grant admin to the first user, run:
--
--   update auth.users
--   set raw_app_meta_data = jsonb_set(
--     coalesce(raw_app_meta_data, '{}'::jsonb),
--     '{is_admin}', 'true'::jsonb)
--   where email = 'you@example.com';

create type brand as enum ('vitalabs', 'peptiva');

-- Helper: returns true when the JWT for the current request claims admin.
-- Used as the WHERE clause in every "admin only" RLS policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  );
$$;

-- Append-only audit log. Every admin-side INSERT/UPDATE/DELETE writes a
-- row here via application code (Phase 5 backfills coverage). The diff
-- field stores a JSONB { before: ..., after: ... } snapshot.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  brand brand,
  table_name text not null,
  row_id text,
  action text not null check (action in ('insert', 'update', 'delete')),
  diff jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_table_idx on public.admin_audit_log (table_name, created_at desc);
create index admin_audit_log_actor_idx on public.admin_audit_log (actor_id, created_at desc);

alter table public.admin_audit_log enable row level security;

-- Admins read the full log. Inserts are unrestricted (any authenticated
-- session can append to the log on behalf of itself) -- this keeps the
-- write path simple from the frontend while still requiring auth.
create policy "admins read audit log"
  on public.admin_audit_log
  for select
  using (public.is_admin());

create policy "authenticated insert audit log"
  on public.admin_audit_log
  for insert
  with check (auth.role() = 'authenticated');
