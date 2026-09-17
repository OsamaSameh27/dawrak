import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize, timeout } from 'rxjs';

import { NotificationItem, NotificationsResponse } from '../../models/notification.model';
import { NotificationsServices } from '../../services/notifications.services';
import { NotificationsState } from '../../state/notifications-state';

@Component({
  selector: 'app-notifications-page',
  imports: [DatePipe, TranslatePipe],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
})
export class NotificationsPage {
  private readonly notificationsServices = inject(NotificationsServices);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationsState = inject(NotificationsState);
  private readonly translate = inject(TranslateService);

  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly unreadCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly markingAll = signal(false);
  protected readonly markingId = signal<string | null>(null);
  protected readonly errorKey = signal<string | null>(null);
  protected readonly actionErrorKey = signal<string | null>(null);

  protected notificationParams(notification: NotificationItem): Record<string, string> {
    const data = notification.data ?? {};
    const params: Record<string, string> = {};

    if (data.ticketNumber) params['ticketNumber'] = data.ticketNumber;
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

  ngOnInit(): void {
    this.loadNotifications();
  }

  protected loadNotifications(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorKey.set(null);
    this.actionErrorKey.set(null);

    this.notificationsServices
      .getNotifications()
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response: NotificationsResponse) => {
          this.notifications.set(response.items);
          this.unreadCount.set(response.unreadCount);
          this.notificationsState.setUnreadCount(response.unreadCount);
        },
        error: (error: unknown) => {
          this.errorKey.set(
            error instanceof HttpErrorResponse && error.status === 401
              ? 'notificationsPage.loginRequired'
              : 'notificationsPage.loadFailed',
          );
        },
      });
  }

  protected markRead(notification: NotificationItem): void {
    if (notification.readAt || this.markingId()) {
      return;
    }

    this.markingId.set(notification.id);
    this.actionErrorKey.set(null);

    this.notificationsServices
      .markRead(notification.id)
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.markingId.set(null)),
      )
      .subscribe({
        next: (updated) => {
          this.notifications.update((items) =>
            items.map((item) =>
              item.id === notification.id
                ? { ...item, readAt: updated.readAt ?? new Date().toISOString() }
                : item,
            ),
          );

          this.unreadCount.update((count) => Math.max(0, count - 1));
          this.notificationsState.decreaseUnreadCount();
        },
        error: () => {
          this.actionErrorKey.set('notificationsPage.actionFailed');
        },
      });
  }

  protected markAllRead(): void {
    if (this.markingAll() || this.unreadCount() === 0) {
      return;
    }

    this.markingAll.set(true);
    this.actionErrorKey.set(null);

    this.notificationsServices
      .markAllRead()
      .pipe(
        timeout(10000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.markingAll.set(false)),
      )
      .subscribe({
        next: () => {
          const readAt = new Date().toISOString();

          this.notifications.update((items) => items.map((item) => ({ ...item, readAt })));

          this.unreadCount.set(0);
          this.notificationsState.clearUnreadCount();
        },
        error: () => {
          this.actionErrorKey.set('notificationsPage.actionFailed');
        },
      });
  }
}
