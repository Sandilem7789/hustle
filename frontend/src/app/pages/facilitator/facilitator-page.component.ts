import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FacilitatorQueueComponent } from '../../components/facilitator-queue/facilitator-queue.component';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import { UnifiedAuthService } from '../../services/unified-auth.service';

@Component({
  selector: 'app-facilitator-page',
  standalone: true,
  imports: [CommonModule, FacilitatorQueueComponent, LoginGateComponent],
  template: `
    <app-login-gate *ngIf="!authorized()"
      icon="🏛️"
      title="Facilitator Sign In"
      subtitle="This section is for facilitators and coordinators only."
      [requiredRoles]="['FACILITATOR','COORDINATOR']"
    ></app-login-gate>

    <section class="staff-shell" *ngIf="authorized()">
      <header class="staff-shell__header">
        <h1 class="staff-shell__title">Facilitator</h1>
        <p class="staff-shell__subtitle">Applicant pipeline, active hustlers, surveys and reports</p>
      </header>
      <div class="staff-shell__content staff-shell__content--contained">
        <app-facilitator-queue></app-facilitator-queue>
      </div>
      <footer class="staff-shell__footer signout-row">
        <button class="signout-btn" (click)="logout()">Sign Out</button>
      </footer>
    </section>
  `,
  styles: `
    :host { display: block; }
    app-facilitator-queue { display: block; height: 100%; min-height: 0; }
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
export class FacilitatorPageComponent {
  private readonly auth = inject(UnifiedAuthService);
  private readonly router = inject(Router);

  readonly authorized = computed(() => this.auth.isStaff());

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/marketplace']);
  }
}
