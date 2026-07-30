import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from './models';

/** Requires a logged-in user; otherwise sends to /login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (auth.isLoggedIn()) {
    return true;
  }
  return router.parseUrl('/login');
};

/** For /login: if already signed in, bounce to the role's home. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (auth.isLoggedIn()) {
    return router.parseUrl(auth.homePath());
  }
  return true;
};

/** Restricts a route tree to specific roles; wrong role → their own home. */
export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.whenReady();
    if (!auth.isLoggedIn()) {
      return router.parseUrl('/login');
    }
    const role = auth.role();
    if (role && roles.includes(role)) {
      return true;
    }
    return router.parseUrl(auth.homePath());
  };
}
