# Shop

Current evidence: marketplace search, native category/community radios, two-column mobile cards and a focus-managed detail sheet are built. Business pages list products. The session cart accepts multiple shops, but the order service rejects mixed-shop orders. Checkout requires login and lets the client select transaction type; customer orders render statuses and collection QR codes. Fees and payment processing are absent.

### SHOP-001 Find local products
As a shopper, I want search and filters together, so that I can find relevant goods.

Acceptance criteria
- Given the initial catalogue, when I open Shop, then All/Fast Food/Grocery radios plus More categories are available, and there is no community picker on the page.
- Given I choose a community in the menu, when Shop loads, then only that community's products appear and the result count names it ("9 items in KwaNgwenya"); my choice is remembered on my next visit (Sandile's decision, 2026-10-09).
- Given a typed query, when community or category changes, then the query remains and only the newest request can update results.
- Given no matches, no listings or a failed fetch, when the result area updates, then it offers the appropriate clear-filter, sell or retry action without inventing inventory.

Mobile and offline: preserve the decided two-column photo grid, 48px controls, image placeholders and lazy images; cached listings must be labelled stale and cannot guarantee availability.
Data: `Product`, `ProductCategory`, `Community`; current product DTO and filters.
Out of scope: ratings, recommendations, stock claims or catalogue redesign.

### SHOP-002 Inspect an item and its merchant
As a shopper, I want item details and the merchant's shop, so that I understand what I am buying.

Acceptance criteria
- Given a product, when I open details, then name, description, price and seller are shown; the seller link opens that shop's products.
- Given the detail dialog, when I use Escape or Close, then focus returns to the opening card.
- Given a banned or suspended shop, when I browse the catalogue, search, or filter by its community, then neither the shop nor any of its products appears (D15, D18).
- Given an old link to a banned or suspended shop's page, when I open it, then I see "This shop is not available" and no product information.
- Given someone sends an order for a banned or suspended shop's product directly to the server, when it arrives, then the server refuses it. This is checked separately from hiding the shop.

Mobile and offline: long names wrap; missing images have a useful placeholder; shop load failure is not “no products”.
Data: `Product` and public `BusinessProfile` fields; NEW: published-shop eligibility from Phase 1.
Out of scope: exposing owner phone/identity in public DTOs; product-option purchase semantics pending decision.

### SHOP-003 Review a cart
As a shopper, I want to adjust a cart before ordering, so that quantities and cost are clear.

Acceptance criteria
- Given cart items, when quantity changes or an item is removed, then line totals and subtotal update in ZAR; zero quantity removes that item.
- Given an empty cart, when I open checkout, then I get a Shop link and cannot submit an order.
- Given stale prices or a no-longer-available item, when the server validates checkout, then I see the problem and retain the rest of my cart for review.
- Given items from several shops, when I attempt one order, then it is not submitted as a mixed-shop order; the chosen grouping/replacement UX remains an open question.

Mobile and offline: named quantity/remove buttons, 48px targets; local cart editing works without claiming an order was placed.
Data: current `CartItem`, session storage, `OrderItem` snapshots; NEW: server quote/validation response if Phase 1 requires it.
Out of scope: silent cart replacement, multi-shop delivery consolidation.

### SHOP-004 Buy in Shopping mode
As an account holder, I want a personal checkout, so that I can buy without choosing accounting terminology.

Acceptance criteria
- Given a Shop purchase, including one made by a Merchant, when the server creates the order, then it is B2C and checkout contains no transaction-type selector (D7).
- Given a forged B2B value or buyer-shop identifier sent through Shop, when submitted, then it cannot create a B2B order.
- Given a merchant tries to buy their own shop's product, when submitted through Shop or Restock, then the server refuses self-purchase.
- Given a submission is in progress, when I tap again, then the UI prevents duplicate sends; an uncertain timeout must not claim success or erase the cart.

Mobile and offline: one clear submit action with the confirmed total; retain fields on failure and require connectivity to place an order.
Data: existing `Order`/items; NEW: the buyer's account on the order, and the server deciding B2C or B2B from where the purchase was made (P1.4).
Out of scope: client-selected B2B, treating offline requests as confirmed orders.

### SHOP-005 Choose delivery or collection
As a shopper, I want the fee and collection option before ordering, so that I know what I will pay.

