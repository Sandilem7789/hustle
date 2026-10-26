import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, ProductResponse } from '../../services/api.service';
import { CustomerAuthService } from '../../services/customer-auth.service';
import { CartService } from '../../services/cart.service';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CATEGORIES, categoryColor, categoryIcon, categoryLabelKey } from '../../utils/product-categories';

@Component({
  selector: 'app-business-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslatePipe, LoadingSkeletonComponent],
  template: `
    <header class="shop-head dash-head">
      <div class="shop-head-inner">
        <button type="button" class="back-btn" (click)="goBack()" [attr.aria-label]="'business.backToMarket' | translate">
          <mat-icon aria-hidden="true">chevron_left</mat-icon>
        </button>
        <ng-container *ngIf="!loading() && businessName()">
          <div class="who">
            <span class="mark" aria-hidden="true">{{ businessName().charAt(0) }}</span>
            <div class="who-text">
              <p class="eyebrow">{{ 'business.shop' | translate }}</p>
              <h1 class="biz-name">{{ businessName() }}</h1>
            </div>
          </div>
          <ul class="chips" role="list" *ngIf="categories().length > 0">
            <li class="cat-tag" *ngFor="let c of categories()">
              <span class="cat-dot" [style.background]="categoryColor(c.value)" aria-hidden="true"></span>{{ c.key | translate }}
            </li>
          </ul>
          <div class="share">
            <button *ngIf="canNativeShare" type="button" class="share-btn" (click)="nativeShare()">
              <mat-icon aria-hidden="true">share</mat-icon>{{ 'share.native' | translate }}
            </button>
            <a class="share-btn" [href]="whatsappHref()" target="_blank" rel="noopener">
              <mat-icon aria-hidden="true">chat_bubble_outline</mat-icon>{{ 'share.whatsapp' | translate }}
            </a>
          </div>
        </ng-container>
      </div>
    </header>

    <div class="page">
      <app-loading-skeleton [loading]="loading()" variant="product"></app-loading-skeleton>

      <ng-container *ngIf="!loading()">
        <p *ngIf="products().length === 0" class="empty">{{ 'business.noProducts' | translate }}</p>

        <div class="seg-tabs filter" role="group" [attr.aria-label]="'marketplace.category' | translate" *ngIf="categories().length > 1">
          <button type="button" [attr.aria-pressed]="filter() === 'ALL'" (click)="filter.set('ALL')">
            {{ 'category.all' | translate }} {{ products().length }}
          </button>
          <button type="button" *ngFor="let c of categories()" [attr.aria-pressed]="filter() === c.value" (click)="filter.set(c.value)">
            {{ c.key | translate }} {{ c.count }}
          </button>
        </div>

        <ul class="product-grid" role="list" *ngIf="products().length > 0">
          <li *ngFor="let p of visible(); trackBy: trackById" class="product-card">
            <a class="media" [routerLink]="['/product', p.id]" tabindex="-1" aria-hidden="true" [style.--cat]="categoryColor(p.category)">
              <img *ngIf="p.mediaUrl" [src]="resolveUrl(p.mediaUrl)" alt="" class="product-img" loading="lazy" decoding="async" width="400" height="300" />
              <span class="no-img" *ngIf="!p.mediaUrl">
                <mat-icon aria-hidden="true">{{ categoryIcon(p.category) }}</mat-icon>
              </span>
            </a>
            <div class="product-body">
              <h2 class="product-name"><a class="product-link" [routerLink]="['/product', p.id]">{{ p.name }}</a></h2>
              <p class="price">R {{ p.price | number:'1.0-2' }}</p>

              <ng-container *ngIf="customerAuth.isLoggedIn()">
                <button *ngIf="!cartQty().get(p.id); else stepper" type="button" class="buy-btn" (click)="cart.addItem(p)">
                  {{ 'marketplace.add' | translate }}
                </button>
                <ng-template #stepper>
                  <div class="stepper" role="group" [attr.aria-label]="p.name">
                    <button type="button" class="step" [attr.aria-label]="'product.lessOne' | translate" (click)="cart.updateQuantity(p.id, cartQty().get(p.id)! - 1)">−</button>
                    <span class="qty" aria-live="polite">{{ cartQty().get(p.id) }}</span>
                    <button type="button" class="step" [attr.aria-label]="'product.moreOne' | translate" (click)="cart.addItem(p)">+</button>
                  </div>
                </ng-template>
              </ng-container>
              <button *ngIf="!customerAuth.isLoggedIn()" type="button" class="login-buy-btn" (click)="goToLogin()">
                {{ 'marketplace.loginToBuy' | translate }}
              </button>
            </div>
          </li>
        </ul>

        <section class="collect" *ngIf="products().length > 0" aria-labelledby="collect-title">
          <h2 id="collect-title" class="eyebrow">{{ 'business.collectTitle' | translate }}</h2>
          <p>{{ 'business.collectText' | translate }}</p>
        </section>
      </ng-container>
    </div>
  `,
  styles: `
    :host { display: block; }

    .shop-head-inner { max-width: 1120px; margin: 0 auto; padding: 4px 16px 20px; display: flex; flex-direction: column; gap: 14px; }
    @media (min-width: 768px) { .shop-head-inner { padding: 12px 24px 24px; } }
    .back-btn {
      align-self: flex-start;
      width: 48px; height: 48px; min-height: 48px; margin-left: -10px; padding: 0;
      display: inline-flex; align-items: center; justify-content: center;
      background: transparent; border-radius: 12px; color: var(--nav-fg);
    }
    .back-btn mat-icon { width: 28px; height: 28px; font-size: 28px; }
    .back-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .who { display: flex; align-items: center; gap: 14px; }
    .mark {
      width: 64px; height: 64px; border-radius: 18px; flex-shrink: 0;
      background: var(--ink); color: var(--cream);
      font-family: var(--font-display); font-weight: 800; font-size: 1.875rem;
      display: flex; align-items: center; justify-content: center; text-transform: uppercase;
    }
    :host-context([data-theme="dark"]) .mark { background: var(--cream); color: var(--ink); }
    .who-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .eyebrow { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--success-text); }
    .biz-name {
      margin: 0; font-family: var(--font-display); font-size: 1.75rem; font-weight: 800;
      line-height: 1.05; letter-spacing: -0.015em; color: var(--nav-fg); overflow-wrap: anywhere;
    }
    @media (min-width: 768px) { .biz-name { font-size: 2.5rem; } }

    .chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
    .cat-tag {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 10px; border: 1px solid var(--nav-border); border-radius: 999px;
      background: var(--bg-page); color: var(--nav-fg); font-size: 0.8125rem; font-weight: 500;
    }

    .share { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    @media (min-width: 768px) { .share { max-width: 420px; } }
    .share-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      flex: 1 1 10rem; min-height: 48px; padding: 0 1rem;
      border: 1.5px solid var(--nav-fg); border-radius: 14px;
      background: transparent; color: var(--nav-fg);
      font-size: 0.9375rem; font-weight: 700; text-decoration: none;
    }
    .share-btn mat-icon { width: 20px; height: 20px; font-size: 20px; color: inherit; }
    .share-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .page { max-width: 1120px; margin: 0 auto; padding: 18px 16px 24px; display: flex; flex-direction: column; gap: 14px; }
    @media (min-width: 768px) { .page { padding: 24px; } }

    .filter { max-width: 640px; }

    .empty { margin: 1rem 0 0; font-size: 1rem; font-weight: 700; color: var(--text-secondary); }

    .product-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    @media (min-width: 640px) { .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; } }
    @media (min-width: 1024px) { .product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; } }

    .product-card {
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid var(--border-base); border-radius: 16px; background: var(--bg-surface);
    }
    .media {
      display: block; aspect-ratio: 4 / 3;
      background: color-mix(in srgb, var(--cat, var(--bg-muted)) 16%, var(--bg-surface));
    }
    .product-img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .no-img {
      display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;
      color: color-mix(in srgb, var(--cat, var(--text-secondary)) 80%, var(--text-primary));
    }
    .no-img mat-icon { width: 44px; height: 44px; font-size: 44px; }

    .product-body { display: flex; flex-direction: column; flex: 1; padding: 10px 12px 12px; gap: 2px; }
    .product-name { margin: 0; font-size: 0.9375rem; font-weight: 700; line-height: 1.25; color: var(--text-primary); }
    .product-link { color: inherit; text-decoration: none; }
    .product-link:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }
    .price { margin: 2px 0 0; font-size: 1.0625rem; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }

    .buy-btn, .login-buy-btn, .stepper { margin-top: auto; }
    .buy-btn, .login-buy-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 100%; min-height: 48px; margin-top: 8px; padding: 0 0.5rem;
      border: 1.5px solid var(--text-primary); border-radius: 12px; background: transparent;
      color: var(--text-primary); font: inherit; font-size: 0.9375rem; font-weight: 700; cursor: pointer;
    }
    .login-buy-btn { font-size: 0.875rem; }
    .stepper { display: flex; align-items: center; margin-top: 8px; border: 1.5px solid var(--text-primary); border-radius: 12px; }
    .step { width: 48px; min-height: 45px; padding: 0; background: transparent; color: var(--text-primary); font-size: 1.25rem; font-weight: 700; }
    .qty { flex: 1; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
    .buy-btn:focus-visible, .login-buy-btn:focus-visible, .step:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .collect {
      background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 20px;
      padding: 16px; display: flex; flex-direction: column; gap: 8px; max-width: 640px;
    }
    .collect .eyebrow { color: var(--success-text); }
    .collect p { margin: 0; font-size: 0.9375rem; line-height: 1.45; color: var(--text-primary); }
  `
})
export class BusinessPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly customerAuth = inject(CustomerAuthService);
  readonly cart = inject(CartService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  products = signal<ProductResponse[]>([]);
  businessName = signal<string>('');
  loading = signal(true);
  filter = signal<string>('ALL');

  // The shop's categories, in the marketplace's order, with how many products each has
  readonly categories = computed(() => {
    const counts = new Map<string, number>();
    for (const p of this.products()) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return CATEGORIES.filter(c => counts.has(c.value)).map(c => ({ value: c.value, key: c.labelKey, count: counts.get(c.value)! }));
  });
  readonly visible = computed(() => this.filter() === 'ALL' ? this.products() : this.products().filter(p => p.category === this.filter()));
  readonly cartQty = computed(() => new Map(this.cart.items().map(i => [i.product.id, i.quantity])));
  readonly canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  private businessId = '';

  readonly categoryIcon = categoryIcon;
  readonly categoryLabelKey = categoryLabelKey;
  readonly categoryColor = categoryColor;
  trackById = (_: number, item: { id: string }) => item.id;

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

  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { return: this.router.url } });
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
