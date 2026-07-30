import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Thin singleton wrapper around the Supabase browser client.
 * Uses the anon key only — never the service_role key.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  /** True once real credentials are wired into environment.ts. */
  readonly isConfigured =
    environment.supabaseUrl.startsWith('http') && !environment.supabaseAnonKey.startsWith('YOUR_');

  // Fall back to harmless local placeholders so createClient never throws on an
  // invalid URL before the project is configured.
  private readonly url = this.isConfigured ? environment.supabaseUrl : 'http://localhost:54321';
  private readonly key = this.isConfigured ? environment.supabaseAnonKey : 'placeholder-anon-key';

  readonly client: SupabaseClient = createClient(this.url, this.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
