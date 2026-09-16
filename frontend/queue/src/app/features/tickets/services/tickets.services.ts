import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CreateTicketRequest, QueueTicket } from '../models/ticket.model';

@Service()
export class TicketsServices {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiBaseUrl}/queues`;

  createTicket(data: CreateTicketRequest): Observable<QueueTicket> {
    return this.http.post<QueueTicket>(`${this.baseUrl}/tickets`, data);
  }

  getTicket(publicId: string): Observable<QueueTicket> {
    return this.http.get<QueueTicket>(
      `${this.baseUrl}/public/tickets/${encodeURIComponent(publicId)}`,
    );
  }

  getMyActiveTickets(): Observable<QueueTicket[]> {
    return this.http.get<QueueTicket[]>(`${this.baseUrl}/tickets/mine/active`);
  }

  getMyTickets(): Observable<QueueTicket[]> {
    return this.http.get<QueueTicket[]>(`${this.baseUrl}/tickets/mine`);
  }

  cancelMyTicket(ticketId: string): Observable<QueueTicket> {
  return this.http.post<QueueTicket>(
    `${this.baseUrl}/tickets/${encodeURIComponent(ticketId)}/cancel`,
    {},
  );
}
}
