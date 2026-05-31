-- Phase 2 content: FAQs (page-scoped Q/A), content_blocks (arbitrary
-- copy fragments like hero text and guarantee blurbs), legal_pages
-- (terms, privacy, refund, disclaimer, shipping with markdown bodies).

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  page text not null,
  question text not null,
  answer text not null,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faqs_brand_page on public.faqs (brand, page, sort_order);

create trigger faqs_touch_updated_at
  before update on public.faqs
  for each row execute function public.touch_updated_at();

alter table public.faqs enable row level security;

create policy "anyone reads faqs" on public.faqs
  for select using (true);

create policy "admins write faqs" on public.faqs
  for all using (public.is_admin()) with check (public.is_admin());


create table public.content_blocks (
  brand brand not null,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (brand, key)
);

create trigger content_blocks_touch_updated_at
  before update on public.content_blocks
  for each row execute function public.touch_updated_at();

alter table public.content_blocks enable row level security;

create policy "anyone reads content_blocks" on public.content_blocks
  for select using (true);

create policy "admins write content_blocks" on public.content_blocks
  for all using (public.is_admin()) with check (public.is_admin());


create table public.legal_pages (
  brand brand not null,
  slug text not null,
  title text not null,
  body_md text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (brand, slug)
);

create trigger legal_pages_touch_updated_at
  before update on public.legal_pages
  for each row execute function public.touch_updated_at();

alter table public.legal_pages enable row level security;

create policy "anyone reads legal_pages" on public.legal_pages
  for select using (true);

create policy "admins write legal_pages" on public.legal_pages
  for all using (public.is_admin()) with check (public.is_admin());
