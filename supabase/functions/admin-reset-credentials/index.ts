// Supabase Edge Function: admin-reset-credentials
// Lets an administrator set a new temporary password for a user who has lost
// access. Runs server-side with the service_role key (never exposed to browser).
//
// Deploy:  supabase functions deploy admin-reset-credentials

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

  // 1. Identify the caller.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Missing authorization token.' }, 401);
  const { data: caller, error: callerErr } = await admin.auth.getUser(jwt);
  if (callerErr || !caller.user) return json({ error: 'Invalid session.' }, 401);

  // 2. Only active admins may reset credentials.
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', caller.user.id)
    .single();
  if (!callerProfile || callerProfile.role !== 'admin' || callerProfile.status !== 'active') {
    return json({ error: 'Only administrators can reset credentials.' }, 403);
  }

  // 3. Validate payload.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }
  const userId = String(body.userId ?? '');
  const temporaryPassword = String(body.temporaryPassword ?? '');
  const requirePasswordChange = body.requirePasswordChange !== false;

  if (!userId || !temporaryPassword) {
    return json({ error: 'User and temporary password are required.' }, 400);
  }
  if (temporaryPassword.length < 8) {
    return json({ error: 'Temporary password must be at least 8 characters.' }, 400);
  }

  // 4. Set the new password (marks the account confirmed & usable immediately).
  const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { must_change_password: requirePasswordChange },
  });
  if (updErr) {
    return json({ error: updErr.message }, 400);
  }

  return json({ temporaryPassword }, 200);
});
