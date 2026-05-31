-- Phase 4 marketing: promo_codes, upsell_offers, banners. All brand-
-- scoped. Public read on active rows, admin-only writes.

create type promo_type as enum ('percent', 'fixed', 'free_shipping');

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  code text not null,
  type promo_type not null default 'percent',
  value numeric(10, 2) not null,
  max_uses int,
  uses int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand, code)
);

create trigger promo_codes_touch_updated_at
  before update on public.promo_codes
  for each row execute function public.touch_updated_at();

alter table public.promo_codes enable row level security;

-- Public read so CheckoutPage can validate codes without an authenticated
-- session. Only active codes are returned (filtered in the query).
create policy "anyone reads promo_codes" on public.promo_codes
  for select using (true);

create policy "admins write promo_codes" on public.promo_codes
  for all using (public.is_admin()) with check (public.is_admin());


create table public.upsell_offers (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  product_id text not null,
  discount_pct numeric(5, 2) not null default 0,
  timer_seconds int not null default 600,
  headline text,
  subheadline text,
  cta text,
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index upsell_offers_brand_active on public.upsell_offers (brand, active, sort_order);

create trigger upsell_offers_touch_updated_at
  before update on public.upsell_offers
  for each row execute function public.touch_updated_at();

alter table public.upsell_offers enable row level security;

create policy "anyone reads upsell_offers" on public.upsell_offers
  for select using (true);

create policy "admins write upsell_offers" on public.upsell_offers
  for all using (public.is_admin()) with check (public.is_admin());


create table public.banners (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  message text not null,
  link text,
  background_color text default '#143F66',
  text_color text default '#ffffff',
  start_at timestamptz,
  end_at timestamptz,
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index banners_brand_active on public.banners (brand, active, sort_order);

create trigger banners_touch_updated_at
  before update on public.banners
  for each row execute function public.touch_updated_at();

alter table public.banners enable row level security;

create policy "anyone reads banners" on public.banners
  for select using (true);

create policy "admins write banners" on public.banners
  for all using (public.is_admin()) with check (public.is_admin());
