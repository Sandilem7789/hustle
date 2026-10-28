import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { UnifiedAuthService } from '../services/unified-auth.service';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const unifiedAuth = inject(UnifiedAuthService);
  const router = inject(Router);
  // Prefer unified auth token; fall back to legacy hustler auth token
  const token = unifiedAuth.getToken() ?? inject(AuthService).getToken();
  if (!token) return next(req);
  return next(req.clone({ headers: req.headers.set('X-Auth-Token', token) })).pipe(
    catchError((err: unknown) => {
      // The server no longer accepts this sign-in (expired or ended): sign out here too.
      // Buyer and driver requests carry their own token, so their 401s are left alone.
      const usesAppToken = !req.headers.has('X-Customer-Token') && !req.headers.has('X-Driver-Token');
      if (err instanceof HttpErrorResponse && err.status === 401 && usesAppToken && !req.url.includes('/api/auth/')) {
        unifiedAuth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
