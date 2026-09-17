import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { QueueTicket, TicketStatus } from '../../models/ticket.model';
import { TicketsServices } from '../../services/tickets.services';
import { CurrentTicketsPage } from './current-tickets-page';

function makeTicket(status: TicketStatus): QueueTicket {
  return {
    id: status,
    publicId: status,
    number: `TEST-${status}`,
    status,
    serviceId: 'service',
    createdAt: '2026-09-17T10:00:00.000Z',
    calledAt: null,
    serviceStartedAt: null,
    completedAt: null,
    serviceDurationSeconds: null,
    cancelledAt: null,
    service: {
      name: 'Service name',
      nameAr: 'اسم الخدمة',
      nameEn: 'Service name',
      averageServiceMinutes: 10,
    },
    branch: {
      id: 'branch',
      name: 'Branch name',
      nameAr: 'اسم الفرع',
      nameEn: 'Branch name',
      code: 'BR',
      timezone: 'Africa/Cairo',
    },
    counter:
      status === 'CALLED' ? { id: 'counter', name: 'Counter one', number: 1 } : null,
    peopleAhead: 2,
    estimatedWaitMinutes: 20,
  };
}

describe('CurrentTicketsPage', () => {
  let fixture: ComponentFixture<CurrentTicketsPage>;
  let requests: Subject<QueueTicket[]>[];
  let getMyActiveTickets: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    requests = [];
    getMyActiveTickets = vi.fn(() => {
      const request = new Subject<QueueTicket[]>();
      requests.push(request);
      return request.asObservable();
    });
    await TestBed.configureTestingModule({
      imports: [CurrentTicketsPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: TicketsServices, useValue: { getMyActiveTickets } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CurrentTicketsPage);
    await fixture.whenStable();
  });

  it('loads once without requesting an identifier and shows loading', () => {
    expect(getMyActiveTickets).toHaveBeenCalledExactlyOnceWith();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.refresh-button').disabled).toBe(true);
  });

  it('shows an empty state and booking link', () => {
    requests[0].next([]);
    requests[0].complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/booking"]')).not.toBeNull();
  });

  it('only displays active tickets and shows waiting details only for WAITING', () => {
    requests[0].next(
      ['WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'CANCELLED', 'SKIPPED', 'NO_SHOW'].map(
        (status) => makeTicket(status as TicketStatus),
      ),
    );
    requests[0].complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.ticket-card').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.ticket-wait').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('common.counterNumber');
    expect(fixture.nativeElement.textContent).not.toContain('TEST-COMPLETED');
  });

  it('allows retry after a failed request', () => {
    requests[0].error(new HttpErrorResponse({ status: 500 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'currentTickets.loadFailed',
    );
    fixture.nativeElement.querySelector('.state-card button').click();
    fixture.detectChanges();
    expect(getMyActiveTickets).toHaveBeenCalledTimes(2);
  });

  it('offers login when the session is missing', () => {
    requests[0].error(new HttpErrorResponse({ status: 401 }));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('a[href="/login?returnUrl=%2Fmy-tickets"]'),
    ).not.toBeNull();
  });

  it('removes tickets that are finished on the next refresh', () => {
    requests[0].next([makeTicket('WAITING')]);
    requests[0].complete();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.refresh-button').click();
    fixture.detectChanges();
    requests[1].next([]);
    requests[1].complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ticket-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
  });
});
