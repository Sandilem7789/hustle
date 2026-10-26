import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'thenga_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.readInitial());

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.setAttribute('data-theme', t);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#13251E' : '#FBF8F2');
      try { localStorage.setItem(STORAGE_KEY, t); } catch { /* storage unavailable — theme still applies for this load */ }
    });
  }

  toggle(): void {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  setTheme(t: Theme): void {
    this.theme.set(t);
  }

  private readInitial(): Theme {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* storage unavailable — fall back to the default */ }
    return 'light';
  }
}
