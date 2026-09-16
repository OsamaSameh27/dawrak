import { inject, Service } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../../../environments/environment';
import { NotificationItem } from '../models/notification.model';
import { AuthStore } from '../../auth/state/auth-store';

@Service()
export class NotificationsRealtimeService {
  private readonly authStore = inject(AuthStore);

  private socket: Socket | null = null;
  private readonly notificationSubject = new Subject<NotificationItem>();

  readonly notification$: Observable<NotificationItem> =
    this.notificationSubject.asObservable();

  connect(): void {
    const token = this.authStore.accessToken();

    if (!token || this.socket?.connected) {
      return;
    }

    const socketUrl = environment.production
      ? window.location.origin
      : 'http://localhost:3000';

    this.socket = io(`${socketUrl}/queue`, {
      transports: ['websocket'],
      auth: { token },
    });

    this.socket.on('notification.created', (notification: NotificationItem) => {
      this.notificationSubject.next(notification);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
