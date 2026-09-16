export type NotificationType =
  | 'TICKET_CREATED'
  | 'QUEUE_NEAR'
  | 'TICKET_CALLED'
  | 'TICKET_UPDATED';

export interface NotificationData {
  ticketNumber?: string;
  counterName?: string;
  status?: string;
}

export interface NotificationItem {
  id: string;
  userId: string | null;
  ticketId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
}
