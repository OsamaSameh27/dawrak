export type QueueAvailability = 'available' | 'busy' | 'closed';

export interface QueueStatusViewModel {
  id: string;
  serviceNameKey: string;
  branchNameKey: string;
  waitingCount: number;
  estimatedMinutes: number | null;
  status: QueueAvailability;
  icon: string;
}
