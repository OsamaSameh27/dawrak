import { inject } from '@angular/core';
import { catchError, Observable, of, tap, timeout } from 'rxjs';

import { AuthSession } from '../models/auth.models';
import { AuthServices } from '../services/auth.services';
import { AuthStore } from '../state/auth-store';

export function initializeAuth(): Observable<AuthSession | null> {
  const authServices = inject(AuthServices);
  const authStore = inject(AuthStore);

  return authServices.refresh().pipe(
    timeout(10000),

    tap((session) => {
      authStore.setSession(session);
    }),

    catchError(() => {
      authStore.clearSession();
      return of(null);
    }),
  );
}
