import { Injectable, signal, computed } from '@angular/core';

export interface AuthState {
  token: string;
  businessProfileId: string;
  businessName: string;
  firstName: string;
  lastName: string;
  businessType?: string;
  role?: string;
}

const AUTH_KEY = 'hustle_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _state = signal<AuthState | null>(this.load());

  readonly isLoggedIn = computed(() => this._state() !== null);
  readonly state = this._state.asReadonly();

  login(auth: AuthState): void {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    this._state.set(auth);
  }

  logout(): void {
    localStorage.removeItem(AUTH_KEY);
    this._state.set(null);
  }

  getToken(): string | null {
    return this._state()?.token ?? null;
  }

  getBusinessProfileId(): string | null {
    return this._state()?.businessProfileId ?? null;
  }

  private load(): AuthState | null {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
