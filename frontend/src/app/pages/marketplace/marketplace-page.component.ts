import { Component } from '@angular/core';
import { CommunityHubComponent } from '../../components/community-hub/community-hub.component';

@Component({
  selector: 'app-marketplace-page',
  standalone: true,
  imports: [CommunityHubComponent],
  template: `<app-community-hub></app-community-hub>`
})
export class MarketplacePageComponent {}
