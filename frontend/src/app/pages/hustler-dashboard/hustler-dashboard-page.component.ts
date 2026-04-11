import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { jsPDF } from 'jspdf';
import { ApiService, ProductResponse, ProductRequest, IncomeEntryResponse, IncomeSummary, OrderResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-hustler-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <section class="layout">

      <!-- ── HERO BANNER ── -->
      <div class="hero-banner">
        <div class="hero-inner">
          <div class="hero-text">
            <p class="hero-greeting">Hi {{ auth.state()?.firstName }}!</p>
            <h1 class="hero-shop">{{ auth.state()?.businessName }}</h1>
            <span class="biz-type-badge">{{ auth.state()?.businessType ?? 'Hustler' }}</span>
          </div>
          <div class="hero-avatar" aria-hidden="true">🏪</div>
        </div>
      </div>

      <!-- ── FINANCIAL SUMMARY CARDS ── -->
      <div class="fin-grid">
        <div class="fin-card fin-income">
          <div class="fin-icon-wrap">↑</div>
          <div class="fin-body">
            <p class="fin-label">Income</p>
            <strong class="fin-val">R {{ (summary()?.monthIncome ?? 0) | number:'1.2-2' }}</strong>
            <p class="fin-period">This month</p>
          </div>
        </div>
        <div class="fin-card fin-expense">
          <div class="fin-icon-wrap">↓</div>
          <div class="fin-body">
            <p class="fin-label">Expenses</p>
            <strong class="fin-val">R {{ (summary()?.monthExpenses ?? 0) | number:'1.2-2' }}</strong>
            <p class="fin-period">This month</p>
          </div>
        </div>
        <div class="fin-card fin-profit">
          <div class="fin-icon-wrap">≈</div>
          <div class="fin-body">
            <p class="fin-label">Profit</p>
            <strong class="fin-val" [class.neg]="(summary()?.monthProfit ?? 0) < 0">
              R {{ (summary()?.monthProfit ?? 0) | number:'1.2-2' }}
            </strong>
            <p class="fin-period">This month</p>
          </div>
        </div>
      </div>

      <!-- ── LOG ACTION BUTTONS ── -->
      <div class="log-actions">
        <button class="log-btn log-income-btn" (click)="openLogIncome()">
          <span class="log-sign">+</span> Log Income
        </button>
        <button class="log-btn log-expense-btn" (click)="openLogExpense()">
          <span class="log-sign">−</span> Log Expense
        </button>
      </div>

      <!-- ── TAB BAR ── -->
      <div class="tab-bar">
        <button [class.active]="tab() === 'income'" (click)="tab.set('income')">Finances</button>
        <button [class.active]="tab() === 'products'" (click)="tab.set('products')">Products</button>
        <button [class.active]="tab() === 'orders'" (click)="loadOrders(); tab.set('orders')">Orders</button>
      </div>

      <!-- ── FINANCES TAB ── -->
      <ng-container *ngIf="tab() === 'income'">
        <div class="card">
          <div class="log-tabs">
            <button [class.active]="logTab() === 'income'" (click)="logTab.set('income')">Log Income</button>
            <button [class.active]="logTab() === 'expense'" (click)="logTab.set('expense')">Log Expense</button>
          </div>
          <form [formGroup]="incomeForm" (ngSubmit)="submitIncome()" class="income-grid">
            <label>
              <span>Date *</span>
              <input type="date" formControlName="date" />
            </label>
            <label>
              <span>Amount (ZAR) *</span>
              <input type="number" min="0" step="0.01" formControlName="amount" placeholder="0.00" />
            </label>
            <label class="span-2">
              <span>Notes (optional)</span>
              <input formControlName="notes" placeholder="e.g. sold beaded necklace, market day" />
            </label>

            <label class="checkbox-row span-2">
              <input type="checkbox" [(ngModel)]="isServiceIncome" [ngModelOptions]="{standalone: true}" />
              <span>This is for a service (generate invoice)</span>
            </label>

            <ng-container *ngIf="isServiceIncome">
              <div class="service-section span-2">
                <p class="service-heading">📋 Invoice details</p>
                <label>
                  <span>Customer name *</span>
                  <input [(ngModel)]="invoiceCustomer" [ngModelOptions]="{standalone: true}" placeholder="e.g. Sipho Dlamini" />
                </label>
                <label>
                  <span>Service description *</span>
                  <input [(ngModel)]="invoiceService" [ngModelOptions]="{standalone: true}" placeholder="e.g. Hair braiding — full head" />
                </label>
                <button type="button" class="invoice-btn"
                  (click)="createInvoicePdf()"
                  [disabled]="!invoiceCustomer || !invoiceService || !incomeForm.get('amount')?.value">
                  📄 Create &amp; Save Invoice as PDF
                </button>
              </div>
            </ng-container>

            <button class="primary span-2" type="submit" [disabled]="incomeForm.invalid || incomeLoading()">
              {{ incomeLoading() ? 'Saving…' : (logTab() === 'expense' ? 'Log Expense' : 'Log Income') }}
            </button>
          </form>
          <p *ngIf="incomeSuccess()" class="success">{{ logTab() === 'expense' ? 'Expense' : 'Income' }} logged!</p>
          <p *ngIf="incomeError()" class="error">{{ incomeError() }}</p>
        </div>

        <div class="card">
          <div class="history-header">
            <h2>Income history</h2>
            <div class="history-controls">
              <select [(ngModel)]="historyFilter" (change)="applyFilter()" [ngModelOptions]="{standalone: true}">
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="all">All time</option>
              </select>
              <button class="outline-btn" (click)="exportCsv('weekly')">↓ Weekly CSV</button>
              <button class="outline-btn" (click)="exportCsv('monthly')">↓ Monthly CSV</button>
            </div>
          </div>

          <div *ngIf="incomeHistory().length === 0" class="muted" style="margin-top:1rem">No entries yet.</div>
          <table *ngIf="incomeHistory().length > 0" class="income-table">
            <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Notes</th></tr></thead>
            <tbody>
              <tr *ngFor="let e of incomeHistory()" [class.expense-row]="e.entryType === 'EXPENSE'">
                <td>{{ e.date }}</td>
                <td><span class="badge" [class.income-badge]="e.entryType !== 'EXPENSE'" [class.expense-badge]="e.entryType === 'EXPENSE'">{{ e.entryType === 'EXPENSE' ? 'Expense' : 'Income' }}</span></td>
                <td [class.expense-amt]="e.entryType === 'EXPENSE'">{{ e.entryType === 'EXPENSE' ? '−' : '' }}R {{ e.amount | number:'1.2-2' }}</td>
                <td class="muted">{{ e.notes || '—' }}</td>
              </tr>
            </tbody>
          </table>

          <div class="period-summary" *ngIf="incomeHistory().length > 0">
            <div class="ps-item">
              <span class="ps-label">Income</span>
              <strong class="ps-income">R {{ periodSummary().income | number:'1.2-2' }}</strong>
            </div>
            <div class="ps-divider"></div>
            <div class="ps-item">
              <span class="ps-label">Expenses</span>
              <strong class="ps-expense">R {{ periodSummary().expenses | number:'1.2-2' }}</strong>
            </div>
            <div class="ps-divider"></div>
            <div class="ps-item">
              <span class="ps-label">Profit</span>
              <strong [class.ps-income]="periodSummary().profit >= 0" [class.ps-expense]="periodSummary().profit < 0">R {{ periodSummary().profit | number:'1.2-2' }}</strong>
            </div>
          </div>

          <ng-container *ngIf="lineChartData() as lcd">
            <ng-container *ngIf="lcd.points.length >= 2">
              <div class="lc-toggles">
                <label [class.lc-disabled]="!canToggle('income')">
                  <input type="checkbox" [checked]="showIncome()" (change)="toggleLine('income')" [disabled]="!canToggle('income')" />
                  <span class="lc-dot" style="background:#22c55e"></span> Income
                </label>
                <label [class.lc-disabled]="!canToggle('expense')">
                  <input type="checkbox" [checked]="showExpense()" (change)="toggleLine('expense')" [disabled]="!canToggle('expense')" />
                  <span class="lc-dot" style="background:#f87171"></span> Expenses
                </label>
                <label [class.lc-disabled]="!canToggle('profit')">
                  <input type="checkbox" [checked]="showProfit()" (change)="toggleLine('profit')" [disabled]="!canToggle('profit')" />
                  <span class="lc-dot" style="background:#0ea5e9"></span> Profit
                </label>
              </div>
              <svg viewBox="0 0 600 200" class="line-chart" preserveAspectRatio="xMidYMid meet">
                <line *ngFor="let y of lcd.gridlines" x1="15" x2="585" [attr.y1]="y" [attr.y2]="y" class="lc-grid" />
                <line x1="15" x2="585" [attr.y1]="lcd.zeroY" [attr.y2]="lcd.zeroY" class="lc-zero" />
                <polyline *ngIf="showIncome()" [attr.points]="lcd.incomePoints" class="lc-line lc-income" />
                <polyline *ngIf="showExpense()" [attr.points]="lcd.expensePoints" class="lc-line lc-expense" />
                <polyline *ngIf="showProfit()" [attr.points]="lcd.profitPoints" class="lc-line lc-profit" />
                <text *ngFor="let l of lcd.labels" [attr.x]="l.x" [attr.y]="l.y" class="lc-label">{{ l.text }}</text>
              </svg>
            </ng-container>
            <p *ngIf="lcd.points.length < 2 && incomeHistory().length > 0" class="muted" style="font-size:0.83rem;margin-top:1rem">
              Log entries on at least 2 different dates to see the trend graph.
            </p>
          </ng-container>
        </div>
      </ng-container>

      <!-- ── PRODUCTS TAB ── -->
      <ng-container *ngIf="tab() === 'products'">
        <div class="card info" *ngIf="products().length >= 40">
          <p>You have reached the 40-product limit. Remove a product to add a new one.</p>
        </div>

        <div class="card">
          <div class="shop-header">
            <div class="shop-left">
              <div class="shop-name-badge">🛒 {{ auth.state()?.businessName }}</div>
              <span class="approved-badge">✓ Approved</span>
            </div>
            <div class="shop-right">
              <span class="muted">{{ products().length }} / 40 listings</span>
              <button class="add-product-btn" *ngIf="products().length < 40" (click)="showAddModal.set(true)">
                + Add Product
              </button>
            </div>
          </div>
          <p *ngIf="addSuccess()" class="success" style="margin-top:0">Product added!</p>
          <div *ngIf="loadingProducts()" class="muted" style="margin-top:0.75rem">Loading…</div>
          <div *ngIf="!loadingProducts() && products().length === 0" class="muted" style="margin-top:0.75rem">
            No products yet. Tap "Add Product" to list your first item.
          </div>
          <div class="product-list">
            <article *ngFor="let p of products()" class="product-card">
              <!-- VIEW MODE -->
              <ng-container *ngIf="editingProductId() !== p.id">
                <img *ngIf="p.mediaUrl" [src]="resolveUrl(p.mediaUrl)" alt="{{ p.name }}" class="product-img" loading="lazy" />
                <div class="product-body">
                  <h3>{{ p.name }}</h3>
                  <p class="muted">{{ p.description }}</p>
                  <p class="price">R {{ p.price | number:'1.2-2' }}</p>
                </div>
                <div class="card-actions">
                  <button class="edit-btn" (click)="startEdit(p)" title="Edit" aria-label="Edit product">✎</button>
                  <button class="delete-btn" (click)="deleteProduct(p)" title="Remove" aria-label="Remove product">✕</button>
                </div>
              </ng-container>

              <!-- EDIT MODE -->
              <ng-container *ngIf="editingProductId() === p.id">
                <div class="edit-form">
                  <label>
                    <span>Name *</span>
                    <input [value]="editName" (input)="editName = $any($event.target).value" />
                  </label>
                  <label>
                    <span>Description *</span>
                    <textarea rows="3" [value]="editDescription" (input)="editDescription = $any($event.target).value"></textarea>
                  </label>
                  <label>
                    <span>Price (ZAR) *</span>
                    <input type="number" min="0" step="0.01" [value]="editPrice" (input)="editPrice = +$any($event.target).value" />
                  </label>
                  <label>
                    <span>Replace image</span>
                    <input type="file" accept="image/*" (change)="onEditFileChange($event)" class="file-input" />
                    <small *ngIf="uploadLoading()">Uploading…</small>
                  </label>
                  <div class="edit-actions">
                    <button class="primary small-btn" (click)="saveEdit(p)" [disabled]="saveLoading() || uploadLoading()">
                      {{ saveLoading() ? 'Saving…' : 'Save' }}
                    </button>
                    <button class="outline-btn" (click)="cancelEdit()">Cancel</button>
                  </div>
                  <p *ngIf="saveError()" class="error">{{ saveError() }}</p>
                </div>
              </ng-container>
            </article>
          </div>
        </div>
      </ng-container>

      <!-- ── ORDERS TAB ── -->
      <ng-container *ngIf="tab() === 'orders'">
        <div class="card">
          <h2>Incoming Orders</h2>
          <div *ngIf="ordersLoading()" class="muted" style="margin-top:1rem">Loading orders…</div>
          <div *ngIf="!ordersLoading() && incomingOrders().length === 0" class="muted" style="margin-top:1rem">No orders yet.</div>
          <div class="orders-list">
            <article *ngFor="let order of incomingOrders()" class="order-card">
              <div class="order-head">
                <div>
                  <span class="order-id">#{{ order.id.slice(0, 8).toUpperCase() }}</span>
                  <span class="muted" style="font-size:0.78rem;display:block;">{{ order.createdAt | date:'d MMM yyyy, h:mm a' }}</span>
                </div>
                <span class="status-badge" [ngClass]="orderStatusClass(order.status)">{{ order.status }}</span>
              </div>
              <div class="order-customer">
                <span class="field-label">Customer</span>
                <span>{{ order.customerName }}</span>
              </div>
              <div class="order-meta-row">
                <span class="meta-chip">{{ order.fulfillmentType === 'DELIVERY' ? '🚚 Delivery' : '🏪 Collection' }}</span>
                <span class="meta-chip">{{ order.transactionType }}</span>
              </div>
              <div class="order-items">
                <div *ngFor="let item of order.items" class="order-line">
                  <span>{{ item.productName }}</span>
                  <span class="muted">× {{ item.quantity }} · R {{ item.unitPrice | number:'1.2-2' }}</span>
                </div>
              </div>
              <div class="order-total-row">
                <span class="field-label">Total</span>
                <strong>R {{ order.totalAmount | number:'1.2-2' }}</strong>
              </div>
              <div class="order-actions" *ngIf="order.status === 'PENDING'">
                <button class="btn-confirm" (click)="confirmOrder(order.id)" [disabled]="orderActionId() === order.id">
                  {{ orderActionId() === order.id ? 'Saving…' : '✓ Confirm' }}
                </button>
                <button class="btn-cancel-order" (click)="cancelOrder(order.id)" [disabled]="orderActionId() === order.id">
                  ✕ Cancel
                </button>
              </div>
              <p *ngIf="orderError() && orderActionId() === order.id" class="error">{{ orderError() }}</p>
            </article>
          </div>
        </div>
      </ng-container>

      <!-- ── ADD PRODUCT MODAL (fixed, inside layout for scoped styles) ── -->
      <div class="modal-overlay" *ngIf="showAddModal()" (click)="onOverlayClick($event)">
        <div class="modal-sheet">
          <div class="modal-head">
            <h2>Add a product</h2>
            <button class="modal-close" (click)="showAddModal.set(false)" aria-label="Close modal">✕</button>
          </div>
          <form [formGroup]="productForm" (ngSubmit)="submitProduct()" class="product-form">
            <label>
              <span>Name *</span>
              <input formControlName="name" placeholder="e.g. Handmade Bead Necklace" />
            </label>
            <label>
              <span>Description *</span>
              <textarea rows="3" formControlName="description" placeholder="Describe what you're selling"></textarea>
            </label>
            <label>
              <span>Price (ZAR) *</span>
              <input type="number" min="0" step="0.01" formControlName="price" placeholder="0.00" />
            </label>
            <label>
              <span>Product image</span>
              <input type="file" accept="image/*" (change)="onFileChange($event)" class="file-input" />
              <div *ngIf="imagePreview()" class="preview-wrap">
                <img [src]="imagePreview()!" alt="preview" class="preview" />
              </div>
              <small *ngIf="uploadLoading()">Uploading…</small>
            </label>
            <button class="primary" type="submit" [disabled]="productForm.invalid || addLoading() || uploadLoading()">
              {{ addLoading() ? 'Adding…' : 'Add to marketplace' }}
            </button>
            <p *ngIf="addError()" class="error">{{ addError() }}</p>
          </form>
        </div>
      </div>

    </section>
  `,
  styles: `
    /* ── Hero Banner ── */
    .hero-banner {
      background: linear-gradient(135deg, #f59e0b 0%, #10b981 100%);
      border-radius: 1.5rem;
      padding: 1.75rem;
      color: white;
      box-shadow: 0 12px 40px rgba(245,158,11,0.25);
    }
    .hero-inner { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .hero-text { display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
    .hero-greeting { font-size: 1rem; font-weight: 500; opacity: 0.9; margin: 0; }
    .hero-shop { font-size: 1.6rem; font-weight: 800; margin: 0; line-height: 1.15; word-break: break-word; }
    .biz-type-badge {
      display: inline-block;
      background: rgba(255,255,255,0.25);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 999px;
      padding: 0.25rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      align-self: flex-start;
    }
    .hero-avatar { font-size: 3rem; line-height: 1; flex-shrink: 0; }
    @media (max-width: 480px) {
      .hero-banner { padding: 1.25rem; }
      .hero-shop { font-size: 1.25rem; }
      .hero-avatar { font-size: 2rem; }
    }

    /* ── Financial Cards ── */
    .fin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    @media (max-width: 480px) { .fin-grid { grid-template-columns: 1fr; gap: 0.6rem; } }
    .fin-card {
      border-radius: 1.25rem;
      padding: 1rem 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .fin-income { background: linear-gradient(135deg, #dcfce7, #bbf7d0); border: 1px solid #86efac; }
    .fin-expense { background: linear-gradient(135deg, #fee2e2, #fecaca); border: 1px solid #fca5a5; }
    .fin-profit  { background: linear-gradient(135deg, #dbeafe, #bfdbfe); border: 1px solid #93c5fd; }
    .fin-icon-wrap {
      font-size: 1.4rem;
      font-weight: 900;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .fin-income .fin-icon-wrap { background: rgba(34,197,94,0.2);  color: #16a34a; }
    .fin-expense .fin-icon-wrap { background: rgba(220,38,38,0.15); color: #dc2626; }
    .fin-profit  .fin-icon-wrap { background: rgba(14,165,233,0.15); color: #0369a1; }
    .fin-body { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .fin-label  { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; margin: 0; }
    .fin-val    { font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0; word-break: break-all; }
    .fin-val.neg { color: #dc2626; }
    .fin-period { font-size: 0.66rem; color: #94a3b8; margin: 0; }

    /* ── Log Buttons ── */
    .log-actions { display: flex; gap: 0.75rem; }
    .log-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      border: none;
      border-radius: 1rem;
      padding: 1rem 1.25rem;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      min-height: 56px;
      transition: opacity 0.15s, transform 0.1s;
    }
    .log-btn:active { transform: scale(0.97); }
    .log-income-btn { background: linear-gradient(120deg, #16a34a, #22c55e); color: white; box-shadow: 0 4px 16px rgba(34,197,94,0.35); }
    .log-expense-btn { background: linear-gradient(120deg, #b91c1c, #ef4444); color: white; box-shadow: 0 4px 16px rgba(220,38,38,0.3); }
    .log-sign { font-size: 1.5rem; font-weight: 900; line-height: 1; }

    /* ── Tab Bar ── */
    .tab-bar { display: flex; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(15,23,42,0.08); }
    .tab-bar button { flex: 1; padding: 0.9rem; border: none; background: none; font-size: 1rem; font-weight: 600; color: #94a3b8; cursor: pointer; transition: all 0.2s; min-height: 48px; font-family: inherit; }
    .tab-bar button.active { color: #0ea5e9; border-bottom: 3px solid #0ea5e9; background: #f0f9ff; }

    /* ── Cards ── */
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 25px 60px rgba(15,23,42,0.08); }
    @media (max-width: 600px) { .card { padding: 1.25rem; border-radius: 1rem; } }
    .card.info { background: #fef3c7; }

    /* ── Log Form ── */
    .log-tabs { display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.25rem; }
    .log-tabs button { flex: 1; padding: 0.65rem; border: none; background: none; font-size: 0.95rem; font-weight: 600; color: #94a3b8; cursor: pointer; transition: all 0.2s; min-height: 44px; font-family: inherit; }
    .log-tabs button.active { color: #0ea5e9; border-bottom: 2px solid #0ea5e9; margin-bottom: -2px; }
    .income-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.25rem; }
    @media (max-width: 600px) { .income-grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; color: #475569; }
    label.span-2 { grid-column: span 2; }
    @media (max-width: 600px) { label.span-2 { grid-column: span 1; } }
    input, textarea, select { border-radius: 0.8rem; border: 1px solid #cbd5e1; padding: 0.65rem 0.9rem; font-size: 1rem; font-family: inherit; width: 100%; box-sizing: border-box; background: white; }
    input:focus, textarea:focus, select:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
    .file-input { border: none; padding: 0; font-size: 0.9rem; min-height: unset !important; }
    .preview-wrap { margin-top: 0.5rem; }
    .preview { width: 100%; max-height: 140px; object-fit: cover; border-radius: 0.75rem; }
    .primary { border: none; border-radius: 999px; padding: 0.9rem; font-size: 1rem; font-weight: 700; background: linear-gradient(120deg, #0ea5e9, #22c55e); color: white; cursor: pointer; font-family: inherit; }
    .primary.span-2 { grid-column: span 2; }
    @media (max-width: 600px) { .primary.span-2 { grid-column: span 1; } }
    .primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .success { color: #16a34a; font-weight: 600; margin-top: 0.75rem; }
    .error   { color: #dc2626; font-weight: 600; margin-top: 0.75rem; }
    .checkbox-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.95rem; color: #334155; cursor: pointer; flex-direction: row; }
    .checkbox-row input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: #16a34a; flex-shrink: 0; min-height: unset !important; }
    .service-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.8rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .service-heading { margin: 0; font-weight: 700; font-size: 0.9rem; color: #15803d; }
    .service-section label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; color: #475569; }
    .service-section input { border-radius: 0.6rem; border: 1px solid #cbd5e1; padding: 0.55rem 0.8rem; font-size: 0.95rem; font-family: inherit; width: 100%; box-sizing: border-box; background: white; }
    .invoice-btn { border: 2px solid #16a34a; color: #16a34a; font-weight: 700; padding: 0.65rem 1rem; border-radius: 999px; background: white; cursor: pointer; font-size: 0.9rem; font-family: inherit; transition: background 0.15s; }
    .invoice-btn:hover:not(:disabled) { background: #dcfce7; }
    .invoice-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    /* ── History ── */
    .history-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
    .history-controls { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .outline-btn { border: 1px solid #cbd5e1; background: white; border-radius: 999px; padding: 0.4rem 0.9rem; font-size: 0.85rem; cursor: pointer; color: #475569; min-height: 36px; font-family: inherit; }
    .outline-btn:hover { background: #f1f5f9; }
    .income-table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
    .income-table th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid #e2e8f0; color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; }
    .income-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
    .income-badge  { background: #dcfce7; color: #16a34a; }
    .expense-badge { background: #fee2e2; color: #dc2626; }
    .expense-row td { background: #fff5f5; }
    .expense-amt { color: #dc2626; font-weight: 600; }
    .period-summary { display: flex; align-items: center; margin-top: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.8rem; overflow: hidden; }
    .ps-item { flex: 1; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
    .ps-label   { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; font-weight: 700; }
    .ps-income  { font-size: 1rem; font-weight: 700; color: #16a34a; }
    .ps-expense { font-size: 1rem; font-weight: 700; color: #dc2626; }
    .ps-divider { width: 1px; background: #e2e8f0; align-self: stretch; }

    /* ── Line Chart ── */
    .lc-toggles { display: flex; gap: 1.25rem; flex-wrap: wrap; margin: 1.25rem 0 0.4rem; }
    .lc-toggles label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #334155; cursor: pointer; user-select: none; flex-direction: row; }
    .lc-toggles label.lc-disabled { opacity: 0.4; cursor: not-allowed; }
    .lc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .line-chart { width: 100%; height: auto; display: block; }
    .lc-grid   { stroke: #f1f5f9; stroke-width: 1; }
    .lc-zero   { stroke: #cbd5e1; stroke-width: 1; stroke-dasharray: 4 3; }
    .lc-line   { fill: none; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
    .lc-income  { stroke: #22c55e; }
    .lc-expense { stroke: #f87171; }
    .lc-profit  { stroke: #0ea5e9; }
    .lc-label  { font-size: 10px; fill: #94a3b8; text-anchor: middle; font-family: inherit; }

    /* ── Products Tab ── */
    .shop-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
    .shop-left { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .shop-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .shop-name-badge { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
    .approved-badge { background: #dcfce7; color: #16a34a; border-radius: 999px; padding: 0.2rem 0.75rem; font-size: 0.75rem; font-weight: 700; }
    .add-product-btn { background: linear-gradient(120deg, #0ea5e9, #22c55e); color: white; border: none; border-radius: 999px; padding: 0.55rem 1.2rem; font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit; min-height: 40px; }
    .product-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
    @media (max-width: 600px) { .product-list { grid-template-columns: 1fr; } }
    .product-card { border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; background: #f8fafc; position: relative; }
    .product-img { width: 100%; height: 150px; object-fit: cover; display: block; }
    .product-body { padding: 0.9rem 0.9rem 0.4rem; }
    .product-body h3 { margin: 0 0 0.3rem; font-size: 1rem; }
    .price { font-weight: 700; color: #0ea5e9; margin-top: 0.4rem; }
    .card-actions { position: absolute; top: 0.5rem; right: 0.5rem; display: flex; gap: 0.3rem; }
    .edit-btn   { background: rgba(14,165,233,0.9); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; min-height: unset; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .delete-btn { background: rgba(220,38,38,0.9); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; min-height: unset; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .edit-form { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .edit-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .small-btn { padding: 0.5rem 1rem !important; font-size: 0.9rem; width: auto !important; }
    small { color: #94a3b8; font-size: 0.8rem; }

    /* ── Add Product Modal ── */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,0.6);
      z-index: 200;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }
    @media (min-width: 600px) { .modal-overlay { align-items: center; } }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    .modal-sheet {
      background: white;
      border-radius: 1.5rem 1.5rem 0 0;
      padding: 1.5rem;
      width: 100%;
      max-width: 560px;
      max-height: 92vh;
      overflow-y: auto;
      animation: slideUp 0.25s ease;
    }
    @media (min-width: 600px) { .modal-sheet { border-radius: 1.5rem; max-height: 85vh; } }
    @keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .modal-head h2 { margin: 0; font-size: 1.2rem; }
    .modal-close { background: #f1f5f9; border: none; border-radius: 50%; width: 36px; height: 36px; min-height: unset; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; flex-shrink: 0; font-family: inherit; }
    .modal-close:hover { background: #e2e8f0; }
    .product-form { display: flex; flex-direction: column; gap: 1rem; }

    /* ── Orders ── */
    .orders-list { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
    .order-card { border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem 1.25rem; background: #f8fafc; }
    .order-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
    .order-id { font-weight: 800; font-size: 0.9rem; color: #0f172a; display: block; }
    .order-customer { display: flex; flex-direction: column; gap: 0.1rem; margin-bottom: 0.5rem; }
    .order-meta-row { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
    .meta-chip { font-size: 0.75rem; background: #f1f5f9; color: #475569; padding: 0.15rem 0.5rem; border-radius: 999px; }
    .order-items { margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .order-line { display: flex; justify-content: space-between; font-size: 0.88rem; color: #334155; }
    .order-total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid #e2e8f0; margin-bottom: 0.75rem; }
    .order-actions { display: flex; gap: 0.5rem; }
    .btn-confirm    { flex: 1; height: 44px; min-height: unset; border: none; border-radius: 0.75rem; background: #16a34a; color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; font-family: inherit; }
    .btn-cancel-order { flex: 1; height: 44px; min-height: unset; border: none; border-radius: 0.75rem; background: #dc2626; color: white; font-weight: 700; font-size: 0.9rem; cursor: pointer; font-family: inherit; }
    .btn-confirm:disabled, .btn-cancel-order:disabled { opacity: 0.6; cursor: not-allowed; }
    .field-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
    .status-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
    .order-status-pending   { background: #f1f5f9; color: #475569; }
    .order-status-confirmed { background: #dbeafe; color: #1d4ed8; }
    .order-status-cancelled { background: #fee2e2; color: #dc2626; }
    .order-status-delivered { background: #dcfce7; color: #16a34a; }
  `
})
export class HustlerDashboardPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  tab = signal<'income' | 'products' | 'orders'>('income');
  logTab = signal<'income' | 'expense'>('income');
  showAddModal = signal(false);

  // ── Income ──────────────────────────────────────────────────────────────────
  incomeHistory = signal<IncomeEntryResponse[]>([]);
  summary = signal<IncomeSummary | null>(null);
  incomeLoading = signal(false);
  incomeSuccess = signal(false);
  incomeError = signal('');
  historyFilter = 'week';

  isServiceIncome = false;
  invoiceCustomer = '';
  invoiceService = '';

  incomeForm = this.fb.group({
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0)]],
    notes: [''],
  });

  // ── Line chart toggles ───────────────────────────────────────────────────────
  showIncome = signal(true);
  showExpense = signal(true);
  showProfit = signal(true);
  visibleCount = computed(() => (this.showIncome() ? 1 : 0) + (this.showExpense() ? 1 : 0) + (this.showProfit() ? 1 : 0));

  canToggle(line: 'income' | 'expense' | 'profit'): boolean {
    const vis = line === 'income' ? this.showIncome() : line === 'expense' ? this.showExpense() : this.showProfit();
    return !(vis && this.visibleCount() === 1);
  }

  toggleLine(line: 'income' | 'expense' | 'profit'): void {
    if (!this.canToggle(line)) return;
    if (line === 'income') this.showIncome.update(v => !v);
    else if (line === 'expense') this.showExpense.update(v => !v);
    else this.showProfit.update(v => !v);
  }

  lineChartData = computed(() => {
    const entries = this.incomeHistory();
    const byDate = new Map<string, { income: number; expense: number }>();
    for (const e of entries) {
      const d = e.date;
      const cur = byDate.get(d) ?? { income: 0, expense: 0 };
      if (e.entryType === 'EXPENSE') cur.expense += Number(e.amount);
      else cur.income += Number(e.amount);
      byDate.set(d, cur);
    }
    const sorted = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
    const points = sorted.map(([, v]) => ({ income: v.income, expense: v.expense, profit: v.income - v.expense }));
    const dates = sorted.map(([d]) => d);

    if (points.length < 2) return { points, incomePoints: '', expensePoints: '', profitPoints: '', zeroY: '100', gridlines: [] as string[], labels: [] as { x: string; y: string; text: string }[] };

    const PL = 20, PR = 580, PT = 15, PB = 35, H = 200;
    const CW = PR - PL, CH = H - PT - PB;
    const allVals = points.flatMap(p => [p.income, p.expense, p.profit]);
    const maxV = Math.max(...allVals, 1);
    const minV = Math.min(...allVals, 0);
    const range = maxV - minV || 1;

    const tx = (i: number) => (PL + (i / (points.length - 1)) * CW).toFixed(1);
    const ty = (v: number) => (PT + (1 - (v - minV) / range) * CH).toFixed(1);
    const pts = (vals: number[]) => vals.map((v, i) => `${tx(i)},${ty(v)}`).join(' ');

    const step = Math.max(1, Math.ceil(dates.length / 6));
    const labels = dates
      .map((d, i) => ({ x: tx(i), y: String(H - 8), text: d.slice(5) }))
      .filter((_, i) => i % step === 0 || i === dates.length - 1);

    const gridlines = [0.25, 0.5, 0.75].map(p => ty(minV + p * range));

    return {
      points,
      incomePoints: pts(points.map(p => p.income)),
      expensePoints: pts(points.map(p => p.expense)),
      profitPoints: pts(points.map(p => p.profit)),
      zeroY: ty(0),
      gridlines,
      labels
    };
  });

  periodSummary = computed(() => {
    const entries = this.incomeHistory();
    const income   = entries.filter(e => e.entryType !== 'EXPENSE').reduce((s, e) => s + Number(e.amount), 0);
    const expenses = entries.filter(e => e.entryType === 'EXPENSE').reduce((s, e) => s + Number(e.amount), 0);
    return { income, expenses, profit: income - expenses };
  });

  // ── Products ─────────────────────────────────────────────────────────────────
  products = signal<ProductResponse[]>([]);
  loadingProducts = signal(true);
  addLoading = signal(false);
  uploadLoading = signal(false);
  addError = signal('');
  addSuccess = signal(false);
  imagePreview = signal<string | null>(null);
  private pendingImageUrl = signal<string | null>(null);

  editingProductId = signal<string | null>(null);
  editName = '';
  editDescription = '';
  editPrice = 0;
  private editPendingImageUrl: string | null = null;
  saveLoading = signal(false);
  saveError = signal('');

  productForm = this.fb.group({
    name:        ['', Validators.required],
    description: ['', Validators.required],
    price:       [null as number | null, [Validators.required, Validators.min(0)]],
  });

  // ── Orders ───────────────────────────────────────────────────────────────────
  incomingOrders = signal<OrderResponse[]>([]);
  ordersLoading = signal(false);
  orderActionId = signal<string | null>(null);
  orderError = signal('');

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/register']); return; }
    this.loadProducts();
    this.loadIncome();
    this.loadSummary();
  }

  // ── Navigation helpers ───────────────────────────────────────────────────────
  openLogIncome(): void { this.tab.set('income'); this.logTab.set('income'); }
  openLogExpense(): void { this.tab.set('income'); this.logTab.set('expense'); }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.showAddModal.set(false);
    }
  }

  // ── Orders ───────────────────────────────────────────────────────────────────
  loadOrders(): void {
    const token = this.auth.getToken();
    if (!token) return;
    this.ordersLoading.set(true);
    this.api.getIncomingOrders(token).subscribe({
      next: (orders) => {
        this.incomingOrders.set([...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        this.ordersLoading.set(false);
      },
      error: () => this.ordersLoading.set(false)
    });
  }

  confirmOrder(orderId: string): void {
    const token = this.auth.getToken();
    if (!token) return;
    this.orderActionId.set(orderId);
    this.orderError.set('');
    this.api.updateOrderStatus(orderId, 'CONFIRMED', token).subscribe({
      next: (updated) => { this.incomingOrders.update(list => list.map(o => o.id === updated.id ? updated : o)); this.orderActionId.set(null); },
      error: (err) => { this.orderActionId.set(null); this.orderError.set(err?.error?.message || 'Failed to confirm order.'); }
    });
  }

  cancelOrder(orderId: string): void {
    const token = this.auth.getToken();
    if (!token) return;
    this.orderActionId.set(orderId);
    this.orderError.set('');
    this.api.updateOrderStatus(orderId, 'CANCELLED', token).subscribe({
      next: (updated) => { this.incomingOrders.update(list => list.map(o => o.id === updated.id ? updated : o)); this.orderActionId.set(null); },
      error: (err) => { this.orderActionId.set(null); this.orderError.set(err?.error?.message || 'Failed to cancel order.'); }
    });
  }

  orderStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'order-status-pending', CONFIRMED: 'order-status-confirmed',
      CANCELLED: 'order-status-cancelled', DELIVERED: 'order-status-delivered'
    };
    return map[status] ?? 'order-status-pending';
  }

  // ── Income ───────────────────────────────────────────────────────────────────
  loadIncome(): void {
    const token = this.auth.getToken()!;
    const today = new Date();
    let from: string | undefined;
    if (this.historyFilter === 'week') {
      const d = new Date(today); d.setDate(d.getDate() - 7);
      from = d.toISOString().slice(0, 10);
    } else if (this.historyFilter === 'month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    }
    const to = today.toISOString().slice(0, 10);
    this.api.listMyIncome(token, from, this.historyFilter !== 'all' ? to : undefined)
      .subscribe({ next: list => this.incomeHistory.set(list), error: () => {} });
  }

  loadSummary(): void {
    this.api.getIncomeSummary(this.auth.getToken()!).subscribe({ next: s => this.summary.set(s), error: () => {} });
  }

  applyFilter(): void { this.loadIncome(); }

  submitIncome(): void {
    if (this.incomeForm.invalid) return;
    this.incomeLoading.set(true);
    this.incomeError.set('');
    const payload = {
      ...this.incomeForm.value,
      channel: 'CASH' as const,
      entryType: (this.logTab() === 'expense' ? 'EXPENSE' : 'INCOME') as 'INCOME' | 'EXPENSE'
    };
    this.api.logIncome(payload as any, this.auth.getToken()!).subscribe({
      next: (entry) => {
        this.incomeLoading.set(false);
        this.incomeSuccess.set(true);
        this.incomeHistory.update(h => [entry, ...h]);
        this.loadSummary();
        this.incomeForm.patchValue({ date: new Date().toISOString().slice(0, 10), amount: null, notes: '' });
        this.isServiceIncome = false;
        this.invoiceCustomer = '';
        this.invoiceService = '';
        setTimeout(() => this.incomeSuccess.set(false), 2500);
      },
      error: (err) => {
        this.incomeLoading.set(false);
        this.incomeError.set(err?.error?.message || 'Failed to log entry. Please try again.');
      }
    });
  }

  exportCsv(period: 'weekly' | 'monthly'): void {
    this.api.exportIncomeCsv(this.auth.getToken()!, period).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `income-${period}.csv`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ── Invoice PDF ──────────────────────────────────────────────────────────────
  createInvoicePdf(): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const businessName = this.auth.state()?.businessName ?? 'Business';
    const amount = Number(this.incomeForm.get('amount')?.value ?? 0);
    const dateVal = this.incomeForm.get('date')?.value ?? new Date().toISOString().slice(0, 10);
    const notes = this.incomeForm.get('notes')?.value ?? '';
    const invoiceNo = `INV-${Date.now()}`;
    const formattedDate = new Date(dateVal + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

    const lm = 20, rm = 190, mid = rm - lm;
    let y = 22;

    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('HUSTLE ECONOMY', lm, y); y += 6;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('Empowering local hustlers', lm, y); y += 5;
    doc.setDrawColor(14, 165, 233); doc.setLineWidth(0.6); doc.line(lm, y, rm, y);

    y += 10;
    doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('INVOICE', lm, y); y += 7;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
    doc.text('Invoice No:', lm, y); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(invoiceNo, lm + 30, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
    doc.text('Date:', lm, y); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(formattedDate, lm + 30, y);

    y += 10; doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.line(lm, y, rm, y);
    y += 8; doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(148, 163, 184);
    doc.text('FROM', lm, y); doc.text('TO', lm + mid / 2, y); y += 5;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(businessName, lm, y); doc.text(this.invoiceCustomer, lm + mid / 2, y);

    y += 12; doc.setDrawColor(226, 232, 240); doc.line(lm, y, rm, y);
    y += 6; doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(148, 163, 184);
    doc.text('DESCRIPTION', lm, y); doc.text('AMOUNT', rm, y, { align: 'right' });
    y += 4; doc.setDrawColor(14, 165, 233); doc.setLineWidth(0.5); doc.line(lm, y, rm, y);

    y += 7; doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(51, 65, 85);
    const serviceLines = doc.splitTextToSize(this.invoiceService, mid - 50);
    doc.text(serviceLines, lm, y); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(`R ${amount.toFixed(2)}`, rm, y, { align: 'right' }); y += (serviceLines.length - 1) * 5;

    y += 8; doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.line(lm, y, rm, y);
    y += 6; doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text('TOTAL', lm, y); doc.setTextColor(14, 165, 233);
    doc.text(`R ${amount.toFixed(2)}`, rm, y, { align: 'right' }); y += 3;
    doc.setDrawColor(14, 165, 233); doc.setLineWidth(0.6); doc.line(lm, y, rm, y);

    if (notes) {
      y += 10; doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
      doc.text('Notes:', lm, y); y += 5; doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
      const noteLines = doc.splitTextToSize(notes, mid);
      doc.text(noteLines, lm, y);
    }

    y += 16; doc.setFontSize(11); doc.setFont('helvetica', 'italic'); doc.setTextColor(15, 23, 42);
    doc.text('Thank you for your business!', lm, y); y += 6;
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
    doc.text('Powered by Hustle Economy', lm, y);

    doc.save(`${invoiceNo}.pdf`);
  }

  // ── Products ─────────────────────────────────────────────────────────────────
  loadProducts(): void {
    this.api.listMyProducts(this.auth.getToken()!).subscribe({
      next: list => { this.products.set(list); this.loadingProducts.set(false); },
      error: () => this.loadingProducts.set(false)
    });
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.uploadLoading.set(true);
    this.api.uploadImage(file, this.auth.getToken()!).subscribe({
      next: (res) => { this.pendingImageUrl.set(res.url); this.uploadLoading.set(false); },
      error: () => this.uploadLoading.set(false)
    });
  }

  submitProduct(): void {
    if (this.productForm.invalid) return;
    this.addLoading.set(true);
    this.addError.set('');
    const payload = {
      name: this.productForm.value.name!,
      description: this.productForm.value.description!,
      price: this.productForm.value.price!,
      mediaUrl: this.pendingImageUrl() ?? undefined
    };
    this.api.createProduct(payload, this.auth.getToken()!).subscribe({
      next: (p) => {
        this.products.update(l => [p, ...l]);
        this.productForm.reset();
        this.imagePreview.set(null);
        this.pendingImageUrl.set(null);
        this.addLoading.set(false);
        this.addSuccess.set(true);
        this.showAddModal.set(false);
        setTimeout(() => this.addSuccess.set(false), 2500);
      },
      error: (err) => {
        this.addLoading.set(false);
        this.addError.set(err?.error?.message || 'Failed to add product. Please try again.');
      }
    });
  }

  deleteProduct(p: ProductResponse): void {
    if (!confirm(`Remove "${p.name}"?`)) return;
    this.api.deleteProduct(p.id, this.auth.getToken()!).subscribe({
      next: () => this.products.update(l => l.filter(x => x.id !== p.id)),
      error: () => alert('Could not delete product. Please try again.')
    });
  }

  startEdit(p: ProductResponse): void {
    this.editingProductId.set(p.id);
    this.editName = p.name;
    this.editDescription = p.description;
    this.editPrice = Number(p.price);
    this.editPendingImageUrl = null;
    this.saveError.set('');
  }

  cancelEdit(): void { this.editingProductId.set(null); this.saveError.set(''); }

  onEditFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadLoading.set(true);
    this.api.uploadImage(file, this.auth.getToken()!).subscribe({
      next: (res) => { this.editPendingImageUrl = res.url; this.uploadLoading.set(false); },
      error: () => this.uploadLoading.set(false)
    });
  }

  saveEdit(p: ProductResponse): void {
    if (!this.editName || !this.editDescription || this.editPrice < 0) return;
    this.saveLoading.set(true);
    this.saveError.set('');
    const payload: ProductRequest = {
      name: this.editName,
      description: this.editDescription,
      price: this.editPrice,
      mediaUrl: this.editPendingImageUrl ?? p.mediaUrl
    };
    this.api.updateProduct(p.id, payload, this.auth.getToken()!).subscribe({
      next: (updated) => {
        this.products.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.editingProductId.set(null);
        this.saveLoading.set(false);
      },
      error: (err) => {
        this.saveLoading.set(false);
        this.saveError.set(err?.error?.message || 'Failed to save changes. Please try again.');
      }
    });
  }

  resolveUrl(u: string): string { return u.startsWith('http') ? u : this.api.baseUrl + u; }
}
