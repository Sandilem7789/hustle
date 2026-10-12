import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import * as QRCode from 'qrcode';
import { ApiService, OrderResponse } from '../../services/api.service';
import { CustomerAuthService } from '../../services/customer-auth.service';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

// The order statuses each fulfilment type passes through (backend OrderStatus). CANCELLED sits outside both.
const DELIVERY_STEPS = ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'EN_ROUTE', 'DELIVERED'];
const COLLECTION_STEPS = ['PENDING', 'CONFIRMED', 'COLLECTED'];

interface TimelineStep {
  status: string;
  labelKey: string;
  state: 'done' | 'current' | 'todo';
}

@Component({
  selector: 'app-customer-orders-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LoadingSkeletonComponent, TranslatePipe],
  template: `
    <div class="layout">

      <div class="card" *ngIf="!customerAuth.isLoggedIn()">
        <h2>Please log in to view your orders</h2>
        <a routerLink="/customer/login" class="btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:1rem;">Go to Login</a>
      </div>

      <ng-container *ngIf="customerAuth.isLoggedIn()">
        <div class="page-header">
          <h1>My Orders</h1>
          <p class="muted">Track your purchases from thenga.com</p>
        </div>

        <app-loading-skeleton [loading]="loading()" variant="order"></app-loading-skeleton>

        <div *ngIf="!loading() && orders().length === 0" class="card">
          <p class="muted">You haven't placed any orders yet.</p>
          <a routerLink="/marketplace" class="btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:1rem;">Start Shopping</a>
        </div>

        <div *ngFor="let order of orders()" class="order-card">
          <div class="order-header">
            <div>
              <span class="order-id">#{{ order.id.slice(0, 8).toUpperCase() }}</span>
              <span class="order-date muted">{{ order.createdAt | date:'d MMM yyyy, h:mm a' }}</span>
            </div>
            <span class="status-badge" [ngClass]="statusClass(order.status)">{{ statusLabel(order.status) }}</span>
          </div>

          <div class="order-meta">
            <span class="meta-chip">{{ order.fulfillmentType === 'DELIVERY' ? '🚚 Delivery' : '🏪 Collection' }}</span>
            <span class="meta-chip">{{ order.transactionType }}</span>
          </div>

          <p class="tl-cancelled" *ngIf="order.status === 'CANCELLED'">
            <mat-icon aria-hidden="true">cancel</mat-icon>{{ 'orders.cancelledNote' | translate }}
          </p>
          <ol class="timeline" *ngIf="timelines().get(order.id) as steps" [attr.aria-label]="'orders.progress' | translate">
            <li *ngFor="let s of steps" class="tl-step" [ngClass]="'tl-' + s.state" [attr.aria-current]="s.status === order.status ? 'step' : null">
              <span class="tl-dot" aria-hidden="true"><mat-icon *ngIf="s.state === 'done'">check</mat-icon></span>
              <span class="tl-label">{{ s.labelKey | translate }}<span class="sr-only" *ngIf="s.state === 'done'"> ({{ 'orders.stepDone' | translate }})</span></span>
            </li>
          </ol>

          <div class="seller-info">
            <span class="field-label">Seller</span>
            <span>{{ order.hustlerName }}</span>
          </div>

          <div class="items-list">
            <div *ngFor="let item of order.items" class="order-item">
              <span>{{ item.productName }}</span>
              <span class="item-detail">&#xD7; {{ item.quantity }} &#64; R {{ item.unitPrice | number:'1.2-2' }}</span>
            </div>
          </div>

          <div *ngIf="order.deliveryAddress" class="delivery-addr">
            📍 {{ order.deliveryAddress }}
          </div>

          <div class="pickup-qr-box" *ngIf="needsPickupQr(order)">
            <ng-container *ngIf="qrDataUrls()[order.id]; else qrLoading">
              <img [src]="qrDataUrls()[order.id]" alt="Pickup QR code" class="pickup-qr-img" />
            </ng-container>
            <ng-template #qrLoading>
              <p class="muted">Generating pickup code…</p>
            </ng-template>
            <p class="pickup-qr-label">Show this to the seller when you collect your order</p>
          </div>

          <div class="order-total">
            <span class="total-label">Total</span>
            <span class="total-amount">R {{ order.totalAmount | number:'1.2-2' }}</span>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: `
    .layout { max-width: 600px; margin: 0 auto; padding: 1rem 1rem 5rem; display: flex; flex-direction: column; gap: 1rem; }
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: var(--text-primary); font-weight: 800; }
    .muted { color: var(--text-secondary); font-size: 0.9rem; }
    .card { background: var(--bg-surface); border-radius: 1.5rem; padding: 1.5rem; box-shadow: var(--shadow-card); border: 1px solid var(--border-base); }

    .order-card { background: var(--bg-surface); border-radius: 1.25rem; padding: 1.25rem; box-shadow: var(--shadow-card); border: 1px solid var(--border-base); }
    .order-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.75rem; }
    .order-id { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); display: block; }
    .order-date { font-size: 0.78rem; display: block; color: var(--text-muted); }

    .order-meta { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .meta-chip { display: inline-block; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; background: var(--bg-muted); color: var(--text-secondary); }

    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }

    /* Status timeline: vertical on phones, one row once there is room for the labels */
    .timeline { list-style: none; margin: 0 0 0.875rem; padding: 0; display: flex; flex-direction: column; }
    .tl-step {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-height: 1.875rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .tl-step:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 10px;
      top: calc(50% + 11px);
      width: 2px;
      height: calc(100% - 22px);
      background: var(--border-base);
    }
    .tl-dot {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid var(--border-base);
      background: var(--bg-surface);
      box-sizing: border-box;
    }
    .tl-dot mat-icon { width: 14px; height: 14px; font-size: 14px; color: #FFFFFF; }
    .tl-done { color: var(--text-primary); font-weight: 700; }
    .tl-done .tl-dot { background: var(--success-fill); border-color: var(--success-fill); }
    .tl-done:not(:last-child)::after { background: var(--success-fill); }
    .tl-current { color: var(--text-primary); font-weight: 800; }
    .tl-current .tl-dot { background: var(--hustle-yellow); border: 3px solid var(--text-primary); }
    @media (min-width: 480px) {
      .timeline { flex-direction: row; }
      .tl-step {
        flex: 1 1 0;
        min-width: 0;
        flex-direction: column;
        gap: 0.375rem;
        min-height: 0;
        text-align: center;
        font-size: 0.8125rem;
      }
      .tl-step:not(:last-child)::after { left: calc(50% + 11px); top: 10px; width: calc(100% - 22px); height: 2px; }
    }

    .tl-cancelled {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.875rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      background: var(--bg-muted);
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 700;
    }
    .tl-cancelled mat-icon { flex-shrink: 0; color: var(--color-danger); }

    .seller-info { display: flex; flex-direction: column; gap: 0.1rem; margin-bottom: 0.75rem; }
    .field-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }

    .items-list { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.75rem; }
    .order-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: var(--text-primary); padding: 0.4rem 0; border-bottom: 1px solid var(--border-base); }
    .item-detail { color: var(--text-muted); font-size: 0.82rem; }

    .delivery-addr { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(245,184,0,0.06); border: 1px solid rgba(245,184,0,0.2); border-radius: 0.75rem; }

    .pickup-qr-box { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; padding: 1rem; background: var(--bg-muted); border: 2px dashed var(--border-base); border-radius: 1rem; text-align: center; }
    .pickup-qr-img { width: 160px; height: 160px; }
    .pickup-qr-label { font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); margin: 0; }

    .order-total { display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 2px solid var(--border-base); }
    .total-label { font-size: 0.8rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .total-amount { font-size: 1.2rem; font-weight: 800; color: var(--text-primary); }

    /* Status Badges */
    .status-badge { display: inline-block; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; font-weight: 800; white-space: nowrap; }
    .status-pending { background: #F5F0E8; color: #78716C; }
    .status-confirmed { background: rgba(27,111,212,0.1); color: #1B6FD4; }
    .status-driver-assigned { background: rgba(139,47,201,0.1); color: #8B2FC9; }
    .status-en-route { background: rgba(245,184,0,0.15); color: #92620A; }
    .status-delivered { background: rgba(45,179,68,0.12); color: #166534; }
    .status-collected { background: rgba(45,179,68,0.12); color: #166534; }
    .status-cancelled { background: rgba(229,57,53,0.1); color: #E53935; }

    .btn-primary { height: 48px; border: none; border-radius: 999px; font-size: 1rem; font-weight: 800; background: #F5B800; color: #1C1917; cursor: pointer; width: 100%; font-family: inherit; box-shadow: 0 4px 12px rgba(245,184,0,0.35); transition: box-shadow 0.15s; }
    .btn-primary:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }
  `
})
export class CustomerOrdersPageComponent implements OnInit {
  readonly customerAuth = inject(CustomerAuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  orders = signal<OrderResponse[]>([]);
  loading = signal(false);
  qrDataUrls = signal<Record<string, string>>({});

  // No timeline for a status that isn't on the order's path (cancelled, or an unexpected value)
  readonly timelines = computed(() => new Map(this.orders().map((o): [string, TimelineStep[] | null] => {
    const steps = o.fulfillmentType === 'COLLECTION' ? COLLECTION_STEPS : DELIVERY_STEPS;
    const at = steps.indexOf(o.status);
    if (at === -1) return [o.id, null];
    const finished = at === steps.length - 1;
    return [o.id, steps.map((status, i): TimelineStep => ({
      status,
      labelKey: 'orders.step.' + status,
      state: i < at || finished ? 'done' : i === at ? 'current' : 'todo',
    }))];
  })));

  ngOnInit(): void {
    if (!this.customerAuth.isLoggedIn()) return;
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.api.getMyOrders(this.customerAuth.getToken()!).subscribe({
      next: (list) => {
        this.orders.set([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        this.loading.set(false);
        this.generateQrCodes(list);
      },
      error: () => this.loading.set(false)
    });
  }

  needsPickupQr(order: OrderResponse): boolean {
    return order.fulfillmentType === 'COLLECTION' && order.status !== 'COLLECTED' && order.status !== 'CANCELLED';
  }

  private async generateQrCodes(list: OrderResponse[]): Promise<void> {
    const pending = list.filter(o => this.needsPickupQr(o) && o.pickupToken && !this.qrDataUrls()[o.id]);
    for (const order of pending) {
      try {
        const dataUrl = await QRCode.toDataURL(order.pickupToken!, { width: 220, margin: 1 });
        this.qrDataUrls.update(m => ({ ...m, [order.id]: dataUrl }));
      } catch {
        // QR generation failed — customer can still reference the order id with the seller
      }
    }
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      DRIVER_ASSIGNED: 'Driver Assigned',
      EN_ROUTE: 'En Route',
      DELIVERED: 'Delivered',
      COLLECTED: 'Collected',
      CANCELLED: 'Cancelled'
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'status-pending',
      CONFIRMED: 'status-confirmed',
      DRIVER_ASSIGNED: 'status-driver-assigned',
      EN_ROUTE: 'status-en-route',
      DELIVERED: 'status-delivered',
      COLLECTED: 'status-collected',
      CANCELLED: 'status-cancelled'
    };
    return map[status] ?? 'status-pending';
  }
}
