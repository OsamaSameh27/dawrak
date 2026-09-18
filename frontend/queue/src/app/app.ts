import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subscription, timer } from 'rxjs';
import { catchError, exhaustMap } from 'rxjs/operators';

import { NotificationItem } from './features/notifications/models/notification.model';
import { NotificationsRealtimeService } from './features/notifications/services/notifications-realtime.service';
import { NotificationsServices } from './features/notifications/services/notifications.services';
import { NotificationsState } from './features/notifications/state/notifications-state';
import { AuthStore } from './features/auth/state/auth-store';
import { CounterSessionState } from './features/queues/state/counter-session-state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly authStore = inject(AuthStore);
  private readonly realtime = inject(NotificationsRealtimeService);
  private readonly notificationsService = inject(NotificationsServices);
  private readonly notificationsState = inject(NotificationsState);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly counterSessionState = inject(CounterSessionState);

  protected readonly toastNotification = signal<NotificationItem | null>(null);
  protected readonly toastClosing = signal(false);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private toastCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private notificationPollSubscription: Subscription | null = null;
  private readonly seenNotificationIds = new Set<string>();
  private notificationBaselineLoaded = false;

  private readonly authConnectionEffect = effect(() => {
    if (!this.authStore.initialized()) {
      return;
    }

    if (this.authStore.isAuthenticated()) {
      this.realtime.connect();
      this.startNotificationPolling();
      const role = this.authStore.role();
      if (role === 'STAFF' || role === 'MANAGER' || role === 'ADMIN') {
        this.counterSessionState.resume();
      }
    } else {
      this.realtime.disconnect();
      this.stopNotificationPolling();
      this.counterSessionState.stop();
    }
  });

  constructor() {
    this.realtime.notification$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) => {
        this.seenNotificationIds.add(notification.id);
        this.notificationsState.increaseUnreadCount();
        this.displayNotification(notification);
      });
  }

  private startNotificationPolling(): void {
    if (this.notificationPollSubscription) {
      return;
    }

    this.notificationPollSubscription = timer(0, 15000)
      .pipe(
        exhaustMap(() =>
          this.notificationsService.getNotifications(true).pipe(catchError(() => EMPTY)),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.notificationsState.setUnreadCount(response.unreadCount);

        if (!this.notificationBaselineLoaded) {
          response.items.forEach((notification) =>
            this.seenNotificationIds.add(notification.id),
          );
          this.notificationBaselineLoaded = true;
          return;
        }

        const newNotifications = response.items.filter(
          (notification) => !this.seenNotificationIds.has(notification.id),
        );
        response.items.forEach((notification) =>
          this.seenNotificationIds.add(notification.id),
        );

        if (newNotifications.length > 0) {
          this.displayNotification(newNotifications[0]);
        }
      });
  }

  private stopNotificationPolling(): void {
    this.notificationPollSubscription?.unsubscribe();
    this.notificationPollSubscription = null;
    this.notificationBaselineLoaded = false;
    this.seenNotificationIds.clear();
    this.notificationsState.setUnreadCount(0);
  }

  private displayNotification(notification: NotificationItem): void {
    if (this.toastCloseTimer) {
      clearTimeout(this.toastCloseTimer);
      this.toastCloseTimer = null;
    }

    this.toastClosing.set(false);
    this.toastNotification.set(notification);

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toastTimer = setTimeout(() => {
      this.beginToastClose();
    }, 7000);
  }

  protected dismissToast(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }

    this.beginToastClose();
  }

  private beginToastClose(): void {
    if (!this.toastNotification() || this.toastClosing()) {
      return;
    }

    this.toastClosing.set(true);

    if (this.toastCloseTimer) {
      clearTimeout(this.toastCloseTimer);
    }

    this.toastCloseTimer = setTimeout(() => {
      this.toastNotification.set(null);
      this.toastClosing.set(false);
      this.toastCloseTimer = null;
    }, 220);
  }

  protected notificationParams(notification: NotificationItem): Record<string, string> {
    const data = notification.data ?? {};
    const params: Record<string, string> = {};

    if (data.ticketNumber) {
      params['ticketNumber'] = data.ticketNumber;
    }

    if (data.counterName) {
      params['counterName'] = data.counterName;
      params['counterNumber'] = data.counterName.replace(/\D+/g, '') || data.counterName;
    }

    if (data.counterNumber !== undefined) {
      params['counterNumber'] = String(data.counterNumber);
    }

    if (data.status) {
      params['status'] = this.translate.instant(
        `notifications.status.${data.status.toLowerCase()}`,
      );
    }

    if (data.branchCode) params['branchCode'] = data.branchCode;
    if (data.staffName) params['staffName'] = data.staffName;
    if (data.managerName) params['managerName'] = data.managerName;

    return params;
  }
}
