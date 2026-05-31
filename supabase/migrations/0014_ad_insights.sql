-- Daily insights pulled from Meta Marketing API per campaign.
-- We key on (brand, fb_campaign_id, date) so re-running the pull for an
-- existing day upserts rather than duplicates.
--
-- Per-creative or per-ad insights live in metadata.breakdowns for now;
-- a follow-up can normalise into a finer-grained table when the data
-- justifies it.

create table public.ad_insights_daily (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  fb_campaign_id text not null,
  fb_adset_id text,
  campaign_id uuid references public.ad_campaigns(id) on delete cascade,
  date date not null,
  spend_pence int not null default 0,
  impressions int not null default 0,
  clicks int not null default 0,
  link_clicks int not null default 0,
  conversions int not null default 0,
  conversion_value_pence int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand, fb_campaign_id, fb_adset_id, date)
);

create index ad_insights_daily_brand_date on public.ad_insights_daily (brand, date desc);
create index ad_insights_daily_campaign on public.ad_insights_daily (campaign_id, date desc);

create trigger ad_insights_daily_touch_updated_at
  before update on public.ad_insights_daily
  for each row execute function public.touch_updated_at();

alter table public.ad_insights_daily enable row level security;

create policy "admins read ad_insights_daily" on public.ad_insights_daily
  for select using (public.is_admin());

create policy "admins write ad_insights_daily" on public.ad_insights_daily
  for all using (public.is_admin()) with check (public.is_admin());
