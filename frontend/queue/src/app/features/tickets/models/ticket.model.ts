export interface CreateTicketRequest {
  serviceId: string;
  idempotencyKey: string;
  note?: string;
}

export type TicketStatus =
  | 'WAITING'
  | 'CALLED'
  | 'SERVING'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'NO_SHOW'
  | 'CANCELLED';

export interface QueueTicket {
  id: string;
  publicId: string;
  number: string;
  status: TicketStatus;
  serviceId: string;
  createdAt: string;
  calledAt: string | null;
  serviceStartedAt: string | null;
  completedAt: string | null;
  serviceDurationSeconds: number | null;
  cancelledAt: string | null;

  service: {
    name: string;
    nameAr: string;
    nameEn: string;
    averageServiceMinutes: number;
  };

  branch: {
    id: string;
    name: string;
    nameAr: string;
    nameEn: string;
    code: string;
    timezone: string;
  };

  counter: {
    id: string;
    name: string;
    number: number;
  } | null;

  peopleAhead: number;
  estimatedWaitMinutes: number;
}
