import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, ProductResponse } from '../../services/api.service';
import { UnifiedAuthService } from '../../services/unified-auth.service';
import { CartService } from '../../services/cart.service';
import { RecentlyViewedService } from '../../services/recently-viewed.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { categoryColor, categoryIcon, categoryLabelKey } from '../../utils/product-categories';

type LoadState = 'loading' | 'ready' | 'error' | 'notfound';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslatePipe, LoadingSkeletonComponent],
  template: `
    <div class="page">
      <div class="bar">
        <button type="button" class="back-btn" (click)="goBack()" [attr.aria-label]="'product.back' | translate">
          <mat-icon aria-hidden="true">chevron_left</mat-icon>
        </button>
        <span class="bar-title" *ngIf="product() && categoryKey(product()!.category) as key">{{ key | translate }}</span>
      </div>

      <app-loading-skeleton [loading]="state() === 'loading'" variant="product"></app-loading-skeleton>

      <div class="state" *ngIf="state() === 'error'" role="alert">
        <mat-icon class="state-icon" aria-hidden="true">wifi_off</mat-icon>
        <p class="state-text">{{ 'product.loadError' | translate }}</p>
        <button type="button" class="action-btn" (click)="load()">{{ 'marketplace.retry' | translate }}</button>
      </div>

      <div class="state" *ngIf="state() === 'notfound'">
        <mat-icon class="state-icon" aria-hidden="true">search_off</mat-icon>
        <h1 class="state-text">{{ 'product.notFound' | translate }}</h1>
        <a routerLink="/marketplace" class="action-btn">{{ 'product.browseMarketplace' | translate }}</a>
      </div>

      <ng-container *ngIf="state() === 'ready' && product() as p">
        <article class="detail">
          <div class="media" [style.--cat]="categoryColor(p.category)">
            <img
              *ngIf="p.mediaUrl && !photoBroken(); else noPhoto"
              [src]="resolveUrl(p.mediaUrl)"
              [alt]="p.name"
              fetchpriority="high"
              decoding="async"
              width="800"
              height="600"
              (error)="photoBroken.set(true)"
            />
            <ng-template #noPhoto>
              <div class="p-fallback">
                <mat-icon aria-hidden="true">{{ categoryIcon(p.category) }}</mat-icon>
                <span class="sr-only">{{ 'marketplace.noPhoto' | translate }}</span>
              </div>
            </ng-template>
          </div>

          <div class="info">
            <div class="head">
              <p class="category" *ngIf="categoryKey(p.category) as key">
                <span class="cat-dot" [style.background]="categoryColor(p.category)" aria-hidden="true"></span>{{ key | translate }}
              </p>
              <h1 class="name">{{ p.name }}</h1>
              <p class="price">R {{ p.price | number:'1.0-2' }}</p>
              <p class="desc" *ngIf="p.description && p.description !== p.name">{{ p.description }}</p>
            </div>

            <fieldset class="option-group" *ngFor="let opt of p.options; let i = index">
              <legend class="field-label">{{ opt.name }}</legend>
              <div class="option-values">
                <label class="pill" *ngFor="let val of opt.values">
                  <input type="radio" class="pill-input" [name]="'opt-' + i" [value]="val" />
                  <span class="pill-face">{{ val }}</span>
                </label>
              </div>
            </fieldset>

            <div class="buy-row" *ngIf="unifiedAuth.isLoggedIn()">
              <button type="button" class="step" [attr.aria-label]="'product.lessOne' | translate" [disabled]="qty() <= 1" (click)="qty.set(qty() - 1)">−</button>
              <span class="qty" aria-live="polite">{{ qty() }}</span>
              <button type="button" class="step" [attr.aria-label]="'product.moreOne' | translate" (click)="qty.set(qty() + 1)">+</button>
              <button type="button" class="buy-btn" (click)="addToCart(p)">
                {{ 'marketplace.addToCart' | translate }} · R {{ p.price * qty() | number:'1.0-2' }}
              </button>
            </div>
            <button *ngIf="!unifiedAuth.isLoggedIn()" type="button" class="buy-btn login-btn" (click)="goToLogin()">
              {{ 'marketplace.loginToBuy' | translate }}
            </button>

            <div class="share">
              <button *ngIf="canNativeShare" type="button" class="share-btn" (click)="nativeShare(p)">
                <mat-icon aria-hidden="true">share</mat-icon>{{ 'share.native' | translate }}
              </button>
              <a class="share-btn" [href]="whatsappHref(p)" target="_blank" rel="noopener">
                <mat-icon aria-hidden="true">chat_bubble_outline</mat-icon>{{ 'share.whatsapp' | translate }}
              </a>
            </div>

            <a class="seller card" [routerLink]="['/business', p.businessId]">
              <span class="seller-mark" aria-hidden="true">{{ p.businessName.charAt(0) }}</span>
              <span class="seller-text">
                <strong>{{ p.businessName }}</strong>
                <span class="muted">{{ 'product.seeShop' | translate }}</span>
              </span>
              <mat-icon aria-hidden="true">chevron_right</mat-icon>
            </a>

            <section class="card getting" aria-labelledby="get-title">
              <h2 id="get-title" class="eyebrow-leaf">{{ 'product.gettingIt' | translate }}</h2>
              <p class="get-row">
                <mat-icon aria-hidden="true">local_shipping</mat-icon>
                <span>
                  <strong>{{ 'product.delivery' | translate }}</strong>
                  <ng-container *ngIf="isFood(p.category)"> {{ 'product.foodRadius' | translate }}</ng-container>
                </span>
              </p>
              <p class="get-row">
                <mat-icon aria-hidden="true">location_on</mat-icon>
                <span><strong>{{ 'product.collect' | translate }}</strong> {{ 'product.collectHow' | translate }}</span>
              </p>
            </section>
          </div>
        </article>

        <section class="more" *ngIf="related().length > 0" aria-labelledby="more-title">
          <h2 id="more-title" class="more-title">{{ 'product.moreFromSeller' | translate }}</h2>
          <ul class="more-row" role="list">
            <li class="m-card" *ngFor="let r of related(); trackBy: trackById">
              <a class="m-link" [routerLink]="['/product', r.id]">
                <div class="m-media" [style.--cat]="categoryColor(r.category)">
                  <img *ngIf="r.mediaUrl; else noThumb" [src]="resolveUrl(r.mediaUrl)" alt=""
                    loading="lazy" decoding="async" width="320" height="240" />
                  <ng-template #noThumb>
                    <mat-icon aria-hidden="true">{{ categoryIcon(r.category) }}</mat-icon>
                  </ng-template>
                </div>
                <span class="m-name">{{ r.name }}</span>
                <span class="m-price">R {{ r.price | number:'1.0-2' }}</span>
              </a>
            </li>
          </ul>
        </section>
      </ng-container>
    </div>
  `,
  styles: `
    :host { display: block; }
    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

    .page { max-width: 1120px; margin: 0 auto; padding: 0 1rem 1.5rem; }
    @media (min-width: 768px) { .page { padding: 1rem 1.5rem 2.5rem; } }

    .bar { position: relative; display: flex; align-items: center; justify-content: center; min-height: 56px; margin: 0 -0.5rem; }
    .back-btn {
      position: absolute;
      left: 0;
      width: 48px;
      height: 48px;
      min-height: 48px;
      padding: 0;
      border-radius: 12px;
      background: transparent;
      color: var(--text-primary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .back-btn mat-icon { width: 28px; height: 28px; font-size: 28px; }
    .back-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }
    .bar-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); }

    .detail { display: flex; flex-direction: column; gap: 1rem; animation: enter 200ms ease-out both; }
    @keyframes enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @media (min-width: 768px) {
      .detail { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2rem; align-items: start; }
    }

    .media {
      aspect-ratio: 4 / 3;
      border-radius: 20px;
      overflow: hidden;
      background: color-mix(in srgb, var(--cat, var(--bg-muted)) 16%, var(--bg-surface));
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .media img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .p-fallback { color: color-mix(in srgb, var(--cat, var(--text-secondary)) 80%, var(--text-primary)); display: flex; }
    .p-fallback mat-icon { width: 96px; height: 96px; font-size: 96px; }

    .info { display: flex; flex-direction: column; gap: 1rem; }
    .head { display: flex; flex-direction: column; gap: 0.375rem; }
    .category {
      margin: 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-secondary);
    }
    .name {
      margin: 0;
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.015em;
      color: var(--text-primary);
      overflow-wrap: anywhere;
    }
    .price {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--success-text);
      font-variant-numeric: tabular-nums;
    }
    .desc { margin: 0.25rem 0 0; font-size: 1rem; line-height: 1.45; color: var(--text-secondary); white-space: pre-line; }

    .field-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-secondary);
      margin: 0 0 0.375rem;
      padding: 0;
    }
    .option-group { border: 0; margin: 0; padding: 0; min-width: 0; }
    .option-values { display: flex; flex-wrap: wrap; gap: 0 0.5rem; }
    .pill { display: inline-flex; align-items: center; min-height: 48px; position: relative; cursor: pointer; }
    .pill-input { position: absolute; opacity: 0; width: 1px; height: 1px; margin: 0; }
    .pill-face {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      padding: 0 1rem;
      border: 1.5px solid var(--border-base);
      border-radius: var(--radius-pill);
      background: var(--bg-surface);
      color: var(--text-secondary);
      font-size: 0.9375rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .pill-input:checked + .pill-face { background: var(--text-primary); border-color: var(--text-primary); color: var(--bg-surface); }
    .pill-input:focus-visible + .pill-face { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .buy-row { display: flex; align-items: center; gap: 12px; }
    .step {
      width: 48px;
      height: 48px;
      min-height: 48px;
      flex-shrink: 0;
      padding: 0;
      border-radius: 12px;
      border: 1.5px solid var(--text-primary);
      background: transparent;
      color: var(--text-primary);
      font-size: 1.375rem;
      font-weight: 700;
    }
    .step:disabled { opacity: 0.4; cursor: default; }
    .qty { min-width: 28px; text-align: center; font-size: 1.25rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .buy-btn {
      flex: 1;
      height: 56px;
      border-radius: 16px;
      background: var(--gold);
      color: var(--ink);
      font-size: 1.0625rem;
      font-weight: 700;
    }
    .login-btn { width: 100%; flex: none; }
    .buy-btn:focus-visible,
    .step:focus-visible { outline: 3px solid var(--text-primary); outline-offset: 2px; }

    .share { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .share-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      flex: 1 1 10rem;
      min-height: 48px;
      padding: 0 1rem;
      border: 1.5px solid var(--text-primary);
      border-radius: 14px;
      background: transparent;
      color: var(--text-primary);
      font-size: 0.9375rem;
      font-weight: 700;
      text-decoration: none;
    }
    .share-btn mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .share-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .card { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 20px; padding: 16px; }
    .seller { display: flex; align-items: center; gap: 14px; color: var(--text-primary); text-decoration: none; }
    .seller:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }
    .seller-mark {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      flex-shrink: 0;
      background: var(--ink);
      color: var(--cream);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
    }
    .seller-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .seller-text strong { font-size: 1rem; }
    .seller-text .muted { font-size: 0.875rem; }

    .getting { display: flex; flex-direction: column; gap: 10px; }
    .eyebrow-leaf { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--success-text); }
    .get-row { margin: 0; display: flex; gap: 12px; align-items: flex-start; font-size: 0.9375rem; line-height: 1.4; color: var(--text-primary); }
    .get-row mat-icon { flex-shrink: 0; width: 22px; height: 22px; font-size: 22px; }

    .more { margin-top: 2rem; }
    .more-title { margin: 0 0 0.75rem; font-family: var(--font-display); font-size: 1.375rem; font-weight: 600; color: var(--text-primary); }
    .more-row {
      list-style: none;
      margin: 0 -1rem;
      padding: 0 1rem 0.5rem;
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scroll-padding: 0 1rem;
      overscroll-behavior-x: contain;
    }
    @media (min-width: 768px) { .more-row { margin: 0; padding: 0 0 0.5rem; scroll-padding: 0; } }
    .m-card {
      flex: 0 0 42%;
      scroll-snap-align: start;
      background: var(--bg-surface);
      border: 1px solid var(--border-base);
      border-radius: 16px;
      overflow: hidden;
    }
    @media (min-width: 768px) { .m-card { flex-basis: 200px; } }
    .m-link { display: flex; flex-direction: column; gap: 0.25rem; height: 100%; padding-bottom: 0.75rem; color: inherit; text-decoration: none; }
    .m-link:focus-visible { outline: 3px solid var(--border-focus); outline-offset: -3px; border-radius: var(--radius-md); }
    .m-media {
      aspect-ratio: 4 / 3;
      background: color-mix(in srgb, var(--cat, var(--bg-muted)) 16%, var(--bg-surface));
      display: flex;
      align-items: center;
      justify-content: center;
      color: color-mix(in srgb, var(--cat, var(--text-secondary)) 80%, var(--text-primary));
    }
    .m-media img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .m-name {
      padding: 0 0.75rem;
      font-size: 0.9375rem;
      font-weight: 700;
      line-height: 1.3;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .m-price { padding: 0 0.75rem; margin-top: auto; font-weight: 700; color: var(--text-primary); font-variant-numeric: tabular-nums; }

    .state {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1.5rem 0;
      max-width: 36rem;
    }
    .state-icon { width: 40px; height: 40px; font-size: 40px; color: var(--text-muted); }
    .state-text { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-primary); line-height: 1.45; }
    .action-btn {
      display: inline-flex;
      align-items: center;
      min-height: 48px;
      padding: 0 1.25rem;
      border-radius: var(--radius-sm);
      background: var(--hustle-yellow);
      color: #13251E;
      font-size: 0.9375rem;
      font-weight: 800;
      text-decoration: none;
    }
    .action-btn:focus-visible { outline: 3px solid var(--text-primary); outline-offset: 2px; }
  `
})
export class ProductPageComponent {
  private readonly api = inject(ApiService);
  readonly unifiedAuth = inject(UnifiedAuthService);
  private readonly cart = inject(CartService);
  private readonly recent = inject(RecentlyViewedService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  product     = signal<ProductResponse | null>(null);
  state       = signal<LoadState>('loading');
  photoBroken = signal(false);
  qty         = signal(1);
  related     = signal<ProductResponse[]>([]);

  private productId = '';
  private requestSeq = 0;

  readonly canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  readonly categoryIcon = categoryIcon;
  readonly categoryKey = categoryLabelKey;
  readonly categoryColor = categoryColor;

  constructor() {
    // The same component instance is reused when moving between products
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const previous = this.productId;
      this.productId = params.get('id') ?? '';
      if (previous) this.host.nativeElement.scrollIntoView({ block: 'start' });
      this.load();
    });
  }

  load(): void {
    const seq = ++this.requestSeq;
    this.state.set('loading');
    this.photoBroken.set(false);
    this.qty.set(1);
    this.related.set([]);
    this.api.getProduct(this.productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => {
        if (seq !== this.requestSeq) return;
        this.product.set(p);
        this.recent.record(p);
        this.state.set('ready');
        this.loadRelated(p, seq);
      },
      error: (err: HttpErrorResponse) => {
        if (seq !== this.requestSeq) return;
        this.state.set(err.status === 404 || err.status === 400 ? 'notfound' : 'error');
      }
    });
  }

  private loadRelated(product: ProductResponse, seq: number): void {
    this.api.listProducts(undefined, undefined, product.businessId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => {
        if (seq !== this.requestSeq) return;
        this.related.set(list.filter(r => r.id !== product.id).slice(0, 6));
      },
      error: () => { /* the section stays hidden */ }
    });
  }

  addToCart(product: ProductResponse): void {
    for (let i = 0; i < this.qty(); i++) this.cart.addItem(product);
    this.router.navigate(['/checkout']);
  }

  isFood(category?: string): boolean {
    return category === 'FAST_FOOD' || category === 'GROCERY';
  }

  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { return: this.router.url } });
  }

  goBack(): void {
    // Deep links have no in-app history to return to
    const navigationId = (this.location.getState() as { navigationId?: number } | null)?.navigationId ?? 1;
    if (navigationId > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/marketplace']);
    }
  }

  whatsappHref(p: ProductResponse): string {
    return 'https://wa.me/?text=' + encodeURIComponent(`${this.shareText(p)} ${this.pageUrl(p)}`);
  }

  nativeShare(p: ProductResponse): void {
    navigator.share({ title: p.name, text: this.shareText(p), url: this.pageUrl(p) }).catch(() => { /* dismissed */ });
  }

  private shareText(p: ProductResponse): string {
    return `${p.name} – R${p.price.toFixed(2)} on thenga.com`;
  }

  private pageUrl(p: ProductResponse): string {
    return `${window.location.origin}/product/${p.id}`;
  }

  trackById = (_: number, item: { id: string }) => item.id;

  resolveUrl(u: string): string { return u.startsWith('http') ? u : this.api.baseUrl + u; }
}
