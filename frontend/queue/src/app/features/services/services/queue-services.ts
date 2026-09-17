import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CreateQueueServiceRequest, ManagedQueueService, QueueService, UpdateQueueServiceRequest } from '../models/queue-service.model';

@Service()
export class QueueServices {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/services`;

  getByBranch(branchId: string): Observable<QueueService[]> {
    return this.http.get<QueueService[]>(this.baseUrl, {
      params: {
        branchId,
      },
    });
  }

  getManaged(branchId?: string): Observable<ManagedQueueService[]> {
    return this.http.get<ManagedQueueService[]>(`${this.baseUrl}/management/list`, {
      params: branchId ? { branchId } : {},
    });
  }

  create(payload: CreateQueueServiceRequest): Observable<ManagedQueueService> {
    return this.http.post<ManagedQueueService>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateQueueServiceRequest): Observable<ManagedQueueService> {
    return this.http.patch<ManagedQueueService>(`${this.baseUrl}/${encodeURIComponent(id)}`, payload);
  }
}
