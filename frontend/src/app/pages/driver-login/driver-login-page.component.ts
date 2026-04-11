import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { DriverAuthService } from '../../services/driver-auth.service';

@Component({
  selector: 'app-driver-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="layout">
      <div class="card">
        <div class="card-header">
          <h1>🚗 Driver Login</h1>
          <p class="muted">Sign in to your driver account</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="form">
          <div class="field">
            <label for="phone">Phone Number *</label>
            <input id="phone" type="tel" [(ngModel)]="phone" name="phone" placeholder="e.g. 0812345678" required />
          </div>

          <div class="field">
            <label for="password">Password *</label>
            <input id="password" type="password" [(ngModel)]="password" name="password" placeholder="Your password" required />
          </div>

          <p *ngIf="errorMsg()" class="error-msg">{{ errorMsg() }}</p>

          <button type="submit" class="btn-primary" [disabled]="loading()">
            {{ loading() ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>

        <p class="register-link">
          New driver? <a routerLink="/driver/register">Register here</a>
        </p>
      </div>
    </div>
  `,
  styles: `
    .layout { max-width: 420px; margin: 0 auto; padding: 1.5rem 1rem 5rem; }
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 25px 60px rgba(15,23,42,0.12); }
    @media (max-width: 600px) { .card { padding: 1.5rem 1.25rem; } }
    .card-header { margin-bottom: 1.5rem; }
    .card-header h1 { margin: 0 0 0.35rem; font-size: 1.5rem; color: #0f172a; }
    .muted { color: #475569; font-size: 0.9rem; }
    .form { display: flex; flex-direction: column; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    label { font-size: 0.875rem; font-weight: 600; color: #374151; display: block; }
    input { height: 48px; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0 1rem; font-size: 1rem; width: 100%; box-sizing: border-box; font-family: inherit; background: white; }
    input:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
    .btn-primary { height: 48px; border: none; border-radius: 0.75rem; font-size: 1rem; font-weight: 600; background: linear-gradient(135deg, #0ea5e9, #22c55e); color: white; cursor: pointer; font-family: inherit; width: 100%; margin-top: 0.5rem; transition: opacity 0.15s; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { color: #dc2626; font-size: 0.875rem; font-weight: 600; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 0; }
    .register-link { text-align: center; margin-top: 1.25rem; font-size: 0.9rem; color: #475569; }
    .register-link a { color: #0ea5e9; font-weight: 600; text-decoration: none; }
    .register-link a:hover { text-decoration: underline; }
  `
})
export class DriverLoginPageComponent {
  private readonly api = inject(ApiService);
  private readonly driverAuth = inject(DriverAuthService);
  private readonly router = inject(Router);

  phone = '';
  password = '';
  loading = signal(false);
  errorMsg = signal('');

  onSubmit(): void {
    this.errorMsg.set('');
    if (!this.phone || !this.password) {
      this.errorMsg.set('Please enter your phone number and password.');
      return;
    }

    this.loading.set(true);
    this.api.loginDriver({ phone: this.phone, password: this.password }).subscribe({
      next: (res) => {
        this.driverAuth.login({
          token: res.token,
          driverId: res.driverId,
          firstName: res.firstName,
          lastName: res.lastName,
          vehicleType: res.vehicleType,
          communityName: res.communityName
        });
        this.router.navigate(['/driver']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'Login failed. Please check your credentials.');
      }
    });
  }
}
