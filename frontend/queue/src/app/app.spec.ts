import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { EMPTY } from 'rxjs';
import { App } from './app';
import { AuthStore } from './features/auth/state/auth-store';
import { NotificationsRealtimeService } from './features/notifications/services/notifications-realtime.service';
import { NotificationsState } from './features/notifications/state/notifications-state';
import { CounterSessionState } from './features/queues/state/counter-session-state';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: AuthStore,
          useValue: {
            initialized: signal(true),
            isAuthenticated: signal(false),
            role: signal(null),
          },
        },
        {
          provide: NotificationsRealtimeService,
          useValue: { notification$: EMPTY, connect: () => {}, disconnect: () => {} },
        },
        { provide: NotificationsState, useValue: { increaseUnreadCount: () => {} } },
        { provide: CounterSessionState, useValue: { resume: () => {}, stop: () => {} } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the route outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});
