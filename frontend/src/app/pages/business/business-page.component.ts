import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, ProductResponse } from '../../services/api.service';
import { CustomerAuthService } from '../../services/customer-auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-business-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <button class="back-btn" (click)="goBack()">← Back to Marketplace</button>

      <div *ngIf="loading()" class="muted" style="margin-top:2rem">Loading…</div>

      <div *ngIf="!loading()">
        <header class="biz-header">
          <h1 class="biz-name">{{ businessName() }}</h1>
        </header>

        <div *ngIf="products().length === 0" class="muted empty">
          No products listed by this business yet.
        </div>

        <div class="product-grid" *ngIf="products().length > 0">
          <article *ngFor="let p of products()" class="product-card">
            <img *ngIf="p.mediaUrl" [src]="resolveUrl(p.mediaUrl)" alt="{{ p.name }}" class="product-img" />
            <div class="no-img" *ngIf="!p.mediaUrl">🛒</div>
            <div class="product-body">
              <h3>{{ p.name }}</h3>
              <span *ngIf="p.category" class="cat-tag">{{ p.category }}</span>
              <p class="muted desc">{{ p.description }}</p>
              <p class="price">R {{ p.price | number:'1.2-2' }}</p>

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
    </div>
  `,
  styles: `
    .page { max-width: 960px; margin: 0 auto; padding: 1.25rem; }

    .back-btn { background: none; border: none; color: #78716C; font-size: 0.9rem; font-weight: 700; cursor: pointer; padding: 0; margin-bottom: 1.5rem; display: inline-flex; align-items: center; gap: 0.4rem; font-family: inherit; min-height: 44px; }
    .back-btn:hover { color: #1C1917; }

    .biz-header { margin-bottom: 1.5rem; }
    .biz-name { font-size: 1.6rem; font-weight: 900; color: #1C1917; margin: 0; }

    .empty { margin-top: 2rem; font-size: 1rem; }

    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
    @media (max-width: 600px) { .product-grid { grid-template-columns: 1fr; } }

    .product-card { border: 1px solid #E7E5E4; border-radius: 1rem; overflow: hidden; background: white; transition: box-shadow 0.15s; }
    .product-card:hover { box-shadow: 0 6px 24px rgba(28,25,23,0.12); }
    .product-img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .no-img { width: 100%; height: 100px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; background: #F5F0E8; }
    .product-body { padding: 0.9rem; }
    .product-body h3 { margin: 0 0 0.3rem; font-size: 1rem; color: #1C1917; font-weight: 800; }
    .cat-tag { display: inline-block; background: rgba(245,184,0,0.12); color: #92620A; font-size: 0.7rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 999px; margin-bottom: 0.4rem; text-transform: uppercase; }
    .desc { font-size: 0.85rem; margin: 0.3rem 0 0.5rem; line-height: 1.4; color: #78716C; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .price { font-weight: 800; color: #2DB344; font-size: 1rem; margin: 0 0 0.75rem; }

    .buy-btn { width: 100%; border: none; border-radius: 0.75rem; padding: 0.65rem 1rem; font-size: 0.9rem; font-weight: 800; background: #F5B800; color: #1C1917; cursor: pointer; min-height: 44px; font-family: inherit; transition: box-shadow 0.15s; }
    .buy-btn:hover { box-shadow: 0 4px 14px rgba(245,184,0,0.4); }
    .login-buy-btn { width: 100%; border: 1.5px solid #E7E5E4; border-radius: 0.75rem; padding: 0.65rem 1rem; font-size: 0.9rem; font-weight: 700; background: white; color: #78716C; cursor: pointer; min-height: 44px; font-family: inherit; transition: border-color 0.15s, color 0.15s; }
    .login-buy-btn:hover { border-color: #F5B800; color: #1C1917; }

    .muted { color: #A8A29E; }
  `
})
export class BusinessPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly customerAuth = inject(CustomerAuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  products = signal<ProductResponse[]>([]);
  businessName = signal<string>('');
  loading = signal(true);

  ngOnInit(): void {
    const businessId = this.route.snapshot.paramMap.get('businessId');
    if (!businessId) { this.router.navigate(['/marketplace']); return; }

    this.api.listProducts(undefined, undefined, businessId).subscribe({
      next: list => {
        this.products.set(list);
        if (list.length > 0) this.businessName.set(list[0].businessName);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  addToCart(product: ProductResponse): void {
    this.cart.addItem(product);
    this.router.navigate(['/checkout']);
  }

  goToLogin(): void {
    this.router.navigate(['/customer/login']);
  }

  goBack(): void {
    this.router.navigate(['/marketplace']);
  }

  resolveUrl(u: string): string { return u.startsWith('http') ? u : this.api.baseUrl + u; }
}
