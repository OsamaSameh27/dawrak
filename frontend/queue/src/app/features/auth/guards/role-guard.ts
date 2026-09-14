import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../state/auth-store';
import { inject } from '@angular/core';
import { UserRole } from '../models/auth.models';

export const roleGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const role = authStore.role();

  const allowedRoles = route.data['roles'] as UserRole[] | undefined;

  if (!authStore.isAuthenticated() || role === null) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url,
      },
    });
  }

  if (allowedRoles?.includes(role)) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
