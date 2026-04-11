import { Routes } from '@angular/router';
import { RegisterPageComponent } from './pages/register/register-page.component';
import { FacilitatorPageComponent } from './pages/facilitator/facilitator-page.component';
import { MarketplacePageComponent } from './pages/marketplace/marketplace-page.component';
import { HustlerDashboardPageComponent } from './pages/hustler-dashboard/hustler-dashboard-page.component';
import { CustomerRegisterPageComponent } from './pages/customer-register/customer-register-page.component';
import { CustomerLoginPageComponent } from './pages/customer-login/customer-login-page.component';
import { CheckoutPageComponent } from './pages/checkout/checkout-page.component';
import { CustomerOrdersPageComponent } from './pages/customer-orders/customer-orders-page.component';
import { DriverRegisterPageComponent } from './pages/driver-register/driver-register-page.component';
import { DriverLoginPageComponent } from './pages/driver-login/driver-login-page.component';
import { DriverDashboardPageComponent } from './pages/driver-dashboard/driver-dashboard-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'marketplace', pathMatch: 'full' },
  { path: 'register', component: RegisterPageComponent },
  { path: 'dashboard', component: HustlerDashboardPageComponent },
  { path: 'facilitator', component: FacilitatorPageComponent },
  { path: 'marketplace', component: MarketplacePageComponent },
  { path: 'customer/register', component: CustomerRegisterPageComponent },
  { path: 'customer/login', component: CustomerLoginPageComponent },
  { path: 'checkout', component: CheckoutPageComponent },
  { path: 'orders', component: CustomerOrdersPageComponent },
  { path: 'driver/register', component: DriverRegisterPageComponent },
  { path: 'driver/login', component: DriverLoginPageComponent },
  { path: 'driver', component: DriverDashboardPageComponent },
  { path: '**', redirectTo: 'marketplace' }
];
