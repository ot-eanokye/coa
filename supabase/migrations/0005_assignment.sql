-- ============================================================================
-- CoA Management System — 0005: batch assignment support
-- Run in Supabase → SQL Editor after 0004.
-- ============================================================================

-- 1. A safe way for any signed-in user to list active analysts (for the QC
--    "assign batch" dropdown) without exposing the whole profiles table.
create or replace function public.list_analysts()
returns table (id uuid, full_name text)
language sql
security definer
set search_path = public
as $$
  select id, full_name
  from public.profiles
  where role = 'analyst' and status = 'active'
  order by full_name;
$$;

grant execute on function public.list_analysts() to authenticated;

-- 2. Let the batch CREATOR seed its result rows too (so a QC manager assigning
--    a batch to an analyst can seed the parameters), not just the assignee.
drop policy if exists results_write on public.batch_results;
create policy results_write on public.batch_results
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.batches b
      where b.id = batch_id and (b.assigned_to = auth.uid() or b.created_by = auth.uid())
    )
  );
