import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, Community } from '../../services/api.service';
import { DriverAuthService } from '../../services/driver-auth.service';

@Component({
  selector: 'app-driver-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="layout">
      <div class="card" *ngIf="!registered()">
        <div class="card-header">
          <h1>🚗 Driver Registration</h1>
          <p class="muted">Join the Hustle Economy delivery network</p>
        </div>

        <form (ngSubmit)="onSubmit()" class="form">
          <div class="field-row">
            <div class="field">
              <label for="firstName">First Name *</label>
              <input id="firstName" type="text" [(ngModel)]="firstName" name="firstName" placeholder="e.g. Siyanda" required />
            </div>
            <div class="field">
              <label for="lastName">Last Name *</label>
              <input id="lastName" type="text" [(ngModel)]="lastName" name="lastName" placeholder="e.g. Ndlovu" required />
            </div>
          </div>

          <div class="field">
            <label for="phone">Phone Number *</label>
            <input id="phone" type="tel" [(ngModel)]="phone" name="phone" placeholder="e.g. 0812345678" required />
          </div>

          <div class="field">
            <label for="idNumber">SA ID Number *</label>
            <input id="idNumber" type="text" [(ngModel)]="idNumber" name="idNumber" placeholder="13-digit SA ID number" required maxlength="13" />
          </div>

          <div class="field">
            <label for="password">Password *</label>
            <input id="password" type="password" [(ngModel)]="password" name="password" placeholder="Choose a strong password" required />
          </div>

          <div class="field">
            <label for="confirmPassword">Confirm Password *</label>
            <input id="confirmPassword" type="password" [(ngModel)]="confirmPassword" name="confirmPassword" placeholder="Repeat password" required />
          </div>

          <div class="field">
            <label for="vehicleType">Vehicle Type *</label>
            <select id="vehicleType" [(ngModel)]="vehicleType" name="vehicleType" required>
              <option value="">— Select vehicle type —</option>
              <option value="BAKKIE">Bakkie</option>
              <option value="MOTORBIKE">Motorbike</option>
              <option value="CAR">Car</option>
              <option value="BICYCLE">Bicycle</option>
            </select>
          </div>

          <div class="field">
            <label for="community">Community *</label>
            <select id="community" [(ngModel)]="communityId" name="communityId" required>
              <option value="">— Select your community —</option>
              <option *ngFor="let c of communities()" [value]="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="field">
            <label>Licence / ID Photo</label>
            <input type="file" accept="image/*" (change)="onFileChange($event)" class="file-input" />
            <div *ngIf="licencePreview()" class="preview-wrap">
              <img [src]="licencePreview()!" alt="Licence preview" class="preview" />
            </div>
            <small *ngIf="uploadLoading()">Uploading photo…</small>
          </div>

          <p *ngIf="errorMsg()" class="error-msg">{{ errorMsg() }}</p>

          <button type="submit" class="btn-primary" [disabled]="loading() || uploadLoading()">
            {{ loading() ? 'Registering…' : 'Register as Driver' }}
          </button>
        </form>

        <p class="login-link">
          Already registered? <a routerLink="/driver/login">Login here</a>
        </p>
      </div>

      <!-- Success State -->
      <div class="card success-card" *ngIf="registered()">
        <div class="success-icon">⏳</div>
        <h2>Registration Submitted!</h2>
        <p class="muted">Your driver application is pending approval by a facilitator. You will be notified once your account is activated.</p>
        <a routerLink="/driver/login" class="btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:1.5rem;">Go to Login</a>
      </div>
    </div>
  `,
  styles: `
    .layout { max-width: 520px; margin: 0 auto; padding: 1.5rem 1rem 5rem; }
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 25px 60px rgba(15,23,42,0.12); }
    @media (max-width: 600px) { .card { padding: 1.5rem 1.25rem; } }
    .card-header { margin-bottom: 1.5rem; }
    .card-header h1 { margin: 0 0 0.35rem; font-size: 1.5rem; color: #0f172a; }
    .muted { color: #475569; font-size: 0.9rem; }
    .form { display: flex; flex-direction: column; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 500px) { .field-row { grid-template-columns: 1fr; } }
    label { font-size: 0.875rem; font-weight: 600; color: #374151; display: block; }
    input[type="text"], input[type="tel"], input[type="password"], select { height: 48px; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0 1rem; font-size: 1rem; width: 100%; box-sizing: border-box; font-family: inherit; background: white; }
    input:focus, select:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
    .file-input { border: none; padding: 0; font-size: 0.9rem; height: auto; }
    .preview-wrap { margin-top: 0.5rem; }
    .preview { width: 100%; max-height: 160px; object-fit: cover; border-radius: 0.75rem; border: 2px solid #e2e8f0; }
    small { color: #94a3b8; font-size: 0.8rem; }
    .btn-primary { height: 48px; border: none; border-radius: 0.75rem; font-size: 1rem; font-weight: 600; background: linear-gradient(135deg, #0ea5e9, #22c55e); color: white; cursor: pointer; font-family: inherit; width: 100%; margin-top: 0.5rem; transition: opacity 0.15s; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { color: #dc2626; font-size: 0.875rem; font-weight: 600; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 0; }
    .login-link { text-align: center; margin-top: 1.25rem; font-size: 0.9rem; color: #475569; }
    .login-link a { color: #0ea5e9; font-weight: 600; text-decoration: none; }
    .success-card { text-align: center; padding: 2.5rem 2rem; }
    .success-icon { font-size: 3rem; margin-bottom: 1rem; }
    .success-card h2 { margin: 0 0 0.5rem; color: #0f172a; }
  `
})
export class DriverRegisterPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly driverAuth = inject(DriverAuthService);
  private readonly router = inject(Router);

  firstName = '';
  lastName = '';
  phone = '';
  idNumber = '';
  password = '';
  confirmPassword = '';
  vehicleType = '';
  communityId = '';

  communities = signal<Community[]>([]);
  loading = signal(false);
  uploadLoading = signal(false);
  errorMsg = signal('');
  registered = signal(false);
  licencePreview = signal<string | null>(null);
  private licenceUrl: string | null = null;

  ngOnInit(): void {
    this.api.listCommunities().subscribe(c => this.communities.set(c));
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => this.licencePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload file (use a temp token if needed — driver not logged in yet, skip token)
    this.uploadLoading.set(true);
    // Without auth token, just store preview; real upload happens post-registration if needed
    // In production: either allow unauthenticated upload or handle separately
    this.uploadLoading.set(false);
    // Store file reference for later — simplified implementation
    this.licenceUrl = null; // Will be uploaded separately if backend requires it
  }

  onSubmit(): void {
    this.errorMsg.set('');

    if (!this.firstName || !this.lastName || !this.phone || !this.idNumber || !this.password || !this.vehicleType || !this.communityId) {
      this.errorMsg.set('Please fill in all required fields.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMsg.set('Passwords do not match.');
      return;
    }
    if (this.password.length < 6) {
      this.errorMsg.set('Password must be at least 6 characters.');
      return;
    }

    this.loading.set(true);
    const payload = {
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      idNumber: this.idNumber,
      password: this.password,
      vehicleType: this.vehicleType,
      communityId: this.communityId
    };

    this.api.registerDriver(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.registered.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message || 'Registration failed. Please try again.');
      }
    });
  }
}
