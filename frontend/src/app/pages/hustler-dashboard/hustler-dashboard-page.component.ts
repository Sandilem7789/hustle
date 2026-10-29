import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject, computed, effect, untracked, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { CATEGORIES, categoryColor } from '../../utils/product-categories';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { jsPDF } from 'jspdf';
import { ApiService, ProductResponse, ProductRequest, IncomeEntryRequest, IncomeEntryResponse, IncomeSummary, OrderResponse, SaleResponse, SaleItemRequest, SaleRequest } from '../../services/api.service';
import { generateMonthlyReportPdf } from '../../utils/monthly-report.util';
import { AuthService } from '../../services/auth.service';
import { UnifiedAuthService } from '../../services/unified-auth.service';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import { AppSelectComponent } from '../../components/app-select/app-select.component';
import { BarcodeScannerComponent } from '../../components/barcode-scanner/barcode-scanner.component';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';

type SellTab = 'today' | 'sell' | 'orders' | 'products' | 'money';
const TABS: SellTab[] = ['today', 'sell', 'orders', 'products', 'money'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TOO_LARGE = 'This photo is bigger than 5 MB. Choose a smaller one.';

@Component({
  selector: 'app-hustler-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatIconModule, LoginGateComponent, AppSelectComponent, BarcodeScannerComponent, LoadingSkeletonComponent],
  template: `
    <app-login-gate *ngIf="!auth.isLoggedIn()"
      icon="👤"
      title="Hustler Sign In"
      subtitle="Log in to manage your business, track income, and view orders."
    ></app-login-gate>

    <section class="sell" *ngIf="auth.isLoggedIn()">

      <!-- ══ TODAY ══════════════════════════════════════════════ -->
      <ng-container *ngIf="tab() === 'today'">
        <header class="head dash-head">
          <div class="wrap head-row">
            <div class="head-text">
              <p class="eyebrow">{{ todayLabel() }}</p>
              <h1 class="hello">Sawubona, {{ auth.state()?.firstName }}.</h1>
              <div class="chips">
                <span class="chip"><span class="live-dot" aria-hidden="true"></span>Live in Shop</span>
                <span class="chip" *ngIf="auth.state()?.businessName">{{ auth.state()?.businessName }}</span>
              </div>
            </div>
            <div class="head-actions wide-only">
              <button type="button" class="btn gold" (click)="go('sell')">Make a sale</button>
              <button type="button" class="btn line" (click)="openMoneyWizard('INCOME')">+ Money in</button>
              <button type="button" class="btn line" (click)="openMoneyWizard('EXPENSE')">− Money out</button>
            </div>
          </div>
        </header>

        <div class="wrap today-grid">
          <section class="card today-card" aria-labelledby="today-h">
            <div class="card-row">
              <h2 id="today-h" class="eyebrow">Today</h2>
              <button type="button" class="link" (click)="go('money')">Money ›</button>
            </div>
            <div class="today-main">
              <div class="today-big">
                <span class="big">R {{ (summary()?.todayIncome ?? 0) | number:'1.0-2' }}</span>
                <span class="mut">came in today</span>
              </div>
              <div class="trio">
                <div><span class="mut small">Went out</span><strong>R {{ (summary()?.todayExpenses ?? 0) | number:'1.0-2' }}</strong></div>
                <div><span class="mut small">Profit today</span><strong class="leaf" [class.neg]="(summary()?.todayProfit ?? 0) < 0">R {{ (summary()?.todayProfit ?? 0) | number:'1.0-2' }}</strong></div>
                <div><span class="mut small">Profit this week</span><strong [class.neg]="(summary()?.weekProfit ?? 0) < 0">R {{ (summary()?.weekProfit ?? 0) | number:'1.0-2' }}</strong></div>
              </div>
            </div>
          </section>

          <div class="today-actions phone-only">
            <button type="button" class="btn gold big-btn" (click)="go('sell')">
              <mat-icon aria-hidden="true">shopping_basket</mat-icon>Make a sale
            </button>
            <div class="pair">
              <button type="button" class="btn line" (click)="openMoneyWizard('INCOME')">+ Money in</button>
              <button type="button" class="btn line" (click)="openMoneyWizard('EXPENSE')">− Money out</button>
            </div>
          </div>

          <section class="needs" aria-labelledby="needs-h">
            <h2 id="needs-h" class="section-title">Needs you now</h2>
            <button type="button" class="need" *ngIf="pendingOrders().length > 0" (click)="go('orders')">
              <span class="num">{{ pendingOrders().length }}</span>
              <span class="need-text"><strong>New orders to confirm</strong><span class="mut">Oldest from {{ pendingOrders()[pendingOrders().length - 1].createdAt | date:'d MMM, HH:mm' }}</span></span>
              <mat-icon aria-hidden="true">chevron_right</mat-icon>
            </button>
            <button type="button" class="need" *ngIf="collectOrders().length > 0" (click)="go('orders')">
              <span class="num">{{ collectOrders().length }}</span>
              <span class="need-text"><strong>Buyer coming to collect</strong><span class="mut">Scan their pickup code when they arrive</span></span>
              <mat-icon aria-hidden="true">chevron_right</mat-icon>
            </button>
            <button type="button" class="need" *ngIf="products().length === 0 && !loadingProducts()" (click)="go('products')">
              <span class="num soft"><mat-icon aria-hidden="true">add</mat-icon></span>
              <span class="need-text"><strong>Add your first product</strong><span class="mut">Buyers see it in Shop</span></span>
              <mat-icon aria-hidden="true">chevron_right</mat-icon>
            </button>
            <p class="calm" *ngIf="pendingOrders().length === 0 && collectOrders().length === 0 && products().length > 0">Nothing needs you right now.</p>
          </section>

          <section class="card ink record" aria-labelledby="rec-h">
            <h2 id="rec-h" class="eyebrow gold-text">Your business record</h2>
            <p class="record-text">Banks and funders ask for this. Download a month to show what your business earns.</p>
            <label class="field">
              <span>Month</span>
              <input type="month" [(ngModel)]="reportMonth" [ngModelOptions]="{standalone:true}" />
            </label>
            <button type="button" class="btn gold" (click)="downloadMyMonthlyReport()" [disabled]="reportDownloading()">
              {{ reportDownloading() ? 'Making your report…' : 'Download PDF' }}
            </button>
          </section>
        </div>
      </ng-container>

      <!-- ══ MAKE A SALE ═════════════════════════════════════════ -->
      <ng-container *ngIf="tab() === 'sell'">
        <!-- Sale saved -->
        <ng-container *ngIf="posSuccess() as res; else selling">
          <div class="wrap receipt">
            <section class="card ink receipt-card" aria-live="polite">
              <span class="tick" aria-hidden="true"><mat-icon>check</mat-icon></span>
              <h1 class="receipt-title">Sale saved</h1>
              <p class="receipt-total">R {{ res.total | number:'1.0-2' }}</p>
              <p class="receipt-meta">
                <ng-container *ngIf="res.cashGiven !== null">Cash · R {{ res.cashGiven | number:'1.0-2' }} received · R {{ res.change | number:'1.0-2' }} change · </ng-container>
                <ng-container *ngIf="res.cashGiven === null && res.method === 'card'">Card or EFT · </ng-container>{{ res.time | date:'HH:mm' }}
              </p>
            </section>
            <section class="card">
              <h2 class="eyebrow">What was sold</h2>
              <div class="line-row" *ngFor="let i of res.items">
                <span>{{ i.quantity }} × {{ i.itemName }}</span><strong>R {{ i.unitPrice * i.quantity | number:'1.0-2' }}</strong>
              </div>
            </section>
            <p class="mut center">Added to Money as money in. No need to log it again.</p>
            <div class="receipt-actions">
              <button type="button" class="btn gold big-btn" (click)="newSale()">New sale</button>
              <a class="btn line" [href]="receiptWhatsapp(res)" target="_blank" rel="noopener">WhatsApp receipt</a>
            </div>
          </div>
        </ng-container>

        <ng-template #selling>
          <header class="head dash-head pos-head" [class.phone-hide]="posView() === 'charge'">
            <div class="wrap">
              <div class="pos-title-row">
                <h1 class="title">Make a sale</h1>
                <button type="button" class="icon-btn" (click)="openPosScanModal()" aria-label="Scan a barcode">
                  <mat-icon aria-hidden="true">qr_code_scanner</mat-icon>
                </button>
              </div>
              <label class="search">
                <mat-icon aria-hidden="true">search</mat-icon>
                <span class="sr-only">Search products</span>
                <input type="search" placeholder="Search products" [ngModel]="posSearchQuery()" (ngModelChange)="posSearchQuery.set($event)" [ngModelOptions]="{standalone:true}" />
              </label>
            </div>
          </header>

          <div class="wrap pos-body">
            <div class="pos-main" [class.phone-hide]="posView() === 'charge'">
              <div class="chip-row" role="group" aria-label="Category" *ngIf="posCategories().length > 1">
                <button type="button" class="pill" [attr.aria-pressed]="posCategory() === 'ALL'" (click)="posCategory.set('ALL')">All</button>
                <button type="button" class="pill" *ngFor="let c of posCategories()" [attr.aria-pressed]="posCategory() === c" (click)="posCategory.set(c)">
                  <span class="cat-dot" [style.background]="catColor(c)" aria-hidden="true"></span>{{ getCategoryLabel(c) }}
                </button>
              </div>

              <app-loading-skeleton [loading]="loadingProducts()" variant="stock"></app-loading-skeleton>

              <div class="tiles">
                <button type="button" class="tile" *ngFor="let p of posTiles()" [class.in]="basketQty(p.id) > 0" (click)="addProductToBasket(p)">
                  <span class="tile-badge" *ngIf="basketQty(p.id) > 0">×{{ basketQty(p.id) }}</span>
                  <span class="tile-cat" *ngIf="p.category"><span class="cat-dot" [style.background]="catColor(p.category)" aria-hidden="true"></span>{{ getCategoryLabel(p.category) }}</span>
                  <strong class="tile-name">{{ p.name }}</strong>
                  <span class="tile-price">R {{ p.price | number:'1.0-2' }}</span>
                </button>
                <button type="button" class="tile add-tile" *ngIf="products().length < 40" (click)="showAddModal.set(true)">
                  <mat-icon aria-hidden="true">add</mat-icon>Add a product
                </button>
              </div>
              <p *ngIf="posSearchQuery().trim() && posTiles().length === 0" class="mut">No products match "{{ posSearchQuery() }}".</p>

              <button type="button" class="link history-link" (click)="toggleSalesHistory()">
                {{ posView() === 'history' ? 'Hide sales history' : 'Sales history' }}
              </button>
              <section class="card" *ngIf="posView() === 'history'">
                <h2 class="eyebrow">Sales history</h2>
                <p *ngIf="salesHistoryLoading()" class="mut">Loading…</p>
                <p *ngIf="!salesHistoryLoading() && salesHistory().length === 0" class="mut">No sales yet.</p>
                <div class="line-row" *ngFor="let s of salesHistory()">
                  <span class="line-text"><strong>{{ saleItemsSummary(s) }}</strong><span class="mut small">{{ s.saleDate | date:'d MMM, HH:mm' }}</span></span>
                  <strong>R {{ s.totalAmount | number:'1.0-2' }}</strong>
                </div>
              </section>
            </div>

            <!-- Basket: a side panel on big screens, its own step on phones -->
            <aside class="basket" [class.phone-hide]="posView() !== 'charge'" aria-labelledby="basket-h">
              <div class="basket-head">
                <button type="button" class="icon-btn phone-only" (click)="posView.set('sell')" aria-label="Back to products">
                  <mat-icon aria-hidden="true">chevron_left</mat-icon>
                </button>
                <h2 id="basket-h" class="basket-title">
                  <span class="phone-only">Take payment</span>
                  <span class="wide-only">Basket · {{ basketCount() }} {{ basketCount() === 1 ? 'item' : 'items' }}</span>
                </h2>
              </div>

              <p class="mut" *ngIf="posBasket().length === 0">Tap a product to start a sale.</p>

              <div class="card basket-lines" *ngIf="posBasket().length > 0">
                <div class="b-line" *ngFor="let item of posBasket(); let i = index">
                  <span class="b-name"><strong>{{ item.itemName }}</strong><span class="mut small">R {{ item.unitPrice | number:'1.0-2' }} each</span></span>
                  <span class="stepper">
                    <button type="button" class="step" (click)="decBasketQty(i)" [attr.aria-label]="'One less ' + item.itemName">−</button>
                    <span class="qty">{{ item.quantity }}</span>
                    <button type="button" class="step" (click)="incBasketQty(i)" [attr.aria-label]="'One more ' + item.itemName">+</button>
                  </span>
                  <strong class="b-total">R {{ item.unitPrice * item.quantity | number:'1.0-2' }}</strong>
                </div>
              </div>

              <ng-container *ngIf="posBasket().length > 0">
                <div class="total-row"><span>Total</span><strong class="big">R {{ basketTotal() | number:'1.0-2' }}</strong></div>

                <div class="pay-seg" role="group" aria-label="How they pay">
                  <button type="button" [attr.aria-pressed]="payMethod() === 'cash'" (click)="payMethod.set('cash')">Cash</button>
                  <button type="button" [attr.aria-pressed]="payMethod() === 'card'" (click)="payMethod.set('card'); cashGiven.set(null)">Card or EFT</button>
                </div>

                <div class="card cash" *ngIf="payMethod() === 'cash'">
                  <span class="cash-label">Cash received</span>
                  <div class="cash-options">
                    <button type="button" class="cash-opt" [attr.aria-pressed]="cashGiven() === basketTotal()" (click)="cashGiven.set(basketTotal())">Exact</button>
                    <button type="button" class="cash-opt" *ngFor="let n of cashNotes()" [attr.aria-pressed]="cashGiven() === n" (click)="cashGiven.set(n)">R {{ n }}</button>
                    <label class="cash-other">
                      <span class="sr-only">Other amount</span>
                      <input type="number" min="0" inputmode="decimal" placeholder="Other" [ngModel]="cashGiven()" (ngModelChange)="cashGiven.set($event)" [ngModelOptions]="{standalone:true}" />
                    </label>
                  </div>
                  <div class="change-row" *ngIf="cashGiven() !== null">
                    <span>{{ changeDue() < 0 ? 'Still owed' : 'Give change' }}</span>
                    <strong class="big" [class.neg]="changeDue() < 0">R {{ (changeDue() < 0 ? -changeDue() : changeDue()) | number:'1.0-2' }}</strong>
                  </div>
                </div>

                <p *ngIf="posError()" class="error" role="alert">{{ posError() }}</p>
                <button type="button" class="btn gold big-btn" [disabled]="posCompleting() || (payMethod() === 'cash' && cashGiven() !== null && changeDue() < 0)" (click)="completeSale()">
                  {{ posCompleting() ? 'Saving the sale…' : 'Complete sale · R ' + (basketTotal() | number:'1.0-2') }}
                </button>
              </ng-container>
            </aside>
          </div>

          <!-- Phone: the basket total sits above the nav until they tap Charge -->
          <div class="charge-bar phone-only" *ngIf="posBasket().length > 0 && posView() !== 'charge'">
            <span class="charge-sum"><span class="small">{{ basketCount() }} {{ basketCount() === 1 ? 'item' : 'items' }} · tap to check</span><strong>R {{ basketTotal() | number:'1.0-2' }}</strong></span>
            <button type="button" class="btn gold" (click)="posView.set('charge')">Charge <mat-icon aria-hidden="true">chevron_right</mat-icon></button>
          </div>
        </ng-template>
      </ng-container>

      <!-- ══ ORDERS ══════════════════════════════════════════════ -->
      <ng-container *ngIf="tab() === 'orders'">
        <header class="head dash-head">
          <div class="wrap">
            <p class="eyebrow">Sell</p>
            <h1 class="title">Orders</h1>
          </div>
        </header>
        <div class="wrap stack">
          <app-loading-skeleton [loading]="ordersLoading()" variant="order"></app-loading-skeleton>
          <p *ngIf="!ordersLoading() && incomingOrders().length === 0" class="calm">No orders yet. When a buyer orders from your shop, it shows here.</p>
          <article *ngFor="let order of incomingOrders()" class="card order">
            <div class="order-top">
              <div class="order-who">
                <h2 class="order-name">{{ order.customerName }}</h2>
                <p class="mut small">#{{ order.id.slice(0, 8).toUpperCase() }} · {{ order.createdAt | date:'d MMM, HH:mm' }} · {{ order.fulfillmentType === 'DELIVERY' ? 'Delivery' : 'Collection' }}</p>
              </div>
              <span class="status" [ngClass]="orderStatusClass(order.status)">{{ statusLabel(order.status) }}</span>
            </div>
            <div class="line-row" *ngFor="let item of order.items">
              <span>{{ item.quantity }} × {{ item.productName }}</span><span class="mut">R {{ item.unitPrice * item.quantity | number:'1.0-2' }}</span>
            </div>
            <div class="line-row total-line"><span>Total</span><strong>R {{ order.totalAmount | number:'1.0-2' }}</strong></div>
            <div class="pair" *ngIf="order.status === 'PENDING'">
              <button class="btn gold" (click)="confirmOrder(order.id)" [disabled]="orderActionId() === order.id">
                {{ orderActionId() === order.id ? 'Saving…' : 'Confirm order' }}
              </button>
              <button class="btn line" (click)="cancelOrder(order.id)" [disabled]="orderActionId() === order.id">Cancel</button>
            </div>
            <button class="btn gold" *ngIf="order.fulfillmentType === 'COLLECTION' && order.status === 'CONFIRMED'" (click)="openCollectScanModal()">
              <mat-icon aria-hidden="true">qr_code_scanner</mat-icon>Scan their pickup code
            </button>
            <button class="btn line" *ngIf="order.status === 'CONFIRMED' || order.status === 'DRIVER_ASSIGNED'" (click)="cancelOrder(order.id)" [disabled]="orderActionId() === order.id">Cancel order</button>
            <p *ngIf="orderError() && orderActionId() === order.id" class="error">{{ orderError() }}</p>
          </article>
        </div>
      </ng-container>

      <!-- ══ PRODUCTS ════════════════════════════════════════════ -->
      <ng-container *ngIf="tab() === 'products'">
        <header class="head dash-head">
          <div class="wrap head-row">
            <div class="head-text">
              <h1 class="title">Products</h1>
              <p class="mut">{{ products().length }} of 40 listings</p>
            </div>
            <button class="btn gold" *ngIf="products().length < 40" (click)="showAddModal.set(true)">+ Product</button>
          </div>
        </header>
        <div class="wrap stack">
          <p class="calm" *ngIf="products().length >= 40">You have reached the 40-product limit. Remove a product to add a new one.</p>
          <p *ngIf="addSuccess()" class="ok">Product added.</p>
          <div class="chip-row" role="group" aria-label="Category" *ngIf="posCategories().length > 1">
            <button type="button" class="pill" [attr.aria-pressed]="productFilter() === 'ALL'" (click)="productFilter.set('ALL')">All {{ products().length }}</button>
            <button type="button" class="pill" *ngFor="let c of posCategories()" [attr.aria-pressed]="productFilter() === c" (click)="productFilter.set(c)">
              <span class="cat-dot" [style.background]="catColor(c)" aria-hidden="true"></span>{{ getCategoryLabel(c) }}
            </button>
          </div>
          <app-loading-skeleton [loading]="loadingProducts()" variant="stock"></app-loading-skeleton>
          <p *ngIf="!loadingProducts() && products().length === 0" class="calm">No products yet. Tap + Product to list your first item.</p>

          <article *ngFor="let p of filteredProducts()" class="card product">
            <ng-container *ngIf="editingProductId() !== p.id">
              <span class="thumb" [style.--cat]="catColor(p.category)">
                <img *ngIf="p.mediaUrl" [src]="resolveUrl(p.mediaUrl)" alt="" loading="lazy" />
                <span class="thumb-dot" *ngIf="p.category" [style.background]="catColor(p.category)" aria-hidden="true"></span>
              </span>
              <span class="p-text">
                <strong>{{ p.name }}</strong>
                <span class="mut small">R {{ p.price | number:'1.0-2' }}<ng-container *ngIf="p.category"> · {{ getCategoryLabel(p.category) }}</ng-container></span>
                <span class="mut small" *ngIf="p.barcode">Barcode {{ p.barcode }}</span>
              </span>
              <span class="p-actions">
                <button class="btn line small-btn" (click)="startEdit(p)" [attr.aria-label]="'Edit ' + p.name">Edit</button>
                <button class="icon-btn danger" (click)="deleteProduct(p)" [attr.aria-label]="'Remove ' + p.name"><mat-icon aria-hidden="true">delete_outline</mat-icon></button>
              </span>
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
                    <div class="image-source-row">
                      <button type="button" class="image-source-btn" (click)="editCameraInput.click()">📷 Take photo</button>
                      <button type="button" class="image-source-btn" (click)="editGalleryInput.click()">🖼️ Choose from gallery</button>
                    </div>
                    <input #editCameraInput type="file" accept="image/*" capture="environment" (change)="onEditFileChange($event)" class="file-input-hidden" />
                    <input #editGalleryInput type="file" accept="image/*" (change)="onEditFileChange($event)" class="file-input-hidden" />
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
      </ng-container>

      <!-- ══ MONEY ═══════════════════════════════════════════════ -->
      <ng-container *ngIf="tab() === 'money'">
        <header class="head dash-head">
          <div class="wrap head-row">
            <div class="head-text">
              <h1 class="title">Money</h1>
              <p class="mut">Your financial diary, kept for you.</p>
            </div>
            <div class="seg-tabs money-seg" role="group" aria-label="Period">
              <button type="button" [attr.aria-pressed]="moneyPeriod() === 'today'" (click)="moneyPeriod.set('today')">Today</button>
              <button type="button" [attr.aria-pressed]="moneyPeriod() === 'week'" (click)="moneyPeriod.set('week')">This week</button>
              <button type="button" [attr.aria-pressed]="moneyPeriod() === 'month'" (click)="moneyPeriod.set('month')">This month</button>
            </div>
          </div>
        </header>

        <div class="wrap money-grid">
          <div class="stack">
            <section class="card money-card" aria-labelledby="period-h">
              <h2 id="period-h" class="eyebrow">{{ periodLabel() }}</h2>
              <div class="money-main">
                <div class="today-big">
                  <span class="big" [class.neg]="periodNumbers().profit < 0">R {{ periodNumbers().profit | number:'1.0-2' }}</span>
                  <span class="mut">profit after everything you spent</span>
                </div>
                <div class="bars">
                  <div class="bar-row"><span>Came in</span><strong>R {{ periodNumbers().income | number:'1.0-2' }}</strong></div>
                  <span class="bar"><span class="bar-fill leaf-fill" [style.width.%]="barWidth(periodNumbers().income)"></span></span>
                  <div class="bar-row"><span>Went out</span><strong>R {{ periodNumbers().expenses | number:'1.0-2' }}</strong></div>
                  <span class="bar"><span class="bar-fill gold-fill" [style.width.%]="barWidth(periodNumbers().expenses)"></span></span>
                </div>
              </div>
            </section>

            <div class="pair phone-only">
              <button type="button" class="btn leaf" (click)="openMoneyWizard('INCOME')">+ Money in</button>
              <button type="button" class="btn gold" (click)="openMoneyWizard('EXPENSE')">− Money out</button>
            </div>
            <p class="mut small phone-only">Sales and thenga.com orders are recorded on their own. Log only cash that didn't go through Make a sale.</p>

            <section class="card" aria-labelledby="diary-h">
              <div class="card-row">
                <h2 id="diary-h" class="section-title">Diary</h2>
                <span class="mut small wide-only">Sales and orders are added on their own</span>
              </div>
              <p *ngIf="incomeHistory().length === 0" class="mut">No entries yet.</p>
              <div class="line-row diary" *ngFor="let e of incomeHistory().slice(0, 6)">
                <span class="line-text">
                  <strong>{{ e.notes || moneyCategoryLabel(e) }}</strong>
                  <span class="mut small">{{ e.date | date:'EEE d MMM' }} · {{ moneyCategoryLabel(e) }}</span>
                </span>
                <strong [class.leaf]="e.entryType !== 'EXPENSE'">{{ e.entryType === 'EXPENSE' ? '−' : '+' }}R {{ e.amount | number:'1.0-2' }}</strong>
              </div>
              <button type="button" class="link" (click)="moneyMoreOpen.set(!moneyMoreOpen())">
                {{ moneyMoreOpen() ? 'Hide the full diary' : 'See the full diary, chart and CSV' }}
              </button>
            </section>

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
                  <span class="lc-dot" style="background:#3F9A4F"></span> Income
                </label>
                <label [class.lc-disabled]="!canToggle('expense')">
                  <input type="checkbox" [checked]="showExpense()" (change)="toggleLine('expense')" [disabled]="!canToggle('expense')" />
                  <span class="lc-dot" style="background:#C8443A"></span> Expenses
                </label>
                <label [class.lc-disabled]="!canToggle('profit')">
                  <input type="checkbox" [checked]="showProfit()" (change)="toggleLine('profit')" [disabled]="!canToggle('profit')" />
                  <span class="lc-dot" style="background:#2F6DB5"></span> Profit
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
          </div>

          <div class="stack">
            <section class="card wide-only quick">
              <button type="button" class="btn leaf" (click)="openMoneyWizard('INCOME')">+ Money in</button>
              <button type="button" class="btn gold" (click)="openMoneyWizard('EXPENSE')">− Money out</button>
              <p class="mut small">Only for cash that didn't go through Make a sale.</p>
            </section>

            <section class="card ink record" aria-labelledby="rec2-h">
              <h2 id="rec2-h" class="eyebrow gold-text">Your business record</h2>
              <p class="record-title">Your records, kept month by month.</p>
              <p class="record-text">Banks and funders ask for this.</p>
              <label class="field">
                <span>Month</span>
                <input type="month" [(ngModel)]="reportMonth" [ngModelOptions]="{standalone:true}" />
              </label>
              <div class="pair">
                <button type="button" class="btn gold" (click)="downloadMyMonthlyReport()" [disabled]="reportDownloading()">
                  {{ reportDownloading() ? 'Making it…' : 'Download PDF' }}
                </button>
                <button type="button" class="btn line-light" (click)="exportCsv('monthly')">CSV</button>
              </div>
            </section>
          </div>
        </div>
      </ng-container>


      <!-- ── BARCODE SCAN MODAL (product add/edit capture + POS scanning) ── -->
      <div class="modal-overlay scanner-overlay" *ngIf="barcodeModalMode()" (click)="onBarcodeOverlayClick($event)">
        <div class="modal-sheet barcode-modal-sheet">
          <div class="modal-head">
            <h2>{{ barcodeModalMode() === 'pos' ? 'Scan items' : barcodeModalMode() === 'collect' ? 'Scan pickup code' : 'Scan barcode' }}</h2>
            <button class="modal-close" (click)="barcodeModalMode.set(null)" aria-label="Close scanner">✕</button>
          </div>
          <app-barcode-scanner [active]="!posConfirming() && !collectScanBusy()" (scanned)="onBarcodeCaptured($event)"></app-barcode-scanner>
          <ng-container *ngIf="barcodeModalMode() === 'pos'">
            <p *ngIf="posLastAdded()" class="success" style="margin-top:0.5rem">✓ Added {{ posLastAdded() }}</p>
            <p *ngIf="posScanError()" class="error" style="margin-top:0.5rem">{{ posScanError() }}</p>
            <div class="unknown-barcode-banner" *ngIf="posUnknownBarcode() as code">
              <span>No product found for code <strong>{{ code }}</strong></span>
              <button type="button" (click)="createProductFromBarcode()">+ Create product</button>
            </div>
            <div class="pos-confirm-banner" *ngIf="posPendingProduct() as product">
              <div class="pos-confirm-info">
                <span class="pos-confirm-name">{{ product.name }}</span>
                <span class="pos-confirm-price">R {{ product.price | number:'1.2-2' }}</span>
              </div>
              <div class="pos-confirm-actions">
                <button type="button" class="pos-confirm-cancel" (click)="cancelPendingScan()">Cancel</button>
                <button type="button" class="pos-confirm-add" (click)="confirmPendingScan()">+ Add</button>
              </div>
            </div>
          </ng-container>
          <ng-container *ngIf="barcodeModalMode() === 'collect'">
            <p class="scan-hint-text">Ask the customer to show their pickup QR code</p>
            <p *ngIf="collectSuccess()" class="success" style="margin-top:0.5rem">✓ Order marked as collected</p>
            <p *ngIf="collectScanError()" class="error" style="margin-top:0.5rem">{{ collectScanError() }}</p>
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
              <div class="image-source-row">
                <button type="button" class="image-source-btn" (click)="addCameraInput.click()">📷 Take photo</button>
                <button type="button" class="image-source-btn" (click)="addGalleryInput.click()">🖼️ Choose from gallery</button>
              </div>
              <input #addCameraInput type="file" accept="image/*" capture="environment" (change)="onFileChange($event)" class="file-input-hidden" />
              <input #addGalleryInput type="file" accept="image/*" (change)="onFileChange($event)" class="file-input-hidden" />
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

    /* ── Cards ── */
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 4px 24px rgba(19, 37, 30,0.08); border: 1px solid #E3DACA; }
    @media (max-width: 600px) { .card { padding: 1.25rem; border-radius: 1rem; } }
    

    /* ── Log Form ── */
    .log-tabs { display: flex; border-bottom: 2px solid #E3DACA; margin-bottom: 1.25rem; }
    .log-tabs button { flex: 1; padding: 0.65rem; border: none; background: none; font-size: 0.95rem; font-weight: 700; color: #646A63; cursor: pointer; transition: color 0.2s, border-color 0.2s, background-color 0.2s; min-height: 44px; font-family: inherit; border-bottom: 2px solid transparent; margin-bottom: -2px; }
    .logtab-active-income  { color: #2E6B4A !important; border-bottom: 2px solid #3F9A4F !important; background: rgba(45,179,68,0.06) !important; }
    .logtab-active-expense { color: #991b1b !important; border-bottom: 2px solid #C8443A !important; background: rgba(229,57,53,0.05) !important; }
    .income-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.25rem; }
    @media (max-width: 600px) { .income-grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 0.375rem; font-size: 0.875rem; font-weight: 700; color: #13251E; }
    label.span-2 { grid-column: span 2; }
    @media (max-width: 600px) { label.span-2 { grid-column: span 1; } }
    input, textarea, select { border-radius: 0.75rem; border: 2px solid #E3DACA; padding: 0.65rem 0.9rem; font-size: 1rem; font-family: inherit; font-weight: 600; width: 100%; box-sizing: border-box; background: white; color: #13251E; outline: none; transition: border-color 0.15s, box-shadow 0.15s; min-height: 48px; }
    input:focus, textarea:focus, select:focus { border-color: #E5A31D; box-shadow: 0 0 0 3px rgba(229, 163, 29,0.2); }
    select { appearance: none; -webkit-appearance: none; background: #FBF8F2 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 0.75rem center / 16px; padding-right: 2.5rem; cursor: pointer; }
    select:focus { background-color: white; }
    
    .file-input-hidden { display: none; }
    .image-source-row { display: flex; gap: 0.5rem; }
    .image-source-btn { flex: 1; border: 2px solid #E3DACA; border-radius: 0.75rem; background: white; color: #13251E; font-weight: 700; font-size: 0.85rem; padding: 0.6rem 0.5rem; cursor: pointer; font-family: inherit; min-height: 48px; }
    .preview-wrap { margin-top: 0.5rem; }
    .preview { width: 100%; max-height: 140px; object-fit: cover; border-radius: 0.75rem; }
    .primary { border: none; border-radius: 999px; padding: 0.9rem; font-size: 1rem; font-weight: 800; background: #E5A31D; color: #13251E; cursor: pointer; font-family: inherit; box-shadow: 0 4px 12px rgba(229, 163, 29,0.35); transition: box-shadow 0.15s; }
    .primary:hover { box-shadow: 0 6px 20px rgba(229, 163, 29,0.5); }
    .primary.span-2 { grid-column: span 2; }
    @media (max-width: 600px) { .primary.span-2 { grid-column: span 1; } }
    .primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .success { color: var(--success-text); font-weight: 700; margin-top: 0.75rem; }
    .scan-hint-text { text-align: center; font-size: 0.85rem; color: #4A524C; margin: 0.5rem 0 0; }
    .error   { color: #C8443A; font-weight: 700; margin-top: 0.75rem; }
    .checkbox-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.95rem; color: #13251E; cursor: pointer; flex-direction: row; }
    .checkbox-row input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--success-fill); flex-shrink: 0; min-height: unset !important; }
    .service-section { background: rgba(45,179,68,0.05); border: 1px solid rgba(45,179,68,0.2); border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .service-heading { margin: 0; font-weight: 800; font-size: 0.9rem; color: var(--success-text); }
    .service-section label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; font-weight: 700; color: #13251E; }
    .service-section input { border-radius: 0.6rem; border: 2px solid #E3DACA; padding: 0.55rem 0.8rem; font-size: 0.95rem; font-family: inherit; width: 100%; box-sizing: border-box; background: white; outline: none; min-height: 44px; }
    .service-section input:focus { border-color: #E5A31D; }
    .invoice-btn { border: 2px solid #3F9A4F; color: var(--success-text); font-weight: 800; padding: 0.65rem 1rem; border-radius: 999px; background: white; cursor: pointer; font-size: 0.9rem; font-family: inherit; transition: background 0.15s; }
    .invoice-btn:hover:not(:disabled) { background: rgba(45,179,68,0.08); }
    .invoice-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    /* ── History ── */
    .history-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
    .history-controls { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .outline-btn { border: 1.5px solid #E3DACA; background: white; border-radius: 999px; padding: 0.4rem 0.9rem; font-size: 0.85rem; cursor: pointer; color: #4A524C; font-weight: 700; min-height: 36px; font-family: inherit; transition: border-color 0.15s, color 0.15s; }
    .outline-btn:hover { border-color: #E5A31D; color: #13251E; }
    .history-list { display: flex; flex-direction: column; gap: 0; margin-top: 0.75rem; border: 1px solid #E3DACA; border-radius: 0.75rem; overflow: hidden; }
    .history-item { cursor: pointer; border-bottom: 1px solid #E3DACA; transition: background 0.1s; }
    .history-item:last-child { border-bottom: none; }
    .history-item:hover { background: #FBF8F2; }
    .history-item.expense-item:hover { background: rgba(229,57,53,0.02); }
    .history-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 1rem; }
    .history-date { font-size: 0.82rem; font-weight: 700; color: #4A524C; min-width: 80px; flex-shrink: 0; }
    .history-amount { font-size: 0.95rem; font-weight: 800; color: var(--success-text); margin-left: auto; }
    .history-amount.expense-amt { color: #C8443A; }
    .history-chevron { font-size: 1.1rem; color: #646A63; transition: transform 0.2s ease-out; flex-shrink: 0; margin-left: 0.25rem; display: inline-block; }
    .history-chevron-open { transform: rotate(90deg); }
    .history-detail { padding: 0 1rem 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .detail-chip { display: inline-block; background: rgba(229, 163, 29,0.12); color: #8A5A0B; font-size: 0.72rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 999px; text-transform: uppercase; align-self: flex-start; }
    .detail-notes { font-size: 0.84rem; color: #4A524C; margin: 0; }
    .badge { display: inline-block; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; flex-shrink: 0; }
    .income-badge  { background: rgba(45,179,68,0.12); color: var(--success-text); }
    .expense-badge { background: rgba(229,57,53,0.1);  color: #C8443A; }
    .expense-amt { color: #C8443A; font-weight: 700; }
    .period-summary { display: flex; align-items: center; margin-top: 1rem; background: #FBF8F2; border: 1px solid #E3DACA; border-radius: 0.75rem; overflow: hidden; }
    .ps-item { flex: 1; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
    .ps-label   { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em; color: #646A63; font-weight: 800; }
    .ps-income  { font-size: 1rem; font-weight: 800; color: var(--success-text); }
    .ps-expense { font-size: 1rem; font-weight: 800; color: #C8443A; }
    .ps-divider { width: 1px; background: #E3DACA; align-self: stretch; }

    /* ── Line Chart ── */
    .lc-toggles { display: flex; gap: 1.25rem; flex-wrap: wrap; margin: 1.25rem 0 0.4rem; }
    .lc-toggles label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #13251E; cursor: pointer; user-select: none; flex-direction: row; font-weight: 700; }
    .lc-toggles label.lc-disabled { opacity: 0.4; cursor: not-allowed; }
    .lc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .line-chart { width: 100%; height: auto; display: block; }
    .lc-grid   { stroke: #E3DACA; stroke-width: 1; }
    .lc-zero   { stroke: #E3DACA; stroke-width: 1; stroke-dasharray: 4 3; }
    .lc-line   { fill: none; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
    .lc-income  { stroke: #3F9A4F; }
    .lc-expense { stroke: #C8443A; }
    .lc-profit  { stroke: #2F6DB5; }
    .lc-label  { font-size: 10px; fill: #646A63; text-anchor: middle; font-family: inherit; }

    /* ── Products Tab ── */
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    .edit-form { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .edit-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .small-btn { padding: 0.5rem 1rem !important; font-size: 0.9rem; width: auto !important; }
    small { color: #646A63; font-size: 0.8rem; font-weight: 600; }

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
    .modal-close { background: #EFE8DA; border: none; border-radius: 50%; width: 36px; height: 36px; min-height: unset; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #4A524C; flex-shrink: 0; font-family: inherit; transition: background 0.15s; }
    .modal-close:hover { background: #E3DACA; color: #13251E; }
    .product-form { display: flex; flex-direction: column; gap: 1rem; }

    /* ── Orders ── */
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    .order-status-pending   { background: #EFE8DA; color: #4A524C; }
    .order-status-confirmed { background: rgba(27,111,212,0.1); color: #2F6DB5; }
    .order-status-cancelled { background: rgba(229,57,53,0.1); color: #C8443A; }
    .order-status-delivered { background: rgba(45,179,68,0.12); color: var(--success-text); }
    .order-status-collected { background: rgba(45,179,68,0.12); color: var(--success-text); }

    /* ── Sell tab ── */
    
    
    
    
    .unknown-barcode-banner { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; background: rgba(229, 163, 29,0.1); border: 1px solid rgba(229, 163, 29,0.35); border-radius: 0.75rem; padding: 0.7rem 0.9rem; font-size: 0.85rem; color: #13251E; }
    .unknown-barcode-banner button { border: none; border-radius: 999px; background: #E5A31D; color: #13251E; font-weight: 800; font-size: 0.8rem; padding: 0.45rem 0.9rem; cursor: pointer; font-family: inherit; min-height: 36px; }
    .pos-confirm-banner { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.5rem; background: #F0FDF4; border: 2px solid #16A34A; border-radius: 0.9rem; padding: 0.9rem 1rem; }
    .pos-confirm-info { display: flex; flex-direction: column; gap: 0.15rem; text-align: center; }
    .pos-confirm-name { font-size: 1.05rem; font-weight: 800; color: #13251E; }
    .pos-confirm-price { font-size: 0.9rem; font-weight: 700; color: #16A34A; }
    .pos-confirm-actions { display: flex; gap: 0.6rem; }
    .pos-confirm-cancel, .pos-confirm-add { flex: 1; border: none; border-radius: 0.75rem; padding: 0.8rem; font-weight: 800; font-size: 0.95rem; cursor: pointer; font-family: inherit; min-height: 48px; }
    .pos-confirm-cancel { background: #F1EADC; color: #3F4741; }
    .pos-confirm-add { background: #16A34A; color: white; }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    .barcode-row { display: flex; gap: 0.5rem; }
    .barcode-row input { flex: 1; }
    .scan-btn { flex-shrink: 0; border: 2px solid #E3DACA; background: white; border-radius: 0.75rem; padding: 0 0.9rem; font-size: 0.85rem; font-weight: 700; color: #13251E; cursor: pointer; font-family: inherit; min-height: 48px; }
    .scan-btn:hover { border-color: #E5A31D; }
    .barcode-modal-sheet { max-width: 420px; }

    /* ── POS success confirmation ── */
    
    .scanner-overlay { z-index: 250; }

    /* ── Money tab: summary card + wizard entry ── */
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    .csv-export-row { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #E3DACA; }

    /* ── Money wizard modal ── */
    .wizard-sheet { max-width: 380px; display: flex; flex-direction: column; gap: 0.9rem; }
    .wizard-step-label { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; color: #646A63; text-transform: uppercase; margin: 0; }
    .wizard-amount-input {
      font-size: 2rem; font-weight: 800; text-align: center; border: 2px solid #E3DACA; border-radius: 1rem;
      padding: 0.9rem; width: 100%; box-sizing: border-box; font-family: inherit; color: #13251E;
    }
    .wizard-amount-input:focus { border-color: #E5A31D; outline: none; }
    .wizard-next-btn { width: 100%; }
    .wizard-category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
    .wizard-cat-tile {
      display: flex; flex-direction: column; align-items: center; gap: 0.35rem; border: 1.5px solid #E3DACA;
      border-radius: 0.9rem; padding: 0.9rem 0.4rem; background: #FBF8F2; cursor: pointer; font-family: inherit;
      font-size: 0.78rem; font-weight: 700; color: #13251E; min-height: 76px;
    }
    .wizard-cat-tile:hover:not(:disabled) { border-color: #E5A31D; background: rgba(229, 163, 29,0.06); }
    .wizard-cat-tile:disabled { opacity: 0.5; cursor: not-allowed; }
    .wizard-cat-icon { font-size: 1.4rem; }
    .wizard-note-toggle { align-self: flex-start; background: none; border: none; color: #2F6DB5; font-weight: 700; font-size: 0.82rem; cursor: pointer; font-family: inherit; padding: 0.2rem; }
    .wizard-note-input { border-radius: 0.7rem; border: 2px solid #E3DACA; padding: 0.6rem 0.8rem; font-size: 0.9rem; font-family: inherit; width: 100%; box-sizing: border-box; }

    /* ═══ Sell section, after the My Store canvas ═══ */
    :host { display: block; }
    .sell { padding-bottom: 2rem; }
    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 0 16px; box-sizing: border-box; }
    @media (min-width: 768px) { .wrap { padding: 0 32px; } }

    .sell .wide-only { display: none; }
    .sell .phone-hide { display: none; }
    @media (min-width: 768px) {
      .sell .phone-only { display: none; }
      .sell .wide-only { display: flex; }
      .sell span.wide-only { display: inline; }
      .sell .phone-hide { display: block; }
      .sell .basket.phone-hide, .sell .basket { display: flex; }
    }

    .head { padding: 20px 0 18px; }
    @media (min-width: 768px) { .head { padding: 32px 0 24px; background: transparent; border-bottom: 0; } }
    .head-row { display: flex; flex-direction: column; gap: 14px; }
    @media (min-width: 768px) { .head-row { flex-direction: row; align-items: flex-end; justify-content: space-between; gap: 24px; } }
    .head-text { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .head-actions { gap: 10px; flex-wrap: wrap; }
    .eyebrow { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--success-text); }
    .gold-text { color: var(--gold); }
    .hello { margin: 0; font-family: var(--font-display); font-size: 2.125rem; font-weight: 800; line-height: 1.05; letter-spacing: -0.015em; color: var(--nav-fg); }
    @media (min-width: 768px) { .hello { font-size: 2.75rem; } }
    .title { margin: 0; font-family: var(--font-display); font-size: 1.875rem; font-weight: 800; line-height: 1.05; letter-spacing: -0.015em; color: var(--nav-fg); }
    @media (min-width: 768px) { .title { font-size: 2.5rem; } }
    .section-title { margin: 0; font-family: var(--font-display); font-size: 1.375rem; font-weight: 600; color: var(--text-primary); }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--nav-border); border-radius: 999px; font-size: 0.8125rem; font-weight: 500; color: var(--nav-fg); background: var(--bg-page); }
    .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success-fill); }

    .mut { color: var(--text-secondary); }
    .small { font-size: 0.8125rem; }
    .leaf { color: var(--success-text); }
    .neg { color: #8E2A20; }
    :host-context([data-theme="dark"]) .neg { color: #F2A49B; }
    .center { text-align: center; margin: 0; }
    .calm { margin: 0; color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.45; }
    .ok { margin: 0; color: var(--success-text); font-weight: 700; }
    .link { align-self: flex-start; min-height: 40px; padding: 0; background: none; border: 0; color: var(--success-text); font-size: 0.875rem; font-weight: 700; }
    .link:active { transform: none; }

    .card { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 20px; padding: 18px; display: flex; flex-direction: column; gap: 14px; box-shadow: none; }
    @media (min-width: 768px) { .card { padding: 22px; } }
    .card.ink { background: var(--ink); color: var(--cream); border-color: var(--ink); }
    :host-context([data-theme="dark"]) .card.ink { background: #1C3329; border-color: #2C4237; }
    .card-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .stack { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }
    .stack .stack { margin-top: 0; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 0 20px; border-radius: 14px; border: 0; font-size: 1rem; font-weight: 700; text-decoration: none; box-shadow: none; }
    .btn mat-icon { width: 22px; height: 22px; font-size: 22px; }
    .btn.gold { background: var(--gold); color: var(--ink); }
    .btn.line { background: transparent; color: var(--text-primary); border: 1.5px solid var(--text-primary); }
    .btn.leaf { background: var(--success-fill); color: #FFFFFF; }
    .btn.line-light { background: transparent; color: var(--cream); border: 1.5px solid var(--cream); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn:focus-visible, .pill:focus-visible, .tile:focus-visible, .need:focus-visible, .icon-btn:focus-visible { outline: 3px solid var(--border-focus); outline-offset: 2px; }
    .big-btn { width: 100%; min-height: 60px; font-size: 1.125rem; border-radius: 16px; }
    .small-btn { min-height: 48px; padding: 0 16px; font-size: 0.9375rem; }
    .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .icon-btn { width: 48px; height: 48px; min-height: 48px; padding: 0; border-radius: 12px; border: 1px solid var(--nav-border); background: transparent; color: var(--nav-fg); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .icon-btn.danger { border: 0; color: #8E2A20; }

    .field { display: flex; flex-direction: column; gap: 6px; font-size: 0.875rem; font-weight: 700; }
    .field input { height: 52px; min-height: 52px; border-radius: 14px; }
    .ink .field input { background: #1C3329; border-color: #2C4237; color: var(--cream); color-scheme: dark; }

    /* ── Today ── */
    .today-grid { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
    @media (min-width: 960px) {
      .today-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; align-items: start; margin-top: 0; }
      .today-card { grid-column: span 2; }
      .needs { grid-row: span 2; background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 20px; padding: 22px; }
    }
    .today-main { display: flex; flex-direction: column; gap: 14px; }
    @media (min-width: 768px) { .today-main { flex-direction: row; align-items: flex-end; gap: 40px; } }
    .today-big { display: flex; flex-direction: column; gap: 4px; }
    .big { font-family: var(--font-display); font-size: 3rem; font-weight: 800; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
    @media (min-width: 768px) { .today-card .big, .money-card .big { font-size: 4rem; } }
    .trio { flex: 1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; border-top: 1px solid var(--border-base); padding-top: 14px; }
    @media (min-width: 768px) { .trio { border-top: 0; padding: 0 0 6px; } }
    .trio div { display: flex; flex-direction: column; gap: 2px; }
    .trio strong { font-size: 1.0625rem; font-variant-numeric: tabular-nums; }
    .today-actions { display: flex; flex-direction: column; gap: 10px; }
    .needs { display: flex; flex-direction: column; gap: 10px; }
    .need { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 64px; padding: 14px 16px; border-radius: 16px; border: 1px solid var(--border-base); background: var(--bg-surface); color: var(--text-primary); text-align: left; font-weight: 400; }
    .need:active { transform: none; }
    @media (min-width: 960px) { .need { border-width: 1px 0 0; border-radius: 0; padding: 14px 0; background: transparent; } }
    .need-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .need-text strong { font-size: 1rem; }
    .need-text .mut { font-size: 0.875rem; }
    .num { width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--ink); color: var(--gold); font-weight: 800; font-size: 1.125rem; }
    .num.soft { background: #F1E3C2; color: var(--ink); }
    .record { gap: 12px; }
    .record .pair { grid-template-columns: minmax(0, 1fr) auto; }
    .record .btn { white-space: nowrap; }
    .record-title { margin: 0; font-family: var(--font-display); font-size: 1.375rem; font-weight: 600; line-height: 1.2; }
    .record-text { margin: 0; font-size: 0.9375rem; line-height: 1.45; color: #C9D3CC; }

    /* ── Make a sale ── */
    .pos-head .wrap { display: flex; flex-direction: column; gap: 14px; }
    .pos-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .search { display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 14px; border: 1.5px solid var(--border-base); border-radius: 14px; background: var(--bg-page); font-weight: 400; flex-direction: row; }
    .search mat-icon { color: var(--text-secondary); }
    .search input { flex: 1; min-width: 0; height: auto; min-height: 0; padding: 0; border: 0; border-radius: 0; background: transparent; font-size: 1rem; font-weight: 500; box-shadow: none; }
    @media (min-width: 768px) { .pos-head .wrap { flex-direction: row; align-items: center; } .pos-head .search { flex: 1; max-width: 420px; margin-left: auto; } .pos-title-row { gap: 16px; } }
    .pos-body { padding-top: 16px; padding-bottom: 96px; }
    @media (min-width: 768px) { .pos-body { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; align-items: start; padding-bottom: 0; } }
    .pos-main { display: flex; flex-direction: column; gap: 14px; }
    .sell .pos-main.phone-hide { display: none; }
    @media (min-width: 768px) { .sell .pos-main, .sell .pos-main.phone-hide { display: flex; } }
    .chip-row { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 4px; scrollbar-width: none; }
    .pill { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--border-base); background: var(--bg-surface); color: var(--text-primary); font-size: 0.9375rem; font-weight: 500; white-space: nowrap; flex-shrink: 0; }
    .pill[aria-pressed="true"] { background: var(--text-primary); color: var(--bg-surface); border-color: var(--text-primary); font-weight: 700; }
    .pill:active { transform: none; }
    .tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    @media (min-width: 1100px) { .tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    @media (min-width: 768px) and (max-width: 1099.98px) { .tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    .tile { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-height: 120px; padding: 14px 16px; border-radius: 16px; border: 1.5px solid var(--border-base); background: var(--bg-surface); color: var(--text-primary); text-align: left; font-weight: 400; }
    .tile.in { border: 2px solid var(--text-primary); }
    .tile-badge { position: absolute; top: -8px; right: -6px; padding: 4px 10px; border-radius: 999px; background: var(--gold); color: var(--ink); font-size: 0.8125rem; font-weight: 700; }
    .tile-cat { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--text-secondary); }
    .tile-name { font-size: 1.0625rem; line-height: 1.25; }
    .tile-price { font-size: 1rem; }
    .add-tile { align-items: center; justify-content: center; flex-direction: row; border-style: dashed; color: var(--success-text); font-weight: 700; }
    .history-link { margin-top: 4px; }

    .basket { flex-direction: column; gap: 14px; }
    .sell .basket { display: flex; }
    .sell .basket.phone-hide { display: none; }
    @media (min-width: 768px) { .sell .basket, .sell .basket.phone-hide { display: flex; position: sticky; top: 16px; background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 20px; padding: 20px; } .basket .card { border: 0; padding: 0; background: transparent; } }
    .basket-head { display: flex; align-items: center; gap: 4px; }
    .basket-head .icon-btn { border: 0; margin-left: -10px; color: var(--text-primary); }
    .basket-title { margin: 0; font-family: var(--font-display); font-size: 1.75rem; font-weight: 800; color: var(--text-primary); }
    @media (min-width: 768px) { .basket-title { font-size: 1.375rem; } }
    .basket-lines { gap: 0; padding-top: 6px; padding-bottom: 6px; }
    .b-line { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-base); }
    .b-line:last-child { border-bottom: 0; }
    .b-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .b-total { min-width: 56px; text-align: right; font-variant-numeric: tabular-nums; }
    .stepper { display: inline-flex; align-items: center; gap: 6px; }
    .step { width: 48px; height: 48px; min-height: 48px; padding: 0; border-radius: 12px; border: 1px solid var(--border-base); background: var(--bg-surface); color: var(--text-primary); font-size: 1.25rem; font-weight: 700; }
    .qty { min-width: 22px; text-align: center; font-weight: 700; }
    .total-row { display: flex; align-items: baseline; justify-content: space-between; font-size: 1.0625rem; }
    .total-row .big { font-size: 3rem; }
    .pay-seg { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .pay-seg button { min-height: 56px; border-radius: 14px; border: 1.5px solid var(--border-base); background: var(--bg-surface); color: var(--text-primary); font-size: 1rem; font-weight: 500; }
    .pay-seg button[aria-pressed="true"] { background: var(--text-primary); color: var(--bg-surface); border-color: var(--text-primary); font-weight: 700; }
    .cash { gap: 12px; }
    .cash-label { font-size: 0.9375rem; font-weight: 700; }
    .cash-options { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .cash-opt { min-height: 52px; padding: 0 4px; border-radius: 12px; border: 1.5px solid var(--border-base); background: var(--bg-surface); color: var(--text-primary); font-size: 0.9375rem; font-weight: 700; }
    .cash-opt[aria-pressed="true"] { background: #F1E3C2; border: 2px solid var(--ink); color: var(--ink); }
    .cash-other { display: block; font-weight: 400; }
    .cash-other input { height: 52px; min-height: 52px; padding: 0 6px; border-radius: 12px; text-align: center; font-weight: 700; }
    .change-row { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-base); padding-top: 12px; font-size: 1.0625rem; }
    .change-row .big { font-size: 2.25rem; color: var(--success-text); }
    .change-row .big.neg { color: #8E2A20; }
    .error { margin: 0; color: #8E2A20; font-weight: 700; }
    .charge-bar { position: fixed; left: 0; right: 0; bottom: var(--bottom-nav-total); z-index: 40; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: var(--ink); color: var(--cream); }
    .charge-sum { display: flex; flex-direction: column; gap: 2px; }
    .charge-sum .small { color: #C9D3CC; }
    .charge-sum strong { font-family: var(--font-display); font-size: 1.75rem; font-weight: 800; line-height: 1; }
    .charge-bar .btn { min-height: 56px; padding: 0 22px; font-size: 1.125rem; }

    .receipt { display: flex; flex-direction: column; gap: 14px; padding-top: 16px; max-width: 640px; }
    .receipt-card { align-items: center; text-align: center; gap: 6px; padding: 32px 20px; }
    .tick { width: 64px; height: 64px; border-radius: 50%; background: var(--gold); color: var(--ink); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
    .tick mat-icon { width: 34px; height: 34px; font-size: 34px; }
    .receipt-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 800; color: var(--cream); }
    .receipt-total { margin: 0; font-family: var(--font-display); font-size: 3.5rem; font-weight: 800; line-height: 1; color: var(--gold); }
    .receipt-meta { margin: 6px 0 0; color: #C9D3CC; font-size: 0.9375rem; }
    .receipt-actions { display: flex; flex-direction: column; gap: 10px; }
    .line-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--border-base); font-size: 0.9375rem; }
    .card > .line-row:first-of-type { border-top: 0; }
    .line-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .total-line { font-size: 1rem; }

    /* ── Orders ── */
    .order { gap: 10px; }
    .order-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .order-who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .order-name { margin: 0; font-size: 1.0625rem; font-weight: 700; }
    .order-who p { margin: 0; }
    .status { padding: 5px 10px; border-radius: 999px; font-size: 0.8125rem; font-weight: 700; white-space: nowrap; background: var(--bg-muted); color: var(--text-primary); }

    /* ── Products ── */
    .product { flex-direction: row; align-items: center; gap: 14px; padding: 14px; }
    .product:has(.edit-form) { flex-direction: column; align-items: stretch; }
    .thumb { position: relative; width: 56px; height: 56px; flex-shrink: 0; border-radius: 14px; overflow: hidden; background: color-mix(in srgb, var(--cat, var(--bg-muted)) 16%, var(--bg-surface)); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .thumb-dot { position: absolute; left: 6px; bottom: 6px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--bg-surface); }
    .p-text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .p-text strong { font-size: 1.0625rem; }
    .p-actions { display: flex; align-items: center; gap: 4px; }

    /* ── Money ── */
    .money-seg { width: 100%; }
    @media (min-width: 768px) { .money-seg { width: 420px; } }
    .money-grid { display: flex; flex-direction: column; gap: 16px; }
    @media (min-width: 960px) { .money-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 24px; align-items: start; } .money-grid > .stack { margin-top: 0; } }
    .money-main { display: flex; flex-direction: column; gap: 18px; }
    @media (min-width: 768px) { .money-main { flex-direction: row; align-items: center; gap: 36px; } }
    .bars { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .bar-row { display: flex; justify-content: space-between; font-size: 0.9375rem; }
    .bar { display: block; height: 10px; border-radius: 999px; background: var(--bg-muted); overflow: hidden; margin-bottom: 8px; }
    .bar-fill { display: block; height: 100%; border-radius: 999px; }
    .leaf-fill { background: var(--success-fill); }
    .gold-fill { background: var(--gold); }
    .diary { padding: 12px 0; }
    .quick { gap: 10px; }
  `
})
export class HustlerDashboardPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly unifiedAuth = inject(UnifiedAuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
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
          this.loadOrders();
        });
      }
    });

    // The section nav links to tabs by address, e.g. /dashboard?tab=money
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const wanted = params.get('tab');
      const tab = wanted === 'income' ? 'money' : wanted;
      this.tab.set(TABS.includes(tab as SellTab) ? tab as SellTab : 'today');
      if (this.tab() === 'orders' && this.auth.isLoggedIn()) this.loadOrders();
    });
  }

  go(tab: SellTab): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' });
  }

  readonly todayLabel = computed(() => new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }));
  readonly pendingOrders = computed(() => this.incomingOrders().filter(o => o.status === 'PENDING'));
  readonly collectOrders = computed(() => this.incomingOrders().filter(o => o.fulfillmentType === 'COLLECTION' && o.status === 'CONFIRMED'));

  // Categories this shop sells, in the marketplace order
  readonly posCategories = computed(() => {
    const present = new Set(this.products().map(p => p.category).filter(Boolean));
    return CATEGORIES.map(c => c.value as string).filter(v => present.has(v));
  });
  posCategory = signal<string>('ALL');
  readonly posTiles = computed(() => {
    const q = this.posSearchQuery().trim().toLowerCase();
    const cat = this.posCategory();
    return this.products().filter(p => (cat === 'ALL' || p.category === cat) && (!q || p.name.toLowerCase().includes(q)));
  });
  productFilter = signal<string>('ALL');
  readonly filteredProducts = computed(() => this.productFilter() === 'ALL' ? this.products() : this.products().filter(p => p.category === this.productFilter()));
  readonly catColor = categoryColor;

  basketQty(productId: string): number {
    return this.posBasket().find(i => i.productId === productId)?.quantity ?? 0;
  }
  readonly basketCount = computed(() => this.posBasket().reduce((n, i) => n + i.quantity, 0));

  // Cash helper: works out change; not stored with the sale
  payMethod = signal<'cash' | 'card'>('cash');
  cashGiven = signal<number | null>(null);
  readonly changeDue = computed(() => (Number(this.cashGiven()) || 0) - this.basketTotal());
  readonly cashNotes = computed(() => [10, 20, 50, 100, 200, 500].filter(n => n > this.basketTotal()).slice(0, 2));

  newSale(): void {
    this.posSuccess.set(null);
    this.posView.set('sell');
  }

  toggleSalesHistory(): void {
    if (this.posView() === 'history') { this.posView.set('sell'); return; }
    this.posView.set('history');
    this.loadSalesHistory();
  }

  receiptWhatsapp(res: { total: number; items: { itemName: string; unitPrice: number; quantity: number }[] }): string {
    const lines = res.items.map(i => `${i.quantity} × ${i.itemName}  R${(i.unitPrice * i.quantity).toFixed(2)}`);
    const text = [`Receipt from ${this.auth.state()?.businessName ?? 'thenga.com'}`, ...lines, `Total R${res.total.toFixed(2)}`, 'Thank you!'].join('\n');
    return 'https://wa.me/?text=' + encodeURIComponent(text);
  }

  statusLabel(status: string): string {
    return ({ PENDING: 'New', CONFIRMED: 'Confirmed', DRIVER_ASSIGNED: 'Driver assigned', EN_ROUTE: 'On the way', DELIVERED: 'Delivered', COLLECTED: 'Collected', CANCELLED: 'Cancelled' } as Record<string, string>)[status] ?? status;
  }

  // Money: Today / This week / This month
  moneyPeriod = signal<'today' | 'week' | 'month'>('month');
  readonly periodNumbers = computed(() => {
    const s = this.summary();
    const p = this.moneyPeriod();
    return {
      income: Number((p === 'today' ? s?.todayIncome : p === 'week' ? s?.weekIncome : s?.monthIncome) ?? 0),
      expenses: Number((p === 'today' ? s?.todayExpenses : p === 'week' ? s?.weekExpenses : s?.monthExpenses) ?? 0),
      profit: Number((p === 'today' ? s?.todayProfit : p === 'week' ? s?.weekProfit : s?.monthProfit) ?? 0),
    };
  });
  readonly periodLabel = computed(() => {
    const p = this.moneyPeriod();
    if (p === 'today') return 'Today so far';
    if (p === 'week') return 'This week so far';
    return new Date().toLocaleDateString('en-ZA', { month: 'long' }) + ' so far';
  });
  barWidth(n: number): number {
    const max = Math.max(this.periodNumbers().income, this.periodNumbers().expenses);
    return max > 0 ? Math.max(2, (n / max) * 100) : 0;
  }
  moneyCategoryLabel(e: IncomeEntryResponse): string {
    const type = e.entryType === 'EXPENSE' ? 'EXPENSE' : 'INCOME';
    return this.moneyCategoryOpts(type).find(o => o.value === e.category)?.label ?? (type === 'EXPENSE' ? 'Money out' : 'Money in');
  }

  tab = signal<SellTab>('today');
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
  barcodeModalMode = signal<'add' | 'edit' | 'pos' | 'collect' | null>(null);
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
    } else if (mode === 'collect') {
      this.onCollectScan(code);
    }
  }

  onBarcodeOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.barcodeModalMode.set(null);
    }
  }

  // ── Sell (POS) ───────────────────────────────────────────────────────────
  posView = signal<'sell' | 'history' | 'charge'>('sell');
  posBasket = signal<{ productId?: string; itemName: string; unitPrice: number; quantity: number }[]>([]);
  posSearchQuery = signal('');
  posShowAllProducts = signal(false);
  posScanError = signal('');
  posUnknownBarcode = signal<string | null>(null);
  posLastAdded = signal<string | null>(null);
  posConfirming = signal(false);
  posPendingProduct = signal<ProductResponse | null>(null);
  posCompleting = signal(false);
  posSuccess = signal<{ total: number; items: { itemName: string; unitPrice: number; quantity: number }[]; cashGiven: number | null; change: number; method: 'cash' | 'card'; time: Date } | null>(null);
  posError = signal('');

  salesHistory = signal<SaleResponse[]>([]);
  salesHistoryLoading = signal(false);

  private readonly POS_QUICK_PREVIEW = 6;

  posFilteredProducts = computed(() => {
    const q = this.posSearchQuery().trim().toLowerCase();
    const list = this.products();
    return q ? list.filter(p => p.name.toLowerCase().includes(q)) : list;
  });

  posVisibleProducts = computed(() => {
    const list = this.posFilteredProducts();
    return this.posShowAllProducts() || this.posSearchQuery().trim()
      ? list
      : list.slice(0, this.POS_QUICK_PREVIEW);
  });

  posHasMoreProducts = computed(() =>
    !this.posShowAllProducts() && !this.posSearchQuery().trim() && this.posFilteredProducts().length > this.POS_QUICK_PREVIEW
  );

  basketTotal = computed(() => this.posBasket().reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  basketSummaryLine = computed(() => this.posBasket().map(i => `${i.itemName} ×${i.quantity}`).join(', '));

  openPosScanModal(): void {
    this.posScanError.set('');
    this.posUnknownBarcode.set(null);
    this.posLastAdded.set(null);
    this.posConfirming.set(false);
    this.posPendingProduct.set(null);
    this.barcodeModalMode.set('pos');
  }

  onPosScan(code: string): void {
    this.posScanError.set('');
    this.api.getProductByBarcode(code, this.auth.getToken()!).subscribe({
      next: (product) => {
        this.posPendingProduct.set(product);
        this.posConfirming.set(true);
      },
      error: (err) => {
        if (err.status === 404) {
          this.posUnknownBarcode.set(code);
        } else {
          this.posScanError.set('Could not look up that barcode. Try again.');
        }
      }
    });
  }

  confirmPendingScan(): void {
    const product = this.posPendingProduct();
    if (product) this.addProductToBasket(product);
    this.posPendingProduct.set(null);
    this.posConfirming.set(false);
  }

  cancelPendingScan(): void {
    this.posPendingProduct.set(null);
    this.posConfirming.set(false);
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
        const cash = this.payMethod() === 'cash' && this.cashGiven() !== null ? Number(this.cashGiven()) : null;
        this.posCompleting.set(false);
        this.posSuccess.set({
          total: Number(sale.totalAmount),
          items: this.posBasket().map(i => ({ itemName: i.itemName, unitPrice: i.unitPrice, quantity: i.quantity })),
          cashGiven: cash,
          change: cash !== null ? cash - Number(sale.totalAmount) : 0,
          method: this.payMethod(),
          time: new Date(),
        });
        this.posBasket.set([]);
        this.cashGiven.set(null);
        this.payMethod.set('cash');
        this.posView.set('sell');
        this.loadSummary();
        this.loadIncome();
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
    this.unifiedAuth.logout();
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
      CANCELLED: 'order-status-cancelled', DELIVERED: 'order-status-delivered',
      COLLECTED: 'order-status-collected'
    };
    return map[status] ?? 'order-status-pending';
  }

  // ── Collection pickup scan ──────────────────────────────────────────────────
  collectScanError = signal('');
  collectSuccess = signal(false);
  collectScanBusy = signal(false);

  openCollectScanModal(): void {
    this.collectScanError.set('');
    this.collectSuccess.set(false);
    this.collectScanBusy.set(false);
    this.barcodeModalMode.set('collect');
  }

  onCollectScan(code: string): void {
    const token = this.auth.getToken();
    if (!token) return;
    this.collectScanError.set('');
    this.collectScanBusy.set(true);
    this.api.collectOrder(code, token).subscribe({
      next: (updated) => {
        this.incomingOrders.update(list => list.map(o => o.id === updated.id ? updated : o));
        this.collectSuccess.set(true);
        this.collectScanBusy.set(false);
        setTimeout(() => { this.collectSuccess.set(false); this.barcodeModalMode.set(null); }, 1200);
      },
      error: (err) => {
        this.collectScanBusy.set(false);
        this.collectScanError.set(err?.error?.message || 'Could not verify that code. Try again.');
      }
    });
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
    doc.text('thenga.com', lm, y); y += 6;
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
    doc.text('Powered by thenga.com', lm, y);

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
    this.addError.set('');
    if (file.size > MAX_IMAGE_BYTES) {
      this.imagePreview.set(null);
      this.pendingImageUrl.set(null);
      this.addError.set(IMAGE_TOO_LARGE);
      (event.target as HTMLInputElement).value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.uploadLoading.set(true);
    this.api.uploadImage(file, this.auth.getToken()!).subscribe({
      next: (res) => { this.pendingImageUrl.set(res.url); this.uploadLoading.set(false); },
      error: (err) => {
        this.uploadLoading.set(false);
        this.imagePreview.set(null);
        this.addError.set(err?.error?.message || 'The photo could not be uploaded. Please try again.');
      }
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
    this.saveError.set('');
    if (file.size > MAX_IMAGE_BYTES) {
      this.saveError.set(IMAGE_TOO_LARGE);
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.uploadLoading.set(true);
    this.api.uploadImage(file, this.auth.getToken()!).subscribe({
      next: (res) => { this.editPendingImageUrl = res.url; this.uploadLoading.set(false); },
      error: (err) => {
        this.uploadLoading.set(false);
        this.saveError.set(err?.error?.message || 'The photo could not be uploaded. Please try again.');
      }
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
