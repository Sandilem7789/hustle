import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FacilitatorQueueComponent } from '../../components/facilitator-queue/facilitator-queue.component';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import { AuthService } from '../../services/auth.service';

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

    <section class="layout" *ngIf="authorized()">
      <app-facilitator-queue></app-facilitator-queue>
      <div class="signout-row">
        <button class="signout-btn" (click)="logout()">Sign Out</button>
      </div>
    </section>
  `,
  styles: `
    .layout { padding: 1rem; max-width: 960px; margin: 0 auto; }
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
export class FacilitatorPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly authorized = computed(() => {
    const r = this.auth.state()?.role;
    return r === 'FACILITATOR' || r === 'COORDINATOR';
  });

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/marketplace']);
  }
}
