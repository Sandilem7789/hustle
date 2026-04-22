import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const hustlerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const state = auth.state();
  if (state && state.role === 'HUSTLER') return true;
  router.navigate(['/register']);
  return false;
};
