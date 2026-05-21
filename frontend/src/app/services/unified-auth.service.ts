import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { CustomerAuthService } from './customer-auth.service';

export interface UnifiedUser {
  token: string;
  customerToken: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  roles: string[];
  // Hustler-specific
  businessProfileId?: string | null;
  businessName?: string | null;
  businessType?: string | null;
  // "PENDING" when the user has a hustler application awaiting approval
  applicationStatus?: string | null;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

const STORAGE_KEY = 'hustle_unified_auth';
const API = '/api/auth';

@Injectable({ providedIn: 'root' })
export class UnifiedAuthService {
  private readonly http         = inject(HttpClient);
  private readonly legacyAuth   = inject(AuthService);
  private readonly customerAuth = inject(CustomerAuthService);

  private readonly _user = signal<UnifiedUser | null>(this.load());

  readonly user       = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  readonly isCustomer    = computed(() => this.hasRole('CUSTOMER'));
  readonly isHustler     = computed(() => this.hasRole('HUSTLER'));
  readonly isFacilitator = computed(() => this.hasRole('FACILITATOR'));
  readonly isCoordinator = computed(() => this.hasRole('COORDINATOR'));
  readonly isDriver      = computed(() => this.hasRole('DRIVER'));
  readonly isStaff       = computed(() => this.isFacilitator() || this.isCoordinator());

  // True for any user who has an approved business profile (hustler, facilitator, coordinator)
  readonly hasStore      = computed(() => !!this._user()?.businessProfileId);

  // True when the user has submitted a hustler application that is awaiting approval
  readonly hasPendingApplication = computed(() => this._user()?.applicationStatus === 'PENDING');

  readonly displayName = computed(() => {
    const u = this._user();
    return u ? `${u.firstName} ${u.lastName}` : null;
  });

  hasRole(role: string): boolean {
    return this._user()?.roles.includes(role) ?? false;
  }

  getToken(): string | null {
    return this._user()?.token ?? null;
  }

  getCustomerToken(): string | null {
    return this._user()?.customerToken ?? null;
  }

  async register(req: RegisterRequest): Promise<UnifiedUser> {
    const user = await firstValueFrom(
      this.http.post<UnifiedUser>(`${API}/register`, req)
    );
    this.persist(user);
    return user;
  }

  async login(req: LoginRequest): Promise<UnifiedUser> {
    const user = await firstValueFrom(
      this.http.post<UnifiedUser>(`${API}/login`, req)
    );
    this.persist(user);
    return user;
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._user.set(null);
    this.legacyAuth.logout();
    this.customerAuth.logout();
  }

  private persist(user: UnifiedUser): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this._user.set(user);
    this.bridgeLegacyServices(user);
  }

  /**
   * Populates legacy AuthService / CustomerAuthService so existing dashboard
   * components work without modification after unified login.
   */
  private bridgeLegacyServices(user: UnifiedUser): void {
    // Bridge the hustler/staff auth for the hustler dashboard and facilitator pages
    if (user.businessProfileId) {
      const legacyRole = user.roles.find(r =>
        r === 'FACILITATOR' || r === 'COORDINATOR'
      ) ?? 'HUSTLER';

      this.legacyAuth.login({
        token:             user.token,
        businessProfileId: user.businessProfileId,
        businessName:      user.businessName  ?? '',
        firstName:         user.firstName,
        lastName:          user.lastName,
        businessType:      user.businessType  ?? undefined,
        role:              legacyRole,
      });
    }

    // Bridge the customer auth for checkout / orders pages
    if (user.customerToken) {
      this.customerAuth.login({
        token:      user.customerToken,
        customerId: user.userId,
        firstName:  user.firstName,
        lastName:   user.lastName,
        phone:      user.phone,
      });
    }
  }

  private load(): UnifiedUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const user: UnifiedUser = JSON.parse(raw);
      // Restore legacy service state on page reload
      this.bridgeLegacyServices(user);
      return user;
    } catch {
      return null;
    }
  }
}
