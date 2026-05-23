import { Component, OnInit, inject, computed, ViewChild, ElementRef, signal } from '@angular/core';
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
export class AppComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('avatarInput') avatarInputRef!: ElementRef<HTMLInputElement>;

  readonly unifiedAuth = inject(UnifiedAuthService);
  readonly driverAuth  = inject(DriverAuthService);
  private readonly router = inject(Router);

  readonly isDriver = computed(() => this.driverAuth.isLoggedIn());
  avatarUrl = signal<string | null>(null);

  ngOnInit(): void {
    const userId = this.unifiedAuth.user()?.userId;
    if (userId) {
      this.avatarUrl.set(localStorage.getItem(`hustle_avatar_${userId}`));
    }
  }

  triggerAvatarUpload(): void {
    this.avatarInputRef?.nativeElement.click();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const userId = this.unifiedAuth.user()?.userId;
      if (userId) {
        localStorage.setItem(`hustle_avatar_${userId}`, dataUrl);
        this.avatarUrl.set(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  logout(): void {
    this.avatarUrl.set(null);
    this.unifiedAuth.logout();
    this.driverAuth.logout();
    this.router.navigate(['/marketplace']);
  }
}
