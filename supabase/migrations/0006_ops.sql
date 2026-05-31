-- Phase 3 operations: orders (populated by enhanced order-webhook),
-- leads (populated by CapturePage), support_messages (replaces the
-- mocked chat in src/members/pages/SupportPage.tsx).

create type order_status as enum ('pending', 'paid', 'fulfilled', 'refunded', 'cancelled', 'failed');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  stripe_id text,
  uprails_id text,
  email text,
  customer_name text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10, 2),
  total numeric(10, 2) not null,
  currency text not null default 'GBP',
  status order_status not null default 'pending',
  payment_method text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_brand_created on public.orders (brand, created_at desc);
create index orders_email on public.orders (email);
create index orders_status on public.orders (status);

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

alter table public.orders enable row level security;

create policy "admins read orders" on public.orders
  for select using (public.is_admin());

create policy "admins write orders" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- Service-role (Edge Function) inserts bypass RLS so the webhook can
-- record orders without an authenticated user session. The service
-- key must remain server-side only.


create table public.leads (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  source text,
  quiz_results jsonb,
  utm jsonb,
  created_at timestamptz not null default now()
);

create index leads_brand_created on public.leads (brand, created_at desc);
create index leads_email on public.leads (email);

alter table public.leads enable row level security;

create policy "anyone can insert leads" on public.leads
  for insert with check (true);

create policy "admins read leads" on public.leads
  for select using (public.is_admin());

create policy "admins update leads" on public.leads
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admins delete leads" on public.leads
  for delete using (public.is_admin());


create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  thread_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  sender text not null check (sender in ('user', 'agent', 'system')),
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index support_messages_thread on public.support_messages (thread_id, created_at);
create index support_messages_user on public.support_messages (user_id, created_at);

alter table public.support_messages enable row level security;

create policy "users read own support messages" on public.support_messages
  for select using (auth.uid() = user_id or public.is_admin());

create policy "users write own support messages" on public.support_messages
  for insert with check (auth.uid() = user_id and sender = 'user');

create policy "admins write any support messages" on public.support_messages
  for all using (public.is_admin()) with check (public.is_admin());
