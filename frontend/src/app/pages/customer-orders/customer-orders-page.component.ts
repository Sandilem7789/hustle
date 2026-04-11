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
    .page-header h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: #0f172a; }
    .muted { color: #475569; font-size: 0.9rem; }
    .card { background: white; border-radius: 1.5rem; padding: 1.5rem; box-shadow: 0 25px 60px rgba(15,23,42,0.10); }

    .order-card { background: white; border-radius: 1.5rem; padding: 1.5rem; box-shadow: 0 8px 30px rgba(15,23,42,0.08); border: 1px solid #f1f5f9; }
    .order-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.75rem; }
    .order-id { font-size: 0.95rem; font-weight: 800; color: #0f172a; display: block; }
    .order-date { font-size: 0.78rem; display: block; }

    .order-meta { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .meta-chip { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; background: #f1f5f9; color: #475569; }

    .seller-info { display: flex; flex-direction: column; gap: 0.1rem; margin-bottom: 0.75rem; }
    .field-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }

    .items-list { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.75rem; }
    .order-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #334155; padding: 0.4rem 0; border-bottom: 1px solid #f8fafc; }
    .item-detail { color: #94a3b8; font-size: 0.82rem; }

    .delivery-addr { font-size: 0.85rem; color: #475569; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #f0f9ff; border-radius: 0.5rem; }

    .order-total { display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 2px solid #f1f5f9; }
    .total-label { font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
    .total-amount { font-size: 1.2rem; font-weight: 800; color: #0f172a; }

    /* Status Badges */
    .status-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
    .status-pending { background: #f1f5f9; color: #475569; }
    .status-confirmed { background: #dbeafe; color: #1d4ed8; }
    .status-driver-assigned { background: #ede9fe; color: #6d28d9; }
    .status-en-route { background: #fef3c7; color: #92400e; }
    .status-delivered { background: #dcfce7; color: #16a34a; }
    .status-cancelled { background: #fee2e2; color: #dc2626; }

    .btn-primary { height: 48px; border: none; border-radius: 0.75rem; font-size: 1rem; font-weight: 700; background: linear-gradient(135deg, #0ea5e9, #22c55e); color: white; cursor: pointer; width: 100%; font-family: inherit; }
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
