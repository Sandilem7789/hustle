import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { UnifiedAuthService } from '../../services/unified-auth.service';
import { CartItem, CartService } from '../../services/cart.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { MapPickerComponent } from '../../components/map-picker/map-picker.component';

interface ShopGroup { businessId: string; businessName: string; items: CartItem[]; }

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, TranslatePipe, MapPickerComponent],
  template: `
    <div class="page">
      <div class="bar">
        <a routerLink="/marketplace" class="back" [attr.aria-label]="'checkout.keepShopping' | translate">
          <mat-icon aria-hidden="true">chevron_left</mat-icon>
        </a>
        <h1 class="title">{{ 'checkout.yourCart' | translate }}</h1>
      </div>

      <section class="card state" *ngIf="!unifiedAuth.isLoggedIn()">
        <h2>{{ 'checkout.signInTitle' | translate }}</h2>
        <p class="muted">{{ 'checkout.signInText' | translate }}</p>
        <a routerLink="/login" [queryParams]="{ return: '/checkout' }" class="gold-btn">{{ 'nav.signIn' | translate }}</a>
      </section>

      <section class="card state" *ngIf="unifiedAuth.isLoggedIn() && cart.items().length === 0">
        <h2>{{ 'checkout.emptyTitle' | translate }}</h2>
        <p class="muted">{{ 'checkout.emptyText' | translate }}</p>
        <a routerLink="/marketplace" class="gold-btn">{{ 'checkout.shopNow' | translate }}</a>
      </section>

      <div class="grid" *ngIf="unifiedAuth.isLoggedIn() && cart.items().length > 0">
        <div class="main">
          <section class="card" *ngFor="let g of groups()" [attr.aria-label]="g.businessName">
            <div class="card-head">
              <h2 class="eyebrow">{{ fromShop(g.businessName) }}</h2>
              <a class="link" [routerLink]="['/business', g.businessId]">{{ 'checkout.addMore' | translate }} ›</a>
            </div>
            <div class="line" *ngFor="let item of g.items">
              <span class="line-name">
                <strong>{{ item.product.name }}</strong>
                <span class="muted">R {{ item.product.price | number:'1.0-2' }} {{ 'checkout.each' | translate }}</span>
              </span>
              <strong class="line-total">R {{ item.product.price * item.quantity | number:'1.0-2' }}</strong>
              <span class="stepper">
                <button type="button" class="step" [attr.aria-label]="withName('checkout.lessOf', item.product.name)" (click)="cart.updateQuantity(item.product.id, item.quantity - 1)">−</button>
                <span class="qty" aria-live="polite">{{ item.quantity }}</span>
                <button type="button" class="step" [attr.aria-label]="withName('checkout.moreOf', item.product.name)" (click)="cart.updateQuantity(item.product.id, item.quantity + 1)">+</button>
              </span>
              <button type="button" class="remove" (click)="cart.removeItem(item.product.id)">
                {{ 'checkout.remove' | translate }}<span class="sr-only"> {{ item.product.name }}</span>
              </button>
            </div>
          </section>

          <p class="note warn" *ngIf="groups().length > 1" role="status">{{ 'checkout.oneShop' | translate }}</p>

          <section class="card" aria-labelledby="get-title">
            <h2 id="get-title" class="eyebrow">{{ 'checkout.howWant' | translate }}</h2>
            <fieldset class="options">
              <legend class="muted">{{ 'checkout.chooseOne' | translate }}</legend>
              <label class="opt" [class.on]="fulfillmentType === 'DELIVERY'">
                <input type="radio" name="fulfillment" value="DELIVERY" [(ngModel)]="fulfillmentType" />
                <span class="opt-text">
                  <strong>{{ 'checkout.deliverToMe' | translate }}</strong>
                  <span class="muted">{{ 'checkout.deliverSub' | translate }}</span>
                </span>
              </label>
              <label class="opt" [class.on]="fulfillmentType === 'COLLECTION'">
                <input type="radio" name="fulfillment" value="COLLECTION" [(ngModel)]="fulfillmentType" />
                <span class="opt-text">
                  <strong>{{ 'checkout.collectMyself' | translate }}</strong>
                  <span class="muted">{{ 'checkout.collectSub' | translate }}</span>
                </span>
              </label>
            </fieldset>

            <div class="where" *ngIf="fulfillmentType === 'DELIVERY'">
              <p class="label">{{ 'checkout.whereBring' | translate }}</p>
              <div class="where-grid">
                <app-map-picker [lat]="locationCoords()?.lat ?? null" [lng]="locationCoords()?.lng ?? null" (coordsChange)="locationCoords.set($event)"></app-map-picker>
                <div class="where-side">
                  <button class="line-btn" type="button" (click)="useCurrentLocation()" [disabled]="gettingLocation()">
                    <mat-icon aria-hidden="true">my_location</mat-icon>
                    {{ (gettingLocation() ? 'checkout.locating' : 'checkout.useCurrentLocation') | translate }}
                  </button>
                  <label class="field">
                    <span class="label">{{ 'checkout.directions' | translate }}</span>
                    <input id="deliveryAddress" type="text" [(ngModel)]="deliveryAddress" [placeholder]="'checkout.directionsHint' | translate" required />
                  </label>
                  <p class="ok" *ngIf="locationCoords()">
                    <mat-icon aria-hidden="true">check</mat-icon>{{ 'checkout.pinSet' | translate }}
                  </p>
                  <p class="err" *ngIf="locationError()">{{ locationError() | translate }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside class="card summary" aria-labelledby="total-title">
          <h2 id="total-title" class="eyebrow">{{ 'checkout.total' | translate }}</h2>
          <div class="row"><span class="muted">{{ 'checkout.items' | translate }}</span><span>R {{ cart.total() | number:'1.0-2' }}</span></div>
          <div class="row pay"><strong>{{ 'checkout.youPay' | translate }}</strong><strong class="big">R {{ cart.total() | number:'1.0-2' }}</strong></div>
          <p class="muted small">{{ orderingAs() }}</p>
          <p *ngIf="errorMsg()" class="error-msg" role="alert">{{ errorMsg() }}</p>
          <div class="place">
            <button type="button" class="gold-btn" (click)="placeOrder()" [disabled]="loading() || groups().length > 1">
              {{ loading() ? ('checkout.placing' | translate) : ('checkout.placeOrder' | translate) + ' · R ' + (cart.total() | number:'1.0-2') }}
            </button>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .muted { color: var(--text-secondary); }

    .page { max-width: 1120px; margin: 0 auto; padding: 0 16px 120px; }
    @media (min-width: 768px) { .page { padding: 16px 24px 40px; } }

    .bar { display: flex; align-items: center; gap: 4px; min-height: 60px; margin-left: -10px; }
    .back { width: 48px; height: 48px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: var(--text-primary); }
    .back mat-icon { width: 28px; height: 28px; font-size: 28px; }
    .back:focus-visible { outline: 3px solid var(--border-focus); }
    .title { margin: 0; font-family: var(--font-display); font-size: 1.375rem; font-weight: 800; color: var(--text-primary); }
    @media (min-width: 768px) { .title { font-size: 2.5rem; } }

    .grid { display: flex; flex-direction: column; gap: 14px; }
    @media (min-width: 900px) { .grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; align-items: start; } }
    .main { display: flex; flex-direction: column; gap: 14px; }

    .card { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 20px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    @media (min-width: 768px) { .card { padding: 22px; } }
    .state h2 { margin: 0; font-size: 1.25rem; }
    .state p { margin: 0; }
    .card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .eyebrow { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--success-text); }
    .link { color: var(--success-text); font-size: 0.875rem; font-weight: 700; text-decoration: none; min-height: 32px; display: inline-flex; align-items: center; }

    .line { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; align-items: center; padding-top: 14px; border-top: 1px solid var(--border-base); }
    @media (min-width: 768px) { .line { grid-template-columns: minmax(0, 1fr) auto auto auto; gap: 16px; } .line-total { order: 3; } .stepper { order: 2; } .remove { order: 4; } }
    .line-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .line-name strong { font-size: 1rem; }
    .line-name .muted { font-size: 0.875rem; }
    .line-total { font-size: 1rem; text-align: right; font-variant-numeric: tabular-nums; }
    .stepper { display: flex; align-items: center; gap: 8px; }
    .step { width: 48px; height: 48px; min-height: 48px; padding: 0; border-radius: 12px; border: 1.5px solid var(--text-primary); background: transparent; color: var(--text-primary); font-size: 1.25rem; font-weight: 700; }
    .qty { min-width: 20px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
    .remove { justify-self: end; min-height: 48px; padding: 0; background: transparent; color: #8E2A20; font-size: 0.875rem; font-weight: 700; }
    :host-context([data-theme="dark"]) .remove { color: #F2A49B; }
    .step:focus-visible, .remove:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .note { margin: 0; padding: 12px 14px; border-radius: 14px; font-size: 0.9375rem; line-height: 1.4; }
    .warn { background: var(--bg-muted); color: var(--text-primary); }

    .options { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    @media (min-width: 768px) { .options { flex-direction: row; flex-wrap: wrap; } .options legend { width: 100%; } .opt { flex: 1; } }
    .options legend { padding: 0; margin-bottom: 10px; font-size: 0.875rem; }
    .opt { display: flex; gap: 12px; align-items: flex-start; padding: 14px; border: 1.5px solid var(--border-base); border-radius: 16px; cursor: pointer; flex-direction: row; font-weight: 400; }
    .opt.on { border-color: var(--text-primary); background: var(--bg-page); }
    .opt input { width: 22px; height: 22px; min-height: 0; margin: 1px 0 0; accent-color: var(--text-primary); flex-shrink: 0; }
    .opt-text { display: flex; flex-direction: column; gap: 2px; }
    .opt-text strong { font-size: 1rem; color: var(--text-primary); }
    .opt-text .muted { font-size: 0.875rem; line-height: 1.35; }

    .where { display: flex; flex-direction: column; gap: 10px; }
    .where-grid { display: flex; flex-direction: column; gap: 10px; }
    @media (min-width: 768px) { .where-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; } }
    .where-side { display: flex; flex-direction: column; gap: 10px; }
    .label { margin: 0; font-size: 0.875rem; font-weight: 700; color: var(--text-primary); }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field input { height: 52px; border-radius: 14px; border: 1.5px solid var(--border-base); background: var(--bg-surface); }
    .line-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; border-radius: 14px; border: 1.5px solid var(--text-primary); background: transparent; color: var(--text-primary); font-size: 0.9375rem; font-weight: 700; }
    .line-btn mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .line-btn:disabled { opacity: 0.5; }
    .ok { margin: 0; display: flex; align-items: center; gap: 6px; color: var(--success-text); font-size: 0.875rem; font-weight: 700; }
    .ok mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .err { margin: 0; color: #8E2A20; font-size: 0.875rem; font-weight: 700; }

    .summary { gap: 10px; }
    @media (min-width: 900px) { .summary { position: sticky; top: 96px; } }
    .row { display: flex; justify-content: space-between; align-items: baseline; font-size: 0.9375rem; }
    .row.pay { border-top: 1px solid var(--border-base); padding-top: 10px; font-size: 1.125rem; }
    .big { font-family: var(--font-display); font-size: 1.75rem; font-weight: 800; }
    .small { margin: 0; font-size: 0.8125rem; }
    .error-msg { margin: 0; color: #8E2A20; font-size: 0.875rem; font-weight: 700; background: var(--bg-muted); border-radius: 12px; padding: 10px 12px; }

    .gold-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 56px; border-radius: 16px; background: var(--gold); color: var(--ink); font-size: 1.0625rem; font-weight: 700; text-decoration: none; }
    .gold-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .gold-btn:focus-visible { outline: 3px solid var(--text-primary); outline-offset: 2px; }

    /* Phone: the order button stays in reach above the bottom nav */
    .place { position: fixed; left: 0; right: 0; bottom: var(--bottom-nav-total); z-index: 40; padding: 12px 16px; background: var(--bg-surface); border-top: 1px solid var(--border-base); }
    @media (min-width: 900px) { .place { position: static; padding: 0; background: none; border: 0; } }
    @media (min-width: 768px) and (max-width: 899.98px) { .place { bottom: 0; } }
  `
})
export class CheckoutPageComponent {
  readonly unifiedAuth = inject(UnifiedAuthService);
  readonly cart = inject(CartService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);

