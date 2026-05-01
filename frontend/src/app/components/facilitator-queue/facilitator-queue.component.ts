import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, HustlerApplication, Community, HustlerProfileUpdate, FacilitatorHustler, ApplicantResponse, ApplicantRequest, CohortCapResponse, InterviewResponse, InterviewRequest, BusinessVerificationResponse, BusinessVerificationRequest, ActivateApplicantResponse, MonthlyCheckInResponse, MonthlyCheckInRequest, IncomeEntryResponse, IncomeEntryRequest } from '../../services/api.service';
import { MapPickerComponent } from '../map-picker/map-picker.component';
import { generateMonthlyReportPdf, generateBulkMonthlyReportPdf, ReportHustler } from '../../utils/monthly-report.util';
import { AppSelectComponent } from '../app-select/app-select.component';

@Component({
  selector: 'app-facilitator-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, MapPickerComponent, AppSelectComponent],
  template: `
    <section class="card">
      <!-- TOP TABS -->
      <div class="top-tabs">
        <button [class.active]="fTab() === 'pipeline'" (click)="fTab.set('pipeline')">Pipeline</button>
        <button [class.active]="fTab() === 'hustlers'" (click)="fTab.set('hustlers')">Active<br>Hustlers</button>
        <button [class.active]="fTab() === 'exports'" (click)="fTab.set('exports')">Exports</button>
      </div>

      <!-- ===== PIPELINE TAB ===== -->
      <ng-container *ngIf="fTab() === 'pipeline'">

        <!-- Header -->
        <div class="pipeline-header">
          <div class="ph-text">
            <p class="eyebrow">Hustle Program</p>
            <h2>Applicant Pipeline</h2>
          </div>
          <button class="btn btn-add" (click)="showAddForm.set(!showAddForm())">
            {{ showAddForm() ? '✕ Cancel' : '+ Add Applicant' }}
          </button>
        </div>

        <!-- Add Applicant Form -->
        <div class="add-form-section" *ngIf="showAddForm()">
          <p class="edit-heading">New Applicant</p>
          <div class="edit-grid">
            <label>
              <span class="field-label">Community *</span>
              <app-select [(ngModel)]="newApplicant.communityId" [ngModelOptions]="{standalone: true}" [options]="addCommunityOpts()" placeholder="— Select community —"></app-select>
            </label>
            <label>
              <span class="field-label">Cohort</span>
              <app-select [(ngModel)]="newApplicant.cohortNumber" [ngModelOptions]="{standalone: true}" [options]="cohortAddOpts" placeholder="Cohort 8"></app-select>
            </label>
            <label>
              <span class="field-label">First Name *</span>
              <input [(ngModel)]="newApplicant.firstName" [ngModelOptions]="{standalone: true}" placeholder="First name" />
            </label>
            <label>
              <span class="field-label">Last Name *</span>
              <input [(ngModel)]="newApplicant.lastName" [ngModelOptions]="{standalone: true}" placeholder="Last name" />
            </label>
            <label>
              <span class="field-label">Gender</span>
              <app-select [(ngModel)]="newApplicant.gender" [ngModelOptions]="{standalone: true}" [options]="genderOpts" placeholder="— Select —"></app-select>
            </label>
            <label>
              <span class="field-label">Age</span>
              <input type="number" [(ngModel)]="newApplicant.age" [ngModelOptions]="{standalone: true}" placeholder="Age" min="1" max="99" />
            </label>
            <label>
              <span class="field-label">Phone *</span>
              <input [(ngModel)]="newApplicant.phone" [ngModelOptions]="{standalone: true}" placeholder="Phone number" />
            </label>
            <label>
              <span class="field-label">Email</span>
              <input [(ngModel)]="newApplicant.email" [ngModelOptions]="{standalone: true}" placeholder="Email (optional)" />
            </label>
            <label class="span-2">
              <span class="field-label">Type of Hustle *</span>
              <input [(ngModel)]="newApplicant.typeOfHustle" [ngModelOptions]="{standalone: true}" placeholder="e.g. Baking, Tuckshop, Poultry farming" />
            </label>
            <label class="span-2">
              <span class="field-label">District / Section</span>
              <input [(ngModel)]="newApplicant.districtSection" [ngModelOptions]="{standalone: true}" placeholder="e.g. Mhlekazi, KwaNtaba" />
            </label>
            <label class="span-2">
              <span class="field-label">Captured By</span>
              <input [(ngModel)]="newApplicant.capturedBy" [ngModelOptions]="{standalone: true}" placeholder="Your name" />
            </label>
          </div>
          <p *ngIf="addError()" class="edit-error">{{ addError() }}</p>
          <div class="edit-actions">
            <button class="btn approve" (click)="addApplicant()" [disabled]="addSaving()">
              {{ addSaving() ? 'Saving…' : '✓ Add Applicant' }}
            </button>
            <button class="btn btn-cancel" (click)="showAddForm.set(false); addError.set('')">Cancel</button>
          </div>
        </div>

        <!-- Search -->
        <div class="pipeline-search-row">
          <input
            class="pipeline-search"
            type="search"
            [ngModel]="pipelineSearch()"
            (ngModelChange)="pipelineSearch.set($event)"
            placeholder="Search by name, phone, hustle, district, community…"
            autocomplete="off" />
          <button *ngIf="pipelineSearch()" class="btn-search-clear" (click)="pipelineSearch.set('')">✕</button>
        </div>

        <!-- Filters -->
        <div class="filters">
          <label>
            <span>Community</span>
            <app-select [(ngModel)]="pipelineCommunityId" (ngModelChange)="onPipelineCommunityChange()" [options]="filterCommunityOpts()" placeholder="All communities"></app-select>
          </label>
          <label>
            <span>Cohort</span>
            <app-select [(ngModel)]="pipelineCohort" (ngModelChange)="onPipelineCommunityChange()" [options]="cohortFilterOpts" placeholder="Cohort 8"></app-select>
          </label>
        </div>

        <!-- Cap progress bar -->
        <div class="cap-bar" *ngIf="pipelineCommunityId && capStatus()">
          <div class="cap-info">
            <span class="cap-label">Cohort {{ pipelineCohort }} approved:</span>
            <span class="cap-count" [class.at-cap]="capStatus()!.atCap">
              {{ capStatus()!.approvedCount }} / {{ capStatus()!.cap }}
              <span *ngIf="capStatus()!.atCap" class="cap-badge">Cap reached</span>
            </span>
          </div>
          <div class="cap-track">
            <div class="cap-fill"
              [style.width.%]="(capStatus()!.approvedCount / capStatus()!.cap) * 100"
              [class.at-cap]="capStatus()!.atCap">
            </div>
          </div>
        </div>

        <!-- Stage filter tabs -->
        <div class="stage-scroll">
          <div class="stage-tabs">
            <button *ngFor="let s of stageOptions"
              [class.active]="pipelineStage() === s.value"
              (click)="pipelineStage.set(s.value)">
              {{ s.label }}
              <span class="stage-count" *ngIf="stageCount(s.value) > 0">{{ stageCount(s.value) }}</span>
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="pipelineLoading()" class="muted">Loading applicants…</div>

        <!-- Applicant list -->
        <div class="applicant-list" *ngIf="!pipelineLoading()">
          <article
            *ngFor="let a of filteredApplicants()"
            class="applicant-card"
            [class.expanded]="expandedApplicant() === a.id"
            [class.age-flagged]="a.ageFlag">

            <!-- Summary row -->
            <div class="ac-summary" (click)="toggleApplicant(a.id)">
              <div class="ac-main">
                <div class="ac-name-row">
                  <h3>{{ a.firstName }} {{ a.lastName }}</h3>
                  <span *ngIf="a.ageFlag" class="age-flag-badge" title="Outside 18–35 age range">Age ⚠</span>
                </div>
                <p class="muted small">{{ a.typeOfHustle }}<span *ngIf="a.districtSection"> · {{ a.districtSection }}</span></p>
                <p class="muted small">{{ a.phone }}</p>
              </div>
              <div class="ac-right">
                <span class="stage-badge stage-{{ a.pipelineStage.toLowerCase() }}">{{ stageLabel(a.pipelineStage) }}</span>
                <span class="call-badge call-{{ a.callStatus.toLowerCase() }}">{{ callLabel(a.callStatus) }}</span>
                <span class="chevron">{{ expandedApplicant() === a.id ? '▲' : '▼' }}</span>
              </div>
            </div>

            <!-- Expanded detail -->
            <div class="ac-detail" *ngIf="expandedApplicant() === a.id" (click)="$event.stopPropagation()">
              <div class="detail-grid">
                <div class="detail-field"><span class="field-label">Community</span><span>{{ a.communityName }}</span></div>
                <div class="detail-field"><span class="field-label">Cohort</span><span>{{ a.cohortNumber }}</span></div>
                <div class="detail-field"><span class="field-label">Gender</span><span>{{ a.gender || '—' }}</span></div>
                <div class="detail-field">
                  <span class="field-label">Age</span>
                  <span [class.age-warn]="a.ageFlag">{{ a.age ?? '—' }}<span *ngIf="a.ageFlag"> ⚠ outside 18–35</span></span>
                </div>
                <div class="detail-field"><span class="field-label">Email</span><span>{{ a.email || '—' }}</span></div>
                <div class="detail-field"><span class="field-label">Captured By</span><span>{{ a.capturedBy || '—' }}</span></div>
              </div>

              <!-- Call status quick update -->
              <div class="action-row" *ngIf="a.pipelineStage !== 'APPROVED' && a.pipelineStage !== 'REJECTED'">
                <span class="field-label">Call outcome:</span>
                <div class="call-actions">
                  <button
                    *ngFor="let cs of callStatusOptions"
                    class="btn btn-call"
                    [class.active-call]="a.callStatus === cs.value"
                    [disabled]="callUpdatingId() === a.id"
                    (click)="setCallStatus(a, cs.value)">
                    {{ cs.label }}
                  </button>
                </div>
              </div>

              <!-- Reinstate button for rejected applicants -->
              <div class="stage-actions" *ngIf="a.pipelineStage === 'REJECTED'">
                <div class="rejected-reason" *ngIf="a.rejectionReason">
                  <span class="field-label">Rejection reason:</span>
                  <span class="reason-text">{{ a.rejectionReason }}</span>
                </div>
                <button class="btn btn-reinstate" (click)="reinstateApplicant(a)" [disabled]="stageUpdatingId() === a.id">
                  {{ stageUpdatingId() === a.id ? 'Saving…' : '↩ Reinstate Applicant' }}
                </button>
              </div>

              <!-- Stage actions -->
              <div class="stage-actions" *ngIf="a.pipelineStage !== 'APPROVED' && a.pipelineStage !== 'REJECTED'">
                <!-- Coordinator-only: schedule interview -->
                <ng-container *ngIf="coordinatorMode && (a.pipelineStage === 'CALLING' || a.pipelineStage === 'CAPTURED')">
                  <div class="schedule-row" *ngIf="scheduleFormId() !== a.id">
                    <button class="btn btn-schedule" (click)="scheduleFormId.set(a.id)">📅 Schedule Interview</button>
                  </div>
                  <div class="schedule-form" *ngIf="scheduleFormId() === a.id">
                    <label>
                      <span class="field-label">Interview Date *</span>
                      <input type="date" [(ngModel)]="scheduleDate[a.id]" [ngModelOptions]="{standalone: true}" />
                    </label>
                    <p *ngIf="scheduleErrors[a.id]" class="edit-error">{{ scheduleErrors[a.id] }}</p>
                    <div class="edit-actions mt-sm">
                      <button class="btn btn-advance" (click)="saveSchedule(a)" [disabled]="scheduleSavingId() === a.id">
                        {{ scheduleSavingId() === a.id ? 'Saving…' : '✓ Confirm Schedule' }}
                      </button>
                      <button class="btn btn-cancel" (click)="scheduleFormId.set(null)">Cancel</button>
                    </div>
                  </div>
                </ng-container>
                <button
                  *ngIf="nextStageValue(a.pipelineStage)"
                  class="btn btn-advance"
                  [disabled]="stageUpdatingId() === a.id"
                  (click)="advanceStage(a)">
                  {{ stageUpdatingId() === a.id ? 'Saving…' : '→ Move to ' + stageLabel(nextStageValue(a.pipelineStage)!) }}
                </button>
                <button class="btn reject" *ngIf="rejectFormId() !== a.id" (click)="rejectFormId.set(a.id)">✕ Reject</button>
              </div>

              <!-- Rejection reason form — outside stage-actions so it doesn't stretch the buttons -->
              <div class="reject-form" *ngIf="rejectFormId() === a.id">
                <p class="field-label" style="margin-bottom:0.4rem">Reason for rejection *</p>
                <app-select [(ngModel)]="rejectReasons[a.id]" [ngModelOptions]="{standalone: true}" [options]="rejectReasonOpts" placeholder="— Select a reason —"></app-select>
                <textarea
                  *ngIf="rejectReasons[a.id] === 'Other'"
                  [(ngModel)]="rejectReasonOther[a.id]"
                  [ngModelOptions]="{standalone: true}"
                  rows="2"
                  placeholder="Please specify the reason…"
                  style="margin-top:0.4rem; width:100%; box-sizing:border-box;">
                </textarea>
                <p *ngIf="rejectErrors[a.id]" class="edit-error">{{ rejectErrors[a.id] }}</p>
                <div class="edit-actions" style="margin-top:0.5rem">
                  <button class="btn reject" (click)="confirmReject(a)" [disabled]="stageUpdatingId() === a.id">
                    {{ stageUpdatingId() === a.id ? 'Saving…' : '✕ Confirm Rejection' }}
                  </button>
                  <button class="btn btn-cancel" (click)="rejectFormId.set(null)">Cancel</button>
                </div>
              </div>

              <!-- ── Interview form (stage = INTERVIEW_SCHEDULED) ── -->
              <div class="phase-section" *ngIf="a.pipelineStage === 'INTERVIEW_SCHEDULED'">
                <p class="phase-heading">Record Interview Outcome</p>
                <div class="edit-grid">
                  <label>
                    <span class="field-label">Date conducted *</span>
                    <input type="date" [(ngModel)]="interviewForms[a.id].conductedDate" [ngModelOptions]="{standalone: true}" />
                  </label>
                  <label>
                    <span class="field-label">Conducted By</span>
                    <input [(ngModel)]="interviewForms[a.id].conductedBy" [ngModelOptions]="{standalone: true}" placeholder="Your name" />
                  </label>
                </div>
                <div class="criteria-list">
                  <label class="criteria-row">
                    <input type="checkbox" [(ngModel)]="interviewForms[a.id].canDescribeBusiness" [ngModelOptions]="{standalone: true}" />
                    <span>Can clearly describe their business</span>
                  </label>
                  <label class="criteria-row">
                    <input type="checkbox" [(ngModel)]="interviewForms[a.id].appearsGenuine" [ngModelOptions]="{standalone: true}" />
                    <span>Appears genuine and truthful</span>
                  </label>
                  <label class="criteria-row">
                    <input type="checkbox" [(ngModel)]="interviewForms[a.id].hasRunningBusiness" [ngModelOptions]="{standalone: true}" />
                    <span>Has an actual running micro business</span>
                  </label>
                </div>
                <label class="full-label">
                  <span class="field-label">Notes</span>
                  <textarea rows="2" [(ngModel)]="interviewForms[a.id].notes" [ngModelOptions]="{standalone: true}" placeholder="Any notes from the interview…"></textarea>
                </label>
                <div class="outcome-row">
                  <span class="field-label">Outcome:</span>
                  <div class="outcome-btns">
                    <button class="btn outcome-pass" [class.selected]="interviewForms[a.id].outcome === 'PASS'" (click)="interviewForms[a.id].outcome = 'PASS'">✓ Pass</button>
                    <button class="btn outcome-fail" [class.selected]="interviewForms[a.id].outcome === 'FAIL'" (click)="interviewForms[a.id].outcome = 'FAIL'">✕ Fail</button>
                    <button class="btn outcome-noshow" [class.selected]="interviewForms[a.id].outcome === 'NO_SHOW'" (click)="interviewForms[a.id].outcome = 'NO_SHOW'">— No Show</button>
                  </div>
                </div>
                <p *ngIf="interviewErrors[a.id]" class="edit-error">{{ interviewErrors[a.id] }}</p>
                <button class="btn approve mt-sm" (click)="submitInterview(a)" [disabled]="interviewSavingId() === a.id">
                  {{ interviewSavingId() === a.id ? 'Saving…' : '✓ Save Interview' }}
                </button>
              </div>

              <!-- ── Interview result (stage past INTERVIEW_SCHEDULED) ── -->
              <ng-container *ngIf="interviewData[a.id] && a.pipelineStage !== 'INTERVIEW_SCHEDULED' && a.pipelineStage !== 'CAPTURED' && a.pipelineStage !== 'CALLING'">

                <!-- Read-only view -->
                <div class="phase-section phase-done" *ngIf="interviewEditingId() !== a.id">
                  <div class="phase-heading-row">
                    <p class="phase-heading" style="margin:0">Interview <span class="outcome-chip outcome-{{ interviewData[a.id].outcome?.toLowerCase() }}">{{ interviewData[a.id].outcome }}</span></p>
                    <button class="btn btn-edit-interview" (click)="beginEditInterview(a)">✎ Edit</button>
                  </div>
                  <div class="criteria-result">
                    <span [class.crit-yes]="interviewData[a.id].canDescribeBusiness" [class.crit-no]="!interviewData[a.id].canDescribeBusiness">
                      {{ interviewData[a.id].canDescribeBusiness ? '✓' : '✕' }} Describes business
                    </span>
                    <span [class.crit-yes]="interviewData[a.id].appearsGenuine" [class.crit-no]="!interviewData[a.id].appearsGenuine">
                      {{ interviewData[a.id].appearsGenuine ? '✓' : '✕' }} Appears genuine
                    </span>
                    <span [class.crit-yes]="interviewData[a.id].hasRunningBusiness" [class.crit-no]="!interviewData[a.id].hasRunningBusiness">
                      {{ interviewData[a.id].hasRunningBusiness ? '✓' : '✕' }} Running business
                    </span>
                  </div>
                  <p *ngIf="interviewData[a.id].notes" class="phase-notes">{{ interviewData[a.id].notes }}</p>
                </div>

                <!-- Edit form -->
                <div class="phase-section" *ngIf="interviewEditingId() === a.id">
                  <p class="phase-heading">Edit Interview Outcome</p>
                  <div class="edit-grid">
                    <label>
                      <span class="field-label">Date conducted *</span>
                      <input type="date" [(ngModel)]="interviewForms[a.id].conductedDate" [ngModelOptions]="{standalone: true}" />
                    </label>
                    <label>
                      <span class="field-label">Conducted By</span>
                      <input [(ngModel)]="interviewForms[a.id].conductedBy" [ngModelOptions]="{standalone: true}" placeholder="Your name" />
                    </label>
                  </div>
                  <div class="criteria-list">
                    <label class="criteria-row">
                      <input type="checkbox" [(ngModel)]="interviewForms[a.id].canDescribeBusiness" [ngModelOptions]="{standalone: true}" />
                      <span>Can clearly describe their business</span>
                    </label>
                    <label class="criteria-row">
                      <input type="checkbox" [(ngModel)]="interviewForms[a.id].appearsGenuine" [ngModelOptions]="{standalone: true}" />
                      <span>Appears genuine and truthful</span>
                    </label>
                    <label class="criteria-row">
                      <input type="checkbox" [(ngModel)]="interviewForms[a.id].hasRunningBusiness" [ngModelOptions]="{standalone: true}" />
                      <span>Has an actual running micro business</span>
                    </label>
                  </div>
                  <label class="full-label">
                    <span class="field-label">Notes</span>
                    <textarea rows="2" [(ngModel)]="interviewForms[a.id].notes" [ngModelOptions]="{standalone: true}" placeholder="Any notes from the interview…"></textarea>
                  </label>
                  <div class="outcome-row">
                    <span class="field-label">Outcome:</span>
                    <div class="outcome-btns">
                      <button class="btn outcome-pass" [class.selected]="interviewForms[a.id].outcome === 'PASS'" (click)="interviewForms[a.id].outcome = 'PASS'">✓ Pass</button>
                      <button class="btn outcome-fail" [class.selected]="interviewForms[a.id].outcome === 'FAIL'" (click)="interviewForms[a.id].outcome = 'FAIL'">✕ Fail</button>
                      <button class="btn outcome-noshow" [class.selected]="interviewForms[a.id].outcome === 'NO_SHOW'" (click)="interviewForms[a.id].outcome = 'NO_SHOW'">— No Show</button>
                    </div>
                  </div>
                  <p *ngIf="interviewErrors[a.id]" class="edit-error">{{ interviewErrors[a.id] }}</p>
                  <div class="edit-actions mt-sm">
                    <button class="btn approve" (click)="submitInterview(a)" [disabled]="interviewSavingId() === a.id">
                      {{ interviewSavingId() === a.id ? 'Saving…' : '✓ Save Changes' }}
                    </button>
                    <button class="btn btn-cancel" (click)="interviewEditingId.set(null)">Cancel</button>
                  </div>
                </div>

              </ng-container>

              <!-- ── Verification form (stage = BUSINESS_VERIFICATION) ── -->
              <div class="phase-section" *ngIf="a.pipelineStage === 'BUSINESS_VERIFICATION'">
                <p class="phase-heading">Record Business Verification</p>
                <div class="edit-grid">
                  <label>
                    <span class="field-label">Visit Date *</span>
                    <input type="date" [(ngModel)]="verifyForms[a.id].visitDate" [ngModelOptions]="{standalone: true}" />
                  </label>
                  <label>
                    <span class="field-label">Verified By</span>
                    <input [(ngModel)]="verifyForms[a.id].verifiedBy" [ngModelOptions]="{standalone: true}" placeholder="Your name" />
                  </label>
                </div>

                <!-- GPS capture -->
                <div class="gps-row">
                  <button class="btn btn-gps" (click)="captureGps(a.id)" [disabled]="gpsLoadingId() === a.id">
                    {{ gpsLoadingId() === a.id ? 'Getting location…' : '📍 Get My Location' }}
                  </button>
                  <span *ngIf="verifyForms[a.id].latitude" class="gps-coords">
                    {{ verifyForms[a.id].latitude | number:'1.5-5' }}, {{ verifyForms[a.id].longitude | number:'1.5-5' }}
                  </span>
                  <span *ngIf="gpsError[a.id]" class="edit-error">{{ gpsError[a.id] }}</span>
                </div>

                <!-- Leaflet map for manual pin -->
                <app-map-picker
                  [lat]="verifyForms[a.id].latitude ?? null"
                  [lng]="verifyForms[a.id].longitude ?? null"
                  (coordsChange)="onMapPin(a.id, $event)">
                </app-map-picker>

                <!-- Photo upload -->
                <div class="photo-upload-row">
                  <span class="field-label">Photos (tap to add)</span>
                  <div class="photo-list">
                    <div *ngFor="let url of verifyForms[a.id].photoUrls; let i = index" class="photo-thumb">
                      <img [src]="url" alt="Verification photo" />
                      <button class="photo-remove" (click)="removePhoto(a.id, i)">✕</button>
                    </div>
                    <label class="photo-add-btn" *ngIf="(verifyForms[a.id].photoUrls?.length ?? 0) < 3">
                      <input type="file" accept="image/*" (change)="uploadPhoto(a.id, $event)" hidden />
                      <span>+ Photo</span>
                    </label>
                  </div>
                  <p class="muted small">Up to 3 photos. Each must show the hustler, business, and products.</p>
                </div>

                <label class="full-label">
                  <span class="field-label">Notes</span>
                  <textarea rows="2" [(ngModel)]="verifyForms[a.id].notes" [ngModelOptions]="{standalone: true}" placeholder="Observations from the visit…"></textarea>
                </label>
                <div class="outcome-row">
                  <span class="field-label">Outcome:</span>
                  <div class="outcome-btns">
                    <button class="btn outcome-pass" [class.selected]="verifyForms[a.id].outcome === 'VERIFIED'" (click)="verifyForms[a.id].outcome = 'VERIFIED'">✓ Verified</button>
                    <button class="btn outcome-fail" [class.selected]="verifyForms[a.id].outcome === 'FAILED'" (click)="verifyForms[a.id].outcome = 'FAILED'">✕ Failed</button>
                  </div>
                </div>
                <p *ngIf="verifyErrors[a.id]" class="edit-error">{{ verifyErrors[a.id] }}</p>
                <button class="btn approve mt-sm" (click)="submitVerification(a)" [disabled]="verifySavingId() === a.id">
                  {{ verifySavingId() === a.id ? 'Saving…' : '✓ Save Verification' }}
                </button>
              </div>

              <!-- ── Verification result read-only ── -->
              <div class="phase-section phase-done" *ngIf="verificationData[a.id] && a.pipelineStage === 'APPROVED'">
                <p class="phase-heading">Verification <span class="outcome-chip outcome-{{ verificationData[a.id].outcome?.toLowerCase() }}">{{ verificationData[a.id].outcome }}</span></p>
                <p *ngIf="verificationData[a.id].latitude" class="gps-coords">
                  GPS: {{ verificationData[a.id].latitude | number:'1.5-5' }}, {{ verificationData[a.id].longitude | number:'1.5-5' }}
                </p>
                <div class="photo-list" *ngIf="verificationData[a.id].photoUrls?.length">
                  <div *ngFor="let url of verificationData[a.id].photoUrls" class="photo-thumb">
                    <img [src]="url" alt="Verification photo" />
                  </div>
                </div>
              </div>

              <!-- ── Account activation (stage = APPROVED) ── -->
              <div class="phase-section" *ngIf="a.pipelineStage === 'APPROVED'">
                <ng-container *ngIf="!a.activatedAt">
                  <p class="phase-heading">Create Hustler Account</p>
                  <p class="muted small">A login will be created for this applicant. The generated password is shown once — send it to them directly.</p>
                  <button class="btn btn-activate-acc mt-sm" (click)="activateApplicant(a)" [disabled]="activatingId() === a.id">
                    {{ activatingId() === a.id ? 'Creating account…' : '▶ Create Account' }}
                  </button>
                  <p *ngIf="activateErrors[a.id]" class="edit-error">{{ activateErrors[a.id] }}</p>
                </ng-container>
                <div *ngIf="a.activatedAt" class="cred-row">
                  <p class="approved-msg">✓ Account active — created {{ a.activatedAt | date:'mediumDate' }}</p>
                  <button class="btn btn-cred" (click)="resendCredentials(a)" [disabled]="resendingCredId() === a.id">
                    {{ resendingCredId() === a.id ? 'Generating…' : '🔑 Resend Credentials' }}
                  </button>
                  <p *ngIf="resendCredErrors[a.id]" class="edit-error">{{ resendCredErrors[a.id] }}</p>
                </div>
              </div>
              <p class="muted small added-at">Added {{ a.createdAt | date:'mediumDate' }}</p>
            </div>
          </article>

          <p *ngIf="filteredApplicants().length === 0" class="muted empty-msg">
            No applicants found{{ pipelineSearch() ? ' matching "' + pipelineSearch() + '"' : (pipelineStage() ? ' at this stage' : '') }}.
          </p>
        </div>
      </ng-container>

      <!-- ===== HUSTLERS TAB ===== -->
      <ng-container *ngIf="fTab() === 'hustlers'">
        <p class="muted sub-heading">Active hustlers in this cohort — click a record to view details.</p>

        <div *ngIf="hustlersLoading()" class="muted">Loading hustlers…</div>

        <div class="hustler-list" *ngIf="!hustlersLoading()">
          <article
            *ngFor="let h of hustlers()"
            class="hustler-card"
            [class.expanded]="expandedHustler() === h.businessProfileId"
            (click)="toggleHustler(h.businessProfileId)"
          >
            <!-- SUMMARY ROW -->
            <div class="hc-summary">
              <div class="hc-main">
                <div class="hc-name-row">
                  <h3>{{ h.firstName }} {{ h.lastName }}</h3>
                  <span *ngIf="h.missedCheckIn" class="missed-badge" title="No visit this month">No visit</span>
                </div>
                <p class="muted small">{{ h.businessName }} &middot; {{ h.businessType }}</p>
                <p class="muted small">{{ h.communityName || 'No community' }}</p>
              </div>
              <div class="hc-right">
                <div class="profit-chip" [class.positive]="h.monthProfit >= 0" [class.negative]="h.monthProfit < 0">
                  <span class="profit-label">Month profit</span>
                  <span class="profit-val">R {{ h.monthProfit | number:'1.2-2' }}</span>
                </div>
                <span class="chevron">{{ expandedHustler() === h.businessProfileId ? '&#9650;' : '&#9660;' }}</span>
              </div>
            </div>

            <!-- EXPANDED DETAIL -->
            <div class="hc-detail" *ngIf="expandedHustler() === h.businessProfileId" (click)="$event.stopPropagation()">
              <!-- Sub-tabs -->
              <div class="sub-tabs">
                <button [class.active]="hSubTab() === 'finance'" (click)="openFinanceTab(h)">Finances</button>
                <button [class.active]="hSubTab() === 'business'" (click)="hSubTab.set('business')">Business</button>
                <button [class.active]="hSubTab() === 'checkin'" (click)="openCheckInTab(h)">
                  Check-in<span *ngIf="h.missedCheckIn" class="missed-dot">●</span>
                </button>
              </div>

              <!-- Finance sub-tab -->
              <div *ngIf="hSubTab() === 'finance'" class="finance-panel">
                <div class="stat-row">
                  <div class="stat-box">
                    <span class="stat-label">Month Income</span>
                    <span class="stat-val income">R {{ h.monthIncome | number:'1.2-2' }}</span>
                  </div>
                  <div class="stat-box">
                    <span class="stat-label">Month Expenses</span>
                    <span class="stat-val expense">R {{ h.monthExpenses | number:'1.2-2' }}</span>
                  </div>
                  <div class="stat-box">
                    <span class="stat-label">Month Profit</span>
                    <span class="stat-val" [class.income]="h.monthProfit >= 0" [class.expense]="h.monthProfit < 0">R {{ h.monthProfit | number:'1.2-2' }}</span>
                  </div>
                </div>

                <!-- Monthly Report Download -->
                <div class="report-bar">
                  <div class="report-bar-left">
                    <span class="report-bar-icon">📄</span>
                    <div>
                      <p class="report-bar-title">Monthly Report</p>
                      <p class="report-bar-sub">{{ h.businessName }}</p>
                    </div>
                  </div>
                  <div class="report-bar-right">
                    <input type="month" [(ngModel)]="reportMonth" [ngModelOptions]="{standalone:true}" class="report-month-input" />
                    <button class="report-dl-btn" (click)="downloadMonthlyReport(h)" [disabled]="reportDownloading() === h.businessProfileId">
                      {{ reportDownloading() === h.businessProfileId ? 'Generating…' : '↓ PDF' }}
                    </button>
                  </div>
                </div>

                <!-- Income History -->
                <div class="income-history-section">
                  <p class="phase-heading" style="margin-top:1rem">Income History</p>
                  <div *ngIf="incomeLoading() === h.businessProfileId" class="muted small" style="padding:0.5rem 0">Loading…</div>
                  <div *ngIf="incomeLoading() !== h.businessProfileId">
                    <div *ngIf="!incomeEntries[h.businessProfileId]?.length" class="muted small" style="padding:0.5rem 0">No entries recorded.</div>
                    <div *ngFor="let entry of incomeEntries[h.businessProfileId]" class="income-entry-row">

                      <!-- Edit form (inline) -->
                      <ng-container *ngIf="incomeEditingId() === entry.id; else incomeReadRow">
                        <div class="income-edit-form">
                          <div class="income-edit-grid">
                            <label>
                              <span class="field-label">Date</span>
                              <input type="date" [(ngModel)]="incomeEditData.date" [ngModelOptions]="{standalone: true}" />
                            </label>
                            <label>
                              <span class="field-label">Type</span>
                              <app-select [(ngModel)]="incomeEditData.entryType" [ngModelOptions]="{standalone: true}" [options]="entryTypeOpts" placeholder="Type"></app-select>
                            </label>
                            <label>
                              <span class="field-label">Amount (R)</span>
                              <input type="number" min="0" step="0.01" [(ngModel)]="incomeEditData.amount" [ngModelOptions]="{standalone: true}" />
                            </label>
                            <label>
                              <span class="field-label">Channel</span>
                              <app-select [(ngModel)]="incomeEditData.channel" [ngModelOptions]="{standalone: true}" [options]="channelOpts" placeholder="Channel"></app-select>
                            </label>
                            <label>
                              <span class="field-label">Category</span>
                              <app-select [(ngModel)]="incomeEditData.category" [ngModelOptions]="{standalone: true}" [options]="categoryOpts" placeholder="— Select —"></app-select>
                            </label>
                            <label class="income-edit-notes">
                              <span class="field-label">Notes</span>
                              <input type="text" [(ngModel)]="incomeEditData.notes" [ngModelOptions]="{standalone: true}" placeholder="Optional notes" />
                            </label>
                          </div>
                          <p *ngIf="incomeErrors[h.businessProfileId]" class="edit-error">{{ incomeErrors[h.businessProfileId] }}</p>
                          <div class="income-edit-actions">
                            <button class="btn approve" (click)="saveIncomeEdit(entry, h)" [disabled]="incomeSavingId() === h.businessProfileId">
                              {{ incomeSavingId() === h.businessProfileId ? 'Saving…' : '✓ Save' }}
                            </button>
                            <button class="btn btn-ghost" (click)="cancelIncomeEdit(h)">Cancel</button>
                          </div>
                        </div>
                      </ng-container>

                      <!-- Read view -->
                      <ng-template #incomeReadRow>
                        <div class="income-row-content">
                          <span class="income-date">{{ entry.date }}</span>
                          <span class="entry-type-badge" [class.badge-income]="entry.entryType === 'INCOME'" [class.badge-expense]="entry.entryType === 'EXPENSE'">{{ entry.entryType }}</span>
                          <span class="income-amount" [class.income]="entry.entryType === 'INCOME'" [class.expense]="entry.entryType === 'EXPENSE'">R {{ entry.amount | number:'1.2-2' }}</span>
                          <span class="income-cat muted small">{{ entry.category ? categoryLabel(entry.category) : entry.channel }}</span>
                          <span class="income-notes muted small">{{ entry.notes || '' }}</span>
                          <button class="btn-edit-sm" (click)="startIncomeEdit(entry, h)">Edit</button>
                        </div>
                      </ng-template>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Business sub-tab -->
              <div *ngIf="hSubTab() === 'business'" class="business-panel">
                <div class="detail-grid">
                  <div class="detail-field"><span class="field-label">Community</span><span>{{ h.communityName || '—' }}</span></div>
                  <div class="detail-field"><span class="field-label">Operating area</span><span>{{ h.operatingArea || '—' }}</span></div>
                  <div class="detail-field span-2"><span class="field-label">Description</span><p>{{ h.description || '—' }}</p></div>
                  <div class="detail-field span-2"><span class="field-label">Target Customers</span><p>{{ h.targetCustomers || '—' }}</p></div>
                  <div class="detail-field span-2"><span class="field-label">Vision</span><p>{{ h.vision || '—' }}</p></div>
                  <div class="detail-field span-2"><span class="field-label">Mission / Support needed</span><p>{{ h.mission || '—' }}</p></div>
                </div>
              </div>

              <!-- Check-in sub-tab -->
              <div *ngIf="hSubTab() === 'checkin'" class="checkin-panel">

                <!-- Missed warning -->
                <div class="missed-warn" *ngIf="h.missedCheckIn">
                  ⚠ No visit recorded yet this month.
                </div>

                <!-- Record check-in form -->
                <div class="checkin-form">
                  <p class="phase-heading">Record Visit — {{ currentMonth() }}</p>
                  <div class="edit-grid">
                    <label class="span-2">
                      <span class="field-label">Visited By</span>
                      <input [(ngModel)]="checkInForms[h.businessProfileId].visitedBy" [ngModelOptions]="{standalone: true}" placeholder="Your name" />
                    </label>
                    <label class="span-2">
                      <span class="field-label">Notes</span>
                      <textarea rows="2" [(ngModel)]="checkInForms[h.businessProfileId].notes" [ngModelOptions]="{standalone: true}" placeholder="How is the business doing this month?"></textarea>
                    </label>
                  </div>

                  <!-- Photo upload -->
                  <div class="photo-upload-row">
                    <span class="field-label">Photos</span>
                    <div class="photo-list">
                      <div *ngFor="let url of checkInForms[h.businessProfileId].photoUrls; let i = index" class="photo-thumb">
                        <img [src]="url" alt="Check-in photo" />
                        <button class="photo-remove" (click)="removeCheckInPhoto(h.businessProfileId, i)">✕</button>
                      </div>
                      <label class="photo-add-btn" *ngIf="(checkInForms[h.businessProfileId].photoUrls?.length ?? 0) < 3">
                        <input type="file" accept="image/*" (change)="uploadCheckInPhoto(h.businessProfileId, $event)" hidden />
                        <span>+ Photo</span>
                      </label>
                    </div>
                    <p class="muted small">Photo must show the hustler and their business activity.</p>
                  </div>

                  <p *ngIf="checkInErrors[h.businessProfileId]" class="edit-error">{{ checkInErrors[h.businessProfileId] }}</p>
                  <button class="btn approve mt-sm" (click)="submitCheckIn(h)" [disabled]="checkInSavingId() === h.businessProfileId">
                    {{ checkInSavingId() === h.businessProfileId ? 'Saving…' : '✓ Save Visit' }}
                  </button>
                </div>

                <!-- Check-in history -->
                <div class="checkin-history" *ngIf="checkInHistory[h.businessProfileId]?.length">
                  <p class="phase-heading" style="margin-top:1rem">Visit History</p>
                  <div *ngFor="let c of checkInHistory[h.businessProfileId]" class="checkin-entry">
                    <div class="ci-header">
                      <span class="ci-month">{{ c.visitMonth }}</span>
                      <span *ngIf="c.visitedBy" class="muted small">by {{ c.visitedBy }}</span>
                    </div>
                    <p *ngIf="c.notes" class="ci-notes">{{ c.notes }}</p>
                    <div class="photo-list" *ngIf="c.photoUrls?.length">
                      <div *ngFor="let url of c.photoUrls" class="photo-thumb">
                        <img [src]="url" alt="Visit photo" />
                      </div>
                    </div>
                  </div>
                </div>
                <p *ngIf="checkInHistory[h.businessProfileId]?.length === 0" class="muted small" style="margin-top:0.5rem">No previous visits recorded.</p>
              </div>

              <!-- FOOTER: Edit + Activate/Deactivate -->
              <div class="hc-footer">
                <button *ngIf="hEditingId() !== h.businessProfileId" class="btn btn-edit" (click)="startHEdit(h)">&#x270E; Edit business details</button>
                <button
                  class="btn"
                  [class.btn-deactivate]="h.active"
                  [class.btn-activate]="!h.active"
                  (click)="toggleActive(h)"
                  [disabled]="activeToggling() === h.businessProfileId"
                >
                  {{ activeToggling() === h.businessProfileId ? 'Saving…' : (h.active ? '⏸ Deactivate Hustler' : '▶ Activate Hustler') }}
                </button>
              </div>

              <!-- HUSTLER INLINE EDIT FORM -->
              <div class="edit-section" *ngIf="hEditingId() === h.businessProfileId">
                <p class="edit-heading">Edit business details</p>
                <div class="edit-grid">
                  <label class="span-2">
                    <span class="field-label">Community</span>
                    <app-select [(ngModel)]="hEditData.communityId" [ngModelOptions]="{standalone: true}" [options]="editCommunityOpts()" placeholder="— keep current —"></app-select>
                  </label>
                  <label class="span-2">
                    <span class="field-label">Operating area</span>
                    <input [(ngModel)]="hEditData.operatingArea" [ngModelOptions]="{standalone: true}" />
                  </label>
                  <label class="span-2">
                    <span class="field-label">Description</span>
                    <textarea rows="3" [(ngModel)]="hEditData.description" [ngModelOptions]="{standalone: true}"></textarea>
                  </label>
                  <label class="span-2">
                    <span class="field-label">Target Customers</span>
                    <textarea rows="2" [(ngModel)]="hEditData.targetCustomers" [ngModelOptions]="{standalone: true}"></textarea>
                  </label>
                  <label class="span-2">
                    <span class="field-label">Vision</span>
                    <textarea rows="2" [(ngModel)]="hEditData.vision" [ngModelOptions]="{standalone: true}"></textarea>
                  </label>
                  <label class="span-2">
                    <span class="field-label">Mission / Support needed</span>
                    <textarea rows="2" [(ngModel)]="hEditData.mission" [ngModelOptions]="{standalone: true}"></textarea>
                  </label>
                </div>
                <p *ngIf="hEditError()" class="edit-error">{{ hEditError() }}</p>
                <div class="edit-actions">
                  <button class="btn approve" (click)="saveHEdit(h)" [disabled]="hEditSaving()">
                    {{ hEditSaving() ? 'Saving…' : '&#10003; Save changes' }}
                  </button>
                  <button class="btn btn-cancel" (click)="hEditingId.set(null)">Cancel</button>
                </div>
              </div>

              <!-- DEACTIVATE CONFIRM OVERLAY -->
              <div class="confirm-overlay" *ngIf="confirmingDeactivate() === h.businessProfileId">
                <div class="confirm-box">
                  <p class="confirm-title">Deactivate Hustler?</p>
                  <p class="confirm-msg">Are you sure you want to deactivate <strong>{{ h.firstName }} {{ h.lastName }}</strong> ({{ h.businessName }})?</p>
                  <div class="confirm-actions">
                    <button class="btn btn-deactivate" (click)="confirmDeactivate(h)">Yes, deactivate</button>
                    <button class="btn btn-cancel" (click)="confirmingDeactivate.set(null)">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <p *ngIf="hustlers().length === 0" class="muted empty-msg">No active hustlers found.</p>
        </div>
      </ng-container>

      <!-- ===== EXPORTS TAB ===== -->
      <ng-container *ngIf="fTab() === 'exports'">
        <div class="exports-header">
          <h2>Admin Exports</h2>
          <p class="muted">Download CSV files for reporting and admin tasks. Pipeline exports use the community filter set in the Pipeline tab.</p>
        </div>

        <div class="export-section">
          <p class="export-section-title">Pipeline Reports</p>
          <div class="export-cards">
            <div class="export-card">
              <div class="export-info">
                <p class="export-name">Interview Shortlist</p>
                <p class="muted small">Applicants currently scheduled for interview</p>
              </div>
              <div class="export-actions">
                <button class="btn btn-export btn-export-csv" (click)="exportInterviewShortlist('csv')">↓ CSV</button>
                <button class="btn btn-export" (click)="exportInterviewShortlist('xlsx')">↓ Excel</button>
              </div>
            </div>
            <div class="export-card">
              <div class="export-info">
                <p class="export-name">Approved Applicants</p>
                <p class="muted small">All approved applicants — with account status</p>
              </div>
              <div class="export-actions">
                <button class="btn btn-export btn-export-csv" (click)="exportApprovedApplicants('csv')">↓ CSV</button>
                <button class="btn btn-export" (click)="exportApprovedApplicants('xlsx')">↓ Excel</button>
              </div>
            </div>
            <div class="export-card">
              <div class="export-info">
                <p class="export-name">Evaluated Applicants</p>
                <p class="muted small">Applicants who have completed their interview</p>
              </div>
              <div class="export-actions">
                <button class="btn btn-export btn-export-csv" (click)="exportEvaluatedApplicants('csv')">↓ CSV</button>
                <button class="btn btn-export" (click)="exportEvaluatedApplicants('xlsx')">↓ Excel</button>
              </div>
            </div>
            <div class="export-card">
              <div class="export-info">
                <p class="export-name">Verification</p>
                <p class="muted small">Applicants currently in business verification</p>
              </div>
              <div class="export-actions">
                <button class="btn btn-export btn-export-csv" (click)="exportVerificationApplicants('csv')">↓ CSV</button>
                <button class="btn btn-export" (click)="exportVerificationApplicants('xlsx')">↓ Excel</button>
              </div>
            </div>
            <div class="export-card">
              <div class="export-info">
                <p class="export-name">Full Pipeline</p>
                <p class="muted small">All applicants across every stage</p>
              </div>
              <div class="export-actions">
                <button class="btn btn-export btn-export-csv" (click)="exportFullPipeline('csv')">↓ CSV</button>
                <button class="btn btn-export" (click)="exportFullPipeline('xlsx')">↓ Excel</button>
              </div>
            </div>
          </div>
        </div>

        <div class="export-section">
          <p class="export-section-title">Hustler Reports</p>
          <div class="export-cards">
            <div class="export-card">
              <div class="export-info">
                <p class="export-name">Monthly Visit Report — {{ currentMonth() }}</p>
                <p class="muted small">All hustlers with visited / not visited this month</p>
              </div>
              <div class="export-actions">
                <button class="btn btn-export btn-export-csv" (click)="exportMonthlyVisitReport('csv')">↓ CSV</button>
                <button class="btn btn-export" (click)="exportMonthlyVisitReport('xlsx')">↓ Excel</button>
              </div>
            </div>
            <div class="export-card">
              <div class="export-info">
                <p class="export-name">Active Hustlers</p>
                <p class="muted small">All active hustlers with this month's financials</p>
              </div>
              <div class="export-actions">
                <button class="btn btn-export btn-export-csv" (click)="exportActiveHustlers('csv')">↓ CSV</button>
                <button class="btn btn-export" (click)="exportActiveHustlers('xlsx')">↓ Excel</button>
              </div>
            </div>
            <div class="report-bar report-bar-bulk">
              <div class="report-bar-left">
                <span class="report-bar-icon">📊</span>
                <div>
                  <p class="report-bar-title">Monthly Financial Reports — All Hustlers</p>
                  <p class="report-bar-sub">One PDF with a full 4-week financial report per active hustler</p>
                </div>
              </div>
              <div class="report-bar-right">
                <input type="month" [(ngModel)]="reportMonth" [ngModelOptions]="{standalone:true}" class="report-month-input" />
                <button class="report-dl-btn" (click)="downloadBulkMonthlyReports()" [disabled]="bulkReportDownloading()">
                  {{ bulkReportDownloading() ? 'Generating…' : '↓ PDF' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
      <!-- ── Password modal (shown once after activation) ── -->
      <div class="pwd-overlay" *ngIf="generatedPassword()">
        <div class="pwd-modal">
          <p class="pwd-title">Login Credentials</p>
          <p class="pwd-name">{{ generatedPasswordMeta().firstName }} {{ generatedPasswordMeta().lastName }}</p>
          <p class="pwd-label">Login username (phone):</p>
          <div class="pwd-box">
            <span class="pwd-value">{{ generatedPasswordMeta().phone }}</span>
          </div>
          <p class="pwd-label" style="margin-top:0.75rem">Temporary password — shown once only:</p>
          <div class="pwd-box">
            <span class="pwd-value">{{ generatedPassword() }}</span>
            <button class="btn btn-copy" (click)="copyPassword()">{{ copied() ? '✓ Copied' : 'Copy' }}</button>
          </div>
          <p class="pwd-warn">Give these credentials to the hustler directly. The password cannot be retrieved after this screen is closed.</p>
          <button class="btn approve pwd-close" (click)="generatedPassword.set('')">✓ Done — I've sent the password</button>
        </div>
      </div>
    </section>
  `,
  styles: `
    .card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 4px 24px rgba(28,25,23,0.08); border: 1px solid #E7E5E4; }
    @media (max-width: 600px) { .card { padding: 1.25rem; border-radius: 1rem; } }

    /* Top-level tabs */
    .top-tabs { display: flex; border-bottom: 2px solid #E7E5E4; margin-bottom: 1.5rem; }
    .top-tabs button { flex: 1; padding: 0.75rem 0.5rem; border: none; background: none; font-size: 0.85rem; font-weight: 700; color: #A8A29E; cursor: pointer; transition: all 0.2s; font-family: inherit; min-height: 48px; text-align: center; line-height: 1.25; }
    .top-tabs button.active { color: #1C1917; border-bottom: 2px solid #F5B800; margin-bottom: -2px; }

    .sub-heading { margin: 0 0 1.25rem; font-size: 0.9rem; color: #78716C; }
    .eyebrow { margin: 0 0 0.25rem; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #A8A29E; }

    /* ── Pipeline tab ───────────────────────────────────────────────────── */
    .pipeline-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; gap: 1rem; flex-wrap: wrap; }
    .ph-text h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #1C1917; }
    .btn-add { background: #F5B800; color: #1C1917; font-weight: 800; padding: 0.6rem 1.25rem; border-radius: 0.75rem; border: none; cursor: pointer; font-family: inherit; min-height: 44px; font-size: 0.9rem; }

    /* Search */
    .pipeline-search-row { position: relative; margin-bottom: 0.85rem; }
    .pipeline-search { width: 100%; box-sizing: border-box; padding: 0.65rem 2.5rem 0.65rem 1rem; border: 1.5px solid #E7E5E4; border-radius: 999px; font-size: 0.9rem; font-family: inherit; background: #FAFAF9; color: #1C1917; outline: none; min-height: 44px; }
    .pipeline-search:focus { border-color: #F5B800; background: white; }
    .pipeline-search::placeholder { color: #A8A29E; }
    .btn-search-clear { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: #A8A29E; font-size: 1rem; cursor: pointer; padding: 0.25rem; line-height: 1; }

    .add-form-section { background: rgba(245,184,0,0.04); border: 1px solid rgba(245,184,0,0.25); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.25rem; }

    /* Cap bar */
    .cap-bar { margin: 0 0 1rem; }
    .cap-info { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; font-size: 0.9rem; flex-wrap: wrap; }
    .cap-label { font-weight: 700; color: #78716C; }
    .cap-count { font-weight: 800; color: #1C1917; }
    .cap-count.at-cap { color: #E53935; }
    .cap-badge { background: rgba(229,57,53,0.1); color: #E53935; font-size: 0.72rem; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 999px; margin-left: 0.25rem; }
    .cap-track { height: 8px; background: #E7E5E4; border-radius: 999px; overflow: hidden; }
    .cap-fill { height: 100%; background: #2DB344; border-radius: 999px; transition: width 0.3s ease; max-width: 100%; }
    .cap-fill.at-cap { background: #E53935; }

    /* Stage filter tabs */
    .stage-scroll { overflow-x: auto; margin-bottom: 1rem; -webkit-overflow-scrolling: touch; }
    .stage-scroll::-webkit-scrollbar { display: none; }
    .stage-tabs { display: flex; gap: 0.3rem; white-space: nowrap; padding-bottom: 2px; }
    .stage-tabs button { padding: 0.4rem 0.85rem; border: 2px solid #E7E5E4; border-radius: 0.75rem; background: white; font-size: 0.78rem; font-weight: 700; color: #78716C; cursor: pointer; font-family: inherit; transition: all 0.15s; min-height: 36px; display: inline-flex; align-items: center; gap: 0.3rem; }
    .stage-tabs button.active { background: #F5B800; border-color: #F5B800; color: #1C1917; }
    .stage-count { background: rgba(28,25,23,0.12); border-radius: 999px; padding: 0 0.4rem; font-size: 0.68rem; font-weight: 800; }

    /* Applicant cards */
    .applicant-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .applicant-card { border: 1px solid #E7E5E4; border-radius: 1rem; overflow: hidden; background: #FAFAF9; }
    .applicant-card.expanded { border-color: #F5B800; box-shadow: 0 0 0 2px rgba(245,184,0,0.2); }
    .applicant-card.age-flagged { border-left: 3px solid #F97316; }
    .ac-summary { display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem 1.25rem; cursor: pointer; gap: 1rem; }
    .ac-summary:hover { background: rgba(245,184,0,0.04); }
    .ac-main { flex: 1; min-width: 0; }
    .ac-name-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.15rem; }
    .ac-main h3 { margin: 0; font-size: 1rem; font-weight: 800; color: #1C1917; }
    .ac-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; flex-shrink: 0; }
    .age-flag-badge { background: rgba(249,115,22,0.12); color: #C2410C; font-size: 0.7rem; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 999px; }

    /* Stage badges */
    .stage-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.7rem; font-weight: 800; }
    .stage-captured { background: #E7E5E4; color: #78716C; }
    .stage-calling { background: rgba(245,184,0,0.15); color: #92620A; }
    .stage-interview_scheduled { background: rgba(59,130,246,0.12); color: #1D4ED8; }
    .stage-interviewed { background: rgba(139,92,246,0.12); color: #6D28D9; }
    .stage-business_verification { background: rgba(249,115,22,0.12); color: #C2410C; }
    .stage-approved { background: rgba(45,179,68,0.12); color: #166534; }
    .stage-rejected { background: rgba(229,57,53,0.1); color: #E53935; }

    /* Call status badges */
    .call-badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.68rem; font-weight: 700; }
    .call-not_called { background: #F5F0E8; color: #A8A29E; }
    .call-reached { background: rgba(45,179,68,0.12); color: #166534; }
    .call-missed_call { background: rgba(229,57,53,0.08); color: #E53935; }
    .call-voicemail { background: rgba(59,130,246,0.1); color: #1D4ED8; }

    /* Applicant detail */
    .ac-detail { border-top: 1px solid #E7E5E4; padding: 1rem 1.25rem; }
    .action-row { margin: 0.75rem 0 0.5rem; }
    .action-row .field-label { display: block; margin-bottom: 0.4rem; }
    .call-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .btn-call { background: #F5F0E8; color: #78716C; font-size: 0.8rem; padding: 0.35rem 0.75rem; border-radius: 0.75rem; border: 2px solid transparent; min-height: 36px; cursor: pointer; font-family: inherit; font-weight: 700; transition: all 0.15s; }
    .btn-call.active-call { background: #1C1917; color: white; border-color: #1C1917; }
    .btn-call:disabled { opacity: 0.5; cursor: not-allowed; }
    .stage-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed #E7E5E4; }
    .btn-advance { background: #F5B800; color: #1C1917; }
    .approved-msg { color: #2DB344; font-weight: 700; font-size: 0.9rem; margin: 0; }
    .cred-row { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
    .btn-cred { background: #F5F0E8; color: #1C1917; border: 2px solid #E7E5E4; border-radius: 0.75rem; padding: 0.4rem 1rem; font-size: 0.85rem; font-weight: 700; cursor: pointer; font-family: inherit; min-height: 40px; align-self: flex-start; transition: all 0.15s; }
    .btn-cred:hover { border-color: #F5B800; background: rgba(245,184,0,0.08); }
    .btn-cred:disabled { opacity: 0.5; cursor: not-allowed; }
    .rejected-msg { color: #E53935; font-weight: 700; font-size: 0.9rem; margin: 0.5rem 0 0; }
    .age-warn { color: #E53935; font-weight: 700; }
    .added-at { margin: 0.75rem 0 0; color: #A8A29E; font-size: 0.75rem; }

    /* ── Shared ─────────────────────────────────────────────────────────── */
    .hustler-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .hustler-card { border: 1px solid #E7E5E4; border-radius: 1rem; overflow: hidden; background: #FAFAF9; cursor: pointer; }
    .hustler-card.expanded { border-color: #F5B800; box-shadow: 0 0 0 2px rgba(245,184,0,0.2); }
    .hc-summary { display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem 1.25rem; gap: 1rem; }
    .hc-summary:hover { background: rgba(245,184,0,0.04); }
    .hc-main h3 { margin: 0 0 0.2rem; font-size: 1rem; font-weight: 800; color: #1C1917; }
    .hc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
    .profit-chip { display: flex; flex-direction: column; align-items: flex-end; padding: 0.35rem 0.75rem; border-radius: 0.75rem; }
    .profit-chip.positive { background: rgba(45,179,68,0.1); }
    .profit-chip.negative { background: rgba(229,57,53,0.08); }
    .profit-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #A8A29E; }
    .profit-val { font-size: 0.95rem; font-weight: 800; }
    .profit-chip.positive .profit-val { color: #2DB344; }
    .profit-chip.negative .profit-val { color: #E53935; }
    .hc-detail { border-top: 1px solid #E7E5E4; padding: 1rem 1.25rem; }
    .sub-tabs { display: flex; gap: 0; border-bottom: 1px solid #E7E5E4; margin-bottom: 1rem; }
    .sub-tabs button { padding: 0.5rem 1.25rem; border: none; background: none; font-size: 0.9rem; font-weight: 700; color: #A8A29E; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: inherit; }
    .sub-tabs button.active { color: #1C1917; border-bottom-color: #F5B800; }
    .stat-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .stat-box { flex: 1; min-width: 100px; background: #FAFAF9; border-radius: 0.75rem; padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; border: 1px solid #E7E5E4; }
    .stat-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #A8A29E; }
    .stat-val { font-size: 1rem; font-weight: 800; color: #1C1917; }
    .stat-val.income { color: #2DB344; }
    .stat-val.expense { color: #E53935; }
    .income-history-section { margin-top: 0.5rem; }
    .income-entry-row { border: 1px solid #E7E5E4; border-radius: 0.75rem; margin-bottom: 0.5rem; overflow: hidden; background: white; }
    .income-row-content { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; flex-wrap: wrap; }
    .income-date { font-size: 0.8rem; font-weight: 700; color: #1C1917; min-width: 80px; }
    .entry-type-badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
    .badge-income { background: rgba(45,179,68,0.12); color: #166534; }
    .badge-expense { background: rgba(229,57,53,0.1); color: #E53935; }
    .income-amount { font-size: 0.9rem; font-weight: 800; }
    .income-amount.income { color: #2DB344; }
    .income-amount.expense { color: #E53935; }
    .income-channel { margin-left: auto; }
    .income-notes { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-edit-sm { background: #F5F0E8; border: 1px solid #E7E5E4; border-radius: 0.5rem; padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: inherit; color: #1C1917; flex-shrink: 0; }
    .btn-edit-sm:hover { border-color: #F5B800; }
    .income-edit-form { padding: 0.75rem; background: rgba(245,184,0,0.04); }
    .income-edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .income-edit-grid label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 700; color: #1C1917; }
    .income-edit-notes { grid-column: span 2; }
    .income-edit-actions { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
    .btn-ghost { background: #F5F0E8; color: #78716C; }
    @media (max-width: 480px) { .income-edit-grid { grid-template-columns: 1fr; } .income-edit-notes { grid-column: span 1; } .income-row-content { gap: 0.4rem; } }
    .filters { display: flex; gap: 1rem; flex-wrap: wrap; margin: 0 0 1.25rem; }
    .filters label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 700; color: #1C1917; min-width: 140px; }
    select { appearance: none; -webkit-appearance: none; border-radius: 0.75rem; border: 2px solid #E7E5E4; padding: 0.5rem 2.25rem 0.5rem 0.75rem; font-size: 0.95rem; font-family: inherit; font-weight: 600; background: #FAFAF9 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 0.65rem center / 16px; color: #1C1917; outline: none; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; min-height: 40px; }
    select:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); background-color: white; }
    .count { margin-bottom: 1rem; font-size: 0.85rem; color: #78716C; }
    .queue { display: flex; flex-direction: column; gap: 0.75rem; }
    .queue-card { border: 1px solid #E7E5E4; border-radius: 1rem; overflow: hidden; background: #FAFAF9; }
    .queue-card.expanded { border-color: #F5B800; box-shadow: 0 0 0 2px rgba(245,184,0,0.2); }
    .card-summary { display: flex; justify-content: space-between; align-items: flex-start; padding: 1rem 1.25rem; cursor: pointer; gap: 1rem; }
    .card-summary:hover { background: rgba(245,184,0,0.04); }
    .card-main h3 { margin: 0 0 0.2rem; font-size: 1rem; font-weight: 800; color: #1C1917; }
    .card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; flex-shrink: 0; }
    .chevron { font-size: 0.75rem; color: #A8A29E; }
    .small { font-size: 0.8rem; color: #78716C; }
    .status-badge { display: inline-block; padding: 0.2rem 0.7rem; border-radius: 999px; font-size: 0.75rem; font-weight: 800; }
    .status-pending { background: rgba(245,184,0,0.15); color: #92620A; }
    .status-approved { background: rgba(45,179,68,0.12); color: #166534; }
    .status-rejected { background: rgba(229,57,53,0.1); color: #E53935; }
    .card-detail { padding: 0 1.25rem 1.25rem; border-top: 1px solid #E7E5E4; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 1rem 0; }
    @media (max-width: 600px) { .detail-grid { grid-template-columns: 1fr; } .span-2 { grid-column: span 1 !important; } }
    .detail-field { display: flex; flex-direction: column; gap: 0.2rem; }
    .detail-field.span-2 { grid-column: span 2; }
    .field-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #A8A29E; }
    .detail-field p { margin: 0; color: #1C1917; line-height: 1.5; }
    .notes-label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.9rem; font-weight: 700; color: #1C1917; margin: 0.75rem 0; }
    textarea { border-radius: 0.75rem; border: 2px solid #E7E5E4; padding: 0.65rem 0.9rem; font-size: 0.95rem; font-family: inherit; width: 100%; box-sizing: border-box; resize: vertical; outline: none; }
    textarea:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem; align-items: center; }
    .btn { border: none; padding: 0.5rem 1.1rem; border-radius: 0.75rem; font-size: 0.9rem; font-weight: 700; cursor: pointer; font-family: inherit; min-height: 40px; transition: opacity 0.15s; }
    .btn:hover { opacity: 0.85; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .approve { background: #2DB344; color: white; }
    .reject { background: #E53935; color: white; }
    .empty-msg { margin-top: 1rem; color: #78716C; }
    .edit-footer { margin: 1rem 0 0; border-top: 1px dashed #E7E5E4; padding-top: 0.75rem; }
    .btn.edit { background: #F5B800; color: #1C1917; }
    .btn.neutral { background: #F5F0E8; color: #78716C; }
    .edit-section { background: rgba(245,184,0,0.04); border: 1px solid rgba(245,184,0,0.25); border-radius: 0.75rem; padding: 1rem; margin: 0.75rem 0; }
    .edit-heading { margin: 0 0 0.75rem; font-weight: 800; font-size: 0.9rem; color: #92620A; }
    .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 600px) { .edit-grid { grid-template-columns: 1fr; } .edit-grid .span-2 { grid-column: span 1; } }
    .edit-grid label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 700; color: #1C1917; }
    .edit-grid label.span-2 { grid-column: span 2; }
    .edit-grid input, .edit-grid textarea, .edit-grid select { border-radius: 0.6rem; border: 2px solid #E7E5E4; padding: 0.5rem 0.75rem; font-size: 0.9rem; font-family: inherit; width: 100%; box-sizing: border-box; background: white; outline: none; color: #1C1917; transition: border-color 0.15s, box-shadow 0.15s; }
    .edit-grid input:focus, .edit-grid textarea:focus, .edit-grid select:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); }
    .edit-grid select { appearance: none; -webkit-appearance: none; background: #FAFAF9 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 0.65rem center / 16px; padding-right: 2.25rem; cursor: pointer; }
    .edit-grid select:focus { background-color: white; }
    .edit-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
    .edit-error { color: #E53935; font-size: 0.85rem; margin: 0.5rem 0 0; font-weight: 700; }
    .hc-footer { border-top: 1px dashed #E7E5E4; padding-top: 0.75rem; margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-edit { background: #F5B800; color: #1C1917; }
    .btn-deactivate { background: #E53935; color: white; }
    .btn-activate { background: #2DB344; color: white; }
    .btn-cancel { background: #F5F0E8; color: #78716C; }
    .confirm-overlay { position: relative; margin-top: 0.5rem; }
    .confirm-box { background: rgba(240,104,32,0.05); border: 1px solid rgba(240,104,32,0.25); border-radius: 0.75rem; padding: 1rem 1.25rem; }
    .confirm-title { font-weight: 800; font-size: 1rem; margin: 0 0 0.4rem; color: #F06820; }
    .confirm-msg { font-size: 0.9rem; color: #1C1917; margin: 0 0 0.75rem; }
    .confirm-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .driver-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .driver-card { border: 1px solid #E7E5E4; border-radius: 1rem; background: #FAFAF9; padding: 1rem 1.25rem; }
    .driver-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem; }
    .driver-main h3 { margin: 0 0 0.2rem; font-size: 1rem; font-weight: 800; color: #1C1917; }
    .driver-right { flex-shrink: 0; }
    .driver-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .muted { color: #78716C; font-size: 0.9rem; }

    /* ── Interview & Verification phase sections ────────────────────────── */
    .phase-section { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #E7E5E4; }
    .phase-section.phase-done { background: #FAFAF9; border-radius: 0.75rem; padding: 0.75rem 1rem; border: 1px solid #E7E5E4; border-top: 1px solid #E7E5E4; margin-top: 0.75rem; }
    .phase-heading { font-size: 0.85rem; font-weight: 800; color: #1C1917; margin: 0 0 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
    .phase-heading-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .btn-edit-interview { background: none; border: 1.5px solid #E7E5E4; color: #78716C; border-radius: 0.75rem; padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; font-family: inherit; min-height: 32px; transition: border-color 0.15s, color 0.15s; }
    .btn-edit-interview:hover { border-color: #F5B800; color: #1C1917; }
    .full-label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 700; color: #1C1917; margin-top: 0.75rem; }
    .full-label textarea { border-radius: 0.6rem; border: 2px solid #E7E5E4; padding: 0.5rem 0.75rem; font-size: 0.9rem; font-family: inherit; width: 100%; box-sizing: border-box; resize: vertical; outline: none; }
    .full-label textarea:focus { border-color: #F5B800; }

    /* Interview criteria checkboxes */
    .criteria-list { display: flex; flex-direction: column; gap: 0.5rem; margin: 0.75rem 0; }
    .criteria-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; color: #1C1917; cursor: pointer; padding: 0.4rem 0; }
    .criteria-row input[type="checkbox"] { width: 20px; height: 20px; flex-shrink: 0; accent-color: #F5B800; cursor: pointer; }

    /* Outcome selection buttons */
    .outcome-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.75rem; }
    .outcome-btns { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .outcome-pass { background: #F5F0E8; color: #166534; border: 2px solid #E7E5E4; }
    .outcome-fail { background: #F5F0E8; color: #E53935; border: 2px solid #E7E5E4; }
    .outcome-noshow { background: #F5F0E8; color: #78716C; border: 2px solid #E7E5E4; }
    .outcome-pass.selected { background: rgba(45,179,68,0.15); border-color: #2DB344; color: #166534; }
    .outcome-fail.selected { background: rgba(229,57,53,0.1); border-color: #E53935; color: #E53935; }
    .outcome-noshow.selected { background: #E7E5E4; border-color: #A8A29E; color: #1C1917; }

    /* Outcome chips (read-only view) */
    .outcome-chip { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; }
    .outcome-pass { background: rgba(45,179,68,0.12); color: #166534; }
    .outcome-fail { background: rgba(229,57,53,0.1); color: #E53935; }
    .outcome-no_show { background: #E7E5E4; color: #78716C; }
    .outcome-verified { background: rgba(45,179,68,0.12); color: #166534; }
    .outcome-failed { background: rgba(229,57,53,0.1); color: #E53935; }

    /* Criteria result read-only */
    .criteria-result { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.4rem; }
    .crit-yes { color: #2DB344; }
    .crit-no { color: #E53935; }
    .phase-notes { font-size: 0.85rem; color: #78716C; margin: 0.3rem 0 0; }

    /* GPS row */
    .gps-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin: 0.75rem 0; }
    .btn-gps { background: #F5F0E8; color: #1C1917; border: 2px solid #E7E5E4; font-size: 0.85rem; }
    .gps-coords { font-size: 0.8rem; color: #78716C; font-weight: 700; font-family: monospace; }

    /* Photo upload */
    .photo-upload-row { margin: 0.75rem 0; }
    .photo-list { display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 0.4rem 0; }
    .photo-thumb { position: relative; width: 72px; height: 72px; border-radius: 0.5rem; overflow: hidden; border: 2px solid #E7E5E4; }
    .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .photo-remove { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 999px; width: 18px; height: 18px; font-size: 0.65rem; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
    .photo-add-btn { width: 72px; height: 72px; border-radius: 0.5rem; border: 2px dashed #E7E5E4; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.8rem; font-weight: 700; color: #A8A29E; background: #FAFAF9; }
    .photo-add-btn:hover { border-color: #F5B800; color: #1C1917; }
    .mt-sm { margin-top: 0.75rem; }
    .btn-activate-acc { background: #2DB344; color: white; }
    .btn-reinstate { background: rgba(245,184,0,0.12); color: #92400E; border: 1px solid rgba(245,184,0,0.4); font-weight: 700; }
    .rejected-reason { background: rgba(229,57,53,0.06); border: 1px solid rgba(229,57,53,0.2); border-radius: 0.5rem; padding: 0.5rem 0.75rem; margin-bottom: 0.6rem; font-size: 0.85rem; }
    .reason-text { color: #B71C1C; font-weight: 600; }
    .reject-form { background: rgba(229,57,53,0.04); border: 1px solid rgba(229,57,53,0.2); border-radius: 0.75rem; padding: 0.75rem; margin-top: 0.5rem; }
    .reject-select { appearance: none; -webkit-appearance: none; width: 100%; padding: 0.5rem 2.25rem 0.5rem 0.75rem; border: 2px solid #E7E5E4; border-radius: 0.75rem; font-family: inherit; font-size: 0.9rem; font-weight: 600; background: #FAFAF9 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 0.65rem center / 16px; color: #1C1917; outline: none; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; min-height: 40px; }
    .reject-select:focus { border-color: #F5B800; box-shadow: 0 0 0 3px rgba(245,184,0,0.2); background-color: white; }
    /* Exports tab */
    .exports-header { margin-bottom: 1.5rem; }
    .exports-header h2 { margin: 0 0 0.25rem; font-size: 1.25rem; font-weight: 800; }
    .export-section { margin-bottom: 1.75rem; }
    .export-section-title { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #A8A29E; margin: 0 0 0.75rem; }
    .export-cards { display: flex; flex-direction: column; gap: 0.6rem; }
    .export-card { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 0.85rem 1rem; flex-wrap: wrap; }
    .export-card-wide { flex-direction: column; align-items: flex-start; }
    .export-info { flex: 1; min-width: 0; }
    .export-name { font-weight: 700; font-size: 0.95rem; color: #1C1917; margin: 0 0 0.1rem; }
    .export-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
    .btn-export { background: #1C1917; color: white; font-weight: 700; font-size: 0.85rem; padding: 0.5rem 1rem; border-radius: 0.75rem; border: none; cursor: pointer; font-family: inherit; min-height: 40px; white-space: nowrap; }
    .btn-export:hover { background: #292524; }
    .btn-export:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-export-csv { background: white; color: #1C1917; border: 1.5px solid #1C1917; }
    .btn-export-csv:hover { background: #F5F5F4; }

    /* ── Shared Report Bar (matches hustler dashboard style) ── */
    .report-bar {
      background: white;
      border: 1px solid #E7E5E4;
      border-left: 4px solid #F5B800;
      border-radius: 1rem;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      box-shadow: 0 2px 10px rgba(28,25,23,0.06);
      margin: 0.75rem 0 0.5rem;
    }
    .report-bar-bulk { margin: 0; }
    .report-bar-left { display: flex; align-items: center; gap: 0.75rem; }
    .report-bar-icon { font-size: 1.5rem; line-height: 1; flex-shrink: 0; }
    .report-bar-title { font-size: 0.95rem; font-weight: 800; color: #1C1917; margin: 0; }
    .report-bar-sub { font-size: 0.78rem; color: #78716C; margin: 0.1rem 0 0; }
    .report-bar-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    .report-month-input {
      height: 40px;
      min-height: unset;
      border: 1.5px solid #E7E5E4;
      border-radius: 0.6rem;
      padding: 0 0.65rem;
      font-size: 0.88rem;
      font-family: inherit;
      color: #1C1917;
      background: #FAFAF9;
      outline: none;
      transition: border-color 0.15s;
    }
    .report-month-input:focus { border-color: #F5B800; }
    .report-dl-btn {
      height: 40px;
      min-height: unset;
      border: none;
      border-radius: 0.6rem;
      padding: 0 1rem;
      font-size: 0.88rem;
      font-weight: 800;
      background: #F5B800;
      color: #1C1917;
      cursor: pointer;
      font-family: inherit;
      box-shadow: 0 3px 10px rgba(245,184,0,0.3);
      transition: box-shadow 0.15s;
      white-space: nowrap;
    }
    .report-dl-btn:hover { box-shadow: 0 5px 16px rgba(245,184,0,0.45); }
    .report-dl-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
    @media (max-width: 480px) {
      .report-bar { flex-direction: column; align-items: flex-start; }
      .report-bar-right { width: 100%; }
      .report-month-input { flex: 1; }
      .report-dl-btn { flex: 1; }
    }
    .income-cat { font-size: 0.72rem; }

    .btn-schedule { background: rgba(0,168,150,0.1); color: #00746A; border: 1px solid rgba(0,168,150,0.3); font-weight: 700; }
    .schedule-row { margin-bottom: 0.5rem; }
    .schedule-form { background: rgba(0,168,150,0.04); border: 1px solid rgba(0,168,150,0.2); border-radius: 0.75rem; padding: 0.75rem; margin-bottom: 0.5rem; }
    .hc-name-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.15rem; }
    .missed-badge { background: rgba(249,115,22,0.12); color: #C2410C; font-size: 0.68rem; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 999px; }
    .missed-dot { color: #F97316; margin-left: 0.3rem; font-size: 0.6rem; }
    .missed-warn { background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.25); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.85rem; font-weight: 700; color: #C2410C; margin-bottom: 0.75rem; }
    .checkin-panel { padding-top: 0.5rem; }
    .checkin-form { background: #FAFAF9; border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 1rem; }
    .checkin-history { margin-top: 0.5rem; }
    .checkin-entry { border: 1px solid #E7E5E4; border-radius: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 0.5rem; background: #FAFAF9; }
    .ci-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.3rem; }
    .ci-month { font-weight: 800; font-size: 0.9rem; color: #1C1917; }
    .ci-notes { font-size: 0.85rem; color: #78716C; margin: 0 0 0.4rem; }

    /* Password modal */
    .pwd-overlay { position: fixed; inset: 0; background: rgba(28,25,23,0.6); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .pwd-modal { background: white; border-radius: 1.5rem; padding: 2rem; max-width: 400px; width: 100%; box-shadow: 0 8px 40px rgba(28,25,23,0.25); }
    .pwd-title { font-size: 1.2rem; font-weight: 800; color: #1C1917; margin: 0 0 0.25rem; }
    .pwd-name { font-size: 1rem; font-weight: 700; color: #1C1917; margin: 0; }
    .pwd-phone { font-size: 0.85rem; color: #78716C; margin: 0 0 1rem; }
    .pwd-label { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #A8A29E; margin: 0 0 0.5rem; }
    .pwd-box { display: flex; align-items: center; gap: 0.75rem; background: #FAFAF9; border: 2px solid #F5B800; border-radius: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 0.75rem; }
    .pwd-value { font-size: 1.5rem; font-weight: 800; letter-spacing: 0.15em; color: #1C1917; font-family: monospace; flex: 1; }
    .btn-copy { background: #F5B800; color: #1C1917; font-size: 0.8rem; padding: 0.35rem 0.75rem; min-height: 36px; }
    .pwd-warn { font-size: 0.8rem; color: #E53935; font-weight: 700; margin: 0 0 1rem; line-height: 1.4; }
    .pwd-close { width: 100%; justify-content: center; }
  `
})
export class FacilitatorQueueComponent implements OnInit {
  private readonly api = inject(ApiService);

