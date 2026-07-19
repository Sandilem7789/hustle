import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, SurveyAssignmentDetailResponse, SurveyQuestionResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';

@Component({
  selector: 'app-survey-form-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoginGateComponent],
  template: `
    <app-login-gate *ngIf="!auth.isLoggedIn()"
      icon="📝"
      title="Hustler Sign In"
      subtitle="Log in to fill in your survey."
    ></app-login-gate>

    <div class="layout" *ngIf="auth.isLoggedIn()">
      <p class="loading" *ngIf="loading()">Loading survey…</p>

      <div class="card error-card" *ngIf="error() && !assignment()">
        <p>{{ error() }}</p>
      </div>

      <ng-container *ngIf="assignment() as a">
        <div class="card header-card">
          <p class="eyebrow">{{ a.templateType | titlecase }} Survey</p>
          <h1>{{ a.templateName }}</h1>
          <p class="due" *ngIf="a.dueDate">Due {{ a.dueDate | date:'mediumDate' }}</p>
          <span class="status-badge" [class]="'st-' + a.status.toLowerCase()">{{ a.status | titlecase }}</span>
        </div>

        <div class="card question-card" *ngFor="let q of a.questions">
          <label class="q-label">
            {{ q.questionText }}
            <span class="req" *ngIf="q.required">*</span>
          </label>
          <p class="q-help" *ngIf="q.helpText">{{ q.helpText }}</p>

          <ng-container [ngSwitch]="q.questionType">
            <input *ngSwitchCase="'TEXT'" type="text" class="q-input"
                   [(ngModel)]="answers[q.id]" name="q_{{q.id}}" />

            <textarea *ngSwitchCase="'TEXTAREA'" class="q-input q-textarea" rows="4"
                      [(ngModel)]="answers[q.id]" name="q_{{q.id}}"></textarea>

            <input *ngSwitchCase="'NUMBER'" type="number" class="q-input"
                   [(ngModel)]="answers[q.id]" name="q_{{q.id}}" />

            <input *ngSwitchCase="'DATE'" type="date" class="q-input"
                   [(ngModel)]="answers[q.id]" name="q_{{q.id}}" />

            <div *ngSwitchCase="'SINGLE_CHOICE'" class="choice-group">
              <label class="choice-opt" *ngFor="let opt of q.options">
                <input type="radio" [name]="'q_' + q.id" [value]="opt"
                       [(ngModel)]="answers[q.id]" />
                <span>{{ opt }}</span>
              </label>
            </div>

            <div *ngSwitchCase="'MULTI_CHOICE'" class="choice-group">
              <label class="choice-opt" *ngFor="let opt of q.options">
                <input type="checkbox"
                       [checked]="isChecked(q.id, opt)"
                       (change)="toggleMultiOption(q.id, opt, $event)" />
                <span>{{ opt }}</span>
              </label>
            </div>
          </ng-container>
        </div>

        <p class="error-msg" *ngIf="error()">{{ error() }}</p>
        <p class="success-msg" *ngIf="successMsg()">{{ successMsg() }}</p>

        <div class="actions" *ngIf="a.status !== 'REVIEWED'">
          <button class="btn btn-secondary" (click)="save(false)" [disabled]="saving()">
            {{ saving() ? 'Saving…' : 'Save Progress' }}
          </button>
          <button class="btn btn-primary" (click)="save(true)" [disabled]="saving()">
            {{ saving() ? 'Submitting…' : 'Submit Survey' }}
          </button>
        </div>
      </ng-container>
    </div>
  `,
  styles: `
    .layout { max-width: 600px; margin: 0 auto; padding: 1.25rem 1rem 6rem; display: flex; flex-direction: column; gap: 0.9rem; }
    .loading { text-align: center; color: #78716C; padding: 2rem 0; }
    .card {
      background: white; border: 1px solid #E7E5E4; border-radius: 1.25rem;
      padding: 1.25rem 1.25rem; box-shadow: 0 4px 24px rgba(28,25,23,0.06);
    }
    .error-card { border-color: rgba(229,57,53,0.4); color: #E53935; text-align: center; }

    .header-card { text-align: left; }
    .eyebrow { margin: 0 0 0.2rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #A8A29E; }
    .header-card h1 { margin: 0 0 0.35rem; font-size: 1.35rem; font-weight: 900; color: #1C1917; }
    .due { margin: 0 0 0.5rem; font-size: 0.85rem; color: #78716C; }
    .status-badge {
      display: inline-block; font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.04em; padding: 0.3rem 0.7rem; border-radius: 999px;
      background: #F5F5F4; color: #57534E;
    }
    .status-badge.st-submitted, .status-badge.st-reviewed { background: rgba(0,168,150,0.12); color: #00806E; }
    .status-badge.st-in_progress { background: rgba(245,184,0,0.15); color: #92620A; }

    .q-label { display: block; font-size: 0.9375rem; font-weight: 800; color: #1C1917; margin-bottom: 0.25rem; }
    .req { color: #E53935; margin-left: 0.15rem; }
    .q-help { margin: 0 0 0.6rem; font-size: 0.8rem; color: #78716C; line-height: 1.5; }
    .q-input {
      width: 100%; box-sizing: border-box; border: 2px solid #E7E5E4; border-radius: 0.75rem;
      padding: 0.75rem 1rem; font-size: 1rem; font-family: inherit; font-weight: 600;
      min-height: 48px; color: #1C1917; background: #FAFAF9; outline: none;
      transition: border-color 0.15s;
    }
    .q-input:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); background: white; }
    .q-textarea { min-height: 96px; resize: vertical; }

    .choice-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .choice-opt {
      display: flex; align-items: center; gap: 0.6rem; min-height: 44px;
      padding: 0.5rem 0.75rem; border: 2px solid #E7E5E4; border-radius: 0.75rem;
      font-size: 0.9rem; font-weight: 600; color: #1C1917; cursor: pointer;
    }
    .choice-opt input { width: 18px; height: 18px; flex-shrink: 0; }

    .error-msg { color: #E53935; font-size: 0.85rem; font-weight: 700; margin: 0; text-align: center; }
    .success-msg { color: #00806E; font-size: 0.85rem; font-weight: 700; margin: 0; text-align: center; }

    .actions { display: flex; flex-direction: column; gap: 0.6rem; }
    .btn {
      border: none; border-radius: 999px; padding: 0.875rem; font-size: 0.95rem; font-weight: 800;
      cursor: pointer; font-family: inherit; min-height: 48px; transition: box-shadow 0.15s, opacity 0.15s;
    }
    .btn-primary { background: #F5B800; color: #1C1917; box-shadow: 0 4px 12px rgba(245,184,0,0.35); }
    .btn-primary:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }
    .btn-secondary { background: white; color: #1C1917; border: 2px solid #E7E5E4; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

    @media (min-width: 640px) {
      .actions { flex-direction: row-reverse; }
      .actions .btn { flex: 1; }
    }
  `
})
export class SurveyFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly assignment = signal<SurveyAssignmentDetailResponse | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly successMsg = signal('');

  answers: Record<string, string> = {};
  private multiAnswers: Record<string, string[]> = {};

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.load();
    }
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading.set(true);
    this.api.getSurveyAssignment(id, this.auth.getToken()!).subscribe({
      next: (detail) => {
        this.assignment.set(detail);
        this.answers = { ...detail.answers };
        detail.questions
          .filter(q => q.questionType === 'MULTI_CHOICE')
          .forEach(q => {
            this.multiAnswers[q.id] = this.safeParseArray(detail.answers[q.id]);
          });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Could not load this survey.');
        this.loading.set(false);
      }
    });
  }

  private safeParseArray(raw: string | undefined): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  isChecked(questionId: string, option: string): boolean {
    return (this.multiAnswers[questionId] ?? []).includes(option);
  }

  toggleMultiOption(questionId: string, option: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.multiAnswers[questionId] ?? [];
    this.multiAnswers[questionId] = checked ? [...current, option] : current.filter(o => o !== option);
    this.answers[questionId] = JSON.stringify(this.multiAnswers[questionId]);
  }

  save(submit: boolean): void {
    const a = this.assignment();
    if (!a) return;

    if (submit) {
      const missing = a.questions.filter((q: SurveyQuestionResponse) => q.required && !this.answers[q.id]?.trim());
      if (missing.length > 0) {
        this.error.set(`Please answer: ${missing.map(q => q.questionText).join(', ')}`);
        return;
      }
    }

    this.error.set('');
    this.successMsg.set('');
    this.saving.set(true);
    this.api.saveSurveyAnswers(a.id, { answers: this.answers, submit }, this.auth.getToken()!).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.assignment.update(cur => cur ? { ...cur, status: updated.status } : cur);
        this.successMsg.set(submit ? 'Survey submitted. Thank you!' : 'Progress saved.');
        if (submit) {
          setTimeout(() => this.router.navigate(['/dashboard']), 1200);
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Could not save your answers.');
        this.saving.set(false);
      }
    });
  }
}