  fulfillmentType: 'DELIVERY' | 'COLLECTION' = 'DELIVERY';
  deliveryAddress = '';

  loading = signal(false);
  gettingLocation = signal(false);
  locationCoords = signal<{ lat: number; lng: number } | null>(null);
  locationError = signal('');
  errorMsg = signal('');

  // One card per shop: the server takes one shop per order
  readonly groups = computed<ShopGroup[]>(() => {
    const byShop = new Map<string, ShopGroup>();
    for (const item of this.cart.items()) {
      const id = item.product.businessId;
      if (!byShop.has(id)) byShop.set(id, { businessId: id, businessName: item.product.businessName, items: [] });
      byShop.get(id)!.items.push(item);
    }
    return [...byShop.values()];
  });

  readonly orderingAs = computed(() => {
    this.i18n.lang();
    return this.i18n.t('checkout.orderingAs').replace('{name}', this.unifiedAuth.displayName() ?? '');
  });

  fromShop(name: string): string {
    return this.i18n.t('checkout.from').replace('{shop}', name);
  }

  withName(key: string, name: string): string {
    return this.i18n.t(key).replace('{name}', name);
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.locationError.set('checkout.noGeo');
      return;
    }
    this.gettingLocation.set(true);
    this.locationError.set('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locationCoords.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        this.gettingLocation.set(false);
      },
      () => {
        this.locationError.set('checkout.geoFailed');
        this.gettingLocation.set(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  placeOrder(): void {
    this.errorMsg.set('');

    if (!this.unifiedAuth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.fulfillmentType === 'DELIVERY' && !this.deliveryAddress.trim()) {
      this.errorMsg.set(this.i18n.t('checkout.needAddress'));
      return;
    }

    const items = this.cart.items().map(i => ({ productId: i.product.id, quantity: i.quantity }));
    const coords = this.locationCoords();
    // Buying in Shop is always personal (B2C); business restocking happens inside Sell
    const payload = {
      items,
      transactionType: 'B2C' as const,
      fulfillmentType: this.fulfillmentType,
      deliveryAddress: this.fulfillmentType === 'DELIVERY' ? this.deliveryAddress : undefined,
      deliveryLat: coords?.lat,
      deliveryLng: coords?.lng,
    };

    this.loading.set(true);
    this.api.placeOrder(payload, this.unifiedAuth.getCustomerToken()!).subscribe({
      next: () => {
        this.cart.clear();
        this.router.navigate(['/orders']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || this.i18n.t('checkout.failed'));
      }
    });
  }
}
