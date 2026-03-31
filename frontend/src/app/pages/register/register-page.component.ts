import { CommonModule } from '@angular/common';
import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { RegistrationFormComponent } from '../../components/registration-form/registration-form.component';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RegistrationFormComponent],
  template: `
    <section class="layout">
      <header class="hero">
        <p class="eyebrow">Hustler Dashboard</p>
        <h1>Join the Hustle Economy</h1>
        <p class="muted" style="color:rgba(255,255,255,0.7)">Register your business or log in to manage your products.</p>
      </header>

      <div class="tab-card">
        <div class="tabs">
          <button [class.active]="activeTab() === 'login'" (click)="activeTab.set('login')">Login</button>
          <button [class.active]="activeTab() === 'register'" (click)="activeTab.set('register')">Register</button>
        </div>

        <!-- LOGIN FORM -->
        <div *ngIf="activeTab() === 'login'" class="form-section">
          <h2>Welcome back</h2>
          <p class="muted">Log in with your phone number and password.</p>
          <form [formGroup]="loginForm" (ngSubmit)="login()" class="login-grid">
            <label>
              <span>Phone number</span>
              <input type="tel" formControlName="phone" placeholder="e.g. 0821234567" />
            </label>
            <label>
              <span>Password</span>
              <input type="password" formControlName="password" />
            </label>
            <button class="primary" type="submit" [disabled]="loginLoading() || loginForm.invalid">
              {{ loginLoading() ? 'Logging in…' : 'Login' }}
            </button>
          </form>
          <p *ngIf="loginError()" class="error">{{ loginError() }}</p>
          <p class="switch-hint">No account yet? <button class="link-btn" (click)="activeTab.set('register')">Register here</button></p>
        </div>

        <!-- REGISTER FORM -->
        <div *ngIf="activeTab() === 'register'" class="form-section">
          <app-registration-form></app-registration-form>
          <p class="switch-hint" style="margin-top:1rem">Already registered? <button class="link-btn" (click)="activeTab.set('login')">Login here</button></p>
        </div>
      </div>
    </section>
  `,
  styles: `
    .tab-card {
      background: white;
      border-radius: 1.5rem;
      box-shadow: 0 25px 60px rgba(15,23,42,0.12);
      overflow: hidden;
    }
    .tabs {
      display: flex;
      border-bottom: 2px solid #e2e8f0;
    }
    .tabs button {
      flex: 1;
      padding: 1rem;
      border: none;
      background: none;
      font-size: 1rem;
      font-weight: 600;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tabs button.active {
      color: #0ea5e9;
      border-bottom: 2px solid #0ea5e9;
      margin-bottom: -2px;
    }
    .form-section { padding: 2rem; }
    @media (max-width: 600px) { .form-section { padding: 1.25rem; } }
    .login-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.5rem;
      max-width: 420px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: #475569;
    }
    input {
      border-radius: 0.8rem;
      border: 1px solid #cbd5e1;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
    }
    input:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
    .primary {
      border: none;
      border-radius: 999px;
      padding: 0.9rem;
      font-size: 1rem;
      font-weight: 700;
      background: linear-gradient(120deg, #0ea5e9, #22c55e);
      color: white;
      cursor: pointer;
    }
    .primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .error { color: #dc2626; font-weight: 600; margin-top: 0.75rem; }
    .switch-hint { margin-top: 1.5rem; color: #64748b; font-size: 0.9rem; }
    .link-btn { background: none; border: none; color: #0ea5e9; font-weight: 700; cursor: pointer; font-size: inherit; padding: 0; }
  `
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  activeTab = signal<'login' | 'register'>('login');
  loginLoading = signal(false);
  loginError = signal('');

  loginForm = this.fb.group({
    phone: ['', Validators.required],
    password: ['', Validators.required],
  });

  login() {
    if (this.loginForm.invalid) return;
    this.loginLoading.set(true);
    this.loginError.set('');
    const { phone, password } = this.loginForm.value;
    this.api.login(phone!, password!).subscribe({
      next: (res) => {
        this.loginLoading.set(false);
        this.auth.login(res);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loginLoading.set(false);
        this.loginError.set(err?.error?.message || err?.message || 'Login failed. Please check your details.');
      }
    });
  }
}
