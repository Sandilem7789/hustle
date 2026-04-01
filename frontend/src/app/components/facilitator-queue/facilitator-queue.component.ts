import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, HustlerApplication, Community, HustlerProfileUpdate } from '../../services/api.service';

@Component({
  selector: 'app-facilitator-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
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

            <!-- DETAIL FIELDS (always visible) -->
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

            <!-- STATUS ACTIONS -->
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
    </section>
  `,
  styles: `
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 25px 60px rgba(15,23,42,0.12); }
    @media (max-width: 600px) { .card { padding: 1.25rem; } }
    .filters { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1.25rem 0; }
    .filters label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; color: #475569; min-width: 160px; }
    select { border-radius: 0.8rem; border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; font-size: 0.95rem; font-family: inherit; background: white; }
    .count { margin-bottom: 1rem; font-size: 0.85rem; }
    .queue { display: flex; flex-direction: column; gap: 0.75rem; }
    .queue-card { border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; background: #f8fafc; }
    .queue-card.expanded { border-color: #0ea5e9; }
    .card-summary { display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem 1.25rem; cursor: pointer; gap: 1rem; }
    .card-summary:hover { background: #f0f9ff; }
    .card-main h3 { margin: 0 0 0.2rem; font-size: 1rem; }
    .card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
    .chevron { font-size: 0.8rem; color: #94a3b8; }
    .small { font-size: 0.8rem; }
    .status-badge { display: inline-block; padding: 0.2rem 0.7rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
    .status-pending { background: #fef9c3; color: #a16207; }
    .status-approved { background: #dcfce7; color: #16a34a; }
    .status-rejected { background: #fee2e2; color: #dc2626; }
    .card-detail { padding: 0 1.25rem 1.25rem; border-top: 1px solid #e2e8f0; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 1rem 0; }
    @media (max-width: 600px) { .detail-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1; } }
    .detail-field { display: flex; flex-direction: column; gap: 0.2rem; }
    .detail-field.span-2 { grid-column: span 2; }
    .field-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
    .detail-field p { margin: 0; color: #334155; line-height: 1.5; }
    .notes-label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; color: #475569; margin: 0.75rem 0; }
    textarea { border-radius: 0.8rem; border: 1px solid #cbd5e1; padding: 0.65rem 0.9rem; font-size: 0.95rem; font-family: inherit; width: 100%; box-sizing: border-box; resize: vertical; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem; align-items: center; }
    .btn { border: none; padding: 0.5rem 1.1rem; border-radius: 999px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
    .approve { background: #16a34a; color: white; }
    .reject { background: #dc2626; color: white; }
    .empty-msg { margin-top: 1rem; }
    .edit-footer { margin: 1rem 0 0; border-top: 1px dashed #e2e8f0; padding-top: 0.75rem; }
    .btn.edit { background: #0ea5e9; color: white; }
    .btn.neutral { background: #e2e8f0; color: #475569; }
    .edit-section { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 0.8rem; padding: 1rem; margin: 0.75rem 0; }
    .edit-heading { margin: 0 0 0.75rem; font-weight: 700; font-size: 0.9rem; color: #0369a1; }
    .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 600px) { .edit-grid { grid-template-columns: 1fr; } .edit-grid .span-2 { grid-column: span 1; } }
    .edit-grid label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: #475569; }
    .edit-grid label.span-2 { grid-column: span 2; }
    .edit-grid input, .edit-grid textarea, .edit-grid select { border-radius: 0.6rem; border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; font-size: 0.9rem; font-family: inherit; width: 100%; box-sizing: border-box; background: white; }
    .edit-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
    .edit-error { color: #dc2626; font-size: 0.85rem; margin: 0.5rem 0 0; }
  `
})
export class FacilitatorQueueComponent implements OnInit {
  private readonly api = inject(ApiService);

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
}
