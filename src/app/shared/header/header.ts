import { Component, computed, inject, input, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ROLE_LABELS } from '../../core/models';

export interface NavItem {
  label: string;
  link: string;
  match: string[];
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', link: '/dashboard', match: ['/dashboard', '/approvals', '/archived', '/qc-queue'] },
  { label: 'Manage Products', link: '/products', match: ['/products'] },
  { label: 'User Management', link: '/users', match: ['/users', '/update-password', '/settings'] },
];

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly navItems = input<NavItem[]>(ADMIN_NAV);
  readonly userName = input<string>('Akua Tega');
  readonly userRole = input<string>('ADMINISTRATOR');
  readonly avatarInitials = input<string>('AT');
  readonly showMeta = input<boolean>(true);

  readonly notifOpen = signal(false);

  toggleNotif(): void {
    this.notifOpen.update((v) => !v);
  }

  /** Prefer the real signed-in profile; fall back to the static inputs. */
  readonly displayName = computed(() => this.auth.profile()?.full_name || this.userName());
  readonly displayRole = computed(() => {
    const role = this.auth.role();
    return role ? ROLE_LABELS[role].toUpperCase() : this.userRole();
  });
  readonly displayInitials = computed(() => {
    const name = this.auth.profile()?.full_name;
    if (!name) {
      return this.avatarInitials();
    }
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  });

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  isActive(item: NavItem): boolean {
    const current = this.url();
    return item.match.some((m) => current === m || current.startsWith(m + '/'));
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
