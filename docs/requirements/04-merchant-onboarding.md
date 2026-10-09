# Merchant onboarding

Current evidence: `/apply` uses `RegistrationFormComponent`, prefills authenticated names/phone, collects business/community details and agreement signature, then submits a legacy HustlerApplication. Its programme fields and separate interview pipeline are not the target process. Final states below are user-facing meanings; the senior chooses the replacement enum/schema.

### ONB-001 Apply to sell
As a person aged 18 or older, I want to apply from the menu, so that I can start selling even without an existing business.

Acceptance criteria
- Given my phone account, when I choose “Sell on thenga.com”, then the application uses that identity without requesting another password (D3, D5).
- Given I am one day short of 18, when I submit, then the server refuses eligibility; on my 18th birthday the age rule permits application (D11).
- Given I am starting a new business, when describing my intended goods/services and location, then absence of previous trading history does not itself block me (D14).
- Given invalid/missing required fields or an unaccepted agreement, when I submit, then specific errors appear and no successful application is claimed.

Mobile and offline: single-column labelled fields, native birth-date picker, clear upload feedback; retain a local draft only with an explicit unsent label and appropriate privacy handling.
Data: `AppUser.dateOfBirth`, names/phone; legacy application business fields; NEW: account-linked merchant application and agreement version/acceptance timestamp.
Out of scope: another login, programme cohort limits, mandatory existing-business proof, editing legal agreement terms in this requirements task.

### ONB-002 Follow verification and final approval
As an applicant, I want a clear status, so that I know who must act next.

Acceptance criteria
- Given a submitted application, when I view status, then it says awaiting Community Agent verification; it does not offer separate calling/interview stages (D5).
- Given an agent records approval, when I view status, then it says awaiting Hub Coordinator final approval and the shop remains unpublished (D17).
- Given the assigned Hub Coordinator gives final approval, when the server confirms it, then Merchant eligibility and the live shop become available to the same account.
- Given my application belongs to me, when I view it, then I can read my status; a different applicant cannot read its private verification data.

Mobile and offline: short text states with next-step guidance; cached status explicitly says it may have changed; notifications link to this page.
Data: NEW: submitted/agent-approved/final-approved transitions, linked verifier and final approver accounts, timestamps and publish eligibility; existing Notification can carry outcomes after adaptation.
Out of scope: free-text verifier identity, skipping coordinator approval, programme interviews or calls as separate stages.

### ONB-003 Understand rejection (partly blocked: reapplying)
As an applicant, I want a reason when rejected, so that I know whether and how I can correct the issue.

Acceptance criteria
- Given rejection at either approval step, when I open my status, then a suitable applicant-facing reason and the responsible stage appear and no shop goes live.
- Given a failed submission or retry, when I reopen status, then the last server-confirmed application is shown rather than an invented duplicate.
- Given reapplying is allowed (not yet decided), when I reapply, then my earlier decisions stay on record and an earlier approval is never reused for the new application.

Mobile and offline: readable rejection text, preserved unsent corrections, no false “submitted” toast offline.
Data: NEW: applicant-facing rejection reason and decision history; current application has status/notes but not the full two-stage model.
Out of scope: inventing appeal deadlines or automatic reapplication rights.

## Open questions

- Required application fields, identity evidence for people without SA ID, and the exact agreement need review; age minimum and ability to start a new business are fixed.
- Define rejection/resubmission/withdrawal policy and distinction between private staff notes and applicant-facing reasons.
- O3 governs legacy programme data: no deletion or carry-over assumptions here.
