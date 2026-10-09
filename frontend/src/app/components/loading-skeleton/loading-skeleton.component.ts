import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, signal } from '@angular/core';

type SkeletonVariant = 'product' | 'stock' | 'order' | 'notification';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="visible()">
      <span class="sr-only" role="status">Loading</span>
      <div class="skeleton-title sk-block" *ngIf="variant === 'product'" aria-hidden="true"></div>
      <div class="skeleton-list" [ngClass]="'skeleton-list--' + variant" aria-hidden="true">
        <div class="skeleton-card" *ngFor="let placeholder of placeholders">
          <div class="skeleton-media sk-block" *ngIf="variant === 'product' || variant === 'stock'"></div>
          <div class="skeleton-body">
            <div class="skeleton-top">
              <span class="sk-block sk-line sk-heading"></span>
              <span class="sk-block sk-pill" *ngIf="variant === 'order'"></span>
            </div>
            <span class="sk-block sk-line sk-short" *ngIf="variant === 'order' || variant === 'notification'"></span>
            <span class="sk-block sk-line"></span>
            <span class="sk-block sk-line sk-medium"></span>
            <span class="sk-block sk-line sk-short" *ngIf="variant !== 'notification'"></span>
            <span class="sk-block sk-action" *ngIf="variant === 'product' || variant === 'order'"></span>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: `
    :host { display: block; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .skeleton-title { width: 55%; height: 1.75rem; margin: 0 0 1.5rem; border-radius: 0.5rem; }
    .skeleton-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .skeleton-list--product, .skeleton-list--stock { display: grid; grid-template-columns: 1fr; gap: 1rem; }
    .skeleton-card { overflow: hidden; border: 1px solid var(--border-base); border-radius: 1rem; background: var(--bg-surface); }
    .skeleton-list--order .skeleton-card { border-radius: 1.25rem; }
    .skeleton-media { height: 160px; border-radius: 0; }
    .skeleton-list--stock .skeleton-media { height: 150px; }
    .skeleton-body { display: flex; flex-direction: column; gap: 0.65rem; padding: 1rem; }
    .skeleton-list--order .skeleton-body { padding: 1.25rem; }
    .skeleton-top { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
    .sk-block { display: block; background: var(--bg-muted); animation: skeleton-pulse 1.8s ease-in-out infinite; }
    .sk-line { width: 100%; height: 0.875rem; border-radius: 0.35rem; }
    .sk-heading { width: 60%; height: 1.125rem; }
    .sk-medium { width: 70%; }
    .sk-short { width: 42%; }
    .sk-pill { width: 4.5rem; height: 1.5rem; border-radius: 999px; }
    .sk-action { height: 2.5rem; border-radius: 0.75rem; margin-top: 0.25rem; }
    .skeleton-list--notification .skeleton-body { gap: 0.5rem; }
    @keyframes skeleton-pulse { 50% { opacity: 0.55; } }
    @media (min-width: 601px) {
      .skeleton-list--product, .skeleton-list--stock { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sk-block { animation: none; }
    }
  `
})
export class LoadingSkeletonComponent implements OnDestroy {
  @Input() variant: SkeletonVariant = 'order';
  @Input() set loading(value: boolean) {
    this.clearTimer();
    this.visible.set(false);
    if (value) {
      this.timer = setTimeout(() => this.visible.set(true), 300);
    }
  }

  readonly visible = signal(false);
  readonly placeholders = [0, 1, 2];
  private timer: ReturnType<typeof setTimeout> | undefined;

  ngOnDestroy(): void { this.clearTimer(); }

  private clearTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
