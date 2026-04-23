import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    </section>
  `
})
export class FacilitatorPageComponent {
  private readonly auth = inject(AuthService);
  readonly authorized = computed(() => {
    const r = this.auth.state()?.role;
    return r === 'FACILITATOR' || r === 'COORDINATOR';
  });
}
