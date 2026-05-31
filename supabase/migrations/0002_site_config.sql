-- Phase 1: site_config keyed by (brand, key) with JSONB values.
-- Frontend reads at app boot via ConfigProvider; admins edit via /admin.
--
-- Six well-known keys per brand:
--   tracking        - Meta/Google/TikTok/Snap/X pixel IDs and enabled flags
--   brand_info      - display name, support email, tagline
--   whatsapp        - enabled, phone, hidden_routes[], default_message
--   seo_defaults    - default page title, description, og_image
--   feature_flags   - arbitrary boolean toggles
--   theme           - brand colours (primary, accent)

create table public.site_config (
  brand brand not null,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (brand, key)
);

alter table public.site_config enable row level security;

-- Public read: pixels, brand name, etc. need to be loaded by every visitor.
-- The brand filter is applied in the query, not RLS, so admins can read
-- both brands.
create policy "anyone can read site_config"
  on public.site_config
  for select
  using (true);

create policy "admins can insert site_config"
  on public.site_config
  for insert
  with check (public.is_admin());

create policy "admins can update site_config"
  on public.site_config
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete site_config"
  on public.site_config
  for delete
  using (public.is_admin());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger site_config_touch_updated_at
  before update on public.site_config
  for each row execute function public.touch_updated_at();

-- Seed default rows for both brands. Insert-only-if-missing so re-running
-- the migration is safe.
insert into public.site_config (brand, key, value) values
  ('vitalabs', 'tracking', jsonb_build_object(
    'meta', jsonb_build_object('enabled', true, 'pixel_id', '1009611958106175'),
    'google_tag', jsonb_build_object('enabled', false, 'tag_id', ''),
    'tiktok', jsonb_build_object('enabled', false, 'pixel_id', ''),
    'snap', jsonb_build_object('enabled', false, 'pixel_id', ''),
    'twitter', jsonb_build_object('enabled', false, 'pixel_id', '')
  )),
  ('vitalabs', 'brand_info', jsonb_build_object(
    'name', 'Vita Labs',
    'support_email', 'support@vitalabs.io',
    'tagline', 'UK peptide quiz funnel'
  )),
  ('vitalabs', 'whatsapp', jsonb_build_object(
    'enabled', true,
    'phone', '447440153510',
    'hidden_routes', jsonb_build_array('/checkout'),
    'default_message', 'I need some help'
  )),
  ('vitalabs', 'seo_defaults', jsonb_build_object(
    'title', 'Vita Labs — Peptide Match Quiz (UK)',
    'description', 'Vita Labs — UK peptide quiz funnel. Match goals to verified catalogue SKUs (research use only).',
    'og_image', ''
  )),
  ('vitalabs', 'feature_flags', jsonb_build_object(
    'whatsapp_enabled', true,
    'theme_toggle_enabled', true,
    'maintenance_mode', false
  )),
  ('vitalabs', 'theme', jsonb_build_object(
    'primary_color', '#143F66',
    'accent_color', '#5E89A4'
  )),
  ('peptiva', 'tracking', jsonb_build_object(
    'meta', jsonb_build_object('enabled', true, 'pixel_id', '1360736692779319'),
    'google_tag', jsonb_build_object('enabled', false, 'tag_id', ''),
    'tiktok', jsonb_build_object('enabled', false, 'pixel_id', ''),
    'snap', jsonb_build_object('enabled', false, 'pixel_id', ''),
    'twitter', jsonb_build_object('enabled', false, 'pixel_id', '')
  )),
  ('peptiva', 'brand_info', jsonb_build_object(
    'name', 'Peptiva',
    'support_email', 'support@peptivalabs.io',
    'tagline', 'UK peptide quiz funnel'
  )),
  ('peptiva', 'whatsapp', jsonb_build_object(
    'enabled', true,
    'phone', '447440153510',
    'hidden_routes', jsonb_build_array('/checkout'),
    'default_message', 'I need some help'
  )),
  ('peptiva', 'seo_defaults', jsonb_build_object(
    'title', 'Peptiva — Peptide Match Quiz (UK)',
    'description', 'Peptiva — UK peptide quiz funnel. Match goals to verified catalogue SKUs (research use only).',
    'og_image', ''
  )),
  ('peptiva', 'feature_flags', jsonb_build_object(
    'whatsapp_enabled', true,
    'theme_toggle_enabled', true,
    'maintenance_mode', false
  )),
  ('peptiva', 'theme', jsonb_build_object(
    'primary_color', '#143F66',
    'accent_color', '#5E89A4'
  ))
on conflict (brand, key) do nothing;
