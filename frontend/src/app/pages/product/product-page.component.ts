import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, ProductResponse } from '../../services/api.service';
import { UnifiedAuthService } from '../../services/unified-auth.service';
import { CartService } from '../../services/cart.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { categoryIcon, categoryLabelKey } from '../../utils/product-categories';

type LoadState = 'loading' | 'ready' | 'error' | 'notfound';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, TranslatePipe, LoadingSkeletonComponent],
  template: `
    <div class="page">
      <button type="button" class="back-btn" (click)="goBack()">
        <mat-icon aria-hidden="true">arrow_back</mat-icon>{{ 'product.back' | translate }}
      </button>

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
          <div class="media">
            <img
              *ngIf="p.mediaUrl && !photoBroken(); else noPhoto"
              [src]="resolveUrl(p.mediaUrl)"
              [alt]="p.name"
              loading="lazy"
              decoding="async"
              width="800"
              height="600"
              (error)="photoBroken.set(true)"
            />
            <ng-template #noPhoto>
              <div class="p-fallback p-fallback-lg">
                <mat-icon aria-hidden="true">{{ categoryIcon(p.category) }}</mat-icon>
                <span>{{ 'marketplace.noPhoto' | translate }}</span>
              </div>
            </ng-template>
          </div>

          <div class="info">
            <h1 class="name">{{ p.name }}</h1>
            <p class="price">R {{ p.price | number:'1.2-2' }}</p>
            <p class="category" *ngIf="categoryKey(p.category) as key">{{ key | translate }}</p>
            <a class="seller" [routerLink]="['/business', p.businessId]">
              <mat-icon aria-hidden="true">storefront</mat-icon>{{ p.businessName }}
            </a>
            <p class="desc" *ngIf="p.description">{{ p.description }}</p>

            <fieldset class="option-group" *ngFor="let opt of p.options; let i = index">
              <legend class="field-label">{{ opt.name }}</legend>
              <div class="option-values">
                <label class="pill" *ngFor="let val of opt.values">
                  <input type="radio" class="pill-input" [name]="'opt-' + i" [value]="val" />
                  <span class="pill-face">{{ val }}</span>
                </label>
              </div>
            </fieldset>

            <button *ngIf="unifiedAuth.isLoggedIn()" type="button" class="buy-btn" (click)="addToCart(p)">
              {{ 'marketplace.addToCart' | translate }}
            </button>
            <button *ngIf="!unifiedAuth.isLoggedIn()" type="button" class="login-btn" (click)="goToLogin()">
              {{ 'marketplace.loginToBuy' | translate }}
            </button>

            <div class="share">
              <button *ngIf="canNativeShare" type="button" class="share-btn" (click)="nativeShare(p)">
                <mat-icon aria-hidden="true">share</mat-icon>{{ 'share.native' | translate }}
              </button>
              <a class="share-btn" [href]="whatsappHref(p)" target="_blank" rel="noopener">
                <mat-icon aria-hidden="true">chat</mat-icon>{{ 'share.whatsapp' | translate }}
              </a>
            </div>
          </div>
        </article>

        <section class="more" *ngIf="related().length > 0" aria-labelledby="more-title">
          <h2 id="more-title" class="more-title">{{ 'product.moreFromSeller' | translate }}</h2>
          <ul class="more-row" role="list">
            <li class="m-card" *ngFor="let r of related(); trackBy: trackById">
              <a class="m-link" [routerLink]="['/product', r.id]">
                <div class="m-media">
                  <img *ngIf="r.mediaUrl; else noThumb" [src]="resolveUrl(r.mediaUrl)" alt=""
                    loading="lazy" decoding="async" width="320" height="240" />
                  <ng-template #noThumb>
                    <mat-icon aria-hidden="true">{{ categoryIcon(r.category) }}</mat-icon>
                  </ng-template>
                </div>
                <span class="m-name">{{ r.name }}</span>
                <span class="m-price">R {{ r.price | number:'1.2-2' }}</span>
              </a>
            </li>
          </ul>
        </section>
      </ng-container>
    </div>
  `,
  styles: `
    :host { display: block; }

    .page {
      max-width: 1120px;
      margin: 0 auto;
      padding: 0.5rem 1rem 1.5rem;
    }
    @media (min-width: 768px) { .page { padding: 1rem 1.5rem 2.5rem; } }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      min-height: 48px;
      padding: 0 0.5rem 0 0;
      margin-bottom: 0.5rem;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.9375rem;
      font-weight: 700;
      border-radius: var(--radius-sm);
    }
    .back-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .detail { display: flex; flex-direction: column; gap: 1rem; animation: enter 200ms ease-out both; }
    @keyframes enter { from { opacity: 0; transform: translateY(8px); } }
    @media (prefers-reduced-motion: reduce) { .detail { animation: none; } }
    @media (min-width: 768px) {
      .detail { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 2rem; align-items: start; }
    }

    /* Whole photo, never cropped: a buyer judges the item by its picture */
    .media {
      aspect-ratio: 4 / 3;
      background: var(--bg-muted);
      border-radius: var(--radius-md);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .media img { width: 100%; height: 100%; object-fit: contain; display: block; }

    .p-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 700;
    }
    .p-fallback-lg mat-icon { width: 56px; height: 56px; font-size: 56px; }

    .info { display: flex; flex-direction: column; }
    .name {
      margin: 0 0 0.25rem;
      font-size: 1.5rem;
      font-weight: 900;
      line-height: 1.25;
      letter-spacing: -0.01em;
      color: var(--text-primary);
    }
    @media (min-width: 768px) { .name { font-size: 1.875rem; } }
    .price {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      font-weight: 900;
      color: var(--success-text);
      font-variant-numeric: tabular-nums;
    }
    .category { margin: 0; font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
    .seller {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      align-self: flex-start;
      min-height: 48px;
      color: var(--brand-text);
      font-size: 0.9375rem;
      font-weight: 800;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .seller mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .seller:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }
    .desc {
      margin: 0.25rem 0 1rem;
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--text-secondary);
      max-width: 65ch;
      white-space: pre-line;
    }

    .field-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-secondary);
      margin: 0 0 0.375rem;
      padding: 0;
    }
    .option-group { border: 0; margin: 0 0 1rem; padding: 0; min-width: 0; }
    .option-values { display: flex; flex-wrap: wrap; gap: 0 0.5rem; }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 48px;
      position: relative;
      cursor: pointer;
    }
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
      transition: background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out;
    }
    .pill-input:checked + .pill-face {
      background: var(--hustle-yellow);
      border-color: var(--hustle-yellow);
      color: #1C1917;
      font-weight: 800;
    }
    .pill-input:focus-visible + .pill-face { outline: 3px solid var(--text-primary); outline-offset: 2px; }

    .buy-btn,
    .login-btn {
      width: 100%;
      height: 52px;
      margin-top: 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 1rem;
      font-weight: 800;
    }
    @media (min-width: 768px) { .buy-btn, .login-btn { max-width: 360px; } }
    .buy-btn { background: var(--hustle-yellow); color: #1C1917; }
    .login-btn { background: var(--bg-surface); color: var(--text-primary); border: 2px solid var(--border-base); }
    .buy-btn:focus-visible,
    .login-btn:focus-visible { outline: 3px solid var(--text-primary); outline-offset: 2px; }

    .share { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
    .share-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      flex: 1 1 10rem;
      min-height: 48px;
      padding: 0 1rem;
      border: 2px solid var(--border-base);
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      color: var(--text-primary);
      font-size: 0.9375rem;
      font-weight: 800;
      text-decoration: none;
    }
    @media (min-width: 768px) { .share { max-width: 360px; } }
    .share-btn mat-icon { width: 20px; height: 20px; font-size: 20px; color: var(--brand-text); }
    .share-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .more { margin-top: 2rem; }
    .more-title { margin: 0 0 0.75rem; font-size: 1.125rem; font-weight: 900; color: var(--text-primary); }
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
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    @media (min-width: 768px) { .m-card { flex-basis: 180px; } }
    .m-link { display: flex; flex-direction: column; gap: 0.25rem; height: 100%; padding-bottom: 0.75rem; color: inherit; text-decoration: none; }
    .m-link:focus-visible { outline: 3px solid var(--border-focus); outline-offset: -3px; border-radius: var(--radius-md); }
    .m-media {
      aspect-ratio: 4 / 3;
      background: var(--bg-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }
    .m-media img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .m-name {
      padding: 0 0.75rem;
      font-size: 0.9375rem;
      font-weight: 800;
      line-height: 1.3;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .m-price { padding: 0 0.75rem; margin-top: auto; font-weight: 900; color: var(--success-text); font-variant-numeric: tabular-nums; }

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
      color: #1C1917;
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  product     = signal<ProductResponse | null>(null);
  state       = signal<LoadState>('loading');
  photoBroken = signal(false);
  related     = signal<ProductResponse[]>([]);

  private productId = '';
  private requestSeq = 0;

  readonly canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
  readonly categoryIcon = categoryIcon;
  readonly categoryKey = categoryLabelKey;

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
    this.related.set([]);
    this.api.getProduct(this.productId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: p => {
        if (seq !== this.requestSeq) return;
        this.product.set(p);
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
    this.cart.addItem(product);
    this.router.navigate(['/checkout']);
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
