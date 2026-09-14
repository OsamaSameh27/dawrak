export interface QueueService {
  id: string;
  branchId: string;
  name: string;
  prefix: string;
  description: string | null;
  averageServiceMinutes: number;
  nearTurnThreshold: number;
  _count: {
    counters: number;
  };
}
