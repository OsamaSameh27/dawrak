import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, interval, timeout } from 'rxjs';
import { QueueTicket, TicketStatus } from '../../models/ticket.model';
import { TicketsServices } from '../../services/tickets.services';

const activeStatuses: readonly TicketStatus[] = ['WAITING', 'CALLED', 'SERVING'];

@Component({
  selector: 'app-current-tickets-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './current-tickets-page.html',
  styleUrl: './current-tickets-page.scss',
})
export class CurrentTicketsPage {
  private readonly ticketsServices = inject(TicketsServices);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tickets = signal<QueueTicket[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorKey = signal<string | null>(null);

  ngOnInit(): void {
    this.loadTickets();
    interval(15000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadTickets(false);
      });
  }

  protected loadTickets(showLoading = true): void {
    if (this.loading()) return;
    if (showLoading) {
      this.loading.set(true);
      this.errorKey.set(null);
      this.tickets.set([]);
    }

    this.ticketsServices
      .getMyActiveTickets()
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (showLoading) {
            this.loading.set(false);
          }
        }),
      )
      .subscribe({
        next: (tickets) => {
          this.errorKey.set(null);

          this.tickets.set(tickets.filter((ticket) => activeStatuses.includes(ticket.status)));
        },
        error: (error: unknown) => {
          if (showLoading) {
            this.errorKey.set(
              error instanceof HttpErrorResponse && error.status === 401
                ? 'currentTickets.loginRequired'
                : error instanceof HttpErrorResponse && error.status === 403
                  ? 'currentTickets.customerOnly'
                  : 'currentTickets.loadFailed',
            );
          }
        },
      });
  }
}
