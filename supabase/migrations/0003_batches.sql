-- ============================================================================
-- CoA Management System — 0003: batches, results, audit events (the workflow)
-- Run in Supabase → SQL Editor after 0002.
-- ============================================================================

-- Role helper (like is_admin, but returns the caller's role) -----------------
create or replace function public.my_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid();
$$;

-- 1. Batches ----------------------------------------------------------------
create table if not exists public.batches (
  id                 uuid primary key default gen_random_uuid(),
  batch_no           text not null,
  product_id         uuid references public.products(id) on delete set null,
  product_name       text not null,
  category           text,
  mfg_date           text,
  exp_date           text,
  analysis_started   text,
  analysis_completed text,
  stage              text not null default 'results_entry'
                       check (stage in ('results_entry','senior_review','qc_approval',
                                        'released','production_released','rejected')),
  conclusion         text,
  assigned_to        uuid references public.profiles(id) on delete set null,
  analyst_name       text,
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists batches_stage_idx on public.batches (stage);
create index if not exists batches_assigned_idx on public.batches (assigned_to);

drop trigger if exists batches_set_updated_at on public.batches;
create trigger batches_set_updated_at
  before update on public.batches
  for each row execute function public.set_updated_at();

-- 2. Test results (one row per parameter) -----------------------------------
create table if not exists public.batch_results (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references public.batches(id) on delete cascade,
  parameter    text not null,
  specification text,
  result_value text,
  status       text not null default 'pending' check (status in ('pending','pass','fail')),
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists batch_results_batch_idx on public.batch_results (batch_id);

-- 3. Audit trail ------------------------------------------------------------
create table if not exists public.batch_events (
  id         uuid primary key default gen_random_uuid(),
  batch_id   uuid not null references public.batches(id) on delete cascade,
  action     text not null,
  actor_id   uuid references public.profiles(id) on delete set null,
  actor_name text,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists batch_events_batch_idx on public.batch_events (batch_id);

-- 4. RLS --------------------------------------------------------------------
alter table public.batches enable row level security;
alter table public.batch_results enable row level security;
alter table public.batch_events enable row level security;

-- Everyone signed in can read the pipeline (needed for queues & dashboards).
drop policy if exists batches_select on public.batches;
create policy batches_select on public.batches for select to authenticated using (true);

drop policy if exists results_select on public.batch_results;
create policy results_select on public.batch_results for select to authenticated using (true);

drop policy if exists events_select on public.batch_events;
create policy events_select on public.batch_events for select to authenticated using (true);

-- Create a batch: analysts, QC managers or admins.
drop policy if exists batches_insert on public.batches;
create policy batches_insert on public.batches for insert to authenticated
  with check (public.my_role() in ('analyst','qc_manager') or public.is_admin());

-- Advance a batch: only the role that owns the current stage may act on it.
drop policy if exists batches_update on public.batches;
create policy batches_update on public.batches for update to authenticated
  using (
       (public.my_role() = 'analyst'            and assigned_to = auth.uid()
                                                and stage in ('results_entry','rejected'))
    or (public.my_role() = 'senior_analyst'     and stage = 'senior_review')
    or (public.my_role() = 'qc_manager'         and stage = 'qc_approval')
    or (public.my_role() = 'production_manager' and stage = 'released')
    or public.is_admin()
  )
  with check (true);

drop policy if exists batches_delete on public.batches;
create policy batches_delete on public.batches for delete to authenticated
  using (public.is_admin());

-- Results: the assigned analyst (or admin) manages them.
drop policy if exists results_write on public.batch_results;
create policy results_write on public.batch_results for insert to authenticated
  with check (public.is_admin() or exists (
    select 1 from public.batches b where b.id = batch_id and b.assigned_to = auth.uid()));
drop policy if exists results_update on public.batch_results;
create policy results_update on public.batch_results for update to authenticated
  using (public.is_admin() or exists (
    select 1 from public.batches b where b.id = batch_id and b.assigned_to = auth.uid()))
  with check (true);
drop policy if exists results_delete on public.batch_results;
create policy results_delete on public.batch_results for delete to authenticated
  using (public.is_admin() or exists (
    select 1 from public.batches b where b.id = batch_id and b.assigned_to = auth.uid()));

-- Audit events: any signed-in actor may append their own event.
drop policy if exists events_insert on public.batch_events;
create policy events_insert on public.batch_events for insert to authenticated
  with check (actor_id = auth.uid() or public.is_admin());

-- 5. Grants (RLS remains the gate) ------------------------------------------
grant select, insert, update, delete on public.batches to authenticated;
grant select, insert, update, delete on public.batch_results to authenticated;
grant select, insert, update, delete on public.batch_events to authenticated;
