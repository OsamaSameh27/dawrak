import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CreateStaffRequest, StaffMember, UpdateStaffRequest } from '../models/staff.model';

@Service()
export class StaffServices {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  getStaff(branchId?: string): Observable<StaffMember[]> {
    const options = branchId
      ? { params: new HttpParams().set('branchId', branchId) }
      : undefined;

    return this.http.get<StaffMember[]>(this.baseUrl, options);
  }

  createStaff(payload: CreateStaffRequest): Observable<StaffMember> {
    return this.http.post<StaffMember>(`${this.baseUrl}/staff`, payload);
  }

  updateStaff(id: string, payload: UpdateStaffRequest): Observable<StaffMember> {
    return this.http.patch<StaffMember>(`${this.baseUrl}/${id}`, payload);
  }
}
