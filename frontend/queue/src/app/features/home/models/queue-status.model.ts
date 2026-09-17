export type QueueAvailability = 'available' | 'busy' | 'closed';

export interface QueueStatusViewModel {
  id: string;
  serviceNameAr: string;
  serviceNameEn: string;
  branchNameAr: string;
  branchNameEn: string;
  waitingCount: number;
  estimatedMinutes: number | null;
  status: QueueAvailability;
  icon: string;
}

export interface HomeQueueOverview {
  id: string; name: string; nameAr: string; nameEn: string; prefix: string;
  branch: { id: string; name: string; nameAr: string; nameEn: string; code: string };
  waitingCount: number; openCounters: number; estimatedMinutes: number | null; nowServing: string | null;
}
