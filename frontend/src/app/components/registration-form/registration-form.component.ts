import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ApiService, Community } from '../../services/api.service';

function passwordMatch(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-registration-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <header>
        <p class="eyebrow">Step 1</p>
        <h2>Register your hustle</h2>
        <p class="muted">Tell facilitators who you are, what you sell, and where you operate.</p>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="grid">
        <label>
          <span>First name *</span>
          <input formControlName="firstName" />
        </label>
        <label>
          <span>Last name *</span>
          <input formControlName="lastName" />
        </label>
        <label>
          <span>Email</span>
          <input type="email" formControlName="email" />
        </label>
        <label>
          <span>Phone number *</span>
          <input type="tel" formControlName="phone" placeholder="e.g. 0821234567" />
        </label>
        <label>
          <span>ID no. *</span>
          <input formControlName="idNumber" placeholder="SA Identity Document number" />
        </label>
        <label>
          <span>Community *</span>
          <select formControlName="communityName">
            <option value="" disabled>Select your community…</option>
            <option *ngFor="let c of communities()" [value]="c.name">{{ c.name }}</option>
          </select>
        </label>
        <label class="span-2">
          <span>Business name *</span>
          <input formControlName="businessName" />
        </label>
        <label>
          <span>Business type *</span>
          <select formControlName="businessType">
            <option value="" disabled>Select type…</option>
            <option value="Service">Service</option>
            <option value="Product">Product</option>
            <option value="Service & Products">Service &amp; Products</option>
          </select>
        </label>
        <label class="span-2">
          <span>Short description *</span>
          <textarea rows="3" formControlName="description"></textarea>
        </label>
        <label class="span-2">
          <span>Vision</span>
          <textarea rows="2" formControlName="vision"></textarea>
        </label>
        <label class="span-2">
          <span>Mission / support needed</span>
          <textarea rows="2" formControlName="mission"></textarea>
        </label>
        <label class="span-2">
          <span>Target customers *</span>
          <textarea rows="2" formControlName="targetCustomers"></textarea>
        </label>
        <label>
          <span>Operating area *</span>
          <input formControlName="operatingArea" />
        </label>
        <label>
          <span>Latitude</span>
          <input type="number" step="0.0001" formControlName="latitude" />
        </label>
        <label>
          <span>Longitude</span>
          <input type="number" step="0.0001" formControlName="longitude" />
        </label>

        <div class="divider span-2">
          <span>Account access</span>
        </div>

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

        <button class="primary span-2" type="submit" [disabled]="loading() || form.invalid">
          {{ loading() ? 'Submitting…' : 'Submit application' }}
        </button>
      </form>

      <p *ngIf="statusMessage()" [class.success]="statusKind() === 'success'" [class.error]="statusKind() === 'error'" class="status-msg">
        {{ statusMessage() }}
      </p>
    </section>
  `,
  styles: `
    .card {
      background: white;
      border-radius: 1.5rem;
      padding: 2rem;
      box-shadow: 0 25px 60px rgba(15, 23, 42, 0.12);
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
    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: #475569;
    }
    label.span-2 { grid-column: span 2; }
    @media (max-width: 600px) { label.span-2 { grid-column: span 1; } }
    input, textarea, select {
      border-radius: 0.8rem;
      border: 1px solid #cbd5e1;
      padding: 0.65rem 0.9rem;
      font-size: 1rem;
      font-family: inherit;
      width: 100%;
      box-sizing: border-box;
      background: white;
    }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #0ea5e9;
      box-shadow: 0 0 0 3px rgba(14,165,233,0.15);
    }
    .divider {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-top: 0.5rem;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e2e8f0;
    }
    .primary {
      border: none;
      border-radius: 999px;
      padding: 0.9rem 1.5rem;
      font-size: 1rem;
      font-weight: 700;
      background: linear-gradient(120deg, #0ea5e9, #22c55e);
      color: white;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .primary.span-2 { grid-column: span 2; }
    @media (max-width: 600px) { .primary.span-2 { grid-column: span 1; } }
    .err { color: #dc2626; font-size: 0.8rem; }
    .status-msg { margin-top: 1rem; font-weight: 600; }
    .success { color: #16a34a; }
    .error { color: #dc2626; }
    small { color: #94a3b8; }
  `
})
export class RegistrationFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  communities = signal<Community[]>([]);

  ngOnInit(): void {
    this.api.listCommunities().subscribe(c => this.communities.set(c));
  }

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [''],
    phone: ['', Validators.required],
    idNumber: ['', Validators.required],
    communityName: ['', Validators.required],
    businessName: ['', Validators.required],
    businessType: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(10)]],
    vision: ['', Validators.required],
    mission: ['', Validators.required],
    targetCustomers: ['', Validators.required],
    operatingArea: ['', Validators.required],
    latitude: [null as number | null],
    longitude: [null as number | null],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatch });

  loading = signal(false);
  statusMessage = signal('');
  statusKind = signal<'success' | 'error' | ''>('');

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.statusMessage.set('');
    const { confirmPassword, ...payload } = this.form.value;
    this.api.createHustlerApplication(payload as Record<string, unknown>).subscribe({
      next: () => {
        this.loading.set(false);
        this.statusKind.set('success');
        this.statusMessage.set('Application submitted! A facilitator will review it soon.');
        this.form.reset();
      },
      error: (err) => {
        this.loading.set(false);
        this.statusKind.set('error');
        this.statusMessage.set(err?.error?.message || 'Something went wrong. Please try again.');
      }
    });
  }
}
