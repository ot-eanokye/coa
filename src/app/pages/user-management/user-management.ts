import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UsersService } from '../../core/users.service';
import { Profile, ROLE_LABELS, UserRole } from '../../core/models';

interface StatCard {
  label: string;
  value: string;
  icon: 'users' | 'microscope' | 'shield' | 'clipboard' | 'idcard';
}

const AVATAR_TONES = ['tone-indigo', 'tone-slate', 'tone-blue', 'tone-gray'];

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [FormsModule, RouterLink, UpperCasePipe],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly route = inject(ActivatedRoute);

  readonly ROLE_LABELS = ROLE_LABELS;

  readonly profiles = signal<Profile[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly justCreated = signal(false);
  readonly busyId = signal<string | null>(null);
  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return this.profiles();
    }
    return this.profiles().filter((p) =>
      [p.full_name, p.email, p.employee_id, ROLE_LABELS[p.role], p.department]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  });

  readonly stats = computed<StatCard[]>(() => {
    const all = this.profiles();
    const count = (role: UserRole) => this.pad(all.filter((p) => p.role === role).length);
    return [
      { label: 'TOTAL USERS', value: String(all.length), icon: 'users' },
      { label: 'ANALYSTS', value: count('analyst'), icon: 'microscope' },
      { label: 'QC MANAGER', value: count('qc_manager'), icon: 'shield' },
      { label: 'PRODUCTION MANAGER', value: count('production_manager'), icon: 'clipboard' },
      { label: 'SENIOR ANALYST', value: count('senior_analyst'), icon: 'idcard' },
    ];
  });

  ngOnInit(): void {
    this.justCreated.set(this.route.snapshot.queryParamMap.get('created') === '1');
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const currentUserId = this.auth.profile()?.id;
      const profiles = await this.usersService.list();
      this.profiles.set(profiles.filter((profile) => profile.id !== currentUserId));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load users.');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleStatus(user: Profile): Promise<void> {
    if (this.busyId()) {
      return;
    }
    const next = user.status === 'active' ? 'inactive' : 'active';
    this.busyId.set(user.id);
    try {
      await this.usersService.setStatus(user.id, next);
      this.profiles.update((list) =>
        list.map((p) => (p.id === user.id ? { ...p, status: next } : p)),
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not update the user.');
    } finally {
      this.busyId.set(null);
    }
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return '??';
    }
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  tone(index: number): string {
    return AVATAR_TONES[index % AVATAR_TONES.length];
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : String(n);
  }
}
