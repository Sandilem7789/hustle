import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, NotificationResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, LoginGateComponent],
  template: `
    <app-login-gate *ngIf="!auth.isLoggedIn()"
      icon="🔔"
      title="Sign In"
      subtitle="Log in to view your notifications."
    ></app-login-gate>

    <div class="layout" *ngIf="auth.isLoggedIn()">
      <div class="card" *ngIf="notifications().length === 0 && !loading()">
        <div class="empty-state">
          <div class="bell-circle">
            <span class="bell-icon">&#128276;</span>
          </div>
          <h2>Notifications</h2>
          <p class="muted">
            You have no notifications yet. When a facilitator reviews your
            application or assigns you a survey, it will appear here.
          </p>
        </div>
      </div>

      <ul class="notif-list" *ngIf="notifications().length > 0">
        <li *ngFor="let n of notifications()"
            class="notif-item"
            [class.unread]="!n.read"
            (click)="open(n)">
          <div class="notif-dot" *ngIf="!n.read"></div>
          <div class="notif-body">
            <p class="notif-title">{{ n.title }}</p>
            <p class="notif-text" *ngIf="n.body">{{ n.body }}</p>
            <p class="notif-time">{{ n.createdAt | date:'medium' }}</p>
          </div>
        </li>
      </ul>
    </div>
  `,
  styles: `
    .layout {
      max-width: 600px;
      margin: 0 auto;
      padding: 1.5rem 1rem 5rem;
    }
    .card {
      background: white;
      border-radius: 1.5rem;
      padding: 2.5rem 1.5rem;
      box-shadow: 0 4px 24px rgba(28,25,23,0.08);
      border: 1px solid #E7E5E4;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.75rem;
    }
    .bell-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(0,168,150,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.5rem;
    }
    .bell-icon { font-size: 2rem; line-height: 1; }
    h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #1C1917; }
    .muted { color: #78716C; font-size: 0.9rem; line-height: 1.6; max-width: 320px; margin: 0; }

    .notif-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .notif-item {
      display: flex; align-items: flex-start; gap: 0.6rem;
      background: white; border: 1px solid #E7E5E4; border-radius: 1rem;
      padding: 1rem 1.1rem;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      min-height: 48px;
    }
    .notif-item:hover { border-color: #F5B800; box-shadow: 0 2px 10px rgba(28,25,23,0.06); }
    .notif-item.unread { background: rgba(245,184,0,0.06); border-color: rgba(245,184,0,0.35); }
    .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: #F5B800; margin-top: 0.4rem; flex-shrink: 0; }
    .notif-body { flex: 1; min-width: 0; }
    .notif-title { margin: 0 0 0.2rem; font-size: 0.9375rem; font-weight: 800; color: #1C1917; }
    .notif-text { margin: 0 0 0.3rem; font-size: 0.85rem; color: #57534E; line-height: 1.5; }
    .notif-time { margin: 0; font-size: 0.75rem; color: #A8A29E; }
  `
})
export class NotificationsPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly notifications = signal<NotificationResponse[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.api.getMyNotifications(this.auth.getToken()!).subscribe({
      next: (list) => { this.notifications.set(list); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  open(n: NotificationResponse): void {
    if (!n.read) {
      this.api.markNotificationRead(n.id, this.auth.getToken()!).subscribe({
        next: () => this.notifications.update(list => list.map(x => x.id === n.id ? { ...x, read: true } : x)),
        error: () => {}
      });
    }
    if (n.linkPath) {
      this.router.navigateByUrl(n.linkPath);
    }
  }
}
