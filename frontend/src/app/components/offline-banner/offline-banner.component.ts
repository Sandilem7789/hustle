import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineQueueService } from '../../services/offline-queue.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-bar" *ngIf="isOffline()">
      <span>📶</span>
      <span *ngIf="queueCount() === 0">You are offline. Some features may not be available.</span>
      <span *ngIf="queueCount() > 0">You are offline — {{ queueCount() }} item{{ queueCount() === 1 ? '' : 's' }} queued to sync.</span>
    </div>
  `,
  styles: `
    /* .offline-bar itself is intentionally left to the global rule in
       styles.css (branded orange/white) — do not redefine it here, that
       previously shadowed the global rule with an unrelated palette. */
  `
})
export class OfflineBannerComponent implements OnInit, OnDestroy {
  private readonly offlineQueue = inject(OfflineQueueService);

  isOffline = signal(!navigator.onLine);
  queueCount = signal(0);

  private onOnline = () => {
    this.isOffline.set(false);
    this.updateQueueCount();
  };

  private onOffline = () => {
    this.isOffline.set(true);
    this.updateQueueCount();
  };

  ngOnInit(): void {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    this.updateQueueCount();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }

  private updateQueueCount(): void {
    this.queueCount.set(this.offlineQueue.getQueue().length);
  }
}
