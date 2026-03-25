import { CommonModule } from '@angular/common';
import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';

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
          <span>First name</span>
          <input formControlName="firstName" required />
        </label>
        <label>
          <span>Last name</span>
          <input formControlName="lastName" required />
        </label>
        <label>
          <span>Email</span>
          <input type="email" formControlName="email" />
        </label>
        <label>
          <span>Phone</span>
          <input formControlName="phone" />
        </label>
        <label>
          <span>Community ID (optional)</span>
          <input formControlName="communityId" />
        </label>
        <label>
          <span>Community Name</span>
          <input formControlName="communityName" />
        </label>
        <label class="span-2">
          <span>Business name</span>
          <input formControlName="businessName" required />
        </label>
        <label>
          <span>Business type</span>
          <input formControlName="businessType" required />
        </label>
        <label class="span-2">
          <span>Short description</span>
          <textarea rows="3" formControlName="description"></textarea>
        </label>
        <label class="span-2">
          <span>Vision</span>
          <textarea rows="3" formControlName="vision"></textarea>
        </label>
        <label class="span-2">
          <span>Mission / support needed</span>
          <textarea rows="3" formControlName="mission"></textarea>
        </label>
        <label class="span-2">
          <span>Target customers</span>
          <textarea rows="3" formControlName="targetCustomers"></textarea>
        </label>
        <label>
          <span>Operating area</span>
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

        <button class="primary" type="submit" [disabled]="loading() || form.invalid">{{ loading() ? 'Submitting…' : 'Submit application' }}</button>
      </form>

      <p *ngIf="statusMessage()" [class.success]="statusKind() === 'success'" [class.error]="statusKind() === 'error'">
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
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: #475569;
    }
    label.span-2 {
      grid-column: span 2;
    }
    input,
    textarea {
      border-radius: 0.8rem;
      border: 1px solid #cbd5f5;
      padding: 0.65rem 0.9rem;
      font-size: 1rem;
      font-family: inherit;
    }
    .primary {
      grid-column: span 2;
      border: none;
      border-radius: 999px;
      padding: 0.85rem 1.5rem;
      font-size: 1rem;
      background: linear-gradient(120deg, #0ea5e9, #22c55e);
      color: white;
      cursor: pointer;
    }
    .success {
      color: #16a34a;
      margin-top: 1rem;
    }
    .error {
      color: #dc2626;
      margin-top: 1rem;
    }
  `
})
export class RegistrationFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [''],
    phone: [''],
    communityId: [''],
    communityName: [''],
    businessName: ['', Validators.required],
    businessType: ['', Validators.required],
    description: ['', Validators.required],
    vision: ['', Validators.required],
    mission: ['', Validators.required],
    targetCustomers: ['', Validators.required],
    operatingArea: ['', Validators.required],
    latitude: [''],
    longitude: ['']
  });

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
    this.api.createHustlerApplication(this.form.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.statusKind.set('success');
        this.statusMessage.set('Application submitted! A facilitator will review it.');
        this.form.reset();
      },
      error: (err) => {
        this.loading.set(false);
        this.statusKind.set('error');
        this.statusMessage.set(err?.error?.message || 'Something went wrong while submitting.');
      }
    });
  }
}
