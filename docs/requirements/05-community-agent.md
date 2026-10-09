# Community Agent tools inside Sell

Current evidence: facilitator queue contains call, scheduled interview, visit, activation and check-in screens. `BusinessVerification` stores coordinates/photos/outcome but references Applicant and a free-text `verifiedBy`. The target combines conversation and visit into one verification linked to the actual agent account.

### AGENT-001 Receive nearby applications (partly blocked: radius, ties, offer expiry)
As a Community Agent, I want applications nearest my home area, so that I can verify people locally.

Acceptance criteria
- Given agent A lives 2 km from an application and agent B lives 40 km from it, when the application is offered, then it is offered to A before B (D12).
- Given an application outside my authorized offered work, when I forge its identifier, then the server refuses its private detail and mutation.
- Given an applicant list, when it is shown, then phones reveal only the last four digits; precise locations/contact details appear only in an authorized detail view when needed.

Mobile and offline: compact queue, clearly distinguish no work from fetch failure; do not accept/assign new work while offline.
Data: `AppUser.homeLatitude/homeLongitude`, Community; NEW: application location, and the server's rules for offering and assigning work.
Out of scope: client-side-only distance filtering, deciding radius/ties/assignment expiry here.

### AGENT-002 Verify in one step
As a Community Agent, I want one verification form, so that I can record the conversation and evidence together.

Acceptance criteria
- Given authorized merchant/driver work, when I record interview notes, location, photos and outcome, then one verification record is linked to my authenticated account, not a typed verifier name (D5, D9).
- Given a starting merchant without an existing business, when I verify the intended activity and identity, then a “running business” criterion is not automatically required (D14).
- Given an under-18 applicant, when I try approval, then the server blocks it (D11).
- Given my approval, when saved, then the applicant moves to awaiting final approval, without a live shop or eligible driver job access yet (D17; driver flow follows the senior's stated assumption).
- Given this unpaid phase, when verification completes, then no agent fee, wallet credit or earnings promise is created (D13).

Mobile and offline: labelled notes, map picker with permission-denied fallback, images limited to 5MB; drafts must remain visibly unsent until acknowledged. No GPS or applicant details in logs.
Data: existing `BusinessVerification` notes/location/photos/outcome; NEW: merchant/driver application link, interview notes, verifier account and approval history.
Out of scope: scheduled interviews, programme check-ins, granting final approval, agent pay.

### AGENT-003 Ban an existing merchant in my area
As a Community Agent, I want to stop an unsafe merchant from selling, so that the local marketplace can be protected.

My area is the set of communities assigned to me, the same way Hub Coordinators get theirs (D19). It defaults to the community nearest my home (senior interpretation in R5).

Acceptance criteria
- Given a merchant whose shop is in one of my assigned communities, when I ban them with a reason, then their shop is hidden, they cannot sell, and who banned them, when and why are stored (D18).
- Given a merchant whose shop is in a community not assigned to me, when I send the same ban request directly to the server, then it is refused and the merchant is unchanged.
- Given a ban, when I try to lift it as an agent, then the server refuses; only Hub Coordinator or Platform Admin may lift it, under the senior's D18 assumptions.

Mobile and offline: confirmation names the shop and consequence; failures retain the reason; no offline ban success.
Data: existing `AppUser.assignedCommunities` (table `app_user_communities`), shop community; NEW: ban history and current ban status.
Out of scope: deleting the merchant's account, policy for existing paid orders or appeals.

## Open questions

- How far away can an application be offered? What happens on a tie, how many applications can one agent hold, and how long before an unclaimed offer moves to the next agent? Out-of-area access stays forbidden either way.
- Who assigns an agent's communities, and can an agent have more than one? (The default, nearest community to home, was set by the senior in R5.)
- Define acceptable evidence when GPS is unavailable and which verification notes the applicant may see.
- Confirm agent self-verification/conflicts-of-interest handling and who may revise a submitted verification.
