-- Upsell templates: add a `template` column so admins can pick from a
-- handful of pre-canned offer types instead of hand-rolling each one.
-- Also flip the active default to false so newly created offers are
-- staged until someone deliberately toggles them on, and add columns
-- the new templates need (months multiplier, optional add-on product
-- for complementary-stack offers).

alter table public.upsell_offers
  add column if not exists template text not null default 'three_month_supply',
  add column if not exists months int not null default 3,
  add column if not exists addon_product_id text;

-- New offers should default to staged/inactive — admins flip them on
-- once the copy and pricing have been reviewed.
alter table public.upsell_offers
  alter column active set default false;

-- Backfill any existing rows to the explicit template so the read path
-- has a sane value to dispatch on. The 3-month template matches the
-- legacy hard-coded behaviour.
update public.upsell_offers
   set template = 'three_month_supply'
 where template is null
    or template = '';

-- Constrain template values so a typo in the admin UI can't break the
-- public /upsell render.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'upsell_offers_template_check'
  ) then
    alter table public.upsell_offers
      add constraint upsell_offers_template_check
      check (template in (
        'three_month_supply',
        'six_month_supply',
        'annual_vip',
        'stack_complement'
      ));
  end if;
end$$;
