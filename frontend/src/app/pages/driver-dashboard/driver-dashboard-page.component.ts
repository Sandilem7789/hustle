import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, DeliveryJobResponse } from '../../services/api.service';
import { DriverAuthService } from '../../services/driver-auth.service';

@Component({
  selector: 'app-driver-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslatePipe],
  template: `
    <div class="card guard" *ngIf="!driverAuth.isLoggedIn()">
      <h2>Driver sign in</h2>
      <p class="mut">Sign in to see delivery jobs near you.</p>
      <a routerLink="/driver/login" class="btn gold">Sign in</a>
    </div>

    <ng-container *ngIf="driverAuth.isLoggedIn()">

      <!-- ══ JOBS ══ -->
      <ng-container *ngIf="tab() === 'jobs'">
        <header class="head dash-head">
          <div class="wrap">
            <p class="eyebrow">{{ 'nav.drive' | translate }}</p>
            <h1 class="title">{{ 'drive.jobsNear' | translate }}</h1>
            <p class="mut">{{ driverAuth.state()?.vehicleType }} · {{ 'drive.basedIn' | translate }} {{ driverAuth.state()?.communityName }}</p>
            <p class="today-line"><strong>R {{ earnedToday() | number:'1.0-2' }}</strong> {{ 'drive.earnedToday' | translate }} <strong class="gap">{{ deliveredToday() }}</strong> {{ 'drive.delivered' | translate }}</p>
          </div>
        </header>
        <div class="wrap stack">
          <p class="mut small">{{ 'drive.refreshes' | translate }}</p>
          <p *ngIf="jobsLoading() && visibleJobs().length === 0" class="mut">{{ 'marketplace.loading' | translate }}</p>
          <p *ngIf="!jobsLoading() && visibleJobs().length === 0" class="calm">{{ 'drive.noJobs' | translate }}</p>
          <article *ngFor="let job of visibleJobs(); let first = first" class="card job" [class.first]="first">
            <div class="job-top">
              <div class="fee"><span class="fee-amount">R {{ job.payoutAmount | number:'1.0-2' }}</span><span class="mut small">{{ 'drive.youEarn' | translate }}</span></div>
              <span class="mut" *ngIf="distanceKm(job) as km">{{ km | number:'1.1-1' }} km {{ 'drive.inTotal' | translate }}</span>
            </div>
            <div class="stop">
              <span class="stop-dot collect" aria-hidden="true"></span>
              <span class="stop-text"><strong>{{ 'drive.collectAt' | translate }} {{ job.sellerName }}</strong><span class="mut">{{ job.sellerAddress }} · {{ itemCount(job) }}</span></span>
            </div>
            <div class="stop">
              <span class="stop-dot drop" aria-hidden="true"></span>
              <span class="stop-text"><strong>{{ 'drive.deliverToBuyer' | translate }}</strong><span class="mut">{{ 'drive.dropAfter' | translate }}</span></span>
            </div>
            <div class="pair">
              <button type="button" class="btn" [class.gold]="first" [class.line]="!first" (click)="acceptJob(job)" [disabled]="acceptingJobId() === job.jobId || !!activeJob()">
                {{ (acceptingJobId() === job.jobId ? 'drive.taking' : 'drive.takeJob') | translate }}
              </button>
              <button type="button" class="btn line skip" (click)="skip(job)">{{ 'drive.skip' | translate }}</button>
            </div>
            <p class="mut small" *ngIf="activeJob() && first">{{ 'drive.finishFirst' | translate }}</p>
          </article>
        </div>
      </ng-container>

      <!-- ══ CURRENT JOB ══ -->
      <ng-container *ngIf="tab() === 'active'">
        <div class="wrap current">
          <p *ngIf="activeJobsLoading() && !activeJob()" class="mut stack">{{ 'marketplace.loading' | translate }}</p>
          <div *ngIf="!activeJobsLoading() && !activeJob()" class="stack">
            <h1 class="title">{{ 'nav.currentJob' | translate }}</h1>
            <p class="calm">{{ 'drive.noCurrent' | translate }}</p>
            <a class="btn gold" routerLink="/driver" [queryParams]="{ tab: 'jobs' }">{{ 'drive.seeJobs' | translate }}</a>
          </div>

          <ng-container *ngIf="activeJob() as job">
            <div class="current-grid">
              <div class="map-box">
                <ng-container *ngIf="job.sellerLat && job.sellerLng && job.deliveryLat && job.deliveryLng; else noMap">
                  <div class="map-container" id="driver-map"></div>
                </ng-container>
                <ng-template #noMap>
                  <div class="no-map">{{ 'drive.noMap' | translate }}</div>
                </ng-template>
              </div>

              <div class="panel">
                <ol class="steps card" [attr.aria-label]="'drive.progress' | translate">
                  <li *ngFor="let st of steps(job); let i = index" class="step" [class.done]="st.state === 'done'" [class.now]="st.state === 'now'" [attr.aria-current]="st.state === 'now' ? 'step' : null">
                    <span class="step-dot" aria-hidden="true"><mat-icon *ngIf="st.state === 'done'">check</mat-icon><ng-container *ngIf="st.state !== 'done'">{{ i + 1 }}</ng-container></span>
                    <span class="step-label">{{ st.key | translate }}</span>
                  </li>
                </ol>

                <section class="card goal">
                  <h2 class="eyebrow">{{ (job.status === 'ASSIGNED' ? 'drive.goCollect' : 'drive.takeToBuyer') | translate }}</h2>
                  <p class="goal-name">{{ job.status === 'ASSIGNED' ? job.sellerName : job.customerName }}</p>
                  <p class="mut" *ngIf="job.status === 'ASSIGNED'">{{ job.sellerAddress }} · {{ 'drive.order' | translate }} #{{ job.orderId.slice(0, 4).toUpperCase() }} · {{ itemCount(job) }}</p>
                  <p class="mut" *ngIf="job.status !== 'ASSIGNED'">{{ job.deliveryAddress }}</p>
                  <div class="pair">
                    <a class="btn line" [href]="directionsHref(job)" target="_blank" rel="noopener">{{ 'drive.directions' | translate }}</a>
                    <a class="btn line" *ngIf="job.status !== 'ASSIGNED'" [href]="'tel:' + job.customerPhone">{{ 'drive.callBuyer' | translate }}</a>
                  </div>
                </section>

                <p class="lock" *ngIf="job.status === 'ASSIGNED'">
                  <mat-icon aria-hidden="true">lock</mat-icon>{{ 'drive.buyerAfter' | translate }}
                </p>

                <label class="proof" *ngIf="job.status === 'EN_ROUTE'">
                  <span>{{ 'drive.proof' | translate }}</span>
                  <input type="file" accept="image/*" capture="environment" (change)="onProofFileChange($event)" />
                </label>

                <p *ngIf="statusError()" class="error" role="alert">{{ statusError() }}</p>

                <button *ngIf="job.status === 'ASSIGNED'" class="btn gold big-btn" (click)="updateStatus(job, 'PICKED_UP')" [disabled]="updatingStatus()">{{ 'drive.collected' | translate }}</button>
                <button *ngIf="job.status === 'PICKED_UP'" class="btn gold big-btn" (click)="updateStatus(job, 'EN_ROUTE')" [disabled]="updatingStatus()">{{ 'drive.onTheWay' | translate }}</button>
                <button *ngIf="job.status === 'EN_ROUTE'" class="btn gold big-btn" (click)="markDelivered(job)" [disabled]="updatingStatus()">{{ 'drive.markDelivered' | translate }}</button>
              </div>
            </div>
          </ng-container>
        </div>
      </ng-container>

      <!-- ══ EARNINGS ══ -->
      <ng-container *ngIf="tab() === 'earnings'">
        <header class="head dash-head">
          <div class="wrap">
            <p class="eyebrow">{{ 'nav.drive' | translate }}</p>
            <h1 class="title">{{ 'nav.earnings' | translate }}</h1>
          </div>
        </header>
        <div class="wrap stack">
          <p *ngIf="earningsLoading()" class="mut">{{ 'marketplace.loading' | translate }}</p>
          <ng-container *ngIf="!earningsLoading()">
            <section class="card">
              <h2 class="eyebrow">{{ 'drive.allTime' | translate }}</h2>
              <p class="big">R {{ totalEarnings() | number:'1.0-2' }}</p>
              <p class="mut">{{ deliveredJobs().length }} {{ 'drive.delivered' | translate }} · R {{ earnedToday() | number:'1.0-2' }} {{ 'drive.earnedToday' | translate }}</p>
            </section>
            <p *ngIf="deliveredJobs().length === 0" class="calm">{{ 'drive.noEarnings' | translate }}</p>
            <section class="card" *ngIf="deliveredJobs().length > 0">
              <div class="line-row" *ngFor="let job of deliveredJobs()">
                <span class="line-text"><strong>{{ job.sellerName }}</strong><span class="mut small">{{ job.acceptedAt | date:'EEE d MMM' }}</span></span>
                <strong>R {{ job.payoutAmount | number:'1.0-2' }}</strong>
              </div>
            </section>
          </ng-container>
        </div>
      </ng-container>
    </ng-container>
  `,
  styles: `
    :host { display: block; padding-bottom: 2rem; }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 0 16px; box-sizing: border-box; }
    @media (min-width: 768px) { .wrap { padding: 0 32px; } }
    .head { padding: 20px 0 18px; }
    @media (min-width: 768px) { .head { padding: 32px 0 20px; background: transparent; border-bottom: 0; } }
    .head .wrap { display: flex; flex-direction: column; gap: 6px; }
    .eyebrow { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--success-text); }
    .title { margin: 0; font-family: var(--font-display); font-size: 2.125rem; font-weight: 800; line-height: 1.05; letter-spacing: -0.015em; color: var(--nav-fg); }
    @media (min-width: 768px) { .title { font-size: 2.75rem; } }
    .mut { margin: 0; color: var(--text-secondary); }
    .small { font-size: 0.8125rem; }
    .calm { margin: 0; color: var(--text-secondary); line-height: 1.45; }
    .today-line { margin: 8px 0 0; font-size: 1rem; color: var(--nav-fg-muted); }
    .today-line strong { color: var(--nav-fg); font-size: 1.125rem; }
    .today-line .gap { margin-left: 16px; }
    .stack { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; max-width: 640px; }
    .card { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 20px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    @media (min-width: 768px) { .card { padding: 22px; } }
    .guard { max-width: 480px; margin: 24px auto; }
    .guard h2 { margin: 0; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 0 20px; border-radius: 14px; border: 0; font-size: 1rem; font-weight: 700; text-decoration: none; }
    .btn.gold { background: var(--gold); color: var(--ink); }
    .btn.line { background: transparent; color: var(--text-primary); border: 1.5px solid var(--text-primary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }
    .big-btn { width: 100%; min-height: 60px; font-size: 1.125rem; border-radius: 16px; }
    .pair { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 10px; }

    .job.first { border: 2px solid var(--text-primary); }
    .job-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .fee { display: flex; flex-direction: column; }
    .fee-amount { font-family: var(--font-display); font-size: 2.5rem; font-weight: 800; line-height: 1; }
    .stop { display: flex; gap: 14px; align-items: flex-start; }
    .stop-dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
    .stop-dot.collect { background: var(--gold); box-shadow: inset 0 0 0 3px var(--ink); }
    .stop-dot.drop { background: var(--success-fill); }
    .stop-text { display: flex; flex-direction: column; gap: 2px; }
    .stop-text strong { font-size: 1.0625rem; }

    .current { padding-top: 16px; }
    .current-grid { display: flex; flex-direction: column; gap: 14px; }
    @media (min-width: 960px) { .current-grid { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 24px; align-items: start; } }
    .map-box { border-radius: 20px; overflow: hidden; border: 1px solid var(--border-base); background: var(--bg-muted); }
    .map-container { height: 300px; width: 100%; }
    @media (min-width: 960px) { .map-container { height: calc(100dvh - 64px); max-height: 760px; } }
    .no-map { padding: 48px 16px; text-align: center; color: var(--text-secondary); }
    .panel { display: flex; flex-direction: column; gap: 14px; }
    .steps { list-style: none; margin: 0; flex-direction: row; justify-content: space-between; gap: 4px; padding: 16px 12px; }
    .step { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; text-align: center; font-size: 0.8125rem; color: var(--text-secondary); }
    .step-dot { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--border-base); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--text-secondary); }
    .step-dot mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .step.done .step-dot { background: var(--success-fill); border-color: var(--success-fill); color: #FFFFFF; }
    .step.now { color: var(--text-primary); font-weight: 700; }
    .step.now .step-dot { background: var(--gold); border: 2px solid var(--ink); color: var(--ink); }
    .goal { gap: 8px; }
    .goal-name { margin: 0; font-family: var(--font-display); font-size: 1.75rem; font-weight: 800; line-height: 1.1; }
    .goal .pair { margin-top: 6px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .lock { margin: 0; display: flex; gap: 12px; align-items: center; padding: 14px 16px; border-radius: 16px; border: 1px dashed var(--border-base); background: var(--bg-muted); line-height: 1.4; }
    .lock mat-icon { flex-shrink: 0; }
    .proof { display: flex; flex-direction: column; gap: 6px; font-weight: 700; font-size: 0.875rem; }
    .error { margin: 0; color: #8E2A20; font-weight: 700; }

    .big { margin: 0; font-family: var(--font-display); font-size: 3rem; font-weight: 800; line-height: 1; }
    .line-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border-base); }
    .line-row:first-child { border-top: 0; }
    .line-text { display: flex; flex-direction: column; gap: 2px; }
  `
})
export class DriverDashboardPageComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly driverAuth = inject(DriverAuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  tab = signal<'jobs' | 'active' | 'earnings'>('jobs');
  private readonly skipped = signal<ReadonlySet<string>>(new Set());

  readonly visibleJobs = computed(() => this.openJobs().filter(j => !this.skipped().has(j.jobId)));
  private readonly today = new Date().toDateString();
  readonly deliveredTodayJobs = computed(() => this.deliveredJobs().filter(j => j.acceptedAt && new Date(j.acceptedAt).toDateString() === this.today));
  readonly earnedToday = computed(() => this.deliveredTodayJobs().reduce((sum, j) => sum + j.payoutAmount, 0));
  readonly deliveredToday = computed(() => this.deliveredTodayJobs().length);

  constructor() {
    // The Drive nav links to tabs by address, e.g. /driver?tab=active
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const t = params.get('tab');
      this.tab.set(t === 'active' || t === 'earnings' ? t : 'jobs');
      if (this.tab() === 'active') setTimeout(() => this.initMapIfNeeded(), 200);
    });
  }

  skip(job: DeliveryJobResponse): void {
    this.skipped.update(s => new Set(s).add(job.jobId));
  }

  itemCount(job: DeliveryJobResponse): string {
    const n = job.items.reduce((sum, i) => sum + i.quantity, 0);
    return n === 1 ? '1 item' : `${n} items`;
  }

  // Straight-line distance from the shop to the drop-off, when both are pinned
  distanceKm(job: DeliveryJobResponse): number | null {
    if (!job.sellerLat || !job.sellerLng || !job.deliveryLat || !job.deliveryLng) return null;
    const rad = (d: number) => d * Math.PI / 180;
    const dLat = rad(job.deliveryLat - job.sellerLat);
    const dLng = rad(job.deliveryLng - job.sellerLng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(job.sellerLat)) * Math.cos(rad(job.deliveryLat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  steps(job: DeliveryJobResponse): { key: string; state: 'done' | 'now' | 'next' }[] {
    const at = job.status === 'ASSIGNED' ? 1 : job.status === 'PICKED_UP' || job.status === 'EN_ROUTE' ? 2 : 3;
    return ['drive.stepTaken', 'drive.stepCollect', 'drive.stepOnWay', 'drive.stepDelivered']
      .map((key, i) => ({ key, state: i < at ? 'done' : i === at ? 'now' : 'next' }));
  }

  directionsHref(job: DeliveryJobResponse): string {
    const [lat, lng] = job.status === 'ASSIGNED' ? [job.sellerLat, job.sellerLng] : [job.deliveryLat, job.deliveryLng];
    if (lat && lng) return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
    const where = job.status === 'ASSIGNED' ? job.sellerAddress : job.deliveryAddress;
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(where ?? '')}`;
  }

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
        html: '<div style="background:#E5A31D;width:18px;height:18px;border-radius:50%;border:3px solid #13251E;box-sizing:border-box;"></div>',
        iconSize: [18, 18],
        className: ''
      });
      L.marker([job.sellerLat, job.sellerLng], { icon: sellerIcon })
        .addTo(this.map)
        .bindPopup(`Pickup: ${job.sellerName}`);

      // The buyer's drop-off appears only once the parcel is collected (D10)
      if (job.status !== 'ASSIGNED') {
        const customerIcon = L.divIcon({
          html: '<div style="background:#2E6B4A;width:16px;height:16px;border-radius:50%;border:3px solid #FFFFFF;box-sizing:border-box;"></div>',
          iconSize: [16, 16],
          className: ''
        });
        L.marker([job.deliveryLat, job.deliveryLng], { icon: customerIcon })
          .addTo(this.map)
          .bindPopup(`Deliver to: ${job.customerName}`);
        L.polyline(
          [[job.sellerLat, job.sellerLng], [job.deliveryLat, job.deliveryLng]],
          { color: '#13251E', weight: 4, opacity: 0.85, dashArray: '2 10', lineCap: 'round' }
        ).addTo(this.map);
      } else {
        this.map.setView([job.sellerLat, job.sellerLng], 14);
      }

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
              color: '#FFFFFF',
              fillColor: '#2F6DB5',
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
        this.router.navigate(['/driver'], { queryParams: { tab: 'active' } });
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
        // Redraw the map: the drop-off appears once the parcel is collected
        if (this.map) { this.map.remove(); this.map = null; this.driverMarker = null; }
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
