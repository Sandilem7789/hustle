import { Component } from '@angular/core';
import { RegistrationFormComponent } from './components/registration-form/registration-form.component';
import { FacilitatorQueueComponent } from './components/facilitator-queue/facilitator-queue.component';
import { CommunityHubComponent } from './components/community-hub/community-hub.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RegistrationFormComponent, FacilitatorQueueComponent, CommunityHubComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {}
