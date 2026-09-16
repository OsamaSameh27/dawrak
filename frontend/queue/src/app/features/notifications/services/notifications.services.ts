import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { NotificationItem, NotificationsResponse } from '../models/notification.model';

@Service()
export class NotificationsServices {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/notifications`;

  getNotifications(unreadOnly = false): Observable<NotificationsResponse> {
    return this.http.get<NotificationsResponse>(this.baseUrl, {
      params: unreadOnly ? { unreadOnly: 'true' } : {},
    });
  }
  markRead(id: string): Observable<NotificationItem> {
    return this.http.patch<NotificationItem>(`${this.baseUrl}/${encodeURIComponent(id)}/read`, {});
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.baseUrl}/read-all`, {});
  }
}
