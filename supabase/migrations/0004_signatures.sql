-- ============================================================================
-- CoA Management System — 0004: digital signatures
-- Run in Supabase → SQL Editor after 0003.
-- ============================================================================

-- 1. Where a user's reusable signature lives, and the snapshot stored on each
--    sign-off event (so a CoA shows the exact signature used at that moment).
alter table public.profiles     add column if not exists signature_url text;
alter table public.batch_events  add column if not exists signature    text;

-- 2. Let a signed-in user update THEIR OWN profile (to save a signature, etc.).
--    The admin-only update policy from 0001 still covers admins editing others.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 3. …but a non-admin must not change their own role or status via that policy.
create or replace function public.protect_profile_privileged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role or new.status is distinct from old.status then
      raise exception 'Only administrators can change role or status.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged on public.profiles;
create trigger protect_profile_privileged
  before update on public.profiles
  for each row execute function public.protect_profile_privileged();
