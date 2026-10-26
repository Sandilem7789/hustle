import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Observable, switchMap } from 'rxjs';
import { ApiService, ApplicantResponse } from '../../services/api.service';
import { UnifiedAuthService } from '../../services/unified-auth.service';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import { MapPickerComponent } from '../../components/map-picker/map-picker.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

type Decision = 'approve' | 'visit' | 'reject';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const LOCKED_STAGES = new Set(['BUSINESS_VERIFICATION', 'APPROVED', 'REJECTED']);

@Component({
  selector: 'app-agent-visit-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, LoginGateComponent, MapPickerComponent, TranslatePipe],
  template: `
    <app-login-gate *ngIf="!authorized()"
      icon="🏛️"
      title="Community Agent Sign In"
      subtitle="This section is for Community Agents and Hub Coordinators."
      [requiredRoles]="['FACILITATOR','COORDINATOR']"
    ></app-login-gate>

    <section class="visit" *ngIf="authorized()">
      <header class="head dash-head">
        <div class="head-inner">
          <a routerLink="/facilitator" class="back"><mat-icon aria-hidden="true">chevron_left</mat-icon>{{ 'agent.title' | translate }}</a>
          <ng-container *ngIf="applicant() as a">
            <h1 class="title">{{ a.firstName }} {{ a.lastName }}</h1>
            <p class="sub">{{ 'agent.wantsToSell' | translate }} · {{ a.typeOfHustle }} · {{ a.communityName }}</p>
            <div class="progress" *ngIf="!locked()">
              <div class="bar" role="img" [attr.aria-label]="stepsDone() + ' / 6'"><span [style.width.%]="stepsDone() / 6 * 100"></span></div>
              <span>{{ stepsDone() }} / 6 {{ 'agent.stepsDone' | translate }}</span>
            </div>
          </ng-container>
        </div>
      </header>

      <div class="body">
        <p class="state" *ngIf="loadState() === 'loading'">{{ 'marketplace.loading' | translate }}</p>
        <div class="state" *ngIf="loadState() === 'error'" role="alert">
          <p>{{ 'agent.notFound' | translate }}</p>
          <a routerLink="/facilitator" class="btn btn-line">{{ 'agent.title' | translate }}</a>
        </div>

        <ng-container *ngIf="loadState() === 'ready' && applicant() as a">
          <p class="locked" *ngIf="locked()" role="status">
            {{ (a.pipelineStage === 'BUSINESS_VERIFICATION' ? 'agent.waitingHub' : a.pipelineStage === 'APPROVED' ? 'agent.approved' : 'agent.rejected') | translate }}<ng-container *ngIf="a.rejectionReason">: {{ a.rejectionReason }}</ng-container>
          </p>

          <fieldset class="grid" [disabled]="locked() || saving()">
            <section class="card a-meet" aria-labelledby="s-meet">
              <h2 id="s-meet" class="step"><span class="n" [class.ok]="metDone()">{{ metDone() ? '✓' : '1' }}</span>{{ 'agent.meet' | translate }}</h2>
              <label class="check"><input type="checkbox" [ngModel]="inPerson()" (ngModelChange)="inPerson.set($event)" name="inPerson" />{{ 'agent.inPerson' | translate }}</label>
              <label class="check"><input type="checkbox" [ngModel]="sawId()" (ngModelChange)="sawId.set($event)" name="sawId" [disabled]="under18()" />{{ 'agent.sawId' | translate }}</label>
              <p class="hint">{{ 'agent.noIdPhoto' | translate }}</p>
              <p class="hint" *ngIf="a.age != null">{{ 'agent.ageOnFile' | translate }}: <strong>{{ a.age }}</strong></p>
              <p class="warn" *ngIf="under18()" role="alert">{{ 'agent.under18' | translate }}</p>
            </section>
            <section class="card a-where" aria-labelledby="s-where">
              <h2 id="s-where" class="step"><span class="n" [class.ok]="lat() != null">{{ lat() != null ? '✓' : '2' }}</span>{{ 'agent.where' | translate }}</h2>
              <app-map-picker [lat]="lat()" [lng]="lng()" (coordsChange)="setPin($event.lat, $event.lng, null)"></app-map-picker>
              <p class="hint" *ngIf="lat() != null">
                {{ 'agent.pinned' | translate }}<ng-container *ngIf="accuracy() != null"> · {{ 'agent.accuracy' | translate }} {{ accuracy() }} m</ng-container>
              </p>
              <p class="warn" *ngIf="locationError()" role="alert">{{ 'agent.locationError' | translate }}</p>
              <button type="button" class="btn btn-line" (click)="pinHere()" [disabled]="locating()">
                <mat-icon aria-hidden="true">my_location</mat-icon>{{ (locating() ? 'agent.locating' : 'agent.pinHere') | translate }}
              </button>
              <p class="hint">{{ 'agent.pinHint' | translate }}</p>
            </section>

            <section class="card a-photos" aria-labelledby="s-photos">
              <h2 id="s-photos" class="step"><span class="n" [class.ok]="photos().length > 0">{{ photos().length > 0 ? '✓' : '3' }}</span>{{ 'agent.photos' | translate }}</h2>
              <ul class="photos" role="list">
                <li *ngFor="let url of photos(); let i = index">
                  <img [src]="resolveUrl(url)" alt="" loading="lazy" />
                  <button type="button" class="remove" (click)="removePhoto(i)" [attr.aria-label]="'agent.removePhoto' | translate">
                    <mat-icon aria-hidden="true">close</mat-icon>
                  </button>
                </li>
                <li>
                  <label class="add" [class.busy]="uploading()">
                    <input type="file" accept="image/*" capture="environment" (change)="addPhoto($event)" [disabled]="uploading() || locked()" />
                    <mat-icon aria-hidden="true">add_a_photo</mat-icon>
                    <span>{{ (uploading() ? 'agent.uploading' : 'agent.addPhoto') | translate }}</span>
                  </label>
                </li>
              </ul>
              <p class="warn" *ngIf="photoError()" role="alert">{{ 'agent.photoError' | translate }}</p>
            </section>

            <section class="card a-sell" aria-labelledby="s-sell">
              <h2 id="s-sell" class="step"><span class="n ok">✓</span>{{ 'agent.whatTheySell' | translate }}</h2>
              <p class="sell">{{ a.typeOfHustle }}</p>
            </section>

            <section class="card a-notes" aria-labelledby="s-notes">
              <h2 id="s-notes" class="step"><span class="n" [class.ok]="notes().trim().length > 0">{{ notes().trim() ? '✓' : '5' }}</span>{{ 'agent.conversation' | translate }}</h2>
              <label class="field">{{ 'agent.notesLabel' | translate }}
                <textarea rows="5" [ngModel]="notes()" (ngModelChange)="notes.set($event)" name="notes" [placeholder]="'agent.notesHint' | translate"></textarea>
              </label>
            </section>

            <section class="card decide" aria-labelledby="s-decide" *ngIf="!locked()">
              <h2 id="s-decide" class="step"><span class="n">6</span>{{ 'agent.decision' | translate }}</h2>
              <div class="options" role="radiogroup" aria-labelledby="s-decide">
                <label class="option" [class.on]="decision() === 'approve'" [class.off]="under18()">
                  <input type="radio" name="decision" value="approve" [ngModel]="decision()" (ngModelChange)="decision.set($event)" [disabled]="under18()" />
                  <span><strong>{{ 'agent.approve' | translate }}</strong><span class="hint">{{ 'agent.approveSub' | translate }}</span></span>
                </label>
                <label class="option" [class.on]="decision() === 'visit'">
                  <input type="radio" name="decision" value="visit" [ngModel]="decision()" (ngModelChange)="decision.set($event)" />
                  <span><strong>{{ 'agent.visitAgain' | translate }}</strong><span class="hint">{{ 'agent.visitAgainSub' | translate }}</span></span>
                </label>
                <label class="option" [class.on]="decision() === 'reject'">
                  <input type="radio" name="decision" value="reject" [ngModel]="decision()" (ngModelChange)="decision.set($event)" />
                  <span><strong>{{ 'agent.reject' | translate }}</strong><span class="hint">{{ 'agent.rejectSub' | translate }}</span></span>
                </label>
              </div>

              <label class="field" *ngIf="decision() === 'visit'">{{ 'agent.visitDate' | translate }}
                <input type="date" [min]="today" [ngModel]="visitDate()" (ngModelChange)="visitDate.set($event)" name="visitDate" />
              </label>
              <label class="field" *ngIf="decision() === 'reject'">{{ 'agent.reasonLabel' | translate }}
                <input type="text" [ngModel]="reason()" (ngModelChange)="reason.set($event)" name="reason" />
              </label>

              <p class="hint" *ngIf="decision() === 'approve' && !canApprove()">{{ 'agent.needForApprove' | translate }}</p>
              <p class="warn" *ngIf="saveError()" role="alert">{{ 'agent.saveError' | translate }}</p>

              <button type="button" class="btn btn-gold submit" (click)="submit(a)" [disabled]="!canSubmit() || saving()">
                {{ (saving() ? 'agent.saving' : submitKey()) | translate }}
              </button>
            </section>
          </fieldset>
        </ng-container>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .visit { padding-bottom: 1.5rem; }
    .head-inner { max-width: 1100px; margin: 0 auto; padding: 0.25rem 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .back { color: var(--nav-accent); text-decoration: none; font-weight: 700; min-height: 48px; display: inline-flex; align-items: center; margin-left: -0.375rem; align-self: flex-start; }
    .title { font-size: 2rem; line-height: 1.05; }
    .sub { color: var(--nav-fg-muted); font-size: 0.9375rem; }
    .progress { display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; margin-top: 0.25rem; }
    .bar { flex: 1; height: 8px; border-radius: 999px; background: var(--nav-track); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--gold); transition: width 0.2s ease-out; }

    .body { max-width: 1100px; margin: 0 auto; padding: 1rem; }
    .state { text-align: center; color: var(--text-secondary); padding: 2rem 1rem; display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
    .locked { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 14px; padding: 0.875rem 1rem; font-weight: 700; margin-bottom: 0.75rem; }

    .grid { border: 0; margin: 0; padding: 0; min-width: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .card { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 18px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .step { font-size: 1rem; display: flex; align-items: center; gap: 0.625rem; }
    .n { width: 28px; height: 28px; border-radius: 50%; background: var(--ink); color: var(--cream); font-size: 0.8125rem; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
    :host-context([data-theme="dark"]) .n { background: var(--cream); color: var(--ink); }
    .n.ok { background: var(--leaf); color: #FFFFFF; }

    .check { flex-direction: row; align-items: flex-start; gap: 0.75rem; min-height: 44px; font-weight: 500; font-size: 0.9375rem; line-height: 1.4; }
    .check input { width: 24px; height: 24px; min-height: 0; margin: 0; flex-shrink: 0; accent-color: var(--leaf); }
    .hint { font-size: 0.8125rem; color: var(--text-secondary); font-weight: 400; }
    .warn { font-size: 0.875rem; font-weight: 700; color: var(--hustle-red); }
    :host-context([data-theme="dark"]) .warn { color: #F0A49C; }
    .sell { font-size: 1rem; }
    .field textarea { resize: vertical; font-weight: 400; }

    .photos { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
    .photos li { position: relative; aspect-ratio: 1; }
    .photos img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block; }
    .remove { position: absolute; top: 4px; right: 4px; width: 32px; height: 32px; min-height: 0; border-radius: 50%; background: rgba(19, 37, 30, 0.8); color: #FFFFFF; display: flex; align-items: center; justify-content: center; padding: 0; }
    .remove mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .add { height: 100%; border: 1.5px dashed var(--text-muted); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; font-size: 0.8125rem; text-align: center; }
    .add.busy { opacity: 0.6; }
    .add input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .add:focus-within { outline: 3px solid var(--border-focus); outline-offset: 2px; }

    .options { display: flex; flex-direction: column; gap: 0.5rem; }
    .option { flex-direction: row; align-items: flex-start; gap: 0.75rem; min-height: 60px; border: 1px solid var(--border-base); border-radius: 14px; padding: 0.75rem 0.875rem; cursor: pointer; font-weight: 400; }
    .option > span { display: flex; flex-direction: column; gap: 2px; }
    .option input { width: 20px; height: 20px; min-height: 0; margin: 2px 0 0; accent-color: var(--ink); flex-shrink: 0; }
    .option.on { border: 2px solid var(--text-primary); }
    .option.off { opacity: 0.5; cursor: not-allowed; }

    .btn { min-height: 48px; border-radius: 14px; font-weight: 700; font-size: 1rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; text-decoration: none; padding: 0 1rem; }
    .btn.btn-gold { background: var(--gold); color: var(--ink); }
    .btn.btn-line { background: transparent; border: 1.5px solid var(--text-primary); color: var(--text-primary); }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .submit { min-height: 60px; font-size: 1.125rem; font-weight: 800; }

    @media (min-width: 1024px) {
      .head-inner { padding: 0.5rem 1.5rem 1.5rem; }
      .title { font-size: 2.5rem; }
      .progress { max-width: 24rem; }
      .body { padding: 1.5rem; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; align-items: start;
        grid-template-areas: "meet where" "sell where" "notes where" "photos photos" "decide decide"; }
      .a-meet { grid-area: meet; }
      .a-where { grid-area: where; }
      .a-photos { grid-area: photos; }
      .a-sell { grid-area: sell; }
      .a-notes { grid-area: notes; }
      .decide { grid-area: decide; }
      .options { flex-direction: row; }
      .option { flex: 1; }
      .photos { grid-template-columns: repeat(6, minmax(0, 1fr)); }
      .submit { align-self: flex-end; min-width: 18rem; }
    }
  `
})
export class AgentVisitPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(UnifiedAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly authorized = computed(() => this.auth.isStaff());
  readonly today = this.localDate();

  readonly loadState = signal<'loading' | 'error' | 'ready'>('loading');
  readonly applicant = signal<ApplicantResponse | null>(null);

  readonly inPerson = signal(false);
  readonly sawId = signal(false);
  readonly lat = signal<number | null>(null);
  readonly lng = signal<number | null>(null);
  readonly accuracy = signal<number | null>(null);
  readonly locating = signal(false);
  readonly locationError = signal(false);
  readonly photos = signal<string[]>([]);
  readonly uploading = signal(false);
  readonly photoError = signal(false);
  readonly notes = signal('');
  readonly decision = signal<Decision>('approve');
  readonly visitDate = signal('');
  readonly reason = signal('');
  readonly saving = signal(false);
  readonly saveError = signal(false);

  readonly locked = computed(() => LOCKED_STAGES.has(this.applicant()?.pipelineStage ?? ''));
  readonly under18 = computed(() => {
    const age = this.applicant()?.age;
    return age != null && age < 18;
  });
  readonly metDone = computed(() => this.inPerson() && this.sawId());
  readonly canApprove = computed(() =>
    this.metDone() && !this.under18() && this.lat() != null && this.photos().length > 0);
  readonly stepsDone = computed(() =>
    [this.metDone(), this.lat() != null, this.photos().length > 0, true, this.notes().trim().length > 0, this.canSubmit()]
      .filter(Boolean).length);

  readonly canSubmit = computed(() => {
    switch (this.decision()) {
      case 'approve': return this.canApprove();
      case 'visit': return !!this.visitDate();
      case 'reject': return this.reason().trim().length > 0;
    }
  });

  readonly submitKey = computed(() => ({
    approve: 'agent.submitApprove', visit: 'agent.submitVisit', reject: 'agent.submitReject',
  })[this.decision()]);

  ngOnInit(): void {
    if (!this.authorized()) return;
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getApplicant(id).subscribe({
      next: a => {
        this.applicant.set(a);
        if (this.under18()) this.decision.set('visit');
        this.loadState.set('ready');
        this.loadEarlierVisit(id);
      },
      error: () => this.loadState.set('error'),
    });
  }

  pinHere(): void {
    if (!navigator.geolocation) {
      this.locationError.set(true);
      return;
    }
    this.locating.set(true);
    this.locationError.set(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.setPin(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy));
        this.locating.set(false);
      },
      () => {
        this.locationError.set(true);
        this.locating.set(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  setPin(lat: number, lng: number, accuracy: number | null): void {
    this.lat.set(lat);
    this.lng.set(lng);
    this.accuracy.set(accuracy);
  }

  addPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.photoError.set(false);
    if (file.size > MAX_PHOTO_BYTES || !file.type.startsWith('image/')) {
      this.photoError.set(true);
      return;
    }
    this.uploading.set(true);
    this.api.uploadImage(file, '').subscribe({
      next: res => {
        this.photos.update(list => [...list, res.url]);
        this.uploading.set(false);
      },
      error: () => {
        this.photoError.set(true);
        this.uploading.set(false);
      },
    });
  }

  removePhoto(index: number): void {
    this.photos.update(list => list.filter((_, i) => i !== index));
  }

  submit(a: ApplicantResponse): void {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.saveError.set(false);

    let request: Observable<unknown>;
    let flash: string;
    switch (this.decision()) {
      case 'approve':
        request = this.api.recordInterview(a.id, {
          conductedDate: this.today,
          canDescribeBusiness: true,
          appearsGenuine: true,
          hasRunningBusiness: true,
          notes: this.notes().trim() || undefined,
          outcome: 'PASS',
          conductedBy: this.agentName(),
        }).pipe(switchMap(() => this.recordVerification(a.id, 'VERIFIED')));
        flash = 'agent.sentToHub';
        break;
      case 'visit':
        request = this.api.scheduleInterview(a.id, this.visitDate());
        flash = 'agent.visitBooked';
        break;
      case 'reject':
        // Keep whatever the agent gathered on the visit as evidence, then close the application.
        request = (this.lat() != null || this.photos().length > 0 || this.notes().trim()
          ? this.recordVerification(a.id, 'FAILED').pipe(switchMap(() => this.rejectStage(a.id)))
          : this.rejectStage(a.id));
        flash = 'agent.rejectedDone';
        break;
    }

    request.subscribe({
      next: () => this.router.navigate(['/facilitator'], { state: { flash } }),
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }

  resolveUrl(u: string): string {
    return u.startsWith('http') ? u : this.api.baseUrl + u;
  }

  private recordVerification(id: string, outcome: 'VERIFIED' | 'FAILED') {
    return this.api.recordVerification(id, {
      visitDate: this.today,
      latitude: this.lat() ?? undefined,
      longitude: this.lng() ?? undefined,
      photoUrls: this.photos(),
      notes: this.notes().trim() || undefined,
      outcome,
      verifiedBy: this.agentName(),
    });
  }

  private rejectStage(id: string) {
    return this.api.updateApplicantStage(id, 'REJECTED', this.reason().trim());
  }

  // An applicant who was visited before keeps their pin, photos and notes.
  private loadEarlierVisit(id: string): void {
    this.api.getVerification(id).subscribe({
      next: v => {
        if (v.latitude != null && v.longitude != null) this.setPin(v.latitude, v.longitude, null);
        if (v.photoUrls?.length) this.photos.set(v.photoUrls);
        if (v.notes) this.notes.set(v.notes);
      },
      error: () => { /* no earlier visit */ },
    });
  }

  private agentName(): string | undefined {
    return this.auth.displayName() ?? undefined;
  }

  private localDate(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
