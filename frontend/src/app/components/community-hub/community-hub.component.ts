import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, Community, ProductResponse } from '../../services/api.service';

@Component({
  selector: 'app-community-hub',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <!-- FILTER BAR -->
      <div class="filter-bar">
        <button class="filter-btn" [class.active]="selectedCommunityId() === null" (click)="selectCommunity(null)">
          All communities
        </button>
        <button *ngFor="let c of communities()"
                class="filter-btn"
                [class.active]="selectedCommunityId() === c.id"
                (click)="selectCommunity(c.id)">
          {{ c.name }}
        </button>
      </div>

      <p class="community-label" *ngIf="selectedCommunityId() !== null">
        {{ selectedCommunityName() }}
      </p>

      <!-- LOADING -->
      <div *ngIf="loading()" class="muted" style="margin-top:1rem">Loading products…</div>

      <!-- EMPTY -->
      <div *ngIf="!loading() && products().length === 0" class="muted" style="margin-top:1rem">
        No products or services listed yet in this area.
      </div>

      <!-- PRODUCT GRID -->
      <div class="product-grid" *ngIf="!loading() && products().length > 0">
        <article *ngFor="let p of products()" class="product-card">
          <img *ngIf="p.mediaUrl" [src]="resolveUrl(p.mediaUrl)" alt="{{ p.name }}" class="product-img" />
          <div class="no-img" *ngIf="!p.mediaUrl">&#x1F6D2;</div>
          <div class="product-body">
            <h3>{{ p.name }}</h3>
            <p class="shop-name">{{ p.businessName }}</p>
            <p class="muted desc">{{ p.description }}</p>
            <p class="price">R {{ p.price | number:'1.2-2' }}</p>
          </div>
        </article>
      </div>
    </div>
  `,
  styles: `
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 25px 60px rgba(15,23,42,0.12); }
    @media (max-width: 600px) { .card { padding: 1.25rem; } }
    .filter-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; }
    .filter-btn { border: 1px solid #e2e8f0; border-radius: 999px; padding: 0.4rem 1rem; background: #f8fafc; cursor: pointer; font-size: 0.9rem; color: #475569; transition: all 0.15s; }
    .filter-btn:hover { background: #e0f2fe; border-color: #7dd3fc; }
    .filter-btn.active { background: #0ea5e9; border-color: #0ea5e9; color: white; font-weight: 700; }
    .community-label { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 1rem; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 0.5rem; }
    @media (max-width: 600px) { .product-grid { grid-template-columns: 1fr; } }
    .product-card { border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; background: #f8fafc; }
    .product-img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .no-img { width: 100%; height: 100px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; background: #f1f5f9; }
    .product-body { padding: 0.9rem; }
    .product-body h3 { margin: 0 0 0.15rem; font-size: 1rem; color: #0f172a; }
    .shop-name { font-size: 0.78rem; font-weight: 700; color: #0ea5e9; margin: 0 0 0.4rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .desc { font-size: 0.85rem; margin: 0 0 0.5rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .price { font-weight: 700; color: #16a34a; font-size: 1rem; margin: 0; }
    .muted { color: #94a3b8; }
  `
})
export class CommunityHubComponent implements OnInit {
  private readonly api = inject(ApiService);

  communities = signal<Community[]>([]);
  products = signal<ProductResponse[]>([]);
  selectedCommunityId = signal<string | null>(null);
  loading = signal(true);

  selectedCommunityName() {
    const id = this.selectedCommunityId();
    return this.communities().find(c => c.id === id)?.name ?? '';
  }

  ngOnInit(): void {
    this.api.listCommunities().subscribe(c => this.communities.set(c));
    this.loadProducts();
  }

  selectCommunity(id: string | null): void {
    this.selectedCommunityId.set(id);
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    const id = this.selectedCommunityId();
    this.api.listProducts(id ?? undefined).subscribe({
      next: list => { this.products.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  resolveUrl(u: string): string { return u.startsWith('http') ? u : this.api.baseUrl + u; }
}
