import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { AuthSession, AuthUser, LoginRequest, RegisterRequest } from '../models/auth.models';
import { Observable } from 'rxjs';

@Service()
export class AuthServices {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  login(request: LoginRequest): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.baseUrl}/login`, request, { withCredentials: true });
  }
  register(request: RegisterRequest): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.baseUrl}/register`, request);
  }
  refresh(): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.baseUrl}/refresh`, {}, { withCredentials: true });
  }
  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}, { withCredentials: true });
  }
  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.baseUrl}/me`);
  }
}
