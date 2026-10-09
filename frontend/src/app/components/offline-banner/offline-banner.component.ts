import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-bar" *ngIf="isOffline()">
      <span>📶</span>
      <span>You are offline. Some features may not be available.</span>
    </div>
  `,
  styles: `
    /* .offline-bar itself is intentionally left to the global rule in
       styles.css (branded orange/white) — do not redefine it here, that
       previously shadowed the global rule with an unrelated palette. */
  `
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  isOffline = signal(!navigator.onLine);

  private onOnline = () => {
    this.isOffline.set(false);
  };

  private onOffline = () => {
    this.isOffline.set(true);
  };

  ngOnInit(): void {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}
