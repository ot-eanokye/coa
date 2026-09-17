-- Create or promote an administrator for the CoA application.
-- Run this in the Supabase SQL Editor as a database owner/admin.
--
-- IMPORTANT:
-- 1. First create the user in Supabase Dashboard -> Authentication -> Users
--    with an @deblin.com email address.
-- 2. Enable "Auto Confirm User" if the administrator should sign in immediately.
-- 3. Replace every value marked REPLACE below before running this script.
-- 4. This script does not set or change the user's password.

begin;

do $$
declare
  admin_email text := 'REPLACE_WITH_ADMIN_USERNAME@deblin.com';
  admin_name text := 'REPLACE_WITH_ADMIN_FULL_NAME';
  admin_department text := 'REPLACE_WITH_DEPARTMENT'; -- Example: Quality Control
  admin_title text := 'REPLACE_WITH_JOB_TITLE';       -- Example: Laboratory Administrator
  admin_user_id uuid;
  profile_exists boolean;
begin
  admin_email := lower(trim(admin_email));

  if admin_email like 'REPLACE_%'
     or admin_name like 'REPLACE_%'
     or admin_department like 'REPLACE_%'
     or admin_title like 'REPLACE_%' then
    raise exception 'Replace all REPLACE_* values before running this script.';
  end if;

  if admin_email !~* '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@deblin\.com$' then
    raise exception 'Administrator email must use the @deblin.com domain.';
  end if;

  -- The account must already exist in Supabase Authentication.
  select id
    into admin_user_id
    from auth.users
   where lower(email) = lower(admin_email)
   limit 1;

  if admin_user_id is null then
    raise exception 'No Authentication user found for %. Create the user first in Supabase Authentication.', admin_email;
  end if;

  if exists (
    select 1
      from auth.users
     where id = admin_user_id
       and email_confirmed_at is null
  ) then
    raise exception 'Authentication user % is not confirmed. Enable Auto Confirm User or confirm the account first.', admin_email;
  end if;

  -- The Auth signup trigger normally created an analyst profile already.
  -- SQL Editor has no auth.uid(), so the profile protection trigger cannot
  -- recognize this one-time database bootstrap as an administrator update.
  select exists (
    select 1 from public.profiles where id = admin_user_id
  ) into profile_exists;

  if profile_exists then
    alter table public.profiles disable trigger protect_profile_privileged;
  end if;

  -- The auth trigger normally creates this profile automatically. The upsert
  -- also supports an auth user that was created before the profile existed.
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    department,
    title,
    status
  )
  values (
    admin_user_id,
    admin_email,
    admin_name,
    'admin'::public.user_role,
    admin_department,
    admin_title,
    'active'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = 'admin'::public.user_role,
        department = excluded.department,
        title = excluded.title,
        status = 'active',
        updated_at = now();

  if profile_exists then
    alter table public.profiles enable trigger protect_profile_privileged;
  end if;
end $$;

commit;

-- Verify the administrator profile that was created or updated.
select id, email, full_name, role, department, title, status
  from public.profiles
 where lower(email) = lower('REPLACE_WITH_ADMIN_USERNAME@deblin.com');
