import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UnifiedAuthService } from '../../services/unified-auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslatePipe],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly auth   = inject(UnifiedAuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  readonly i18n = inject(TranslationService);

  mode = signal<'login' | 'register'>('login');

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
      this.loginError = this.i18n.t('auth.needPhonePassword');
      return;
    }
    this.loginLoading.set(true);
    try {
      await this.auth.login({ phone: this.loginPhone, password: this.loginPassword });
      this.router.navigateByUrl(this.returnUrl);
    } catch (err: any) {
      this.loginError = err?.error?.message ?? err?.message ?? this.i18n.t('auth.loginFailed');
    } finally {
      this.loginLoading.set(false);
    }
  }

  async onRegister(): Promise<void> {
    this.regError = '';
    if (!this.regFirstName || !this.regLastName || !this.regPhone || !this.regPassword) {
      this.regError = this.i18n.t('auth.fillAll');
      return;
    }
    if (this.regPassword !== this.regConfirm) {
      this.regError = this.i18n.t('auth.noMatch');
      return;
    }
    if (this.regPassword.length < 6) {
      this.regError = this.i18n.t('auth.tooShort');
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
      this.regError = err?.error?.message ?? err?.message ?? this.i18n.t('auth.registerFailed');
    } finally {
      this.regLoading.set(false);
    }
  }
}
