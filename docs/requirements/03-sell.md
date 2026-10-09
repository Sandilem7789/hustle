# Sell

Current evidence: `/dashboard` has Sell/POS, Money, Stock and Orders tabs, income summaries, product editing, sale receipts, reports and collection scanning. It has no Today/Learn/Restock section or community-spend calculation. `BusinessProfile.owner` now links a shop to an account; final eligibility enforcement is still Phase 1.

### SELL-001 See today's work
As a merchant, I want a concise Today screen, so that I know what needs attention.

Acceptance criteria
- Given my approved shop, when Sell opens, then Today links to my orders, products, money and learning; it never shows another shop's data.
- Given pending orders, when the summary loads, then their count agrees with the Orders list; failed summaries are not displayed as zero sales.
- Given a Community Agent, when Sell opens, then their additional verification tools are available without replacing ordinary merchant tools (D6).

Mobile and offline: Today/Orders/Products/Learn/More is the draft five-item nav; cached totals are labelled stale and no “synced” indicator appears without actual sync evidence.
Data: `BusinessProfile`, `Order`, `IncomeEntry`, current income summary; NEW: Today summary contract and learning progress.
Out of scope: invented sales forecasts, changing accounting periods.

### SELL-002 Manage my orders
As a merchant, I want to fulfil incoming orders, so that buyers receive what they bought.

Acceptance criteria
- Given my shop's order, when I open Orders, then items, totals and fulfilment instructions are available; another merchant's order is refused server-side.
- Given an eligible collection order, when I scan its buyer's pickup code, then it is collected once; wrong-shop, cancelled and already-collected codes are rejected.
- Given a delivery order is confirmed, when dispatch becomes available, then the driver flow is used without giving merchants driver-wide access.

Mobile and offline: primary actions remain visible with 48px targets; failed status changes remain retryable and cannot display a false completed state.
Data: `Order`, `OrderItem`, pickup token, status; delivery job link.
Out of scope: arbitrary status jumps, defining refunds or cancellation cut-offs.

### SELL-003 Maintain my products
As a merchant, I want to add and edit products, so that my shop stays accurate.

Acceptance criteria
- Given 39 products, when I add a valid product, then the 40th succeeds; given 40, a 41st is blocked in UI and server without changing the cap.
- Given another merchant's product ID, when I attempt edit/delete, then the server refuses it.
- Given an image over 5MB or a non-image, when uploaded, then the server rejects it and the form keeps my other fields.
- Given an edit fails, when I return to the form, then entered values and an actionable error remain.

Mobile and offline: single-column management cards and labelled forms; image previews reserve space; cached products can be read but writes require confirmation until an offline queue is implemented.
Data: existing `Product` name, description, price, category, media URL and business link.
Out of scope: inventory quantities, variant pricing, barcode-driven marketplace accounting until separately scheduled.

### SELL-004 Record sales and money in/out
As a merchant, I want a POS basket and money diary, so that I can understand income, expenses and profit.

Acceptance criteria
- Given a POS basket, when a sale completes, then one receipt and the corresponding income are recorded; a repeated submit must not double-count.
- Given an expense or cash income entry, when saved, then its date, amount, category and channel appear in my history and period totals.
- Given an entry from another shop, when I try to change it, then ownership is checked before any mutation.
- Given an exported period, when I download the report, then its income, expenses and profit match that period's records.

Mobile and offline: native date/numeric inputs, explicit income/expense labels; future offline drafts/queues must distinguish unsent from saved and deduplicate on reconnect.
Data: `Sale`, `SaleItem`, `IncomeEntry.entryType`, amount, date, channel, category; existing summary and export methods. NEW: transaction-type inheritance where marketplace income is linked to orders.
Out of scope: bank integration, tax advice, treating a POS cash log as a completed platform order for D15.

### SELL-005 Restock through my shop
As a merchant, I want to buy supplies inside Sell, so that business purchases are tied to my shop.

Acceptance criteria
- Given my eligible shop, when I buy through Restock, then the server creates B2B with my buyer-shop link; Shop purchases remain B2C (D7).
- Given a plain account or a forged different buyer-shop ID, when Restock is called, then the server refuses it.
- Given my own shop as seller, when I submit, then self-purchase is blocked; a purchase-order reference is available only for B2B.
- Given a delivery Restock order, when the total crosses R1,200, then SHOP-005's server fees apply identically; collection remains free of delivery fees.

Mobile and offline: clearly identify the purchasing shop and keep the cart review readable; require online authorization at submission.
Data: existing `Order.transactionType`, `businessPurchaseOrderRef`; NEW: buyer AppUser and buyer shop, B2B entry point (P1.4).
Out of scope: wholesale pricing, credit terms, buyer-selected transaction type.

### SELL-006 Understand shop status and community spend
As a merchant, I want to know whether my shop is live and what my buying contributes locally, so that I can take useful action.

Acceptance criteria
- Given 89 days since final approval or the latest completed platform order, when inactivity is evaluated, then the shop stays live; at 90 days with no intervening completed order it is suspended and hidden from Shop (D15, P1.7's boundary).
- Given only POS/offline diary sales during that period, when inactivity is evaluated, then they do not reset the platform-sale clock.
- Given a suspended shop, when I open Sell, then the status and instruction to contact thenga.com are visible; my own action cannot silently reactivate it.
- Given a community-spend figure is shown, when I inspect it, then its period, local amount, total basis and community definition are visible; an empty denominator is not presented as a misleading percentage.

Mobile and offline: status messages are text, not colour alone; show the last confirmed eligibility offline.
Data: `Order.status`, shop community and approval/activity dates; NEW: suspension state/reason, last completed order date, community-spend calculation designed in P4.5.
Out of scope: choosing the community-spend formula or pre-suspension warning schedule (O9).

## Open questions

- Specify community spend: which purchases, completion/refund treatment, time period and buyer/seller community definition (P4.5).
- O9: warning timing/channels before inactivity suspension. Confirm how staff reactivation resets the inactivity clock.
- Confirm cancellation permissions and which actions remain available to a banned/suspended merchant for existing orders, records and learning.
- Confirm the 90-day interpretation in P1.7 versus D15's “3 months”; the test boundaries above follow the explicit plan acceptance examples.
