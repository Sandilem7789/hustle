import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, ProductResponse } from '../../services/api.service';
import { CustomerAuthService } from '../../services/customer-auth.service';
import { CartService } from '../../services/cart.service';

const CATEGORIES = ['ALL', 'FOOD', 'CLOTHING', 'SERVICES', 'CRAFTS', 'AGRI', 'ELECTRONICS', 'OTHER'] as const;

@Component({
  selector: 'app-community-hub',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">

      <!-- CATEGORY RADIO BUTTONS -->
      <div class="category-scroll">
        <button
          *ngFor="let cat of categories"
          class="cat-btn"
          [class.cat-active]="selectedCategory() === cat"
          (click)="selectCategory(cat)"
        >
          {{ cat }}
        </button>
      </div>

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
          <div class="no-img" *ngIf="!p.mediaUrl">🛒</div>
          <div class="product-body">
            <h3>{{ p.name }}</h3>
            <a class="shop-name" (click)="goToBusiness(p.businessId)">{{ p.businessName }}</a>
            <span *ngIf="p.category" class="cat-tag">{{ p.category }}</span>
            <p class="muted desc">{{ p.description }}</p>
            <p class="price">R {{ p.price | number:'1.2-2' }}</p>

            <!-- Buy button -->
            <button
              *ngIf="customerAuth.isLoggedIn()"
              class="buy-btn"
              (click)="addToCart(p)"
            >
              🛒 Add to Cart
            </button>
            <button
              *ngIf="!customerAuth.isLoggedIn()"
              class="login-buy-btn"
              (click)="goToLogin()"
            >
              🔑 Login to buy
            </button>
          </div>
        </article>
      </div>
    </div>
  `,
  styles: `
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 4px 24px rgba(28,25,23,0.08); border: 1px solid #E7E5E4; }
    @media (max-width: 600px) { .card { padding: 1.25rem; border-radius: 1rem; } }

    /* Category row */
    .category-scroll { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.5rem; margin-bottom: 1rem; scrollbar-width: none; }
    .category-scroll::-webkit-scrollbar { display: none; }
    .cat-btn { border: 1.5px solid #E7E5E4; border-radius: 999px; padding: 0.35rem 0.9rem; background: #FAFAF9; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #78716C; white-space: nowrap; transition: all 0.15s; min-height: 36px; font-family: inherit; }
    .cat-btn:hover { border-color: #F5B800; color: #1C1917; }
    .cat-btn.cat-active { background: #F5B800; border-color: #F5B800; color: #1C1917; font-weight: 800; }

    /* Grid */
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 0.5rem; }
    @media (max-width: 600px) { .product-grid { grid-template-columns: 1fr; } }

    /* Card */
    .product-card { border: 1px solid #E7E5E4; border-radius: 1rem; overflow: hidden; background: white; transition: box-shadow 0.15s; }
    .product-card:hover { box-shadow: 0 6px 24px rgba(28,25,23,0.12); }
    .product-img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .no-img { width: 100%; height: 100px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; background: #F5F0E8; }
    .product-body { padding: 0.9rem; }
    .product-body h3 { margin: 0 0 0.15rem; font-size: 1rem; color: #1C1917; font-weight: 800; }
    .shop-name { font-size: 0.75rem; font-weight: 800; color: #00A896; margin: 0 0 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; text-decoration: none; display: block; }
    .shop-name:hover { color: #007A6E; text-decoration: underline; }
    .cat-tag { display: inline-block; background: rgba(245,184,0,0.12); color: #92620A; font-size: 0.7rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 999px; margin-bottom: 0.4rem; text-transform: uppercase; }
    .desc { font-size: 0.85rem; margin: 0.3rem 0 0.5rem; line-height: 1.4; color: #78716C; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .price { font-weight: 800; color: #2DB344; font-size: 1rem; margin: 0 0 0.75rem; }

    /* Buy buttons */
    .buy-btn { width: 100%; border: none; border-radius: 0.75rem; padding: 0.65rem 1rem; font-size: 0.9rem; font-weight: 800; background: #F5B800; color: #1C1917; cursor: pointer; min-height: 44px; font-family: inherit; transition: box-shadow 0.15s; }
    .buy-btn:hover { box-shadow: 0 4px 14px rgba(245,184,0,0.4); }
    .login-buy-btn { width: 100%; border: 1.5px solid #E7E5E4; border-radius: 0.75rem; padding: 0.65rem 1rem; font-size: 0.9rem; font-weight: 700; background: white; color: #78716C; cursor: pointer; min-height: 44px; font-family: inherit; transition: border-color 0.15s, color 0.15s; }
    .login-buy-btn:hover { border-color: #F5B800; color: #1C1917; }

    .muted { color: #A8A29E; }
  `
})
export class CommunityHubComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly customerAuth = inject(CustomerAuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  readonly categories = CATEGORIES;

  products = signal<ProductResponse[]>([]);
  selectedCategory = signal<string>('ALL');
  loading = signal(true);

  ngOnInit(): void {
    this.loadProducts();
  }

  selectCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    const cat = this.selectedCategory();
    this.api.listProducts(undefined, cat === 'ALL' ? undefined : cat).subscribe({
      next: list => { this.products.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  addToCart(product: ProductResponse): void {
    this.cart.addItem(product);
    this.router.navigate(['/checkout']);
  }

  goToLogin(): void {
    this.router.navigate(['/customer/login']);
  }

  goToBusiness(businessId: string): void {
    this.router.navigate(['/business', businessId]);
  }

  resolveUrl(u: string): string { return u.startsWith('http') ? u : this.api.baseUrl + u; }
}
