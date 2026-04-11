import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CustomerAuthService } from '../../services/customer-auth.service';

@Component({
  selector: 'app-customer-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="layout">
      <div class="card">
        <div class="card-header">
          <h1>Customer Login</h1>
          <p class="muted">Sign in to shop at Hustle Economy</p>
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
          New to Hustle Economy? <a routerLink="/customer/register">Create an account</a>
        </p>
      </div>
    </div>
  `,
  styles: `
    .layout { max-width: 420px; margin: 0 auto; padding: 1.5rem 1rem 5rem; }
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 4px 24px rgba(28,25,23,0.08); border: 1px solid #E7E5E4; }
    @media (max-width: 600px) { .card { padding: 1.5rem 1.25rem; border-radius: 1rem; } }
    .card-header { margin-bottom: 1.5rem; }
    .card-header h1 { margin: 0 0 0.35rem; font-size: 1.5rem; color: #1C1917; font-weight: 800; }
    .muted { color: #78716C; font-size: 0.9rem; }
    .form { display: flex; flex-direction: column; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.375rem; }
    label { font-size: 0.875rem; font-weight: 700; color: #1C1917; display: block; }
    input { height: 48px; border: 2px solid #E7E5E4; border-radius: 0.75rem; padding: 0 1rem; font-size: 1rem; width: 100%; box-sizing: border-box; font-family: inherit; font-weight: 600; background: white; color: #1C1917; outline: none; transition: border-color 0.15s; }
    input:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); }
    .btn-primary { height: 48px; border: none; border-radius: 999px; font-size: 1rem; font-weight: 800; background: #F5B800; color: #1C1917; cursor: pointer; font-family: inherit; width: 100%; margin-top: 0.5rem; box-shadow: 0 4px 12px rgba(245,184,0,0.35); transition: box-shadow 0.15s; }
    .btn-primary:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .error-msg { color: #E53935; font-size: 0.875rem; font-weight: 700; background: rgba(229,57,53,0.06); border: 1px solid rgba(229,57,53,0.2); border-radius: 0.75rem; padding: 0.75rem 1rem; margin: 0; }
    .register-link { text-align: center; margin-top: 1.25rem; font-size: 0.9rem; color: #78716C; }
    .register-link a { color: #00A896; font-weight: 800; text-decoration: none; }
    .register-link a:hover { text-decoration: underline; }
  `
})
export class CustomerLoginPageComponent {
  private readonly api = inject(ApiService);
  private readonly customerAuth = inject(CustomerAuthService);
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
    this.api.loginCustomer({ phone: this.phone, password: this.password }).subscribe({
      next: (res) => {
        this.customerAuth.login({
          token: res.token,
          customerId: res.customerId,
          firstName: res.firstName,
          lastName: res.lastName,
          phone: res.phone
        });
        this.router.navigate(['/marketplace']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'Login failed. Please check your credentials.');
      }
    });
  }
}
