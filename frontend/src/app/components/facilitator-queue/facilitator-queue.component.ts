import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, HustlerApplication, Community, HustlerProfileUpdate, FacilitatorHustler, DriverResponse } from '../../services/api.service';

@Component({
  selector: 'app-facilitator-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <!-- TOP TABS -->
      <div class="top-tabs">
        <button [class.active]="fTab() === 'hustlers'" (click)="fTab.set('hustlers')">Hustlers</button>
        <button [class.active]="fTab() === 'applications'" (click)="fTab.set('applications')">Applications</button>
        <button [class.active]="fTab() === 'drivers'" (click)="loadDrivers(); fTab.set('drivers')">Drivers</button>
      </div>

      <!-- ===== HUSTLERS TAB ===== -->
      <ng-container *ngIf="fTab() === 'hustlers'">
        <p class="muted sub-heading">Active hustlers in this cohort — click a record to view details.</p>

        <div *ngIf="hustlersLoading()" class="muted">Loading hustlers…</div>

        <div class="hustler-list" *ngIf="!hustlersLoading()">
          <article
            *ngFor="let h of hustlers()"
            class="hustler-card"
            [class.expanded]="expandedHustler() === h.businessProfileId"
            (click)="toggleHustler(h.businessProfileId)"
          >
            <!-- SUMMARY ROW -->
            <div class="hc-summary">
              <div class="hc-main">
                <h3>{{ h.firstName }} {{ h.lastName }}</h3>
                <p class="muted small">{{ h.businessName }} &middot; {{ h.businessType }}</p>
                <p class="muted small">{{ h.communityName || 'No community' }}</p>
              </div>
              <div class="hc-right">
                <div class="profit-chip" [class.positive]="h.monthProfit >= 0" [class.negative]="h.monthProfit < 0">
                  <span class="profit-label">Month profit</span>
                  <span class="profit-val">R {{ h.monthProfit | number:'1.2-2' }}</span>
                </div>
                <span class="chevron">{{ expandedHustler() === h.businessProfileId ? '&#9650;' : '&#9660;' }}</span>
              </div>
            </div>

            <!-- EXPANDED DETAIL -->
            <div class="hc-detail" *ngIf="expandedHustler() === h.businessProfileId" (click)="$event.stopPropagation()">
              <!-- Sub-tabs -->
              <div class="sub-tabs">
                <button [class.active]="hSubTab() === 'finance'" (click)="hSubTab.set('finance')">Finances</button>
                <button [class.active]="hSubTab() === 'business'" (click)="hSubTab.set('business')">Business</button>
              </div>

              <!-- Finance sub-tab -->
              <div *ngIf="hSubTab() === 'finance'" class="finance-panel">
                <div class="stat-row">
                  <div class="stat-box">
                    <span class="stat-label">Month Income</span>
                    <span class="stat-val income">R {{ h.monthIncome | number:'1.2-2' }}</span>
                  </div>
                  <div class="stat-box">
                    <span class="stat-label">Month Expenses</span>
                    <span class="stat-val expense">R {{ h.monthExpenses | number:'1.2-2' }}</span>
                  </div>
                  <div class="stat-box">
                    <span class="stat-label">Month Profit</span>
                    <span class="stat-val" [class.income]="h.monthProfit >= 0" [class.expense]="h.monthProfit < 0">R {{ h.monthProfit | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>

              <!-- Business sub-tab -->
              <div *ngIf="hSubTab() === 'business'" class="business-panel">
                <div class="detail-grid">
                  <div class="detail-field"><span class="field-label">Community</span><span>{{ h.communityName || '—' }}</span></div>
                  <div class="detail-field"><span class="field-label">Operating area</span><span>{{ h.operatingArea || '—' }}</span></div>
                  <div class="detail-field span-2"><span class="field-label">Description</span><p>{{ h.description || '—' }}</p></div>
                  <div class="detail-field span-2"><span class="field-label">Target Customers</span><p>{{ h.targetCustomers || '—' }}</p></div>
                  <div class="detail-field span-2"><span class="field-label">Vision</span><p>{{ h.vision || '—' }}</p></div>
                  <div class="detail-field span-2"><span class="field-label">Mission / Support needed</span><p>{{ h.mission || '—' }}</p></div>
                </div>
              </div>

              <!-- FOOTER: Edit + Activate/Deactivate -->
              <div class="hc-footer">
                <button *ngIf="hEditingId() !== h.businessProfileId" class="btn btn-edit" (click)="startHEdit(h)">&#x270E; Edit business details</button>
                <button
                  class="btn"
                  [class.btn-deactivate]="h.active"
                  [class.btn-activate]="!h.active"
                  (click)="toggleActive(h)"
                  [disabled]="activeToggling() === h.businessProfileId"
                >
                  {{ activeToggling() === h.businessProfileId ? 'Saving…' : (h.active ? '⏸ Deactivate Hustler' : '▶ Activate Hustler') }}
                </button>
              </div>

              <!-- HUSTLER INLINE EDIT FORM -->
              <div class="edit-section" *ngIf="hEditingId() === h.businessProfileId">
                <p class="edit-heading">Edit business details</p>
                <div class="edit-grid">
                  <label class="span-2">
                    <span class="field-label">Community</span>
                    <select [(ngModel)]="hEditData.communityId" [ngModelOptions]="{standalone: true}">
                      <option value="">— keep current —</option>
                      <option *ngFor="let c of communities()" [value]="c.id">{{ c.name }}</option>
                    </select>
                  </label>
                  <label class="span-2">
                    <span class="field-label">Operating area</span>
                    <input [(ngModel)]="hEditData.operatingArea" [ngModelOptions]="{standalone: true}" />
                  </label>
                  <label class="span-2">
                    <span class="field-label">Description</span>
                    <textarea rows="3" [(ngModel)]="hEditData.description" [ngModelOptions]="{standalone: true}"></textarea>
                  </label>
                  <label class="span-2">
                    <span class="field-label">Target Customers</span>
                    <textarea rows="2" [(ngModel)]="hEditData.targetCustomers" [ngModelOptions]="{standalone: true}"></textarea>
                  </label>
                  <label class="span-2">
                    <span class="field-label">Vision</span>
                    <textarea rows="2" [(ngModel)]="hEditData.vision" [ngModelOptions]="{standalone: true}"></textarea>
                  </label>
                  <label class="span-2">
                    <span class="field-label">Mission / Support needed</span>
                    <textarea rows="2" [(ngModel)]="hEditData.mission" [ngModelOptions]="{standalone: true}"></textarea>
                  </label>
                </div>
                <p *ngIf="hEditError()" class="edit-error">{{ hEditError() }}</p>
                <div class="edit-actions">
                  <button class="btn approve" (click)="saveHEdit(h)" [disabled]="hEditSaving()">
                    {{ hEditSaving() ? 'Saving…' : '&#10003; Save changes' }}
                  </button>
                  <button class="btn btn-cancel" (click)="hEditingId.set(null)">Cancel</button>
                </div>
              </div>

              <!-- DEACTIVATE CONFIRM OVERLAY -->
              <div class="confirm-overlay" *ngIf="confirmingDeactivate() === h.businessProfileId">
                <div class="confirm-box">
                  <p class="confirm-title">Deactivate Hustler?</p>
                  <p class="confirm-msg">Are you sure you want to deactivate <strong>{{ h.firstName }} {{ h.lastName }}</strong> ({{ h.businessName }})?</p>
                  <div class="confirm-actions">
                    <button class="btn btn-deactivate" (click)="confirmDeactivate(h)">Yes, deactivate</button>
                    <button class="btn btn-cancel" (click)="confirmingDeactivate.set(null)">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <p *ngIf="hustlers().length === 0" class="muted empty-msg">No active hustlers found.</p>
        </div>
      </ng-container>

      <!-- ===== APPLICATIONS TAB ===== -->
      <ng-container *ngIf="fTab() === 'applications'">
        <header>
          <p class="eyebrow">Facilitator Queue</p>
          <h2>Review applications</h2>
          <p class="muted">Filter by community and status, then approve, reject, or reconsider.</p>
        </header>

        <div class="filters">
          <label>
            <span>Status</span>
            <select [(ngModel)]="selectedStatus" (change)="load()">
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
          <label>
            <span>Community</span>
            <select [(ngModel)]="selectedCommunity" (change)="load()">
              <option value="">All communities</option>
              <option *ngFor="let c of communities()" [value]="c.id">{{ c.name }}</option>
            </select>
          </label>
        </div>

        <p class="muted count" *ngIf="applications().length > 0">{{ applications().length }} application(s) found</p>

        <div class="queue" *ngIf="applications().length; else empty">
          <article *ngFor="let app of applications()" class="queue-card" [class.expanded]="expanded() === app.id">
            <!-- SUMMARY ROW -->
            <div class="card-summary" (click)="toggle(app.id)">
              <div class="card-main">
                <h3>{{ app.businessName }}</h3>
                <p class="muted">{{ app.firstName }} {{ app.lastName }} &middot; {{ app.businessType }}</p>
                <p class="muted small">{{ app.community?.name || 'No community' }} &middot; Submitted {{ app.submittedAt | date:'mediumDate' }}</p>
              </div>
              <div class="card-right">
                <span class="status-badge" [class]="'status-' + app.status.toLowerCase()">{{ app.status }}</span>
                <span class="chevron">{{ expanded() === app.id ? '&#9650;' : '&#9660;' }}</span>
              </div>
            </div>

            <!-- EXPANDED DETAIL -->
            <div class="card-detail" *ngIf="expanded() === app.id">
              <div class="detail-grid">
                <div class="detail-field"><span class="field-label">Phone</span><span>{{ app.phone || '—' }}</span></div>
                <div class="detail-field"><span class="field-label">Email</span><span>{{ app.email || '—' }}</span></div>
                <div class="detail-field"><span class="field-label">ID No.</span><span>{{ app.idNumber || '—' }}</span></div>
                <div class="detail-field"><span class="field-label">Community</span><span>{{ app.community?.name || '—' }}</span></div>
                <div class="detail-field span-2"><span class="field-label">Operating area</span><span>{{ app.operatingArea || '—' }}</span></div>
                <div class="detail-field span-2"><span class="field-label">Description</span><p>{{ app.description }}</p></div>
                <div class="detail-field span-2"><span class="field-label">Target Customers</span><p>{{ app.targetCustomers }}</p></div>
                <div class="detail-field span-2"><span class="field-label">Vision</span><p>{{ app.vision }}</p></div>
                <div class="detail-field span-2"><span class="field-label">Mission / Support needed</span><p>{{ app.mission }}</p></div>
              </div>

              <label class="notes-label">
                <span>Facilitator notes</span>
                <textarea rows="3" [(ngModel)]="notes[app.id]" placeholder="Leave a note…"></textarea>
              </label>

              <div class="actions">
                <ng-container *ngIf="app.status === 'PENDING'">
                  <button class="btn approve" (click)="decide(app, 'APPROVED')">&#10003; Approve</button>
                  <button class="btn reject" (click)="decide(app, 'REJECTED')">&#10005; Reject</button>
                </ng-container>
                <ng-container *ngIf="app.status === 'REJECTED'">
                  <span class="status-badge status-rejected">Rejected</span>
                  <button class="btn approve" (click)="decide(app, 'APPROVED')">&#8629; Reconsider &amp; Approve</button>
                </ng-container>
                <ng-container *ngIf="app.status === 'APPROVED'">
                  <span class="status-badge status-approved">Approved</span>
                  <button class="btn reject" (click)="decide(app, 'REJECTED')">Revoke</button>
                </ng-container>
              </div>

              <!-- EDIT SECTION — footer, toggled -->
              <ng-container *ngIf="app.status === 'APPROVED'">
                <div class="edit-footer">
                  <button *ngIf="editingId() !== app.id" class="btn edit" (click)="startEdit(app)">&#x270E; Edit business details</button>
                </div>

                <div class="edit-section" *ngIf="editingId() === app.id">
                  <p class="edit-heading">Edit business details</p>
                  <div class="edit-grid">
                    <label class="span-2">
                      <span class="field-label">Community</span>
                      <select [(ngModel)]="editData.communityId" [ngModelOptions]="{standalone: true}">
                        <option value="">— keep current —</option>
                        <option *ngFor="let c of communities()" [value]="c.id">{{ c.name }}</option>
                      </select>
                    </label>
                    <label class="span-2">
                      <span class="field-label">Operating area</span>
                      <input [(ngModel)]="editData.operatingArea" [ngModelOptions]="{standalone: true}" />
                    </label>
                    <label class="span-2">
                      <span class="field-label">Description</span>
                      <textarea rows="3" [(ngModel)]="editData.description" [ngModelOptions]="{standalone: true}"></textarea>
                    </label>
                    <label class="span-2">
                      <span class="field-label">Target Customers</span>
                      <textarea rows="2" [(ngModel)]="editData.targetCustomers" [ngModelOptions]="{standalone: true}"></textarea>
                    </label>
                    <label class="span-2">
                      <span class="field-label">Vision</span>
                      <textarea rows="2" [(ngModel)]="editData.vision" [ngModelOptions]="{standalone: true}"></textarea>
                    </label>
                    <label class="span-2">
                      <span class="field-label">Mission / Support needed</span>
                      <textarea rows="2" [(ngModel)]="editData.mission" [ngModelOptions]="{standalone: true}"></textarea>
                    </label>
                  </div>
                  <p *ngIf="editError()" class="edit-error">{{ editError() }}</p>
                  <div class="edit-actions">
                    <button class="btn approve" (click)="saveEdit(app)" [disabled]="editSaving()">
                      {{ editSaving() ? 'Saving…' : '&#10003; Save changes' }}
                    </button>
                    <button class="btn neutral" (click)="cancelEdit()">Cancel</button>
                  </div>
                </div>
              </ng-container>
            </div>
          </article>
        </div>

        <ng-template #empty>
          <p class="muted empty-msg">No applications found.</p>
        </ng-template>
      </ng-container>

      <!-- ===== DRIVERS TAB ===== -->
      <ng-container *ngIf="fTab() === 'drivers'">
        <p class="muted sub-heading">All registered drivers — approve, suspend, or reinstate.</p>

        <div *ngIf="driversLoading()" class="muted">Loading drivers…</div>

        <div class="driver-list" *ngIf="!driversLoading()">
          <article *ngFor="let d of drivers()" class="driver-card">
            <div class="driver-row">
              <div class="driver-main">
                <h3>{{ d.firstName }} {{ d.lastName }}</h3>
                <p class="muted small">{{ d.phone }} &middot; {{ d.vehicleType }}</p>
                <p class="muted small">{{ d.communityName }}</p>
              </div>
              <div class="driver-right">
                <span class="status-badge"
                  [class.status-pending]="d.status === 'PENDING'"
                  [class.status-approved]="d.status === 'ACTIVE'"
                  [class.status-rejected]="d.status === 'SUSPENDED'">
                  {{ d.status }}
                </span>
              </div>
            </div>
            <div class="driver-actions">
              <button *ngIf="d.status === 'PENDING'" class="btn approve" (click)="approveDriver(d)" [disabled]="driverActionId() === d.driverId">
                {{ driverActionId() === d.driverId ? 'Saving…' : '✓ Approve' }}
              </button>
              <button *ngIf="d.status === 'ACTIVE'" class="btn reject" (click)="suspendDriver(d)" [disabled]="driverActionId() === d.driverId">
                {{ driverActionId() === d.driverId ? 'Saving…' : '⏸ Suspend' }}
              </button>
              <button *ngIf="d.status === 'SUSPENDED'" class="btn approve" (click)="reinstateDriver(d)" [disabled]="driverActionId() === d.driverId">
                {{ driverActionId() === d.driverId ? 'Saving…' : '▶ Reinstate' }}
              </button>
            </div>
          </article>
          <p *ngIf="drivers().length === 0" class="muted empty-msg">No drivers registered yet.</p>
        </div>
      </ng-container>
    </section>
  `,
  styles: `
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 4px 24px rgba(28,25,23,0.08); border: 1px solid #E7E5E4; }
    @media (max-width: 600px) { .card { padding: 1.25rem; border-radius: 1rem; } }

    /* Top-level tabs */
    .top-tabs { display: flex; border-bottom: 2px solid #E7E5E4; margin-bottom: 1.5rem; }
    .top-tabs button { flex: 1; padding: 0.85rem 1rem; border: none; background: none; font-size: 1rem; font-weight: 700; color: #A8A29E; cursor: pointer; transition: all 0.2s; font-family: inherit; min-height: 48px; }
    .top-tabs button.active { color: #1C1917; border-bottom: 2px solid #F5B800; margin-bottom: -2px; }

    .sub-heading { margin: 0 0 1.25rem; font-size: 0.9rem; color: #78716C; }

    /* Hustler list */
    .hustler-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .hustler-card { border: 1px solid #E7E5E4; border-radius: 1rem; overflow: hidden; background: #FAFAF9; cursor: pointer; }
    .hustler-card.expanded { border-color: #F5B800; box-shadow: 0 0 0 2px rgba(245,184,0,0.2); }
    .hc-summary { display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem 1.25rem; gap: 1rem; }
    .hc-summary:hover { background: rgba(245,184,0,0.04); }
    .hc-main h3 { margin: 0 0 0.2rem; font-size: 1rem; font-weight: 800; color: #1C1917; }
    .hc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
    .profit-chip { display: flex; flex-direction: column; align-items: flex-end; padding: 0.35rem 0.75rem; border-radius: 0.75rem; }
    .profit-chip.positive { background: rgba(45,179,68,0.1); }
    .profit-chip.negative { background: rgba(229,57,53,0.08); }
    .profit-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #A8A29E; }
    .profit-val { font-size: 0.95rem; font-weight: 800; }
    .profit-chip.positive .profit-val { color: #2DB344; }
    .profit-chip.negative .profit-val { color: #E53935; }

    /* Hustler expanded detail */
    .hc-detail { border-top: 1px solid #E7E5E4; padding: 1rem 1.25rem; }
    .sub-tabs { display: flex; gap: 0; border-bottom: 1px solid #E7E5E4; margin-bottom: 1rem; }
    .sub-tabs button { padding: 0.5rem 1.25rem; border: none; background: none; font-size: 0.9rem; font-weight: 700; color: #A8A29E; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; }
    .sub-tabs button.active { color: #1C1917; border-bottom-color: #F5B800; }

    .stat-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .stat-box { flex: 1; min-width: 100px; background: #FAFAF9; border-radius: 0.75rem; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; border: 1px solid #E7E5E4; }
    .stat-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #A8A29E; }
    .stat-val { font-size: 1rem; font-weight: 800; color: #1C1917; }
    .stat-val.income { color: #2DB344; }
    .stat-val.expense { color: #E53935; }

    /* Applications tab shared */
    .filters { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1.25rem 0; }
    .filters label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 700; color: #1C1917; min-width: 160px; }
    select { border-radius: 0.75rem; border: 2px solid #E7E5E4; padding: 0.5rem 0.75rem; font-size: 0.95rem; font-family: inherit; background: white; color: #1C1917; outline: none; }
    select:focus { border-color: #F5B800; }
    .count { margin-bottom: 1rem; font-size: 0.85rem; color: #78716C; }
    .queue { display: flex; flex-direction: column; gap: 0.75rem; }
    .queue-card { border: 1px solid #E7E5E4; border-radius: 1rem; overflow: hidden; background: #FAFAF9; }
    .queue-card.expanded { border-color: #F5B800; box-shadow: 0 0 0 2px rgba(245,184,0,0.2); }
    .card-summary { display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem 1.25rem; cursor: pointer; gap: 1rem; }
    .card-summary:hover { background: rgba(245,184,0,0.04); }
    .card-main h3 { margin: 0 0 0.2rem; font-size: 1rem; font-weight: 800; color: #1C1917; }
    .card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
    .chevron { font-size: 0.8rem; color: #A8A29E; }
    .small { font-size: 0.8rem; color: #78716C; }
    .status-badge { display: inline-block; padding: 0.2rem 0.7rem; border-radius: 999px; font-size: 0.75rem; font-weight: 800; }
    .status-pending { background: rgba(245,184,0,0.15); color: #92620A; }
    .status-approved { background: rgba(45,179,68,0.12); color: #166534; }
    .status-rejected { background: rgba(229,57,53,0.1); color: #E53935; }
    .card-detail { padding: 0 1.25rem 1.25rem; border-top: 1px solid #E7E5E4; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 1rem 0; }
    @media (max-width: 600px) { .detail-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
    .detail-field { display: flex; flex-direction: column; gap: 0.2rem; }
    .detail-field.span-2 { grid-column: span 2; }
    .field-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #A8A29E; }
    .detail-field p { margin: 0; color: #1C1917; line-height: 1.5; }
    .notes-label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; font-weight: 700; color: #1C1917; margin: 0.75rem 0; }
    textarea { border-radius: 0.75rem; border: 2px solid #E7E5E4; padding: 0.65rem 0.9rem; font-size: 0.95rem; font-family: inherit; width: 100%; box-sizing: border-box; resize: vertical; outline: none; }
    textarea:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem; align-items: center; }
    .btn { border: none; padding: 0.5rem 1.1rem; border-radius: 999px; font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit; min-height: 40px; transition: opacity 0.15s; }
    .btn:hover { opacity: 0.85; }
    .approve { background: #2DB344; color: white; }
    .reject { background: #E53935; color: white; }
    .empty-msg { margin-top: 1rem; color: #78716C; }
    .edit-footer { margin: 1rem 0 0; border-top: 1px dashed #E7E5E4; padding-top: 0.75rem; }
    .btn.edit { background: #F5B800; color: #1C1917; }
    .btn.neutral { background: #F5F0E8; color: #78716C; }
    .edit-section { background: rgba(245,184,0,0.04); border: 1px solid rgba(245,184,0,0.25); border-radius: 0.75rem; padding: 1rem; margin: 0.75rem 0; }
    .edit-heading { margin: 0 0 0.75rem; font-weight: 800; font-size: 0.9rem; color: #92620A; }
    .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 600px) { .edit-grid { grid-template-columns: 1fr; } .edit-grid .span-2 { grid-column: span 1; } }
    .edit-grid label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 700; color: #1C1917; }
    .edit-grid label.span-2 { grid-column: span 2; }
    .edit-grid input, .edit-grid textarea, .edit-grid select { border-radius: 0.6rem; border: 2px solid #E7E5E4; padding: 0.5rem 0.75rem; font-size: 0.9rem; font-family: inherit; width: 100%; box-sizing: border-box; background: white; outline: none; }
    .edit-grid input:focus, .edit-grid textarea:focus, .edit-grid select:focus { border-color: #F5B800; }
    .edit-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
    .edit-error { color: #E53935; font-size: 0.85rem; margin: 0.5rem 0 0; font-weight: 700; }

    /* Activate / Deactivate footer */
    .hc-footer { border-top: 1px dashed #E7E5E4; padding-top: 0.75rem; margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-edit { background: #F5B800; color: #1C1917; }
    .btn-deactivate { background: #E53935; color: white; }
    .btn-activate { background: #2DB344; color: white; }
    .btn-cancel { background: #F5F0E8; color: #78716C; }

    /* Confirm overlay */
    .confirm-overlay { position: relative; margin-top: 0.5rem; }
    .confirm-box { background: rgba(240,104,32,0.05); border: 1px solid rgba(240,104,32,0.25); border-radius: 0.75rem; padding: 1rem 1.25rem; }
    .confirm-title { font-weight: 800; font-size: 1rem; margin: 0 0 0.4rem; color: #F06820; }
    .confirm-msg { font-size: 0.9rem; color: #1C1917; margin: 0 0 0.75rem; }
    .confirm-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

    /* Drivers tab */
    .driver-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .driver-card { border: 1px solid #E7E5E4; border-radius: 1rem; background: #FAFAF9; padding: 1rem 1.25rem; }
    .driver-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem; }
    .driver-main h3 { margin: 0 0 0.2rem; font-size: 1rem; font-weight: 800; color: #1C1917; }
    .driver-right { flex-shrink: 0; }
    .driver-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  `
})
export class FacilitatorQueueComponent implements OnInit {
  private readonly api = inject(ApiService);

  // Top-level tab
  fTab = signal<'hustlers' | 'applications' | 'drivers'>('hustlers');

  // Drivers tab state
  drivers = signal<DriverResponse[]>([]);
  driversLoading = signal(false);
  driverActionId = signal<string | null>(null);

  // Hustlers tab state
  hustlers = signal<FacilitatorHustler[]>([]);
  hustlersLoading = signal(false);
  expandedHustler = signal<string | null>(null);
  hSubTab = signal<'finance' | 'business'>('finance');
  confirmingDeactivate = signal<string | null>(null);
  activeToggling = signal<string | null>(null);
  hEditingId = signal<string | null>(null);
  hEditData: HustlerProfileUpdate = {};
  hEditSaving = signal(false);
  hEditError = signal('');

  // Applications tab state
  applications = signal<HustlerApplication[]>([]);
  communities = signal<Community[]>([]);
  selectedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
  selectedCommunity = '';
  expanded = signal<string | null>(null);
  notes: Record<string, string> = {};

  // Inline edit state
  editingId = signal<string | null>(null);
  editData: HustlerProfileUpdate = {};
  editSaving = signal(false);
  editError = signal('');

  ngOnInit(): void {
    this.api.listCommunities().subscribe(c => this.communities.set(c));
    this.load();
    this.loadHustlers();
  }

  loadHustlers(): void {
    this.hustlersLoading.set(true);
    this.api.listFacilitatorHustlers().subscribe({
      next: (list) => { this.hustlers.set(list); this.hustlersLoading.set(false); },
      error: () => this.hustlersLoading.set(false)
    });
  }

  toggleHustler(id: string): void {
    if (this.expandedHustler() === id) {
      this.expandedHustler.set(null);
      this.confirmingDeactivate.set(null);
      this.hEditingId.set(null);
    } else {
      this.expandedHustler.set(id);
      this.hSubTab.set('finance');
      this.confirmingDeactivate.set(null);
      this.hEditingId.set(null);
    }
  }

  startHEdit(h: FacilitatorHustler): void {
    this.hEditingId.set(h.businessProfileId);
    this.hEditData = {
      description: h.description ?? '',
      targetCustomers: h.targetCustomers ?? '',
      vision: h.vision ?? '',
      mission: h.mission ?? '',
      operatingArea: h.operatingArea ?? '',
      communityId: h.communityId ?? '',
    };
    this.hEditError.set('');
  }

  saveHEdit(h: FacilitatorHustler): void {
    if (!h.applicationId) return;
    this.hEditSaving.set(true);
    this.hEditError.set('');
    const payload: HustlerProfileUpdate = {
      description: this.hEditData.description || undefined,
      targetCustomers: this.hEditData.targetCustomers || undefined,
      vision: this.hEditData.vision || undefined,
      mission: this.hEditData.mission || undefined,
      operatingArea: this.hEditData.operatingArea || undefined,
      communityId: this.hEditData.communityId || undefined,
    };
    this.api.updateHustlerProfile(h.applicationId, payload).subscribe({
      next: () => {
        // Reload hustlers to pick up the updated fields
        this.hEditingId.set(null);
        this.hEditSaving.set(false);
        this.loadHustlers();
      },
      error: (err) => {
        this.hEditSaving.set(false);
        this.hEditError.set(err?.error?.message || 'Failed to save changes.');
      }
    });
  }

  toggleActive(h: FacilitatorHustler): void {
    if (h.active) {
      // Show confirmation before deactivating
      this.confirmingDeactivate.set(h.businessProfileId);
    } else {
      // Activate immediately
      this.doSetActive(h, true);
    }
  }

  confirmDeactivate(h: FacilitatorHustler): void {
    this.confirmingDeactivate.set(null);
    this.doSetActive(h, false);
  }

  private doSetActive(h: FacilitatorHustler, active: boolean): void {
    this.activeToggling.set(h.businessProfileId);
    this.api.setHustlerActive(h.businessProfileId, active).subscribe({
      next: (updated) => {
        this.hustlers.update(list => list.map(x =>
          x.businessProfileId === updated.businessProfileId ? updated : x
        ));
        this.activeToggling.set(null);
      },
      error: () => this.activeToggling.set(null)
    });
  }

  load(): void {
    this.api.listApplications(this.selectedStatus, this.selectedCommunity || undefined)
      .subscribe(apps => this.applications.set(apps));
  }

  toggle(id: string): void {
    this.expanded.set(this.expanded() === id ? null : id);
  }

  decide(app: HustlerApplication, status: 'APPROVED' | 'REJECTED'): void {
    this.api.decideApplication(app.id, { status, facilitatorNotes: this.notes[app.id] })
      .subscribe(() => this.load());
  }

  startEdit(app: HustlerApplication): void {
    this.editingId.set(app.id);
    this.editData = {
      description: app.description ?? '',
      targetCustomers: app.targetCustomers ?? '',
      vision: app.vision ?? '',
      mission: app.mission ?? '',
      operatingArea: app.operatingArea ?? '',
      communityId: app.community?.id ?? '',
    };
    this.editError.set('');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editError.set('');
  }

  saveEdit(app: HustlerApplication): void {
    this.editSaving.set(true);
    this.editError.set('');
    const payload: HustlerProfileUpdate = {
      description: this.editData.description || undefined,
      targetCustomers: this.editData.targetCustomers || undefined,
      vision: this.editData.vision || undefined,
      mission: this.editData.mission || undefined,
      operatingArea: this.editData.operatingArea || undefined,
      communityId: this.editData.communityId || undefined,
    };
    this.api.updateHustlerProfile(app.id, payload).subscribe({
      next: (updated) => {
        this.applications.update(list => list.map(a => a.id === updated.id ? updated : a));
        this.editingId.set(null);
        this.editSaving.set(false);
      },
      error: (err) => {
        this.editSaving.set(false);
        this.editError.set(err?.error?.message || 'Failed to save changes.');
      }
    });
  }

  loadDrivers(): void {
    this.driversLoading.set(true);
    this.api.listFacilitatorDrivers().subscribe({
      next: (list) => { this.drivers.set(list); this.driversLoading.set(false); },
      error: () => this.driversLoading.set(false)
    });
  }

  approveDriver(d: DriverResponse): void {
    this.driverActionId.set(d.driverId);
    this.api.setDriverStatus(d.driverId, 'ACTIVE').subscribe({
      next: (updated) => {
        this.drivers.update(list => list.map(x => x.driverId === updated.driverId ? updated : x));
        this.driverActionId.set(null);
      },
      error: () => this.driverActionId.set(null)
    });
  }

  suspendDriver(d: DriverResponse): void {
    this.driverActionId.set(d.driverId);
    this.api.setDriverStatus(d.driverId, 'SUSPENDED').subscribe({
      next: (updated) => {
        this.drivers.update(list => list.map(x => x.driverId === updated.driverId ? updated : x));
        this.driverActionId.set(null);
      },
      error: () => this.driverActionId.set(null)
    });
  }

  reinstateDriver(d: DriverResponse): void {
    this.driverActionId.set(d.driverId);
    this.api.setDriverStatus(d.driverId, 'ACTIVE').subscribe({
      next: (updated) => {
        this.drivers.update(list => list.map(x => x.driverId === updated.driverId ? updated : x));
        this.driverActionId.set(null);
      },
      error: () => this.driverActionId.set(null)
    });
  }
}
