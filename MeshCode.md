# MeshCode — Hustle Economy Feature Plan

## Core programme assumptions
1. **Communities in scope**: Hustle Economy only operates in these five hubs and the app must treat them as the canonical set: KwaNgwenya, KwaNibela, KwaMakhasa, KwaJobe, KwaMnqobokazi. Any UI pickers, filters, and analytics must pull from this list (no ad-hoc community creation).

## Implementation steps
1. **Community enforcement & onboarding**
   - Seed the five communities in the database (id + name + region metadata).
   - Update registration / facilitator forms so applicants can only select from these communities.
   - Ensure facilitator accounts are linked to one (or more) of these communities for scoping dashboards later.

2. **Daily income capture (cash + marketplace)**
   - In the hustler dashboard, add a daily income ledger component where hustlers can log cash sales and marketplace sales separately.
   - Support two modes: cash-only businesses and businesses using both the in-person and marketplace channels. Store each entry with date, amount, channel, and optional notes.
   - Provide summary chips showing today’s intake, week-to-date, and month-to-date totals.

3. **Weekly & monthly reports**
   - Generate facilitator-ready PDFs/CSV for each hustler summarizing income entries:
     - Weekly report: daily breakdown, total cash vs. marketplace, commentary slot.
     - Monthly report: weekly totals, month-over-month comparison, top-selling products/services.
   - Surface these reports inside the hustler dashboard for download, and expose an admin endpoint to regenerate them on demand.

4. **Hustler dashboard upgrades**
   - After login, hustlers see: application status, checklist, daily income textbox, graphs, and shortcuts to submit new products/services.
   - Include a “Daily Income” quick entry widget (keyboard-friendly) plus history table with filters (week/month).

5. **Facilitator dashboard (community-scoped)**
   - Facilitators should see an overview of hustlers from their assigned communities only.
   - Provide filters by community + status, and highlight hustlers needing attention (no data logged in 7 days, declining income, etc.).
   - Allow facilitators to drill into a single hustler, see their profile, latest reports, and action buttons (call, leave note, request update).

6. **Business health insights**
   - For each hustler detail view, display: current status, profit summary, average weekly revenue, month-over-month change, outstanding tasks.
   - Render growth graphs with a toggle between weekly and monthly views (line or area chart). Default to weekly; allow switching to monthly without losing context.

## Cleanup
After this plan is executed delete the contents.
