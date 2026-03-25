import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  private readonly baseUrl = resolvedBaseUrl;

  constructor(private http: HttpClient) {}

  createHustlerApplication(payload: Record<string, unknown>): Observable<HustlerApplication> {
    return this.http.post<HustlerApplication>(`${this.baseUrl}/api/hustlers`, payload);
  }

  listApplications(status = 'PENDING'): Observable<HustlerApplication[]> {
    return this.http.get<HustlerApplication[]>(`${this.baseUrl}/api/hustlers`, {
      params: { status }
    });
  }

  decideApplication(id: string, payload: { status: string; facilitatorNotes?: string }): Observable<HustlerApplication> {
    return this.http.patch<HustlerApplication>(`${this.baseUrl}/api/hustlers/${id}/decision`, payload);
  }

  listCommunities(): Observable<Community[]> {
    return this.http.get<Community[]>(`${this.baseUrl}/api/communities`);
  }

  listHustlersByCommunity(communityId: string): Observable<BusinessProfile[]> {
    return this.http.get<BusinessProfile[]>(`${this.baseUrl}/api/communities/${communityId}/hustlers`);
  }

  listProducts(communityId?: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/api/products`, {
      params: communityId ? { communityId } : undefined
    });
  }
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

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  mediaUrl?: string;
  business: BusinessProfile;
}
