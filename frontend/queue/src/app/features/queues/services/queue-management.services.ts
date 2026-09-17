import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { QueueTicket } from '../../tickets/models/ticket.model';
import {
  CounterStatus,
  CounterStatusResponse,
  CounterShiftHistory,
  CounterSessionInfo,
  OperationalTicket,
  QueueCounter,
  TicketTransitionRequest,
} from '../models/queue-management.model';

type TicketAction =
  | 'recall'
  | 'start'
  | 'complete'
  | 'skip'
  | 'no-show';

@Service()
export class QueueManagementServices {
  private readonly http = inject(HttpClient);

  private readonly countersUrl = `${environment.apiBaseUrl}/counters`;
  private readonly queuesUrl = `${environment.apiBaseUrl}/queues`;

  getCounters(branchId?: string): Observable<QueueCounter[]> {
    return this.http.get<QueueCounter[]>(
      this.countersUrl,
      branchId
        ? {
            params: { branchId },
          }
        : {},
    );
  }

  updateCounterStatus(
    counterId: string,
    status: CounterStatus,
  ): Observable<CounterStatusResponse> {
    return this.http.patch<CounterStatusResponse>(
      `${this.countersUrl}/${encodeURIComponent(counterId)}/status`,
      { status },
    );
  }

  getCounterShifts(counterId: string): Observable<CounterShiftHistory[]> {
    return this.http.get<CounterShiftHistory[]>(
      `${this.countersUrl}/${encodeURIComponent(counterId)}/shifts`,
    );
  }

  createCounter(payload: { branchId: string; serviceId?: string; number: number }): Observable<QueueCounter> {
    return this.http.post<QueueCounter>(this.countersUrl, payload);
  }

  updateCounter(counterId: string, payload: { serviceId?: string | null; number?: number }): Observable<QueueCounter> {
    return this.http.patch<QueueCounter>(`${this.countersUrl}/${encodeURIComponent(counterId)}`, payload);
  }

  claimCounter(counterId: string): Observable<CounterSessionInfo & { counterId: string }> {
    return this.http.post<CounterSessionInfo & { counterId: string }>(
      `${this.countersUrl}/${encodeURIComponent(counterId)}/claim`,
      {},
    );
  }

  heartbeatCounter(counterId: string): Observable<CounterSessionInfo & { counterId: string }> {
    return this.http.patch<CounterSessionInfo & { counterId: string }>(
      `${this.countersUrl}/${encodeURIComponent(counterId)}/heartbeat`,
      {},
    );
  }

  releaseCounter(counterId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.countersUrl}/${encodeURIComponent(counterId)}/claim`,
    );
  }

  getServiceTickets(serviceId: string): Observable<OperationalTicket[]> {
    return this.http.get<OperationalTicket[]>(
      `${this.queuesUrl}/services/${encodeURIComponent(serviceId)}/tickets`,
    );
  }

  callNext(
    serviceId: string,
    counterId: string,
  ): Observable<QueueTicket> {
    return this.http.post<QueueTicket>(
      `${this.queuesUrl}/services/${encodeURIComponent(serviceId)}/call-next`,
      { counterId },
    );
  }

  recallTicket(
    ticketId: string,
    request: TicketTransitionRequest = {},
  ): Observable<QueueTicket> {
    return this.transitionTicket(ticketId, 'recall', request);
  }

  startTicket(
    ticketId: string,
    request: TicketTransitionRequest = {},
  ): Observable<QueueTicket> {
    return this.transitionTicket(ticketId, 'start', request);
  }

  completeTicket(
    ticketId: string,
    request: TicketTransitionRequest = {},
  ): Observable<QueueTicket> {
    return this.transitionTicket(ticketId, 'complete', request);
  }

  skipTicket(
    ticketId: string,
    request: TicketTransitionRequest = {},
  ): Observable<QueueTicket> {
    return this.transitionTicket(ticketId, 'skip', request);
  }

  markNoShow(
    ticketId: string,
    request: TicketTransitionRequest = {},
  ): Observable<QueueTicket> {
    return this.transitionTicket(ticketId, 'no-show', request);
  }

  private transitionTicket(
    ticketId: string,
    action: TicketAction,
    request: TicketTransitionRequest,
  ): Observable<QueueTicket> {
    return this.http.post<QueueTicket>(
      `${this.queuesUrl}/tickets/${encodeURIComponent(ticketId)}/${action}`,
      request,
    );
  }
}
