import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService, ApplicantResponse } from '../../services/api.service';
import { UnifiedAuthService } from '../../services/unified-auth.service';
import { ALL_COMMUNITIES, CommunityService } from '../../services/community.service';
import { LoginGateComponent } from '../../components/login-gate/login-gate.component';
import { TranslatePipe } from '../../pipes/translate.pipe';

type Tab = 'toVisit' | 'withHub' | 'done';

// Today's pipeline stages, grouped into the agent's three lists. A verified
// applicant sits in BUSINESS_VERIFICATION until the Hub Coordinator approves.
const TAB_STAGES: Record<Tab, ReadonlySet<string>> = {
  toVisit: new Set(['CAPTURED', 'CALLING', 'INTERVIEW_SCHEDULED', 'INTERVIEWED']),
  withHub: new Set(['BUSINESS_VERIFICATION']),
  done: new Set(['APPROVED', 'REJECTED']),
};

@Component({
  selector: 'app-agent-queue-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LoginGateComponent, TranslatePipe],
  template: `
    <app-login-gate *ngIf="!authorized()"
      icon="🏛️"
      title="Community Agent Sign In"
      subtitle="This section is for Community Agents and Hub Coordinators."
      [requiredRoles]="['FACILITATOR','COORDINATOR']"
    ></app-login-gate>

    <section class="agent" *ngIf="authorized()">
      <header class="head dash-head">
        <div class="head-inner">
          <p class="eyebrow">{{ 'agent.eyebrow' | translate }}<ng-container *ngIf="community.selected() as c"> · {{ c.name }}</ng-container></p>
          <h1 class="title">{{ 'agent.title' | translate }}</h1>
          <p class="intro">{{ 'agent.intro' | translate }}</p>
          <div class="tabs seg-tabs" role="group" [attr.aria-label]="'agent.title' | translate">
            <button type="button" [attr.aria-pressed]="tab() === 'toVisit'" (click)="tab.set('toVisit')">
              {{ 'agent.tabToVisit' | translate }} <span class="count">{{ counts().toVisit }}</span>
            </button>
            <button type="button" [attr.aria-pressed]="tab() === 'withHub'" (click)="tab.set('withHub')">
              {{ 'agent.tabWithHub' | translate }} <span class="count">{{ counts().withHub }}</span>
            </button>
            <button type="button" [attr.aria-pressed]="tab() === 'done'" (click)="tab.set('done')">
              {{ 'agent.tabDone' | translate }} <span class="count">{{ counts().done }}</span>
            </button>
          </div>
        </div>
      </header>

      <div class="body">
        <p class="flash" *ngIf="flash()" role="status">
          <mat-icon aria-hidden="true">check_circle</mat-icon>{{ flash()! | translate }}
        </p>

        <p class="sr-only" aria-live="polite">{{ loadState() === 'loading' ? ('marketplace.loading' | translate) : '' }}</p>

        <div class="state" *ngIf="loadState() === 'error'" role="alert">
          <p>{{ 'agent.loadError' | translate }}</p>
          <button type="button" class="btn btn-line" (click)="load()">{{ 'agent.retry' | translate }}</button>
        </div>

        <ng-container *ngIf="loadState() === 'ready'">
          <p class="order-note" *ngIf="tab() === 'toVisit' && visible().length > 0">{{ 'agent.oldestFirst' | translate }}</p>

          <p class="state" *ngIf="visible().length === 0">{{ emptyKey() | translate }}</p>

          <ul class="list" role="list">
            <li class="card" *ngFor="let a of visible(); let first = first; trackBy: trackById">
              <div class="who">
                <strong class="name">{{ a.firstName }} {{ a.lastName }}</strong>
                <span class="hustle">{{ a.typeOfHustle }}</span>
              </div>
              <div class="meta">
                <span>{{ a.communityName }}<ng-container *ngIf="a.districtSection"> · {{ a.districtSection }}</ng-container></span>
                <span>{{ 'agent.applied' | translate }} {{ a.createdAt | date:'d MMM' }}</span>
                <span>{{ 'agent.phoneEnding' | translate }} {{ phoneEnding(a.phone) }}</span>
              </div>
              <div class="status" [ngSwitch]="a.pipelineStage">
                <span *ngSwitchCase="'BUSINESS_VERIFICATION'" class="tag hub">{{ 'agent.waitingHub' | translate }}</span>
                <span *ngSwitchCase="'APPROVED'" class="tag ok">{{ 'agent.approved' | translate }}</span>
                <span *ngSwitchCase="'REJECTED'" class="tag no">{{ 'agent.rejected' | translate }}<ng-container *ngIf="a.rejectionReason">: {{ a.rejectionReason }}</ng-container></span>
                <span *ngSwitchDefault class="tag sell">{{ 'agent.wantsToSell' | translate }}</span>
              </div>
              <div class="actions">
                <a *ngIf="tab() === 'toVisit'" class="btn" [class.btn-gold]="first" [class.btn-line]="!first" [routerLink]="['/facilitator/visit', a.id]">{{ 'agent.startVisit' | translate }}</a>
                <a *ngIf="tab() !== 'toVisit'" class="btn btn-line" [routerLink]="['/facilitator/visit', a.id]">{{ 'agent.openVisit' | translate }}</a>
                <a class="btn btn-line" [href]="'tel:' + a.phone">{{ 'agent.call' | translate }}</a>
              </div>
            </li>
          </ul>
        </ng-container>

        <a class="tools" routerLink="/facilitator/programme">
          <span>
            <strong>{{ 'agent.programmeTools' | translate }}</strong>
            <span class="tools-sub">{{ 'agent.programmeToolsSub' | translate }}</span>
          </span>
          <mat-icon aria-hidden="true">chevron_right</mat-icon>
        </a>

        <button type="button" class="btn btn-line signout" (click)="logout()">{{ 'agent.signOut' | translate }}</button>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .agent { padding-bottom: 1.5rem; }

    .head-inner { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .eyebrow { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
    .title { font-size: 2.125rem; line-height: 1; }
    .intro { color: var(--nav-fg-muted); font-size: 0.9375rem; line-height: 1.4; max-width: 40rem; }

    .count { font-weight: 700; }

    .body { max-width: 1100px; margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .flash { display: flex; align-items: center; gap: 0.5rem; background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 14px; padding: 0.75rem 1rem; font-weight: 700; color: var(--success-text); }
    .order-note { font-size: 0.875rem; color: var(--text-secondary); }
    .state { text-align: center; color: var(--text-secondary); padding: 2rem 1rem; display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }

    .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .card { background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 18px; padding: 1rem; display: grid; gap: 0.625rem; grid-template-areas: "who" "meta" "status" "actions"; }
    .who { grid-area: who; display: flex; flex-direction: column; gap: 2px; }
    .name { font-size: 1.125rem; }
    .hustle { font-size: 0.9375rem; }
    .meta { grid-area: meta; display: flex; flex-wrap: wrap; gap: 0.25rem 0.875rem; font-size: 0.875rem; color: var(--text-secondary); }
    .status { grid-area: status; }
    .tag { display: inline-block; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
    .tag.sell { background: rgba(229, 163, 29, 0.2); color: var(--text-primary); }
    .tag.hub { background: rgba(47, 109, 181, 0.15); color: var(--text-primary); }
    .tag.ok { background: rgba(46, 107, 74, 0.15); color: var(--success-text); }
    .tag.no { background: rgba(200, 68, 58, 0.15); color: var(--text-primary); }
    .actions { grid-area: actions; display: grid; grid-template-columns: 2fr 1fr; gap: 0.625rem; }

    .btn { min-height: 48px; border-radius: 14px; font-weight: 700; font-size: 1rem; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; padding: 0 1rem; box-sizing: border-box; }
    .btn.btn-gold { background: var(--gold); color: var(--ink); }
    .btn.btn-line { background: transparent; border: 1.5px solid var(--text-primary); color: var(--text-primary); }

    .tools { margin-top: 0.75rem; display: flex; align-items: center; gap: 0.75rem; justify-content: space-between; min-height: 64px; padding: 0.75rem 1rem; border-radius: 16px; border: 1px solid var(--border-base); background: var(--bg-surface); color: var(--text-primary); text-decoration: none; }
    .tools > span { display: flex; flex-direction: column; gap: 2px; }
    .tools-sub { font-size: 0.8125rem; color: var(--text-secondary); }
    .signout { align-self: center; padding: 0 2rem; border-radius: 999px; }

    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

    @media (min-width: 1024px) {
      .head-inner { padding: 2rem 1.5rem 1.25rem; }
      .title { font-size: 2.5rem; }
      .tabs { max-width: 32rem; }
      .body { padding: 1.5rem; }
      .list { gap: 0; background: var(--bg-surface); border: 1px solid var(--border-base); border-radius: 18px; overflow: hidden; }
      .card { border: 0; border-radius: 0; border-bottom: 1px solid var(--border-base); align-items: center; padding: 0.875rem 1.25rem;
        grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.8fr) minmax(0, 1fr) 17rem; grid-template-areas: "who meta status actions"; }
      .card:last-child { border-bottom: 0; }
      .meta { flex-direction: column; gap: 2px; }
    }
  `
})
export class AgentQueuePageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(UnifiedAuthService);
  private readonly router = inject(Router);
  readonly community = inject(CommunityService);

  readonly authorized = computed(() => this.auth.isStaff());
  readonly tab = signal<Tab>('toVisit');
  readonly loadState = signal<'loading' | 'error' | 'ready'>('loading');
  readonly flash = signal<string | null>(history.state?.flash ?? null);
  private readonly applicants = signal<ApplicantResponse[]>([]);

  private readonly inCommunity = computed(() => {
    const id = this.community.selectedId();
    const list = this.applicants();
    return id === ALL_COMMUNITIES ? list : list.filter(a => a.communityId === id);
  });

  readonly counts = computed(() => {
    const list = this.inCommunity();
    const n = (t: Tab) => list.filter(a => TAB_STAGES[t].has(a.pipelineStage)).length;
    return { toVisit: n('toVisit'), withHub: n('withHub'), done: n('done') };
  });

  readonly visible = computed(() => {
    const stages = TAB_STAGES[this.tab()];
    const list = this.inCommunity().filter(a => stages.has(a.pipelineStage));
    // To visit: oldest application first. The other lists: most recent change first.
    return this.tab() === 'toVisit'
      ? [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      : [...list].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  });

  readonly emptyKey = computed(() => ({
    toVisit: 'agent.emptyToVisit', withHub: 'agent.emptyWithHub', done: 'agent.emptyDone',
  })[this.tab()]);

  ngOnInit(): void {
    if (this.authorized()) this.load();
  }

  load(): void {
    this.loadState.set('loading');
    this.api.listApplicants().subscribe({
      next: list => { this.applicants.set(list); this.loadState.set('ready'); },
      error: () => this.loadState.set('error'),
    });
  }

  phoneEnding(phone: string): string {
    return phone ? phone.replace(/\D/g, '').slice(-4) : '';
  }

  trackById(_: number, a: ApplicantResponse): string {
    return a.id;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/marketplace']);
  }
}
