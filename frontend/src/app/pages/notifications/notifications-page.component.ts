import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, NotificationResponse } from '../../services/api.service';
import { UnifiedAuthService } from '../../services/unified-auth.service';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import { LoadingSkeletonComponent } from '../../components/loading-skeleton/loading-skeleton.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

const ICONS: Record<NotificationResponse['type'], string> = {
  APPLICATION_REVIEWED: 'verified',
  SURVEY_ASSIGNED: 'assignment',
  OTHER: 'notifications',
};

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, LoginGateComponent, LoadingSkeletonComponent, TranslatePipe],
  template: `
    <app-login-gate *ngIf="!auth.isLoggedIn()"
      icon="🔔"
      title="Sign In"
      subtitle="Log in to view your notifications."
    ></app-login-gate>

    <ng-container *ngIf="auth.isLoggedIn()">
      <header class="head dash-head">
        <div class="head-inner">
          <h1 class="title">{{ 'updates.title' | translate }}</h1>
          <button type="button" class="mark-all" *ngIf="unreadCount() > 0" (click)="markAllRead()">{{ 'updates.markAll' | translate }}</button>
        </div>
      </header>

      <div class="layout">
        <app-loading-skeleton [loading]="loading()" variant="notification"></app-loading-skeleton>

        <section class="empty" *ngIf="notifications().length === 0 && !loading()">
          <mat-icon aria-hidden="true">notifications_none</mat-icon>
          <p>{{ 'updates.empty' | translate }}</p>
        </section>

        <ng-container *ngFor="let g of groups()">
          <h2 class="group">{{ g.key | translate }}</h2>
          <ul class="list" role="list">
            <li *ngFor="let n of g.items">
              <button type="button" class="item" (click)="open(n)">
                <span class="tile" [class.tile-new]="!n.read" aria-hidden="true"><mat-icon>{{ icon(n) }}</mat-icon></span>
                <span class="text">
                  <strong>{{ n.title }}</strong>
                  <span class="sub"><ng-container *ngIf="n.body">{{ n.body }} · </ng-container>{{ n.createdAt | date:(g.key === 'updates.today' ? 'HH:mm' : 'EEE d MMM') }}</span>
                </span>
                <span class="new" *ngIf="!n.read"><span class="sr-only">{{ 'updates.new' | translate }}</span></span>
              </button>
            </li>
          </ul>
        </ng-container>
      </div>
    </ng-container>
  `,
  styles: `
    :host { display: block; }
    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

    .head-inner { max-width: 640px; margin: 0 auto; padding: 20px 16px 16px; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
    .title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 800; line-height: 1; letter-spacing: -0.015em; color: var(--nav-fg); }
    .mark-all { min-height: 44px; padding: 0; background: transparent; color: var(--success-text); font-size: 0.875rem; font-weight: 700; }

    .layout { max-width: 640px; margin: 0 auto; padding: 16px 16px 5rem; display: flex; flex-direction: column; gap: 10px; }
    .group { margin: 6px 0 0; padding: 6px 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--success-text); }

    .list { list-style: none; margin: 0; padding: 0; background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 20px; overflow: hidden; }
    .list li + li { border-top: 1px solid var(--border-base); }
    .item {
      display: flex; align-items: flex-start; gap: 14px; width: 100%; min-height: 48px; padding: 14px 16px;
      border-radius: 0; background: transparent; color: var(--text-primary); text-align: left; font-weight: 400;
    }
    .item:active { transform: none; background: var(--bg-muted); }
    .item:focus-visible { outline: 3px solid var(--border-focus); outline-offset: -3px; }
    .tile { width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--bg-muted); color: var(--text-primary); }
    .tile-new { background: rgba(229, 163, 29, 0.25); }
    .tile mat-icon { width: 22px; height: 22px; font-size: 22px; }
    .text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .text strong { font-size: 1rem; }
    .sub { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.35; }
    .new { width: 10px; height: 10px; border-radius: 50%; background: var(--gold); flex-shrink: 0; margin-top: 6px; }

    .empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 16px; text-align: center; color: var(--text-secondary); }
    .empty mat-icon { width: 44px; height: 44px; font-size: 44px; }
    .empty p { margin: 0; max-width: 320px; line-height: 1.5; }
  `
})
export class NotificationsPageComponent implements OnInit {
  readonly auth = inject(UnifiedAuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly notifications = signal<NotificationResponse[]>([]);
  readonly loading = signal(false);

  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  // Today's updates first, then everything older
  readonly groups = computed(() => {
    const today = new Date().toDateString();
    const sorted = [...this.notifications()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const todays = sorted.filter(n => new Date(n.createdAt).toDateString() === today);
    const older = sorted.filter(n => new Date(n.createdAt).toDateString() !== today);
    return [
      { key: 'updates.today', items: todays },
      { key: 'updates.earlier', items: older },
    ].filter(g => g.items.length > 0);
  });

  ngOnInit(): void {
    // Notifications only exist for hustler/facilitator/coordinator business profiles today —
    // a customer or a still-pending applicant has none, so there's nothing to fetch for them.
    if (this.auth.isLoggedIn() && this.auth.hasStore()) {
      this.load();
    }
  }

  icon(n: NotificationResponse): string {
    return ICONS[n.type] ?? 'notifications';
  }

  private load(): void {
    this.loading.set(true);
    this.api.getMyNotifications(this.auth.getToken()!).subscribe({
      next: (list) => { this.notifications.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  markAllRead(): void {
    for (const n of this.notifications().filter(x => !x.read)) this.markRead(n);
  }

  private markRead(n: NotificationResponse): void {
    this.api.markNotificationRead(n.id, this.auth.getToken()!).subscribe({
      next: () => this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, read: true } : x)),
      error: () => {}
    });
  }

  open(n: NotificationResponse): void {
    if (!n.read) this.markRead(n);
    if (n.linkPath) {
      this.router.navigateByUrl(n.linkPath);
    }
  }
}
