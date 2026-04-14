import { Component } from '@angular/core';
import { FacilitatorQueueComponent } from '../../components/facilitator-queue/facilitator-queue.component';

@Component({
  selector: 'app-coordinator-page',
  standalone: true,
  imports: [FacilitatorQueueComponent],
  template: `
    <section class="layout">
      <div class="coord-banner">
        <span class="coord-role">Coordinator View</span>
        <span class="coord-note">You can see all 5 communities.</span>
      </div>
      <app-facilitator-queue [coordinatorMode]="true"></app-facilitator-queue>
    </section>
  `,
  styles: `
    .layout { padding: 1rem; max-width: 900px; margin: 0 auto; }
    .coord-banner { display: flex; align-items: center; gap: 0.75rem; background: rgba(0,168,150,0.08); border: 1px solid rgba(0,168,150,0.25); border-radius: 0.75rem; padding: 0.6rem 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .coord-role { font-weight: 800; font-size: 0.85rem; color: #00746A; }
    .coord-note { font-size: 0.82rem; color: #78716C; }
  `
})
export class CoordinatorPageComponent {}
