import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, Service, signal } from '@angular/core';
import { catchError, EMPTY, Subscription, switchMap, timer } from 'rxjs';

import { QueueManagementServices } from '../services/queue-management.services';

const STORAGE_KEY = 'queue-active-counter-id';

@Service()
export class CounterSessionState {
  private readonly queueManagementServices = inject(QueueManagementServices);
  private readonly platformId = inject(PLATFORM_ID);
  private heartbeatSubscription?: Subscription;

  private readonly counterIdState = signal<string | null>(null);
  readonly counterId = this.counterIdState.asReadonly();

  resume(): void {
    if (!isPlatformBrowser(this.platformId) || this.counterIdState()) return;
    const counterId = localStorage.getItem(STORAGE_KEY);
    if (counterId) this.start(counterId);
  }

  start(counterId: string): void {
    if (this.counterIdState() === counterId && this.heartbeatSubscription) return;
    this.stop(false);
    this.counterIdState.set(counterId);
    if (isPlatformBrowser(this.platformId)) localStorage.setItem(STORAGE_KEY, counterId);

    this.heartbeatSubscription = timer(0, 30000)
      .pipe(
        switchMap(() => this.queueManagementServices.heartbeatCounter(counterId).pipe(
          catchError((error: unknown) => {
            if (
              error instanceof HttpErrorResponse &&
              [403, 404, 409].includes(error.status)
            ) {
              this.stop();
            }
            return EMPTY;
          }),
        )),
      )
      .subscribe();
  }

  stop(clearStorage = true): void {
    this.heartbeatSubscription?.unsubscribe();
    this.heartbeatSubscription = undefined;
    this.counterIdState.set(null);
    if (clearStorage && isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
