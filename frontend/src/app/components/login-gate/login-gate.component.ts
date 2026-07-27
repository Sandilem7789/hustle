import { Component, Input, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UnifiedAuthService } from '../../services/unified-auth.service';

@Component({
  selector: 'app-login-gate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="gate-shell">
      <div class="gate-card">
        <div class="gate-icon" aria-hidden="true">{{ icon }}</div>
        <h2 class="gate-title">{{ title }}</h2>
        <p class="gate-sub">{{ subtitle }}</p>

        <div *ngIf="alreadyLoggedIn()" class="gate-notice">
          Signed in as <strong>{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</strong> ({{ currentRoleLabel() | titlecase }}).
          Sign in with a different account to continue.
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="gate-form">
          <label>
            <span>Phone number</span>
            <input type="tel" formControlName="phone" placeholder="e.g. 0821234567" autocomplete="tel" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" formControlName="password" autocomplete="current-password" />
          </label>
          <button type="submit" class="gate-btn" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p *ngIf="error()" class="gate-error">{{ error() }}</p>
      </div>
    </div>
  `,
  styles: `
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    .gate-shell {
      min-height: calc(100vh - 140px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
    }
    .gate-card {
      background: #fff;
      border: 1px solid #E7E5E4;
      border-radius: 1.5rem;
      box-shadow: 0 4px 24px rgba(28,25,23,0.08);
      padding: 2rem 1.5rem;
      width: 100%;
      max-width: 400px;
      text-align: center;
      animation: cardIn 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
      will-change: transform, opacity;
    }
    .gate-icon {
      font-size: 3rem;
      line-height: 1;
      margin-bottom: 0.75rem;
    }
    .gate-title {
      font-size: 1.25rem;
      font-weight: 900;
      color: #1C1917;
      margin: 0 0 0.35rem;
    }
    .gate-sub {
      font-size: 0.875rem;
      color: #78716C;
      margin: 0 0 1.25rem;
    }
    .gate-notice {
      background: rgba(245,184,0,0.1);
      border: 1px solid rgba(245,184,0,0.3);
      border-radius: 0.75rem;
      padding: 0.6rem 0.9rem;
      font-size: 0.8125rem;
      color: #78716C;
      margin-bottom: 1rem;
      text-align: left;
    }
    .gate-form {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      text-align: left;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #1C1917;
    }
    input {
      border: 2px solid #E7E5E4;
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-family: inherit;
      font-weight: 600;
      min-height: 48px;
      width: 100%;
      box-sizing: border-box;
      background: #fff;
      color: #1C1917;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); }
    .gate-btn {
      border: none;
      border-radius: 999px;
      padding: 0.875rem;
      font-size: 1rem;
      font-weight: 800;
      background: #F5B800;
      color: #1C1917;
      cursor: pointer;
      font-family: inherit;
      min-height: 48px;
      box-shadow: 0 4px 12px rgba(245,184,0,0.35);
      transition: box-shadow 0.15s, opacity 0.15s;
      margin-top: 0.25rem;
    }
    .gate-btn:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }
    .gate-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .gate-error {
      color: #E53935;
      font-size: 0.8125rem;
      font-weight: 700;
      margin: 0.75rem 0 0;
      text-align: center;
    }
  `
})
export class LoginGateComponent {
  @Input() title = 'Sign in to continue';
  @Input() subtitle = 'Enter your credentials to access this section.';
  @Input() icon = '🔒';
  @Input() requiredRoles: string[] = [];

  readonly auth = inject(UnifiedAuthService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly alreadyLoggedIn = () => this.auth.isLoggedIn();

  readonly currentRoleLabel = computed(() => {
    const roles = this.auth.user()?.roles ?? [];
    return roles.find(r => r === 'FACILITATOR' || r === 'COORDINATOR' || r === 'HUSTLER') ?? roles[0] ?? '';
  });

  readonly form = this.fb.group({
    phone: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { phone, password } = this.form.value;

    try {
      const user = await this.auth.login({ phone: phone!, password: password! });
      if (this.requiredRoles.length > 0 && !this.requiredRoles.some(r => user.roles?.includes(r))) {
        const role = user.roles?.[0] || 'unknown role';
        this.error.set(`This account (${role}) does not have access to this section.`);
      }
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Invalid phone or password.');
    } finally {
      this.loading.set(false);
    }
  }
}
