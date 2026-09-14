import { inject, Service } from '@angular/core';
import {
  Observable,
  finalize,
  shareReplay,
  tap,
  timeout,
} from 'rxjs';

import { AuthSession } from '../auth/models/auth.models';
import { AuthStore } from '../auth/state/auth-store';
import { AuthServices } from '../auth/services/auth.services';

@Service()
export class AuthRefresh {
  private readonly authServices = inject(AuthServices);
  private readonly authStore = inject(AuthStore);

  private refreshRequest$: Observable<AuthSession> | null = null;

  refreshSession(): Observable<AuthSession> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    this.refreshRequest$ = this.authServices.refresh().pipe(
      timeout(10000),

      tap((session) => {
        this.authStore.setSession(session);
      }),

      finalize(() => {
        this.refreshRequest$ = null;
      }),

      shareReplay({
        bufferSize: 1,
        refCount: false,
      }),
    );

    return this.refreshRequest$;
  }
}
