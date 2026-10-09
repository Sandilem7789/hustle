import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FacilitatorQueueComponent } from '../../components/facilitator-queue/facilitator-queue.component';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import { UnifiedAuthService } from '../../services/unified-auth.service';

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

    <section class="staff-shell" *ngIf="authorized()">
      <header class="staff-shell__header coord-header">
        <div>
          <h1 class="staff-shell__title">Coordinator</h1>
          <p class="staff-shell__subtitle">Applicant pipeline, active hustlers, surveys and reports</p>
        </div>
        <span class="coord-note">All 5 communities</span>
      </header>
      <div class="staff-shell__content staff-shell__content--contained">
        <app-facilitator-queue [coordinatorMode]="true"></app-facilitator-queue>
      </div>
      <footer class="staff-shell__footer signout-row">
        <button class="signout-btn" (click)="logout()">Sign Out</button>
      </footer>
    </section>
  `,
  styles: `
    :host { display: block; }
    app-facilitator-queue { display: block; height: 100%; min-height: 0; }
    .coord-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .coord-note { flex-shrink: 0; border-radius: 999px; background: rgba(0,168,150,0.1); color: #00746A; padding: 0.35rem 0.7rem; font-size: 0.75rem; font-weight: 800; }
    .signout-row {
      display: flex;
      justify-content: center;
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
    @media (hover: hover) and (pointer: fine) {
      .signout-btn:hover { border-color: #E53935; color: #E53935; }
    }
  `
})
export class CoordinatorPageComponent {
  private readonly auth = inject(UnifiedAuthService);
  private readonly router = inject(Router);

  readonly authorized = computed(() => this.auth.isCoordinator());

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/marketplace']);
  }
}
