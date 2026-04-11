import { Injectable, signal, computed } from '@angular/core';

export interface DriverAuthState {
  token: string;
  driverId: string;
  firstName: string;
  lastName: string;
  vehicleType: string;
  communityName: string;
}

const DRIVER_AUTH_KEY = 'hustle_driver_auth';

@Injectable({ providedIn: 'root' })
export class DriverAuthService {
  private readonly _state = signal<DriverAuthState | null>(this.load());

  readonly isLoggedIn = computed(() => this._state() !== null);
  readonly state = this._state.asReadonly();

  login(state: DriverAuthState): void {
    localStorage.setItem(DRIVER_AUTH_KEY, JSON.stringify(state));
    this._state.set(state);
  }

  logout(): void {
    localStorage.removeItem(DRIVER_AUTH_KEY);
    this._state.set(null);
  }

  getToken(): string | null {
    return this._state()?.token ?? null;
  }

  getDriverId(): string | null {
    return this._state()?.driverId ?? null;
  }

  private load(): DriverAuthState | null {
    try {
      const raw = localStorage.getItem(DRIVER_AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
