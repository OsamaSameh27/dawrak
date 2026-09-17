export interface QueueService {
  id: string;
  branchId: string;
  name: string;
  nameAr: string;
  nameEn: string;
  prefix: string;
  description: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  averageServiceMinutes: number;
  nearTurnThreshold: number;
  _count: {
    counters: number;
  };
}

export interface ManagedQueueService extends Omit<QueueService, '_count'> {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch: { id: string; name: string; nameAr: string; nameEn: string; code: string };
  _count: { counters: number; tickets: number };
}

export interface CreateQueueServiceRequest {
  branchId: string; nameAr: string; nameEn: string; prefix: string;
  descriptionAr?: string; descriptionEn?: string;
  averageServiceMinutes: number; nearTurnThreshold: number;
}

export type UpdateQueueServiceRequest = Partial<Omit<CreateQueueServiceRequest, 'branchId' | 'prefix'>> & { isActive?: boolean };