Acceptance criteria
- Given Delivery and goods subtotal R1,199.99, when quoted by the server, then the fee is R80 and total R1,279.99; given R1,200.00, the fee is R50 and total R1,250.00 (D16).
- Given Collection at either subtotal, when quoted, then the delivery fee is R0; the seller's operating area/collection instructions are shown.
- Given the threshold is the goods total before the delivery fee, when a quote is made, then the fee itself never pushes an order over R1,200.
- Given someone changes the totals or fee in the request, when it reaches the server, then the server's own amounts are used, and the buyer sees the final breakdown before confirming.
- Given staff change the configured fee amounts or the threshold, when the next quote is made, then the new values apply without any code change (D16).
- Given food/grocery and a known distance over 60km, when Delivery is chosen, then checkout and server block it with “This seller cannot deliver to your location. You can collect in person.” At exactly 60km this cap does not block; other driver-availability checks may.
- Given another category, when distance exceeds 60km, then this food cap is not applied.

Mobile and offline: labelled delivery/collection radios, address text fallback and accessible map pin; explain denied GPS permission. No delivery guarantee before server checks.
Data: `Order.fulfillmentType`, delivery address/coordinates; `BusinessProfile` location; NEW: persisted fee and configurable thresholds/rates (P1.4).
Out of scope: fee provider, driver share (O8), changing the distance cap.

### SHOP-006 Guest shopping and checkout fallback
As a guest, I want to browse without registering, so that I can decide whether to buy.

Acceptance criteria
- Given no session, when I browse Shop or a public merchant page, then products remain available without a login wall.
- Given I choose sign-in during checkout, when authentication succeeds, then cart and intended checkout destination remain available.
- Given the guest checkout fallback is enabled in its agreed phase, when I order, then only name, phone and delivery address when needed are required; it applies the same fee, distance and item validations as authenticated checkout.

Mobile and offline: a short guest form; local browse/cart state survives the sign-in journey; no offline order confirmation.
Data: current public product endpoints and cart; NEW: guest-order contact and secure retrieval mechanism, since today's Order requires Customer.
Out of scope: inventing a guest tracking token design or implementation date.

### SHOP-007 Pay and receive updates (Later)
As a buyer, I want payment and delivery updates, so that I know whether an order is paid and progressing.

Acceptance criteria
- Given payment integration is enabled later, when a provider-confirmed outcome arrives, then the displayed payment state reflects that verified outcome, not a browser redirect alone.
- Given no integration exists, when an order is placed, then it is not labelled paid.
- Given WhatsApp notifications are enabled later under agreed contact rules, when an order changes, then a message links back to authorized tracking without exposing another buyer's details.

Mobile and offline: a failed/unknown payment outcome is explicit, with a way to recheck; never charge again solely because the browser timed out.
Data: NEW: payment state/reference and notification delivery state.
Out of scope: provider choice, wallet, payouts, automated messaging in current work.

### SHOP-008 Track my order and collect it
As a buyer, I want an accurate order status, so that I know what happens next.

Acceptance criteria
- Given my order, when I open Orders, then seller, items, totals, fulfilment and current status appear; changing its identifier cannot reveal another person's order.
- Given a collection order eligible for pickup, when I open it, then its pickup QR is available to me; a cancelled/already-collected code cannot complete collection again.
- Given delivery progress, when refreshed, then the server status is shown without fabricated ETA; error and empty histories are distinct.

Mobile and offline: one-column order cards, readable QR and status text; cached status is labelled with its age and never implies live tracking offline.
Data: `Order.status`, totals, items, `pickupToken`, timestamps; NEW: fee breakdown and account ownership.
Out of scope: refunds/cancellation policy not yet decided, live driver location sharing with buyers.

## Open questions

- Guest checkout timing and secure guest tracking need agreement; today's UI requires an account despite the spec allowing a fallback.
- How should a cart spanning shops be resolved, and how should existing option selections be persisted/priced? Current options are not sent to the cart.
- Missing seller/customer coordinates cannot prove the 60km rule; define the acceptable verification/fallback before shipping that edge.
- How do future discounts affect the R1,200 threshold? (The threshold itself is the goods total before the delivery fee, decided by the senior in R5.)
- If a buyer's phone retries an order after a timeout, how does the server know it is the same order? What is the cancellation and refund policy?
