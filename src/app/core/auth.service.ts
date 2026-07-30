import { computed, inject, Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Profile, ROLE_HOME, UserRole } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  private readonly _session = signal<Session | null>(null);
  private readonly _profile = signal<Profile | null>(null);
  private readonly _initialized = signal(false);

  readonly session = this._session.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  readonly isLoggedIn = computed(() => !!this._session() && !!this._profile());
  readonly role = computed<UserRole | null>(() => this._profile()?.role ?? null);

  private ready!: Promise<void>;

  /** Called once at app startup (APP_INITIALIZER). Resolves when session + profile are loaded. */
  init(): Promise<void> {
    this.ready = this.bootstrap();
    return this.ready;
  }

  /** Guards await this to make sure auth state is known before deciding. */
  whenReady(): Promise<void> {
    return this.ready ?? this.init();
  }

  private async bootstrap(): Promise<void> {
    if (!this.supabase.isConfigured) {
      this._initialized.set(true);
      return;
    }
    try {
      const { data } = await this.supabase.client.auth.getSession();
      this._session.set(data.session);
      if (data.session) {
        await this.loadProfile(data.session.user.id);
      }
      // Keep local state in sync with future auth changes (refresh, sign-out in another tab…).
      this.supabase.client.auth.onAuthStateChange((_event, session) => {
        this._session.set(session);
        if (!session) {
          this._profile.set(null);
        }
      });
    } catch {
      // Network / misconfiguration — treat as logged out.
      this._session.set(null);
      this._profile.set(null);
    } finally {
      this._initialized.set(true);
    }
  }

  private async loadProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single<Profile>();
    if (error) {
      this._profile.set(null);
      return null;
    }
    this._profile.set(data);
    return data;
  }

  /**
   * Sign in with email + password. Returns the landing path for the user's role,
   * or throws an Error with a user-friendly message.
   */
  async signIn(email: string, password: string): Promise<string> {
    if (!this.supabase.isConfigured) {
      throw new Error('Supabase is not configured yet. Add your project URL and anon key.');
    }
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      throw new Error(this.friendlyError(error.message));
    }

    this._session.set(data.session);
    const profile = await this.loadProfile(data.user.id);
    if (!profile) {
      await this.signOut();
      throw new Error('No profile is linked to this account. Contact your administrator.');
    }
    if (profile.status === 'inactive') {
      await this.signOut();
      throw new Error('This account has been deactivated. Contact your administrator.');
    }
    return ROLE_HOME[profile.role] ?? '/login';
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this._session.set(null);
    this._profile.set(null);
  }

  homePath(): string {
    const role = this.role();
    return role ? ROLE_HOME[role] : '/login';
  }

  private friendlyError(message: string): string {
    if (/invalid login credentials/i.test(message)) {
      return 'Incorrect email or password.';
    }
    if (/email not confirmed/i.test(message)) {
      return 'This account has not been confirmed yet.';
    }
    return message;
  }
}
