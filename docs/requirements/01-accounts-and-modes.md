# Accounts and modes

Current evidence: `/login` already has phone/password sign-in and name, phone, optional email and password sign-up. Unified auth bridges legacy stores; the shell changes links by role. There is no recovery screen. `AppUser` now has date of birth, home location and assigned communities, but the role/session transition is still Phase 1 work.

### ACC-001 Use one phone account
As a person, I want one account for shopping and my other roles, so that I do not manage several logins.

Acceptance criteria
- Given an unused valid phone and required registration fields, when I register without email, then one account is created and opens Shopping (D3, D4).
- Given an existing phone, when a second registration uses the same normalized number, then the server refuses a duplicate; normalization rules are owned by Phase 1.
- Given valid credentials, when I sign in, then the same account can access its granted roles; bad credentials produce a readable error without exposing passwords or account internals.
- Given an optional email already belongs to another account, when I save it, then it is rejected without changing either account.

Mobile and offline: labelled phone input with telephone keyboard, accessible show-password control; keep non-secret form fields on request failure; never report a successful offline login.
Data: `AppUser.phone`, `email`, names, `passwordHash`, roles; `AppUserSession`. NEW: completed single-session migration (P1.2–3).
Out of scope: separate buyer/driver credentials, social login, JWT replacement.

### ACC-002 Recover access (Later: recovery mechanism needs a decision)
As an account holder, I want to recover access, so that losing a password does not cost me my account.

Acceptance criteria
- Given an account with a verified recovery channel, when the agreed recovery process proves control, then access is restored to the existing account rather than creating a second identity.
- Given no optional email, when recovery is requested, then email is not falsely presented as available; the approved alternative must be explained before this story ships.
- Given an unauthenticated recovery request, when a response is shown, then it does not reveal whether another person's phone/email is registered.

Mobile and offline: single-column steps, preserve progress on transient failure; require server confirmation for every security change.
Data: `AppUser.email`; NEW: verified-channel state, expiring recovery proof and audit records, designed by the senior.
Out of scope: choosing SMS/email providers, WhatsApp integration, inventing support identity checks.

### ACC-003 Switch sections through the shared menu
As a person with several roles, I want the menu to show my available work, so that I can switch without another account.

Acceptance criteria
- Given any account, when I open the menu, then Account, language, theme and Sign out are available and Shopping remains accessible.
- Given no merchant approval, when I open the menu, then “Sell on thenga.com” opens my application/status; given final merchant approval, “Switch to Selling” opens Sell (D4–6, D17).
- Given no driver approval, when I choose “Drive for thenga.com”, then I see application/status; given an approved DRIVER role, “Switch to Driving” opens Drive.
- Given a Community Agent, when Sell opens, then extra agent tools appear; given a Hub Coordinator or Platform Admin, Back office is available. A direct URL cannot grant missing permissions.
- Given I sign out, when I revisit a protected screen, then private data and cached role-specific details are no longer displayed.

Mobile and offline: each section has its own bottom nav with no more than five items; menu focus returns to its opener; a cached role is not proof of server authorization.
Data: existing account roles, theme/translation services; NEW: section routes and navigation state, server eligibility.
Out of scope: final visual design, granting roles through a client toggle.

### ACC-004 Read my notifications
As a person, I want notifications for my applications and work, so that I can act on changes.

Acceptance criteria
- Given a notification belongs to me, when I open it, then it becomes read and leads to an authorized destination; another account cannot read or mark it.
- Given zero notifications, a failed fetch or loading, when the list renders, then each state is distinct.
- Given an application changes stage, when its notification is shown, then it distinguishes agent approval from final approval and never claims the shop is live early.

Mobile and offline: notification rows are keyboard-operable controls; cached content is marked stale and a failed read update is not silently confirmed.
Data: `Notification.title`, `body`, `read`, `linkPath`, `createdAt`; NEW: account recipient link replacing shop-only delivery where necessary.
Out of scope: WhatsApp/push delivery (Later), unsolicited marketing.

## Open questions

- Recovery channel verification, expiry, phone-loss and no-email support procedure need senior/product decisions (ACC-002).
- Confirm cart handling across sign-out and account changes; private data must never bleed into another account.
