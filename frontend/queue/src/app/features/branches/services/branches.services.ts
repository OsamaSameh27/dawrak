import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Branch,
  CreateBranchRequest,
  ManagedBranch,
  UpdateBranchRequest,
} from '../models/branch.model';

@Service()
export class BranchesServices {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/branches`;

  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.baseUrl);
  }

  getManagedBranches(): Observable<ManagedBranch[]> {
    return this.http.get<ManagedBranch[]>(`${this.baseUrl}/management`);
  }

  createBranch(payload: CreateBranchRequest): Observable<ManagedBranch> {
    return this.http.post<ManagedBranch>(this.baseUrl, payload);
  }

  updateBranch(id: string, payload: UpdateBranchRequest): Observable<ManagedBranch> {
    return this.http.patch<ManagedBranch>(
      `${this.baseUrl}/${encodeURIComponent(id)}`,
      payload,
    );
  }
}
