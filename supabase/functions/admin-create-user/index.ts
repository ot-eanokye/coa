// Supabase Edge Function: admin-create-user
// Creates a new auth user (admin-only). Runs server-side with the service_role
// key, which must NEVER be exposed to the browser.
//
// Deploy:  supabase functions deploy admin-create-user
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROLES = ['admin', 'analyst', 'senior_analyst', 'qc_manager', 'production_manager'];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Identify the caller from their JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return json({ error: 'Missing authorization token.' }, 401);
  }
  const { data: caller, error: callerErr } = await admin.auth.getUser(jwt);
  if (callerErr || !caller.user) {
    return json({ error: 'Invalid session.' }, 401);
  }

  // 2. Verify the caller is an active admin.
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', caller.user.id)
    .single();
  if (!callerProfile || callerProfile.role !== 'admin' || callerProfile.status !== 'active') {
    return json({ error: 'Only administrators can create users.' }, 403);
  }

  // 3. Validate the payload.
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const full_name = (body.full_name ?? '').trim();
  const role = body.role ?? '';

  if (!email || !password || !full_name || !role) {
    return json({ error: 'Full name, email, password and role are required.' }, 400);
  }
  if (!ROLES.includes(role)) {
    return json({ error: 'Invalid role.' }, 400);
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters.' }, 400);
  }

  // 4. Create the auth user. The DB trigger builds the matching profile row
  //    from this metadata.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
      role,
      employee_id: (body.employee_id ?? '').trim(),
      department: (body.department ?? '').trim(),
      title: (body.title ?? '').trim(),
      status: 'active',
    },
  });

  if (createErr) {
    const dup = /already been registered|already exists/i.test(createErr.message);
    return json({ error: createErr.message }, dup ? 409 : 400);
  }

  return json({ user: { id: created.user?.id, email: created.user?.email } }, 201);
});
