import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const resolvedBaseUrl = (() => {
  if (environment.apiBaseUrl && environment.apiBaseUrl.length) {
    return environment.apiBaseUrl;
  }
  if (typeof window === 'undefined') {
    return 'http://localhost:8080';
  }
  const { protocol, hostname, port } = window.location;
  const apiPort = port && port !== '80' && port !== '443' ? (port === '4173' ? '8080' : port) : '8080';
  return `${protocol}//${hostname}:${apiPort}`;
})();

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly baseUrl = resolvedBaseUrl;

  constructor(private http: HttpClient) {}

  // Auth
  login(phone: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/login`, { phone, password });
  }

  // Hustler applications
  createHustlerApplication(payload: Record<string, unknown>): Observable<HustlerApplication> {
    return this.http.post<HustlerApplication>(`${this.baseUrl}/api/hustlers`, payload);
  }

  listApplications(status = 'PENDING', communityId?: string): Observable<HustlerApplication[]> {
    const params: Record<string, string> = { status };
    if (communityId) params['communityId'] = communityId;
    return this.http.get<HustlerApplication[]>(`${this.baseUrl}/api/hustlers`, { params });
  }

  decideApplication(id: string, payload: { status: string; facilitatorNotes?: string }): Observable<HustlerApplication> {
    return this.http.patch<HustlerApplication>(`${this.baseUrl}/api/hustlers/${id}/decision`, payload);
  }

  updateHustlerProfile(id: string, payload: HustlerProfileUpdate): Observable<HustlerApplication> {
    return this.http.patch<HustlerApplication>(`${this.baseUrl}/api/hustlers/${id}/profile`, payload);
  }

  // Products
  createProduct(payload: ProductRequest, token: string): Observable<ProductResponse> {
    return this.http.post<ProductResponse>(`${this.baseUrl}/api/products`, payload, {
      headers: new HttpHeaders({ 'X-Auth-Token': token })
    });
  }

  listMyProducts(token: string): Observable<ProductResponse[]> {
    return this.http.get<ProductResponse[]>(`${this.baseUrl}/api/products/my`, {
      headers: new HttpHeaders({ 'X-Auth-Token': token })
    });
  }

  updateProduct(id: string, payload: ProductRequest, token: string): Observable<ProductResponse> {
    return this.http.patch<ProductResponse>(`${this.baseUrl}/api/products/${id}`, payload, {
      headers: new HttpHeaders({ 'X-Auth-Token': token })
    });
  }

  deleteProduct(id: string, token: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/products/${id}`, {
      headers: new HttpHeaders({ 'X-Auth-Token': token })
    });
  }

  listProducts(communityId?: string): Observable<ProductResponse[]> {
    return this.http.get<ProductResponse[]>(`${this.baseUrl}/api/products`, {
      params: communityId ? { communityId } : undefined
    });
  }

  // Income
  logIncome(payload: IncomeEntryRequest, token: string): Observable<IncomeEntryResponse> {
    return this.http.post<IncomeEntryResponse>(`${this.baseUrl}/api/income`, payload, {
      headers: new HttpHeaders({ 'X-Auth-Token': token })
    });
  }

  listMyIncome(token: string, from?: string, to?: string): Observable<IncomeEntryResponse[]> {
    const params: Record<string, string> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<IncomeEntryResponse[]>(`${this.baseUrl}/api/income/my`, {
      headers: new HttpHeaders({ 'X-Auth-Token': token }),
      params
    });
  }

  getIncomeSummary(token: string): Observable<IncomeSummary> {
    return this.http.get<IncomeSummary>(`${this.baseUrl}/api/income/summary`, {
      headers: new HttpHeaders({ 'X-Auth-Token': token })
    });
  }

  exportIncomeCsv(token: string, period: 'weekly' | 'monthly'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/api/income/export`, {
      headers: new HttpHeaders({ 'X-Auth-Token': token }),
      params: { period },
      responseType: 'blob'
    });
  }

  // Image upload
  uploadImage(file: File, token: string): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/api/uploads`, form, {
      headers: new HttpHeaders({ 'X-Auth-Token': token })
    });
  }

  // Communities
  listCommunities(): Observable<Community[]> {
    return this.http.get<Community[]>(`${this.baseUrl}/api/communities`);
  }

  listHustlersByCommunity(communityId: string): Observable<BusinessProfile[]> {
    return this.http.get<BusinessProfile[]>(`${this.baseUrl}/api/communities/${communityId}/hustlers`);
  }

  // Facilitator
  listFacilitatorHustlers(): Observable<FacilitatorHustler[]> {
    return this.http.get<FacilitatorHustler[]>(`${this.baseUrl}/api/facilitator/hustlers`);
  }

  setHustlerActive(id: string, active: boolean): Observable<FacilitatorHustler> {
    return this.http.patch<FacilitatorHustler>(`${this.baseUrl}/api/facilitator/hustlers/${id}/active`, { active });
  }
}

export interface AuthResponse {
  token: string;
  businessProfileId: string;
  businessName: string;
  firstName: string;
  lastName: string;
}

export interface HustlerApplication {
  id: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: string;
  description: string;
  targetCustomers: string;
  community?: { id: string; name: string };
  status: string;
  submittedAt: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  vision?: string;
  mission?: string;
  operatingArea?: string;
}

export interface Community {
  id: string;
  name: string;
  region?: string;
  description?: string;
}

export interface BusinessProfile {
  id: string;
  businessName: string;
  businessType: string;
  description: string;
  operatingArea?: string;
  community: Community;
}

export interface ProductRequest {
  name: string;
  description: string;
  price: number;
  mediaUrl?: string;
}

export interface ProductResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  mediaUrl?: string;
  businessId: string;
  businessName: string;
  createdAt: string;
}

// Keep backwards compat alias
export type Product = ProductResponse;

export interface IncomeEntryRequest {
  date: string;
  amount: number;
  channel: 'CASH' | 'MARKETPLACE';
  entryType: 'INCOME' | 'EXPENSE';
  notes?: string;
}

export interface IncomeEntryResponse {
  id: string;
  date: string;
  amount: number;
  channel: string;
  entryType: string;
  notes?: string;
  createdAt: string;
}

export interface HustlerProfileUpdate {
  description?: string;
  targetCustomers?: string;
  vision?: string;
  mission?: string;
  operatingArea?: string;
  communityId?: string;
}

export interface FacilitatorHustler {
  businessProfileId: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: string;
  communityName?: string;
  operatingArea?: string;
  description?: string;
  targetCustomers?: string;
  vision?: string;
  mission?: string;
  monthIncome: number;
  monthExpenses: number;
  monthProfit: number;
  active: boolean;
}

export interface IncomeSummary {
  todayIncome: number;
  todayExpenses: number;
  todayProfit: number;
  weekIncome: number;
  weekExpenses: number;
  weekProfit: number;
  monthIncome: number;
  monthExpenses: number;
  monthProfit: number;
}
