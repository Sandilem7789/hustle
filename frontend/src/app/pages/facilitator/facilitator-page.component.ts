import { Component } from '@angular/core';
import { FacilitatorQueueComponent } from '../../components/facilitator-queue/facilitator-queue.component';

@Component({
  selector: 'app-facilitator-page',
  standalone: true,
  imports: [FacilitatorQueueComponent],
  template: `
    <section class="layout">
      <app-facilitator-queue></app-facilitator-queue>
    </section>
  `
})
export class FacilitatorPageComponent {}
