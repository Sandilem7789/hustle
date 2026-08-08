import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject, computed, effect, untracked } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { jsPDF } from 'jspdf';
import { ApiService, ProductResponse, ProductRequest, IncomeEntryRequest, IncomeEntryResponse, IncomeSummary, OrderResponse, SaleResponse, SaleItemRequest, SaleRequest } from '../../services/api.service';
import { generateMonthlyReportPdf } from '../../utils/monthly-report.util';
import { AuthService } from '../../services/auth.service';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import { AppSelectComponent } from '../../components/app-select/app-select.component';
import { BarcodeScannerComponent } from '../../components/barcode-scanner/barcode-scanner.component';

@Component({
  selector: 'app-hustler-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LoginGateComponent, AppSelectComponent, BarcodeScannerComponent],
  template: `
    <app-login-gate *ngIf="!auth.isLoggedIn()"
      icon="👤"
      title="Hustler Sign In"
      subtitle="Log in to manage your business, track income, and view orders."
    ></app-login-gate>

    <section class="layout" *ngIf="auth.isLoggedIn()">
    <div class="dashboard-shell">
    <nav class="rail-nav">
      <div class="rail-brand">HUSTLE</div>
      <button type="button" class="rail-item" [class.rail-active]="tab() === 'sell'" (click)="tab.set('sell')"><span>🧺</span>Sell</button>
      <button type="button" class="rail-item" [class.rail-active]="tab() === 'income'" (click)="tab.set('income')"><span>💰</span>Money</button>
      <button type="button" class="rail-item" [class.rail-active]="tab() === 'products'" (click)="tab.set('products')"><span>📦</span>Stock</button>
      <button type="button" class="rail-item" [class.rail-active]="tab() === 'orders'" (click)="loadOrders(); tab.set('orders')"><span>🛍</span>Orders</button>
      <div class="rail-spacer"></div>
      <div class="rail-sync mut">● synced</div>
    </nav>
    <div class="main-col">

      <!-- ── MOBILE GREETING + COMPACT SUMMARY (mobile only; hero-banner/fin-grid below take over on desktop) ── -->
      <div class="mobile-greeting-bar">
        <span>Hi {{ auth.state()?.firstName }}! <b>{{ auth.state()?.businessName }}</b></span>
        <span class="tag-chip">● synced</span>
      </div>
      <div class="mobile-summary-strip">
        <span><span class="mss-arrow mss-up">↑</span> <b>R {{ (summary()?.monthIncome ?? 0) | number:'1.2-2' }}</b> <span class="mut">in</span></span>
        <span><span class="mss-arrow mss-down">↓</span> <b>R {{ (summary()?.monthExpenses ?? 0) | number:'1.2-2' }}</b> <span class="mut">out</span></span>
        <span><span class="mss-arrow">≈</span> <b>R {{ (summary()?.monthProfit ?? 0) | number:'1.2-2' }}</b> <span class="mut">profit</span></span>
      </div>

      <!-- ── HERO BANNER (desktop) ── -->
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

      <!-- ── TAB BAR (mobile) ── -->
      <div class="tab-bar">
        <button [class.tab-active-sell]="tab() === 'sell'" (click)="tab.set('sell')">Sell</button>
        <button [class.tab-active-finances]="tab() === 'income'" (click)="tab.set('income')">Money</button>
        <button [class.tab-active-products]="tab() === 'products'" (click)="tab.set('products')">Stock</button>
        <button [class.tab-active-orders]="tab() === 'orders'" (click)="loadOrders(); tab.set('orders')">Orders</button>
      </div>

      <!-- ── MONEY TAB ── -->
      <ng-container *ngIf="tab() === 'income'">

        <div class="card money-summary-card">
          <div class="ms-month">{{ currentMonthLabel() }}</div>
          <div class="ms-profit">R {{ (summary()?.monthProfit ?? 0) | number:'1.2-2' }} profit</div>
          <div class="ms-inout-row">
            <div><span class="ms-arrow ms-up">↑</span> R {{ (summary()?.monthIncome ?? 0) | number:'1.2-2' }}<span class="mut ms-inout-label">in</span></div>
            <div><span class="ms-arrow ms-down">↓</span> R {{ (summary()?.monthExpenses ?? 0) | number:'1.2-2' }}<span class="mut ms-inout-label">out</span></div>
          </div>
        </div>

        <div class="money-quicklog-row">
          <button type="button" class="money-in-btn" (click)="openMoneyWizard('INCOME')">＋ Money IN</button>
          <button type="button" class="money-out-btn" (click)="openMoneyWizard('EXPENSE')">－ Money OUT</button>
        </div>
        <p class="mut money-wizard-note">POS sales auto-log income — this is only for cash outside the basket.</p>

        <div class="card">
          <h2 class="pos-section-title">History</h2>
          <div *ngIf="incomeHistory().length === 0" class="muted" style="margin-top:0.5rem">No entries yet.</div>
          <div class="compact-history-list" *ngIf="incomeHistory().length > 0">
            <div class="compact-history-row" *ngFor="let e of incomeHistory().slice(0, 6)">
              <span class="ch-date">{{ e.date | date:'d MMM' }}</span>
              <span class="ch-cat">{{ e.category || (e.entryType === 'EXPENSE' ? 'Expense' : 'Income') }}</span>
              <span class="ch-amt" [class.ch-neg]="e.entryType === 'EXPENSE'">{{ e.entryType === 'EXPENSE' ? '−' : '+' }}R {{ e.amount | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <button type="button" class="more-toggle-btn" (click)="moneyMoreOpen.set(!moneyMoreOpen())">
          {{ moneyMoreOpen() ? '▲ Less' : '▼ More — detailed log, chart, CSV export' }}
        </button>

        <ng-container *ngIf="moneyMoreOpen()">

        <div class="card">
          <div class="log-tabs">
            <button [class.logtab-active-income]="logTab() === 'income'" (click)="logTab.set('income')">Log Income</button>
            <button [class.logtab-active-expense]="logTab() === 'expense'" (click)="logTab.set('expense')">Log Expense</button>
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
              <span>Category</span>
              <app-select [(ngModel)]="incomeCategory" [ngModelOptions]="{standalone:true}" [options]="incomeCategoryOpts()" placeholder="— Select category —"></app-select>
            </label>
            <label class="span-2">
              <span>Notes (optional)</span>
              <input formControlName="notes" placeholder="e.g. sold beaded necklace, market day" />
            </label>

            <label class="checkbox-row span-2" *ngIf="logTab() === 'income'">
              <input type="checkbox" [(ngModel)]="isServiceIncome" [ngModelOptions]="{standalone: true}" />
              <span>This is for a service (generate invoice)</span>
            </label>

            <ng-container *ngIf="isServiceIncome && logTab() === 'income'">
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
              <app-select [(ngModel)]="historyFilter" (ngModelChange)="applyFilter()" [ngModelOptions]="{standalone: true}" [options]="historyFilterOpts" placeholder="This week"></app-select>
            </div>
          </div>

          <div *ngIf="incomeHistory().length === 0" class="muted" style="margin-top:1rem">No entries yet.</div>
          <div class="history-list" *ngIf="incomeHistory().length > 0">
            <div
              *ngFor="let e of incomeHistory(); let i = index"
              class="history-item"
              [class.expense-item]="e.entryType === 'EXPENSE'"
              (click)="toggleEntry(i)"
            >
              <div class="history-row">
                <span class="history-date">{{ e.date }}</span>
                <span class="badge" [class.income-badge]="e.entryType !== 'EXPENSE'" [class.expense-badge]="e.entryType === 'EXPENSE'">
                  {{ e.entryType === 'EXPENSE' ? 'Expense' : 'Income' }}
                </span>
                <span class="history-amount" [class.expense-amt]="e.entryType === 'EXPENSE'">
                  {{ e.entryType === 'EXPENSE' ? '−' : '+' }}R {{ e.amount | number:'1.2-2' }}
                </span>
                <span class="history-chevron" [class.history-chevron-open]="expandedEntryIdx() === i">›</span>
              </div>
              <div class="history-detail" *ngIf="expandedEntryIdx() === i">
                <span *ngIf="e.category" class="detail-chip">{{ e.category }}</span>
                <p class="detail-notes">{{ e.notes || 'No notes' }}</p>
              </div>
            </div>
          </div>

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
                  <span class="lc-dot" style="background:#1B6FD4"></span> Profit
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

          <div class="csv-export-row">
            <button type="button" class="outline-btn" (click)="exportCsv('weekly')">↓ CSV (this week)</button>
            <button type="button" class="outline-btn" (click)="exportCsv('monthly')">↓ CSV (this month)</button>
          </div>
        </div>

        </ng-container>

        <button class="logout-btn" (click)="logout()">Sign Out</button>
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
                  <span *ngIf="p.category" class="product-cat-badge">{{ getCategoryLabel(p.category) }}</span>
                  <p class="muted">{{ p.description }}</p>
                  <p class="price">R {{ p.price | number:'1.2-2' }}</p>
                  <p class="barcode-label" *ngIf="p.barcode">🏷️ {{ p.barcode }}</p>
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
                    <span>Category</span>
                    <app-select
                      [(ngModel)]="editCategory"
                      [ngModelOptions]="{standalone: true}"
                      [options]="productCategoryOpts"
                      placeholder="— Select category —">
                    </app-select>
                  </label>
                  <label>
                    <span>Barcode</span>
                    <div class="barcode-row">
                      <input [value]="editBarcode" (input)="editBarcode = $any($event.target).value" placeholder="Scan or type barcode" />
                      <button type="button" class="scan-btn" (click)="barcodeModalMode.set('edit')">📷 Scan</button>
                    </div>
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

      <!-- ── SELL (POS) TAB ── -->
      <ng-container *ngIf="tab() === 'sell'">
        <div class="pos-subtabs">
          <button [class.pos-subtab-active]="posView() === 'sell'" (click)="posView.set('sell')">Sell</button>
          <button [class.pos-subtab-active]="posView() === 'history'" (click)="posView.set('history'); loadSalesHistory()">History</button>
        </div>

        <ng-container *ngIf="posView() === 'sell'">
          <div class="card pos-search-card">
            <div class="search-scan-row">
              <span class="search-icon">🔍</span>
              <input type="text" class="search-input" placeholder="Search or scan" [(ngModel)]="posSearchQuery" [ngModelOptions]="{standalone:true}" />
              <button type="button" class="scan-chip" (click)="openPosScanModal()">▦ Scan</button>
            </div>
          </div>

          <div class="card" *ngIf="products().length > 0">
            <h2 class="pos-section-title">Quick add</h2>
            <div class="quick-grid">
              <button type="button" class="quick-tile" *ngFor="let p of posVisibleProducts()" (click)="addProductToBasket(p)">
                <span class="quick-name">{{ p.name }}</span>
                <span class="quick-price">R {{ p.price | number:'1.2-2' }}</span>
              </button>
              <button type="button" class="quick-tile quick-more" *ngIf="posHasMoreProducts()" (click)="posShowAllProducts.set(true)">
                <span class="quick-name">＋ more</span>
              </button>
            </div>
            <p *ngIf="posSearchQuery.trim() && posVisibleProducts().length === 0" class="muted" style="margin-top:0.5rem">No products match "{{ posSearchQuery }}".</p>
          </div>

          <div class="card">
            <h2 class="pos-section-title">Basket <span class="basket-count" *ngIf="posBasket().length > 0">({{ posBasket().length }})</span></h2>
            <div *ngIf="posBasket().length === 0" class="muted" style="margin-top:0.5rem">Scan or tap a product to start a sale.</div>
            <p class="basket-summary" *ngIf="posBasket().length > 0">{{ basketSummaryLine() }}</p>
            <div class="basket-list" *ngIf="posBasket().length > 0">
              <div class="basket-row" *ngFor="let item of posBasket(); let i = index">
                <div class="basket-info">
                  <span class="basket-name">{{ item.itemName }}</span>
                  <span class="basket-unit">R {{ item.unitPrice | number:'1.2-2' }} each</span>
                </div>
                <div class="basket-qty">
                  <button type="button" (click)="decBasketQty(i)" aria-label="Decrease quantity">−</button>
                  <span>{{ item.quantity }}</span>
                  <button type="button" (click)="incBasketQty(i)" aria-label="Increase quantity">+</button>
                </div>
                <span class="basket-line-total">R {{ (item.unitPrice * item.quantity) | number:'1.2-2' }}</span>
                <button type="button" class="basket-remove" (click)="removeBasketItem(i)" aria-label="Remove item">✕</button>
              </div>
            </div>

            <div class="pos-total-row" *ngIf="posBasket().length > 0">
              <span>Total</span>
              <strong>R {{ basketTotal() | number:'1.2-2' }}</strong>
            </div>

            <button class="complete-sale-btn" [disabled]="posBasket().length === 0 || posCompleting()" (click)="completeSale()">
              <ng-container *ngIf="!posCompleting()">CHARGE — R {{ basketTotal() | number:'1.2-2' }}</ng-container>
              <ng-container *ngIf="posCompleting()">Charging…</ng-container>
            </button>
            <p *ngIf="posError()" class="error">{{ posError() }}</p>
          </div>
        </ng-container>

        <ng-container *ngIf="posView() === 'history'">
          <div class="card">
            <h2 class="pos-section-title">Sales history</h2>
            <div *ngIf="salesHistoryLoading()" class="muted" style="margin-top:0.75rem">Loading…</div>
            <div *ngIf="!salesHistoryLoading() && salesHistory().length === 0" class="muted" style="margin-top:0.75rem">No sales yet.</div>
            <div class="sale-history-list" *ngIf="salesHistory().length > 0">
              <div class="sale-history-row" *ngFor="let s of salesHistory()">
                <div class="sale-history-main">
                  <span class="sale-history-time">{{ s.saleDate | date:'d MMM, h:mm a' }}</span>
                  <span class="sale-history-items">{{ saleItemsSummary(s) }}</span>
                </div>
                <strong class="sale-history-total">R {{ s.totalAmount | number:'1.2-2' }}</strong>
              </div>
            </div>
          </div>
        </ng-container>
      </ng-container>

      <!-- ── MONTHLY REPORT BAR (bottom — occasional action, not a daily one) ── -->
      <div class="report-bar">
        <div class="report-bar-left">
          <span class="report-bar-icon">📄</span>
          <div>
            <p class="report-bar-title">Monthly Report</p>
            <p class="report-bar-sub">Download your income & expenses as a PDF</p>
          </div>
        </div>
        <div class="report-bar-right">
          <input type="month" [(ngModel)]="reportMonth" [ngModelOptions]="{standalone:true}" class="month-input" />
          <button class="report-dl-btn" (click)="downloadMyMonthlyReport()" [disabled]="reportDownloading()">
            {{ reportDownloading() ? 'Generating…' : '↓ PDF' }}
          </button>
        </div>
      </div>

    </div>

    <!-- ── QUICK LOG PANEL (desktop only, visible on Sell tab) ── -->
    <aside class="quick-log-panel" *ngIf="tab() === 'sell'">
      <h3 class="ql-title">Quick log</h3>
      <div class="ql-type-row">
        <button type="button" class="ql-type-btn ql-type-in" [class.ql-type-active]="quickLogType() === 'INCOME'" (click)="quickLogType.set('INCOME')">＋ IN</button>
        <button type="button" class="ql-type-btn ql-type-out" [class.ql-type-active]="quickLogType() === 'EXPENSE'" (click)="quickLogType.set('EXPENSE')">－ OUT</button>
      </div>
      <input type="number" min="0" step="0.01" class="ql-amount-input" [(ngModel)]="quickLogAmount" [ngModelOptions]="{standalone:true}" placeholder="Amount" />
      <app-select [(ngModel)]="quickLogCategory" [ngModelOptions]="{standalone:true}" [options]="quickLogCategoryOpts()" placeholder="Category ▾"></app-select>
      <button class="primary ql-save-btn" [disabled]="!quickLogAmount || quickLogAmount <= 0 || quickLogSaving()" (click)="saveQuickLog()">
        {{ quickLogSaving() ? 'Saving…' : 'SAVE' }}
      </button>
      <p *ngIf="quickLogError()" class="error" style="font-size:0.78rem;margin:0">{{ quickLogError() }}</p>
      <div class="ql-report-row">
        <span>📄 report</span>
        <button type="button" class="chip-btn" (click)="downloadMyMonthlyReport()" [disabled]="reportDownloading()">↓ PDF</button>
      </div>
    </aside>

    </div>

      <!-- ── POS SUCCESS CONFIRMATION ── -->
      <div class="modal-overlay pos-success-overlay" *ngIf="posSuccess() as res">
        <div class="pos-success-sheet">
          <div class="pos-success-icon">✓</div>
          <p class="pos-success-label">Sale complete</p>
          <p class="pos-success-total">R {{ res.total | number:'1.2-2' }}</p>
          <button class="primary" (click)="posSuccess.set(null)">Next customer</button>
        </div>
      </div>

      <!-- ── BARCODE SCAN MODAL (product add/edit capture + POS scanning) ── -->
      <div class="modal-overlay" *ngIf="barcodeModalMode()" (click)="onBarcodeOverlayClick($event)">
        <div class="modal-sheet barcode-modal-sheet">
          <div class="modal-head">
            <h2>{{ barcodeModalMode() === 'pos' ? 'Scan items' : 'Scan barcode' }}</h2>
            <button class="modal-close" (click)="barcodeModalMode.set(null)" aria-label="Close scanner">✕</button>
          </div>
          <app-barcode-scanner (scanned)="onBarcodeCaptured($event)"></app-barcode-scanner>
          <ng-container *ngIf="barcodeModalMode() === 'pos'">
            <p *ngIf="posLastAdded()" class="success" style="margin-top:0.5rem">✓ Added {{ posLastAdded() }}</p>
            <p *ngIf="posScanError()" class="error" style="margin-top:0.5rem">{{ posScanError() }}</p>
            <div class="unknown-barcode-banner" *ngIf="posUnknownBarcode() as code">
              <span>No product found for code <strong>{{ code }}</strong></span>
              <button type="button" (click)="createProductFromBarcode()">+ Create product</button>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- ── MONEY WIZARD (quick IN/OUT logging, one question at a time) ── -->
      <div class="modal-overlay" *ngIf="moneyWizardOpen()" (click)="onMoneyWizardOverlayClick($event)">
        <div class="modal-sheet wizard-sheet">
          <div class="modal-head">
            <h2>{{ moneyWizardType() === 'INCOME' ? '＋ Money IN' : '－ Money OUT' }}</h2>
            <button class="modal-close" (click)="closeMoneyWizard()" aria-label="Close">✕</button>
          </div>

          <ng-container *ngIf="moneyWizardStep() === 'amount'">
            <p class="wizard-step-label">STEP 1 of 2 · How much?</p>
            <input type="number" min="0" step="0.01" class="wizard-amount-input" [(ngModel)]="moneyWizardAmount" [ngModelOptions]="{standalone:true}" placeholder="0.00" />
            <button class="primary wizard-next-btn" type="button" [disabled]="!moneyWizardAmount || moneyWizardAmount <= 0" (click)="moneyWizardNext()">Next</button>
          </ng-container>

          <ng-container *ngIf="moneyWizardStep() === 'category'">
            <p class="wizard-step-label">STEP 2 of 2 · What for?</p>
            <div class="wizard-category-grid">
              <button type="button" class="wizard-cat-tile" *ngFor="let c of moneyWizardCategoryOpts()" [disabled]="moneyWizardSaving()" (click)="selectMoneyWizardCategory(c.value)">
                <span class="wizard-cat-icon">{{ c.icon }}</span>
                <span>{{ c.label }}</span>
              </button>
            </div>
            <button type="button" class="wizard-note-toggle" *ngIf="!moneyWizardShowNotes()" (click)="moneyWizardShowNotes.set(true)">+ add a note</button>
            <input type="text" class="wizard-note-input" *ngIf="moneyWizardShowNotes()" [(ngModel)]="moneyWizardNotes" [ngModelOptions]="{standalone:true}" placeholder="Optional note" />
            <p *ngIf="moneyWizardSaving()" class="muted" style="margin-top:0.5rem">Saving…</p>
            <p *ngIf="moneyWizardError()" class="error">{{ moneyWizardError() }}</p>
          </ng-container>
        </div>
      </div>

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
              <span>Category *</span>
              <app-select
                [(ngModel)]="newProductCategory"
                [ngModelOptions]="{standalone: true}"
                [options]="productCategoryOpts"
                placeholder="— Select category —">
              </app-select>
            </label>
            <label>
              <span>Barcode (optional)</span>
              <div class="barcode-row">
                <input formControlName="barcode" placeholder="Scan or type barcode" />
                <button type="button" class="scan-btn" (click)="barcodeModalMode.set('add')">📷 Scan</button>
              </div>
            </label>
            <label>
              <span>Product image</span>
              <input type="file" accept="image/*" (change)="onFileChange($event)" class="file-input" />
              <div *ngIf="imagePreview()" class="preview-wrap">
                <img [src]="imagePreview()!" alt="preview" class="preview" />
              </div>
              <small *ngIf="uploadLoading()">Uploading…</small>
            </label>
            <button class="primary" type="submit" [disabled]="productForm.invalid || !newProductCategory || addLoading() || uploadLoading()">
              {{ addLoading() ? 'Adding…' : 'Add to marketplace' }}
            </button>
            <p *ngIf="addError()" class="error">{{ addError() }}</p>
          </form>
        </div>
      </div>

    </section>
  `,
  styles: `
    /* ── Mobile compact greeting + summary (replaces hero-banner/fin-grid below 960px) ── */
    .mobile-greeting-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;
      background: white; border: 1px solid #E7E5E4; border-radius: 1rem;
      padding: 0.85rem 1.1rem; font-size: 0.95rem; color: #1C1917;
    }
    .mobile-greeting-bar b { font-weight: 800; }
    .tag-chip {
      flex-shrink: 0; font-size: 0.72rem; font-weight: 700; color: #166534;
      background: rgba(45,179,68,0.1); border-radius: 999px; padding: 0.2rem 0.6rem; white-space: nowrap;
    }
    .mobile-summary-strip {
      display: flex; justify-content: space-between; gap: 0.5rem;
      background: white; border: 1px solid #E7E5E4; border-radius: 1rem;
      padding: 0.8rem 1rem; font-size: 0.85rem; color: #1C1917; text-align: center;
    }
    .mobile-summary-strip > span { flex: 1; }
    .mss-arrow { font-weight: 900; }
    .mss-up { color: #2DB344; }
    .mss-down { color: #E53935; }

    .hero-banner, .fin-grid { display: none; }
    @media (min-width: 960px) {
      .mobile-greeting-bar, .mobile-summary-strip { display: none; }
      .hero-banner { display: block; }
      .fin-grid { display: grid; }
    }

    /* ── Hero Banner (desktop) ── */
    .hero-banner {
      background: #1C1917;
      border-radius: 1.5rem;
      padding: 1.75rem;
      color: white;
      box-shadow: 0 8px 32px rgba(28,25,23,0.3);
      position: relative;
      overflow: hidden;
    }
    .hero-banner::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg,
        rgba(245,184,0,0.22) 0%,
        rgba(0,168,150,0.14) 40%,
        rgba(43,179,68,0.12) 100%
      );
      pointer-events: none;
    }
    .hero-banner > * { position: relative; }
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

    /* ── Financial Cards (desktop only — see mobile-compact toggle above) ── */
    .fin-grid { grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .fin-card {
      border-radius: 1.25rem;
      padding: 1rem 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .fin-income { background: rgba(45,179,68,0.07);  border: 1px solid rgba(45,179,68,0.2); }
    .fin-expense { background: rgba(229,57,53,0.06); border: 1px solid rgba(229,57,53,0.18); }
    .fin-profit  { background: rgba(27,111,212,0.06); border: 1px solid rgba(27,111,212,0.18); }
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
    .fin-income .fin-icon-wrap { background: rgba(45,179,68,0.15);  color: #2DB344; }
    .fin-expense .fin-icon-wrap { background: rgba(229,57,53,0.12); color: #E53935; }
    .fin-profit  .fin-icon-wrap { background: rgba(27,111,212,0.12); color: #1B6FD4; }
    .fin-body { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .fin-label  { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #78716C; margin: 0; }
    .fin-val    { font-size: 1rem; font-weight: 800; color: #1C1917; margin: 0; word-break: break-all; }
    .fin-val.neg { color: #E53935; }
    .fin-period { font-size: 0.66rem; color: #A8A29E; margin: 0; }

    /* ── Tab Bar ── */
    .tab-bar { display: flex; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(28,25,23,0.08); border: 1px solid #E7E5E4; }
    .tab-bar button { flex: 1; padding: 0.9rem; border: none; background: none; font-size: 1rem; font-weight: 700; color: #A8A29E; cursor: pointer; transition: all 0.2s; min-height: 48px; font-family: inherit; border-bottom: 3px solid transparent; }
    .tab-active-finances { color: #92400e !important; border-bottom: 3px solid #F5B800 !important; background: rgba(245,184,0,0.12) !important; }
    .tab-active-products { color: #166534 !important; border-bottom: 3px solid #2DB344 !important; background: rgba(45,179,68,0.09) !important; }
    .tab-active-orders   { color: #1e3a8a !important; border-bottom: 3px solid #1B6FD4 !important; background: rgba(27,111,212,0.09) !important; }

    /* ── Cards ── */
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 4px 24px rgba(28,25,23,0.08); border: 1px solid #E7E5E4; }
    @media (max-width: 600px) { .card { padding: 1.25rem; border-radius: 1rem; } }
    .card.info { background: rgba(245,184,0,0.06); border-color: rgba(245,184,0,0.25); }

    /* ── Log Form ── */
    .log-tabs { display: flex; border-bottom: 2px solid #E7E5E4; margin-bottom: 1.25rem; }
    .log-tabs button { flex: 1; padding: 0.65rem; border: none; background: none; font-size: 0.95rem; font-weight: 700; color: #A8A29E; cursor: pointer; transition: all 0.2s; min-height: 44px; font-family: inherit; border-bottom: 2px solid transparent; margin-bottom: -2px; }
    .logtab-active-income  { color: #166534 !important; border-bottom: 2px solid #2DB344 !important; background: rgba(45,179,68,0.06) !important; }
    .logtab-active-expense { color: #991b1b !important; border-bottom: 2px solid #E53935 !important; background: rgba(229,57,53,0.05) !important; }
    .income-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.25rem; }
    @media (max-width: 600px) { .income-grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 0.375rem; font-size: 0.875rem; font-weight: 700; color: #1C1917; }
    label.span-2 { grid-column: span 2; }
    @media (max-width: 600px) { label.span-2 { grid-column: span 1; } }
    input, textarea, select { border-radius: 0.75rem; border: 2px solid #E7E5E4; padding: 0.65rem 0.9rem; font-size: 1rem; font-family: inherit; font-weight: 600; width: 100%; box-sizing: border-box; background: white; color: #1C1917; outline: none; transition: border-color 0.15s, box-shadow 0.15s; min-height: 48px; }
    input:focus, textarea:focus, select:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); }
    select { appearance: none; -webkit-appearance: none; background: #FAFAF9 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 0.75rem center / 16px; padding-right: 2.5rem; cursor: pointer; }
    select:focus { background-color: white; }
    .file-input { border: none; padding: 0; font-size: 0.9rem; min-height: unset !important; }
    .preview-wrap { margin-top: 0.5rem; }
    .preview { width: 100%; max-height: 140px; object-fit: cover; border-radius: 0.75rem; }
    .primary { border: none; border-radius: 999px; padding: 0.9rem; font-size: 1rem; font-weight: 800; background: #F5B800; color: #1C1917; cursor: pointer; font-family: inherit; box-shadow: 0 4px 12px rgba(245,184,0,0.35); transition: box-shadow 0.15s; }
    .primary:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }
    .primary.span-2 { grid-column: span 2; }
    @media (max-width: 600px) { .primary.span-2 { grid-column: span 1; } }
    .primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .success { color: #2DB344; font-weight: 700; margin-top: 0.75rem; }
    .error   { color: #E53935; font-weight: 700; margin-top: 0.75rem; }
    .checkbox-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.95rem; color: #1C1917; cursor: pointer; flex-direction: row; }
    .checkbox-row input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: #2DB344; flex-shrink: 0; min-height: unset !important; }
    .service-section { background: rgba(45,179,68,0.05); border: 1px solid rgba(45,179,68,0.2); border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .service-heading { margin: 0; font-weight: 800; font-size: 0.9rem; color: #2DB344; }
    .service-section label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; font-weight: 700; color: #1C1917; }
    .service-section input { border-radius: 0.6rem; border: 2px solid #E7E5E4; padding: 0.55rem 0.8rem; font-size: 0.95rem; font-family: inherit; width: 100%; box-sizing: border-box; background: white; outline: none; min-height: 44px; }
    .service-section input:focus { border-color: #F5B800; }
    .invoice-btn { border: 2px solid #2DB344; color: #2DB344; font-weight: 800; padding: 0.65rem 1rem; border-radius: 999px; background: white; cursor: pointer; font-size: 0.9rem; font-family: inherit; transition: background 0.15s; }
    .invoice-btn:hover:not(:disabled) { background: rgba(45,179,68,0.08); }
    .invoice-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    /* ── Monthly Report Bar ── */
    .report-bar {
      background: white;
      border: 1px solid #E7E5E4;
      border-left: 4px solid #F5B800;
      border-radius: 1rem;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      box-shadow: 0 2px 10px rgba(28,25,23,0.06);
    }
    .report-bar-left { display: flex; align-items: center; gap: 0.75rem; }
    .report-bar-icon { font-size: 1.5rem; line-height: 1; flex-shrink: 0; }
    .report-bar-title { font-size: 0.95rem; font-weight: 800; color: #1C1917; margin: 0; }
    .report-bar-sub { font-size: 0.78rem; color: #78716C; margin: 0.1rem 0 0; }
    .report-bar-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    .month-input {
      height: 40px;
      border: 1.5px solid #E7E5E4;
      border-radius: 0.6rem;
      padding: 0 0.65rem;
      font-size: 0.88rem;
      font-family: inherit;
      color: #1C1917;
      background: #FAFAF9;
      outline: none;
      transition: border-color 0.15s;
      min-height: unset;
    }
    .month-input:focus { border-color: #F5B800; }
    .report-dl-btn {
      height: 40px;
      min-height: unset;
      border: none;
      border-radius: 0.6rem;
      padding: 0 1rem;
      font-size: 0.88rem;
      font-weight: 800;
      background: #F5B800;
      color: #1C1917;
      cursor: pointer;
      font-family: inherit;
      box-shadow: 0 3px 10px rgba(245,184,0,0.3);
      transition: box-shadow 0.15s;
      white-space: nowrap;
    }
    .report-dl-btn:hover { box-shadow: 0 5px 16px rgba(245,184,0,0.45); }
    .report-dl-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    @media (max-width: 480px) {
      .report-bar { flex-direction: column; align-items: flex-start; }
      .report-bar-right { width: 100%; }
      .month-input { flex: 1; }
      .report-dl-btn { flex: 1; }
    }

    /* ── History ── */
    .history-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
    .history-controls { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .outline-btn { border: 1.5px solid #E7E5E4; background: white; border-radius: 999px; padding: 0.4rem 0.9rem; font-size: 0.85rem; cursor: pointer; color: #78716C; font-weight: 700; min-height: 36px; font-family: inherit; transition: border-color 0.15s, color 0.15s; }
    .outline-btn:hover { border-color: #F5B800; color: #1C1917; }
    .history-list { display: flex; flex-direction: column; gap: 0; margin-top: 0.75rem; border: 1px solid #E7E5E4; border-radius: 0.75rem; overflow: hidden; }
    .history-item { cursor: pointer; border-bottom: 1px solid #E7E5E4; transition: background 0.1s; }
    .history-item:last-child { border-bottom: none; }
    .history-item:hover { background: #FAFAF9; }
    .history-item.expense-item:hover { background: rgba(229,57,53,0.02); }
    .history-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 1rem; }
    .history-date { font-size: 0.82rem; font-weight: 700; color: #78716C; min-width: 80px; flex-shrink: 0; }
    .history-amount { font-size: 0.95rem; font-weight: 800; color: #2DB344; margin-left: auto; }
    .history-amount.expense-amt { color: #E53935; }
    .history-chevron { font-size: 1.1rem; color: #A8A29E; transition: transform 0.2s ease-out; flex-shrink: 0; margin-left: 0.25rem; display: inline-block; }
    .history-chevron-open { transform: rotate(90deg); }
    .history-detail { padding: 0 1rem 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .detail-chip { display: inline-block; background: rgba(245,184,0,0.12); color: #92620A; font-size: 0.72rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 999px; text-transform: uppercase; align-self: flex-start; }
    .detail-notes { font-size: 0.84rem; color: #78716C; margin: 0; }
    .badge { display: inline-block; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; flex-shrink: 0; }
    .income-badge  { background: rgba(45,179,68,0.12); color: #2DB344; }
    .expense-badge { background: rgba(229,57,53,0.1);  color: #E53935; }
    .expense-amt { color: #E53935; font-weight: 700; }
    .period-summary { display: flex; align-items: center; margin-top: 1rem; background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; overflow: hidden; }
    .ps-item { flex: 1; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
    .ps-label   { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; color: #A8A29E; font-weight: 800; }
    .ps-income  { font-size: 1rem; font-weight: 800; color: #2DB344; }
    .ps-expense { font-size: 1rem; font-weight: 800; color: #E53935; }
    .ps-divider { width: 1px; background: #E7E5E4; align-self: stretch; }

    /* ── Line Chart ── */
    .lc-toggles { display: flex; gap: 1.25rem; flex-wrap: wrap; margin: 1.25rem 0 0.4rem; }
    .lc-toggles label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #1C1917; cursor: pointer; user-select: none; flex-direction: row; font-weight: 700; }
    .lc-toggles label.lc-disabled { opacity: 0.4; cursor: not-allowed; }
    .lc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .line-chart { width: 100%; height: auto; display: block; }
    .lc-grid   { stroke: #E7E5E4; stroke-width: 1; }
    .lc-zero   { stroke: #E7E5E4; stroke-width: 1; stroke-dasharray: 4 3; }
    .lc-line   { fill: none; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
    .lc-income  { stroke: #2DB344; }
    .lc-expense { stroke: #E53935; }
    .lc-profit  { stroke: #1B6FD4; }
    .lc-label  { font-size: 10px; fill: #A8A29E; text-anchor: middle; font-family: inherit; }

    /* ── Products Tab ── */
    .shop-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
    .shop-left { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .shop-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .shop-name-badge { font-size: 1.1rem; font-weight: 800; color: #1C1917; }
    .approved-badge { background: rgba(45,179,68,0.12); color: #2DB344; border-radius: 999px; padding: 0.2rem 0.75rem; font-size: 0.75rem; font-weight: 800; }
    .add-product-btn { background: #F5B800; color: #1C1917; border: none; border-radius: 999px; padding: 0.55rem 1.2rem; font-size: 0.9rem; font-weight: 800; cursor: pointer; font-family: inherit; min-height: 40px; box-shadow: 0 3px 10px rgba(245,184,0,0.35); transition: box-shadow 0.15s; }
    .add-product-btn:hover { box-shadow: 0 5px 16px rgba(245,184,0,0.5); }
    .product-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
    @media (max-width: 600px) { .product-list { grid-template-columns: 1fr; } }
    .product-card { border: 1px solid #E7E5E4; border-radius: 1rem; overflow: hidden; background: #FAFAF9; position: relative; }
    .product-img { width: 100%; height: 150px; object-fit: cover; display: block; }
    .product-body { padding: 0.9rem 0.9rem 0.4rem; }
    .product-body h3 { margin: 0 0 0.3rem; font-size: 1rem; font-weight: 800; color: #1C1917; }
    .product-cat-badge { display: inline-block; background: rgba(245,184,0,0.12); color: #92620A; font-size: 0.68rem; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 999px; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .price { font-weight: 800; color: #2DB344; margin-top: 0.4rem; }
    .card-actions { position: absolute; top: 0.5rem; right: 0.5rem; display: flex; gap: 0.3rem; }
    .edit-btn   { background: rgba(28,25,23,0.75); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; min-height: unset; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .delete-btn { background: rgba(229,57,53,0.85); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; min-height: unset; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .edit-form { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .edit-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .small-btn { padding: 0.5rem 1rem !important; font-size: 0.9rem; width: auto !important; }
    small { color: #A8A29E; font-size: 0.8rem; font-weight: 600; }

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
    .modal-close { background: #F5F0E8; border: none; border-radius: 50%; width: 36px; height: 36px; min-height: unset; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #78716C; flex-shrink: 0; font-family: inherit; transition: background 0.15s; }
    .modal-close:hover { background: #E7E5E4; color: #1C1917; }
    .product-form { display: flex; flex-direction: column; gap: 1rem; }

    /* ── Orders ── */
    .orders-list { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
    .order-card { border: 1px solid #E7E5E4; border-radius: 1rem; padding: 1rem 1.25rem; background: #FAFAF9; }
    .order-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
    .order-id { font-weight: 800; font-size: 0.9rem; color: #1C1917; display: block; }
    .order-customer { display: flex; flex-direction: column; gap: 0.1rem; margin-bottom: 0.5rem; }
    .order-meta-row { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
    .meta-chip { font-size: 0.75rem; background: #F5F0E8; color: #78716C; padding: 0.15rem 0.5rem; border-radius: 999px; font-weight: 700; }
    .order-items { margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .order-line { display: flex; justify-content: space-between; font-size: 0.88rem; color: #1C1917; }
    .order-total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid #E7E5E4; margin-bottom: 0.75rem; }
    .order-actions { display: flex; gap: 0.5rem; }
    .btn-confirm    { flex: 1; height: 44px; min-height: unset; border: none; border-radius: 999px; background: #2DB344; color: white; font-weight: 800; font-size: 0.9rem; cursor: pointer; font-family: inherit; }
    .btn-cancel-order { flex: 1; height: 44px; min-height: unset; border: none; border-radius: 999px; background: #E53935; color: white; font-weight: 800; font-size: 0.9rem; cursor: pointer; font-family: inherit; }
    .btn-confirm:disabled, .btn-cancel-order:disabled { opacity: 0.5; cursor: not-allowed; }
    .field-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #A8A29E; }
    .status-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; }
    .order-status-pending   { background: #F5F0E8; color: #78716C; }
    .order-status-confirmed { background: rgba(27,111,212,0.1); color: #1B6FD4; }
    .order-status-cancelled { background: rgba(229,57,53,0.1); color: #E53935; }
    .order-status-delivered { background: rgba(45,179,68,0.12); color: #2DB344; }

    /* ── Logout button ── */
    .logout-btn {
      display: block;
      width: 100%;
      padding: 0.9rem;
      border: 2px solid #E7E5E4;
      border-radius: 999px;
      background: white;
      color: #78716C;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      min-height: 52px;
      transition: border-color 0.15s, color 0.15s;
    }
    .logout-btn:hover { border-color: #E53935; color: #E53935; }

    /* ── Sell tab ── */
    .tab-active-sell { color: #92400e !important; border-bottom: 3px solid #F5B800 !important; background: rgba(245,184,0,0.12) !important; }
    .pos-subtabs { display: flex; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 2px 10px rgba(28,25,23,0.06); border: 1px solid #E7E5E4; }
    .pos-subtabs button { flex: 1; padding: 0.7rem; border: none; background: none; font-size: 0.9rem; font-weight: 700; color: #A8A29E; cursor: pointer; font-family: inherit; min-height: 44px; border-bottom: 2px solid transparent; }
    .pos-subtab-active { color: #1C1917 !important; border-bottom: 2px solid #F5B800 !important; background: rgba(245,184,0,0.06) !important; }
    .pos-section-title { margin: 0 0 0.25rem; font-size: 1rem; font-weight: 800; color: #1C1917; }
    .unknown-barcode-banner { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; background: rgba(245,184,0,0.1); border: 1px solid rgba(245,184,0,0.35); border-radius: 0.75rem; padding: 0.7rem 0.9rem; font-size: 0.85rem; color: #1C1917; }
    .unknown-barcode-banner button { border: none; border-radius: 999px; background: #F5B800; color: #1C1917; font-weight: 800; font-size: 0.8rem; padding: 0.45rem 0.9rem; cursor: pointer; font-family: inherit; min-height: 36px; }
    .quick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.6rem; margin-top: 0.75rem; }
    .quick-tile { display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem; border: 1.5px solid #E7E5E4; border-radius: 0.85rem; padding: 0.7rem 0.8rem; background: #FAFAF9; cursor: pointer; font-family: inherit; min-height: 60px; text-align: left; transition: border-color 0.15s, background 0.15s; }
    .quick-tile:hover, .quick-tile:active { border-color: #F5B800; background: rgba(245,184,0,0.06); }
    .quick-name { font-size: 0.85rem; font-weight: 700; color: #1C1917; }
    .quick-price { font-size: 0.78rem; font-weight: 700; color: #2DB344; }
    .basket-list { display: flex; flex-direction: column; margin-top: 0.75rem; border: 1px solid #E7E5E4; border-radius: 0.75rem; overflow: hidden; }
    .basket-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 0.9rem; border-bottom: 1px solid #E7E5E4; }
    .basket-row:last-child { border-bottom: none; }
    .basket-info { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; flex: 1; }
    .basket-name { font-size: 0.88rem; font-weight: 700; color: #1C1917; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .basket-unit { font-size: 0.72rem; color: #A8A29E; }
    .basket-qty { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
    .basket-qty button { width: 32px; height: 32px; min-height: unset; border-radius: 50%; border: 1.5px solid #E7E5E4; background: white; font-size: 1rem; font-weight: 800; color: #1C1917; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: inherit; }
    .basket-qty span { min-width: 20px; text-align: center; font-weight: 800; font-size: 0.9rem; }
    .basket-line-total { font-size: 0.9rem; font-weight: 800; color: #1C1917; flex-shrink: 0; min-width: 64px; text-align: right; }
    .basket-remove { background: none; border: none; color: #A8A29E; font-size: 1rem; cursor: pointer; min-height: unset; width: 28px; height: 28px; flex-shrink: 0; font-family: inherit; }
    .basket-remove:hover { color: #E53935; }
    .pos-total-row { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.85rem; border-top: 2px solid #E7E5E4; font-size: 1.1rem; font-weight: 800; color: #1C1917; }
    .complete-sale-btn { display: block; width: 100%; margin-top: 1rem; border: none; border-radius: 999px; padding: 1.1rem; font-size: 1.05rem; font-weight: 800; background: #2DB344; color: white; cursor: pointer; font-family: inherit; min-height: 56px; box-shadow: 0 4px 14px rgba(45,179,68,0.35); transition: box-shadow 0.15s; }
    .complete-sale-btn:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(45,179,68,0.5); }
    .complete-sale-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .barcode-label { font-size: 0.72rem; color: #A8A29E; margin: 0.2rem 0 0; }
    .barcode-row { display: flex; gap: 0.5rem; }
    .barcode-row input { flex: 1; }
    .scan-btn { flex-shrink: 0; border: 2px solid #E7E5E4; background: white; border-radius: 0.75rem; padding: 0 0.9rem; font-size: 0.85rem; font-weight: 700; color: #1C1917; cursor: pointer; font-family: inherit; min-height: 48px; }
    .scan-btn:hover { border-color: #F5B800; }
    .barcode-modal-sheet { max-width: 420px; }

    /* ── POS success confirmation ── */
    .pos-success-overlay { z-index: 300; align-items: center; }
    .pos-success-sheet { background: white; border-radius: 1.5rem; padding: 2.25rem 1.75rem; width: 100%; max-width: 340px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; animation: slideUp 0.25s ease; }
    .pos-success-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(45,179,68,0.12); color: #2DB344; font-size: 2rem; font-weight: 900; display: flex; align-items: center; justify-content: center; margin-bottom: 0.4rem; }
    .pos-success-label { font-size: 0.95rem; font-weight: 700; color: #78716C; margin: 0; }
    .pos-success-total { font-size: 1.9rem; font-weight: 900; color: #1C1917; margin: 0 0 0.75rem; }
    .pos-success-sheet .primary { width: 100%; }

    /* ── Sales history ── */
    .sale-history-list { display: flex; flex-direction: column; margin-top: 0.75rem; border: 1px solid #E7E5E4; border-radius: 0.75rem; overflow: hidden; }
    .sale-history-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 1rem; border-bottom: 1px solid #E7E5E4; }
    .sale-history-row:last-child { border-bottom: none; }
    .sale-history-main { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
    .sale-history-time { font-size: 0.78rem; font-weight: 700; color: #78716C; }
    .sale-history-items { font-size: 0.85rem; color: #1C1917; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; }
    .sale-history-total { font-size: 0.95rem; font-weight: 800; color: #2DB344; flex-shrink: 0; }

    /* ── Desktop shell: rail nav + main column + quick log panel ── */
    .dashboard-shell { display: flex; flex-direction: column; gap: 1.25rem; }
    .rail-nav { display: none; }
    .main-col { display: flex; flex-direction: column; gap: 1.25rem; flex: 1; min-width: 0; }
    .quick-log-panel { display: none; }
    @media (min-width: 960px) {
      .dashboard-shell { flex-direction: row; align-items: flex-start; gap: 1.5rem; }
      .rail-nav {
        display: flex; flex-direction: column; gap: 0.5rem; width: 150px; flex-shrink: 0;
        background: white; border: 1px solid #E7E5E4; border-radius: 1.25rem;
        padding: 1.25rem 0.9rem; position: sticky; top: 1rem;
      }
      .tab-bar { display: none; }
      .quick-log-panel {
        display: flex; flex-direction: column; gap: 0.65rem; width: 220px; flex-shrink: 0;
        background: #fffdf5; border: 1.5px dashed #d8cfa8; border-radius: 1.25rem;
        padding: 1.25rem 1rem; position: sticky; top: 1rem;
      }
    }
    .rail-brand { font-weight: 900; font-size: 0.95rem; color: #1C1917; letter-spacing: 0.03em; padding: 0 0.3rem 0.5rem; }
    .rail-item {
      display: flex; align-items: center; gap: 0.6rem; border: none; background: none; border-radius: 0.75rem;
      padding: 0.65rem 0.6rem; font-size: 0.88rem; font-weight: 700; color: #78716C; cursor: pointer;
      font-family: inherit; text-align: left; min-height: 44px;
    }
    .rail-item span { font-size: 1.05rem; }
    .rail-item:hover { background: #FAFAF9; }
    .rail-active { background: rgba(245,184,0,0.12) !important; color: #1C1917 !important; }
    .rail-spacer { flex: 1; }
    .rail-sync { font-size: 0.72rem; padding: 0 0.3rem; }

    /* ── Quick log panel (desktop) ── */
    .ql-title { margin: 0; font-size: 0.95rem; font-weight: 800; color: #1C1917; }
    .ql-type-row { display: flex; gap: 0.5rem; }
    .ql-type-btn { flex: 1; border: 2px solid #E7E5E4; border-radius: 0.7rem; background: white; padding: 0.55rem 0.3rem; font-size: 0.82rem; font-weight: 800; cursor: pointer; font-family: inherit; min-height: 40px; }
    .ql-type-in.ql-type-active { border-color: #2DB344; background: rgba(45,179,68,0.08); color: #166534; }
    .ql-type-out.ql-type-active { border-color: #E53935; background: rgba(229,57,53,0.08); color: #991b1b; }
    .ql-amount-input { border-radius: 0.7rem; border: 2px solid #E7E5E4; padding: 0.55rem 0.7rem; font-size: 0.9rem; font-family: inherit; width: 100%; box-sizing: border-box; min-height: 42px; }
    .ql-save-btn { font-size: 0.85rem; padding: 0.6rem; }
    .ql-report-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; color: #78716C; padding-top: 0.4rem; border-top: 1px dashed #E7E5E4; margin-top: 0.2rem; }
    .chip-btn { border: 1.5px solid #E7E5E4; background: white; border-radius: 999px; padding: 0.25rem 0.7rem; font-size: 0.78rem; font-weight: 700; cursor: pointer; font-family: inherit; }
    .chip-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── Sell tab: search-or-scan bar ── */
    .pos-search-card { padding: 0.9rem 1rem; }
    .search-scan-row { display: flex; align-items: center; gap: 0.6rem; }
    .search-icon { font-size: 1rem; flex-shrink: 0; }
    .search-input { flex: 1; border: none; outline: none; font-size: 1rem; font-family: inherit; min-width: 0; background: transparent; }
    .scan-chip { flex-shrink: 0; border: 1.5px solid #E7E5E4; background: #FAFAF9; border-radius: 999px; padding: 0.4rem 0.9rem; font-size: 0.82rem; font-weight: 700; color: #1C1917; cursor: pointer; font-family: inherit; min-height: 36px; }
    .scan-chip:hover { border-color: #F5B800; }
    .quick-more .quick-name { color: #78716C; }
    .basket-count { font-weight: 700; color: #78716C; font-size: 0.85rem; }
    .basket-summary { font-size: 0.8rem; color: #78716C; margin: 0.2rem 0 0; }

    /* ── Money tab: summary card + wizard entry ── */
    .money-summary-card { display: flex; flex-direction: column; gap: 0.4rem; padding: 1.1rem 1.25rem; }
    .ms-month { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; color: #A8A29E; }
    .ms-profit { font-size: 1.6rem; font-weight: 900; color: #1C1917; }
    .ms-inout-row { display: flex; gap: 1.5rem; margin-top: 0.3rem; font-size: 0.9rem; font-weight: 700; color: #1C1917; }
    .ms-arrow { font-weight: 900; margin-right: 0.15rem; }
    .ms-up { color: #2DB344; }
    .ms-down { color: #E53935; }
    .ms-inout-label { margin-left: 0.3rem; font-weight: 600; }
    .money-quicklog-row { display: flex; gap: 0.75rem; }
    .money-quicklog-row button {
      flex: 1; border: 2px solid #222; border-radius: 1rem; padding: 1rem 0.6rem; text-align: center;
      font-size: 1.05rem; font-weight: 800; background: white; cursor: pointer; font-family: inherit; min-height: 56px;
    }
    .money-in-btn { border-color: #2DB344 !important; color: #166534; background: rgba(45,179,68,0.06) !important; }
    .money-out-btn { border-color: #E53935 !important; color: #991b1b; background: rgba(229,57,53,0.05) !important; }
    .money-wizard-note { font-size: 0.76rem; text-align: center; margin: -0.4rem 0 0; }
    .compact-history-list { display: flex; flex-direction: column; margin-top: 0.5rem; }
    .compact-history-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0; border-bottom: 1px solid #F5F0E8; font-size: 0.85rem; }
    .compact-history-row:last-child { border-bottom: none; }
    .ch-date { color: #A8A29E; font-weight: 700; min-width: 52px; flex-shrink: 0; }
    .ch-cat { flex: 1; color: #1C1917; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ch-amt { font-weight: 800; color: #2DB344; flex-shrink: 0; }
    .ch-amt.ch-neg { color: #E53935; }
    .more-toggle-btn {
      align-self: center; background: none; border: none; color: #1B6FD4; font-weight: 700;
      font-size: 0.85rem; cursor: pointer; font-family: inherit; padding: 0.5rem; min-height: 40px;
    }
    .csv-export-row { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #E7E5E4; }

    /* ── Money wizard modal ── */
    .wizard-sheet { max-width: 380px; display: flex; flex-direction: column; gap: 0.9rem; }
    .wizard-step-label { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; color: #A8A29E; text-transform: uppercase; margin: 0; }
    .wizard-amount-input {
      font-size: 2rem; font-weight: 800; text-align: center; border: 2px solid #E7E5E4; border-radius: 1rem;
      padding: 0.9rem; width: 100%; box-sizing: border-box; font-family: inherit; color: #1C1917;
    }
    .wizard-amount-input:focus { border-color: #F5B800; outline: none; }
    .wizard-next-btn { width: 100%; }
    .wizard-category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
    .wizard-cat-tile {
      display: flex; flex-direction: column; align-items: center; gap: 0.35rem; border: 1.5px solid #E7E5E4;
      border-radius: 0.9rem; padding: 0.9rem 0.4rem; background: #FAFAF9; cursor: pointer; font-family: inherit;
      font-size: 0.78rem; font-weight: 700; color: #1C1917; min-height: 76px;
    }
    .wizard-cat-tile:hover:not(:disabled) { border-color: #F5B800; background: rgba(245,184,0,0.06); }
    .wizard-cat-tile:disabled { opacity: 0.5; cursor: not-allowed; }
    .wizard-cat-icon { font-size: 1.4rem; }
    .wizard-note-toggle { align-self: flex-start; background: none; border: none; color: #1B6FD4; font-weight: 700; font-size: 0.82rem; cursor: pointer; font-family: inherit; padding: 0.2rem; }
    .wizard-note-input { border-radius: 0.7rem; border: 2px solid #E7E5E4; padding: 0.6rem 0.8rem; font-size: 0.9rem; font-family: inherit; width: 100%; box-sizing: border-box; }
  `
})
export class HustlerDashboardPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  private dataLoaded = false;

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn() && !this.dataLoaded) {
        this.dataLoaded = true;
        untracked(() => {
          this.loadProducts();
          this.loadIncome();
          this.loadSummary();
        });
      }
    });
  }

  tab = signal<'income' | 'products' | 'orders' | 'sell'>('sell');
  logTab = signal<'income' | 'expense'>('income');

  readonly historyFilterOpts = [
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
    { value: 'all', label: 'All time' },
  ];
  incomeCategoryOpts = computed(() => this.logTab() === 'income'
    ? [
        { value: '', label: '— Select category —' },
        { value: 'CASH_SALES', label: 'Cash Sales' },
        { value: 'CREDIT_SALES', label: 'Credit Sale' },
        { value: 'IN_APP_SALES', label: 'In-App Sales' },
        { value: 'GRANTS_SASSA', label: 'Grants / SASSA' },
        { value: 'OTHER_SALARY_WAGES', label: 'Other Salary / Wages' },
        { value: 'OTHER_HOUSEHOLD', label: 'Other Household Income' },
      ]
    : [
        { value: '', label: '— Select category —' },
        { value: 'COST_OF_GOODS', label: 'Cost of Goods (Direct Cost)' },
        { value: 'TRANSPORT', label: 'Transport' },
        { value: 'RUNNER_FEE', label: 'Runner Fee' },
        { value: 'ELECTRICITY', label: 'Electricity' },
        { value: 'WAGES', label: 'Wages' },
        { value: 'AIRTIME_DATA', label: 'Airtime / Data' },
        { value: 'OTHER_OVERHEAD_1', label: 'Other Overhead 1' },
        { value: 'OTHER_OVERHEAD_2', label: 'Other Overhead 2' },
        { value: 'SAVINGS', label: 'Savings' },
      ]
  );
  showAddModal = signal(false);

  // ── Income ──────────────────────────────────────────────────────────────────
  incomeHistory = signal<IncomeEntryResponse[]>([]);
  summary = signal<IncomeSummary | null>(null);
  incomeLoading = signal(false);
  incomeSuccess = signal(false);
  incomeError = signal('');
  historyFilter = 'week';
  expandedEntryIdx = signal<number | null>(null);

  toggleEntry(i: number): void {
    this.expandedEntryIdx.update(cur => cur === i ? null : i);
  }

  isServiceIncome = false;
  invoiceCustomer = '';
  invoiceService = '';
  incomeCategory = '';
  reportMonth = new Date().toISOString().slice(0, 7);
  reportDownloading = signal(false);

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
  editBarcode = '';
  private editPendingImageUrl: string | null = null;
  saveLoading = signal(false);
  saveError = signal('');

  // ── Barcode scan modal (add/edit product capture + POS scanning) ───────────
  barcodeModalMode = signal<'add' | 'edit' | 'pos' | null>(null);
  private pendingBarcodeForNewProduct: string | null = null;

  onBarcodeCaptured(code: string): void {
    const mode = this.barcodeModalMode();
    if (mode === 'add') {
      this.productForm.patchValue({ barcode: code });
      this.barcodeModalMode.set(null);
    } else if (mode === 'edit') {
      this.editBarcode = code;
      this.barcodeModalMode.set(null);
    } else if (mode === 'pos') {
      this.onPosScan(code);
      // stays open — a cashier scans several items in a row; closed manually via ✕
    }
  }

  onBarcodeOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.barcodeModalMode.set(null);
    }
  }

  // ── Sell (POS) ───────────────────────────────────────────────────────────
  posView = signal<'sell' | 'history'>('sell');
  posBasket = signal<{ productId?: string; itemName: string; unitPrice: number; quantity: number }[]>([]);
  posSearchQuery = '';
  posShowAllProducts = signal(false);
  posScanError = signal('');
  posUnknownBarcode = signal<string | null>(null);
  posLastAdded = signal<string | null>(null);
  posCompleting = signal(false);
  posSuccess = signal<{ total: number } | null>(null);
  posError = signal('');

  salesHistory = signal<SaleResponse[]>([]);
  salesHistoryLoading = signal(false);

  private readonly POS_QUICK_PREVIEW = 6;

  posFilteredProducts = computed(() => {
    const q = this.posSearchQuery.trim().toLowerCase();
    const list = this.products();
    return q ? list.filter(p => p.name.toLowerCase().includes(q)) : list;
  });

  posVisibleProducts = computed(() => {
    const list = this.posFilteredProducts();
    return this.posShowAllProducts() || this.posSearchQuery.trim()
      ? list
      : list.slice(0, this.POS_QUICK_PREVIEW);
  });

  posHasMoreProducts = computed(() =>
    !this.posShowAllProducts() && !this.posSearchQuery.trim() && this.posFilteredProducts().length > this.POS_QUICK_PREVIEW
  );

  basketTotal = computed(() => this.posBasket().reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  basketSummaryLine = computed(() => this.posBasket().map(i => `${i.itemName} ×${i.quantity}`).join(', '));

  openPosScanModal(): void {
    this.posScanError.set('');
    this.posUnknownBarcode.set(null);
    this.posLastAdded.set(null);
    this.barcodeModalMode.set('pos');
  }

  onPosScan(code: string): void {
    this.posScanError.set('');
    this.api.getProductByBarcode(code, this.auth.getToken()!).subscribe({
      next: (product) => this.addProductToBasket(product),
      error: (err) => {
        if (err.status === 404) {
          this.posUnknownBarcode.set(code);
        } else {
          this.posScanError.set('Could not look up that barcode. Try again.');
        }
      }
    });
  }

  addProductToBasket(product: ProductResponse): void {
    this.posBasket.update(items => {
      const idx = items.findIndex(i => i.productId === product.id);
      if (idx >= 0) {
        const updated = [...items];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...items, { productId: product.id, itemName: product.name, unitPrice: Number(product.price), quantity: 1 }];
    });
    this.posUnknownBarcode.set(null);
    this.posLastAdded.set(product.name);
    setTimeout(() => this.posLastAdded.set(null), 1500);
  }

  incBasketQty(i: number): void {
    this.posBasket.update(items => items.map((it, idx) => idx === i ? { ...it, quantity: it.quantity + 1 } : it));
  }

  decBasketQty(i: number): void {
    this.posBasket.update(items => {
      const it = items[i];
      if (it.quantity <= 1) return items.filter((_, idx) => idx !== i);
      return items.map((x, idx) => idx === i ? { ...x, quantity: x.quantity - 1 } : x);
    });
  }

  removeBasketItem(i: number): void {
    this.posBasket.update(items => items.filter((_, idx) => idx !== i));
  }

  createProductFromBarcode(): void {
    const code = this.posUnknownBarcode();
    if (!code) return;
    this.productForm.reset();
    this.newProductCategory = '';
    this.imagePreview.set(null);
    this.pendingImageUrl.set(null);
    this.productForm.patchValue({ barcode: code });
    this.pendingBarcodeForNewProduct = code;
    this.barcodeModalMode.set(null);
    this.showAddModal.set(true);
    this.posUnknownBarcode.set(null);
  }

  completeSale(): void {
    if (this.posBasket().length === 0) return;
    this.posCompleting.set(true);
    this.posError.set('');
    const items: SaleItemRequest[] = this.posBasket().map(i => ({
      productId: i.productId,
      itemName: i.itemName,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
    }));
    const payload: SaleRequest = { id: crypto.randomUUID(), items, totalAmount: this.basketTotal() };
    this.api.createSale(payload, this.auth.getToken()!).subscribe({
      next: (sale) => {
        this.posCompleting.set(false);
        this.posSuccess.set({ total: Number(sale.totalAmount) });
        this.posBasket.set([]);
        this.loadSummary();
        setTimeout(() => this.posSuccess.set(null), 3000);
      },
      error: (err) => {
        this.posCompleting.set(false);
        this.posError.set(err?.error?.message || 'Failed to complete sale. Please try again.');
      }
    });
  }

  loadSalesHistory(): void {
    this.salesHistoryLoading.set(true);
    this.api.listSales(this.auth.getToken()!).subscribe({
      next: (res) => { this.salesHistory.set(res.content); this.salesHistoryLoading.set(false); },
      error: () => this.salesHistoryLoading.set(false)
    });
  }

  saleItemsSummary(s: SaleResponse): string {
    return s.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ');
  }

  // ── Money tab: summary + collapsible "More" ─────────────────────────────────
  moneyMoreOpen = signal(false);
  currentMonthLabel = computed(() => new Date().toLocaleString('en-ZA', { month: 'long' }).toUpperCase());

  private moneyCategoryOpts(type: 'INCOME' | 'EXPENSE'): { value: string; label: string; icon: string }[] {
    return type === 'INCOME'
      ? [
          { value: 'CASH_SALES', label: 'Cash Sales', icon: '💵' },
          { value: 'CREDIT_SALES', label: 'Credit Sale', icon: '🤝' },
          { value: 'GRANTS_SASSA', label: 'Grants / SASSA', icon: '🏛️' },
          { value: 'OTHER_SALARY_WAGES', label: 'Salary / Wages', icon: '💼' },
          { value: 'OTHER_HOUSEHOLD', label: 'Other', icon: '➕' },
        ]
      : [
          { value: 'COST_OF_GOODS', label: 'Stock', icon: '🍞' },
          { value: 'TRANSPORT', label: 'Transport', icon: '🚌' },
          { value: 'ELECTRICITY', label: 'Electricity', icon: '⚡' },
          { value: 'WAGES', label: 'Wages', icon: '👷' },
          { value: 'AIRTIME_DATA', label: 'Airtime/Data', icon: '📱' },
          { value: 'OTHER_OVERHEAD_1', label: 'Other', icon: '➕' },
        ];
  }

  // ── Money wizard (mobile, one question at a time) ───────────────────────────
  moneyWizardOpen = signal(false);
  moneyWizardStep = signal<'amount' | 'category'>('amount');
  moneyWizardType = signal<'INCOME' | 'EXPENSE'>('INCOME');
  moneyWizardAmount: number | null = null;
  moneyWizardNotes = '';
  moneyWizardShowNotes = signal(false);
  moneyWizardSaving = signal(false);
  moneyWizardError = signal('');

  moneyWizardCategoryOpts = computed(() => this.moneyCategoryOpts(this.moneyWizardType()));

  openMoneyWizard(type: 'INCOME' | 'EXPENSE'): void {
    this.moneyWizardType.set(type);
    this.moneyWizardStep.set('amount');
    this.moneyWizardAmount = null;
    this.moneyWizardNotes = '';
    this.moneyWizardShowNotes.set(false);
    this.moneyWizardError.set('');
    this.moneyWizardOpen.set(true);
  }

  closeMoneyWizard(): void {
    this.moneyWizardOpen.set(false);
  }

  onMoneyWizardOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeMoneyWizard();
    }
  }

  moneyWizardNext(): void {
    if (!this.moneyWizardAmount || this.moneyWizardAmount <= 0) return;
    this.moneyWizardStep.set('category');
  }

  selectMoneyWizardCategory(category: string): void {
    this.moneyWizardSaving.set(true);
    this.moneyWizardError.set('');
    const payload: IncomeEntryRequest = {
      date: new Date().toISOString().slice(0, 10),
      amount: this.moneyWizardAmount!,
      channel: 'CASH',
      entryType: this.moneyWizardType(),
      category,
      notes: this.moneyWizardNotes || undefined,
    };
    this.api.logIncome(payload, this.auth.getToken()!).subscribe({
      next: (entry) => {
        this.moneyWizardSaving.set(false);
        this.moneyWizardOpen.set(false);
        this.incomeHistory.update(h => [entry, ...h]);
        this.loadSummary();
      },
      error: (err) => {
        this.moneyWizardSaving.set(false);
        this.moneyWizardError.set(err?.error?.message || 'Failed to save. Please try again.');
      }
    });
  }

  // ── Quick log panel (desktop, always visible on Sell tab) ───────────────────
  quickLogType = signal<'INCOME' | 'EXPENSE'>('INCOME');
  quickLogAmount: number | null = null;
  quickLogCategory = '';
  quickLogSaving = signal(false);
  quickLogError = signal('');

  quickLogCategoryOpts = computed(() => this.moneyCategoryOpts(this.quickLogType()));

  saveQuickLog(): void {
    if (!this.quickLogAmount || this.quickLogAmount <= 0) return;
    this.quickLogSaving.set(true);
    this.quickLogError.set('');
    const payload: IncomeEntryRequest = {
      date: new Date().toISOString().slice(0, 10),
      amount: this.quickLogAmount,
      channel: 'CASH',
      entryType: this.quickLogType(),
      category: this.quickLogCategory || undefined,
    };
    this.api.logIncome(payload, this.auth.getToken()!).subscribe({
      next: (entry) => {
        this.quickLogSaving.set(false);
        this.incomeHistory.update(h => [entry, ...h]);
        this.loadSummary();
        this.quickLogAmount = null;
        this.quickLogCategory = '';
      },
      error: (err) => {
        this.quickLogSaving.set(false);
        this.quickLogError.set(err?.error?.message || 'Failed to save.');
      }
    });
  }

  readonly productCategoryOpts = [
    { value: '',            label: '— Select category —' },
    { value: 'FAST_FOOD',   label: 'Fast Food' },
    { value: 'GROCERY',     label: 'Grocery' },
    { value: 'CLOTHING',    label: 'Clothing' },
    { value: 'SERVICES',    label: 'Services' },
    { value: 'CRAFTS',      label: 'Crafts & Art' },
    { value: 'AGRI',        label: 'Agri & Livestock' },
    { value: 'ELECTRONICS', label: 'Electronics' },
    { value: 'OTHER',       label: 'Other' },
  ];

  getCategoryLabel(value: string): string {
    return this.productCategoryOpts.find(o => o.value === value)?.label ?? value;
  }

  newProductCategory = '';
  editCategory = '';

  productForm = this.fb.group({
    name:        ['', Validators.required],
    description: ['', Validators.required],
    price:       [null as number | null, [Validators.required, Validators.min(0)]],
    barcode:     [''],
  });

  // ── Orders ───────────────────────────────────────────────────────────────────
  incomingOrders = signal<OrderResponse[]>([]);
  ordersLoading = signal(false);
  orderActionId = signal<string | null>(null);
  orderError = signal('');

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    // data loading handled by constructor effect (reactive on auth state)
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/register']);
  }

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
      channel: (['CREDIT_SALES', 'IN_APP_SALES'].includes(this.incomeCategory) ? 'MARKETPLACE' : 'CASH') as 'CASH' | 'MARKETPLACE',
      entryType: (this.logTab() === 'expense' ? 'EXPENSE' : 'INCOME') as 'INCOME' | 'EXPENSE',
      category: this.incomeCategory || undefined,
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
        this.incomeCategory = '';
        setTimeout(() => this.incomeSuccess.set(false), 2500);
      },
      error: (err) => {
        this.incomeLoading.set(false);
        this.incomeError.set(err?.error?.message || 'Failed to log entry. Please try again.');
      }
    });
  }

  downloadMyMonthlyReport(): void {
    this.reportDownloading.set(true);
    this.api.listMyIncomeForMonth(this.reportMonth, this.auth.getToken()!).subscribe({
      next: (entries) => {
        const state = this.auth.state();
        generateMonthlyReportPdf({
          firstName: state?.firstName ?? '',
          lastName: state?.lastName ?? '',
          businessName: state?.businessName ?? '',
          businessType: state?.businessType ?? '',
        }, entries, this.reportMonth);
        this.reportDownloading.set(false);
      },
      error: () => this.reportDownloading.set(false),
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

    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
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
      mediaUrl: this.pendingImageUrl() ?? undefined,
      category: this.newProductCategory || undefined,
      barcode: this.productForm.value.barcode || undefined,
    };
    this.api.createProduct(payload, this.auth.getToken()!).subscribe({
      next: (p) => {
        this.products.update(l => [p, ...l]);
        if (this.pendingBarcodeForNewProduct && p.barcode === this.pendingBarcodeForNewProduct) {
          this.addProductToBasket(p);
        }
        this.pendingBarcodeForNewProduct = null;
        this.productForm.reset();
        this.newProductCategory = '';
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
    this.editCategory = p.category ?? '';
    this.editBarcode = p.barcode ?? '';
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
      mediaUrl: this.editPendingImageUrl ?? p.mediaUrl,
      category: this.editCategory || undefined,
      barcode: this.editBarcode,
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
