-- Atomically increment a promo's usage counter. Called from
-- uprails-webhook on payment.succeeded. Uses SECURITY DEFINER so the
-- service-role caller can bypass RLS without granting broad write
-- access on the table.

create or replace function public.increment_promo_uses(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.promo_codes set uses = uses + 1 where id = p_id;
$$;

revoke all on function public.increment_promo_uses(uuid) from public, anon, authenticated;
grant execute on function public.increment_promo_uses(uuid) to service_role;
