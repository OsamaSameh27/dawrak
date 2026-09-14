import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { DOCUMENT, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthRefresh } from '../../services/auth-refresh';
import { AuthStore } from '../state/auth-store';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authStore = inject(AuthStore);
  const authRefresh = inject(AuthRefresh);
  const router = inject(Router);
  const document = inject(DOCUMENT);

  const apiUrl = new URL(environment.apiBaseUrl, document.baseURI);
  const requestUrl = new URL(request.url, document.baseURI);
  const apiPath = apiUrl.pathname.replace(/\/$/, '');

  const isApiRequest =
    requestUrl.origin === apiUrl.origin &&
    (
      requestUrl.pathname === apiPath ||
      requestUrl.pathname.startsWith(`${apiPath}/`)
    );

  const excludedPaths = [
    `${apiPath}/auth/login`,
    `${apiPath}/auth/register`,
    `${apiPath}/auth/refresh`,
  ];

  const isExcluded = excludedPaths.includes(requestUrl.pathname);
  const accessToken = authStore.accessToken();

  if (!isApiRequest || isExcluded || !accessToken) {
    return next(request);
  }

  const withToken = (token: string) =>
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

  return next(withToken(accessToken)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      const currentToken = authStore.accessToken();

      if (!currentToken) {
        return throwError(() => error);
      }

      if (currentToken !== accessToken) {
        return next(withToken(currentToken));
      }

      return authRefresh.refreshSession().pipe(
        catchError((refreshError: unknown) => {
          if (
            refreshError instanceof HttpErrorResponse &&
            refreshError.status === 401 &&
            authStore.isAuthenticated()
          ) {
            authStore.clearSession();

            void router.navigateByUrl('/login', {
              replaceUrl: true,
            });
          }

          return throwError(() => refreshError);
        }),

        switchMap((session) =>
          next(withToken(session.accessToken)),
        ),
      );
    }),
  );
};
