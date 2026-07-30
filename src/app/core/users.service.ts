import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Profile, UserRole, UserStatus } from './models';

export interface NewUserPayload {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  employee_id?: string;
  department?: string;
  title?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly supabase = inject(SupabaseService);

  /** All profiles, newest first. RLS ensures only admins get the full list. */
  async list(): Promise<Profile[]> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Profile[];
  }

  /** Activate / deactivate a user. */
  async setStatus(id: string, status: UserStatus): Promise<void> {
    const { error } = await this.supabase.client
      .from('profiles')
      .update({ status })
      .eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  }

  /** Create a new user through the admin Edge Function. */
  async create(payload: NewUserPayload): Promise<void> {
    const { data, error } = await this.supabase.client.functions.invoke('admin-create-user', {
      body: payload,
    });
    // functions.invoke surfaces non-2xx as an error whose context holds the body.
    if (error) {
      let message = error.message;
      try {
        const parsed = await (error as { context?: Response }).context?.json?.();
        if (parsed?.error) {
          message = parsed.error;
        }
      } catch {
        /* keep default message */
      }
      throw new Error(message);
    }
    if (data?.error) {
      throw new Error(data.error);
    }
  }
}
