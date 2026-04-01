import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { jsPDF } from 'jspdf';
import { ApiService, ProductResponse, ProductRequest, IncomeEntryResponse, IncomeSummary } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-hustler-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <section class="layout">
      <!-- HERO -->
      <header class="hero">
        <p class="eyebrow">Hustler Dashboard</p>
        <h1>{{ auth.state()?.businessName }}</h1>
        <p style="color:rgba(255,255,255,0.7)">Welcome back, {{ auth.state()?.firstName }}!</p>
        <div class="chips">
          <div class="chip">
            <span class="chip-label">Today</span>
            <span class="chip-val">R {{ (summary()?.today ?? 0) | number:'1.2-2' }}</span>
          </div>
          <div class="chip">
            <span class="chip-label">This Week</span>
            <span class="chip-val">R {{ (summary()?.weekToDate ?? 0) | number:'1.2-2' }}</span>
          </div>
          <div class="chip">
            <span class="chip-label">This Month</span>
            <span class="chip-val">R {{ (summary()?.monthToDate ?? 0) | number:'1.2-2' }}</span>
          </div>
          <div class="chip">
            <span class="chip-label">Products</span>
            <span class="chip-val">{{ products().length }} / 40</span>
          </div>
        </div>
      </header>

      <!-- TABS -->
      <div class="tab-bar">
        <button [class.active]="tab() === 'income'" (click)="tab.set('income')">Daily Income</button>
        <button [class.active]="tab() === 'products'" (click)="tab.set('products')">Products</button>
      </div>

      <!-- INCOME TAB -->
      <ng-container *ngIf="tab() === 'income'">
        <!-- QUICK ENTRY -->
        <div class="card">
          <h2>Log income</h2>
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

            <!-- SERVICE INCOME TOGGLE -->
            <label class="checkbox-row span-2">
              <input type="checkbox" [(ngModel)]="isServiceIncome" [ngModelOptions]="{standalone: true}" />
              <span>This is for a service</span>
            </label>

            <!-- INVOICE FIELDS -->
            <ng-container *ngIf="isServiceIncome">
              <div class="service-section span-2">
                <p class="service-heading">&#x1F4CB; Invoice details</p>
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
                  &#x1F4C4; Create &amp; Save Invoice as PDF
                </button>
              </div>
            </ng-container>

            <button class="primary span-2" type="submit" [disabled]="incomeForm.invalid || incomeLoading()">
              {{ incomeLoading() ? 'Saving…' : 'Log income' }}
            </button>
          </form>
          <p *ngIf="incomeSuccess()" class="success">Income logged!</p>
          <p *ngIf="incomeError()" class="error">{{ incomeError() }}</p>
        </div>

        <!-- HISTORY -->
        <div class="card">
          <div class="history-header">
            <h2>Income history</h2>
            <div class="history-controls">
              <select [(ngModel)]="historyFilter" (change)="applyFilter()" [ngModelOptions]="{standalone: true}">
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="all">All time</option>
              </select>
              <button class="outline-btn" (click)="exportCsv('weekly')">&#8595; Weekly CSV</button>
              <button class="outline-btn" (click)="exportCsv('monthly')">&#8595; Monthly CSV</button>
            </div>
          </div>

          <!-- CHART -->
          <div class="chart-wrap" *ngIf="chartData().length > 0">
            <div *ngFor="let bar of chartData()" class="bar-row">
              <span class="bar-label">{{ bar.label }}</span>
              <div class="bar-track">
                <div class="bar-fill cash" [style.width]="bar.cashPct + '%'" title="Cash: R{{bar.cash}}"></div>
                <div class="bar-fill marketplace" [style.width]="bar.marketPct + '%'" title="Marketplace: R{{bar.market}}"></div>
              </div>
              <span class="bar-total">R {{ bar.total | number:'1.0-0' }}</span>
            </div>
            <div class="chart-legend">
              <span class="legend-dot cash"></span> Cash
              <span class="legend-dot marketplace" style="margin-left:1rem"></span> Marketplace
            </div>
          </div>

          <div *ngIf="incomeHistory().length === 0" class="muted" style="margin-top:1rem">No income entries yet.</div>
          <table *ngIf="incomeHistory().length > 0" class="income-table">
            <thead><tr><th>Date</th><th>Amount</th><th>Channel</th><th>Notes</th></tr></thead>
            <tbody>
              <tr *ngFor="let e of incomeHistory()">
                <td>{{ e.date }}</td>
                <td>R {{ e.amount | number:'1.2-2' }}</td>
                <td><span class="badge" [class.cash-badge]="e.channel==='CASH'" [class.market-badge]="e.channel==='MARKETPLACE'">{{ e.channel }}</span></td>
                <td class="muted">{{ e.notes || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- PRODUCTS TAB -->
      <ng-container *ngIf="tab() === 'products'">
        <div class="card" *ngIf="products().length < 40">
          <h2>Add a product or service</h2>
          <form [formGroup]="productForm" (ngSubmit)="submitProduct()" class="product-grid">
            <label class="span-2">
              <span>Name *</span>
              <input formControlName="name" placeholder="e.g. Handmade Bead Necklace" />
            </label>
            <label class="span-2">
              <span>Description *</span>
              <textarea rows="3" formControlName="description"></textarea>
            </label>
            <label>
              <span>Price (ZAR) *</span>
              <input type="number" min="0" step="0.01" formControlName="price" />
            </label>
            <label>
              <span>Product image</span>
              <input type="file" accept="image/*" (change)="onFileChange($event)" class="file-input" />
              <div *ngIf="imagePreview()" class="preview-wrap">
                <img [src]="imagePreview()!" alt="preview" class="preview" />
              </div>
              <small *ngIf="uploadLoading()">Uploading…</small>
            </label>
            <button class="primary span-2" type="submit" [disabled]="productForm.invalid || addLoading() || uploadLoading()">
              {{ addLoading() ? 'Adding…' : 'Add to marketplace' }}
            </button>
          </form>
          <p *ngIf="addError()" class="error">{{ addError() }}</p>
          <p *ngIf="addSuccess()" class="success">Product added!</p>
        </div>
        <div class="card info" *ngIf="products().length >= 40">
          <p>Product limit of 40 reached. Remove a product to add a new one.</p>
        </div>

        <div class="card">
          <div class="shop-header">
            <div class="shop-name-badge">&#x1F6D2; {{ auth.state()?.businessName }}</div>
            <span class="muted">{{ products().length }} / 40 listings</span>
          </div>
          <div *ngIf="loadingProducts()" class="muted">Loading…</div>
          <div *ngIf="!loadingProducts() && products().length === 0" class="muted" style="margin-top:0.75rem">No products yet.</div>
          <div class="product-list">
            <article *ngFor="let p of products()" class="product-card">
              <!-- VIEW MODE -->
              <ng-container *ngIf="editingProductId() !== p.id">
                <img *ngIf="p.mediaUrl" [src]="resolveUrl(p.mediaUrl)" alt="{{ p.name }}" class="product-img" />
                <div class="product-body">
                  <h3>{{ p.name }}</h3>
                  <p class="muted">{{ p.description }}</p>
                  <p class="price">R {{ p.price | number:'1.2-2' }}</p>
                </div>
                <div class="card-actions">
                  <button class="edit-btn" (click)="startEdit(p)" title="Edit">&#x270E;</button>
                  <button class="delete-btn" (click)="deleteProduct(p)" title="Remove">&#x2715;</button>
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
    </section>
  `,
  styles: `
    .chips { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.25rem; }
    .chip { background: rgba(255,255,255,0.12); border-radius: 1rem; padding: 0.6rem 1rem; min-width: 100px; }
    .chip-label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.6); }
    .chip-val { font-size: 1.1rem; font-weight: 700; color: white; }
    .tab-bar { display: flex; gap: 0; background: white; border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 20px rgba(15,23,42,0.08); }
    .tab-bar button { flex: 1; padding: 0.9rem; border: none; background: none; font-size: 1rem; font-weight: 600; color: #94a3b8; cursor: pointer; transition: all 0.2s; }
    .tab-bar button.active { color: #0ea5e9; border-bottom: 3px solid #0ea5e9; background: #f0f9ff; }
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 25px 60px rgba(15,23,42,0.08); }
    @media (max-width: 600px) { .card { padding: 1.25rem; border-radius: 1rem; } }
    .card.info { background: #fef3c7; }
    .income-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.25rem; }
    .product-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.25rem; }
    @media (max-width: 600px) { .income-grid, .product-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1 !important; } }
    label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; color: #475569; }
    label.span-2 { grid-column: span 2; }
    input, textarea, select { border-radius: 0.8rem; border: 1px solid #cbd5e1; padding: 0.65rem 0.9rem; font-size: 1rem; font-family: inherit; width: 100%; box-sizing: border-box; background: white; }
    input:focus, textarea:focus, select:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
    .file-input { border: none; padding: 0; font-size: 0.9rem; }
    .preview-wrap { margin-top: 0.5rem; }
    .preview { width: 100%; max-height: 140px; object-fit: cover; border-radius: 0.75rem; }
    .primary { border: none; border-radius: 999px; padding: 0.9rem; font-size: 1rem; font-weight: 700; background: linear-gradient(120deg, #0ea5e9, #22c55e); color: white; cursor: pointer; }
    .primary.span-2 { grid-column: span 2; }
    .primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .success { color: #16a34a; font-weight: 600; margin-top: 0.75rem; }
    .error { color: #dc2626; font-weight: 600; margin-top: 0.75rem; }
    .checkbox-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.95rem; color: #334155; cursor: pointer; }
    .checkbox-row input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: #16a34a; flex-shrink: 0; }
    .service-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 0.8rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .service-heading { margin: 0; font-weight: 700; font-size: 0.9rem; color: #15803d; }
    .service-section label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.9rem; color: #475569; }
    .service-section input { border-radius: 0.6rem; border: 1px solid #cbd5e1; padding: 0.55rem 0.8rem; font-size: 0.95rem; font-family: inherit; width: 100%; box-sizing: border-box; background: white; }
    .invoice-btn { border: 2px solid #16a34a; color: #16a34a; font-weight: 700; padding: 0.65rem 1rem; border-radius: 999px; background: white; cursor: pointer; font-size: 0.9rem; transition: background 0.15s; }
    .invoice-btn:hover:not(:disabled) { background: #dcfce7; }
    .invoice-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .history-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1rem; }
    .history-controls { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .outline-btn { border: 1px solid #cbd5e1; background: white; border-radius: 999px; padding: 0.4rem 0.9rem; font-size: 0.85rem; cursor: pointer; color: #475569; }
    .outline-btn:hover { background: #f1f5f9; }
    .income-table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
    .income-table th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid #e2e8f0; color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; }
    .income-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
    .cash-badge { background: #dcfce7; color: #16a34a; }
    .market-badge { background: #dbeafe; color: #2563eb; }
    .chart-wrap { margin: 1rem 0; }
    .bar-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; font-size: 0.85rem; }
    .bar-label { width: 80px; text-align: right; color: #64748b; flex-shrink: 0; }
    .bar-track { flex: 1; height: 18px; background: #f1f5f9; border-radius: 999px; overflow: hidden; display: flex; }
    .bar-fill { height: 100%; transition: width 0.4s; }
    .bar-fill.cash { background: #22c55e; }
    .bar-fill.marketplace { background: #0ea5e9; }
    .bar-total { width: 70px; font-weight: 700; color: #0f172a; flex-shrink: 0; }
    .chart-legend { display: flex; align-items: center; font-size: 0.8rem; color: #64748b; margin-top: 0.5rem; }
    .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; }
    .legend-dot.cash { background: #22c55e; }
    .legend-dot.marketplace { background: #0ea5e9; }
    .product-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; margin-top: 1rem; }
    @media (max-width: 600px) { .product-list { grid-template-columns: 1fr; } }
    .shop-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
    .shop-name-badge { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
    .product-card { border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; background: #f8fafc; position: relative; }
    .product-img { width: 100%; height: 150px; object-fit: cover; display: block; }
    .product-body { padding: 0.9rem 0.9rem 0.4rem; }
    .product-body h3 { margin: 0 0 0.3rem; font-size: 1rem; }
    .price { font-weight: 700; color: #0ea5e9; margin-top: 0.4rem; }
    .card-actions { position: absolute; top: 0.5rem; right: 0.5rem; display: flex; gap: 0.3rem; }
    .edit-btn { background: rgba(14,165,233,0.85); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 0.85rem; cursor: pointer; }
    .delete-btn { background: rgba(220,38,38,0.85); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 0.85rem; cursor: pointer; }
    .edit-form { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .edit-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .small-btn { padding: 0.5rem 1rem; font-size: 0.9rem; }
    small { color: #94a3b8; font-size: 0.8rem; }
  `
})
export class HustlerDashboardPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  tab = signal<'income' | 'products'>('income');

  // Income
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

  // Chart data derived from history
  chartData = computed(() => {
    const entries = this.incomeHistory();
    if (!entries.length) return [];
    // Group by date, last 7 entries
    const byDate = new Map<string, { cash: number; market: number }>();
    for (const e of entries.slice(0, 14)) {
      const d = e.date;
      const cur = byDate.get(d) ?? { cash: 0, market: 0 };
      if (e.channel === 'CASH') cur.cash += Number(e.amount);
      else cur.market += Number(e.amount);
      byDate.set(d, cur);
    }
    const maxTotal = Math.max(...Array.from(byDate.values()).map(v => v.cash + v.market), 1);
    return Array.from(byDate.entries()).slice(0, 7).map(([label, v]) => {
      const total = v.cash + v.market;
      return { label, cash: v.cash, market: v.market, total, cashPct: (v.cash / maxTotal) * 100, marketPct: (v.market / maxTotal) * 100 };
    });
  });

  // Products
  products = signal<ProductResponse[]>([]);
  loadingProducts = signal(true);
  addLoading = signal(false);
  uploadLoading = signal(false);
  addError = signal('');
  addSuccess = signal(false);
  imagePreview = signal<string | null>(null);
  private pendingImageUrl = signal<string | null>(null);

  // Edit state
  editingProductId = signal<string | null>(null);
  editName = '';
  editDescription = '';
  editPrice = 0;
  private editPendingImageUrl: string | null = null;
  saveLoading = signal(false);
  saveError = signal('');

  productForm = this.fb.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/register']); return; }
    this.loadProducts();
    this.loadIncome();
    this.loadSummary();
  }

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
    const payload = { ...this.incomeForm.value, channel: 'CASH' as const };
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
      error: (err) => { this.incomeLoading.set(false); this.incomeError.set(err?.error?.message || 'Failed to log income.'); }
    });
  }

  createInvoicePdf(): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const businessName = this.auth.state()?.businessName ?? 'Business';
    const amount = Number(this.incomeForm.get('amount')?.value ?? 0);
    const dateVal = this.incomeForm.get('date')?.value ?? new Date().toISOString().slice(0, 10);
    const notes = this.incomeForm.get('notes')?.value ?? '';
    const invoiceNo = `INV-${Date.now()}`;
    const formattedDate = new Date(dateVal + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

    const lm = 20;          // left margin
    const rm = 190;         // right margin x
    const mid = rm - lm;    // usable width
    let y = 22;

    // ── Header ──
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('HUSTLE ECONOMY', lm, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Empowering local hustlers', lm, y);
    y += 5;
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.6);
    doc.line(lm, y, rm, y);

    // ── Invoice title + meta ──
    y += 10;
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('INVOICE', lm, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Invoice No:', lm, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(invoiceNo, lm + 30, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Date:', lm, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formattedDate, lm + 30, y);

    // ── From / To ──
    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(lm, y, rm, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);
    doc.text('FROM', lm, y);
    doc.text('TO', lm + mid / 2, y);
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(businessName, lm, y);
    doc.text(this.invoiceCustomer, lm + mid / 2, y);

    // ── Line items table ──
    y += 12;
    doc.setDrawColor(226, 232, 240);
    doc.line(lm, y, rm, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184);
    doc.text('DESCRIPTION', lm, y);
    doc.text('AMOUNT', rm, y, { align: 'right' });
    y += 4;
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.5);
    doc.line(lm, y, rm, y);

    y += 7;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const serviceLines = doc.splitTextToSize(this.invoiceService, mid - 50);
    doc.text(serviceLines, lm, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`R ${amount.toFixed(2)}`, rm, y, { align: 'right' });
    y += (serviceLines.length - 1) * 5;

    // ── Total ──
    y += 8;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(lm, y, rm, y);
    y += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL', lm, y);
    doc.setTextColor(14, 165, 233);
    doc.text(`R ${amount.toFixed(2)}`, rm, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.6);
    doc.line(lm, y, rm, y);

    // ── Notes ──
    if (notes) {
      y += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Notes:', lm, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const noteLines = doc.splitTextToSize(notes, mid);
      doc.text(noteLines, lm, y);
    }

    // ── Footer ──
    y += 16;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(15, 23, 42);
    doc.text('Thank you for your business!', lm, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Powered by Hustle Economy', lm, y);

    doc.save(`${invoiceNo}.pdf`);
  }

  exportCsv(period: 'weekly' | 'monthly'): void {
    this.api.exportIncomeCsv(this.auth.getToken()!, period).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `income-${period}.csv`; a.click();
      URL.revokeObjectURL(url);
    });
  }

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
    const payload = { name: this.productForm.value.name!, description: this.productForm.value.description!, price: this.productForm.value.price!, mediaUrl: this.pendingImageUrl() ?? undefined };
    this.api.createProduct(payload, this.auth.getToken()!).subscribe({
      next: (p) => { this.products.update(l => [p, ...l]); this.productForm.reset(); this.imagePreview.set(null); this.pendingImageUrl.set(null); this.addLoading.set(false); this.addSuccess.set(true); setTimeout(() => this.addSuccess.set(false), 2500); },
      error: (err) => { this.addLoading.set(false); this.addError.set(err?.error?.message || 'Failed to add product.'); }
    });
  }

  deleteProduct(p: ProductResponse): void {
    if (!confirm(`Remove "${p.name}"?`)) return;
    this.api.deleteProduct(p.id, this.auth.getToken()!).subscribe({ next: () => this.products.update(l => l.filter(x => x.id !== p.id)), error: () => alert('Failed.') });
  }

  startEdit(p: ProductResponse): void {
    this.editingProductId.set(p.id);
    this.editName = p.name;
    this.editDescription = p.description;
    this.editPrice = Number(p.price);
    this.editPendingImageUrl = null;
    this.saveError.set('');
  }

  cancelEdit(): void {
    this.editingProductId.set(null);
    this.saveError.set('');
  }

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
        this.saveError.set(err?.error?.message || 'Failed to save changes.');
      }
    });
  }

  resolveUrl(u: string): string { return u.startsWith('http') ? u : this.api.baseUrl + u; }
}
