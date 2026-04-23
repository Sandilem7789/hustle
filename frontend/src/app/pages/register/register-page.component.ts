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
      <div class="tab-card" [class.login-mode]="activeTab() === 'login'" [class.register-mode]="activeTab() === 'register'">
        <div class="tabs">
          <button [class.active]="activeTab() === 'login'" (click)="activeTab.set('login')">Login</button>
          <button [class.active]="activeTab() === 'register'" (click)="activeTab.set('register')">Register</button>
        </div>

        <!-- LOGIN FORM -->
        <div *ngIf="activeTab() === 'login'" class="form-section login-section">
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
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    .tab-card {
      background: white;
      border-radius: 1.5rem;
      box-shadow: 0 4px 24px rgba(28,25,23,0.08);
      border: 1px solid #E7E5E4;
      overflow: hidden;
      width: 100%;
      margin: 0 auto;
      transition: max-width 0.3s ease;
      animation: cardIn 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
      will-change: transform, opacity;
    }
    .tab-card.login-mode { max-width: 460px; }
    .tab-card.register-mode { max-width: 100%; }
    .tabs {
      display: flex;
      border-bottom: 2px solid #E7E5E4;
    }
    .tabs button {
      flex: 1;
      padding: 1rem;
      border: none;
      background: none;
      font-size: 1rem;
      font-weight: 700;
      color: #A8A29E;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      min-height: 48px;
    }
    .tabs button.active {
      color: #1C1917;
      border-bottom: 2px solid #F5B800;
      margin-bottom: -2px;
    }
    .form-section { padding: 2rem; }
    @media (max-width: 600px) { .form-section { padding: 1.25rem; } }
    .login-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2.5rem 2rem;
    }
    .login-section h2 { margin: 0 0 0.4rem; color: #1C1917; }
    .login-section .muted { margin: 0; color: #78716C; }
    .login-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1.5rem;
      width: 100%;
      text-align: left;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.875rem;
      font-weight: 700;
      color: #1C1917;
    }
    input {
      border-radius: 0.75rem;
      border: 2px solid #E7E5E4;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-family: inherit;
      font-weight: 600;
      width: 100%;
      box-sizing: border-box;
      min-height: 48px;
      background: white;
      color: #1C1917;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); }
    .primary {
      border: none;
      border-radius: 999px;
      padding: 0.9rem;
      font-size: 1rem;
      font-weight: 800;
      background: #F5B800;
      color: #1C1917;
      cursor: pointer;
      font-family: inherit;
      min-height: 48px;
      box-shadow: 0 4px 12px rgba(245,184,0,0.35);
      transition: box-shadow 0.15s;
    }
    .primary:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }
    .primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .error { color: #E53935; font-weight: 700; margin-top: 0.75rem; }
    .switch-hint { margin-top: 1.5rem; color: #78716C; font-size: 0.9rem; }
    .link-btn { background: none; border: none; color: #00A896; font-weight: 800; cursor: pointer; font-size: inherit; padding: 0; font-family: inherit; }
    .link-btn:hover { text-decoration: underline; }
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
        const role = res.role;
        if (role === 'COORDINATOR') {
          this.router.navigate(['/coordinator']);
        } else if (role === 'FACILITATOR') {
          this.router.navigate(['/facilitator']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loginLoading.set(false);
        this.loginError.set(err?.error?.message || err?.message || 'Login failed. Please check your details.');
      }
    });
  }
}
