import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { vi } from 'vitest';

import { QueueTicket } from '../../models/ticket.model';
import { TicketsServices } from '../../services/tickets.services';
import { TrackTicketPage } from './track-ticket-page';

const publicId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const ticket: QueueTicket = {
  id: 'ticket-id', publicId, number: 'TEST-019', status: 'WAITING', serviceId: 'service-id',
  createdAt: '2026-09-17T10:00:00.000Z', calledAt: null, serviceStartedAt: null,
  completedAt: null, serviceDurationSeconds: null, cancelledAt: null,
  service: {
    name: 'Test service',
    nameAr: 'خدمة اختبار',
    nameEn: 'Test service',
    averageServiceMinutes: 5,
  },
  branch: {
    id: 'branch-id',
    name: 'Test branch',
    nameAr: 'فرع اختبار',
    nameEn: 'Test branch',
    code: 'TEST',
    timezone: 'Africa/Cairo',
  },
  counter: null, peopleAhead: 7, estimatedWaitMinutes: 35,
};

describe('TrackTicketPage', () => {
  let fixture: ComponentFixture<TrackTicketPage>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let requests: Subject<QueueTicket>[];
  let getTicket: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({}));
    requests = [];
    getTicket = vi.fn(() => {
      const request = new Subject<QueueTicket>();
      requests.push(request);
      return request.asObservable();
    });
    await TestBed.configureTestingModule({
      imports: [TrackTicketPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
        { provide: TicketsServices, useValue: { getTicket } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TrackTicketPage);
    await fixture.whenStable();
  });

  function submit(value: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#publicId');
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('loads a query identifier and renders the real ticket', () => {
    params.next(convertToParamMap({ publicId }));
    fixture.detectChanges();
    expect(getTicket).toHaveBeenCalledWith(publicId);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('#publicId').readOnly).toBe(true);
    requests[0].next(ticket);
    requests[0].complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe(ticket.number);
    expect(fixture.nativeElement.querySelector('.queue-position strong').textContent).toBe('7');
    expect(fixture.nativeElement.textContent).toContain('فرع اختبار');
    expect(fixture.nativeElement.textContent).toContain('خدمة اختبار');
    expect(fixture.nativeElement.querySelector('.queue-progress')).toBeNull();
  });

  it('rejects a display number without calling the backend', () => {
    submit('G-024');
    expect(getTicket).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#publicIdError')).not.toBeNull();
  });

  it('trims manual input and prevents duplicate submissions while loading', () => {
    submit(`  ${publicId}  `);
    submit(publicId);
    expect(getTicket).toHaveBeenCalledExactlyOnceWith(publicId);
  });

  it.each([
    [404, 'track.errors.notFound'],
    [0, 'track.errors.loadFailed'],
  ])('shows the appropriate error for status %s and allows retry', (status, key) => {
    submit(publicId);
    requests[0].error(new HttpErrorResponse({ status }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.alert').textContent).toContain(key);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    submit(publicId);
    expect(getTicket).toHaveBeenCalledTimes(2);
  });

  it('ignores an old response when the query identifier changes', () => {
    params.next(convertToParamMap({ publicId }));
    params.next(convertToParamMap({ publicId: otherId }));
    requests[0].next(ticket);
    requests[1].next({ ...ticket, publicId: otherId, number: 'TEST-020' });
    requests[1].complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('TEST-020');
  });

  it('does not show waiting estimates for a cancelled ticket', () => {
    submit(publicId);
    requests[0].next({ ...ticket, status: 'CANCELLED' });
    requests[0].complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-badge').textContent).toContain('track.result.status.cancelled');
    expect(fixture.nativeElement.querySelector('.queue-position')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ticket-metrics')).toBeNull();
  });
});
