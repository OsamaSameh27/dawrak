import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Branch } from '../models/branch.model';

@Service()
export class BranchesServices {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/branches`;

  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.baseUrl);
  }
}
