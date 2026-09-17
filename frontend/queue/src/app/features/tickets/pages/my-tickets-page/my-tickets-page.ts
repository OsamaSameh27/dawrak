import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, interval, timeout } from 'rxjs';

import { QueueTicket, TicketStatus } from '../../models/ticket.model';
import { TicketsServices } from '../../services/tickets.services';
import { LocalizedTextPipe } from '../../../../shared/pipes/localized-text.pipe';

const activeStatuses: readonly TicketStatus[] = ['WAITING', 'CALLED', 'SERVING'];

@Component({
  selector: 'app-my-tickets-page',
  imports: [TranslatePipe, LocalizedTextPipe],
  templateUrl: './my-tickets-page.html',
  styleUrl: './my-tickets-page.scss',
})
export class MyTicketsPage {
  private readonly ticketsServices = inject(TicketsServices);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tickets = signal<QueueTicket[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly now = signal(Date.now());

  protected readonly cancelingTicketId = signal<string | null>(null);
  protected readonly cancelLoading = signal(false);
  protected readonly cancelErrorKey = signal<string | null>(null);

  protected readonly currentTickets = computed(() =>
    this.tickets().filter((ticket) => activeStatuses.includes(ticket.status)),
  );

  protected readonly oldTickets = computed(() =>
    this.tickets().filter((ticket) => !activeStatuses.includes(ticket.status)),
  );

  ngOnInit(): void {
    this.loadTickets();
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
  }

  protected loadTickets(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorKey.set(null);

    this.ticketsServices
      .getMyTickets()
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (tickets) => {
          this.tickets.set(tickets);
        },
        error: (error: unknown) => {
          this.errorKey.set(
            error instanceof HttpErrorResponse && error.status === 401
              ? 'myTickets.loginRequired'
              : error instanceof HttpErrorResponse && error.status === 403
                ? 'myTickets.customerOnly'
                : 'myTickets.loadFailed',
          );
        },
      });
  }

  protected statusKey(status: TicketStatus): string {
    return `track.result.status.${status.toLowerCase()}`;
  }

  protected isWaiting(ticket: QueueTicket): boolean {
    return ticket.status === 'WAITING';
  }

  protected serviceDuration(ticket: QueueTicket): string {
    if (ticket.serviceDurationSeconds !== null) return this.formatSeconds(ticket.serviceDurationSeconds);
    if (!ticket.serviceStartedAt) return '—';
    return this.formatSeconds(Math.max(0, Math.floor((this.now() - new Date(ticket.serviceStartedAt).getTime()) / 1000)));
  }

  private formatSeconds(seconds: number): string {
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const rest = (seconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${rest}`;
  }

  protected requestCancel(ticketId: string): void {
    if (this.cancelLoading()) {
      return;
    }

    this.cancelErrorKey.set(null);
    this.cancelingTicketId.set(ticketId);
  }

  protected dismissCancel(): void {
    if (this.cancelLoading()) {
      return;
    }

    this.cancelErrorKey.set(null);
    this.cancelingTicketId.set(null);
  }

  protected confirmCancel(ticket: QueueTicket): void {
    if (
      this.cancelLoading() ||
      ticket.status !== 'WAITING' ||
      this.cancelingTicketId() !== ticket.id
    ) {
      return;
    }

    this.cancelLoading.set(true);
    this.cancelErrorKey.set(null);

    this.ticketsServices
      .cancelMyTicket(ticket.id)
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.cancelLoading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.cancelingTicketId.set(null);
          this.loadTickets();
        },
        error: () => {
          this.cancelErrorKey.set('myTickets.cancelFailed');
        },
      });
  }
}
