import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { UnifiedAuthService } from '../services/unified-auth.service';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Prefer unified auth token; fall back to legacy hustler auth token
  const token = inject(UnifiedAuthService).getToken()
             ?? inject(AuthService).getToken();
  if (!token) return next(req);
  return next(req.clone({ headers: req.headers.set('X-Auth-Token', token) }));
};
