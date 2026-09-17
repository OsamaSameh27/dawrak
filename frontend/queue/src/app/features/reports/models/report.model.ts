export interface QueueReport {
  range: { from: string; to: string };
  branch: { id: string; name: string; nameAr: string; nameEn: string; code: string };
  metrics: { totalTickets: number; completedTickets: number; cancelledTickets: number; noShowTickets: number; averageWaitMinutes: number; averageServiceMinutes: number };
  byStatus: Record<string, number>;
  byService: Array<{ id: string; name: string; nameAr: string; nameEn: string; totalTickets: number; completedTickets: number; averageWaitMinutes: number; averageServiceMinutes: number }>;
  hourlyLoad: Array<{ hour: number; tickets: number }>;
}
