import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, ProductResponse } from '../../services/api.service';
import { UnifiedAuthService } from '../../services/unified-auth.service';
import { CartService } from '../../services/cart.service';

const CATEGORIES = ['ALL', 'FOOD', 'CLOTHING', 'SERVICES', 'CRAFTS', 'AGRI', 'ELECTRONICS', 'OTHER'] as const;

@Component({
  selector: 'app-community-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">

      <!-- SEARCH BAR -->
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          class="search-input"
          type="search"
          [(ngModel)]="searchQuery"
          placeholder="Search products, services, businesses…"
          autocomplete="off"
        />
        <button *ngIf="searchQuery" class="search-clear" (click)="searchQuery = ''" aria-label="Clear search">✕</button>
      </div>

      <!-- CATEGORY PILLS -->
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

      <!-- STATES -->
      <div *ngIf="loading()" class="state-msg">Loading products…</div>
      <div *ngIf="!loading() && filteredProducts().length === 0 && products().length > 0" class="state-msg">
        No results for "{{ searchQuery }}".
      </div>
      <div *ngIf="!loading() && products().length === 0" class="state-msg">
        No products or services listed yet in this area.
      </div>

      <!-- PRODUCT GRID -->
      <div class="product-grid" *ngIf="!loading() && filteredProducts().length > 0">
        <article
          *ngFor="let p of filteredProducts()"
          class="product-card"
          (click)="openDetail(p)"
          role="button"
          [attr.aria-label]="p.name"
        >
          <!-- Image — takes ~65% of card height via aspect-ratio -->
          <div class="card-img-wrap">
            <img
              *ngIf="p.mediaUrl"
              [src]="resolveUrl(p.mediaUrl)"
              [alt]="p.name"
              class="product-img"
              loading="lazy"
            />
            <div class="no-img" *ngIf="!p.mediaUrl">
              {{ p.name.charAt(0).toUpperCase() }}
            </div>
            <span *ngIf="p.category" class="card-cat-badge">{{ p.category }}</span>
          </div>

          <!-- Info — ~35% of card -->
          <div class="card-info">
            <span class="card-name">{{ p.name }}</span>
            <span class="card-price">R {{ p.price | number:'1.2-2' }}</span>
          </div>
        </article>
      </div>
    </div>

    <!-- ── Product Detail Sheet ──────────────────────────────────── -->
    <div
      class="detail-overlay"
      *ngIf="selectedProduct()"
      (click)="closeDetail()"
      aria-hidden="true"
    ></div>

    <div
      class="detail-sheet"
      *ngIf="selectedProduct()"
      role="dialog"
      [attr.aria-label]="selectedProduct()!.name"
      (click)="$event.stopPropagation()"
    >
      <!-- Image header -->
      <div class="detail-img-wrap">
        <img
          *ngIf="selectedProduct()!.mediaUrl"
          [src]="resolveUrl(selectedProduct()!.mediaUrl!)"
          [alt]="selectedProduct()!.name"
          class="detail-img"
        />
        <div class="detail-no-img" *ngIf="!selectedProduct()!.mediaUrl">
          {{ selectedProduct()!.name.charAt(0).toUpperCase() }}
        </div>
        <button class="detail-close" (click)="closeDetail()" aria-label="Close">✕</button>
        <span *ngIf="selectedProduct()!.category" class="detail-cat-badge">
          {{ selectedProduct()!.category }}
        </span>
      </div>

      <!-- Scrollable body -->
      <div class="detail-body">
        <h2 class="detail-name">{{ selectedProduct()!.name }}</h2>
        <a
          class="detail-shop"
          (click)="goToBusiness(selectedProduct()!.businessId); closeDetail()"
          role="button"
        >
          {{ selectedProduct()!.businessName }}
        </a>

        <p class="detail-desc">{{ selectedProduct()!.description }}</p>

        <!-- Options / variants (shows when backend provides them) -->
        <ng-container *ngIf="selectedProduct()!.options?.length">
          <div class="options-section">
            <div *ngFor="let opt of selectedProduct()!.options" class="option-group">
              <p class="option-label">{{ opt.name }}</p>
              <div class="option-values">
                <button
                  *ngFor="let val of opt.values"
                  class="option-chip"
                  [class.option-chip-active]="isOptionSelected(opt.name, val)"
                  (click)="selectOption(opt.name, val)"
                >
                  {{ val }}
                </button>
              </div>
            </div>
          </div>
        </ng-container>

        <p class="detail-price">R {{ selectedProduct()!.price | number:'1.2-2' }}</p>
      </div>

      <!-- Sticky footer -->
      <div class="detail-footer">
        <button
          *ngIf="unifiedAuth.isLoggedIn()"
          class="detail-buy-btn"
          (click)="addToCartAndClose(selectedProduct()!)"
        >
          Add to Cart
        </button>
        <button
          *ngIf="!unifiedAuth.isLoggedIn()"
          class="detail-login-btn"
          (click)="goToLogin()"
        >
          Login to buy
        </button>
      </div>
    </div>
  `,
  styles: `
    /* ── Wrapper card ─────────────────────────────────────────── */
    .card {
      background: white;
      border-radius: 1.5rem;
      padding: 1.25rem;
      box-shadow: 0 4px 24px rgba(28,25,23,0.08);
      border: 1px solid #E7E5E4;
    }

    /* ── Search bar ───────────────────────────────────────────── */
    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 0.875rem;
    }
    .search-icon {
      position: absolute;
      left: 0.9rem;
      font-size: 1rem;
      pointer-events: none;
      line-height: 1;
    }
    .search-input {
      width: 100%;
      height: 48px;
      border: 2px solid #E7E5E4;
      border-radius: 999px;
      padding: 0 2.75rem;
      font-size: 0.95rem;
      font-family: inherit;
      font-weight: 600;
      color: #1C1917;
      background: #FAFAF9;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .search-input:focus {
      border-color: #F5B800;
      box-shadow: 0 0 0 3px rgba(245,184,0,0.2);
      background: white;
    }
    .search-input::placeholder { color: #A8A29E; font-weight: 600; }
    .search-clear {
      position: absolute;
      right: 0.75rem;
      background: #E7E5E4;
      border: none;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      min-height: unset;
      font-size: 0.72rem;
      cursor: pointer;
      color: #78716C;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    /* ── Category row ─────────────────────────────────────────── */
    .category-scroll {
      display: flex;
      gap: 0.4rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      margin-bottom: 0.875rem;
      scrollbar-width: none;
    }
    .category-scroll::-webkit-scrollbar { display: none; }
    .cat-btn {
      border: 1.5px solid #E7E5E4;
      border-radius: 999px;
      padding: 0.35rem 0.9rem;
      background: #FAFAF9;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 700;
      color: #78716C;
      white-space: nowrap;
      transition: all 0.15s;
      min-height: 36px;
      font-family: inherit;
    }
    .cat-btn:hover { border-color: #F5B800; color: #1C1917; }
    .cat-btn.cat-active { background: #F5B800; border-color: #F5B800; color: #1C1917; font-weight: 800; }

    .state-msg { color: #A8A29E; margin-top: 1rem; font-size: 0.9rem; }

    /* ── Product grid ─────────────────────────────────────────── */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      margin-top: 0.25rem;
    }
    @media (min-width: 480px) {
      .product-grid { grid-template-columns: repeat(3, 1fr); gap: 0.875rem; }
    }
    @media (min-width: 768px) {
      .product-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
    }

    /* ── Product card ─────────────────────────────────────────── */
    .product-card {
      border: 1px solid #E7E5E4;
      border-radius: 1rem;
      overflow: hidden;
      background: white;
      cursor: pointer;
      transition: box-shadow 0.18s, transform 0.12s;
      display: flex;
      flex-direction: column;
      -webkit-tap-highlight-color: transparent;
    }
    .product-card:hover {
      box-shadow: 0 6px 20px rgba(28,25,23,0.13);
    }
    .product-card:active { transform: scale(0.975); }

    /* Image wrapper — padding-top trick gives a fixed 65% aspect */
    .card-img-wrap {
      position: relative;
      width: 100%;
      padding-top: 68%;
      flex-shrink: 0;
      background: #F5F0E8;
    }

    .product-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* No-image placeholder */
    .no-img {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.25rem;
      font-weight: 900;
      color: #D6D3D1;
      background: linear-gradient(135deg, #F5F0E8 0%, #E7E5E4 100%);
      letter-spacing: -0.02em;
    }

    /* Category badge overlaid on image */
    .card-cat-badge {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      background: rgba(28,25,23,0.6);
      color: white;
      font-size: 0.6rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      backdrop-filter: blur(4px);
      white-space: nowrap;
    }

    /* Info section — ~35% of card height is implicit from content */
    .card-info {
      padding: 0.625rem 0.75rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
      justify-content: space-between;
    }

    .card-name {
      font-size: 0.825rem;
      font-weight: 700;
      color: #1C1917;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-price {
      font-size: 0.9rem;
      font-weight: 800;
      color: #2DB344;
      margin-top: 0.25rem;
    }

    /* ── Detail overlay backdrop ──────────────────────────────── */
    .detail-overlay {
      position: fixed;
      inset: 0;
      z-index: 400;
      background: rgba(28,25,23,0.55);
      animation: fadeIn 0.2s ease-out both;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* ── Detail bottom sheet ──────────────────────────────────── */
    .detail-sheet {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 401;
      max-height: 92vh;
      background: white;
      border-radius: 1.25rem 1.25rem 0 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    @media (min-width: 600px) {
      .detail-sheet {
        left: 50%;
        right: auto;
        bottom: 50%;
        transform: translate(-50%, 50%);
        width: 100%;
        max-width: 480px;
        border-radius: 1.25rem;
        max-height: 86vh;
        animation: zoomIn 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @keyframes zoomIn {
        from { opacity: 0; transform: translate(-50%, 50%) scale(0.95); }
        to   { opacity: 1; transform: translate(-50%, 50%) scale(1); }
      }
    }

    /* Image header */
    .detail-img-wrap {
      position: relative;
      width: 100%;
      height: 240px;
      flex-shrink: 0;
      background: #F5F0E8;
    }
    @media (min-width: 400px) { .detail-img-wrap { height: 260px; } }

    .detail-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .detail-no-img {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 4rem;
      font-weight: 900;
      color: #D6D3D1;
      background: linear-gradient(135deg, #F5F0E8 0%, #E7E5E4 100%);
    }

    .detail-close {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      width: 36px;
      height: 36px;
      min-height: unset;
      border-radius: 50%;
      border: none;
      background: rgba(28,25,23,0.55);
      color: white;
      font-size: 0.875rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      transition: background 0.15s;
    }
    .detail-close:hover { background: rgba(28,25,23,0.75); }

    .detail-cat-badge {
      position: absolute;
      bottom: 0.75rem;
      left: 0.75rem;
      background: rgba(245,184,0,0.92);
      color: #1C1917;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.25rem 0.7rem;
      border-radius: 999px;
    }

    /* Scrollable body */
    .detail-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.25rem 0.5rem;
      -webkit-overflow-scrolling: touch;
    }

    .detail-name {
      font-size: 1.2rem;
      font-weight: 800;
      color: #1C1917;
      margin: 0 0 0.35rem;
      line-height: 1.25;
    }

    .detail-shop {
      display: block;
      font-size: 0.8rem;
      font-weight: 800;
      color: #00A896;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.875rem;
      cursor: pointer;
      text-decoration: none;
    }
    .detail-shop:hover { text-decoration: underline; }

    .detail-desc {
      font-size: 0.9rem;
      color: #44403C;
      line-height: 1.6;
      margin: 0 0 1rem;
      font-weight: 400;
    }

    /* Options / variants */
    .options-section {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      margin-bottom: 1rem;
      padding: 0.875rem;
      background: #FAFAF9;
      border-radius: 0.75rem;
      border: 1px solid #E7E5E4;
    }
    .option-label {
      font-size: 0.775rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #78716C;
      margin: 0 0 0.4rem;
    }
    .option-values { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .option-chip {
      padding: 0.35rem 0.875rem;
      border: 1.5px solid #E7E5E4;
      border-radius: 999px;
      background: white;
      font-size: 0.875rem;
      font-weight: 700;
      color: #44403C;
      cursor: pointer;
      min-height: unset;
      font-family: inherit;
      transition: all 0.12s;
    }
    .option-chip:hover { border-color: #F5B800; }
    .option-chip.option-chip-active {
      background: #F5B800;
      border-color: #F5B800;
      color: #1C1917;
    }

    .detail-price {
      font-size: 1.5rem;
      font-weight: 800;
      color: #2DB344;
      margin: 0;
    }

    /* Sticky footer */
    .detail-footer {
      padding: 0.875rem 1.25rem calc(0.875rem + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid #E7E5E4;
      flex-shrink: 0;
    }

    .detail-buy-btn {
      width: 100%;
      height: 52px;
      border: none;
      border-radius: 999px;
      background: #F5B800;
      color: #1C1917;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      box-shadow: 0 4px 14px rgba(245,184,0,0.35);
      transition: box-shadow 0.15s;
    }
    .detail-buy-btn:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }

    .detail-login-btn {
      width: 100%;
      height: 52px;
      border: 1.5px solid #E7E5E4;
      border-radius: 999px;
      background: white;
      color: #78716C;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: border-color 0.15s, color 0.15s;
    }
    .detail-login-btn:hover { border-color: #F5B800; color: #1C1917; }
  `
})
export class CommunityHubComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly unifiedAuth = inject(UnifiedAuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  readonly categories = CATEGORIES;

  products        = signal<ProductResponse[]>([]);
  selectedCategory = signal<string>('ALL');
  loading         = signal(true);
  searchQuery     = '';
  selectedProduct = signal<ProductResponse | null>(null);

  private selectedOptions: Record<string, string> = {};

  filteredProducts = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.businessName?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void { this.loadProducts(); }

  selectCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.searchQuery = '';
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

  openDetail(product: ProductResponse): void {
    this.selectedOptions = {};
    this.selectedProduct.set(product);
    document.body.style.overflow = 'hidden';
  }

  closeDetail(): void {
    this.selectedProduct.set(null);
    document.body.style.overflow = '';
  }

  selectOption(name: string, value: string): void {
    this.selectedOptions[name] = value;
  }

  isOptionSelected(name: string, value: string): boolean {
    return this.selectedOptions[name] === value;
  }

  addToCartAndClose(product: ProductResponse): void {
    this.cart.addItem(product);
    this.closeDetail();
    this.router.navigate(['/checkout']);
  }

  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { return: '/marketplace' } });
  }

  goToBusiness(businessId: string): void {
    this.router.navigate(['/business', businessId]);
  }

  resolveUrl(u: string): string { return u.startsWith('http') ? u : this.api.baseUrl + u; }
}
