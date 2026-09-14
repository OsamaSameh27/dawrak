import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { QueueService } from '../models/queue-service.model';

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
}
