import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, interval, Observable, timeout } from 'rxjs';

import {
  CounterStatus,
  OperationalTicket,
  QueueCounter,
} from '../../models/queue-management.model';
import { QueueManagementServices } from '../../services/queue-management.services';
import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';
import { QueueTicketPanel } from '../../components/queue-ticket-panel/queue-ticket-panel';
import { CounterSessionState } from '../../state/counter-session-state';
import { NotificationsRealtimeService } from '../../../notifications/services/notifications-realtime.service';

type TicketAction = 'recall' | 'start' | 'complete' | 'skip' | 'noShow';

@Component({
  imports: [TranslatePipe, LocalizedTextPipe, QueueTicketPanel],
  selector: 'app-queue-management-page',
  styleUrl: './queue-management-page.scss',
  templateUrl: './queue-management-page.html',
})
export class QueueManagementPage implements OnInit {
  private readonly queueManagementServices = inject(QueueManagementServices);

  private readonly destroyRef = inject(DestroyRef);
  private readonly counterSessionState = inject(CounterSessionState);
  private readonly realtime = inject(NotificationsRealtimeService);

  protected readonly counters = signal<QueueCounter[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly statusLoading = signal<CounterStatus | null>(null);
  protected readonly workspaceErrorKey = signal<string | null>(null);
  protected readonly selectedCounterId = signal<string | null>(null);
  protected readonly tickets = signal<OperationalTicket[]>([]);
  protected readonly ticketsLoading = signal(false);
  protected readonly callNextLoading = signal(false);
  protected readonly ticketActionLoading = signal<TicketAction | null>(null);
  protected readonly ticketsErrorKey = signal<string | null>(null);
  protected readonly claimingCounterId = signal<string | null>(null);
  protected readonly releasingCounter = signal(false);
  protected readonly sessionErrorKey = signal<string | null>(null);

  protected readonly selectedCounter = computed(() => {
    const counterId = this.selectedCounterId();

    return this.counters().find((counter) => counter.id === counterId) ?? null;
  });

  protected readonly waitingTickets = computed(() =>
    this.tickets().filter((ticket) => ticket.status === 'WAITING'),
  );

  protected readonly activeTicket = computed(() => {
    const counterId = this.selectedCounterId();

    return (
      this.tickets().find(
        (ticket) =>
          ticket.counter?.id === counterId &&
          (ticket.status === 'CALLED' || ticket.status === 'SERVING'),
      ) ?? null
    );
  });

  ngOnInit(): void {
    this.loadCounters();

    this.realtime.countersUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadCounters(false));

    this.realtime.queueUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((snapshot) => {
        if (snapshot.service.id === this.selectedCounter()?.serviceId) {
          this.loadTickets(false);
        }
      });

    interval(30000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadCounters(false);
        if (this.selectedCounterId()) {
          this.loadTickets(false);
        }
      });
  }

  protected loadCounters(showLoading = true): void {
    if (this.loading()) {
      return;
    }

    if (showLoading) {
      this.loading.set(true);
      this.errorKey.set(null);
    }

    this.queueManagementServices
      .getCounters()
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (showLoading) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (counters) => {
          this.counters.set(counters);
          const claimedCounter = counters.find((counter) => counter.session?.claimedByMe);

          if (claimedCounter && this.selectedCounterId() !== claimedCounter.id) {
            this.selectedCounterId.set(claimedCounter.id);
            this.counterSessionState.start(claimedCounter.id);
            this.tickets.set([]);
            if (claimedCounter.serviceId) this.realtime.subscribeQueue(claimedCounter.serviceId);
            this.loadTickets();
          } else if (claimedCounter?.serviceId) {
            this.realtime.subscribeQueue(claimedCounter.serviceId);
          } else if (this.selectedCounterId() && !claimedCounter) {
            this.counterSessionState.stop();
            this.selectedCounterId.set(null);
            this.tickets.set([]);
          }
        },
        error: (error: unknown) => {
          if (showLoading) {
            this.errorKey.set(
              error instanceof HttpErrorResponse && error.status === 401
                ? 'queueManagement.errors.loginRequired'
                : error instanceof HttpErrorResponse && error.status === 403
                  ? 'queueManagement.errors.permissionDenied'
                  : 'queueManagement.errors.loadCounters',
            );
          }
        },
      });
  }

  protected loadTickets(showLoading = true): void {
    const counter = this.selectedCounter();

    if (!counter?.serviceId || this.ticketsLoading()) {
      return;
    }

    this.ticketsLoading.set(true);

    if (showLoading) {
      this.ticketsErrorKey.set(null);
    }

    this.queueManagementServices
      .getServiceTickets(counter.serviceId)
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.ticketsLoading.set(false);
        }),
      )
      .subscribe({
        next: (tickets) => {
          this.tickets.set(tickets);
          this.ticketsErrorKey.set(null);
        },
        error: () => {
          if (showLoading) {
            this.ticketsErrorKey.set('queueManagement.errors.loadTickets');
          }
        },
      });
  }

  protected selectCounter(counter: QueueCounter): void {
    if (
      !counter.serviceId ||
      (counter.session && !counter.session.claimedByMe) ||
      this.claimingCounterId()
    ) {
      return;
    }

    this.claimingCounterId.set(counter.id);
    this.sessionErrorKey.set(null);
    this.queueManagementServices
      .claimCounter(counter.id)
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.claimingCounterId.set(null)),
      )
      .subscribe({
        next: (session) => {
          this.counters.update((counters) => counters.map((current) =>
            current.id === counter.id ? { ...current, session } : current,
          ));
          this.selectedCounterId.set(counter.id);
          this.counterSessionState.start(counter.id);
          this.realtime.subscribeQueue(counter.serviceId!);
          this.tickets.set([]);
          this.ticketsErrorKey.set(null);
          this.loadTickets();
        },
        error: (error: unknown) => {
          this.sessionErrorKey.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'queueManagement.errors.counterOccupied'
              : 'queueManagement.errors.claimCounter',
          );
          this.loadCounters(false);
        },
      });
  }

  protected leaveCounter(): void {
    const counter = this.selectedCounter();
    if (!counter || this.statusLoading() || this.callNextLoading() || this.releasingCounter()) {
      return;
    }

    this.releasingCounter.set(true);
    this.sessionErrorKey.set(null);
    this.queueManagementServices
      .releaseCounter(counter.id)
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.releasingCounter.set(false)),
      )
      .subscribe({
        next: () => {
          this.counterSessionState.stop();
          this.counters.update((counters) => counters.map((current) =>
            current.id === counter.id
              ? { ...current, session: null, status: 'CLOSED' }
              : current,
          ));
          this.selectedCounterId.set(null);
          this.tickets.set([]);
          this.workspaceErrorKey.set(null);
          this.ticketsErrorKey.set(null);
        },
        error: (error: unknown) => {
          this.sessionErrorKey.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'queueManagement.errors.finishBeforeRelease'
              : 'queueManagement.errors.releaseCounter',
          );
        },
      });
  }

  protected callNext(): void {
    const counter = this.selectedCounter();

    if (
      !counter?.serviceId ||
      counter.status !== 'OPEN' ||
      this.activeTicket() ||
      this.waitingTickets().length === 0 ||
      this.callNextLoading()
    ) {
      return;
    }

    this.callNextLoading.set(true);
    this.ticketsErrorKey.set(null);

    this.queueManagementServices
      .callNext(counter.serviceId, counter.id)
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.callNextLoading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.loadTickets(false);
        },
        error: (error: unknown) => {
          this.ticketsErrorKey.set(
            error instanceof HttpErrorResponse && error.status === 404
              ? 'queueManagement.errors.noWaitingTickets'
              : error instanceof HttpErrorResponse && error.status === 409
                ? 'queueManagement.errors.counterHasActiveTicket'
                : 'queueManagement.errors.callNext',
          );
        },
      });
  }

  protected recallTicket(ticketId: string): void {
    this.runTicketAction('recall', this.queueManagementServices.recallTicket(ticketId));
  }

  protected startTicket(ticketId: string): void {
    this.runTicketAction('start', this.queueManagementServices.startTicket(ticketId));
  }

  protected completeTicket(ticketId: string): void {
    this.runTicketAction('complete', this.queueManagementServices.completeTicket(ticketId));
  }

  protected skipTicket(ticketId: string): void {
    this.runTicketAction('skip', this.queueManagementServices.skipTicket(ticketId));
  }

  protected markNoShow(ticketId: string): void {
    this.runTicketAction('noShow', this.queueManagementServices.markNoShow(ticketId));
  }

  protected changeCounterStatus(status: CounterStatus): void {
    const counter = this.selectedCounter();

    if (!counter || this.statusLoading() || this.callNextLoading()) {
      return;
    }

    this.statusLoading.set(status);
    this.workspaceErrorKey.set(null);

    this.queueManagementServices
      .updateCounterStatus(counter.id, status)
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.statusLoading.set(null);
        }),
      )
      .subscribe({
        next: (updatedCounter) => {
          this.counters.update((counters) =>
            counters.map((currentCounter) =>
              currentCounter.id === updatedCounter.id
                ? {
                    ...currentCounter,
                    status: updatedCounter.status,
                    updatedAt: updatedCounter.updatedAt,
                  }
                : currentCounter,
            ),
          );
        },
        error: (error: unknown) => {
          this.workspaceErrorKey.set(
            error instanceof HttpErrorResponse && error.status === 409
              ? 'queueManagement.errors.closeActiveCounter'
              : error instanceof HttpErrorResponse && error.status === 400
                ? 'queueManagement.errors.serviceRequired'
                : 'queueManagement.errors.updateStatus',
          );
        },
      });
  }

  protected counterStatusKey(status: CounterStatus): string {
    return `queueManagement.status.${status.toLowerCase()}`;
  }

  private runTicketAction(action: TicketAction, request: Observable<unknown>): void {
    if (this.ticketActionLoading()) return;
    this.ticketActionLoading.set(action);
    this.ticketsErrorKey.set(null);

    request
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.ticketActionLoading.set(null)),
      )
      .subscribe({
        next: () => {
          this.loadTickets(false);
          this.loadCounters(false);
        },
        error: () => this.ticketsErrorKey.set('queueManagement.errors.ticketAction'),
      });
  }
}
