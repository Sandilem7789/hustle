import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, ApplicantResponse, CommunityStats, BusinessProfile } from '../../services/api.service';
import { UnifiedAuthService } from '../../services/unified-auth.service';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-operations-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, LoginGateComponent],
  template: `
    <app-login-gate *ngIf="!authorized()"
      icon="🗺️"
      title="Operations Sign In"
      subtitle="This section is for facilitators and coordinators."
      [requiredRoles]="['FACILITATOR','COORDINATOR']"
    ></app-login-gate>

    <div class="staff-shell ops-shell" *ngIf="authorized()">
      <header class="staff-shell__header ops-header">
        <p class="eyebrow">Back office · {{ today }}</p>
        <h1 class="staff-shell__title">Operations</h1>
        <p class="staff-shell__subtitle">Approvals, shops and communities across your area</p>
      </header>

      <div class="staff-shell__content ops-content">
        <div class="kpis">
          <a class="kpi hot" href="#approvals">
            <strong>{{ awaiting().length }}</strong><span>Awaiting final approval</span>
          </a>
          <div class="kpi"><strong>{{ shopsLive() }}</strong><span>Shops live</span></div>
          <div class="kpi"><strong>{{ withAgents() }}</strong><span>Waiting for an agent visit</span></div>
          <div class="kpi"><strong>{{ stats().length }}</strong><span>Communities</span></div>
        </div>

        <div class="ops-grid">
          <section id="approvals" class="approvals" aria-labelledby="ap-h">
            <h2 id="ap-h" class="section-title">Awaiting final approval</h2>
            <p class="mut" *ngIf="awaitingLoading()">Loading…</p>
            <p class="calm" *ngIf="!awaitingLoading() && awaiting().length === 0">Nobody is waiting. When a Community Agent approves someone, they appear here for your final yes.</p>
            <article class="card applicant" *ngFor="let a of awaiting()">
              <div class="app-top">
                <span class="app-who"><strong>{{ a.firstName }} {{ a.lastName }}</strong><span class="mut">{{ a.typeOfHustle }} · {{ a.communityName }}</span></span>
                <span class="tag">Merchant</span>
              </div>
              <p class="mut small">Checked in person · moved to you {{ a.updatedAt | date:'d MMM' }} · phone ending {{ a.phone.slice(-4) }}</p>
              <div class="pair">
                <button type="button" class="btn gold" (click)="approve(a)" [disabled]="busyId() === a.id">{{ busyId() === a.id ? 'Saving…' : 'Approve' }}</button>
                <button type="button" class="btn line" (click)="sendBack(a)" [disabled]="busyId() === a.id">Send back</button>
              </div>
            </article>
            <p class="error" *ngIf="actionError()" role="alert">{{ actionError() }}</p>
          </section>

          <section class="card communities" aria-labelledby="cm-h">
            <h2 id="cm-h" class="section-title">Communities</h2>
            <p class="mut" *ngIf="loading()">Loading…</p>
            <ng-container *ngIf="!loading() && !selectedCommunity()">
              <button type="button" class="c-row" *ngFor="let c of stats()" (click)="selectCommunity(c)">
                <span class="c-name"><strong>{{ c.communityName }}</strong><span class="mut small">{{ c.province ?? '' }}</span></span>
                <span class="c-num"><strong>{{ c.activeHustlers }}</strong><span class="mut small">shops live</span></span>
                <span class="c-num"><strong>{{ c.totalApplicants }}</strong><span class="mut small">applied</span></span>
                <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </button>
            </ng-container>
            <ng-container *ngIf="!loading() && selectedCommunity() as c">
              <button type="button" class="link" (click)="clearSelectedCommunity()">‹ All communities</button>
              <p class="c-title">{{ c.communityName }}</p>
              <p class="mut">{{ c.activeHustlers }} shops live · {{ c.totalApplicants }} applied</p>
              <p class="mut" *ngIf="hustlersLoading()">Loading shops…</p>
              <p class="calm" *ngIf="!hustlersLoading() && communityHustlers().length === 0">No shops live here yet.</p>
              <div class="line-row" *ngFor="let h of communityHustlers()">
                <span class="c-name"><strong>{{ h.businessName }}</strong><span class="mut small">{{ h.businessType }}</span></span>
                <span class="mut small">{{ h.operatingArea }}</span>
              </div>
            </ng-container>
          </section>

          <section class="card map-card" aria-labelledby="map-h">
            <h2 id="map-h" class="section-title">Communities on the map</h2>
            <div id="ops-map" class="ops-map"></div>
            <p class="mut small">Pins are approximate until each community is checked on the ground.</p>
          </section>
        </div>
      </div>

      <footer class="staff-shell__footer signout-row">
        <button class="signout-btn" (click)="logout()">Sign Out</button>
      </footer>
    </div>
  `,
  styles: `
    :host { display: block; }
    .signout-row {
      display: flex;
      justify-content: center;
    }
    .signout-btn {
      border: 1.5px solid #E3DACA;
      background: none;
      color: #646A63;
      border-radius: 999px;
      padding: 0.6rem 2rem;
      font-size: 0.875rem;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      min-height: 48px;
      transition: border-color 0.15s, color 0.15s;
    }
    @media (hover: hover) and (pointer: fine) {
      .signout-btn:hover { border-color: #C8443A; color: #C8443A; }
    }

    .ops-shell { max-width: none; }
    .ops-header .eyebrow { margin: 0 0 4px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--nav-accent); }
    .ops-header .staff-shell__title { font-family: var(--font-display); font-size: 1.875rem; font-weight: 800; letter-spacing: -0.015em; }
    @media (min-width: 768px) { .ops-header .staff-shell__title { font-size: 2.5rem; } .ops-header { padding: 1.5rem 2rem 1.25rem; } }
    .ops-content { background: var(--bg-page); padding: 16px; }
    @media (min-width: 768px) { .ops-content { padding: 24px 32px; } }

    .mut { margin: 0; color: var(--text-secondary); }
    .small { font-size: 0.8125rem; }
    .calm { margin: 0; color: var(--text-secondary); line-height: 1.45; }
    .error { margin: 0; color: #8E2A20; font-weight: 700; }
    .card { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 20px; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
    .section-title { margin: 0; font-family: var(--font-display); font-size: 1.375rem; font-weight: 600; color: var(--text-primary); }

    .kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
    @media (min-width: 900px) { .kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; } }
    .kpi { display: flex; flex-direction: column; gap: 4px; padding: 16px; border-radius: 18px; border: 1px solid var(--border-base); background: var(--bg-surface); color: var(--text-primary); text-decoration: none; }
    .kpi strong { font-family: var(--font-display); font-size: 2.25rem; font-weight: 800; line-height: 1; }
    .kpi span { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.3; }
    .kpi.hot { background: var(--gold); border-color: var(--gold); }
    .kpi.hot span { color: var(--ink); }
    .kpi.hot strong { color: var(--ink); }

    .ops-grid { display: flex; flex-direction: column; gap: 16px; }
    @media (min-width: 1100px) { .ops-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 24px; align-items: start; } .map-card { grid-column: span 2; } }
    .approvals { display: flex; flex-direction: column; gap: 12px; }
    .app-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .app-who { display: flex; flex-direction: column; gap: 2px; }
    .app-who strong { font-size: 1.0625rem; }
    .tag { padding: 4px 10px; border-radius: 999px; background: var(--bg-muted); font-size: 0.8125rem; font-weight: 700; white-space: nowrap; }
    .pair { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 10px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 16px; border-radius: 14px; border: 0; font-size: 1rem; font-weight: 700; }
    .btn.gold { background: var(--gold); color: var(--ink); }
    .btn.line { background: transparent; color: var(--text-primary); border: 1.5px solid var(--text-primary); }
    .btn:disabled { opacity: 0.5; }

    .c-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto 24px; gap: 16px; align-items: center; width: 100%; min-height: 56px; padding: 10px 0; border: 0; border-top: 1px solid var(--border-base); border-radius: 0; background: transparent; color: var(--text-primary); text-align: left; font-weight: 400; }
    .c-row:active { transform: none; }
    .c-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .c-num { display: flex; flex-direction: column; align-items: flex-end; }
    .c-title { margin: 0; font-family: var(--font-display); font-size: 1.5rem; font-weight: 800; }
    .link { align-self: flex-start; min-height: 40px; padding: 0; background: none; color: var(--success-text); font-weight: 700; font-size: 0.875rem; }
    .line-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border-base); }

    .ops-map { height: 320px; border-radius: 16px; overflow: hidden; border: 1px solid var(--border-base); }
    @media (min-width: 1100px) { .ops-map { height: 380px; } }
  `
})
export class OperationsPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(UnifiedAuthService);
  private readonly router = inject(Router);

  readonly stats = signal<CommunityStats[]>([]);
  readonly loading = signal(true);
  readonly selectedCommunity = signal<CommunityStats | null>(null);
  readonly communityHustlers = signal<BusinessProfile[]>([]);
  readonly hustlersLoading = signal(false);

  readonly authorized = computed(() => this.auth.isStaff());

  readonly today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  readonly awaiting = signal<ApplicantResponse[]>([]);
  readonly awaitingLoading = signal(true);
  readonly busyId = signal<string | null>(null);
  readonly actionError = signal('');
  readonly shopsLive = computed(() => this.stats().reduce((n, c) => n + (c.activeHustlers ?? 0), 0));
  readonly withAgents = computed(() => this.stats().reduce((n, c) =>
    n + ['CAPTURED', 'CALLING', 'INTERVIEW_SCHEDULED', 'INTERVIEWED'].reduce((m, st) => m + (c.stageBreakdown[st] ?? 0), 0), 0));

  // Merchants an agent has checked, waiting for the Hub Coordinator's final yes (D17)
  private loadAwaiting(): void {
    this.awaitingLoading.set(true);
    this.api.listApplicants(undefined, 'BUSINESS_VERIFICATION').subscribe({
      next: list => { this.awaiting.set([...list].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))); this.awaitingLoading.set(false); },
      error: () => this.awaitingLoading.set(false)
    });
  }

  approve(a: ApplicantResponse): void { this.decide(a, 'APPROVED'); }

  // Back to the agent's To visit list
  sendBack(a: ApplicantResponse): void { this.decide(a, 'INTERVIEWED'); }

  private decide(a: ApplicantResponse, stage: string): void {
    this.busyId.set(a.id);
    this.actionError.set('');
    this.api.updateApplicantStage(a.id, stage).subscribe({
      next: () => { this.busyId.set(null); this.awaiting.update(list => list.filter(x => x.id !== a.id)); },
      error: err => { this.busyId.set(null); this.actionError.set(err?.error?.message || 'That did not save. Try again.'); }
    });
  }

  private map: L.Map | null = null;

  ngOnInit(): void {
    const token = this.auth.getToken();
    if (!token) return;
    this.loadAwaiting();

    this.api.getOperationsStats(token).subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
        setTimeout(() => this.initMap(data), 0);
      },
      error: () => {
        this.loading.set(false);
        setTimeout(() => this.initMap([]), 0);
      }
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/marketplace']);
  }

  groupedStats(): { province: string; communities: CommunityStats[] }[] {
    const map = new Map<string, CommunityStats[]>();
    for (const c of this.stats()) {
      const key = c.province ?? 'Unknown Province';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).map(([province, communities]) => ({ province, communities }));
  }

  stageEntries(breakdown: { [key: string]: number | undefined }): { stage: string; count: number }[] {
    return Object.entries(breakdown)
      .filter(([, count]) => count !== undefined)
      .map(([stage, count]) => ({ stage, count: count! }));
  }

  selectCommunity(community: CommunityStats): void {
    this.selectedCommunity.set(community);
    this.communityHustlers.set([]);
    this.hustlersLoading.set(true);
    this.api.listHustlersByCommunity(community.communityId).subscribe({
      next: (hustlers) => { this.communityHustlers.set(hustlers); this.hustlersLoading.set(false); },
      error: () => this.hustlersLoading.set(false)
    });
  }

  clearSelectedCommunity(): void {
    this.selectedCommunity.set(null);
    this.communityHustlers.set([]);
  }

  private initMap(communities: CommunityStats[]): void {
    const el = document.getElementById('ops-map');
    if (!el) return;

    this.map = L.map('ops-map').setView([-27.85, 32.10], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        background:#E5A31D;border:3px solid #13251E;
        width:18px;height:18px;border-radius:50%;box-sizing:border-box;
        box-shadow:0 2px 6px rgba(0,0,0,0.3)">
      </div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    communities.forEach(c => {
      if (c.latitude && c.longitude) {
        L.marker([c.latitude, c.longitude], { icon })
          .addTo(this.map!)
          .bindPopup(`
            <strong>${c.communityName}</strong><br>
            Applicants: ${c.totalApplicants}<br>
            Active Hustlers: ${c.activeHustlers}
          `);
      }
    });
  }
}
