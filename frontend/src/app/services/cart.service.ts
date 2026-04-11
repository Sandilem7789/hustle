import { Injectable, signal, computed } from '@angular/core';
import { ProductResponse } from './api.service';

export interface CartItem {
  product: ProductResponse;
  quantity: number;
}

const CART_SESSION_KEY = 'hustle_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>(this.load());

  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );

  readonly count = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );

  addItem(product: ProductResponse): void {
    const current = this.items();
    const existing = current.find(i => i.product.id === product.id);
    if (existing) {
      this.items.set(current.map(i =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      this.items.set([...current, { product, quantity: 1 }]);
    }
    this.persist();
  }

  removeItem(productId: string): void {
    this.items.set(this.items().filter(i => i.product.id !== productId));
    this.persist();
  }

  updateQuantity(productId: string, qty: number): void {
    if (qty <= 0) {
      this.removeItem(productId);
      return;
    }
    this.items.set(this.items().map(i =>
      i.product.id === productId ? { ...i, quantity: qty } : i
    ));
    this.persist();
  }

  clear(): void {
    this.items.set([]);
    sessionStorage.removeItem(CART_SESSION_KEY);
  }

  private persist(): void {
    sessionStorage.setItem(CART_SESSION_KEY, JSON.stringify(this.items()));
  }

  private load(): CartItem[] {
    try {
      const raw = sessionStorage.getItem(CART_SESSION_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
