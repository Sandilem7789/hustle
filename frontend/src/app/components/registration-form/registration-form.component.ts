import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Community } from '../../services/api.service';
import { AppSelectComponent } from '../app-select/app-select.component';
import { UnifiedAuthService } from '../../services/unified-auth.service';

function passwordMatch(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AppSelectComponent],
  template: `
    <section class="card">
      <header>
        <p class="eyebrow">Hustler Application</p>
        <h2>Join Hustle Economy</h2>
        <p class="muted">Tell facilitators who you are, what you sell, and where you operate.</p>
      </header>

      <form [formGroup]="form" (ngSubmit)="openTerms()" class="grid">

        <div class="prefill-notice span-2" *ngIf="unifiedAuth.isLoggedIn()">
          Your name and phone number have been pre-filled from your account.
        </div>

        <label [class.prefilled]="unifiedAuth.isLoggedIn()">
          <span>First name *</span>
          <input formControlName="firstName" />
        </label>
        <label [class.prefilled]="unifiedAuth.isLoggedIn()">
          <span>Last name *</span>
          <input formControlName="lastName" />
        </label>
        <label>
          <span>Email</span>
          <input type="email" formControlName="email" placeholder="e.g. name@gmail.com" />
        </label>
        <label [class.prefilled]="unifiedAuth.isLoggedIn()">
          <span>Phone number *</span>
          <input type="tel" formControlName="phone" placeholder="e.g. 0821234567" />
        </label>
        <label>
          <span>SA Identity Number *</span>
          <input formControlName="idNumber" placeholder="13-digit SA ID number" />
        </label>
        <label>
          <span>Community *</span>
          <app-select formControlName="communityName" [options]="communityOpts()" placeholder="Select your community…"></app-select>
        </label>
        <label class="span-2">
          <span>Business name *</span>
          <input formControlName="businessName" />
        </label>
        <label>
          <span>Business type *</span>
          <app-select formControlName="businessType" [options]="businessTypeOpts" placeholder="Select type…"></app-select>
        </label>
        <label class="span-2">
          <span>Short description *</span>
          <textarea rows="3" formControlName="description" placeholder="What do you sell and what makes your business special?"></textarea>
        </label>
        <label class="span-2">
          <span>Vision</span>
          <textarea rows="2" formControlName="vision" placeholder="Where do you see your business in 2–3 years?"></textarea>
        </label>
        <label class="span-2">
          <span>Mission / support needed</span>
          <textarea rows="2" formControlName="mission" placeholder="What kind of support would help you grow?"></textarea>
        </label>
        <label class="span-2">
          <span>Target customers *</span>
          <textarea rows="2" formControlName="targetCustomers" placeholder="Who are your main customers?"></textarea>
        </label>
        <label class="span-2">
          <span>Operating area *</span>
          <input formControlName="operatingArea" placeholder="e.g. KwaNgwenya village and surrounding areas" />
        </label>

        <!-- Account access — only shown when NOT already logged in -->
        <ng-container *ngIf="!unifiedAuth.isLoggedIn()">
          <div class="divider span-2"><span>Account access</span></div>
          <label>
            <span>Password * <small>(min 6 characters)</small></span>
            <input type="password" formControlName="password" />
          </label>
          <label>
            <span>Confirm password *</span>
            <input type="password" formControlName="confirmPassword" />
            <small class="err" *ngIf="form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched">
              Passwords do not match
            </small>
          </label>
        </ng-container>

        <button class="primary span-2" type="submit" [disabled]="loading() || form.invalid">
          Review &amp; Submit
        </button>
      </form>

      <p *ngIf="statusMessage() && statusKind() === 'error'" class="status-msg error">
        {{ statusMessage() }}
      </p>
    </section>

    <!-- ── Success Modal ─────────────────────────────────────────── -->
    <div class="success-overlay" *ngIf="showSuccessModal()">
      <div class="success-modal">
        <div class="success-check-circle">
          <span class="success-check">&#10003;</span>
        </div>
        <h3 class="success-title">Application Submitted!</h3>
        <p class="success-body">
          A facilitator will review your application and get back to you soon.
        </p>
        <div class="success-tip">
          <div class="tip-bell">
            <span class="tip-bell-icon">&#128276;</span>
          </div>
          <div class="tip-text">
            <strong>Where to check for updates</strong>
            <p>Open the side menu and tap <strong>Notifications</strong> — that's where you'll see your application status and any messages from the team.</p>
          </div>
        </div>
        <button class="success-ok-btn" (click)="onSuccessOk()">OK, got it</button>
      </div>
    </div>

    <!-- ── Terms & Agreement Overlay ────────────────────────────── -->
    <div class="terms-overlay" *ngIf="showTerms()">
      <div class="terms-modal">

        <div class="terms-header">
          <h3>Hustler Agreement</h3>
          <p class="terms-sub">Read the full agreement before signing. Scroll to the bottom to unlock the Done button.</p>
        </div>

        <div class="terms-body" (scroll)="onTermsScroll($event)">
          <h4>HUSTLE ECONOMY — SELLER (HUSTLER) AGREEMENT</h4>
          <p>This agreement governs your participation as a seller on the Hustle Economy platform. By signing below you confirm you have read, understood, and agreed to all terms.</p>

          <h5>1. ELIGIBILITY &amp; TRUTHFULNESS</h5>
          <p>You declare that all information in this application is accurate and complete. You are at least 18 years of age. Providing false information may result in rejection or permanent termination of your account.</p>

          <h5>2. PRODUCT &amp; SERVICE QUALITY</h5>
          <p>You take full responsibility for the quality, legality, and safety of every product or service you list. Selling counterfeit, illegal, or harmful goods is strictly prohibited and may result in criminal referral.</p>

          <h5>3. ORDER FULFILMENT</h5>
          <p>You commit to fulfilling every confirmed order within the agreed time. If you cannot fulfil an order you must notify the customer and the platform immediately to arrange a resolution or refund.</p>

          <h5>4. PRICING &amp; COMMISSIONS</h5>
          <p>You set your own prices. A platform commission, as communicated by your Facilitator, may apply to marketplace sales. You will be notified of any changes to commission rates before they take effect.</p>

          <h5>5. COMMUNITY CONDUCT</h5>
          <p>You represent your community as a Hustle Economy seller. Treat every customer, Facilitator, and fellow Hustler with honesty and respect. Fraud, abuse, or discrimination results in immediate suspension and may result in legal action.</p>

          <h5>6. LOCATION VERIFICATION</h5>
          <p>Your business GPS coordinates will be recorded by your Facilitator during the in-person verification visit. This data is used to calculate delivery distances and display your listing to nearby customers. It is not shared publicly.</p>

          <h5>7. DATA &amp; PRIVACY</h5>
          <p>Your personal information is used solely to operate your account, process orders, and communicate platform updates. It is never sold to third parties. You may request deletion of your data at any time by contacting your Facilitator.</p>

          <h5>8. PAYMENTS &amp; PAYOUTS</h5>
          <p>Marketplace earnings are disbursed according to the payout schedule agreed with your Facilitator. Cash sales made outside the platform are your own responsibility. The platform bears no liability for cash disputes.</p>

          <h5>9. CHANGES TO TERMS</h5>
          <p>Hustle Economy may update these terms from time to time. You will be notified and must accept the updated terms to continue selling on the platform.</p>

          <h5>10. TERMINATION</h5>
          <p>Hustle Economy may suspend or permanently remove any seller account that violates these terms, harms customers, engages in fraudulent activity, or brings the platform or the community into disrepute.</p>

          <p class="terms-end-marker">— End of Agreement —</p>
        </div>

        <div class="terms-footer">
          <p class="scroll-hint" *ngIf="!hasScrolledToBottom()">
            Scroll to the end of the agreement above to continue.
          </p>

          <label class="sig-label">Type your full name as your digital signature *</label>
          <input
            type="text"
            class="sig-input"
            [(ngModel)]="signatureName"
            placeholder="e.g. Sipho Nkosi"
            [disabled]="!hasScrolledToBottom()"
          />

          <label class="agree-row">
            <input type="checkbox" [(ngModel)]="agreedToTerms" [disabled]="!hasScrolledToBottom()" />
            <span>I have read the full agreement and I accept these terms</span>
          </label>

          <div class="terms-actions">
            <button class="btn-cancel" type="button" (click)="showTerms.set(false)">Back</button>
            <button
              class="primary"
              type="button"
              [disabled]="!agreedToTerms || !signatureName.trim() || !hasScrolledToBottom() || loading()"
              (click)="confirmSubmit()"
            >
              {{ loading() ? 'Submitting…' : 'Done — Submit Application' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: `
    .card {
      background: white;
      border-radius: 1.5rem;
      padding: 2rem;
      box-shadow: 0 4px 24px rgba(28,25,23,0.08);
      border: 1px solid #E7E5E4;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    @media (max-width: 600px) {
      .card { padding: 1.25rem; border-radius: 1rem; }
      .grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
    }

    /* Pre-fill notice */
    .prefill-notice {
      background: rgba(0, 168, 150, 0.08);
      border: 1px solid rgba(0, 168, 150, 0.25);
      border-radius: 0.75rem;
      padding: 0.625rem 0.875rem;
      font-size: 0.85rem;
      color: #00665E;
      font-weight: 600;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      font-size: 0.875rem;
      font-weight: 700;
      color: #1C1917;
    }
    label.span-2 { grid-column: span 2; }
    @media (max-width: 600px) { label.span-2 { grid-column: span 1; } }

    /* Auto-filled locked fields */
    label.prefilled input {
      background: rgba(245, 184, 0, 0.06);
      border-color: rgba(245, 184, 0, 0.4);
      color: #78716C;
      cursor: not-allowed;
    }

    input, textarea, select {
      border-radius: 0.75rem;
      border: 2px solid #E7E5E4;
      padding: 0.65rem 0.9rem;
      font-size: 1rem;
      font-family: inherit;
      font-weight: 600;
      width: 100%;
      box-sizing: border-box;
      background: white;
      color: #1C1917;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      min-height: 48px;
    }
    input:focus, textarea:focus, select:focus {
      border-color: #F5B800;
      box-shadow: 0 0 0 3px rgba(245,184,0,0.2);
    }
    input:disabled { opacity: 0.7; cursor: not-allowed; }

    .divider {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #A8A29E;
      margin-top: 0.5rem;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #E7E5E4;
    }

    .primary {
      border: none;
      border-radius: 999px;
      padding: 0.9rem 1.5rem;
      font-size: 1rem;
      font-weight: 800;
      background: #F5B800;
      color: #1C1917;
      cursor: pointer;
      font-family: inherit;
      min-height: 48px;
      box-shadow: 0 4px 12px rgba(245,184,0,0.35);
      transition: box-shadow 0.2s;
    }
    .primary:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }
    .primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .primary.span-2 { grid-column: span 2; }
    @media (max-width: 600px) { .primary.span-2 { grid-column: span 1; } }

    .err { color: #E53935; font-size: 0.8rem; font-weight: 700; }
    .status-msg.error { margin-top: 1rem; font-weight: 700; color: #E53935; }
    small { color: #A8A29E; font-weight: 600; }

    /* ── Success Modal ──────────────────────────────────────────── */
    .success-overlay {
      position: fixed;
      inset: 0;
      z-index: 1100;
      background: rgba(28,25,23,0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      animation: fadeIn 0.2s ease-out both;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .success-modal {
      background: white;
      border-radius: 1.5rem;
      padding: 2rem 1.5rem;
      max-width: 360px;
      width: 100%;
      text-align: center;
      box-shadow: 0 24px 64px rgba(28,25,23,0.25);
      animation: popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.88); }
      to   { opacity: 1; transform: scale(1); }
    }

    .success-check-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #2DB344;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .success-check {
      color: white;
      font-size: 2rem;
      font-weight: 900;
      line-height: 1;
    }

    .success-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #1C1917;
      margin: 0 0 0.5rem;
    }
    .success-body {
      font-size: 0.9rem;
      color: #78716C;
      line-height: 1.55;
      margin: 0 0 1.25rem;
    }

    .success-tip {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      text-align: left;
      background: rgba(0,168,150,0.07);
      border: 1px solid rgba(0,168,150,0.25);
      border-radius: 0.875rem;
      padding: 0.875rem;
      margin-bottom: 1.5rem;
    }
    .tip-bell {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0,168,150,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tip-bell-icon { font-size: 1.1rem; line-height: 1; }
    .tip-text strong {
      display: block;
      font-size: 0.825rem;
      font-weight: 800;
      color: #00665E;
      margin-bottom: 0.3rem;
    }
    .tip-text p {
      font-size: 0.8rem;
      color: #44403C;
      line-height: 1.5;
      margin: 0;
    }

    .success-ok-btn {
      width: 100%;
      height: 52px;
      border: none;
      border-radius: 999px;
      background: #F5B800;
      color: #1C1917;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      box-shadow: 0 4px 14px rgba(245,184,0,0.35);
      transition: box-shadow 0.15s;
    }
    .success-ok-btn:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }

    /* ── Terms Overlay ─────────────────────────────────────────── */
    .terms-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(28, 25, 23, 0.6);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 0;
    }
    @media (min-width: 600px) {
      .terms-overlay { align-items: center; padding: 1rem; }
    }

    .terms-modal {
      background: white;
      border-radius: 1.5rem 1.5rem 0 0;
      width: 100%;
      max-width: 640px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 -8px 40px rgba(28,25,23,0.2);
    }
    @media (min-width: 600px) {
      .terms-modal { border-radius: 1.5rem; max-height: 88vh; }
    }

    .terms-header {
      padding: 1.25rem 1.5rem 0.75rem;
      border-bottom: 1px solid #E7E5E4;
      flex-shrink: 0;
    }
    .terms-header h3 { margin: 0 0 0.25rem; font-size: 1.1rem; color: #1C1917; font-weight: 800; }
    .terms-sub { margin: 0; font-size: 0.8rem; color: #78716C; font-weight: 600; }

    .terms-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
      -webkit-overflow-scrolling: touch;
    }
    .terms-body h4 {
      font-size: 0.875rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1C1917;
      margin: 0 0 1rem;
    }
    .terms-body h5 {
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #F5B800;
      margin: 1.25rem 0 0.375rem;
    }
    .terms-body p {
      font-size: 0.875rem;
      line-height: 1.6;
      color: #44403C;
      margin: 0 0 0.5rem;
      font-weight: 400;
    }
    .terms-end-marker {
      text-align: center;
      color: #A8A29E;
      font-size: 0.8rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #E7E5E4;
    }

    .terms-footer {
      padding: 1rem 1.5rem 1.25rem;
      border-top: 1px solid #E7E5E4;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .scroll-hint {
      font-size: 0.8rem;
      color: #78716C;
      text-align: center;
      background: rgba(245, 184, 0, 0.08);
      border: 1px solid rgba(245, 184, 0, 0.3);
      border-radius: 0.5rem;
      padding: 0.5rem;
      margin: 0;
    }

    .sig-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #1C1917;
      display: block;
    }
    .sig-input {
      border-radius: 0.75rem;
      border: 2px solid #E7E5E4;
      padding: 0.65rem 0.9rem;
      font-size: 1rem;
      font-family: inherit;
      font-weight: 600;
      width: 100%;
      box-sizing: border-box;
      background: white;
      color: #1C1917;
      outline: none;
      min-height: 48px;
      transition: border-color 0.15s;
    }
    .sig-input:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); }
    .sig-input:disabled { opacity: 0.4; background: #F5F5F4; }

    .agree-row {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #44403C;
      cursor: pointer;
    }
    .agree-row input[type="checkbox"] {
      width: 18px;
      height: 18px;
      min-height: unset;
      flex-shrink: 0;
      margin-top: 2px;
      accent-color: #F5B800;
      cursor: pointer;
    }
    .agree-row span { line-height: 1.4; }

    .terms-actions {
      display: flex;
      gap: 0.75rem;
    }
    .btn-cancel {
      flex: 0 0 auto;
      height: 48px;
      border: 1.5px solid #E7E5E4;
      border-radius: 999px;
      background: white;
      color: #78716C;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      padding: 0 1.25rem;
      font-family: inherit;
      transition: border-color 0.15s;
    }
    .btn-cancel:hover { border-color: #A8A29E; }
    .terms-actions .primary { flex: 1; }
  `
})
export class RegistrationFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(ApiService);
  private readonly router = inject(Router);
  readonly unifiedAuth    = inject(UnifiedAuthService);

  communities = signal<Community[]>([]);

  communityOpts = computed(() => [
    { value: '', label: 'Select your community…' },
    ...this.communities().map(c => ({ value: c.name, label: c.name }))
  ]);

  readonly businessTypeOpts = [
    { value: 'Service', label: 'Service' },
    { value: 'Product', label: 'Product' },
    { value: 'Service & Products', label: 'Service & Products' },
  ];

  form = this.fb.group({
    firstName:       ['', Validators.required],
    lastName:        ['', Validators.required],
    email:           [''],
    phone:           ['', Validators.required],
    idNumber:        ['', Validators.required],
    communityName:   ['', Validators.required],
    businessName:    ['', Validators.required],
    businessType:    ['', Validators.required],
    description:     ['', [Validators.required, Validators.minLength(10)]],
    vision:          ['', Validators.required],
    mission:         ['', Validators.required],
    targetCustomers: ['', Validators.required],
    operatingArea:   ['', Validators.required],
    password:        ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatch });

  loading             = signal(false);
  statusMessage       = signal('');
  statusKind          = signal<'error' | ''>('');
  showTerms           = signal(false);
  showSuccessModal    = signal(false);
  hasScrolledToBottom = signal(false);
  agreedToTerms       = false;
  signatureName       = '';

  ngOnInit(): void {
    this.api.listCommunities().subscribe(c => this.communities.set(c));

    const user = this.unifiedAuth.user();
    if (user) {
      this.form.patchValue({
        firstName: user.firstName,
        lastName:  user.lastName,
        phone:     user.phone,
      });
      this.form.get('firstName')!.disable();
      this.form.get('lastName')!.disable();
      this.form.get('phone')!.disable();
      this.form.get('password')!.clearValidators();
      this.form.get('password')!.updateValueAndValidity();
      this.form.get('confirmPassword')!.clearValidators();
      this.form.get('confirmPassword')!.updateValueAndValidity();
    }
  }

  openTerms(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.agreedToTerms = false;
    this.signatureName = '';
    this.hasScrolledToBottom.set(false);
    this.showTerms.set(true);
  }

  onTermsScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      this.hasScrolledToBottom.set(true);
    }
  }

  confirmSubmit(): void {
    this.loading.set(true);
    this.statusMessage.set('');

    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      firstName:       raw.firstName,
      lastName:        raw.lastName,
      email:           raw.email || null,
      phone:           raw.phone,
      idNumber:        raw.idNumber,
      communityName:   raw.communityName,
      businessName:    raw.businessName,
      businessType:    raw.businessType,
      description:     raw.description,
      vision:          raw.vision,
      mission:         raw.mission,
      targetCustomers: raw.targetCustomers,
      operatingArea:   raw.operatingArea,
    };

    if (!this.unifiedAuth.isLoggedIn()) {
      payload['password'] = raw.password;
    }

    this.api.createHustlerApplication(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.showTerms.set(false);
        this.form.reset();
        this.showSuccessModal.set(true);
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.showTerms.set(false);
        this.statusKind.set('error');
        const msg = err?.error?.message;
        this.statusMessage.set(msg ? `Registration failed: ${msg}` : 'Registration failed. Please check your details and try again.');
      }
    });
  }

  onSuccessOk(): void {
    this.showSuccessModal.set(false);
    this.router.navigate(['/marketplace']);
  }
}
