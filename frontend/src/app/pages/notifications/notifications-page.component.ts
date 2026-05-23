import { Component } from '@angular/core';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  template: `
    <div class="layout">
      <div class="card">
        <div class="empty-state">
          <div class="bell-circle">
            <span class="bell-icon">&#128276;</span>
          </div>
          <h2>Notifications</h2>
          <p class="muted">
            You have no notifications yet. When a facilitator reviews your
            application or sends you a message, it will appear here.
          </p>
        </div>
      </div>
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
  `
})
export class NotificationsPageComponent {}
