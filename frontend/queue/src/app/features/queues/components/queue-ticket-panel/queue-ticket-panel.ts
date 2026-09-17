import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  OperationalTicket,
  QueueCounter,
} from '../../models/queue-management.model';

@Component({
  selector: 'app-queue-ticket-panel',
  imports: [TranslatePipe],
  templateUrl: './queue-ticket-panel.html',
  styleUrl: './queue-ticket-panel.scss',
})
export class QueueTicketPanel {
  readonly counter = input.required<QueueCounter>();
  readonly tickets = input.required<readonly OperationalTicket[]>();
  readonly loading = input(false);
  readonly callNextLoading = input(false);
  readonly ticketActionLoading = input<string | null>(null);
  readonly errorKey = input<string | null>(null);

  readonly refreshRequested = output<void>();
  readonly callNextRequested = output<void>();
  readonly recallRequested = output<string>();
  readonly startRequested = output<string>();
  readonly completeRequested = output<string>();
  readonly skipRequested = output<string>();
  readonly noShowRequested = output<string>();

  protected readonly waitingTickets = computed(() =>
    this.tickets().filter((ticket) => ticket.status === 'WAITING'),
  );

  protected readonly activeTicket = computed(() =>
    this.tickets().find(
      (ticket) =>
        ticket.counter?.id === this.counter().id &&
        (ticket.status === 'CALLED' || ticket.status === 'SERVING'),
    ) ?? null,
  );
}
