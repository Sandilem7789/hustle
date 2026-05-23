import { Routes } from '@angular/router';
import { MarketplacePageComponent } from './pages/marketplace/marketplace-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { HustlerDashboardPageComponent } from './pages/hustler-dashboard/hustler-dashboard-page.component';
import { FacilitatorPageComponent } from './pages/facilitator/facilitator-page.component';
import { CoordinatorPageComponent } from './pages/coordinator/coordinator-page.component';
import { OperationsPageComponent } from './pages/operations/operations-page.component';
import { BusinessPageComponent } from './pages/business/business-page.component';
import { CheckoutPageComponent } from './pages/checkout/checkout-page.component';
import { CustomerOrdersPageComponent } from './pages/customer-orders/customer-orders-page.component';
import { DriverDashboardPageComponent } from './pages/driver-dashboard/driver-dashboard-page.component';
import { DriverLoginPageComponent } from './pages/driver-login/driver-login-page.component';
import { DriverRegisterPageComponent } from './pages/driver-register/driver-register-page.component';
import { RegistrationFormComponent } from './components/registration-form/registration-form.component';
import { NotificationsPageComponent } from './pages/notifications/notifications-page.component';

export const routes: Routes = [
  // Public landing
  { path: '',            redirectTo: 'marketplace', pathMatch: 'full' },
  { path: 'marketplace', component: MarketplacePageComponent },
  { path: 'business/:businessId', component: BusinessPageComponent },

  // Unified auth entry point
  { path: 'login',  component: LoginPageComponent },

  // Apply to become a hustler (requires login — component handles the gate)
  { path: 'apply',  component: RegistrationFormComponent },

  // Hustler dashboard
  { path: 'dashboard', component: HustlerDashboardPageComponent },

  // Customer
  { path: 'checkout',       component: CheckoutPageComponent },
  { path: 'orders',         component: CustomerOrdersPageComponent },
  { path: 'notifications',  component: NotificationsPageComponent },

  // Staff portals
  { path: 'facilitator', component: FacilitatorPageComponent },
  { path: 'coordinator', component: CoordinatorPageComponent },
  { path: 'operations',  component: OperationsPageComponent },

  // Driver (keeps its own auth for now)
  { path: 'driver',          component: DriverDashboardPageComponent },
  { path: 'driver/login',    component: DriverLoginPageComponent },
  { path: 'driver/register', component: DriverRegisterPageComponent },

  // Legacy redirects — old routes point to new equivalents
  { path: 'register',          redirectTo: 'login',      pathMatch: 'full' },
  { path: 'customer/login',    redirectTo: 'login',      pathMatch: 'full' },
  { path: 'customer/register', redirectTo: 'login',      pathMatch: 'full' },

  { path: '**', redirectTo: 'marketplace' },
];
