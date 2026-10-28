import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

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
  private readonly http = inject(HttpClient);
  private readonly _state = signal<DriverAuthState | null>(this.load());

  readonly isLoggedIn = computed(() => this._state() !== null);
  readonly state = this._state.asReadonly();

  login(state: DriverAuthState): void {
    localStorage.setItem(DRIVER_AUTH_KEY, JSON.stringify(state));
    this._state.set(state);
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      // Best effort, so signing out still works offline
      this.http.post(`${environment.apiBaseUrl}/api/drivers/logout`, null, { headers: { 'X-Driver-Token': token } })
        .subscribe({ error: () => {} });
    }
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
