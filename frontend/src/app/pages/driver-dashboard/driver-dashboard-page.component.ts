import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService, DeliveryJobResponse } from '../../services/api.service';
import { DriverAuthService } from '../../services/driver-auth.service';

@Component({
  selector: 'app-driver-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="layout">

      <!-- Guard -->
      <div class="card" *ngIf="!driverAuth.isLoggedIn()">
        <h2>Driver Login Required</h2>
        <p class="muted">Please log in to access the driver dashboard.</p>
        <a routerLink="/driver/login" class="btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:1rem;">Go to Login</a>
      </div>

      <ng-container *ngIf="driverAuth.isLoggedIn()">

        <!-- Header -->
        <div class="dash-header">
          <div>
            <h1 class="driver-name">{{ driverAuth.state()?.firstName }} {{ driverAuth.state()?.lastName }}</h1>
            <span class="muted">{{ driverAuth.state()?.vehicleType }} · {{ driverAuth.state()?.communityName }}</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tab-bar">
          <button [class.active]="tab() === 'jobs'" (click)="tab.set('jobs')">Jobs</button>
          <button [class.active]="tab() === 'active'" (click)="tab.set('active')">Active Delivery</button>
          <button [class.active]="tab() === 'earnings'" (click)="tab.set('earnings')">Earnings</button>
        </div>

        <!-- JOBS TAB -->
        <ng-container *ngIf="tab() === 'jobs'">
          <div class="card">
            <div class="tab-header">
              <h2>Open Jobs</h2>
              <span class="muted small">Auto-refreshes every 30s</span>
            </div>

            <div *ngIf="jobsLoading()" class="muted">Loading jobs…</div>

            <div *ngIf="!jobsLoading() && openJobs().length === 0" class="empty-state">
              <p>No open delivery jobs available right now.</p>
            </div>

            <div class="job-list">
              <div *ngFor="let job of openJobs()" class="job-card">
                <div class="job-header">
                  <div>
                    <p class="job-seller">{{ job.sellerName }}</p>
                    <p class="muted small">{{ job.sellerAddress }}</p>
                  </div>
                  <span class="payout">R {{ job.payoutAmount | number:'1.2-2' }}</span>
                </div>
                <div class="job-meta">
                  <span class="meta-chip">📦 {{ job.items.length }} item{{ job.items.length === 1 ? '' : 's' }}</span>
                  <span class="meta-chip">🚚 {{ job.deliveryAddress }}</span>
                </div>
                <button
                  class="btn-accept"
                  (click)="acceptJob(job)"
                  [disabled]="acceptingJobId() === job.jobId"
                >
                  {{ acceptingJobId() === job.jobId ? 'Accepting…' : '✓ Accept Job' }}
                </button>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- ACTIVE DELIVERY TAB -->
        <ng-container *ngIf="tab() === 'active'">
          <div class="card">
            <h2 class="tab-title">Active Delivery</h2>

            <div *ngIf="activeJobsLoading()" class="muted">Loading…</div>

            <div *ngIf="!activeJobsLoading() && !activeJob()" class="empty-state">
              <p>No active delivery. Accept a job from the Jobs tab.</p>
            </div>

            <ng-container *ngIf="activeJob() as job">
              <div class="active-job">
                <div class="customer-info">
                  <p class="info-label">Customer</p>
                  <p class="info-value">{{ job.customerName }}</p>
                  <p class="muted small">📱 ****{{ job.customerPhone.slice(-4) }}</p>
                </div>

                <div class="delivery-info">
                  <p class="info-label">Deliver to</p>
                  <p class="info-value">{{ job.deliveryAddress }}</p>
                </div>

                <div class="pickup-info">
                  <p class="info-label">Pickup from</p>
                  <p class="info-value">{{ job.sellerName }}</p>
                  <p class="muted small">{{ job.sellerAddress }}</p>
                </div>

                <!-- Map -->
                <ng-container *ngIf="job.sellerLat && job.sellerLng && job.deliveryLat && job.deliveryLng; else noMap">
                  <div class="map-container" id="driver-map"></div>
                </ng-container>
                <ng-template #noMap>
                  <div class="no-map">Map unavailable — coordinates not set</div>
                </ng-template>

                <!-- Status actions -->
                <div class="status-actions">
                  <ng-container *ngIf="job.status === 'ASSIGNED'">
                    <button class="btn-status pickup" (click)="updateStatus(job, 'PICKED_UP')" [disabled]="updatingStatus()">
                      {{ updatingStatus() ? 'Updating…' : '📦 Mark as Picked Up' }}
                    </button>
                  </ng-container>

                  <ng-container *ngIf="job.status === 'PICKED_UP'">
                    <button class="btn-status enroute" (click)="updateStatus(job, 'EN_ROUTE')" [disabled]="updatingStatus()">
                      {{ updatingStatus() ? 'Updating…' : '🚚 Mark as En Route' }}
                    </button>
                  </ng-container>

                  <ng-container *ngIf="job.status === 'EN_ROUTE'">
                    <div class="proof-upload">
                      <label>Proof of delivery photo</label>
                      <input type="file" accept="image/*" (change)="onProofFileChange($event)" class="file-input" />
                    </div>
                    <button class="btn-status delivered" (click)="markDelivered(job)" [disabled]="updatingStatus()">
                      {{ updatingStatus() ? 'Updating…' : '✅ Mark as Delivered' }}
                    </button>
                  </ng-container>
                </div>

                <p *ngIf="statusError()" class="error-msg">{{ statusError() }}</p>
              </div>
            </ng-container>
          </div>
        </ng-container>

        <!-- EARNINGS TAB -->
        <ng-container *ngIf="tab() === 'earnings'">
          <div class="card">
            <h2 class="tab-title">Earnings</h2>

            <div *ngIf="earningsLoading()" class="muted">Loading earnings…</div>

            <ng-container *ngIf="!earningsLoading()">
              <div class="total-earnings">
                <span class="earnings-label">Total Earnings</span>
                <span class="earnings-amount">R {{ totalEarnings() | number:'1.2-2' }}</span>
              </div>

              <div *ngIf="deliveredJobs().length === 0" class="empty-state">
                <p>No completed deliveries yet.</p>
              </div>

              <div class="earnings-list">
                <div *ngFor="let job of deliveredJobs()" class="earnings-row">
                  <div>
                    <p class="job-seller">{{ job.sellerName }}</p>
                    <p class="muted small">{{ job.acceptedAt | date:'d MMM yyyy' }}</p>
                  </div>
                  <span class="payout">R {{ job.payoutAmount | number:'1.2-2' }}</span>
                </div>
              </div>
            </ng-container>
          </div>
        </ng-container>

      </ng-container>
    </div>
  `,
  styles: `
    .layout { max-width: 600px; margin: 0 auto; padding: 1rem 1rem 5rem; display: flex; flex-direction: column; gap: 1rem; }
    .card { background: white; border-radius: 1.5rem; padding: 1.5rem; box-shadow: 0 25px 60px rgba(15,23,42,0.10); }
    @media (max-width: 600px) { .card { padding: 1.25rem; } }
    .muted { color: #475569; }
    .small { font-size: 0.82rem; }

    /* Header */
    .dash-header { background: white; border-radius: 1.25rem; padding: 1.25rem 1.5rem; box-shadow: 0 4px 20px rgba(15,23,42,0.07); }
    .driver-name { margin: 0 0 0.2rem; font-size: 1.25rem; font-weight: 800; color: #0f172a; }

    /* Tabs */
    .tab-bar { display: flex; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(15,23,42,0.08); }
    .tab-bar button { flex: 1; padding: 0.85rem; border: none; background: none; font-size: 0.9rem; font-weight: 600; color: #94a3b8; cursor: pointer; transition: all 0.2s; min-height: 48px; font-family: inherit; }
    .tab-bar button.active { color: #0ea5e9; border-bottom: 3px solid #0ea5e9; background: #f0f9ff; }

    /* Job cards */
    .tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .tab-header h2 { margin: 0; font-size: 1.1rem; }
    .tab-title { margin: 0 0 1.25rem; font-size: 1.1rem; }
    .job-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .job-card { border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; background: #f8fafc; }
    .job-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.6rem; }
    .job-seller { margin: 0; font-weight: 700; font-size: 0.95rem; color: #0f172a; }
    .payout { font-size: 1.15rem; font-weight: 800; color: #16a34a; white-space: nowrap; }
    .job-meta { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .meta-chip { font-size: 0.78rem; color: #475569; background: #f1f5f9; padding: 0.2rem 0.6rem; border-radius: 999px; }
    .btn-accept { width: 100%; height: 44px; border: none; border-radius: 0.75rem; font-size: 0.95rem; font-weight: 700; background: linear-gradient(135deg, #0ea5e9, #22c55e); color: white; cursor: pointer; font-family: inherit; transition: opacity 0.15s; }
    .btn-accept:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Active delivery */
    .active-job { display: flex; flex-direction: column; gap: 1rem; }
    .customer-info, .delivery-info, .pickup-info { background: #f8fafc; border-radius: 0.75rem; padding: 0.75rem 1rem; }
    .info-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin: 0 0 0.25rem; }
    .info-value { font-weight: 600; color: #0f172a; margin: 0 0 0.15rem; font-size: 0.95rem; }

    /* Map */
    .map-container { height: 300px; border-radius: 0.75rem; overflow: hidden; margin: 0.5rem 0; background: #e2e8f0; }
    @media (min-width: 768px) { .map-container { height: 400px; } }
    .no-map { height: 80px; display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 0.75rem; color: #94a3b8; font-size: 0.9rem; }

    /* Status buttons */
    .status-actions { display: flex; flex-direction: column; gap: 0.5rem; }
    .btn-status { height: 48px; border: none; border-radius: 0.75rem; font-size: 1rem; font-weight: 700; cursor: pointer; font-family: inherit; width: 100%; transition: opacity 0.15s; }
    .btn-status:disabled { opacity: 0.6; cursor: not-allowed; }
    .pickup { background: #f59e0b; color: white; }
    .enroute { background: #0ea5e9; color: white; }
    .delivered { background: #16a34a; color: white; }

    .proof-upload { display: flex; flex-direction: column; gap: 0.25rem; }
    .proof-upload label { font-size: 0.875rem; font-weight: 600; color: #374151; }
    .file-input { border: none; padding: 0; font-size: 0.9rem; height: auto; }

    /* Earnings */
    .total-earnings { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f0fdf4; border-radius: 0.75rem; margin-bottom: 1rem; }
    .earnings-label { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #16a34a; }
    .earnings-amount { font-size: 1.5rem; font-weight: 800; color: #16a34a; }
    .earnings-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .earnings-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #f1f5f9; }

    /* Misc */
    .empty-state { text-align: center; padding: 2rem 1rem; color: #94a3b8; }
    .error-msg { color: #dc2626; font-size: 0.875rem; font-weight: 600; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 0.75rem 1rem; }

    .btn-primary { height: 48px; border: none; border-radius: 0.75rem; font-size: 1rem; font-weight: 700; background: linear-gradient(135deg, #0ea5e9, #22c55e); color: white; cursor: pointer; width: 100%; font-family: inherit; }
  `
})
export class DriverDashboardPageComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly driverAuth = inject(DriverAuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  tab = signal<'jobs' | 'active' | 'earnings'>('jobs');

  openJobs = signal<DeliveryJobResponse[]>([]);
  allMyJobs = signal<DeliveryJobResponse[]>([]);
  jobsLoading = signal(false);
  activeJobsLoading = signal(false);
  earningsLoading = signal(false);
  acceptingJobId = signal<string | null>(null);
  updatingStatus = signal(false);
  statusError = signal('');

  private proofPhotoUrl: string | null = null;
  private refreshInterval: any = null;
  private map: any = null;
  private driverMarker: any = null;
  private watchId: number | null = null;

  activeJob = computed<DeliveryJobResponse | null>(() => {
    const active = ['ASSIGNED', 'PICKED_UP', 'EN_ROUTE'];
    return this.allMyJobs().find(j => active.includes(j.status)) ?? null;
  });

  deliveredJobs = computed<DeliveryJobResponse[]>(() =>
    this.allMyJobs().filter(j => j.status === 'DELIVERED')
  );

  totalEarnings = computed<number>(() =>
    this.deliveredJobs().reduce((sum, j) => sum + j.payoutAmount, 0)
  );

  ngOnInit(): void {
    if (!this.driverAuth.isLoggedIn()) return;
    this.loadOpenJobs();
    this.loadMyJobs();

    // Auto-refresh open jobs every 30 seconds
    this.refreshInterval = setInterval(() => {
      if (this.tab() === 'jobs') {
        this.loadOpenJobs();
      }
    }, 30000);
  }

  ngAfterViewInit(): void {
    // Map will be initialized when active delivery tab is selected
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.map) {
      this.map.remove();
    }
  }

  loadOpenJobs(): void {
    const token = this.driverAuth.getToken();
    if (!token) return;
    this.jobsLoading.set(true);
    this.api.getDriverOpenJobs(token).subscribe({
      next: (jobs) => { this.openJobs.set(jobs); this.jobsLoading.set(false); },
      error: () => this.jobsLoading.set(false)
    });
  }

  loadMyJobs(): void {
    const token = this.driverAuth.getToken();
    if (!token) return;
    this.activeJobsLoading.set(true);
    this.earningsLoading.set(true);
    this.api.getDriverMyJobs(token).subscribe({
      next: (jobs) => {
        this.allMyJobs.set(jobs);
        this.activeJobsLoading.set(false);
        this.earningsLoading.set(false);
        // Initialize map after data loads if on active tab
        setTimeout(() => this.initMapIfNeeded(), 100);
      },
      error: () => {
        this.activeJobsLoading.set(false);
        this.earningsLoading.set(false);
      }
    });
  }

  selectTab(t: 'jobs' | 'active' | 'earnings'): void {
    this.tab.set(t);
    if (t === 'active') {
      setTimeout(() => this.initMapIfNeeded(), 200);
    }
  }

  private async initMapIfNeeded(): Promise<void> {
    const job = this.activeJob();
    if (!job || !job.sellerLat || !job.sellerLng || !job.deliveryLat || !job.deliveryLng) return;
    if (this.map) return;

    const mapEl = document.getElementById('driver-map');
    if (!mapEl) return;

    try {
      const L = await import('leaflet' as any);

      const midLat = (job.sellerLat + job.deliveryLat) / 2;
      const midLng = (job.sellerLng + job.deliveryLng) / 2;

      this.map = L.map('driver-map').setView([midLat, midLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Seller pin (green)
      const sellerIcon = L.divIcon({
        html: '<div style="background:#16a34a;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>',
        iconSize: [16, 16],
        className: ''
      });
      L.marker([job.sellerLat, job.sellerLng], { icon: sellerIcon })
        .addTo(this.map)
        .bindPopup(`Pickup: ${job.sellerName}`);

      // Customer pin (red)
      const customerIcon = L.divIcon({
        html: '<div style="background:#dc2626;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>',
        iconSize: [16, 16],
        className: ''
      });
      L.marker([job.deliveryLat, job.deliveryLng], { icon: customerIcon })
        .addTo(this.map)
        .bindPopup(`Deliver to: ${job.customerName}`);

      // Polyline between seller and customer
      L.polyline(
        [[job.sellerLat, job.sellerLng], [job.deliveryLat, job.deliveryLng]],
        { color: '#0ea5e9', weight: 3, opacity: 0.7 }
      ).addTo(this.map);

      // Watch driver position
      if (navigator.geolocation) {
        this.watchId = navigator.geolocation.watchPosition((pos) => {
          const driverLat = pos.coords.latitude;
          const driverLng = pos.coords.longitude;
          if (this.driverMarker) {
            this.driverMarker.setLatLng([driverLat, driverLng]);
          } else {
            const driverIcon = L.circleMarker([driverLat, driverLng], {
              radius: 8,
              color: '#0ea5e9',
              fillColor: '#0ea5e9',
              fillOpacity: 0.8,
              weight: 2
            });
            this.driverMarker = driverIcon.addTo(this.map);
          }
        });
      }
    } catch (e) {
      console.warn('Leaflet not available:', e);
    }
  }

  acceptJob(job: DeliveryJobResponse): void {
    const token = this.driverAuth.getToken();
    if (!token) return;
    this.acceptingJobId.set(job.jobId);
    this.api.acceptDeliveryJob(job.jobId, token).subscribe({
      next: () => {
        this.acceptingJobId.set(null);
        this.loadOpenJobs();
        this.loadMyJobs();
        this.tab.set('active');
      },
      error: (err) => {
        this.acceptingJobId.set(null);
      }
    });
  }

  updateStatus(job: DeliveryJobResponse, status: string): void {
    const token = this.driverAuth.getToken();
    if (!token) return;
    this.updatingStatus.set(true);
    this.statusError.set('');
    this.api.updateDeliveryStatus(job.jobId, { status }, token).subscribe({
      next: () => {
        this.updatingStatus.set(false);
        this.loadMyJobs();
      },
      error: (err) => {
        this.updatingStatus.set(false);
        this.statusError.set(err?.error?.message || 'Failed to update status.');
      }
    });
  }

  markDelivered(job: DeliveryJobResponse): void {
    const token = this.driverAuth.getToken();
    if (!token) return;
    this.updatingStatus.set(true);
    this.statusError.set('');
    const payload: { status: string; proofPhotoUrl?: string } = { status: 'DELIVERED' };
    if (this.proofPhotoUrl) payload.proofPhotoUrl = this.proofPhotoUrl;

    this.api.updateDeliveryStatus(job.jobId, payload, token).subscribe({
      next: () => {
        this.updatingStatus.set(false);
        this.proofPhotoUrl = null;
        this.loadMyJobs();
        if (this.map) { this.map.remove(); this.map = null; }
      },
      error: (err) => {
        this.updatingStatus.set(false);
        this.statusError.set(err?.error?.message || 'Failed to mark as delivered.');
      }
    });
  }

  onProofFileChange(event: Event): void {
    // In real impl, upload via api.uploadImage — for now just note file was selected
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      // proofPhotoUrl would be set after upload
      this.proofPhotoUrl = null;
    }
  }
}
