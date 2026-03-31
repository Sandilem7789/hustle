import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, HustlerApplication } from '../../services/api.service';

@Component({
  selector: 'app-facilitator-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="card">
      <header>
        <p class="eyebrow">Step 2</p>
        <h2>Facilitator queue</h2>
        <p class="muted">Review pending applications and approve/reject them.</p>
      </header>

      <div class="filters">
        <label>
          <span>Status filter</span>
          <select [(ngModel)]="selectedStatus" (change)="loadApplications()">
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
      </div>

      <div class="queue" *ngIf="applications().length; else empty">
        <article *ngFor="let app of applications()" class="queue-card">
          <header>
            <h3>{{ app.businessName }}</h3>
            <p class="muted">{{ app.firstName }} {{ app.lastName }} · {{ app.businessType }}</p>
          </header>
          <p>{{ app.description }}</p>
          <p><strong>Target customers:</strong> {{ app.targetCustomers }}</p>
          <p><strong>Community:</strong> {{ app.community?.name || 'Not specified' }}</p>

          <div class="actions" *ngIf="app.status === 'PENDING'">
            <button class="approve" (click)="decide(app, 'APPROVED')">Approve</button>
            <button class="reject" (click)="decide(app, 'REJECTED')">Reject</button>
          </div>
          <div class="actions" *ngIf="app.status === 'REJECTED'">
            <span class="badge rejected">Rejected</span>
            <button class="approve" (click)="decide(app, 'APPROVED')">Reconsider &amp; Approve</button>
          </div>
          <div *ngIf="app.status === 'APPROVED'" class="badge-wrap">
            <span class="badge approved">Approved</span>
          </div>
        </article>
      </div>
      <ng-template #empty>
        <p class="muted">No applications found for {{ selectedStatus.toLowerCase() }}.</p>
      </ng-template>
    </section>
  `,
  styles: `
    .card {
      background: white;
      border-radius: 1.5rem;
      padding: 2rem;
      box-shadow: 0 25px 60px rgba(15, 23, 42, 0.12);
    }
    .filters {
      margin-bottom: 1rem;
    }
    select {
      border-radius: 0.8rem;
      border: 1px solid #cbd5f5;
      padding: 0.5rem;
      font-size: 1rem;
      font-family: inherit;
    }
    .queue {
      display: grid;
      gap: 1rem;
    }
    .queue-card {
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1rem;
      background: #f8fafc;
    }
    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .approve {
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 999px;
      background: #16a34a;
      color: white;
      cursor: pointer;
    }
    .badge-wrap { margin-top: 1rem; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .badge.approved { background: #dcfce7; color: #16a34a; }
    .badge.rejected { background: #fee2e2; color: #dc2626; }
    .reject {
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 999px;
      background: #dc2626;
      color: white;
      cursor: pointer;
    }
  `
})
export class FacilitatorQueueComponent implements OnInit {
  private readonly api = inject(ApiService);

  applications = signal<HustlerApplication[]>([]);
  selectedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications() {
    this.api.listApplications(this.selectedStatus).subscribe((apps) => this.applications.set(apps));
  }

  decide(app: HustlerApplication, status: 'APPROVED' | 'REJECTED') {
    this.api.decideApplication(app.id, { status }).subscribe(() => {
      this.loadApplications();
    });
  }
}
