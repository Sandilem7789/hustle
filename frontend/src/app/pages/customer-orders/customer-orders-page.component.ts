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
const FINISHED = new Set(['DELIVERED', 'COLLECTED', 'CANCELLED']);

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
    <header class="head dash-head" *ngIf="customerAuth.isLoggedIn()">
      <div class="head-inner">
        <p class="eyebrow">{{ 'nav.shop' | translate }}</p>
        <h1 class="title">{{ 'sidenav.myOrders' | translate }}</h1>
        <div class="seg-tabs" role="group" [attr.aria-label]="'sidenav.myOrders' | translate">
          <button type="button" [attr.aria-pressed]="tab() === 'active'" (click)="tab.set('active')">
            {{ 'orders.onTheGo' | translate }} {{ activeOrders().length || '' }}
          </button>
          <button type="button" [attr.aria-pressed]="tab() === 'done'" (click)="tab.set('done')">
            {{ 'orders.done' | translate }}
          </button>
        </div>
      </div>
    </header>

    <div class="layout">
      <div class="card" *ngIf="!customerAuth.isLoggedIn()">
        <h2>{{ 'orders.loginPrompt' | translate }}</h2>
        <a routerLink="/login" [queryParams]="{ return: '/orders' }" class="btn-primary">{{ 'orders.goToLogin' | translate }}</a>
      </div>

      <ng-container *ngIf="customerAuth.isLoggedIn()">
        <app-loading-skeleton [loading]="loading()" variant="order"></app-loading-skeleton>

        <div *ngIf="!loading() && visibleOrders().length === 0" class="card">
          <p class="muted">{{ (tab() === 'active' && orders().length > 0 ? 'orders.noneActive' : 'orders.empty') | translate }}</p>
          <a routerLink="/marketplace" class="btn-primary">{{ 'orders.startShopping' | translate }}</a>
        </div>

        <article *ngFor="let order of visibleOrders()" class="order-card" [attr.aria-label]="order.hustlerName">
          <div class="order-header">
            <div class="order-who">
              <h2 class="shop">{{ order.hustlerName }}</h2>
              <p class="sub">
                {{ itemSummary(order) }} ·
                <span class="meta-chip">{{ (order.fulfillmentType === 'DELIVERY' ? 'orders.delivery' : 'orders.collection') | translate }}</span>
              </p>
              <p class="order-id">#{{ order.id.slice(0, 8).toUpperCase() }} · {{ order.createdAt | date:'d MMM, HH:mm' }}</p>
            </div>
            <span class="status-badge" [ngClass]="statusClass(order.status)">{{ 'orders.step.' + order.status | translate }}</span>
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

          <div class="pickup-qr-box" *ngIf="needsPickupQr(order)">
            <ng-container *ngIf="qrDataUrls()[order.id]; else qrLoading">
              <img [src]="qrDataUrls()[order.id]" [alt]="'orders.qrAlt' | translate" class="pickup-qr-img" />
            </ng-container>
            <ng-template #qrLoading>
              <p class="muted">{{ 'orders.qrLoading' | translate }}</p>
            </ng-template>
            <strong class="pickup-qr-title">{{ 'orders.qrTitle' | translate }}</strong>
            <p class="pickup-qr-label">{{ 'orders.qrHint' | translate }}</p>
          </div>

          <div *ngIf="order.deliveryAddress" class="delivery-addr">
            <mat-icon aria-hidden="true">place</mat-icon>{{ order.deliveryAddress }}
          </div>

          <div class="order-total">
            <span class="total-label">{{ 'orders.total' | translate }}</span>
            <span class="total-amount">R {{ order.totalAmount | number:'1.0-2' }}</span>
          </div>
        </article>
      </ng-container>
    </div>
  `,
  styles: `
    :host { display: block; }
    .head-inner { max-width: 640px; margin: 0 auto; padding: 20px 16px 16px; display: flex; flex-direction: column; gap: 14px; }
    .eyebrow { margin: 0 0 -8px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--success-text); }
    .title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 800; line-height: 1; letter-spacing: -0.015em; color: var(--nav-fg); }
    .layout { max-width: 640px; margin: 0 auto; padding: 16px 16px 5rem; display: flex; flex-direction: column; gap: 14px; }
    .muted { color: var(--text-secondary); font-size: 0.9rem; }
    .card { background: var(--bg-surface); border-radius: 20px; padding: 18px; border: 1px solid var(--border-base); display: flex; flex-direction: column; gap: 14px; }
    .card h2, .card p { margin: 0; }

    .order-card { background: var(--bg-surface); border-radius: 20px; padding: 18px; border: 1px solid var(--border-base); display: flex; flex-direction: column; gap: 14px; }
    .order-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .order-who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .shop { margin: 0; font-size: 1.0625rem; font-weight: 700; color: var(--text-primary); }
    .sub { margin: 0; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.35; }
    .order-id { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
    .meta-chip { color: var(--text-secondary); }

    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }

    /* Status timeline: vertical on phones, one row once there is room for the labels */
    .timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .tl-step {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-height: 2.25rem;
      font-size: 0.9375rem;
      font-weight: 400;
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
    .tl-done { color: var(--text-primary); }
    .tl-done .tl-dot { background: var(--success-fill); border-color: var(--success-fill); }
    .tl-done:not(:last-child)::after { background: var(--success-fill); }
    .tl-current { color: var(--text-primary); font-weight: 700; }
    .tl-current .tl-dot { background: var(--gold); border-color: var(--gold); box-shadow: 0 0 0 4px rgba(229, 163, 29, 0.25); }
    @media (min-width: 640px) {
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
      margin: 0;
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

    .delivery-addr { display: flex; align-items: flex-start; gap: 0.375rem; font-size: 0.875rem; color: var(--text-secondary); }
    .delivery-addr mat-icon { flex-shrink: 0; width: 18px; height: 18px; font-size: 18px; }

    .pickup-qr-box { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px; background: #FFFFFF; border: 1px solid var(--border-base); border-radius: 16px; text-align: center; color: #13251E; }
    .pickup-qr-img { width: 184px; height: 184px; }
    .pickup-qr-title { font-size: 1rem; }
    .pickup-qr-label { font-size: 0.875rem; color: #4A524C; margin: 0; }

    .order-total { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-base); font-size: 0.9375rem; }
    .total-label { color: var(--text-secondary); }
    .total-amount { font-weight: 700; color: var(--text-primary); }

    /* Status Badges */
    .status-badge { display: inline-block; padding: 5px 10px; border-radius: 999px; font-size: 0.8125rem; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
    .status-pending { background: #EFE8DA; color: #4A524C; }
    .status-confirmed { background: rgba(27,111,212,0.1); color: #2F6DB5; }
    .status-driver-assigned { background: rgba(139,47,201,0.1); color: #7A4BB0; }
    .status-en-route { background: rgba(229, 163, 29,0.15); color: #8A5A0B; }
    .status-delivered { background: rgba(45,179,68,0.12); color: #2E6B4A; }
    .status-collected { background: rgba(45,179,68,0.12); color: #2E6B4A; }
    .status-cancelled { background: rgba(229,57,53,0.1); color: #C62828; }
    .meta-chip mat-icon { width: 16px; height: 16px; font-size: 16px; }
    :host-context([data-theme="dark"]) .status-pending { background: var(--bg-muted); color: var(--text-secondary); }
    :host-context([data-theme="dark"]) .status-confirmed { background: rgba(27,111,212,0.22); color: #9CC3F5; }
    :host-context([data-theme="dark"]) .status-driver-assigned { background: rgba(139,47,201,0.24); color: #D3AEF5; }
    :host-context([data-theme="dark"]) .status-en-route { background: rgba(229, 163, 29,0.18); color: #F5CB4D; }
    :host-context([data-theme="dark"]) .status-delivered,
    :host-context([data-theme="dark"]) .status-collected { background: rgba(45,179,68,0.2); color: #86E09B; }
    :host-context([data-theme="dark"]) .status-cancelled { background: rgba(229,57,53,0.2); color: #FF9E99; }

    .btn-primary { display: flex; align-items: center; justify-content: center; height: 52px; border-radius: 16px; font-size: 1rem; font-weight: 700; background: var(--gold); color: var(--ink); text-decoration: none; }
  `
})
export class CustomerOrdersPageComponent implements OnInit {
  readonly customerAuth = inject(CustomerAuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  orders = signal<OrderResponse[]>([]);
  loading = signal(false);
  qrDataUrls = signal<Record<string, string>>({});
  tab = signal<'active' | 'done'>('active');

  readonly activeOrders = computed(() => this.orders().filter(o => !FINISHED.has(o.status)));
  readonly visibleOrders = computed(() => this.tab() === 'active' ? this.activeOrders() : this.orders().filter(o => FINISHED.has(o.status)));

  itemSummary(order: OrderResponse): string {
    return order.items.map(i => i.quantity > 1 ? `${i.quantity} × ${i.productName}` : i.productName).join(', ');
  }

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
