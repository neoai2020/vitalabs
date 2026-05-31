-- Ad Studio: brand-scoped storage for generated ad creatives, Facebook
-- campaign drafts, and the async job log that powers polling for slow
-- video generation runs.
--
-- All four tables are admin-only (no public reads). Brand isolation is
-- enforced via the brand column + the same query-level filtering we use
-- elsewhere (admins can read both brands because policies don't filter
-- by brand; client filters by the active admin brand).

-- ── ad_creatives ───────────────────────────────────────────────────
-- Every image or video the operator generates lands here. The storage
-- path is the canonical location; the public_url is the CDN-fronted URL
-- we hand to Meta when creating an ad creative (which is why the
-- ad-creatives bucket has to be public-read).
create table public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  -- product_id is nullable so creatives can outlive a deleted product.
  -- Composite FK guarantees the product belongs to the same brand —
  -- prevents cross-brand creative attachments.
  product_id text,
  kind text not null check (kind in ('image', 'video')),
  -- 'gemini-nano-banana' for static images, 'higgsfield:<model_id>' for
  -- video runs (e.g. 'higgsfield:veo3').
  generator text not null,
  -- Marketing preset used when the operator picked one (UGC, Unboxing,
  -- TV Spot, etc.). Null when the operator went straight to a model.
  preset text,
  prompt text,
  storage_path text not null,
  public_url text not null,
  thumbnail_url text,
  aspect_ratio text not null default '1:1',
  duration_s int,
  status text not null default 'ready' check (status in ('ready', 'failed', 'archived')),
  starred boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_creatives_product_fk
    foreign key (brand, product_id)
    references public.products (brand, id)
    on delete set null
);

create index ad_creatives_brand_created on public.ad_creatives (brand, created_at desc);
create index ad_creatives_brand_product on public.ad_creatives (brand, product_id);
create index ad_creatives_brand_status on public.ad_creatives (brand, status) where status = 'ready';

create trigger ad_creatives_touch_updated_at
  before update on public.ad_creatives
  for each row execute function public.touch_updated_at();

alter table public.ad_creatives enable row level security;

create policy "admins read ad_creatives" on public.ad_creatives
  for select using (public.is_admin());

create policy "admins write ad_creatives" on public.ad_creatives
  for all using (public.is_admin()) with check (public.is_admin());


-- ── ad_campaigns ───────────────────────────────────────────────────
-- Local mirror of the Meta campaign we push as a draft. We intentionally
-- never store the campaign as 'active' from our side: status moves to
-- 'draft_synced' after Meta accepts it, and that's where it stays for us
-- — the operator activates inside Ads Manager.
create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  name text not null,
  -- Meta campaign id once we've pushed it. Null while the row is still
  -- a local-only draft (e.g. the operator saved without syncing).
  fb_campaign_id text,
  objective text not null default 'OUTCOME_SALES',
  -- Daily budget in pence (consistent with the rest of the app — orders
  -- store totals in pounds, but we use pence everywhere money is part
  -- of a contract with an external API).
  daily_budget_pence int,
  lifetime_budget_pence int,
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'draft_local' check (status in (
    'draft_local',    -- saved locally, not yet pushed to Meta
    'draft_synced',   -- pushed to Meta as PAUSED — operator launches in Ads Manager
    'live_external',  -- operator has flipped it live in Ads Manager (set by insights sync)
    'archived'
  )),
  -- Last error string from a failed sync attempt (null on success).
  last_sync_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ad_campaigns_brand_status on public.ad_campaigns (brand, status, created_at desc);
create index ad_campaigns_fb_id on public.ad_campaigns (fb_campaign_id) where fb_campaign_id is not null;

create trigger ad_campaigns_touch_updated_at
  before update on public.ad_campaigns
  for each row execute function public.touch_updated_at();

alter table public.ad_campaigns enable row level security;

create policy "admins read ad_campaigns" on public.ad_campaigns
  for select using (public.is_admin());

create policy "admins write ad_campaigns" on public.ad_campaigns
  for all using (public.is_admin()) with check (public.is_admin());


-- ── ad_sets ────────────────────────────────────────────────────────
-- A campaign can have multiple ad sets (different targeting / budgets /
-- creatives). The creative_ids array lets one ad set reference many
-- creatives — Meta will then create one ad per creative.
create table public.ad_sets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  brand brand not null,
  name text not null,
  fb_adset_id text,
  -- Array of ad_creative ids attached to this ad set. Validated app-side
  -- (matching brand). Using an array keeps the schema flat for MVP.
  creative_ids uuid[] not null default '{}',
  -- Targeting spec accepted by Meta. Shape varies — kept as jsonb so we
  -- don't have to model every Meta field.
  targeting jsonb not null default '{}'::jsonb,
  optimisation_goal text default 'OFFSITE_CONVERSIONS',
  bid_strategy text default 'LOWEST_COST_WITHOUT_CAP',
  daily_budget_pence int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ad_sets_campaign on public.ad_sets (campaign_id);
create index ad_sets_brand on public.ad_sets (brand);

create trigger ad_sets_touch_updated_at
  before update on public.ad_sets
  for each row execute function public.touch_updated_at();

alter table public.ad_sets enable row level security;

create policy "admins read ad_sets" on public.ad_sets
  for select using (public.is_admin());

create policy "admins write ad_sets" on public.ad_sets
  for all using (public.is_admin()) with check (public.is_admin());


-- ── ad_jobs ────────────────────────────────────────────────────────
-- Async job log. Video generation takes 30-90s, so the Studio UI polls
-- this table to surface progress. The same table also logs publish-
-- to-Meta jobs so we have a single audit trail for "what got pushed
-- where, when, and did it work".
create table public.ad_jobs (
  id uuid primary key default gen_random_uuid(),
  brand brand not null,
  kind text not null check (kind in (
    'generate_image',
    'generate_video',
    'publish_draft'
  )),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  -- External provider job id (Higgsfield request_id, etc.) used for
  -- polling. Null for synchronous jobs.
  external_id text,
  params jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  -- Optional link to the creative this job produced (set on completion).
  creative_id uuid references public.ad_creatives(id) on delete set null,
  -- Optional link to the campaign this job published.
  campaign_id uuid references public.ad_campaigns(id) on delete set null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index ad_jobs_brand_status on public.ad_jobs (brand, status, created_at desc);
create index ad_jobs_running on public.ad_jobs (brand, kind) where status = 'running';

alter table public.ad_jobs enable row level security;

create policy "admins read ad_jobs" on public.ad_jobs
  for select using (public.is_admin());

create policy "admins write ad_jobs" on public.ad_jobs
  for all using (public.is_admin()) with check (public.is_admin());


-- ── site_config seed: meta_ads per brand ───────────────────────────
-- The Meta ad account id and the linked Page id are brand-specific and
-- safe to keep in site_config (they're not secrets; they're displayed
-- on every ad). The system user token stays in Edge Function secrets.
insert into public.site_config (brand, key, value) values
  ('vitalabs', 'meta_ads', jsonb_build_object(
    'ad_account_id', '',
    'page_id', '',
    'instagram_actor_id', ''
  )),
  ('peptiva', 'meta_ads', jsonb_build_object(
    'ad_account_id', '',
    'page_id', '',
    'instagram_actor_id', ''
  ))
on conflict (brand, key) do nothing;
