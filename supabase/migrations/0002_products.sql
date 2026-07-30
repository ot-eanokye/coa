-- ============================================================================
-- CoA Management System — 0002: products + chemical specifications
-- Run in Supabase → SQL Editor after 0001.
-- ============================================================================

-- 1. Products ---------------------------------------------------------------
create table if not exists public.products (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  category           text not null,
  code               text unique,
  batch_no           text,
  mfg_date           text,
  exp_date           text,
  active_ingredients text,
  status             text not null default 'active' check (status in ('active', 'archived')),
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_status_idx on public.products (status);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- 2. Chemical specifications (many per product) -----------------------------
create table if not exists public.product_specifications (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  parameter   text not null,
  spec_range  text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists product_specs_product_idx on public.product_specifications (product_id);

-- 3. Row Level Security -----------------------------------------------------
--    Read: any signed-in user. Write: admins only (reuses is_admin() from 0001).
alter table public.products enable row level security;
alter table public.product_specifications enable row level security;

drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated using (true);

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert to authenticated with check (public.is_admin());

drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_delete on public.products;
create policy products_delete on public.products
  for delete to authenticated using (public.is_admin());

drop policy if exists specs_select on public.product_specifications;
create policy specs_select on public.product_specifications
  for select to authenticated using (true);

drop policy if exists specs_insert on public.product_specifications;
create policy specs_insert on public.product_specifications
  for insert to authenticated with check (public.is_admin());

drop policy if exists specs_update on public.product_specifications;
create policy specs_update on public.product_specifications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists specs_delete on public.product_specifications;
create policy specs_delete on public.product_specifications
  for delete to authenticated using (public.is_admin());

-- 4. Table grants (RLS remains the real gate) -------------------------------
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.product_specifications to authenticated;
