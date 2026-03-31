import { Component } from '@angular/core';
import { CommunityHubComponent } from '../../components/community-hub/community-hub.component';

@Component({
  selector: 'app-marketplace-page',
  standalone: true,
  imports: [CommunityHubComponent],
  template: `
    <section class="layout">
      <header class="hero">
        <p class="eyebrow">Marketplace</p>
        <h1>Explore approved hustlers by community</h1>
        <p class="muted">Browse talent, surface products, and connect facilitators with active businesses.</p>
      </header>
      <app-community-hub></app-community-hub>
    </section>
  `
})
export class MarketplacePageComponent {}
