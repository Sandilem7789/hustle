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

  // ─── Hustler Auth ────────────────────────────────────────────────────────
  login(phone: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/login`, { phone, password });
  }

  // ─── Customer Auth ───────────────────────────────────────────────────────
  registerCustomer(payload: CustomerRegisterRequest): Observable<CustomerAuthResponse> {
    return this.http.post<CustomerAuthResponse>(`${this.baseUrl}/api/customers/register`, payload);
  }

  loginCustomer(payload: { phone: string; password: string }): Observable<CustomerAuthResponse> {
    return this.http.post<CustomerAuthResponse>(`${this.baseUrl}/api/customers/login`, payload);
  }

  getCustomerMe(token: string): Observable<CustomerAuthResponse> {
    return this.http.get<CustomerAuthResponse>(`${this.baseUrl}/api/customers/me`, {
      headers: new HttpHeaders({ 'X-Auth-Token': token })
    });
  }

  // ─── Driver Auth ─────────────────────────────────────────────────────────
  registerDriver(payload: DriverRegisterRequest): Observable<DriverAuthResponse> {
    return this.http.post<DriverAuthResponse>(`${this.baseUrl}/api/drivers/register`, payload);
  }

  loginDriver(payload: { phone: string; password: string }): Observable<DriverAuthResponse> {
    return this.http.post<DriverAuthResponse>(`${this.baseUrl}/api/drivers/login`, payload);
  }

  // ─── Orders ──────────────────────────────────────────────────────────────
  placeOrder(payload: OrderRequest, customerToken: string): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.baseUrl}/api/orders`, payload, {
      headers: new HttpHeaders({ 'X-Auth-Token': customerToken })
    });
  }

  getMyOrders(customerToken: string): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.baseUrl}/api/orders/my`, {
      headers: new HttpHeaders({ 'X-Auth-Token': customerToken })
    });
  }

  getIncomingOrders(hustlerToken: string): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.baseUrl}/api/orders/incoming`, {
      headers: new HttpHeaders({ 'X-Auth-Token': hustlerToken })
    });
  }

  updateOrderStatus(orderId: string, status: string, hustlerToken: string): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`${this.baseUrl}/api/orders/${orderId}/status`, { status }, {
      headers: new HttpHeaders({ 'X-Auth-Token': hustlerToken })
    });
  }

  validateDeliveryDistance(payload: { sellerId: string; deliveryLat: number; deliveryLng: number }): Observable<DistanceCheckResponse> {
    return this.http.post<DistanceCheckResponse>(`${this.baseUrl}/api/orders/validate-distance`, payload);
  }

  // ─── Driver Jobs ─────────────────────────────────────────────────────────
  getDriverOpenJobs(driverToken: string): Observable<DeliveryJobResponse[]> {
    return this.http.get<DeliveryJobResponse[]>(`${this.baseUrl}/api/deliveries/open`, {
      headers: new HttpHeaders({ 'X-Auth-Token': driverToken })
    });
  }

  getDriverMyJobs(driverToken: string): Observable<DeliveryJobResponse[]> {
    return this.http.get<DeliveryJobResponse[]>(`${this.baseUrl}/api/deliveries/my`, {
      headers: new HttpHeaders({ 'X-Auth-Token': driverToken })
    });
  }

  acceptDeliveryJob(jobId: string, driverToken: string): Observable<DeliveryJobResponse> {
    return this.http.post<DeliveryJobResponse>(`${this.baseUrl}/api/deliveries/${jobId}/accept`, {}, {
      headers: new HttpHeaders({ 'X-Auth-Token': driverToken })
    });
  }

  updateDeliveryStatus(jobId: string, payload: { status: string; proofPhotoUrl?: string }, driverToken: string): Observable<DeliveryJobResponse> {
    return this.http.patch<DeliveryJobResponse>(`${this.baseUrl}/api/deliveries/${jobId}/status`, payload, {
      headers: new HttpHeaders({ 'X-Auth-Token': driverToken })
    });
  }

  // ─── Facilitator Driver Management ───────────────────────────────────────
  listFacilitatorDrivers(): Observable<DriverResponse[]> {
    return this.http.get<DriverResponse[]>(`${this.baseUrl}/api/facilitator/drivers`);
  }

  setDriverStatus(driverId: string, status: string): Observable<DriverResponse> {
    return this.http.patch<DriverResponse>(`${this.baseUrl}/api/facilitator/drivers/${driverId}/status`, { status });
  }

  // ─── Hustler Applications ────────────────────────────────────────────────
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

  // ─── Products ────────────────────────────────────────────────────────────
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

  listProducts(communityId?: string, category?: string): Observable<ProductResponse[]> {
    const params: Record<string, string> = {};
    if (communityId) params['communityId'] = communityId;
    if (category) params['category'] = category;
    return this.http.get<ProductResponse[]>(`${this.baseUrl}/api/products`, {
      params: Object.keys(params).length ? params : undefined
    });
  }

  // ─── Income ──────────────────────────────────────────────────────────────
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

  // ─── Image Upload ─────────────────────────────────────────────────────────
  uploadImage(file: File, token: string): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/api/uploads`, form, {
      headers: new HttpHeaders({ 'X-Auth-Token': token })
    });
  }

  // ─── Monthly Check-ins ────────────────────────────────────────────────────
  listCheckIns(businessProfileId: string): Observable<MonthlyCheckInResponse[]> {
    return this.http.get<MonthlyCheckInResponse[]>(`${this.baseUrl}/api/facilitator/hustlers/${businessProfileId}/checkins`);
  }

  recordCheckIn(businessProfileId: string, payload: MonthlyCheckInRequest): Observable<MonthlyCheckInResponse> {
    return this.http.post<MonthlyCheckInResponse>(`${this.baseUrl}/api/facilitator/hustlers/${businessProfileId}/checkins`, payload);
  }

  // ─── Account Activation ───────────────────────────────────────────────────
  activateApplicant(id: string): Observable<ActivateApplicantResponse> {
    return this.http.post<ActivateApplicantResponse>(`${this.baseUrl}/api/applicants/${id}/activate`, {});
  }

  resetApplicantPassword(id: string): Observable<ActivateApplicantResponse> {
    return this.http.post<ActivateApplicantResponse>(`${this.baseUrl}/api/applicants/${id}/reset-password`, {});
  }

  // ─── Interview ────────────────────────────────────────────────────────────
  getInterview(applicantId: string): Observable<InterviewResponse> {
    return this.http.get<InterviewResponse>(`${this.baseUrl}/api/applicants/${applicantId}/interview`);
  }

  scheduleInterview(applicantId: string, scheduledDate: string): Observable<InterviewResponse> {
    return this.http.patch<InterviewResponse>(`${this.baseUrl}/api/applicants/${applicantId}/interview/schedule`, { scheduledDate });
  }

  recordInterview(applicantId: string, payload: InterviewRequest): Observable<InterviewResponse> {
    return this.http.post<InterviewResponse>(`${this.baseUrl}/api/applicants/${applicantId}/interview`, payload);
  }

  // ─── Business Verification ────────────────────────────────────────────────
  getVerification(applicantId: string): Observable<BusinessVerificationResponse> {
    return this.http.get<BusinessVerificationResponse>(`${this.baseUrl}/api/applicants/${applicantId}/verification`);
  }

  recordVerification(applicantId: string, payload: BusinessVerificationRequest): Observable<BusinessVerificationResponse> {
    return this.http.post<BusinessVerificationResponse>(`${this.baseUrl}/api/applicants/${applicantId}/verification`, payload);
  }

  // ─── Applicants (Pipeline) ────────────────────────────────────────────────
  createApplicant(payload: ApplicantRequest): Observable<ApplicantResponse> {
    return this.http.post<ApplicantResponse>(`${this.baseUrl}/api/applicants`, payload);
  }

  listApplicants(communityId?: string, stage?: string, callStatus?: string): Observable<ApplicantResponse[]> {
    const params: Record<string, string> = {};
    if (communityId) params['communityId'] = communityId;
    if (stage) params['stage'] = stage;
    if (callStatus) params['callStatus'] = callStatus;
    return this.http.get<ApplicantResponse[]>(`${this.baseUrl}/api/applicants`, {
      params: Object.keys(params).length ? params : undefined
    });
  }

  updateApplicantCallStatus(id: string, callStatus: string): Observable<ApplicantResponse> {
    return this.http.patch<ApplicantResponse>(`${this.baseUrl}/api/applicants/${id}/call`, { callStatus });
  }

  updateApplicantStage(id: string, stage: string, reason?: string): Observable<ApplicantResponse> {
    return this.http.patch<ApplicantResponse>(`${this.baseUrl}/api/applicants/${id}/stage`, { stage, reason });
  }

  getCapStatus(communityId: string, cohortNumber: number): Observable<CohortCapResponse> {
    return this.http.get<CohortCapResponse>(`${this.baseUrl}/api/applicants/cap-status`, {
      params: { communityId, cohortNumber: cohortNumber.toString() }
    });
  }

  // ─── Communities ──────────────────────────────────────────────────────────
  listCommunities(): Observable<Community[]> {
    return this.http.get<Community[]>(`${this.baseUrl}/api/communities`);
  }

  listHustlersByCommunity(communityId: string): Observable<BusinessProfile[]> {
    return this.http.get<BusinessProfile[]>(`${this.baseUrl}/api/communities/${communityId}/hustlers`);
  }

  // ─── Facilitator ──────────────────────────────────────────────────────────
  listFacilitatorHustlers(): Observable<FacilitatorHustler[]> {
    return this.http.get<FacilitatorHustler[]>(`${this.baseUrl}/api/facilitator/hustlers`);
  }

  setHustlerActive(id: string, active: boolean): Observable<FacilitatorHustler> {
    return this.http.patch<FacilitatorHustler>(`${this.baseUrl}/api/facilitator/hustlers/${id}/active`, { active });
  }
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  businessProfileId: string;
  businessName: string;
  firstName: string;
  lastName: string;
  businessType?: string;
}

export interface CustomerRegisterRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password: string;
}

export interface CustomerAuthResponse {
  token: string;
  customerId: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface DriverRegisterRequest {
  firstName: string;
  lastName: string;
  phone: string;
  idNumber: string;
  password: string;
  vehicleType: string;
  communityId: string;
}

export interface DriverAuthResponse {
  token: string;
  driverId: string;
  firstName: string;
  lastName: string;
  vehicleType: string;
  communityName: string;
}

export interface DriverResponse {
  driverId: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: string;
  communityName: string;
  status: string;
  createdAt: string;
}

export interface OrderItemRequest {
  productId: string;
  quantity: number;
}

export interface OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderRequest {
  items: OrderItemRequest[];
  transactionType: 'B2C' | 'B2B';
  fulfillmentType: 'DELIVERY' | 'COLLECTION';
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  businessPurchaseOrderRef?: string;
}

export interface OrderResponse {
  id: string;
  customerId: string;
  customerName: string;
  hustlerName: string;
  businessProfileId: string;
  transactionType: string;
  fulfillmentType: string;
  status: string;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  items: OrderItemResponse[];
  totalAmount: number;
  createdAt: string;
}

export interface DistanceCheckResponse {
  distanceKm: number;
  withinLimit: boolean;
  message: string;
}

export interface DeliveryJobResponse {
  jobId: string;
  orderId: string;
  driverId?: string;
  status: string;
  sellerName: string;
  sellerAddress: string;
  sellerLat?: number;
  sellerLng?: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  items: OrderItemResponse[];
  totalAmount: number;
  payoutAmount: number;
  createdAt: string;
  acceptedAt?: string;
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
  category?: string;
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
  category?: string;
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
  applicationId?: string;
  communityId?: string;
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
  missedCheckIn: boolean;
}

export interface MonthlyCheckInRequest {
  notes?: string;
  photoUrls?: string[];
  visitedBy?: string;
}

export interface MonthlyCheckInResponse {
  id: string;
  businessProfileId: string;
  visitMonth: string;
  photoUrls?: string[];
  notes?: string;
  visitedBy?: string;
  createdAt: string;
}

export interface ActivateApplicantResponse {
  applicantId: string;
  applicationId: string;
  businessProfileId: string;
  firstName: string;
  lastName: string;
  phone: string;
  generatedPassword: string;
}

export interface InterviewRequest {
  conductedDate: string;
  canDescribeBusiness: boolean;
  appearsGenuine: boolean;
  hasRunningBusiness: boolean;
  notes?: string;
  outcome: 'PASS' | 'FAIL' | 'NO_SHOW';
  conductedBy?: string;
}

export interface InterviewResponse {
  id: string;
  applicantId: string;
  scheduledDate?: string;
  conductedDate?: string;
  canDescribeBusiness?: boolean;
  appearsGenuine?: boolean;
  hasRunningBusiness?: boolean;
  notes?: string;
  outcome?: string;
  conductedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessVerificationRequest {
  visitDate: string;
  latitude?: number;
  longitude?: number;
  photoUrls?: string[];
  notes?: string;
  outcome: 'VERIFIED' | 'FAILED';
  verifiedBy?: string;
}

export interface BusinessVerificationResponse {
  id: string;
  applicantId: string;
  visitDate?: string;
  latitude?: number;
  longitude?: number;
  photoUrls?: string[];
  notes?: string;
  outcome?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ApplicantRequest {
  communityId: string;
  cohortNumber?: number;
  firstName: string;
  lastName: string;
  gender?: string;
  age?: number;
  phone: string;
  email?: string;
  typeOfHustle: string;
  districtSection?: string;
  capturedBy?: string;
}

export interface ApplicantResponse {
  id: string;
  communityId: string;
  communityName: string;
  cohortNumber: number;
  firstName: string;
  lastName: string;
  gender?: string;
  age?: number;
  phone: string;
  email?: string;
  typeOfHustle: string;
  districtSection?: string;
  pipelineStage: string;
  callStatus: string;
  ageFlag: boolean;
  capturedBy?: string;
  rejectionReason?: string;
  approvedCountInCohort: number;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
}

export interface CohortCapResponse {
  communityId: string;
  communityName: string;
  cohortNumber: number;
  approvedCount: number;
  cap: number;
  atCap: boolean;
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