  @Input() coordinatorMode = false;

  // Top-level tab
  fTab = signal<'pipeline' | 'hustlers' | 'exports'>('pipeline');

  // ── Pipeline state ──────────────────────────────────────────────────────
  showAddForm = signal(false);
  applicants = signal<ApplicantResponse[]>([]);
  pipelineLoading = signal(false);
  pipelineCommunityId = '';
  pipelineCohort = '8';
  pipelineSearch = signal('');
  pipelineStage = signal('');
  expandedApplicant = signal<string | null>(null);
  capStatus = signal<CohortCapResponse | null>(null);
  callUpdatingId = signal<string | null>(null);
  stageUpdatingId = signal<string | null>(null);
  addSaving = signal(false);
  addError = signal('');

  newApplicant: Partial<ApplicantRequest> = { cohortNumber: 8 };

  readonly stageOptions = [
    { value: '', label: 'All' },
    { value: 'CAPTURED', label: 'Captured' },
    { value: 'CALLING', label: 'Calling' },
    { value: 'INTERVIEW_SCHEDULED', label: 'Interview' },
    { value: 'INTERVIEWED', label: 'Evaluated' },
    { value: 'BUSINESS_VERIFICATION', label: 'Verification' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  readonly callStatusOptions = [
    { value: 'NOT_CALLED', label: 'Not Called' },
    { value: 'REACHED', label: 'Reached' },
    { value: 'MISSED_CALL', label: 'Missed Call' },
    { value: 'VOICEMAIL', label: 'Voicemail' },
  ];

  readonly cohortFilterOpts = [
    { value: '8', label: 'Cohort 8' }, { value: '1', label: 'Cohort 1' },
    { value: '2', label: 'Cohort 2' }, { value: '3', label: 'Cohort 3' },
    { value: '4', label: 'Cohort 4' }, { value: '5', label: 'Cohort 5' },
    { value: '6', label: 'Cohort 6' }, { value: '7', label: 'Cohort 7' },
  ];
  readonly cohortAddOpts = [
    { value: 8, label: 'Cohort 8' }, { value: 1, label: 'Cohort 1' },
    { value: 2, label: 'Cohort 2' }, { value: 3, label: 'Cohort 3' },
    { value: 4, label: 'Cohort 4' }, { value: 5, label: 'Cohort 5' },
    { value: 6, label: 'Cohort 6' }, { value: 7, label: 'Cohort 7' },
  ];
  readonly genderOpts = [
    { value: '', label: '— Select —' },
    { value: 'Female', label: 'Female' },
    { value: 'Male', label: 'Male' },
    { value: 'Other', label: 'Other' },
  ];
  readonly rejectReasonOpts = [
    { value: '', label: '— Select a reason —' },
    { value: 'Previously included in another cohort', label: 'Previously included in another cohort' },
    { value: 'Outside age range (18–35)', label: 'Outside age range (18–35)' },
    { value: 'Business not verified', label: 'Business not verified' },
    { value: 'No-show for interview', label: 'No-show for interview' },
    { value: 'Duplicate application', label: 'Duplicate application' },
    { value: 'Other', label: 'Other (specify below)' },
  ];
  readonly entryTypeOpts = [
    { value: 'INCOME', label: 'Income' },
    { value: 'EXPENSE', label: 'Expense' },
  ];
  readonly channelOpts = [
    { value: 'CASH', label: 'Cash' },
    { value: 'MARKETPLACE', label: 'Marketplace' },
  ];
  readonly categoryOpts = [
    { group: 'Sales', items: [
      { value: 'CASH_SALES', label: 'Cash Sales' },
      { value: 'CREDIT_SALES', label: 'Credit Sale' },
      { value: 'IN_APP_SALES', label: 'In-App Sales' },
    ]},
    { group: 'Expenses', items: [
      { value: 'COST_OF_GOODS', label: 'Cost of Goods (Direct Cost)' },
      { value: 'TRANSPORT', label: 'Transport' },
      { value: 'RUNNER_FEE', label: 'Runner Fee' },
      { value: 'ELECTRICITY', label: 'Electricity' },
      { value: 'WAGES', label: 'Wages' },
      { value: 'AIRTIME_DATA', label: 'Airtime/Data' },
      { value: 'OTHER_OVERHEAD_1', label: 'Other Overhead 1' },
      { value: 'OTHER_OVERHEAD_2', label: 'Other Overhead 2' },
      { value: 'SAVINGS', label: 'Savings' },
    ]},
    { group: 'Household Income', items: [
      { value: 'GRANTS_SASSA', label: 'Grants/SASSA' },
      { value: 'OTHER_SALARY_WAGES', label: 'Other Salary/Wages' },
      { value: 'OTHER_HOUSEHOLD', label: 'Other Household' },
    ]},
  ];
  addCommunityOpts   = computed(() => [{ value: '', label: '— Select community —' }, ...this.communities().map(c => ({ value: c.id, label: c.name }))]);
  filterCommunityOpts = computed(() => [{ value: '', label: 'All communities' },      ...this.communities().map(c => ({ value: c.id, label: c.name }))]);
  editCommunityOpts   = computed(() => [{ value: '', label: '— keep current —' },     ...this.communities().map(c => ({ value: c.id, label: c.name }))]);
  readonly categorySelectOpts = [{ value: '', label: '— Select —' }, ...[ 'CASH_SALES','CREDIT_SALES','IN_APP_SALES','GRANTS_SASSA','OTHER_SALARY_WAGES','OTHER_HOUSEHOLD','COST_OF_GOODS','TRANSPORT','RUNNER_FEE','ELECTRICITY','WAGES','AIRTIME_DATA','OTHER_OVERHEAD_1','OTHER_OVERHEAD_2','SAVINGS' ].map(v => ({ value: v, label: v.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase()) }))];

  private readonly stageOrder = [
    'CAPTURED', 'CALLING', 'INTERVIEW_SCHEDULED', 'INTERVIEWED', 'BUSINESS_VERIFICATION', 'APPROVED'
  ];

  filteredApplicants = computed(() => {
    const stage = this.pipelineStage();
    const q = this.pipelineSearch().trim().toLowerCase();
    let list = this.applicants();
    if (stage) list = list.filter(a => a.pipelineStage === stage);
    if (!q) return list;
    return list.filter(a =>
      [
        a.firstName, a.lastName, a.phone, a.email,
        a.typeOfHustle, a.districtSection, a.communityName,
        a.capturedBy, String(a.cohortNumber), String(a.age ?? ''),
        a.gender, this.stageLabel(a.pipelineStage), this.callLabel(a.callStatus),
        a.rejectionReason,
      ].some(v => v?.toLowerCase().includes(q))
    );
  });

  stageCount(stage: string): number {
    const list = this.applicants();
    return stage ? list.filter(a => a.pipelineStage === stage).length : list.length;
  }

  categoryLabel(cat: string): string {
    const labels: Record<string, string> = {
      CASH_SALES: 'Cash Sales', CREDIT_SALES: 'Credit Sale', IN_APP_SALES: 'In-App Sales', COST_OF_GOODS: 'Cost of Goods',
      TRANSPORT: 'Transport', RUNNER_FEE: 'Runner Fee', ELECTRICITY: 'Electricity',
      WAGES: 'Wages', AIRTIME_DATA: 'Airtime/Data', OTHER_OVERHEAD_1: 'Other Overhead 1',
      OTHER_OVERHEAD_2: 'Other Overhead 2', SAVINGS: 'Savings',
      GRANTS_SASSA: 'Grants/SASSA', OTHER_SALARY_WAGES: 'Other Salary/Wages', OTHER_HOUSEHOLD: 'Other Household',
    };
    return labels[cat] ?? cat;
  }

  stageLabel(stage: string): string {
    const labels: Record<string, string> = {
      CAPTURED: 'Captured', CALLING: 'Calling', INTERVIEW_SCHEDULED: 'Interview Scheduled',
      INTERVIEWED: 'Evaluated', BUSINESS_VERIFICATION: 'Verification',
      APPROVED: 'Approved', REJECTED: 'Rejected',
    };
    return labels[stage] ?? stage;
  }

  callLabel(callStatus: string): string {
    const labels: Record<string, string> = {
      NOT_CALLED: 'Not Called', REACHED: 'Reached',
      MISSED_CALL: 'Missed Call', VOICEMAIL: 'Voicemail',
    };
    return labels[callStatus] ?? callStatus;
  }

  nextStageValue(current: string): string | null {
    const idx = this.stageOrder.indexOf(current);
    return idx >= 0 && idx < this.stageOrder.length - 1 ? this.stageOrder[idx + 1] : null;
  }

  activateApplicant(a: ApplicantResponse): void {
    this.activatingId.set(a.id);
    this.activateErrors[a.id] = '';
    this.api.activateApplicant(a.id).subscribe({
      next: (result: ActivateApplicantResponse) => {
        // Mark the applicant as activated locally
        this.applicants.update(list => list.map(x =>
          x.id === a.id ? { ...x, activatedAt: new Date().toISOString() } : x
        ));
        this.activatingId.set(null);
        // Show the password modal
        this.generatedPasswordMeta.set({ firstName: result.firstName, lastName: result.lastName, phone: result.phone });
        this.generatedPassword.set(result.generatedPassword);
        this.copied.set(false);
      },
      error: (err) => {
        this.activateErrors[a.id] = err?.error?.message || 'Failed to create account.';
        this.activatingId.set(null);
      }
    });
  }

  resendCredentials(a: ApplicantResponse): void {
    this.resendingCredId.set(a.id);
    this.resendCredErrors[a.id] = '';
    this.api.resetApplicantPassword(a.id).subscribe({
      next: (result: ActivateApplicantResponse) => {
        this.resendingCredId.set(null);
        this.generatedPasswordMeta.set({ firstName: result.firstName, lastName: result.lastName, phone: result.phone });
        this.generatedPassword.set(result.generatedPassword);
        this.copied.set(false);
      },
      error: (err) => {
        this.resendCredErrors[a.id] = err?.error?.message || 'Failed to reset credentials.';
        this.resendingCredId.set(null);
      }
    });
  }

  copyPassword(): void {
    navigator.clipboard.writeText(this.generatedPassword()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  submitInterview(a: ApplicantResponse): void {
    const f = this.interviewForms[a.id];
    if (!f.conductedDate || !f.outcome) {
      this.interviewErrors[a.id] = 'Please fill in the conducted date and select an outcome.';
      return;
    }
    this.interviewErrors[a.id] = '';
    this.interviewSavingId.set(a.id);
    this.api.recordInterview(a.id, f as InterviewRequest).subscribe({
      next: (result) => {
        this.interviewData[a.id] = result;
        this.applicants.update(list => list.map(x =>
          x.id === a.id ? { ...x, pipelineStage: 'INTERVIEWED' } : x
        ));
        this.interviewSavingId.set(null);
        this.interviewEditingId.set(null);
      },
      error: (err) => {
        this.interviewErrors[a.id] = err?.error?.message || 'Failed to save interview.';
        this.interviewSavingId.set(null);
      }
    });
  }

  beginEditInterview(a: ApplicantResponse): void {
    const existing = this.interviewData[a.id];
    this.interviewForms[a.id] = {
      conductedDate: existing?.conductedDate ?? '',
      conductedBy: existing?.conductedBy ?? '',
      canDescribeBusiness: existing?.canDescribeBusiness ?? false,
      appearsGenuine: existing?.appearsGenuine ?? false,
      hasRunningBusiness: existing?.hasRunningBusiness ?? false,
      notes: existing?.notes ?? '',
      outcome: existing?.outcome as InterviewRequest['outcome'] ?? undefined,
    };
    this.interviewErrors[a.id] = '';
    this.interviewEditingId.set(a.id);
  }

  captureGps(applicantId: string): void {
    if (!navigator.geolocation) {
      this.gpsError[applicantId] = 'Geolocation is not supported by this browser.';
      return;
    }
    this.gpsError[applicantId] = '';
    this.gpsLoadingId.set(applicantId);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.verifyForms[applicantId].latitude = pos.coords.latitude;
        this.verifyForms[applicantId].longitude = pos.coords.longitude;
        this.gpsLoadingId.set(null);
      },
      () => {
        this.gpsError[applicantId] = 'Could not get location. Try tapping the map instead.';
        this.gpsLoadingId.set(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  onMapPin(applicantId: string, coords: { lat: number; lng: number }): void {
    if (!this.verifyForms[applicantId]) return;
    this.verifyForms[applicantId].latitude = coords.lat;
    this.verifyForms[applicantId].longitude = coords.lng;
  }

  uploadPhoto(applicantId: string, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.photoUploadingId.set(applicantId);
    // Use a placeholder token — in production this would use the facilitator session token
    this.api.uploadImage(file, '').subscribe({
      next: (res) => {
        if (!this.verifyForms[applicantId].photoUrls) this.verifyForms[applicantId].photoUrls = [];
        this.verifyForms[applicantId].photoUrls.push(res.url);
        this.photoUploadingId.set(null);
      },
      error: () => this.photoUploadingId.set(null)
    });
  }

  removePhoto(applicantId: string, index: number): void {
    this.verifyForms[applicantId].photoUrls.splice(index, 1);
  }

  submitVerification(a: ApplicantResponse): void {
    const f = this.verifyForms[a.id];
    if (!f.visitDate || !f.outcome) {
      this.verifyErrors[a.id] = 'Please fill in the visit date and select an outcome.';
      return;
    }
    this.verifyErrors[a.id] = '';
    this.verifySavingId.set(a.id);
    const payload: BusinessVerificationRequest = {
      visitDate: f.visitDate,
      latitude: f.latitude,
      longitude: f.longitude,
      photoUrls: f.photoUrls,
      notes: f.notes,
      outcome: f.outcome as 'VERIFIED' | 'FAILED',
      verifiedBy: f.verifiedBy,
    };
    this.api.recordVerification(a.id, payload).subscribe({
      next: (result) => {
        this.verificationData[a.id] = result;
        this.applicants.update(list => list.map(x =>
          x.id === a.id ? { ...x, pipelineStage: 'BUSINESS_VERIFICATION' } : x
        ));
        this.verifySavingId.set(null);
      },
      error: (err) => {
        this.verifyErrors[a.id] = err?.error?.message || 'Failed to save verification.';
        this.verifySavingId.set(null);
      }
    });
  }

  loadApplicants(): void {
    this.pipelineLoading.set(true);
    this.api.listApplicants(this.pipelineCommunityId || undefined).subscribe({
      next: (list) => { this.applicants.set(list); this.pipelineLoading.set(false); },
      error: () => this.pipelineLoading.set(false)
    });
  }

  onPipelineCommunityChange(): void {
    this.loadApplicants();
    if (this.pipelineCommunityId) {
      this.api.getCapStatus(this.pipelineCommunityId, +this.pipelineCohort)
        .subscribe(status => this.capStatus.set(status));
    } else {
      this.capStatus.set(null);
    }
  }

  toggleApplicant(id: string): void {
    if (this.expandedApplicant() === id) {
      this.expandedApplicant.set(null);
      return;
    }
    this.expandedApplicant.set(id);
    const a = this.applicants().find(x => x.id === id);
    if (!a) return;

    // Ensure form objects exist
    if (!this.interviewForms[id]) {
      this.interviewForms[id] = { canDescribeBusiness: false, appearsGenuine: false, hasRunningBusiness: false, notes: '', outcome: undefined, conductedBy: '' };
    }
    if (!this.verifyForms[id]) {
      this.verifyForms[id] = { visitDate: '', photoUrls: [], notes: '', outcome: '', verifiedBy: '' };
    }

    const pastInterview = ['INTERVIEWED', 'BUSINESS_VERIFICATION', 'APPROVED'].includes(a.pipelineStage);
    const atVerification = a.pipelineStage === 'BUSINESS_VERIFICATION' || a.pipelineStage === 'APPROVED';

    if ((pastInterview || a.pipelineStage === 'INTERVIEW_SCHEDULED') && !this.interviewData[id]) {
      this.api.getInterview(id).subscribe({ next: (r) => { this.interviewData[id] = r; }, error: () => {} });
    }
    if (atVerification && !this.verificationData[id]) {
      this.api.getVerification(id).subscribe({ next: (r) => { this.verificationData[id] = r; }, error: () => {} });
    }
  }

  setCallStatus(a: ApplicantResponse, callStatus: string): void {
    if (a.callStatus === callStatus) return;
    this.callUpdatingId.set(a.id);
    this.api.updateApplicantCallStatus(a.id, callStatus).subscribe({
      next: (updated) => {
        this.applicants.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.callUpdatingId.set(null);
      },
      error: () => this.callUpdatingId.set(null)
    });
  }

  advanceStage(a: ApplicantResponse): void {
    const next = this.nextStageValue(a.pipelineStage);
    if (!next) return;
    this.stageUpdatingId.set(a.id);
    this.api.updateApplicantStage(a.id, next).subscribe({
      next: (updated) => {
        this.applicants.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.stageUpdatingId.set(null);
        if (next === 'APPROVED' && this.pipelineCommunityId) {
          this.api.getCapStatus(this.pipelineCommunityId, +this.pipelineCohort)
            .subscribe(s => this.capStatus.set(s));
        }
      },
      error: (err) => {
        alert(err?.error?.message || 'Could not advance stage.');
        this.stageUpdatingId.set(null);
      }
    });
  }

  // ── Rejection state ─────────────────────────────────────────────────────
  rejectFormId = signal<string | null>(null);
  rejectReasons: Record<string, string> = {};
  rejectReasonOther: Record<string, string> = {};
  rejectErrors: Record<string, string> = {};

  confirmReject(a: ApplicantResponse): void {
    const selected = this.rejectReasons[a.id] ?? '';
    const reason = selected === 'Other' ? (this.rejectReasonOther[a.id] ?? '').trim() : selected;
    if (!reason) {
      this.rejectErrors[a.id] = 'Please select or enter a rejection reason.';
      return;
    }
    this.rejectErrors[a.id] = '';
    this.stageUpdatingId.set(a.id);
    this.api.updateApplicantStage(a.id, 'REJECTED', reason).subscribe({
      next: (updated) => {
        this.applicants.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.rejectFormId.set(null);
        this.stageUpdatingId.set(null);
      },
      error: () => this.stageUpdatingId.set(null)
    });
  }

  reinstateApplicant(a: ApplicantResponse): void {
    this.stageUpdatingId.set(a.id);
    this.api.updateApplicantStage(a.id, 'CAPTURED').subscribe({
      next: (updated) => {
        this.applicants.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.stageUpdatingId.set(null);
      },
      error: () => this.stageUpdatingId.set(null)
    });
  }

  addApplicant(): void {
    const n = this.newApplicant;
    if (!n.communityId || !n.firstName || !n.lastName || !n.phone || !n.typeOfHustle) {
      this.addError.set('Please fill in all required fields (marked *).');
      return;
    }
    this.addSaving.set(true);
    this.addError.set('');
    this.api.createApplicant(n as ApplicantRequest).subscribe({
      next: (created) => {
        this.applicants.update(list => [created, ...list]);
        this.showAddForm.set(false);
        this.addSaving.set(false);
        this.newApplicant = { cohortNumber: 1 };
      },
      error: (err) => {
        this.addSaving.set(false);
        this.addError.set(err?.error?.message || 'Failed to add applicant.');
      }
    });
  }

  // ── Coordinator: schedule interview ────────────────────────────────────
  scheduleFormId = signal<string | null>(null);
  scheduleDate: Record<string, string> = {};
  scheduleErrors: Record<string, string> = {};
  scheduleSavingId = signal<string | null>(null);

  saveSchedule(a: ApplicantResponse): void {
    const date = this.scheduleDate[a.id];
    if (!date) { this.scheduleErrors[a.id] = 'Please select a date.'; return; }
    this.scheduleErrors[a.id] = '';
    this.scheduleSavingId.set(a.id);
    this.api.scheduleInterview(a.id, date).subscribe({
      next: () => {
        this.applicants.update(list => list.map(x =>
          x.id === a.id ? { ...x, pipelineStage: 'INTERVIEW_SCHEDULED' } : x
        ));
        this.scheduleFormId.set(null);
        this.scheduleSavingId.set(null);
      },
      error: (err) => {
        this.scheduleErrors[a.id] = err?.error?.message || 'Failed to schedule interview.';
        this.scheduleSavingId.set(null);
      }
    });
  }

  // ── Check-in state ──────────────────────────────────────────────────────
  checkInForms: Record<string, { notes: string; photoUrls: string[]; visitedBy: string }> = {};
  checkInHistory: Record<string, MonthlyCheckInResponse[]> = {};
  checkInErrors: Record<string, string> = {};
  checkInSavingId = signal<string | null>(null);

  // ── Income history state ─────────────────────────────────────────────────
  incomeEntries: Record<string, IncomeEntryResponse[]> = {};
  incomeLoading = signal<string | null>(null);
  incomeEditingId = signal<string | null>(null);
  incomeEditData: { date: string; amount: number; channel: string; entryType: string; notes: string; category: string } = { date: '', amount: 0, channel: 'CASH', entryType: 'INCOME', notes: '', category: '' };
  reportMonth = new Date().toISOString().slice(0, 7);
  reportDownloading = signal<string | null>(null);
  bulkReportDownloading = signal(false);
  incomeSavingId = signal<string | null>(null);
  incomeErrors: Record<string, string> = {};

  currentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }

  openCheckInTab(h: FacilitatorHustler): void {
    this.hSubTab.set('checkin');
    if (!this.checkInForms[h.businessProfileId]) {
      this.checkInForms[h.businessProfileId] = { notes: '', photoUrls: [], visitedBy: '' };
    }
    if (!this.checkInHistory[h.businessProfileId]) {
      this.api.listCheckIns(h.businessProfileId).subscribe({
        next: (list) => { this.checkInHistory[h.businessProfileId] = list; },
        error: () => { this.checkInHistory[h.businessProfileId] = []; }
      });
    }
  }

  openFinanceTab(h: FacilitatorHustler): void {
    this.hSubTab.set('finance');
    if (!this.incomeEntries[h.businessProfileId]) {
      this.incomeLoading.set(h.businessProfileId);
      this.api.listHustlerIncome(h.businessProfileId).subscribe({
        next: (list) => { this.incomeEntries[h.businessProfileId] = list; this.incomeLoading.set(null); },
        error: () => { this.incomeEntries[h.businessProfileId] = []; this.incomeLoading.set(null); }
      });
    }
  }

  startIncomeEdit(entry: IncomeEntryResponse, h: FacilitatorHustler): void {
    this.incomeEditingId.set(entry.id);
    this.incomeEditData = {
      date: entry.date,
      amount: entry.amount,
      channel: entry.channel,
      entryType: entry.entryType,
      notes: entry.notes ?? '',
      category: entry.category ?? '',
    };
    this.incomeErrors[h.businessProfileId] = '';
  }

  cancelIncomeEdit(h: FacilitatorHustler): void {
    this.incomeEditingId.set(null);
    this.incomeErrors[h.businessProfileId] = '';
  }

  saveIncomeEdit(entry: IncomeEntryResponse, h: FacilitatorHustler): void {
    this.incomeSavingId.set(h.businessProfileId);
    this.incomeErrors[h.businessProfileId] = '';
    const payload: IncomeEntryRequest = {
      date: this.incomeEditData.date,
      amount: this.incomeEditData.amount,
      channel: this.incomeEditData.channel as 'CASH' | 'MARKETPLACE',
      entryType: this.incomeEditData.entryType as 'INCOME' | 'EXPENSE',
      notes: this.incomeEditData.notes || undefined,
      category: this.incomeEditData.category || undefined,
    };
    this.api.updateHustlerIncome(h.businessProfileId, entry.id, payload).subscribe({
      next: (updated) => {
        this.incomeEntries[h.businessProfileId] = this.incomeEntries[h.businessProfileId].map(e =>
          e.id === updated.id ? updated : e
        );
        this.incomeEditingId.set(null);
        this.incomeSavingId.set(null);
      },
      error: (err) => {
        this.incomeErrors[h.businessProfileId] = err?.error?.message || 'Failed to save changes.';
        this.incomeSavingId.set(null);
      }
    });
  }

  downloadMonthlyReport(h: FacilitatorHustler): void {
    this.reportDownloading.set(h.businessProfileId);
    this.api.listHustlerIncomeForMonth(h.businessProfileId, this.reportMonth).subscribe({
      next: (entries) => {
        const hustler: ReportHustler = {
          firstName: h.firstName, lastName: h.lastName,
          businessName: h.businessName, businessType: h.businessType,
          communityName: h.communityName,
        };
        generateMonthlyReportPdf(hustler, entries, this.reportMonth);
        this.reportDownloading.set(null);
      },
      error: () => this.reportDownloading.set(null),
    });
  }

  downloadBulkMonthlyReports(): void {
    const list = this.hustlers().filter(h => h.active);
    if (!list.length) return;
    this.bulkReportDownloading.set(true);
    let remaining = list.length;
    const collected: { hustler: ReportHustler; entries: IncomeEntryResponse[] }[] = [];
    for (const h of list) {
      this.api.listHustlerIncomeForMonth(h.businessProfileId, this.reportMonth).subscribe({
        next: (entries) => {
          collected.push({
            hustler: { firstName: h.firstName, lastName: h.lastName, businessName: h.businessName, businessType: h.businessType, communityName: h.communityName },
            entries,
          });
          if (--remaining === 0) { generateBulkMonthlyReportPdf(collected, this.reportMonth); this.bulkReportDownloading.set(false); }
        },
        error: () => { if (--remaining === 0) { generateBulkMonthlyReportPdf(collected, this.reportMonth); this.bulkReportDownloading.set(false); } },
      });
    }
  }

  submitCheckIn(h: FacilitatorHustler): void {
    this.checkInErrors[h.businessProfileId] = '';
    this.checkInSavingId.set(h.businessProfileId);
    const f = this.checkInForms[h.businessProfileId];
    const payload: MonthlyCheckInRequest = { notes: f.notes, photoUrls: f.photoUrls, visitedBy: f.visitedBy };
    this.api.recordCheckIn(h.businessProfileId, payload).subscribe({
      next: (saved) => {
        // Update history and clear missed warning
        const existing = this.checkInHistory[h.businessProfileId] ?? [];
        const idx = existing.findIndex(c => c.visitMonth === saved.visitMonth);
        if (idx >= 0) existing[idx] = saved; else existing.unshift(saved);
        this.checkInHistory[h.businessProfileId] = [...existing];
        // Clear missed flag on the local hustler list
        this.hustlers.update(list => list.map(x =>
          x.businessProfileId === h.businessProfileId ? { ...x, missedCheckIn: false } : x
        ));
        this.checkInForms[h.businessProfileId] = { notes: '', photoUrls: [], visitedBy: '' };
        this.checkInSavingId.set(null);
      },
      error: (err) => {
        this.checkInErrors[h.businessProfileId] = err?.error?.message || 'Failed to save visit.';
        this.checkInSavingId.set(null);
      }
    });
  }

  uploadCheckInPhoto(businessProfileId: string, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadImage(file, '').subscribe({
      next: (res) => {
        if (!this.checkInForms[businessProfileId]) return;
        this.checkInForms[businessProfileId].photoUrls.push(res.url);
      },
      error: () => {}
    });
  }

  removeCheckInPhoto(businessProfileId: string, index: number): void {
    this.checkInForms[businessProfileId].photoUrls.splice(index, 1);
  }

  // ── Activation state ────────────────────────────────────────────────────
  activatingId = signal<string | null>(null);
  activateErrors: Record<string, string> = {};
  generatedPassword = signal('');
  generatedPasswordMeta = signal<{ firstName: string; lastName: string; phone: string }>({ firstName: '', lastName: '', phone: '' });
  copied = signal(false);

  // ── Resend credentials state ─────────────────────────────────────────────
  resendingCredId = signal<string | null>(null);
  resendCredErrors: Record<string, string> = {};

  // ── Interview state ─────────────────────────────────────────────────────
  interviewData: Record<string, InterviewResponse> = {};
  interviewForms: Record<string, Partial<InterviewRequest>> = {};
  interviewErrors: Record<string, string> = {};
  interviewSavingId = signal<string | null>(null);
  interviewEditingId = signal<string | null>(null);

  // ── Verification state ──────────────────────────────────────────────────
  verificationData: Record<string, BusinessVerificationResponse> = {};
  verifyForms: Record<string, { visitDate: string; latitude?: number; longitude?: number; photoUrls: string[]; notes: string; outcome: string; verifiedBy: string }> = {};
  verifyErrors: Record<string, string> = {};
  verifySavingId = signal<string | null>(null);
  gpsLoadingId = signal<string | null>(null);
  gpsError: Record<string, string> = {};
  photoUploadingId = signal<string | null>(null);

  // ── Hustlers state ──────────────────────────────────────────────────────
  hustlers = signal<FacilitatorHustler[]>([]);
  hustlersLoading = signal(false);
  expandedHustler = signal<string | null>(null);
  hSubTab = signal<'finance' | 'business' | 'checkin'>('finance');
  confirmingDeactivate = signal<string | null>(null);
  activeToggling = signal<string | null>(null);
  hEditingId = signal<string | null>(null);
  hEditData: HustlerProfileUpdate = {};
  hEditSaving = signal(false);
  hEditError = signal('');

  // ── Applications state ──────────────────────────────────────────────────
  applications = signal<HustlerApplication[]>([]);
  communities = signal<Community[]>([]);
  selectedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
  selectedCommunity = '';
  expanded = signal<string | null>(null);
  notes: Record<string, string> = {};
  editingId = signal<string | null>(null);
  editData: HustlerProfileUpdate = {};
  editSaving = signal(false);
  editError = signal('');

  ngOnInit(): void {
    this.api.listCommunities().subscribe(c => this.communities.set(c));
    this.loadHustlers();
    this.loadApplicants();
  }

  loadHustlers(): void {
    this.hustlersLoading.set(true);
    this.api.listFacilitatorHustlers().subscribe({
      next: (list) => { this.hustlers.set(list); this.hustlersLoading.set(false); },
      error: () => this.hustlersLoading.set(false)
    });
  }

  toggleHustler(id: string): void {
    if (this.expandedHustler() === id) {
      this.expandedHustler.set(null);
      this.confirmingDeactivate.set(null);
      this.hEditingId.set(null);
    } else {
      this.expandedHustler.set(id);
      this.hSubTab.set('finance');
      this.confirmingDeactivate.set(null);
      this.hEditingId.set(null);
      if (!this.incomeEntries[id]) {
        this.incomeLoading.set(id);
        this.api.listHustlerIncome(id).subscribe({
          next: (list) => { this.incomeEntries[id] = list; this.incomeLoading.set(null); },
          error: () => { this.incomeEntries[id] = []; this.incomeLoading.set(null); }
        });
      }
    }
  }

  startHEdit(h: FacilitatorHustler): void {
    this.hEditingId.set(h.businessProfileId);
    this.hEditData = {
      description: h.description ?? '',
      targetCustomers: h.targetCustomers ?? '',
      vision: h.vision ?? '',
      mission: h.mission ?? '',
      operatingArea: h.operatingArea ?? '',
      communityId: h.communityId ?? '',
    };
    this.hEditError.set('');
  }

  saveHEdit(h: FacilitatorHustler): void {
    if (!h.applicationId) return;
    this.hEditSaving.set(true);
    this.hEditError.set('');
    const payload: HustlerProfileUpdate = {
      description: this.hEditData.description || undefined,
      targetCustomers: this.hEditData.targetCustomers || undefined,
      vision: this.hEditData.vision || undefined,
      mission: this.hEditData.mission || undefined,
      operatingArea: this.hEditData.operatingArea || undefined,
      communityId: this.hEditData.communityId || undefined,
    };
    this.api.updateHustlerProfile(h.applicationId, payload).subscribe({
      next: () => {
        this.hEditingId.set(null);
        this.hEditSaving.set(false);
        this.loadHustlers();
      },
      error: (err) => {
        this.hEditSaving.set(false);
        this.hEditError.set(err?.error?.message || 'Failed to save changes.');
      }
    });
  }

  toggleActive(h: FacilitatorHustler): void {
    if (h.active) {
      this.confirmingDeactivate.set(h.businessProfileId);
    } else {
      this.doSetActive(h, true);
    }
  }

  confirmDeactivate(h: FacilitatorHustler): void {
    this.confirmingDeactivate.set(null);
    this.doSetActive(h, false);
  }

  private doSetActive(h: FacilitatorHustler, active: boolean): void {
    this.activeToggling.set(h.businessProfileId);
    this.api.setHustlerActive(h.businessProfileId, active).subscribe({
      next: (updated) => {
        this.hustlers.update(list => list.map(x =>
          x.businessProfileId === updated.businessProfileId ? updated : x
        ));
        this.activeToggling.set(null);
      },
      error: () => this.activeToggling.set(null)
    });
  }

  load(): void {
    this.api.listApplications(this.selectedStatus, this.selectedCommunity || undefined)
      .subscribe(apps => this.applications.set(apps));
  }

  toggle(id: string): void {
    this.expanded.set(this.expanded() === id ? null : id);
  }

  decide(app: HustlerApplication, status: 'APPROVED' | 'REJECTED'): void {
    this.api.decideApplication(app.id, { status, facilitatorNotes: this.notes[app.id] })
      .subscribe(() => this.load());
  }

  startEdit(app: HustlerApplication): void {
    this.editingId.set(app.id);
    this.editData = {
      description: app.description ?? '',
      targetCustomers: app.targetCustomers ?? '',
      vision: app.vision ?? '',
      mission: app.mission ?? '',
      operatingArea: app.operatingArea ?? '',
      communityId: app.community?.id ?? '',
    };
    this.editError.set('');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editError.set('');
  }

  saveEdit(app: HustlerApplication): void {
    this.editSaving.set(true);
    this.editError.set('');
    const payload: HustlerProfileUpdate = {
      description: this.editData.description || undefined,
      targetCustomers: this.editData.targetCustomers || undefined,
      vision: this.editData.vision || undefined,
      mission: this.editData.mission || undefined,
      operatingArea: this.editData.operatingArea || undefined,
      communityId: this.editData.communityId || undefined,
    };
    this.api.updateHustlerProfile(app.id, payload).subscribe({
      next: (updated) => {
        this.applications.update(list => list.map(a => a.id === updated.id ? updated : a));
        this.editingId.set(null);
        this.editSaving.set(false);
      },
      error: (err) => {
        this.editSaving.set(false);
        this.editError.set(err?.error?.message || 'Failed to save changes.');
      }
    });
  }

  // ── Excel Exports ────────────────────────────────────────────────────────
  private downloadCsv(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]): void {
    if (!rows.length) { alert('No data to export for this selection.'); return; }
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const val = (r[h] ?? '').toString().replace(/"/g, '""');
        return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val;
      }).join(','))
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  private downloadExcel(filename: string, sheetName: string, rows: Record<string, string | number | boolean | null | undefined>[]): void {
    if (!rows.length) { alert('No data to export for this selection.'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-size columns
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => (r[key] ?? '').toString().length)) + 2
    }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  }

  exportInterviewShortlist(format: 'csv' | 'xlsx' = 'xlsx'): void {
    const rows = this.applicants()
      .filter(a => a.pipelineStage === 'INTERVIEW_SCHEDULED')
      .map(a => ({
        'First Name': a.firstName, 'Last Name': a.lastName,
        'Phone': a.phone, 'Email': a.email ?? '',
        'Type of Hustle': a.typeOfHustle, 'District/Section': a.districtSection ?? '',
        'Community': a.communityName, 'Cohort': a.cohortNumber,
        'Age': a.age ?? '', 'Gender': a.gender ?? '',
        'Call Status': this.callLabel(a.callStatus), 'Age Flag': a.ageFlag ? 'Yes' : 'No',
      }));
    const base = `interview-shortlist-cohort${this.pipelineCohort}-${this.currentMonth()}`;
    format === 'csv'
      ? this.downloadCsv(`${base}.csv`, rows)
      : this.downloadExcel(`${base}.xlsx`, 'Interview Shortlist', rows);
  }

  exportApprovedApplicants(format: 'csv' | 'xlsx' = 'xlsx'): void {
    const rows = this.applicants()
      .filter(a => a.pipelineStage === 'APPROVED')
      .map(a => ({
        'First Name': a.firstName, 'Last Name': a.lastName,
        'Phone': a.phone, 'Email': a.email ?? '',
        'Type of Hustle': a.typeOfHustle, 'District/Section': a.districtSection ?? '',
        'Community': a.communityName, 'Cohort': a.cohortNumber,
        'Age': a.age ?? '', 'Gender': a.gender ?? '',
        'Account Created': a.activatedAt ? 'Yes' : 'No',
      }));
    const base = `approved-applicants-cohort${this.pipelineCohort}-${this.currentMonth()}`;
    format === 'csv'
      ? this.downloadCsv(`${base}.csv`, rows)
      : this.downloadExcel(`${base}.xlsx`, 'Approved Applicants', rows);
  }

  exportFullPipeline(format: 'csv' | 'xlsx' = 'xlsx'): void {
    const rows = this.applicants().map(a => ({
      'First Name': a.firstName, 'Last Name': a.lastName,
      'Phone': a.phone, 'Email': a.email ?? '',
      'Type of Hustle': a.typeOfHustle, 'District/Section': a.districtSection ?? '',
      'Community': a.communityName, 'Cohort': a.cohortNumber,
      'Age': a.age ?? '', 'Gender': a.gender ?? '',
      'Stage': this.stageLabel(a.pipelineStage), 'Call Status': this.callLabel(a.callStatus),
      'Age Flag': a.ageFlag ? 'Yes' : 'No', 'Rejection Reason': a.rejectionReason ?? '',
      'Account Created': a.activatedAt ? 'Yes' : 'No',
    }));
    const base = `full-pipeline-${this.currentMonth()}`;
    format === 'csv'
      ? this.downloadCsv(`${base}.csv`, rows)
      : this.downloadExcel(`${base}.xlsx`, 'Full Pipeline', rows);
  }

  exportMonthlyVisitReport(format: 'csv' | 'xlsx' = 'xlsx'): void {
    const rows = this.hustlers().map(h => ({
      'First Name': h.firstName, 'Last Name': h.lastName,
      'Business Name': h.businessName, 'Business Type': h.businessType,
      'Community': h.communityName ?? '', 'Operating Area': h.operatingArea ?? '',
      'Visited This Month': h.missedCheckIn ? 'No' : 'Yes',
      'Month Income (R)': h.monthIncome, 'Month Expenses (R)': h.monthExpenses,
      'Month Profit (R)': h.monthProfit, 'Active': h.active ? 'Yes' : 'No',
    }));
    const base = `monthly-visit-report-${this.currentMonth()}`;
    format === 'csv'
      ? this.downloadCsv(`${base}.csv`, rows)
      : this.downloadExcel(`${base}.xlsx`, 'Visit Report', rows);
  }

  exportActiveHustlers(format: 'csv' | 'xlsx' = 'xlsx'): void {
    const rows = this.hustlers().filter(h => h.active).map(h => ({
      'First Name': h.firstName, 'Last Name': h.lastName,
      'Business Name': h.businessName, 'Business Type': h.businessType,
      'Community': h.communityName ?? '', 'Operating Area': h.operatingArea ?? '',
      'Month Income (R)': h.monthIncome, 'Month Expenses (R)': h.monthExpenses,
      'Month Profit (R)': h.monthProfit,
    }));
    const base = `active-hustlers-${this.currentMonth()}`;
    format === 'csv'
      ? this.downloadCsv(`${base}.csv`, rows)
      : this.downloadExcel(`${base}.xlsx`, 'Active Hustlers', rows);
  }

  exportEvaluatedApplicants(format: 'csv' | 'xlsx' = 'xlsx'): void {
    const rows = this.applicants()
      .filter(a => a.pipelineStage === 'INTERVIEWED')
      .map(a => ({
        'First Name': a.firstName, 'Last Name': a.lastName,
        'Phone': a.phone, 'Email': a.email ?? '',
        'Type of Hustle': a.typeOfHustle, 'District/Section': a.districtSection ?? '',
        'Community': a.communityName, 'Cohort': a.cohortNumber,
        'Age': a.age ?? '', 'Gender': a.gender ?? '',
        'Call Status': this.callLabel(a.callStatus), 'Age Flag': a.ageFlag ? 'Yes' : 'No',
      }));
    const base = `evaluated-applicants-cohort${this.pipelineCohort}-${this.currentMonth()}`;
    format === 'csv'
      ? this.downloadCsv(`${base}.csv`, rows)
      : this.downloadExcel(`${base}.xlsx`, 'Evaluated Applicants', rows);
  }

  exportVerificationApplicants(format: 'csv' | 'xlsx' = 'xlsx'): void {
    const rows = this.applicants()
      .filter(a => a.pipelineStage === 'BUSINESS_VERIFICATION')
      .map(a => ({
        'First Name': a.firstName, 'Last Name': a.lastName,
        'Phone': a.phone, 'Email': a.email ?? '',
        'Type of Hustle': a.typeOfHustle, 'District/Section': a.districtSection ?? '',
        'Community': a.communityName, 'Cohort': a.cohortNumber,
        'Age': a.age ?? '', 'Gender': a.gender ?? '',
        'Call Status': this.callLabel(a.callStatus), 'Age Flag': a.ageFlag ? 'Yes' : 'No',
      }));
    const base = `verification-applicants-cohort${this.pipelineCohort}-${this.currentMonth()}`;
    format === 'csv'
      ? this.downloadCsv(`${base}.csv`, rows)
      : this.downloadExcel(`${base}.xlsx`, 'Verification', rows);
  }
}
