import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { QueueReport } from '../models/report.model';

@Service()
export class ReportsServices {
  private readonly http = inject(HttpClient);
  getOverview(branchId: string, from: string, to: string): Observable<QueueReport> {
    return this.http.get<QueueReport>(`${environment.apiBaseUrl}/reports/overview`, { params: { branchId, from, to } });
  }
}
