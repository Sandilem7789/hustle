import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService, Community, FacilitatorHustler,
  SurveyAssignmentDetailResponse, SurveyAssignmentResponse, SurveyAssignRequest,
  SurveyQuestionRequest, SurveyQuestionResponse,
  SurveyTemplateRequest, SurveyTemplateResponse
} from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AppSelectComponent } from '../app-select/app-select.component';

@Component({
  selector: 'app-facilitator-surveys',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSelectComponent],
  template: `
    <section class="surveys-wrap">
      <div class="sub-tabs">
        <button [class.active]="subTab() === 'templates'" (click)="subTab.set('templates')">Templates</button>
        <button [class.active]="subTab() === 'assign'" (click)="setAssignTab()">Assign</button>
        <button [class.active]="subTab() === 'responses'" (click)="setResponsesTab()">Responses</button>
      </div>

      <!-- ===== TEMPLATES ===== -->
      <ng-container *ngIf="subTab() === 'templates'">
        <div class="toolbar">
          <p class="muted sub-heading">Manage Baseline, Growth Plan, and Profile survey templates.</p>
          <button class="btn btn-add" (click)="showNewTemplateForm.set(!showNewTemplateForm())">
            {{ showNewTemplateForm() ? '✕ Cancel' : '+ New Template' }}
          </button>
        </div>

        <div class="card form-card" *ngIf="showNewTemplateForm()">
          <div class="form-grid">
            <label><span class="field-label">Type</span>
              <app-select [(ngModel)]="newTemplate.type" [ngModelOptions]="{standalone:true}" [options]="typeOpts"></app-select>
            </label>
            <label><span class="field-label">Name</span>
              <input type="text" [(ngModel)]="newTemplate.name" [ngModelOptions]="{standalone:true}" />
            </label>
            <label class="span-2"><span class="field-label">Description</span>
              <textarea rows="2" [(ngModel)]="newTemplate.description" [ngModelOptions]="{standalone:true}"></textarea>
            </label>
          </div>
          <p class="error-msg" *ngIf="templateError()">{{ templateError() }}</p>
          <button class="btn btn-primary" (click)="createTemplate()" [disabled]="templateSaving()">
            {{ templateSaving() ? 'Creating…' : 'Create Template' }}
          </button>
        </div>

        <div *ngIf="templatesLoading()" class="muted">Loading templates…</div>

        <div class="template-list" *ngIf="!templatesLoading()">
          <div class="muted" *ngIf="templates().length === 0">No survey templates yet.</div>

          <article class="template-card" *ngFor="let t of templates()" [class.inactive]="!t.active">
            <div class="tc-row" (click)="toggleTemplate(t.id)">
              <div class="tc-main">
                <div class="tc-name-row">
                  <h3>{{ t.name }}</h3>
                  <span class="type-badge">{{ t.type | titlecase }}</span>
                  <span class="inactive-badge" *ngIf="!t.active">Inactive</span>
                </div>
                <p class="muted small" *ngIf="t.description">{{ t.description }}</p>
              </div>
              <span class="chevron">{{ expandedTemplate() === t.id ? '▲' : '▼' }}</span>
            </div>

            <div class="tc-detail" *ngIf="expandedTemplate() === t.id" (click)="$event.stopPropagation()">
              <div class="tc-actions">
                <button class="link-btn" (click)="setTemplateActive(t, !t.active)">{{ t.active ? 'Deactivate template' : 'Activate template' }}</button>
              </div>

              <p class="phase-heading">Questions</p>
              <div *ngIf="questionsLoading() === t.id" class="muted small">Loading questions…</div>

              <ol class="question-list" *ngIf="questionsLoading() !== t.id">
                <li *ngIf="(questionsByTemplate[t.id]?.length ?? 0) === 0" class="muted small">No questions yet.</li>
                <li *ngFor="let q of questionsByTemplate[t.id]; let i = index" class="question-row" [class.inactive]="!q.active">
                  <div class="q-row-top">
                    <div class="q-order-btns">
                      <button type="button" (click)="moveQuestion(t.id, i, -1)" [disabled]="i === 0">↑</button>
                      <button type="button" (click)="moveQuestion(t.id, i, 1)" [disabled]="i === (questionsByTemplate[t.id]?.length ?? 0) - 1">↓</button>
                    </div>
                    <div class="q-main" (click)="startEditQuestion(t.id, q)">
                      <p class="q-text">{{ q.questionText }}<span class="req" *ngIf="q.required"> *</span></p>
                      <p class="muted small">{{ q.questionType | titlecase }} &middot; key: {{ q.fieldKey }}<span *ngIf="!q.active"> &middot; inactive</span></p>
                    </div>
                    <div class="q-row-actions">
                      <button type="button" class="link-btn" (click)="startEditQuestion(t.id, q)">Edit</button>
                      <button type="button" class="link-btn" (click)="setQuestionActive(t.id, q, !q.active)">{{ q.active ? 'Deactivate' : 'Activate' }}</button>
                      <button type="button" class="link-btn link-btn-danger" (click)="confirmDeleteQuestion(q.id)">Delete</button>
                    </div>
                  </div>

                  <div class="q-confirm-row" *ngIf="confirmingDeleteId() === q.id">
                    <p class="confirm-msg">Delete this question? This can't be undone.</p>
                    <div class="confirm-actions">
                      <button type="button" class="btn btn-danger-solid" (click)="deleteQuestion(t.id, q.id)" [disabled]="questionDeleting() === q.id">
                        {{ questionDeleting() === q.id ? 'Deleting…' : 'Yes, delete' }}
                      </button>
                      <button type="button" class="btn btn-secondary" (click)="confirmingDeleteId.set(null)">Cancel</button>
                    </div>
                  </div>

                  <p class="q-delete-error" *ngIf="questionDeleteError[q.id]">{{ questionDeleteError[q.id] }}</p>
                </li>
              </ol>

              <div class="card form-card" *ngIf="questionFormTemplateId() === t.id">
                <div class="form-grid">
                  <label class="span-2"><span class="field-label">Question text</span>
                    <input type="text" [(ngModel)]="questionForm.questionText" [ngModelOptions]="{standalone:true}" />
                  </label>
                  <label *ngIf="!editingQuestionId()"><span class="field-label">Field key (stable, e.g. company_description)</span>
                    <input type="text" [(ngModel)]="questionForm.fieldKey" [ngModelOptions]="{standalone:true}" />
                  </label>
                  <label><span class="field-label">Answer type</span>
                    <app-select [(ngModel)]="questionForm.questionType" [ngModelOptions]="{standalone:true}" [options]="questionTypeOpts"></app-select>
                  </label>
                  <label class="span-2" *ngIf="questionForm.questionType === 'SINGLE_CHOICE' || questionForm.questionType === 'MULTI_CHOICE'">
                    <span class="field-label">Options (one per line)</span>
                    <textarea rows="3" [(ngModel)]="optionsText" [ngModelOptions]="{standalone:true}"></textarea>
                  </label>
                  <label class="span-2"><span class="field-label">Help text (optional)</span>
                    <input type="text" [(ngModel)]="questionForm.helpText" [ngModelOptions]="{standalone:true}" />
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="questionForm.required" [ngModelOptions]="{standalone:true}" /> Required
                  </label>
                </div>
                <p class="error-msg" *ngIf="questionError()">{{ questionError() }}</p>
                <div class="form-actions">
                  <button type="button" class="btn btn-secondary" (click)="cancelQuestionForm()">Cancel</button>
                  <button type="button" class="btn btn-primary" (click)="saveQuestion(t)" [disabled]="questionSaving()">
                    {{ questionSaving() ? 'Saving…' : (editingQuestionId() ? 'Save Question' : 'Add Question') }}
                  </button>
                </div>
              </div>

              <button type="button" class="btn btn-add" *ngIf="questionFormTemplateId() !== t.id" (click)="startNewQuestion(t.id)">+ Add Question</button>
            </div>
          </article>
        </div>
      </ng-container>

      <!-- ===== ASSIGN ===== -->
      <ng-container *ngIf="subTab() === 'assign'">
        <p class="muted sub-heading">Assign a survey to one hustler, or bulk-assign to a whole community.</p>

        <div class="card form-card">
          <div class="form-grid">
            <label class="span-2"><span class="field-label">Survey template</span>
              <app-select [(ngModel)]="assignForm.templateId" [ngModelOptions]="{standalone:true}" [options]="activeTemplateOpts()"></app-select>
            </label>
            <label><span class="field-label">Assign to</span>
              <app-select [(ngModel)]="assignTargetMode" [ngModelOptions]="{standalone:true}" [options]="targetModeOpts"></app-select>
            </label>
            <label *ngIf="assignTargetMode === 'community'"><span class="field-label">Community</span>
              <app-select [(ngModel)]="assignForm.communityId" [ngModelOptions]="{standalone:true}" [options]="addCommunityOpts()"></app-select>
            </label>
            <label *ngIf="assignTargetMode === 'hustler'" class="span-2"><span class="field-label">Hustler</span>
              <app-select [(ngModel)]="assignHustlerId" [ngModelOptions]="{standalone:true}" [options]="hustlerOpts()"></app-select>
            </label>
            <label><span class="field-label">Due date (optional)</span>
              <input type="date" [(ngModel)]="assignForm.dueDate" [ngModelOptions]="{standalone:true}" />
            </label>
          </div>
          <p class="error-msg" *ngIf="assignError()">{{ assignError() }}</p>
          <p class="success-msg" *ngIf="assignSuccess()">{{ assignSuccess() }}</p>
          <button class="btn btn-primary" (click)="submitAssign()" [disabled]="assignSaving()">
            {{ assignSaving() ? 'Assigning…' : 'Assign Survey' }}
          </button>
        </div>
      </ng-container>

      <!-- ===== RESPONSES ===== -->
      <ng-container *ngIf="subTab() === 'responses'">
        <div class="filters-row">
          <app-select [(ngModel)]="responseFilters.status" (ngModelChange)="loadResponses()" [ngModelOptions]="{standalone:true}" [options]="statusFilterOpts"></app-select>
          <app-select [(ngModel)]="responseFilters.templateType" (ngModelChange)="loadResponses()" [ngModelOptions]="{standalone:true}" [options]="typeFilterOpts"></app-select>
          <app-select [(ngModel)]="responseFilters.communityId" (ngModelChange)="loadResponses()" [ngModelOptions]="{standalone:true}" [options]="filterCommunityOpts()"></app-select>
        </div>

        <div *ngIf="responsesLoading()" class="muted">Loading…</div>

        <div class="response-list" *ngIf="!responsesLoading()">
          <div class="muted" *ngIf="responses().length === 0">No survey assignments match these filters.</div>

          <article class="response-card" *ngFor="let a of responses()">
            <div class="rc-row" (click)="toggleResponse(a)">
              <div class="rc-main">
                <p class="rc-title">{{ a.templateName }} <span class="type-badge">{{ a.templateType | titlecase }}</span></p>
                <p class="muted small">{{ a.businessName }} &middot; {{ a.communityName || 'No community' }}</p>
                <p class="muted small">Assigned {{ a.assignedAt | date:'mediumDate' }}<span *ngIf="a.dueDate"> &middot; Due {{ a.dueDate | date:'mediumDate' }}</span></p>
              </div>
              <span class="status-badge" [class]="'st-' + a.status.toLowerCase()">{{ a.status | titlecase }}</span>
            </div>

            <div class="rc-detail" *ngIf="expandedResponse() === a.id" (click)="$event.stopPropagation()">
              <div *ngIf="responseDetailLoading()" class="muted small">Loading answers…</div>
              <ng-container *ngIf="!responseDetailLoading() && responseDetail() as d">
                <div class="answer-row" *ngFor="let q of d.questions">
                  <p class="q-text">{{ q.questionText }}</p>
                  <p class="answer-text">{{ d.answers[q.id] || '—' }}</p>
                </div>
              </ng-container>
            </div>
          </article>
        </div>
      </ng-container>
    </section>
  `,
  styles: `
    .surveys-wrap { display: flex; flex-direction: column; gap: 1rem; }

    .sub-tabs { display: flex; gap: 0.4rem; border-bottom: 1.5px solid #E7E5E4; padding-bottom: 0.5rem; }
    .sub-tabs button {
      border: none; background: none; font-family: inherit; font-size: 0.85rem; font-weight: 800;
      color: #78716C; padding: 0.5rem 0.9rem; border-radius: 999px; cursor: pointer; min-height: 40px;
      transition: background-color 0.15s, color 0.15s;
    }
    .sub-tabs button.active { background: #F5B800; color: #1C1917; }
    .sub-tabs button:not(.active):hover { background: #F5F5F4; }

    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
    .sub-heading { margin: 0; }
    .muted { color: #78716C; font-size: 0.875rem; }
    .muted.small { font-size: 0.8rem; margin: 0.1rem 0; }

    .btn {
      border: none; border-radius: 999px; padding: 0.7rem 1.25rem; font-size: 0.875rem; font-weight: 800;
      cursor: pointer; font-family: inherit; min-height: 44px; transition: box-shadow 0.15s, opacity 0.15s;
    }
    .btn-add { background: #1C1917; color: white; }
    .btn-primary { background: #F5B800; color: #1C1917; box-shadow: 0 4px 12px rgba(245,184,0,0.35); }
    .btn-primary:hover { box-shadow: 0 6px 20px rgba(245,184,0,0.5); }
    .btn-secondary { background: white; color: #1C1917; border: 2px solid #E7E5E4; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    .link-btn {
      border: none; background: none; color: #92620A; font-family: inherit; font-size: 0.8rem; font-weight: 800;
      cursor: pointer; padding: 0.4rem 0; min-height: 32px;
    }

    .card {
      background: white; border: 1px solid #E7E5E4; border-radius: 1.25rem; padding: 1.1rem;
      box-shadow: 0 4px 24px rgba(28,25,23,0.06);
    }
    .form-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
    .form-grid label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8125rem; font-weight: 700; color: #1C1917; }
    .field-label { font-size: 0.75rem; font-weight: 800; color: #78716C; text-transform: uppercase; letter-spacing: 0.03em; }
    .form-grid input[type="text"], .form-grid input[type="date"], .form-grid textarea {
      border: 2px solid #E7E5E4; border-radius: 0.75rem; padding: 0.65rem 0.85rem; font-size: 0.95rem;
      font-family: inherit; font-weight: 600; min-height: 44px; color: #1C1917; background: #FAFAF9; outline: none;
    }
    .form-grid input:focus, .form-grid textarea:focus { border-color: #F5B800; background: white; }
    .checkbox-label { flex-direction: row !important; align-items: center; gap: 0.5rem !important; }
    .checkbox-label input { width: 18px; height: 18px; }
    .form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
    .error-msg { color: #E53935; font-size: 0.8rem; font-weight: 700; margin: 0 0 0.6rem; }
    .success-msg { color: #00806E; font-size: 0.8rem; font-weight: 700; margin: 0 0 0.6rem; }

    .template-list, .response-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .template-card, .response-card {
      background: white; border: 1px solid #E7E5E4; border-radius: 1rem; overflow: hidden;
    }
    .template-card.inactive { opacity: 0.6; }
    .tc-row, .rc-row {
      display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
      padding: 0.9rem 1.1rem; cursor: pointer; min-height: 48px;
    }
    .tc-name-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .tc-name-row h3, .rc-title { margin: 0; font-size: 0.95rem; font-weight: 800; color: #1C1917; }
    .type-badge {
      font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
      padding: 0.2rem 0.55rem; border-radius: 999px; background: #F5F5F4; color: #57534E;
    }
    .inactive-badge { font-size: 0.65rem; font-weight: 800; color: #E53935; }
    .chevron { color: #A8A29E; flex-shrink: 0; }
    .tc-detail, .rc-detail { padding: 0 1.1rem 1rem; border-top: 1px solid #F5F5F4; }
    .tc-actions { padding-top: 0.75rem; }
    .phase-heading { margin: 0.5rem 0 0.4rem; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #A8A29E; }

    .question-list { list-style: none; margin: 0 0 0.75rem; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
    .question-row {
      display: flex; flex-direction: column; gap: 0.5rem; padding: 0.6rem 0.7rem;
      border: 1.5px solid #E7E5E4; border-radius: 0.75rem;
    }
    .question-row.inactive { opacity: 0.55; }
    .q-row-top { display: flex; align-items: center; gap: 0.6rem; }
    .q-order-btns { display: flex; flex-direction: column; gap: 0.2rem; }
    .q-order-btns button {
      width: 26px; height: 22px; border: 1px solid #E7E5E4; background: white; border-radius: 0.4rem;
      cursor: pointer; font-size: 0.7rem; line-height: 1;
    }
    .q-order-btns button:disabled { opacity: 0.35; cursor: not-allowed; }
    .q-main { flex: 1; min-width: 0; cursor: pointer; }
    .q-text { margin: 0; font-size: 0.875rem; font-weight: 700; color: #1C1917; }
    .req { color: #E53935; }
    .q-row-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem; flex-shrink: 0; }
    .link-btn-danger { color: #E53935; }

    .q-confirm-row {
      background: rgba(229,57,53,0.06); border: 1.5px solid rgba(229,57,53,0.3); border-radius: 0.7rem;
      padding: 0.65rem 0.75rem;
    }
    .confirm-msg { margin: 0 0 0.5rem; font-size: 0.8rem; font-weight: 700; color: #1C1917; }
    .confirm-actions { display: flex; gap: 0.5rem; }
    .btn-danger-solid { background: #E53935; color: white; padding: 0.55rem 1rem; font-size: 0.8rem; min-height: 40px; }
    .q-delete-error { margin: 0; font-size: 0.78rem; font-weight: 700; color: #E53935; }

    .filters-row { display: flex; flex-direction: column; gap: 0.5rem; }
    .status-badge {
      font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em;
      padding: 0.25rem 0.6rem; border-radius: 999px; background: #F5F5F4; color: #57534E; flex-shrink: 0;
    }
    .status-badge.st-submitted, .status-badge.st-reviewed { background: rgba(0,168,150,0.12); color: #00806E; }
    .status-badge.st-in_progress { background: rgba(245,184,0,0.15); color: #92620A; }
    .answer-row { padding: 0.6rem 0; border-bottom: 1px solid #F5F5F4; }
    .answer-row:last-child { border-bottom: none; }
    .answer-text { margin: 0.2rem 0 0; font-size: 0.875rem; color: #57534E; }

    @media (min-width: 640px) {
      .form-grid { grid-template-columns: 1fr 1fr; }
      .span-2 { grid-column: span 2; }
      .filters-row { flex-direction: row; }
      .filters-row app-select { flex: 1; }
    }
  `
})
export class FacilitatorSurveysComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  subTab = signal<'templates' | 'assign' | 'responses'>('templates');

  readonly typeOpts = [
    { value: 'BASELINE', label: 'Baseline' },
    { value: 'GROWTH_PLAN', label: 'Growth Plan' },
    { value: 'PROFILE', label: 'Profile' },
  ];
  readonly questionTypeOpts = [
    { value: 'TEXT', label: 'Text' },
    { value: 'TEXTAREA', label: 'Long Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'DATE', label: 'Date' },
    { value: 'SINGLE_CHOICE', label: 'Single Choice' },
    { value: 'MULTI_CHOICE', label: 'Multi Choice' },
  ];
  readonly targetModeOpts = [
    { value: 'community', label: 'Whole community' },
    { value: 'hustler', label: 'One hustler' },
  ];
  readonly statusFilterOpts = [
    { value: '', label: 'All statuses' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'REVIEWED', label: 'Reviewed' },
  ];
  readonly typeFilterOpts = [
    { value: '', label: 'All types' },
    { value: 'BASELINE', label: 'Baseline' },
    { value: 'GROWTH_PLAN', label: 'Growth Plan' },
    { value: 'PROFILE', label: 'Profile' },
  ];

  // ── Templates ────────────────────────────────────────────────────────────
  templates = signal<SurveyTemplateResponse[]>([]);
  templatesLoading = signal(false);
  showNewTemplateForm = signal(false);
  newTemplate: Partial<SurveyTemplateRequest> = { type: 'BASELINE', active: true };
  templateSaving = signal(false);
  templateError = signal('');
  expandedTemplate = signal<string | null>(null);

  // ── Questions ────────────────────────────────────────────────────────────
  questionsByTemplate: Partial<Record<string, SurveyQuestionResponse[]>> = {};
  questionsLoading = signal<string | null>(null);
  questionFormTemplateId = signal<string | null>(null);
  editingQuestionId = signal<string | null>(null);
  questionForm: Partial<SurveyQuestionRequest> = {};
  optionsText = '';
  questionSaving = signal(false);
  questionError = signal('');
  confirmingDeleteId = signal<string | null>(null);
  questionDeleting = signal<string | null>(null);
  questionDeleteError: Record<string, string> = {};

  // ── Assign ───────────────────────────────────────────────────────────────
  communities = signal<Community[]>([]);
  hustlers = signal<FacilitatorHustler[]>([]);
  assignTargetMode: 'hustler' | 'community' = 'community';
  assignForm: Partial<SurveyAssignRequest> = {};
  assignHustlerId = '';
  assignSaving = signal(false);
  assignError = signal('');
  assignSuccess = signal('');

  activeTemplateOpts = computed(() =>
    this.templates().filter(t => t.active).map(t => ({ value: t.id, label: `${t.name} (${t.type})` })));
  addCommunityOpts = computed(() =>
    [{ value: '', label: '— Select community —' }, ...this.communities().map(c => ({ value: c.id, label: c.name }))]);
  hustlerOpts = computed(() =>
    [{ value: '', label: '— Select hustler —' }, ...this.hustlers().map(h =>
      ({ value: h.businessProfileId, label: `${h.firstName} ${h.lastName} (${h.businessName})` }))]);

  // ── Responses ────────────────────────────────────────────────────────────
  responses = signal<SurveyAssignmentResponse[]>([]);
  responsesLoading = signal(false);
  responseFilters: { status: string; templateType: string; communityId: string } = { status: '', templateType: '', communityId: '' };
  expandedResponse = signal<string | null>(null);
  responseDetail = signal<SurveyAssignmentDetailResponse | null>(null);
  responseDetailLoading = signal(false);

  filterCommunityOpts = computed(() =>
    [{ value: '', label: 'All communities' }, ...this.communities().map(c => ({ value: c.id, label: c.name }))]);

  ngOnInit(): void {
    this.loadTemplates();
    this.api.listCommunities().subscribe(c => this.communities.set(c));
    this.api.listFacilitatorHustlers().subscribe(h => this.hustlers.set(h));
  }

  // ── Templates ────────────────────────────────────────────────────────────
  loadTemplates(): void {
    this.templatesLoading.set(true);
    this.api.listSurveyTemplates().subscribe({
      next: (list) => { this.templates.set(list); this.templatesLoading.set(false); },
      error: () => this.templatesLoading.set(false)
    });
  }

  createTemplate(): void {
    if (!this.newTemplate.name?.trim()) {
      this.templateError.set('Name is required.');
      return;
    }
    this.templateSaving.set(true);
    this.templateError.set('');
    this.api.createSurveyTemplate(this.newTemplate as SurveyTemplateRequest).subscribe({
      next: () => {
        this.templateSaving.set(false);
        this.showNewTemplateForm.set(false);
        this.newTemplate = { type: 'BASELINE', active: true };
        this.loadTemplates();
      },
      error: (err) => {
        this.templateSaving.set(false);
        this.templateError.set(err?.error?.message || 'Could not create template.');
      }
    });
  }

  setTemplateActive(t: SurveyTemplateResponse, active: boolean): void {
    this.api.setSurveyTemplateActive(t.id, active).subscribe(() => this.loadTemplates());
  }

  toggleTemplate(id: string): void {
    if (this.expandedTemplate() === id) {
      this.expandedTemplate.set(null);
      this.questionFormTemplateId.set(null);
      this.confirmingDeleteId.set(null);
      return;
    }
    this.expandedTemplate.set(id);
    this.questionFormTemplateId.set(null);
    this.confirmingDeleteId.set(null);
    if (!this.questionsByTemplate[id]) {
      this.loadQuestions(id);
    }
  }

  // ── Questions ────────────────────────────────────────────────────────────
  loadQuestions(templateId: string): void {
    this.questionsLoading.set(templateId);
    this.api.listSurveyQuestions(templateId).subscribe({
      next: (list) => { this.questionsByTemplate[templateId] = list; this.questionsLoading.set(null); },
      error: () => { this.questionsByTemplate[templateId] = []; this.questionsLoading.set(null); }
    });
  }

  startNewQuestion(templateId: string): void {
    this.questionFormTemplateId.set(templateId);
    this.editingQuestionId.set(null);
    this.questionForm = { questionType: 'TEXT', required: false };
    this.optionsText = '';
    this.questionError.set('');
  }

  startEditQuestion(templateId: string, q: SurveyQuestionResponse): void {
    this.questionFormTemplateId.set(templateId);
    this.editingQuestionId.set(q.id);
    this.questionForm = { questionText: q.questionText, questionType: q.questionType, required: q.required, helpText: q.helpText };
    this.optionsText = (q.options ?? []).join('\n');
    this.questionError.set('');
  }

  cancelQuestionForm(): void {
    this.questionFormTemplateId.set(null);
    this.editingQuestionId.set(null);
  }

  saveQuestion(t: SurveyTemplateResponse): void {
    if (!this.questionForm.questionText?.trim()) {
      this.questionError.set('Question text is required.');
      return;
    }
    const editingId = this.editingQuestionId();
    if (!editingId && !this.questionForm.fieldKey?.trim()) {
      this.questionError.set('Field key is required.');
      return;
    }

    const options = this.optionsText.split('\n').map(o => o.trim()).filter(Boolean);
    const payload: SurveyQuestionRequest = {
      questionText: this.questionForm.questionText!,
      fieldKey: this.questionForm.fieldKey,
      questionType: this.questionForm.questionType!,
      options: options.length ? options : undefined,
      required: !!this.questionForm.required,
      helpText: this.questionForm.helpText || undefined,
    };

    this.questionSaving.set(true);
    this.questionError.set('');
    const req$ = editingId
      ? this.api.updateSurveyQuestion(t.id, editingId, payload)
      : this.api.createSurveyQuestion(t.id, payload);

    req$.subscribe({
      next: () => {
        this.questionSaving.set(false);
        this.questionFormTemplateId.set(null);
        this.editingQuestionId.set(null);
        this.loadQuestions(t.id);
      },
      error: (err) => {
        this.questionSaving.set(false);
        this.questionError.set(err?.error?.message || 'Could not save question.');
      }
    });
  }

  setQuestionActive(templateId: string, q: SurveyQuestionResponse, active: boolean): void {
    this.api.setSurveyQuestionActive(templateId, q.id, active).subscribe(() => this.loadQuestions(templateId));
  }

  confirmDeleteQuestion(questionId: string): void {
    delete this.questionDeleteError[questionId];
    this.confirmingDeleteId.set(questionId);
  }

  deleteQuestion(templateId: string, questionId: string): void {
    this.questionDeleting.set(questionId);
    this.api.deleteSurveyQuestion(templateId, questionId).subscribe({
      next: () => {
        this.questionDeleting.set(null);
        this.confirmingDeleteId.set(null);
        delete this.questionDeleteError[questionId];
        this.loadQuestions(templateId);
      },
      error: (err) => {
        this.questionDeleting.set(null);
        this.confirmingDeleteId.set(null);
        this.questionDeleteError[questionId] = err?.error?.message || 'Could not delete this question.';
      }
    });
  }

  moveQuestion(templateId: string, index: number, dir: -1 | 1): void {
    const list = this.questionsByTemplate[templateId];
    if (!list) return;
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const reordered = [...list];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    this.questionsByTemplate[templateId] = reordered;
    this.api.reorderSurveyQuestions(templateId, reordered.map(q => q.id)).subscribe({
      next: (updated) => { this.questionsByTemplate[templateId] = updated; },
      error: () => this.loadQuestions(templateId)
    });
  }

  // ── Assign ───────────────────────────────────────────────────────────────
  setAssignTab(): void {
    this.subTab.set('assign');
  }

  submitAssign(): void {
    if (!this.assignForm.templateId) {
      this.assignError.set('Select a survey template.');
      return;
    }
    const payload: SurveyAssignRequest = {
      templateId: this.assignForm.templateId,
      dueDate: this.assignForm.dueDate || undefined
    };
    if (this.assignTargetMode === 'hustler') {
      if (!this.assignHustlerId) {
        this.assignError.set('Select a hustler.');
        return;
      }
      payload.businessProfileIds = [this.assignHustlerId];
    } else {
      if (!this.assignForm.communityId) {
        this.assignError.set('Select a community.');
        return;
      }
      payload.communityId = this.assignForm.communityId;
    }

    this.assignSaving.set(true);
    this.assignError.set('');
    this.assignSuccess.set('');
    this.api.assignSurvey(payload).subscribe({
      next: (created) => {
        this.assignSaving.set(false);
        this.assignSuccess.set(`Assigned to ${created.length} hustler${created.length === 1 ? '' : 's'}.`);
      },
      error: (err) => {
        this.assignSaving.set(false);
        this.assignError.set(err?.error?.message || 'Could not assign survey.');
      }
    });
  }

  // ── Responses ────────────────────────────────────────────────────────────
  setResponsesTab(): void {
    this.subTab.set('responses');
    if (this.responses().length === 0) {
      this.loadResponses();
    }
  }

  loadResponses(): void {
    this.responsesLoading.set(true);
    this.api.searchSurveyAssignments(
      this.responseFilters.status || undefined,
      this.responseFilters.templateType || undefined,
      this.responseFilters.communityId || undefined
    ).subscribe({
      next: (list) => { this.responses.set(list); this.responsesLoading.set(false); },
      error: () => this.responsesLoading.set(false)
    });
  }

  toggleResponse(a: SurveyAssignmentResponse): void {
    if (this.expandedResponse() === a.id) {
      this.expandedResponse.set(null);
      return;
    }
    this.expandedResponse.set(a.id);
    this.responseDetail.set(null);
    this.responseDetailLoading.set(true);
    this.api.getSurveyAssignment(a.id, this.auth.getToken()!).subscribe({
      next: (d) => { this.responseDetail.set(d); this.responseDetailLoading.set(false); },
      error: () => this.responseDetailLoading.set(false)
    });
  }
}
