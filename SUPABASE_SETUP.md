# Supabase Setup — CoA Management System

Follow these once. After step 2 the app boots against your project; after step 4 you can log in; after step 5 the admin can create users in-app.

## 1. Create the project

1. Go to <https://supabase.com> → **New project** (free tier).
2. Pick a region close to Ghana (e.g. `West EU (London)`), set a database password, create.

## 2. Wire the credentials into the app

1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **anon / publishable** key.
3. Paste them into [`src/environments/environment.ts`](src/environments/environment.ts):
   ```ts
   supabaseUrl: 'https://xxxxxxxx.supabase.co',
   supabaseAnonKey: 'eyJhbGciOi...',
   ```
   The anon key is safe to ship in the browser. **Never** put the `service_role` key here.

## 3. Create the database schema

1. Supabase → **SQL Editor → New query**.
2. Paste the entire contents of [`supabase/migrations/0001_init_profiles.sql`](supabase/migrations/0001_init_profiles.sql) and **Run**.
   This creates the `profiles` table, the `user_role` enum, Row-Level-Security policies, and the trigger that auto-creates a profile whenever an auth user is created.

## 4. Seed the first administrator

(Chicken-and-egg: an admin must exist before the app can create other users.)

1. Supabase → **Authentication → Users → Add user**:
   - Email: your administrator email address
   - Password: choose one
   - ✅ **Auto Confirm User**
2. Back in **SQL Editor**, run:
   ```sql
   update public.profiles
      set role = 'admin', full_name = 'System Administrator', status = 'active'
   where email = 'your-admin-email@example.com';
   ```
3. You can now sign in at `/login` and land on the admin dashboard.

## 5. Deploy the admin user-creation function

The admin creates users through a secure server-side Edge Function (the admin key never touches the browser).

Install the CLI once:

```bash
npm install -g supabase
```

Then, from the project root:

```bash
supabase login
supabase link --project-ref <your-project-ref>   # ref is in your project URL / dashboard
supabase functions deploy admin-create-user
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into the function automatically — no secrets to set.

## Done

- Log in as the admin → **User Management → Add New User** to provision Analysts, Senior Analysts, QC Managers, and Production Managers.
- Each new user signs in with the temporary password you set and is routed to their role's dashboard automatically.
- Deactivating a user from the directory blocks their next login.

### Role → landing page

| Role               | Lands on                |
| ------------------ | ----------------------- |
| Administrator      | `/dashboard`            |
| Analyst            | `/analyst/dashboard`    |
| Senior Analyst     | `/senior/dashboard`     |
| QC Manager         | `/qc/dashboard`         |
| Production Manager | `/production/dashboard` |
