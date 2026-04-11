import { Injectable, signal, computed } from '@angular/core';

export interface CustomerAuthState {
  token: string;
  customerId: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const CUSTOMER_AUTH_KEY = 'hustle_customer_auth';

@Injectable({ providedIn: 'root' })
export class CustomerAuthService {
  private readonly _state = signal<CustomerAuthState | null>(this.load());

  readonly isLoggedIn = computed(() => this._state() !== null);
  readonly state = this._state.asReadonly();

  login(state: CustomerAuthState): void {
    localStorage.setItem(CUSTOMER_AUTH_KEY, JSON.stringify(state));
    this._state.set(state);
  }

  logout(): void {
    localStorage.removeItem(CUSTOMER_AUTH_KEY);
    this._state.set(null);
  }

  getToken(): string | null {
    return this._state()?.token ?? null;
  }

  getCustomerId(): string | null {
    return this._state()?.customerId ?? null;
  }

  private load(): CustomerAuthState | null {
    try {
      const raw = localStorage.getItem(CUSTOMER_AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
