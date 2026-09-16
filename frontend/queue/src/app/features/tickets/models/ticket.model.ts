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

  service: {
    name: string;
    averageServiceMinutes: number;
  };

  branch: {
    id: string;
    name: string;
    code: string;
    timezone: string;
  };

  counter: {
    id: string;
    name: string;
  } | null;

  peopleAhead: number;
  estimatedWaitMinutes: number;
}
