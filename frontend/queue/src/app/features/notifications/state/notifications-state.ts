import { Service, signal } from '@angular/core';

@Service()
export class NotificationsState {
  private readonly unreadCountState = signal(0);

  readonly unreadCount = this.unreadCountState.asReadonly();

  setUnreadCount(count: number): void {
    this.unreadCountState.set(Math.max(0, count));
  }

  decreaseUnreadCount(): void {
    this.unreadCountState.update((count) => Math.max(0, count - 1));
  }

  clearUnreadCount(): void {
    this.unreadCountState.set(0);
  }
  
  increaseUnreadCount(): void {
    this.unreadCountState.update((count) => count + 1);
  }
}
