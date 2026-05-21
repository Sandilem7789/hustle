import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UnifiedAuthService } from '../../services/unified-auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTabsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly auth   = inject(UnifiedAuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  // Login form
  loginPhone    = '';
  loginPassword = '';
  loginError    = '';
  loginLoading  = signal(false);
  hideLoginPwd  = true;

  // Register form
  regFirstName  = '';
  regLastName   = '';
  regPhone      = '';
  regEmail      = '';
  regPassword   = '';
  regConfirm    = '';
  regError      = '';
  regLoading    = signal(false);
  hideRegPwd    = true;

  get returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('return') ?? '/marketplace';
  }

  async onLogin(): Promise<void> {
    this.loginError = '';
    if (!this.loginPhone || !this.loginPassword) {
      this.loginError = 'Please enter your phone and password.';
      return;
    }
    this.loginLoading.set(true);
    try {
      await this.auth.login({ phone: this.loginPhone, password: this.loginPassword });
      this.router.navigateByUrl(this.returnUrl);
    } catch (err: any) {
      this.loginError = err?.error?.message ?? err?.message ?? 'Login failed. Please try again.';
    } finally {
      this.loginLoading.set(false);
    }
  }

  async onRegister(): Promise<void> {
    this.regError = '';
    if (!this.regFirstName || !this.regLastName || !this.regPhone || !this.regPassword) {
      this.regError = 'Please fill in all required fields.';
      return;
    }
    if (this.regPassword !== this.regConfirm) {
      this.regError = 'Passwords do not match.';
      return;
    }
    if (this.regPassword.length < 6) {
      this.regError = 'Password must be at least 6 characters.';
      return;
    }
    this.regLoading.set(true);
    try {
      await this.auth.register({
        firstName: this.regFirstName,
        lastName:  this.regLastName,
        phone:     this.regPhone,
        email:     this.regEmail || undefined,
        password:  this.regPassword,
      });
      this.router.navigateByUrl(this.returnUrl);
    } catch (err: any) {
      this.regError = err?.error?.message ?? err?.message ?? 'Registration failed. Please try again.';
    } finally {
      this.regLoading.set(false);
    }
  }
}
