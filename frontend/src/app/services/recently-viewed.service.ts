import { Injectable, signal } from '@angular/core';
import { ProductResponse } from './api.service';

const STORAGE_KEY = 'thenga_recent';
const MAX_ITEMS = 10;

@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
  private readonly _items = signal<ProductResponse[]>(this.load());

  readonly items = this._items.asReadonly();

  record(product: ProductResponse): void {
    const next = [product, ...this._items().filter(p => p.id !== product.id)].slice(0, MAX_ITEMS);
    this._items.set(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable — the list still works for this visit */ }
  }

  private load(): ProductResponse[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(p => typeof p?.id === 'string').slice(0, MAX_ITEMS) : [];
    } catch {
      return [];
    }
  }
}
