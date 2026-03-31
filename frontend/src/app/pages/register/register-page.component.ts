import { Component } from '@angular/core';
import { RegistrationFormComponent } from '../../components/registration-form/registration-form.component';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [RegistrationFormComponent],
  template: `
    <section class="layout">
      <header class="hero">
        <p class="eyebrow">Hustle Economy · KwaZulu-Natal</p>
        <h1>Register your hustle</h1>
        <p class="muted">Tell facilitators who you are, what you sell, and where you operate.</p>
      </header>
      <app-registration-form></app-registration-form>
    </section>
  `
})
export class RegisterPageComponent {}
