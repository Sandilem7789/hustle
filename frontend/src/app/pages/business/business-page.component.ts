import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, ProductResponse } from '../../services/api.service';
import { CustomerAuthService } from '../../services/customer-auth.service';
import { CartService } from '../../services/cart.service';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { categoryIcon, categoryLabelKey } from '../../utils/product-categories';

@Component({
  selector: 'app-business-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslatePipe, LoadingSkeletonComponent],
  template: `
    <div class="page">
      <button type="button" class="back-btn" (click)="goBack()">
        <mat-icon aria-hidden="true">arrow_back</mat-icon>{{ 'business.backToMarket' | translate }}
      </button>

      <app-loading-skeleton [loading]="loading()" variant="product"></app-loading-skeleton>

      <div *ngIf="!loading()">
        <header class="biz-header">
          <h1 class="biz-name">{{ businessName() }}</h1>
          <div class="share" *ngIf="businessName()">
            <button *ngIf="canNativeShare" type="button" class="share-btn" (click)="nativeShare()">
              <mat-icon aria-hidden="true">share</mat-icon>{{ 'share.native' | translate }}
            </button>
            <a class="share-btn" [href]="whatsappHref()" target="_blank" rel="noopener">
              <mat-icon aria-hidden="true">chat</mat-icon>{{ 'share.whatsapp' | translate }}
            </a>
          </div>
        </header>

        <p *ngIf="products().length === 0" class="empty">{{ 'business.noProducts' | translate }}</p>

        <div class="product-grid" *ngIf="products().length > 0">
          <article *ngFor="let p of products()" class="product-card">
            <a class="media" [routerLink]="['/product', p.id]" tabindex="-1" aria-hidden="true">
              <img *ngIf="p.mediaUrl" [src]="resolveUrl(p.mediaUrl)" alt="" class="product-img" loading="lazy" decoding="async" width="400" height="300" />
              <span class="no-img" *ngIf="!p.mediaUrl">
                <mat-icon aria-hidden="true">{{ categoryIcon(p.category) }}</mat-icon>
              </span>
            </a>
            <div class="product-body">
              <h2 class="product-name"><a class="product-link" [routerLink]="['/product', p.id]">{{ p.name }}</a></h2>
              <span *ngIf="categoryLabelKey(p.category) as key" class="cat-tag">{{ key | translate }}</span>
              <p class="desc" *ngIf="p.description">{{ p.description }}</p>
              <p class="price">R {{ p.price | number:'1.2-2' }}</p>

              <button *ngIf="customerAuth.isLoggedIn()" type="button" class="buy-btn" (click)="addToCart(p)">
                <mat-icon aria-hidden="true">add_shopping_cart</mat-icon>{{ 'marketplace.addToCart' | translate }}
              </button>
              <button *ngIf="!customerAuth.isLoggedIn()" type="button" class="login-buy-btn" (click)="goToLogin()">
                <mat-icon aria-hidden="true">login</mat-icon>{{ 'marketplace.loginToBuy' | translate }}
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  `,
  styles: `
    .page { max-width: 960px; margin: 0 auto; padding: 1rem; }
    @media (min-width: 768px) { .page { padding: 1.5rem; } }

    .back-btn {
      display: inline-flex; align-items: center; gap: 0.375rem;
      min-height: 48px; padding: 0 0.25rem; margin-bottom: 1rem;
      background: none; border: none; border-radius: var(--radius-sm);
      color: var(--text-secondary); font: inherit; font-size: 0.9375rem; font-weight: 700; cursor: pointer;
    }
    .back-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .biz-header { margin-bottom: 1.5rem; }
    .biz-name { font-size: 1.5rem; font-weight: 900; color: var(--text-primary); margin: 0; }
    @media (min-width: 768px) { .biz-name { font-size: 1.75rem; } }

    .share { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
    @media (min-width: 768px) { .share { max-width: 360px; } }
    .share-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      flex: 1 1 10rem; min-height: 48px; padding: 0 1rem;
      border: 2px solid var(--border-base); border-radius: var(--radius-sm);
      background: var(--bg-surface); color: var(--text-primary);
      font-size: 0.9375rem; font-weight: 800; text-decoration: none;
    }
    .share-btn mat-icon { width: 20px; height: 20px; font-size: 20px; color: var(--brand-text); }
    .share-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .empty { margin: 2rem 0 0; font-size: 1rem; font-weight: 700; color: var(--text-secondary); }

    .product-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    @media (min-width: 600px) { .product-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); } }

    .product-card {
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid var(--border-base); border-radius: var(--radius-md);
      background: var(--bg-surface);
    }
    .media { display: block; aspect-ratio: 4 / 3; background: var(--bg-muted); }
    .product-img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .no-img { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: var(--text-secondary); }
    .no-img mat-icon { width: 40px; height: 40px; font-size: 40px; }

    .product-body { display: flex; flex-direction: column; align-items: flex-start; flex: 1; padding: 0.75rem 0.875rem 0.875rem; }
    .product-name { margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary); }
    .product-link { display: inline-flex; align-items: center; min-height: 48px; color: inherit; text-decoration: underline; text-underline-offset: 3px; }
    .product-link:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }
    .cat-tag {
      display: inline-block; margin-bottom: 0.375rem; padding: 0.15rem 0.5rem;
      border: 1px solid var(--border-base); border-radius: var(--radius-pill);
      color: var(--brand-text); font-size: 0.75rem; font-weight: 800;
    }
    .desc {
      margin: 0.25rem 0 0.5rem; font-size: 0.875rem; line-height: 1.4; color: var(--text-secondary);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .price { margin: auto 0 0.75rem; font-size: 1.0625rem; font-weight: 900; color: var(--success-text); font-variant-numeric: tabular-nums; }

    .buy-btn, .login-buy-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem;
      width: 100%; min-height: 48px; padding: 0 1rem; border-radius: var(--radius-sm);
      font: inherit; font-size: 0.9375rem; font-weight: 800; cursor: pointer;
    }
    .buy-btn { border: none; background: var(--hustle-yellow); color: #1C1917; }
    .login-buy-btn { border: 2px solid var(--border-base); background: var(--bg-surface); color: var(--text-primary); }
    .buy-btn mat-icon, .login-buy-btn mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .buy-btn:focus-visible, .login-buy-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }
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
  readonly canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  private businessId = '';

  readonly categoryIcon = categoryIcon;
  readonly categoryLabelKey = categoryLabelKey;

  ngOnInit(): void {
    const businessId = this.route.snapshot.paramMap.get('businessId');
    if (!businessId) { this.router.navigate(['/marketplace']); return; }
    this.businessId = businessId;

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

  whatsappHref(): string {
    return 'https://wa.me/?text=' + encodeURIComponent(`${this.businessName()} on thenga.com ${this.pageUrl()}`);
  }

  nativeShare(): void {
    navigator.share({ title: this.businessName(), text: `${this.businessName()} on thenga.com`, url: this.pageUrl() })
      .catch(() => { /* dismissed */ });
  }

  private pageUrl(): string {
    return `${window.location.origin}/business/${this.businessId}`;
  }

  resolveUrl(u: string): string { return u.startsWith('http') ? u : this.api.baseUrl + u; }
}
