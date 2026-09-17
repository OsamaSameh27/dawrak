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
  private readonly countersUpdatedSubject = new Subject<{ branchId: string }>();
  private readonly queueUpdatedSubject = new Subject<{ service: { id: string } }>();
  private readonly queueSubscriptions = new Set<string>();

  readonly notification$: Observable<NotificationItem> =
    this.notificationSubject.asObservable();
  readonly countersUpdated$ = this.countersUpdatedSubject.asObservable();
  readonly queueUpdated$ = this.queueUpdatedSubject.asObservable();

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
    this.socket.on('counters.updated', (event: { branchId: string }) => {
      this.countersUpdatedSubject.next(event);
    });
    this.socket.on('queue.updated', (snapshot: { service: { id: string } }) => {
      this.queueUpdatedSubject.next(snapshot);
    });
    this.socket.on('connect', () => {
      this.queueSubscriptions.forEach((serviceId) => {
        this.socket?.emit('queue.subscribe', { serviceId });
      });
    });
  }

  subscribeQueue(serviceId: string): void {
    this.queueSubscriptions.add(serviceId);
    this.socket?.emit('queue.subscribe', { serviceId });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.queueSubscriptions.clear();
  }
}
