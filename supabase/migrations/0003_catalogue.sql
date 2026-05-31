-- Phase 2 catalogue: products + reviews. Brand-scoped, public read for
-- active rows, admin-only write. Doses are stored as a JSONB array
-- because the count varies per product.

create type product_status as enum ('draft', 'active', 'archived');

create table public.products (
  id text not null,
  brand brand not null,
  sku text,
  slug text,
  compound text not null,
  category text,
  tagline text,
  description text,
  mechanism text,
  benefits text[] not null default '{}',
  ideal_for text[] not null default '{}',
  protocol jsonb not null default '[]'::jsonb,
  image_url text,
  catalog_url text,
  badge text,
  tags text[] not null default '{}',
  doses jsonb not null default '[]'::jsonb,
  status product_status not null default 'active',
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (brand, id)
);

create index products_brand_status_sort on public.products (brand, status, sort_order);

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

create policy "anyone reads active products" on public.products
  for select using (status = 'active');

create policy "admins read all products" on public.products
  for select using (public.is_admin());

create policy "admins insert products" on public.products
  for insert with check (public.is_admin());

create policy "admins update products" on public.products
  for update using (public.is_admin()) with check (public.is_admin());

create policy "admins delete products" on public.products
  for delete using (public.is_admin());


create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  product_id text,
  author text not null,
  rating int not null check (rating between 1 and 5),
  text text not null,
  source text,
  result text,
  featured boolean not null default false,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

create index reviews_brand_product on public.reviews (brand, product_id);

alter table public.reviews enable row level security;

create policy "anyone reads reviews" on public.reviews
  for select using (true);

create policy "admins write reviews" on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());
