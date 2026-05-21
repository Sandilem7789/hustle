import { Component, inject, computed, ViewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { UnifiedAuthService } from './services/unified-auth.service';
import { DriverAuthService } from './services/driver-auth.service';
import { OfflineBannerComponent } from './components/offline-banner/offline-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, CommonModule,
    MatSidenavModule, MatToolbarModule, MatIconModule,
    MatButtonModule, MatListModule, MatDividerModule,
    OfflineBannerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  readonly unifiedAuth = inject(UnifiedAuthService);
  readonly driverAuth  = inject(DriverAuthService);
  private readonly router = inject(Router);

  readonly isDriver = computed(() => this.driverAuth.isLoggedIn());

  logout(): void {
    this.unifiedAuth.logout();
    this.driverAuth.logout();
    this.router.navigate(['/marketplace']);
  }
}
