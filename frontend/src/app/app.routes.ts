import { Routes } from '@angular/router';
import { RegisterPageComponent } from './pages/register/register-page.component';
import { FacilitatorPageComponent } from './pages/facilitator/facilitator-page.component';
import { MarketplacePageComponent } from './pages/marketplace/marketplace-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'register', pathMatch: 'full' },
  { path: 'register', component: RegisterPageComponent },
  { path: 'facilitator', component: FacilitatorPageComponent },
  { path: 'marketplace', component: MarketplacePageComponent },
  { path: '**', redirectTo: 'register' }
];
