import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, ProductResponse } from '../../services/api.service';
import { CommunityService } from '../../services/community.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CATEGORIES, categoryIcon } from '../../utils/product-categories';

const PRIMARY_CATEGORIES = new Set(['ALL', 'FAST_FOOD', 'GROCERY']);
const DISTANCE_CAPPED = new Set(['FAST_FOOD', 'GROCERY']);

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-community-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, TranslatePipe],
  template: `
    <section class="market" aria-labelledby="market-title">
      <h1 id="market-title" class="market-title">{{ 'marketplace.title' | translate }}</h1>

      <div class="search">
        <label class="field-label" for="market-search">{{ 'marketplace.searchLabel' | translate }}</label>
        <div class="search-box">
          <mat-icon class="search-icon" aria-hidden="true">search</mat-icon>
          <input
            #searchInput
            id="market-search"
            class="search-input"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            [placeholder]="'marketplace.searchPlaceholder' | translate"
          />
          <button
            *ngIf="searchQuery()"
            type="button"
            class="icon-btn search-clear"
            (click)="clearSearch(searchInput)"
            [attr.aria-label]="'marketplace.clearSearch' | translate"
          >
            <mat-icon aria-hidden="true">close</mat-icon>
          </button>
        </div>
      </div>

      <fieldset class="filter">
        <legend class="field-label">{{ 'marketplace.category' | translate }}</legend>
        <div class="radio-row" id="category-options">
          <label class="radio" *ngFor="let cat of visibleCategories(); trackBy: trackByValue">
            <input type="radio" name="category" class="radio-input" [value]="cat.value"
              [checked]="selectedCategory() === cat.value" (change)="selectCategory(cat.value)" />
            <span>{{ cat.labelKey | translate }}</span>
          </label>
          <button
            type="button"
            class="more-btn"
            aria-controls="category-options"
            [attr.aria-expanded]="showAllCategories()"
            (click)="showAllCategories.set(!showAllCategories())"
          >
            {{ (showAllCategories() ? 'marketplace.fewerCategories' : 'marketplace.moreCategories') | translate }}
            <mat-icon aria-hidden="true">{{ showAllCategories() ? 'expand_less' : 'expand_more' }}</mat-icon>
          </button>
        </div>
        <p class="delivery-note" *ngIf="isDistanceCapped()">{{ 'marketplace.deliveryNote' | translate }}</p>
      </fieldset>

      <p class="sr-only" aria-live="polite">{{ announcement() }}</p>

      <!-- Loading: static placeholders the same shape as real cards -->
      <ng-container *ngIf="loadState() === 'loading'">
        <p class="result-count">{{ 'marketplace.loading' | translate }}</p>
        <ul class="grid" role="list" aria-hidden="true">
          <li class="p-card p-skeleton" *ngFor="let s of skeletons">
            <div class="p-media"></div>
            <div class="p-body"><span class="sk-line"></span><span class="sk-line sk-short"></span></div>
          </li>
        </ul>
      </ng-container>

      <div class="state" *ngIf="loadState() === 'error'" role="alert">
        <mat-icon class="state-icon" aria-hidden="true">wifi_off</mat-icon>
        <p class="state-text">{{ 'marketplace.loadError' | translate }}</p>
        <button type="button" class="action-btn" (click)="loadProducts()">{{ 'marketplace.retry' | translate }}</button>
      </div>

      <ng-container *ngIf="loadState() === 'ready'">
        <div class="state" *ngIf="products().length === 0">
          <mat-icon class="state-icon" aria-hidden="true">storefront</mat-icon>
          <p class="state-text">{{ 'marketplace.noListings' | translate }}</p>
          <div class="state-actions">
            <button *ngIf="community.selectedId() !== 'ALL'" type="button" class="action-btn" (click)="community.select('ALL')">
              {{ 'marketplace.showAllCommunities' | translate }}
            </button>
            <a routerLink="/apply" class="action-link">{{ 'marketplace.sellHere' | translate }}</a>
          </div>
        </div>

        <div class="state" *ngIf="products().length > 0 && filteredProducts().length === 0">
          <mat-icon class="state-icon" aria-hidden="true">search_off</mat-icon>
          <p class="state-text">{{ noMatchesText() }}</p>
          <button type="button" class="action-btn" (click)="clearSearch(searchInput)">{{ 'marketplace.clearSearch' | translate }}</button>
        </div>

        <ng-container *ngIf="filteredProducts().length > 0">
          <p class="result-count" aria-hidden="true">{{ countLabel() }}</p>
          <ul class="grid" role="list">
            <li class="p-card" *ngFor="let p of filteredProducts(); trackBy: trackById">
              <div class="p-media">
                <img
                  *ngIf="p.mediaUrl && !brokenImages().has(p.id); else noPhoto"
                  [src]="resolveUrl(p.mediaUrl)"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width="400"
                  height="300"
                  (error)="markBroken(p.id)"
                />
                <ng-template #noPhoto>
                  <div class="p-fallback">
                    <mat-icon aria-hidden="true">{{ categoryIcon(p.category) }}</mat-icon>
                    <span>{{ 'marketplace.noPhoto' | translate }}</span>
                  </div>
                </ng-template>
              </div>
              <div class="p-body">
                <h2 class="p-name">
                  <a class="p-open" [routerLink]="['/product', p.id]" [attr.aria-describedby]="'meta-' + p.id">
                    {{ p.name }}
                  </a>
                </h2>
                <div class="p-meta" [id]="'meta-' + p.id">
                  <p class="p-seller">{{ p.businessName }}</p>
                  <p class="p-price">R {{ p.price | number:'1.2-2' }}</p>
                </div>
              </div>
            </li>
          </ul>
        </ng-container>
      </ng-container>
    </section>
  `,
  styles: `
    :host { display: block; }

    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }

    /* ── Page frame: one shared left edge, bounded on wide screens ── */
    .market {
      max-width: 1120px;
      margin: 0 auto;
      padding: 1rem 1rem 1.5rem;
    }
    @media (min-width: 768px) { .market { padding: 1.5rem 1.5rem 2.5rem; } }

    .market-title {
      font-size: 1.5rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      margin: 0 0 1rem;
    }
    @media (min-width: 768px) { .market-title { font-size: 1.875rem; } }

    .field-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-secondary);
      margin: 0 0 0.375rem;
      padding: 0;
    }

    /* ── Search ─────────────────────────────────────────────────── */
    .search { margin-bottom: 1rem; }
    .search-box { position: relative; display: flex; align-items: center; }
    .search-icon {
      position: absolute;
      left: 0.875rem;
      color: var(--text-secondary);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      height: 48px;
      padding: 0 3.25rem 0 2.875rem;
      border: 2px solid var(--border-base);
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      color: var(--text-primary);
      font: inherit;
      font-size: 1rem;
      font-weight: 600;
      transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
    }
    .search-input::placeholder { color: var(--text-muted); font-weight: 600; }
    .search-input::-webkit-search-cancel-button { display: none; }
    .search-input:focus {
      outline: none;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(245, 184, 0, 0.25);
    }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      min-height: 48px;
      padding: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--text-secondary);
    }
    .icon-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: -3px; }
    .search-clear { position: absolute; right: 0; }

    /* ── Filters: native radios, styled ─────────────────────────── */
    .filter { border: 0; margin: 0 0 1rem; padding: 0; min-width: 0; }

    .radio-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      column-gap: 1.25rem;
    }
    .radio {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      min-height: 48px;
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--text-primary);
      cursor: pointer;
    }
    .radio-input {
      appearance: none;
      -webkit-appearance: none;
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      min-height: 0;
      margin: 0;
      padding: 0;
      border: 2px solid var(--text-secondary);
      border-radius: 50%;
      background: var(--bg-surface);
      cursor: pointer;
      transition: border-color 150ms ease-out, background-color 150ms ease-out, box-shadow 150ms ease-out;
    }
    .radio-input:checked {
      border-color: var(--text-primary);
      background: var(--hustle-yellow);
      box-shadow: inset 0 0 0 3px var(--bg-surface);
    }
    .radio-input:focus { box-shadow: none; }
    .radio-input:checked:focus { box-shadow: inset 0 0 0 3px var(--bg-surface); }
    .radio-input:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }
    .radio:has(.radio-input:checked) { font-weight: 800; }

    .more-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.125rem;
      min-height: 48px;
      padding: 0 0.25rem;
      background: transparent;
      color: var(--brand-text);
      font-size: 0.9375rem;
      font-weight: 800;
      border-radius: var(--radius-sm);
    }
    .more-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 0; }

    .delivery-note {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      line-height: 1.45;
      color: var(--text-secondary);
      max-width: 60ch;
    }

    /* ── Results ────────────────────────────────────────────────── */
    .result-count {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-secondary);
      margin: 0.25rem 0 0.75rem;
    }

    .grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }
    @media (min-width: 640px)  { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; } }
    @media (min-width: 1024px) { .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.25rem; } }

    .p-card {
      position: relative;
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
      border: 1px solid var(--border-base);
      border-radius: var(--radius-md);
      overflow: hidden;
      transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), border-color 160ms ease-out;
      -webkit-tap-highlight-color: transparent;
    }
    .p-card:active { transform: scale(0.98); }
    @media (hover: hover) and (pointer: fine) {
      .p-card:hover { border-color: var(--text-muted); }
    }

    /* Whole photos, never cropped: a buyer judges the item by its picture */
    .p-media {
      aspect-ratio: 4 / 3;
      background: var(--bg-muted);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .p-media img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .p-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 700;
    }
    .p-fallback mat-icon { width: 32px; height: 32px; font-size: 32px; }

    .p-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 0.625rem 0.75rem 0.75rem;
      gap: 0.25rem;
    }
    .p-name { margin: 0; font-size: 1rem; line-height: 1.3; }
    .p-open {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 0;
      padding: 0;
      background: none;
      border-radius: 0;
      color: var(--text-primary);
      font: inherit;
      font-weight: 800;
      text-align: left;
    }
    /* One real button, stretched to cover the card: whole-card tap target, no nested controls */
    .p-open::after { content: ''; position: absolute; inset: 0; border-radius: var(--radius-md); }
    .p-open:focus-visible { outline: none; }
    .p-open:focus-visible::after { outline: 3px solid var(--border-focus); outline-offset: -3px; }

    .p-meta { display: flex; flex-direction: column; gap: 0.125rem; margin-top: auto; }
    .p-seller {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .p-price {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 900;
      color: var(--success-text);
      font-variant-numeric: tabular-nums;
    }

    .p-skeleton .p-media { background: var(--bg-muted); }
    .sk-line { display: block; height: 0.875rem; border-radius: 4px; background: var(--bg-muted); }
    .sk-line.sk-short { width: 55%; margin-top: 0.375rem; }

    /* ── Empty / error states ───────────────────────────────────── */
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
    .state-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.25rem; }
    .action-btn {
      min-height: 48px;
      padding: 0 1.25rem;
      border-radius: var(--radius-sm);
      background: var(--hustle-yellow);
      color: #1C1917;
      font-size: 0.9375rem;
      font-weight: 800;
    }
    .action-btn:focus-visible { outline: 3px solid var(--text-primary); outline-offset: 2px; }
    .action-link {
      display: inline-flex;
      align-items: center;
      min-height: 48px;
      color: var(--brand-text);
      font-weight: 800;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  `
})
export class CommunityHubComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(TranslationService);
  readonly community = inject(CommunityService);

  readonly skeletons = [0, 1, 2, 3];

  products          = signal<ProductResponse[]>([]);
  selectedCategory  = signal<string>('ALL');
  searchQuery       = signal('');
  loadState         = signal<LoadState>('loading');
  showAllCategories = signal(false);
  brokenImages      = signal<ReadonlySet<string>>(new Set());
  announcement      = signal('');

  private requestSeq = 0;
  private announceTimer?: ReturnType<typeof setTimeout>;

  filteredProducts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.products();
    return this.products().filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.businessName?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  // Keeps a selected extra category visible while the list is collapsed
  visibleCategories = computed(() => {
    if (this.showAllCategories()) return [...CATEGORIES];
    const selected = this.selectedCategory();
    return CATEGORIES.filter(c => PRIMARY_CATEGORIES.has(c.value) || c.value === selected);
  });

  isDistanceCapped = computed(() => DISTANCE_CAPPED.has(this.selectedCategory()));

  // "23 items in KwaNgwenya" when a community is chosen, so a filtered list is never a surprise
  countLabel = computed(() => {
    this.i18n.lang();
    const n = this.filteredProducts().length;
    const count = n === 1 ? this.i18n.t('marketplace.itemsOne') : this.i18n.t('marketplace.itemsMany').replace('{n}', String(n));
    const place = this.community.selected();
    return place ? `${count} ${this.i18n.t('marketplace.inCommunity').replace('{c}', place.name)}` : count;
  });

  noMatchesText = computed(() => {
    this.i18n.lang();
    return this.i18n.t('marketplace.noMatches').replace('{q}', this.searchQuery().trim());
  });

  constructor() {
    // Announce result counts only once typing pauses, not on every keystroke
    effect(() => {
      const state = this.loadState();
      const text = state === 'ready' ? this.countLabel() : '';
      clearTimeout(this.announceTimer);
      this.announceTimer = setTimeout(() => this.announcement.set(text), 700);
    });

    // Reload whenever the community is changed in the menu (and once on first load)
    effect(() => {
      this.community.selectedId();
      untracked(() => this.loadProducts());
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    clearTimeout(this.announceTimer);
  }

  selectCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.loadProducts();
  }

  loadProducts(): void {
    // Only the newest request may update the screen, so rapid filter taps can't show stale results
    const seq = ++this.requestSeq;
    this.loadState.set('loading');
    const cat = this.selectedCategory();
    const community = this.community.selectedId();
    this.api.listProducts(
      community === 'ALL' ? undefined : community,
      cat === 'ALL' ? undefined : cat
    ).subscribe({
      next: list => {
        if (seq !== this.requestSeq) return;
        this.products.set(list);
        this.loadState.set('ready');
      },
      error: () => {
        if (seq !== this.requestSeq) return;
        this.loadState.set('error');
      }
    });
  }

  clearSearch(input: HTMLInputElement): void {
    this.searchQuery.set('');
    input.focus();
  }

  markBroken(id: string): void {
    this.brokenImages.update(set => new Set(set).add(id));
  }

  categoryIcon = categoryIcon;

  trackById = (_: number, item: { id: string }) => item.id;
  trackByValue = (_: number, item: { value: string }) => item.value;

  resolveUrl(u: string): string { return u.startsWith('http') ? u : this.api.baseUrl + u; }
}
