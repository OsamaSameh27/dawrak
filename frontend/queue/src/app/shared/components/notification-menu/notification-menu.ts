import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { timeout } from 'rxjs';

import { NotificationItem } from '../../../features/notifications/models/notification.model';
import { NotificationsRealtimeService } from '../../../features/notifications/services/notifications-realtime.service';
import { NotificationsServices } from '../../../features/notifications/services/notifications.services';
import { NotificationsState } from '../../../features/notifications/state/notifications-state';

@Component({
  selector: 'app-notification-menu',
  imports: [DatePipe, RouterLink, TranslatePipe],
  templateUrl: './notification-menu.html',
  styleUrl: './notification-menu.scss',
})
export class NotificationMenu {
  private readonly service = inject(NotificationsServices);
  private readonly state = inject(NotificationsState);
  private readonly realtime = inject(NotificationsRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  protected readonly unreadCount = this.state.unreadCount;
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly open = signal(false);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    this.load();
    this.realtime.notification$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notification) =>
        this.notifications.update((items) =>
          [notification, ...items.filter((item) => item.id !== notification.id)].slice(0, 4),
        ),
      );
  }

  protected toggle(): void {
    this.open.update((value) => !value);
    if (this.open()) this.load();
  }

  protected close(): void {
    this.open.set(false);
  }

  protected params(notification: NotificationItem): Record<string, string> {
    const data = notification.data ?? {};
    return {
      ticketNumber: data.ticketNumber ?? '',
      counterNumber:
        data.counterNumber !== undefined
          ? String(data.counterNumber)
          : data.counterName?.replace(/\D+/g, '') || '',
      status: data.status
        ? this.translate.instant(`notifications.status.${data.status.toLowerCase()}`)
        : '',
      branchCode: data.branchCode ?? '',
      staffName: data.staffName ?? '',
      managerName: data.managerName ?? '',
    };
  }

  private load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.service
      .getNotifications()
      .pipe(timeout(10000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.notifications.set(response.items.slice(0, 4));
          this.state.setUnreadCount(response.unreadCount);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
