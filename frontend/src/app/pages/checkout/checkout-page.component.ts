import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CustomerAuthService } from '../../services/customer-auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="layout">

      <!-- Guard: not logged in -->
      <div class="card" *ngIf="!customerAuth.isLoggedIn()">
        <h2>Please log in to checkout</h2>
        <p class="muted">You need a customer account to place an order.</p>
        <a routerLink="/customer/login" class="btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:1rem;">Go to Login</a>
      </div>

      <!-- Empty cart -->
      <div class="card" *ngIf="customerAuth.isLoggedIn() && cart.items().length === 0">
        <h2>Your cart is empty</h2>
        <p class="muted">Browse the marketplace to find products you love.</p>
        <a routerLink="/marketplace" class="btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:1rem;">Shop Now</a>
      </div>

      <!-- Checkout Form -->
      <ng-container *ngIf="customerAuth.isLoggedIn() && cart.items().length > 0">

        <div class="card">
          <h2 class="section-title">Your Cart</h2>
          <div class="cart-items">
            <div *ngFor="let item of cart.items()" class="cart-item">
              <div class="item-info">
                <span class="item-name">{{ item.product.name }}</span>
                <span class="item-shop muted">{{ item.product.businessName }}</span>
              </div>
              <div class="item-controls">
                <button class="qty-btn" (click)="cart.updateQuantity(item.product.id, item.quantity - 1)">−</button>
                <span class="qty">{{ item.quantity }}</span>
                <button class="qty-btn" (click)="cart.updateQuantity(item.product.id, item.quantity + 1)">+</button>
              </div>
              <div class="item-price">
                <span>R {{ (item.product.price * item.quantity) | number:'1.2-2' }}</span>
                <button class="remove-btn" (click)="cart.removeItem(item.product.id)">✕</button>
              </div>
            </div>
          </div>

          <div class="order-total">
            <span class="total-label">Order Total</span>
            <span class="total-amount">R {{ cart.total() | number:'1.2-2' }}</span>
          </div>
        </div>

        <div class="card">
          <h2 class="section-title">Order Details</h2>

          <!-- Transaction Type -->
          <div class="field-group">
            <p class="field-label">Transaction Type</p>
            <div class="radio-group">
              <label class="radio-option" [class.selected]="transactionType === 'B2C'">
                <input type="radio" name="txType" value="B2C" [(ngModel)]="transactionType" />
                <span>🧑 Personal Purchase (B2C)</span>
              </label>
              <label class="radio-option" [class.selected]="transactionType === 'B2B'">
                <input type="radio" name="txType" value="B2B" [(ngModel)]="transactionType" />
                <span>🏢 Business Purchase (B2B)</span>
              </label>
            </div>
          </div>

          <div class="field" *ngIf="transactionType === 'B2B'">
            <label for="poRef">Purchase Order Reference *</label>
            <input id="poRef" type="text" [(ngModel)]="businessPurchaseOrderRef" placeholder="e.g. PO-2025-001" />
          </div>

          <!-- Fulfillment Type -->
          <div class="field-group">
            <p class="field-label">Fulfillment Method</p>
            <div class="radio-group">
              <label class="radio-option" [class.selected]="fulfillmentType === 'DELIVERY'">
                <input type="radio" name="fulfillment" value="DELIVERY" [(ngModel)]="fulfillmentType" />
                <span>🚚 Deliver to me</span>
              </label>
              <label class="radio-option" [class.selected]="fulfillmentType === 'COLLECTION'">
                <input type="radio" name="fulfillment" value="COLLECTION" [(ngModel)]="fulfillmentType" />
                <span>🏪 I will collect</span>
              </label>
            </div>
          </div>

          <!-- Delivery fields -->
          <ng-container *ngIf="fulfillmentType === 'DELIVERY'">
            <div class="field">
              <label for="deliveryAddress">Delivery Address *</label>
              <input id="deliveryAddress" type="text" [(ngModel)]="deliveryAddress" placeholder="e.g. 12 Main Street, Durban, 4001" required />
            </div>

            <button class="btn-secondary" type="button" (click)="useCurrentLocation()" [disabled]="gettingLocation()">
              {{ gettingLocation() ? '📍 Getting location…' : '📍 Use my current location' }}
            </button>

            <p *ngIf="locationCoords()" class="coords-text">
              ✅ Location set: {{ locationCoords()!.lat.toFixed(5) }}, {{ locationCoords()!.lng.toFixed(5) }}
            </p>
            <p *ngIf="locationError()" class="location-error">{{ locationError() }}</p>
          </ng-container>

          <ng-container *ngIf="fulfillmentType === 'COLLECTION'">
            <div class="collection-note">
              <p>📞 Contact the seller to arrange collection time and location.</p>
            </div>
          </ng-container>

          <p *ngIf="errorMsg()" class="error-msg">{{ errorMsg() }}</p>

          <button class="btn-primary" (click)="placeOrder()" [disabled]="loading()">
            {{ loading() ? 'Placing order…' : 'Place Order — R ' + (cart.total() | number:'1.2-2') }}
          </button>
        </div>

      </ng-container>
    </div>
  `,
  styles: `
    .layout { max-width: 600px; margin: 0 auto; padding: 1rem 1rem 5rem; display: flex; flex-direction: column; gap: 1rem; }
    .card { background: white; border-radius: 1.5rem; padding: 1.5rem; box-shadow: 0 4px 24px rgba(28,25,23,0.08); border: 1px solid #E7E5E4; }
    .section-title { margin: 0 0 1.25rem; font-size: 1.15rem; color: #1C1917; font-weight: 800; }
    .muted { color: #78716C; }

    /* Cart */
    .cart-items { display: flex; flex-direction: column; gap: 0.75rem; }
    .cart-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid #E7E5E4; }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
    .item-name { font-weight: 700; font-size: 0.95rem; color: #1C1917; }
    .item-shop { font-size: 0.78rem; color: #A8A29E; }
    .item-controls { display: flex; align-items: center; gap: 0.5rem; }
    .qty-btn { width: 32px; height: 32px; border: 1.5px solid #E7E5E4; border-radius: 50%; background: white; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; min-height: unset; font-weight: 800; color: #1C1917; transition: border-color 0.15s; }
    .qty-btn:hover { border-color: #F5B800; }
    .qty { font-weight: 800; min-width: 1.5rem; text-align: center; color: #1C1917; }
    .item-price { display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #2DB344; white-space: nowrap; }
    .remove-btn { background: none; border: none; color: #A8A29E; cursor: pointer; font-size: 0.85rem; min-height: unset; padding: 0; transition: color 0.15s; }
    .remove-btn:hover { color: #E53935; }
    .order-total { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #E7E5E4; }
    .total-label { font-size: 0.9rem; font-weight: 800; color: #A8A29E; text-transform: uppercase; letter-spacing: 0.05em; }
    .total-amount { font-size: 1.35rem; font-weight: 800; color: #1C1917; }

    /* Form */
    .field-group { margin-bottom: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 1rem; }
    .field-label { font-size: 0.875rem; font-weight: 800; color: #1C1917; margin: 0 0 0.5rem; }
    label[for] { font-size: 0.875rem; font-weight: 700; color: #1C1917; display: block; margin-bottom: 0.25rem; }
    input[type="text"] { height: 48px; border: 2px solid #E7E5E4; border-radius: 0.75rem; padding: 0 1rem; font-size: 1rem; width: 100%; box-sizing: border-box; font-family: inherit; font-weight: 600; color: #1C1917; outline: none; transition: border-color 0.15s; }
    input:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); }

    .radio-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .radio-option { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border: 1.5px solid #E7E5E4; border-radius: 0.75rem; cursor: pointer; font-size: 0.95rem; color: #78716C; font-weight: 700; transition: all 0.15s; }
    .radio-option.selected { border-color: #F5B800; background: rgba(245,184,0,0.06); color: #1C1917; font-weight: 800; }
    .radio-option input[type="radio"] { width: 16px; height: 16px; accent-color: #F5B800; }

    .btn-secondary { height: 48px; border: 1.5px solid #E7E5E4; border-radius: 999px; background: white; color: #78716C; font-size: 0.9rem; font-weight: 700; cursor: pointer; width: 100%; margin-bottom: 0.5rem; font-family: inherit; transition: border-color 0.15s, color 0.15s; }
    .btn-secondary:hover { border-color: #F5B800; color: #1C1917; }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
    .coords-text { font-size: 0.85rem; color: #2DB344; font-weight: 700; margin: 0 0 0.75rem; }
    .location-error { font-size: 0.85rem; color: #E53935; margin: 0 0 0.75rem; font-weight: 700; }
    .collection-note { background: rgba(0,168,150,0.05); border: 1px solid rgba(0,168,150,0.2); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1rem; font-size: 0.9rem; color: #00665E; font-weight: 700; }
    .collection-note p { margin: 0; }

    .btn-primary { height: 52px; border: none; border-radius: 999px; font-size: 1rem; font-weight: 800; background: #F5B800; color: #1C1917; cursor: pointer; width: 100%; font-family: inherit; box-shadow: 0 4px 12px rgba(245,184,0,0.35); transition: box-shadow 0.15s; }
    .btn-primary:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .error-msg { color: #E53935; font-size: 0.875rem; font-weight: 700; background: rgba(229,57,53,0.06); border: 1px solid rgba(229,57,53,0.2); border-radius: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 1rem; }
  `
})
export class CheckoutPageComponent {
  readonly customerAuth = inject(CustomerAuthService);
  readonly cart = inject(CartService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  transactionType: 'B2C' | 'B2B' = 'B2C';
  fulfillmentType: 'DELIVERY' | 'COLLECTION' = 'DELIVERY';
  deliveryAddress = '';
  businessPurchaseOrderRef = '';

  loading = signal(false);
  gettingLocation = signal(false);
  locationCoords = signal<{ lat: number; lng: number } | null>(null);
  locationError = signal('');
  errorMsg = signal('');

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.locationError.set('Geolocation is not supported by your browser.');
      return;
    }
    this.gettingLocation.set(true);
    this.locationError.set('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locationCoords.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        this.gettingLocation.set(false);
      },
      (err) => {
        this.locationError.set('Could not get your location. Please enter address manually.');
        this.gettingLocation.set(false);
      }
    );
  }

  placeOrder(): void {
    this.errorMsg.set('');

    if (!this.customerAuth.isLoggedIn()) {
      this.router.navigate(['/customer/login']);
      return;
    }

    if (this.fulfillmentType === 'DELIVERY' && !this.deliveryAddress.trim()) {
      this.errorMsg.set('Please enter a delivery address.');
      return;
    }

    if (this.transactionType === 'B2B' && !this.businessPurchaseOrderRef.trim()) {
      this.errorMsg.set('Please enter a purchase order reference for B2B orders.');
      return;
    }

    const items = this.cart.items().map(i => ({
      productId: i.product.id,
      quantity: i.quantity
    }));

    const coords = this.locationCoords();
    const payload = {
      items,
      transactionType: this.transactionType,
      fulfillmentType: this.fulfillmentType,
      deliveryAddress: this.fulfillmentType === 'DELIVERY' ? this.deliveryAddress : undefined,
      deliveryLat: coords?.lat,
      deliveryLng: coords?.lng,
      businessPurchaseOrderRef: this.transactionType === 'B2B' ? this.businessPurchaseOrderRef : undefined
    };

    this.loading.set(true);
    this.api.placeOrder(payload, this.customerAuth.getToken()!).subscribe({
      next: () => {
        this.cart.clear();
        this.router.navigate(['/orders']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'Failed to place order. Please try again.');
      }
    });
  }
}
