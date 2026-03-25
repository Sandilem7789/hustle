import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, BusinessProfile, Community } from '../../services/api.service';

@Component({
  selector: 'app-community-hub',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <header>
        <p class="eyebrow">Marketplace</p>
        <h2>Community hubs</h2>
        <p class="muted">Explore approved hustlers per community.</p>
      </header>

      <div class="communities" *ngIf="communities().length; else loading">
        <button *ngFor="let community of communities()"
                (click)="selectCommunity(community)"
                [class.active]="community.id === selectedCommunity()?.id">
          <strong>{{ community.name }}</strong>
          <small>{{ community.region || 'No region' }}</small>
        </button>
      </div>
      <ng-template #loading>
        <p class="muted">Loading communities…</p>
      </ng-template>

      <div class="hustlers" *ngIf="hustlers().length; else noHustlers">
        <article *ngFor="let hustler of hustlers()" class="queue-card">
          <h3>{{ hustler.businessName }}</h3>
          <p class="muted">{{ hustler.businessType }}</p>
          <p>{{ hustler.description }}</p>
          <p><strong>Area:</strong> {{ hustler.operatingArea }}</p>
        </article>
      </div>
      <ng-template #noHustlers>
        <p class="muted">Select a community to view approved hustlers.</p>
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
    .communities {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin: 1rem 0;
    }
    .communities button {
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 0.5rem 1rem;
      background: #f8fafc;
      cursor: pointer;
    }
    .communities button.active {
      border-color: #0ea5e9;
      background: #0ea5e9;
      color: white;
    }
    .hustlers {
      display: grid;
      gap: 1rem;
    }
    .queue-card {
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1rem;
      background: #f8fafc;
    }
  `
})
export class CommunityHubComponent implements OnInit {
  private readonly api = inject(ApiService);

  communities = signal<Community[]>([]);
  hustlers = signal<BusinessProfile[]>([]);
  selectedCommunity = signal<Community | null>(null);

  ngOnInit(): void {
    this.api.listCommunities().subscribe((communities) => this.communities.set(communities));
  }

  selectCommunity(community: Community) {
    this.selectedCommunity.set(community);
    this.api.listHustlersByCommunity(community.id).subscribe((profiles) => this.hustlers.set(profiles));
  }
}
