import { Component } from '@angular/core';
import { FacilitatorQueueComponent } from '../../components/facilitator-queue/facilitator-queue.component';

@Component({
  selector: 'app-facilitator-page',
  standalone: true,
  imports: [FacilitatorQueueComponent],
  template: `
    <section class="layout">
      <header class="hero">
        <p class="eyebrow">Facilitator workspace</p>
        <h1>Review and approve hustler applications</h1>
        <p class="muted">Filter pending submissions, leave notes, and move hustlers into the marketplace.</p>
      </header>
      <app-facilitator-queue></app-facilitator-queue>
    </section>
  `
})
export class FacilitatorPageComponent {}
