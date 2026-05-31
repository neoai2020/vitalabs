-- Phase 2 storage: public 'assets' bucket for admin-uploaded images.
-- Folder convention: <brand>/<purpose>/<filename> e.g. vitalabs/products/abc.jpg.
-- Public read; admin write.

insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

create policy "anyone reads assets"
  on storage.objects
  for select
  using (bucket_id = 'assets');

create policy "admins upload assets"
  on storage.objects
  for insert
  with check (bucket_id = 'assets' and public.is_admin());

create policy "admins update assets"
  on storage.objects
  for update
  using (bucket_id = 'assets' and public.is_admin())
  with check (bucket_id = 'assets' and public.is_admin());

create policy "admins delete assets"
  on storage.objects
  for delete
  using (bucket_id = 'assets' and public.is_admin());
