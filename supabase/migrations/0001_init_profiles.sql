-- ============================================================================
-- CoA Management System — 0001 init: roles, profiles, RLS, signup trigger
-- Run this in the Supabase Dashboard → SQL Editor (or via the Supabase CLI).
-- ============================================================================

-- 1. Role enum -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum (
      'admin',
      'analyst',
      'senior_analyst',
      'qc_manager',
      'production_manager'
    );
  end if;
end$$;

-- 2. Profiles table (1:1 with auth.users) ----------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text not null default '',
  employee_id  text unique,
  role         public.user_role not null default 'analyst',
  department   text,
  title        text,
  status       text not null default 'active' check (status in ('active', 'inactive')),
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);

-- 3. keep updated_at fresh --------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4. is_admin() helper (SECURITY DEFINER avoids RLS recursion) --------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 5. Row Level Security -----------------------------------------------------
alter table public.profiles enable row level security;

-- Everyone can read their own profile; admins can read all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Only admins can update/delete profiles (deactivate, edit role, etc.).
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete using (public.is_admin());

-- Inserts happen only through the signup trigger (SECURITY DEFINER) and the
-- admin Edge Function (service_role) — both bypass RLS, so no insert policy.

-- 6. Auto-create a profile whenever an auth user is created ----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, employee_id, role, department, title, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'employee_id', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'analyst'),
    nullif(new.raw_user_meta_data->>'department', ''),
    nullif(new.raw_user_meta_data->>'title', ''),
    coalesce(new.raw_user_meta_data->>'status', 'active')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- SEED THE FIRST ADMIN (chicken-and-egg: needed before the app can create users)
-- ----------------------------------------------------------------------------
-- 1) Supabase Dashboard → Authentication → Users → "Add user":
--       email:    admin@ernestchemists.com   (use your own)
--       password: <choose one>
--       ✅ Auto Confirm User
-- 2) Then run the statement below to promote that account to admin:
--
--    update public.profiles
--       set role = 'admin', full_name = 'System Administrator', status = 'active'
--     where email = 'admin@ernestchemists.com';
-- ============================================================================
