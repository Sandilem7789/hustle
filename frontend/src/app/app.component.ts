import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { CustomerAuthService } from './services/customer-auth.service';
import { DriverAuthService } from './services/driver-auth.service';
import { OfflineBannerComponent } from './components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, OfflineBannerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly customerAuth = inject(CustomerAuthService);
  readonly driverAuth = inject(DriverAuthService);
  private readonly router = inject(Router);

  showDashboardNav(): boolean {
    return this.auth.isLoggedIn();
  }

  showDriverNav(): boolean {
    return this.router.url.startsWith('/driver');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/register']);
  }
}
