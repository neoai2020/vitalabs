-- Storage bucket for generated ad creatives.
--
-- Public read is REQUIRED here: when we hand a creative URL to Meta's
-- /act_<id>/adcreatives endpoint, Meta's CDN fetches the file directly,
-- and that fetch is unauthenticated. So we make the bucket public-read
-- and rely on the unguessable creative id in the path for opacity.
--
-- Writes are admin-only (the generation Edge Functions run with the
-- service role key, which bypasses RLS, so they can write regardless).

insert into storage.buckets (id, name, public)
values ('ad-creatives', 'ad-creatives', true)
on conflict (id) do nothing;

create policy "anyone reads ad-creatives"
  on storage.objects
  for select
  using (bucket_id = 'ad-creatives');

create policy "admins upload ad-creatives"
  on storage.objects
  for insert
  with check (bucket_id = 'ad-creatives' and public.is_admin());

create policy "admins update ad-creatives"
  on storage.objects
  for update
  using (bucket_id = 'ad-creatives' and public.is_admin())
  with check (bucket_id = 'ad-creatives' and public.is_admin());

create policy "admins delete ad-creatives"
  on storage.objects
  for delete
  using (bucket_id = 'ad-creatives' and public.is_admin());
