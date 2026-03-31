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

  listApplications(status = 'PENDING'): Observable<HustlerApplication[]> {
    return this.http.get<HustlerApplication[]>(`${this.baseUrl}/api/hustlers`, { params: { status } });
  }

  decideApplication(id: string, payload: { status: string; facilitatorNotes?: string }): Observable<HustlerApplication> {
    return this.http.patch<HustlerApplication>(`${this.baseUrl}/api/hustlers/${id}/decision`, payload);
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
