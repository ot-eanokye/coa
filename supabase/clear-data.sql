-- Clear all CoA application data without dropping tables.
-- Run this in the Supabase SQL Editor as a database owner/admin.
-- This permanently deletes rows. It does not remove tables, columns, policies,
-- indexes, triggers, functions, or the public.user_role enum.

begin;

-- Child rows first, then their parent rows.
truncate table
  public.batch_results,
  public.batch_events,
  public.batches,
  public.product_specifications,
  public.products,
  public.profiles;

commit;

-- Confirm that all application tables are empty.
select 'profiles' as table_name, count(*) as remaining_rows from public.profiles
union all
select 'products', count(*) from public.products
union all
select 'product_specifications', count(*) from public.product_specifications
union all
select 'batches', count(*) from public.batches
union all
select 'batch_results', count(*) from public.batch_results
union all
select 'batch_events', count(*) from public.batch_events;

-- AUTH USERS ARE NOT INCLUDED ABOVE.
-- To also remove every Supabase Authentication user, run this separately only
-- if that is intentional. This will also remove their profiles via the
-- profiles.id -> auth.users.id ON DELETE CASCADE relationship:
--
-- begin;
-- delete from auth.users;
-- commit;
