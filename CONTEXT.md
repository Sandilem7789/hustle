# CONTEXT.md
# Ingwenya Digital (Pty) Ltd — thenga.com
# Last updated: 22 September 2026

---

## 1. The Company

| | |
|---|---|
| **Legal name** | Ingwenya Digital (Pty) Ltd *(to be registered at CIPC)* |
| **Trade name** | thenga.com |
| **Founder** | Sandile Mathenjwa |
| **Location** | KwaNgwenya, uMkhanyakude District, KwaZulu-Natal, South Africa |

**Ingwenya** means crocodile in Zulu. It connects directly to KwaNgwenya — the community this platform was built for — and signals strength, patience, and deep local identity. Ingwenya Digital (Pty) Ltd trades as thenga.com.

---

## 2. What thenga.com Is

thenga.com is a **rural-first e-commerce and in-app learning platform** for micro-entrepreneurs in communities like KwaNgwenya.

The concept: Professor Xavier built a school where mutants come with different powers and play different roles. thenga.com is a home for hustlers — each one comes with different capabilities and contributes to the platform in a different way.

The platform has two core layers that work together:

### 2a. E-Commerce Layer
Merchants list products and services. Buyers browse, order, and pay. Community Agents verify sellers, assist with onboarding, handle cash transactions, and manage last-mile delivery in areas where digital infrastructure is limited.

### 2b. In-App Learning Layer
Merchants do not just sell on thenga.com — they grow on it. The platform includes an embedded learning module where merchants can:
- Read short business education topics inside the app
- Answer survey and quiz questions to test their understanding
- Track their learning progress alongside their trading activity

The initial content library is drawn from the 24-topic Hustle Economy Programme curriculum:
Financial Diary & SROI, Community Mapping, Business Planning, Inventory Control, Debt Control, Merchandising, Competitors in Business, Business Model, Marketing, Customer Service, Costing & Pricing, Branding, Risk Management, PESTLE Analysis, Budgeting & Savings, Quotations & Invoices, SWOT Analysis, How to Pitch, and Growth Planning.

Learning is not gatekept — it is built into the merchant's daily experience. The financial diary becomes transaction tracking. SROI becomes a community spend metric. The growth plan becomes a dashboard goal. Merchants learn by doing.

---

## 3. Platform Roles

> **Note:** Role names below are working titles. Final naming is to be confirmed and updated here before implementation. All references to "Facilitator" and "Coordinator" from the Hustle Economy Programme context must be replaced with the agreed platform role names throughout the codebase.

| Working Title | Description |
|---|---|
| **Merchant** *(was: Seller)* | Lists products or services, receives orders, gets paid, accesses in-app learning. Primary user of the platform. |
| **Community Agent** *(was: Facilitator-Seller)* | Everything a Merchant does, plus: verifies other merchants, confirms transactions, assists with onboarding, handles cash payments and last-mile delivery. This is where youth employment is created — young people in communities like KwaNgwenya earn per verification, per onboarded merchant, per assisted transaction. |
| **Hub Coordinator** *(was: Coordinator)* | Manages a cluster of Community Agents in a defined area. Oversees onboarding quality, dispute resolution, and area-level reporting. |
| **Buyer** | Browses, orders, pays. May route through a Community Agent for cash handling or delivery. |
| **Platform Admin** | Sandile / Ingwenya Digital team. Full platform management access. |

---

## 4. What Makes thenga.com Different

Takealot, Facebook Marketplace, and similar platforms assume the user is:
- Connected to reliable data
- Literate in the platform
- Able to self-verify
- Able to receive a courier

**thenga.com assumes none of that.**

The Community Agent layer bridges every gap the platform cannot automate. AI handles scale and automation. Community Agents handle trust, verification, cash, and community integration. That combination — AI infrastructure plus human community layer — is the product differentiator.

---

## 5. Design & Technical Constraints

- **Device:** Must work on low-end Android smartphones
- **Data:** Offline-first or lite mode where possible — limited mobile data environment
- **Notifications:** WhatsApp integration (primary communication channel in rural SA)
- **Onboarding:** Must support agent-assisted onboarding for merchants who are not tech-literate
- **Payments:** Cash handling routed through Community Agents; digital payment rails for ZAR
- **Market:** South Africa — ZAR currency, SA payment providers
- **Logo:** ⚠️ Current logo needs to be replaced. New logo must reflect the thenga.com / Ingwenya Digital brand identity. Do not use the existing logo in any new screens or marketing assets until the redesign is confirmed.

---

## 6. Background Context

Sandile spent time as a Hustle Economy Programme Facilitator at Wild Impact, running business training for 30 micro-entrepreneurs across food, clothing, services, and farming in KwaNgwenya. That experience directly informs the platform design — the gaps the programme could not fill digitally are exactly what thenga.com is built to fill.

The 24 programme topics listed in Section 2b are not just content — they represent the real business knowledge gaps of the target user. The learning layer is not an afterthought; it is a core retention and impact measurement feature.

---

## 7. Funding Direction

Targeting:
- **NYDA** — National Youth Development Agency (youth startup grants)
- **SEDA** — Small Enterprise Development Agency (small business support)
- **Corporate CSR sponsors** aligned with rural development, digital inclusion, and youth employment

The Community Agent model is the funding story: thenga.com creates verifiable youth employment in rural areas as a direct function of platform growth. More merchants = more agents needed = more jobs created.

---

## 8. The Agent Team

| Agent | Role | Status |
|---|---|---|
| **Sandile.Claude** | Senior Developer. Sandile + Claude Code. Has built the project from the ground up. Owns architecture decisions, code reviews, and major edits. | Active from project start |
| **Sandile.Codex** | Junior Developer. New to the team. Takes scoped tasks from Sandile.Claude. Must be onboarded into the existing codebase before being given independent work. | Recently joined |
| **Claude (chat)** | Business Analyst & Data Scientist. Produces requirements, data models, user stories, API specs, and analytics design for dev agents to build from. | Active from project start |

---

## 9. Project Folder

`C:\Users\sandi\Documents\Coding\HustleWebApp\hustle`

---

## 10. Session Instructions for Sandile.Claude

1. Read the current state of the codebase to reorient before doing anything.
2. Check this file for any updates marked with ⚠️ before starting a session.
3. Ask Sandile what the priority is before beginning new work.
4. When assigning tasks to Sandile.Codex, scope them tightly — self-contained tasks that do not require deep existing context.
5. Do not use or reference the old logo in any new work. See Section 5.

---

*Ingwenya Digital (Pty) Ltd — KwaNgwenya, KwaZulu-Natal*
*#UNEMPLOYMENT | I DO NOT CHASE JOBS — I CREATE THEM*
