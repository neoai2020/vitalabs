-- Lightweight first-party analytics log.
--
-- We need this to power the admin dashboard charts (visitors, checkout
-- started, conversions, cart abandonment). Existing tracking pixels are
-- a third-party black box; this gives us a brand-scoped, owned event
-- store we can query and visualise.
--
-- Append-only. Anyone (anon) can INSERT — public site needs to log
-- events without auth. Only admins can SELECT — the data contains
-- session ids and paths that we don't want exposed.

create table public.analytics_events (
  id bigserial primary key,
  brand brand not null,
  session_id text not null,
  event_name text not null,
  path text,
  -- JSON props for event-specific metadata (e.g. cart_value, sku, promo).
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Most dashboard queries roll up by brand + day, so this composite is the
-- one we'll lean on most. Adding event_name in the leading position would
-- only matter for very large event volumes — defer until we see it.
create index analytics_events_brand_created
  on public.analytics_events (brand, created_at desc);

create index analytics_events_brand_event_created
  on public.analytics_events (brand, event_name, created_at desc);

create index analytics_events_session
  on public.analytics_events (session_id);

alter table public.analytics_events enable row level security;

-- Public site (anon role) can write events but cannot read them back.
create policy "anyone inserts analytics_events" on public.analytics_events
  for insert with check (true);

-- Only admins can read events.
create policy "admins read analytics_events" on public.analytics_events
  for select using (public.is_admin());

-- Admins can also delete (for cleanup / GDPR), but nothing should ever
-- UPDATE an event row — events are immutable facts.
create policy "admins delete analytics_events" on public.analytics_events
  for delete using (public.is_admin());
