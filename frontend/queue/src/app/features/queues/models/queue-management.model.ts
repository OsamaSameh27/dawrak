import { TicketStatus } from '../../tickets/models/ticket.model';

export type CounterStatus = 'OPEN' | 'PAUSED' | 'CLOSED';

export interface CounterServiceSummary {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  prefix: string;
}

export interface CounterActiveTicket {
  id: string;
  publicId: string;
  number: string;
  status: TicketStatus;
  customerName: string;
  calledAt: string | null;
  serviceStartedAt: string | null;
}

export interface CounterSessionInfo {
  staff: {
    id: string;
    fullName: string;
  };
  startedAt: string;
  lastSeenAt: string;
  claimedByMe: boolean;
  shiftId: string;
  openedAt: string | null;
  servedCount: number;
}

export interface CounterShiftTicket {
  id: string;
  number: string;
  customerName: string;
  status: TicketStatus;
  calledAt: string | null;
  serviceStartedAt: string | null;
  completedAt: string | null;
  serviceDurationSeconds: number | null;
  service: { id: string; name: string; nameAr: string; nameEn: string };
}

export interface CounterShiftHistory {
  id: string;
  startedAt: string;
  openedAt: string | null;
  endedAt: string | null;
  staff: { id: string; fullName: string };
  tickets: CounterShiftTicket[];
}

export interface QueueCounter {
  id: string;
  branchId: string;
  serviceId: string | null;
  name: string;
  number: number;
  status: CounterStatus;
  createdAt: string;
  updatedAt: string;

  service: CounterServiceSummary | null;
  tickets: CounterActiveTicket[];
  session: CounterSessionInfo | null;
}

export interface CounterStatusResponse {
  id: string;
  branchId: string;
  serviceId: string | null;
  name: string;
  number: number;
  status: CounterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalTicket {
  id: string;
  publicId: string;
  number: string;
  customerName: string;
  customerPhone: string | null;
  status: TicketStatus;
  priority: number;
  createdAt: string;
  calledAt: string | null;
  serviceStartedAt: string | null;

  counter: {
    id: string;
    name: string;
    number: number;
  } | null;
}

export interface TicketTransitionRequest {
  note?: string;
}
