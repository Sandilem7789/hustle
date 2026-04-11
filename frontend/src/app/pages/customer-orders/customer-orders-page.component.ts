import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService, OrderResponse } from '../../services/api.service';
import { CustomerAuthService } from '../../services/customer-auth.service';

@Component({
  selector: 'app-customer-orders-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="layout">

      <div class="card" *ngIf="!customerAuth.isLoggedIn()">
        <h2>Please log in to view your orders</h2>
        <a routerLink="/customer/login" class="btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:1rem;">Go to Login</a>
      </div>

      <ng-container *ngIf="customerAuth.isLoggedIn()">
        <div class="page-header">
          <h1>My Orders</h1>
          <p class="muted">Track your purchases from Hustle Economy</p>
        </div>

        <div *ngIf="loading()" class="card">
          <p class="muted">Loading orders…</p>
        </div>

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
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: #1C1917; font-weight: 800; }
    .muted { color: #78716C; font-size: 0.9rem; }
    .card { background: white; border-radius: 1.5rem; padding: 1.5rem; box-shadow: 0 4px 24px rgba(28,25,23,0.08); border: 1px solid #E7E5E4; }

    .order-card { background: white; border-radius: 1.25rem; padding: 1.25rem; box-shadow: 0 2px 12px rgba(28,25,23,0.07); border: 1px solid #E7E5E4; }
    .order-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.75rem; }
    .order-id { font-size: 0.95rem; font-weight: 800; color: #1C1917; display: block; }
    .order-date { font-size: 0.78rem; display: block; color: #A8A29E; }

    .order-meta { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .meta-chip { display: inline-block; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; background: #F5F0E8; color: #78716C; }

    .seller-info { display: flex; flex-direction: column; gap: 0.1rem; margin-bottom: 0.75rem; }
    .field-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #A8A29E; }

    .items-list { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.75rem; }
    .order-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #1C1917; padding: 0.4rem 0; border-bottom: 1px solid #E7E5E4; }
    .item-detail { color: #A8A29E; font-size: 0.82rem; }

    .delivery-addr { font-size: 0.85rem; color: #78716C; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(245,184,0,0.06); border: 1px solid rgba(245,184,0,0.2); border-radius: 0.75rem; }

    .order-total { display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 2px solid #E7E5E4; }
    .total-label { font-size: 0.8rem; font-weight: 800; color: #A8A29E; text-transform: uppercase; letter-spacing: 0.05em; }
    .total-amount { font-size: 1.2rem; font-weight: 800; color: #1C1917; }

    /* Status Badges */
    .status-badge { display: inline-block; padding: 0.2rem 0.65rem; border-radius: 999px; font-size: 0.75rem; font-weight: 800; white-space: nowrap; }
    .status-pending { background: #F5F0E8; color: #78716C; }
    .status-confirmed { background: rgba(27,111,212,0.1); color: #1B6FD4; }
    .status-driver-assigned { background: rgba(139,47,201,0.1); color: #8B2FC9; }
    .status-en-route { background: rgba(245,184,0,0.15); color: #92620A; }
    .status-delivered { background: rgba(45,179,68,0.12); color: #166534; }
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
      },
      error: () => this.loading.set(false)
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pending',
      CONFIRMED: 'Confirmed',
      DRIVER_ASSIGNED: 'Driver Assigned',
      EN_ROUTE: 'En Route',
      DELIVERED: 'Delivered',
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
      CANCELLED: 'status-cancelled'
    };
    return map[status] ?? 'status-pending';
  }
}
