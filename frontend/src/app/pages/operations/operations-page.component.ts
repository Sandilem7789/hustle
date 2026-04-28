import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, CommunityStats, BusinessProfile } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-operations-page',
  standalone: true,
  imports: [CommonModule, LoginGateComponent],
  template: `
    <app-login-gate *ngIf="!authorized()"
      icon="🗺️"
      title="Operations Sign In"
      subtitle="This section is for facilitators and coordinators."
      [requiredRoles]="['FACILITATOR','COORDINATOR']"
    ></app-login-gate>

    <div class="ops-shell" *ngIf="authorized()">

      <!-- Header -->
      <div class="ops-header">
        <h1 class="ops-title">Operations</h1>
        <p class="ops-subtitle">Community performance and GIS mapping</p>
      </div>

      <!-- Community Analytics — grouped by province -->
      <section class="ops-section">
        <h2 class="section-title">Community Analytics</h2>
        <div *ngIf="loading()" class="loading-state">Loading stats…</div>

        <!-- Detail view for a selected community -->
        <ng-container *ngIf="!loading() && selectedCommunity()">
          <div class="detail-back-row">
            <button class="back-btn" (click)="clearSelectedCommunity()">← Back</button>
            <span class="detail-title">{{ selectedCommunity()!.communityName }}</span>
          </div>

          <!-- Stats summary -->
          <div class="stat-row detail-stats">
            <div class="stat">
              <span class="stat-val">{{ selectedCommunity()!.totalApplicants }}</span>
              <span class="stat-label">Applicants</span>
            </div>
            <div class="stat">
              <span class="stat-val approved">{{ selectedCommunity()!.stageBreakdown['APPROVED'] ?? 0 }}</span>
              <span class="stat-label">Approved</span>
            </div>
            <div class="stat">
              <span class="stat-val active">{{ selectedCommunity()!.activeHustlers }}</span>
              <span class="stat-label">Active Hustlers</span>
            </div>
          </div>

          <!-- Pipeline bar -->
          <div class="pipeline-bar detail-pipeline">
            <div *ngFor="let entry of stageEntries(selectedCommunity()!.stageBreakdown)"
                 [title]="entry.stage + ': ' + entry.count"
                 [style.flex]="entry.count"
                 [class]="'stage-' + entry.stage.toLowerCase()">
            </div>
          </div>
          <div class="stage-legend" style="margin-bottom:1.25rem">
            <span *ngFor="let entry of stageEntries(selectedCommunity()!.stageBreakdown)" class="legend-item">
              <span class="legend-dot" [class]="'stage-' + entry.stage.toLowerCase()"></span>
              {{ entry.stage | titlecase }}: {{ entry.count }}
            </span>
          </div>

          <!-- Active hustlers list -->
          <div class="hustlers-list-title">Active Hustlers</div>
          <div *ngIf="hustlersLoading()" class="loading-state">Loading hustlers…</div>
          <div *ngIf="!hustlersLoading() && communityHustlers().length === 0" class="loading-state">No active hustlers in this community yet.</div>
          <div class="hustler-list" *ngIf="!hustlersLoading() && communityHustlers().length > 0">
            <div *ngFor="let h of communityHustlers()" class="hustler-row">
              <div class="hustler-info">
                <span class="hustler-name">{{ h.businessName }}</span>
                <span class="hustler-type">{{ h.businessType }}</span>
              </div>
              <span class="hustler-area" *ngIf="h.operatingArea">{{ h.operatingArea }}</span>
            </div>
          </div>
        </ng-container>

        <!-- Community grid -->
        <ng-container *ngIf="!loading() && !selectedCommunity()">
          <div *ngFor="let group of groupedStats()" class="province-group">
            <div class="province-header">
              <span class="province-name">{{ group.province }}</span>
              <span class="province-count">{{ group.communities.length }} {{ group.communities.length === 1 ? 'community' : 'communities' }}</span>
            </div>
            <div class="community-grid">
              <div *ngFor="let c of group.communities"
                   class="community-card clickable-card"
                   (click)="selectCommunity(c)"
                   role="button"
                   tabindex="0"
                   (keydown.enter)="selectCommunity(c)">
                <div class="card-header">
                  <span class="community-name">{{ c.communityName }}</span>
                  <span class="chevron">›</span>
                </div>
                <div class="stat-row">
                  <div class="stat">
                    <span class="stat-val">{{ c.totalApplicants }}</span>
                    <span class="stat-label">Applicants</span>
                  </div>
                  <div class="stat">
                    <span class="stat-val approved">{{ c.stageBreakdown['APPROVED'] ?? 0 }}</span>
                    <span class="stat-label">Approved</span>
                  </div>
                  <div class="stat">
                    <span class="stat-val active">{{ c.activeHustlers }}</span>
                    <span class="stat-label">Active Hustlers</span>
                  </div>
                </div>
                <div class="pipeline-bar">
                  <div *ngFor="let entry of stageEntries(c.stageBreakdown)"
                       [title]="entry.stage + ': ' + entry.count"
                       [style.flex]="entry.count"
                       [class]="'stage-' + entry.stage.toLowerCase()">
                  </div>
                </div>
                <div class="stage-legend">
                  <span *ngFor="let entry of stageEntries(c.stageBreakdown)" class="legend-item">
                    <span class="legend-dot" [class]="'stage-' + entry.stage.toLowerCase()"></span>
                    {{ entry.stage | titlecase }}: {{ entry.count }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ng-container>
      </section>

      <!-- GIS Map -->
      <section class="ops-section">
        <h2 class="section-title">GIS — Community Locations</h2>
        <div id="ops-map" class="ops-map"></div>
        <p class="map-note">Coordinates are approximate — update via community settings once field-verified.</p>
      </section>

      <!-- Sign Out -->
      <div class="signout-row">
        <button class="signout-btn" (click)="logout()">Sign Out</button>
      </div>

    </div>
  `,
  styles: `
    .signout-row {
      display: flex;
      justify-content: center;
      padding: 2rem 0 1rem;
    }
    .signout-btn {
      border: 1.5px solid #E7E5E4;
      background: none;
      color: #A8A29E;
      border-radius: 999px;
      padding: 0.6rem 2rem;
      font-size: 0.875rem;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      min-height: 48px;
      transition: border-color 0.15s, color 0.15s;
    }
    .signout-btn:hover { border-color: #E53935; color: #E53935; }

    .ops-shell {
      max-width: 960px;
      margin: 0 auto;
      padding: 1rem;
    }

    .ops-header {
      padding: 1.25rem 0 0.5rem;
      border-bottom: 2px solid #E7E5E4;
      margin-bottom: 1.5rem;
    }
    .ops-title {
      font-size: 1.5rem;
      font-weight: 900;
      color: #1C1917;
      margin: 0 0 0.25rem;
    }
    .ops-subtitle {
      font-size: 0.875rem;
      color: #78716C;
      margin: 0;
    }

    .ops-section {
      margin-bottom: 2rem;
    }
    .section-title {
      font-size: 1rem;
      font-weight: 800;
      color: #1C1917;
      margin: 0 0 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .section-desc {
      font-size: 0.875rem;
      color: #78716C;
      margin: 0 0 0.75rem;
    }

    .loading-state {
      color: #A8A29E;
      font-size: 0.875rem;
      padding: 1rem 0;
    }

    /* ── Province grouping ── */
    .province-group {
      margin-bottom: 1.5rem;
    }
    .province-header {
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.4rem;
      border-bottom: 2px solid #F5B800;
    }
    .province-name {
      font-size: 0.9375rem;
      font-weight: 900;
      color: #1C1917;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .province-count {
      font-size: 0.75rem;
      font-weight: 700;
      color: #A8A29E;
    }

    /* ── Community Cards ── */
    .community-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: 1fr;
    }
    .community-card {
      background: #fff;
      border: 1px solid #E7E5E4;
      border-radius: 1rem;
      padding: 1rem;
      box-shadow: 0 2px 8px rgba(28,25,23,0.05);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .community-name {
      font-size: 1rem;
      font-weight: 800;
      color: #1C1917;
    }
    .region-badge {
      font-size: 0.7rem;
      font-weight: 700;
      background: #F5F5F4;
      color: #78716C;
      border-radius: 999px;
      padding: 0.2rem 0.6rem;
    }
    .stat-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .stat {
      flex: 1;
      background: #FAFAF9;
      border-radius: 0.75rem;
      padding: 0.6rem 0.5rem;
      text-align: center;
    }
    .stat-val {
      display: block;
      font-size: 1.375rem;
      font-weight: 900;
      color: #1C1917;
    }
    .stat-val.approved { color: #2DB344; }
    .stat-val.active { color: #1B6FD4; }
    .stat-label {
      display: block;
      font-size: 0.6875rem;
      font-weight: 700;
      color: #A8A29E;
      margin-top: 0.1rem;
    }

    /* ── Pipeline bar ── */
    .pipeline-bar {
      display: flex;
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: #F5F5F4;
      margin-bottom: 0.5rem;
    }
    .pipeline-bar [class*="stage-"] { min-width: 4px; }
    .stage-captured       { background: #A8A29E; }
    .stage-calling        { background: #F5B800; }
    .stage-interview_scheduled { background: #F06820; }
    .stage-interviewed    { background: #8B2FC9; }
    .stage-business_verification { background: #00A896; }
    .stage-approved       { background: #2DB344; }
    .stage-rejected       { background: #E91E8C; }

    .stage-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.625rem;
      font-weight: 700;
      color: #78716C;
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }

    /* ── GIS Map ── */
    .ops-map {
      height: 320px;
      border-radius: 1rem;
      overflow: hidden;
      border: 1px solid #E7E5E4;
      z-index: 1;
    }
    .map-note {
      font-size: 0.75rem;
      color: #A8A29E;
      margin: 0.5rem 0 0;
      font-style: italic;
    }

    /* ── Clickable card ── */
    .clickable-card {
      cursor: pointer;
      transition: box-shadow 0.15s, transform 0.15s;
    }
    .clickable-card:hover {
      box-shadow: 0 6px 20px rgba(28,25,23,0.12);
      transform: translateY(-1px);
    }
    .clickable-card:active { transform: translateY(0); }
    .chevron {
      font-size: 1.25rem;
      color: #A8A29E;
      line-height: 1;
    }

    /* ── Community detail view ── */
    .detail-back-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .back-btn {
      border: 1.5px solid #E7E5E4;
      background: none;
      color: #78716C;
      border-radius: 999px;
      padding: 0.4rem 1rem;
      font-size: 0.8125rem;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      min-height: 40px;
      transition: border-color 0.15s, color 0.15s;
    }
    .back-btn:hover { border-color: #1C1917; color: #1C1917; }
    .detail-title {
      font-size: 1.125rem;
      font-weight: 900;
      color: #1C1917;
    }
    .detail-stats { margin-bottom: 0.75rem; }
    .detail-pipeline { margin-bottom: 0.5rem; height: 10px; }

    /* ── Hustler list ── */
    .hustlers-list-title {
      font-size: 0.8125rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #A8A29E;
      margin-bottom: 0.75rem;
    }
    .hustler-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .hustler-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #FAFAF9;
      border: 1px solid #E7E5E4;
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      gap: 0.5rem;
    }
    .hustler-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .hustler-name {
      font-size: 0.9375rem;
      font-weight: 800;
      color: #1C1917;
    }
    .hustler-type {
      font-size: 0.75rem;
      color: #78716C;
      font-weight: 600;
    }
    .hustler-area {
      font-size: 0.75rem;
      color: #A8A29E;
      font-weight: 600;
      text-align: right;
    }

    @media (min-width: 640px) {
      .community-grid { grid-template-columns: repeat(2, 1fr); }
      .ops-map { height: 420px; }
    }
    @media (min-width: 960px) {
      .community-grid { grid-template-columns: repeat(3, 1fr); }
    }
  `
})
export class OperationsPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly stats = signal<CommunityStats[]>([]);
  readonly loading = signal(true);
  readonly selectedCommunity = signal<CommunityStats | null>(null);
  readonly communityHustlers = signal<BusinessProfile[]>([]);
  readonly hustlersLoading = signal(false);

  readonly authorized = computed(() => {
    const r = this.auth.state()?.role;
    return r === 'FACILITATOR' || r === 'COORDINATOR';
  });

  private map: L.Map | null = null;

  ngOnInit(): void {
    const token = this.auth.getToken();
    if (!token) return;

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
        background:#F5B800;border:2px solid #1C1917;
        width:12px;height:12px;border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,0.3)">
      </div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
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
