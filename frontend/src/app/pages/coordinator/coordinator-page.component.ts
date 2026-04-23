import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FacilitatorQueueComponent } from '../../components/facilitator-queue/facilitator-queue.component';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-coordinator-page',
  standalone: true,
  imports: [CommonModule, FacilitatorQueueComponent, LoginGateComponent],
  template: `
    <app-login-gate *ngIf="!authorized()"
      icon="🗂️"
      title="Coordinator Sign In"
      subtitle="This section is for coordinators only."
      [requiredRoles]="['COORDINATOR']"
    ></app-login-gate>

    <section class="layout" *ngIf="authorized()">
      <div class="coord-banner">
        <span class="coord-role">Coordinator View</span>
        <span class="coord-note">You can see all 5 communities.</span>
      </div>
      <app-facilitator-queue [coordinatorMode]="true"></app-facilitator-queue>
      <div class="signout-row">
        <button class="signout-btn" (click)="logout()">Sign Out</button>
      </div>
    </section>
  `,
  styles: `
    .layout { padding: 1rem; max-width: 900px; margin: 0 auto; }
    .coord-banner { display: flex; align-items: center; gap: 0.75rem; background: rgba(0,168,150,0.08); border: 1px solid rgba(0,168,150,0.25); border-radius: 0.75rem; padding: 0.6rem 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .coord-role { font-weight: 800; font-size: 0.85rem; color: #00746A; }
    .coord-note { font-size: 0.82rem; color: #78716C; }
    .signout-row {
      display: flex;
      justify-content: center;
      padding: 2rem 0 1rem;
    }
    .signout-btn {
      border: 1.5px solid #E7E5E4;
      background: none;
      color: #A8A29E;
      border-radius: 999px;
      padding: 0.6rem 2rem;
      font-size: 0.875rem;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      min-height: 48px;
      transition: border-color 0.15s, color 0.15s;
    }
    .signout-btn:hover { border-color: #E53935; color: #E53935; }
  `
})
export class CoordinatorPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly authorized = computed(() => this.auth.state()?.role === 'COORDINATOR');

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/marketplace']);
  }
}
