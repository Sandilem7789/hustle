import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, ProductResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-hustler-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="layout">
      <header class="hero">
        <p class="eyebrow">Hustler Dashboard</p>
        <h1>{{ auth.state()?.businessName }}</h1>
        <p style="color:rgba(255,255,255,0.7)">Manage your products and services in the marketplace.</p>
        <p class="product-count" [class.near-limit]="products().length >= 35">
          {{ products().length }} / 40 products
        </p>
      </header>

      <!-- ADD PRODUCT FORM -->
      <div class="card" *ngIf="products().length < 40">
        <h2>Add a product or service</h2>
        <form [formGroup]="productForm" (ngSubmit)="submitProduct()" class="product-grid">
          <label class="span-2">
            <span>Name *</span>
            <input formControlName="name" placeholder="e.g. Handmade Bead Necklace" />
          </label>
          <label class="span-2">
            <span>Description *</span>
            <textarea rows="3" formControlName="description" placeholder="What is this product or service?"></textarea>
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
            <small *ngIf="uploadLoading()">Uploading image…</small>
          </label>

          <button class="primary span-2" type="submit" [disabled]="productForm.invalid || addLoading() || uploadLoading()">
            {{ addLoading() ? 'Adding…' : 'Add to marketplace' }}
          </button>
        </form>
        <p *ngIf="addError()" class="error">{{ addError() }}</p>
        <p *ngIf="addSuccess()" class="success">Product added successfully!</p>
      </div>
      <div class="card info" *ngIf="products().length >= 40">
        <p>You have reached the 40-product limit. Remove a product to add a new one.</p>
      </div>

      <!-- PRODUCT LIST -->
      <div class="card">
        <h2>Your products ({{ products().length }})</h2>
        <div *ngIf="loadingProducts()" class="muted">Loading…</div>
        <div *ngIf="!loadingProducts() && products().length === 0" class="muted">No products yet. Add your first one above!</div>
        <div class="product-list" *ngIf="products().length > 0">
          <article *ngFor="let p of products()" class="product-card">
            <img *ngIf="p.mediaUrl" [src]="resolveUrl(p.mediaUrl)" alt="{{ p.name }}" class="product-img" />
            <div class="product-body">
              <h3>{{ p.name }}</h3>
              <p class="muted">{{ p.description }}</p>
              <p class="price">R {{ p.price | number:'1.2-2' }}</p>
            </div>
            <button class="delete-btn" (click)="deleteProduct(p)" title="Remove product">&#x2715;</button>
          </article>
        </div>
      </div>
    </section>
  `,
  styles: `
    .hero .product-count {
      display: inline-block;
      margin-top: 0.75rem;
      background: rgba(255,255,255,0.15);
      padding: 0.3rem 0.9rem;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 700;
      color: white;
    }
    .hero .product-count.near-limit { background: rgba(251,191,36,0.3); color: #fbbf24; }
    .card {
      background: white;
      border-radius: 1.5rem;
      padding: 2rem;
      box-shadow: 0 25px 60px rgba(15,23,42,0.10);
    }
    @media (max-width: 600px) { .card { padding: 1.25rem; border-radius: 1rem; } }
    .card.info { background: #fef3c7; }
    .product-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1.25rem;
    }
    @media (max-width: 600px) { .product-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1 !important; } }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: #475569;
    }
    label.span-2 { grid-column: span 2; }
    input, textarea {
      border-radius: 0.8rem;
      border: 1px solid #cbd5e1;
      padding: 0.65rem 0.9rem;
      font-size: 1rem;
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
    }
    input:focus, textarea:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
    .file-input { border: none; padding: 0; font-size: 0.9rem; }
    .preview-wrap { margin-top: 0.5rem; }
    .preview { width: 100%; max-height: 160px; object-fit: cover; border-radius: 0.75rem; }
    .primary {
      border: none;
      border-radius: 999px;
      padding: 0.9rem;
      font-size: 1rem;
      font-weight: 700;
      background: linear-gradient(120deg, #0ea5e9, #22c55e);
      color: white;
      cursor: pointer;
    }
    .primary.span-2 { grid-column: span 2; }
    .primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .error { color: #dc2626; font-weight: 600; margin-top: 0.75rem; }
    .success { color: #16a34a; font-weight: 600; margin-top: 0.75rem; }
    .product-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-top: 1.25rem; }
    @media (max-width: 600px) { .product-list { grid-template-columns: 1fr; } }
    .product-card {
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      overflow: hidden;
      background: #f8fafc;
      position: relative;
    }
    .product-img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .product-body { padding: 0.9rem; }
    .product-body h3 { margin: 0 0 0.3rem; font-size: 1rem; }
    .price { font-weight: 700; color: #0ea5e9; margin-top: 0.4rem; }
    .delete-btn {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: rgba(220,38,38,0.85);
      color: white;
      border: none;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    small { color: #94a3b8; font-size: 0.8rem; }
  `
})
export class HustlerDashboardPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  products = signal<ProductResponse[]>([]);
  loadingProducts = signal(true);
  addLoading = signal(false);
  uploadLoading = signal(false);
  addError = signal('');
  addSuccess = signal(false);
  imagePreview = signal<string | null>(null);
  private pendingImageUrl = signal<string | null>(null);

  productForm = this.fb.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/register']);
      return;
    }
    this.loadProducts();
  }

  loadProducts(): void {
    const token = this.auth.getToken()!;
    this.api.listMyProducts(token).subscribe({
      next: (list) => { this.products.set(list); this.loadingProducts.set(false); },
      error: () => this.loadingProducts.set(false)
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // preview
    const reader = new FileReader();
    reader.onload = (e) => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    // upload
    this.uploadLoading.set(true);
    this.api.uploadImage(file, this.auth.getToken()!).subscribe({
      next: (res) => { this.pendingImageUrl.set(res.url); this.uploadLoading.set(false); },
      error: () => { this.uploadLoading.set(false); this.addError.set('Image upload failed. You can still add the product without an image.'); }
    });
  }

  submitProduct(): void {
    if (this.productForm.invalid) { this.productForm.markAllAsTouched(); return; }
    this.addLoading.set(true);
    this.addError.set('');
    this.addSuccess.set(false);

    const payload = {
      name: this.productForm.value.name!,
      description: this.productForm.value.description!,
      price: this.productForm.value.price!,
      mediaUrl: this.pendingImageUrl() ?? undefined,
    };

    this.api.createProduct(payload, this.auth.getToken()!).subscribe({
      next: (p) => {
        this.products.update(list => [p, ...list]);
        this.productForm.reset();
        this.imagePreview.set(null);
        this.pendingImageUrl.set(null);
        this.addLoading.set(false);
        this.addSuccess.set(true);
        setTimeout(() => this.addSuccess.set(false), 3000);
      },
      error: (err) => {
        this.addLoading.set(false);
        this.addError.set(err?.error?.message || 'Failed to add product.');
      }
    });
  }

  deleteProduct(product: ProductResponse): void {
    if (!confirm(`Remove "${product.name}" from your marketplace?`)) return;
    this.api.deleteProduct(product.id, this.auth.getToken()!).subscribe({
      next: () => this.products.update(list => list.filter(p => p.id !== product.id)),
      error: () => alert('Failed to delete product.')
    });
  }

  resolveUrl(mediaUrl: string): string {
    if (mediaUrl.startsWith('http')) return mediaUrl;
    return this.api.baseUrl + mediaUrl;
  }
}
