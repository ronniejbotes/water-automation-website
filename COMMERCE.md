# Decommissioning WordPress

The decision is a full replacement: no WordPress, no PHP, a static HTML site at
waterautomation.com. This is what that requires — everything WordPress currently does that
something else will have to do instead.

Everything in "The shop, as it actually is" was read off the live store on **8 September
2026**, through the WooCommerce Store API and a real browser session. None of it is assumed.

---

## The shop, as it actually is

**Five products. All simple — no variations, no subscriptions, no digital goods.**

| Product | Price | Stock | Woo ID |
|---|---|---|---|
| aquaHALT Flip – Toilet | $165.99 | in stock | 1508 |
| aquaHALT ICE – Ice Makers | $163.99 | in stock | 1486 |
| aquaHALT 2X – Toilet | $157.99 | in stock | 1494 |
| aquaHALT H/C – Sinks | $187.99 | **out of stock** | 1491 |
| aquaHALT Replacement Sensor | $16.25 | in stock | 360 |

No SKUs are set on any product. That is worth fixing during the move, because every
alternative platform keys inventory on a SKU.

**Shipping: a flat $13.00 per item.** Not per order — a four-item cart bills $52.00. The UPS
plugin is installed but returns no live rates; `flat_rate` is the only method offered to any
US address.

**Tax: the state base rate, applied to the item subtotal and not to shipping.** Correctly
zero in the five states with no statewide sales tax:

| | | | |
|---|---|---|---|
| NH $0.00 | OR $0.00 | MT $0.00 | DE $0.00 |
| AK $0.00 | CO 2.90% | NY 4.00% | AZ 5.60% |
| FL 6.00% | PA 6.00% | TX 6.25% | IL 6.25% |
| MA 6.25% | WA 6.50% | CA 7.50% | *(no address: 7.00%)* |

**Payments: Stripe — card and Stripe Link.** Guest checkout allowed, with an optional
"create an account" tick box. Checkout is the WooCommerce Blocks checkout.

---

## What WordPress is doing that has to go somewhere

| What | Where it goes | Effort |
|---|---|---|
| 177 content pages | Already static in this repo | **done** |
| Shop, cart, checkout, payments, tax, shipping | New commerce platform — see below | the real work |
| 10 forms across 30 pages | Form endpoint | small |
| Order confirmation and shipping emails | New commerce platform sends them | included |
| Customer accounts and order history (`/my-account/`) | **Lost.** Decision needed | decision |
| Affiliate programme | **Lost.** Decision needed | decision |
| Existing orders and customer records | **Export before switch-off** | do this first |
| Yoast sitemaps | Static files here; regenerate when pages change | small script |
| Blog publishing | Editing HTML, unless a generator is added | workflow change |

There is no site search on the live site, so nothing to replace there.

---

## Commerce: use Snipcart

Of the three realistic options, Snipcart is the one where **the pages in this repo stay
exactly as they are, at exactly these URLs**. That matters more than anything else here,
because the entire point of the project is SEO and the product URLs are indexed. Snipcart is
a JavaScript cart layered onto static HTML: the buy buttons get `data-item-*` attributes and
nothing else about the page changes.

It also happens to match this store's configuration closely:

- **Tax** is configured as manual per-region rates in its dashboard, and rates can be set per
  US state with an *"Applies on shipping"* option that controls whether shipping is taxed
  ([docs](https://docs.snipcart.com/v3/setup/taxes)). That reproduces the current table
  exactly — state rates, shipping untaxed.
- **Stripe** is a supported gateway and an existing Stripe account can be connected under
  Store → Payment Gateway ([docs](https://docs.snipcart.com/v3/dashboard/payment-gateway)).
  Same Stripe account, same payouts.
- **Pricing** is *"2% / transactions"* plus gateway fees, and under $1,000 USD monthly sales
  *"the 2% will be replaced by a $20 USD monthly fee"*
  ([pricing](https://snipcart.com/pricing)).

It brings its own order dashboard, customer accounts, inventory and abandoned-cart recovery,
so most of what `/my-account/` did comes back — just not the existing history.

### The one thing it does not do natively

**Per-item shipping.** Snipcart's shipping is configured by weight ranges, order total or a
webhook; there is no per-unit rate ([docs](https://docs.snipcart.com/v3/setup/shipping)).
Three ways round it, in order of preference:

1. **Ask whether $13-per-item is actually wanted.** It is an unusual rule — a two-item order
   pays $26 shipping on ~$320 of goods. Most stores this size charge per order, or free over
   a threshold. If the client will accept a flat per-order rate or free shipping over $200,
   this problem disappears and conversion probably improves. **This is a business decision
   and it should be asked before any of it is built.**
2. **Weight tiers.** Set `data-item-weight` to 1 per unit and define tiers: 1 → $13, 2 →
   $26, and so on. Exact, no code, but a tier per quantity.
3. **A shipping webhook.** About twenty lines on Cloudflare Pages Functions returning
   `qty × $13`. Exact and unbounded, but it is a piece of backend to own — and "no backend"
   is part of why we are doing this.

### Why not the other two

**Stripe Checkout + a Worker** is cheaper — no 2%, and Checkout is *"Included with
Payments"* at Stripe's [2.9% + $0.30](https://stripe.com/pricing). Per-item shipping is easy
because quantities are known when the session is created. Tax is the blocker: the shipping
address is collected *inside* Stripe's checkout, so per-state rates cannot be applied
manually and you need [Stripe Tax](https://stripe.com/pricing) — *"0.5% per transaction"* on
Basic, or Tax Complete *"starting at $90.00 per month, 1-year contract"*. You also get no
order admin beyond the Stripe dashboard, and you own the code.

**Shopify** handles tax, shipping and inventory natively for
[$19/mo annual or $25 USD/mo monthly](https://www.shopify.com/pricing) on Basic. But the
checkout runs on Shopify's domain unless you are on Plus, and the catalogue then lives in two
places — Shopify and these static pages — which is exactly the duplication this project is
trying to remove.

### What it costs on a $160 order

| | Per order | Monthly |
|---|---|---|
| Snipcart + Stripe | $4.94 Stripe + $3.20 Snipcart = **$8.14** | $20 only under $1,000/mo sales |
| Stripe Checkout + Tax Basic | $4.94 + $0.80 = **$5.74** | none |
| Shopify Basic + Shopify Payments | Shopify's own card rate | $19–$25 |

The gap between Snipcart and Stripe Checkout is about **$2.40 an order**. At 50 orders a
month that is $120 — the price of not building and maintaining a checkout, a tax lookup and a
shipping calculator. Worth it unless volume is high, in which case revisit.

---

## Forms: 10 of them, and they are all simple

Every form on the site, inventoried by `npm run forms`:

| Form | Where | Fields |
|---|---|---|
| "Request a call" ×8 variants | 27 pages incl. `/`, `/blog/`, `/contact-us/`, `/about-us/`, all landers | name, email\*, tel\*, message, `hpot` honeypot |
| Partner enquiry ×2 | `/partner/`, `/partner/become-a-partner/` | + job_title\*, company\* |
| Expo signup | `/expo-signup/` | name, email\*, consent checkbox |

\* required. Field types across the whole site are only `text`, `email`, `tel`, `textarea`
and `checkbox` — **no file uploads and no payment fields**, so there is nothing hard here.
A honeypot field (`hpot`) is already in the markup, so basic spam protection carries over.

Any endpoint will do. If the site lands on Cloudflare Pages, a Pages Function posting to an
email API is the tidiest and has no per-submission ceiling. Managed services work too, but
check the volume ceiling first — Formspree's free tier is
[50 submissions per month](https://help.formspree.io/articles/account-management/account-limits),
which 30 pages of lead capture would eat quickly.

**One bug to fix while rebuilding:** on `/case-studies/` the phone field is `type="email"`,
so it rejects phone numbers. That is broken on the live site today.

---

## Do this before switching WordPress off

Once the install is gone, this is unrecoverable.

1. **Export orders and customers.** WooCommerce → Products/Orders/Customers CSV export, and
   keep the SQL dump. Stripe has the payments, but the line items, shipping addresses and
   customer records live in WooCommerce.
2. **Record the tax table** as configured, state by state, so it can be re-entered and
   checked against.
3. **Record the Stripe webhook endpoints** currently pointing at WordPress — they will 404
   after cutover and need repointing at the new platform.
4. **Confirm whether the affiliate programme is live.** The plugin is installed and loads on
   every page, but that cannot be told from the front end. If affiliates are being paid on
   referred orders, neither Snipcart nor Stripe Checkout replaces that tracking, and it needs
   its own answer before anything is switched off.
5. **Decide what happens to existing customer accounts.** Anyone who logs in to
   `/my-account/` for order history loses it. If there are meaningful numbers, they need
   telling before, not after.

---

## Suggested order of work

1. Ask the client the three business questions: per-item shipping, the affiliate programme,
   and customer accounts.
2. Export everything from WordPress. Keep the dump.
3. Wire up forms — smallest piece, and the one currently losing enquiries silently.
4. Build the Snipcart catalogue: 5 products, SKUs, per-state tax, shipping rule.
5. Add `data-item-*` attributes to the buy buttons on the existing product pages.
6. Test end-to-end in Snipcart's test environment, which is free.
7. Cut DNS over to the static host with the four redirects from `_redirects` in place.
8. Watch Search Console and Stripe for a fortnight before decommissioning the WordPress host.

Leave the WordPress install switched off but intact for a month or two after cutover. It
costs one month of hosting and it is the only way back if something surfaces late.

---

## Still unanswered

- **Monthly order volume and average order value.** Decides whether Snipcart's 2% is the
  right trade against building on Stripe directly.
- **Is the affiliate programme live?** Blocks the platform choice if it is.
- **Per-item shipping — keep, or change?** Blocks the Snipcart shipping setup.
- **How will new blog posts be published?** Without WordPress there is no editor. Editing
  HTML directly is fine for an SEO team and is what gives the control this project is for,
  but it should be a decision rather than a discovery after cutover.

## Two things found while reading the store

Neither is caused by the migration; both are true today.

1. **Tax is collected at the state base rate with no local or district component.** Chicago
   is billed 6.25% where the combined city rate is higher; Los Angeles 7.50% likewise.
   Whether that is correct depends entirely on where the business is registered and how it
   has elected to collect — so it is not a fault as such, but the gap is either collected
   from customers or absorbed, and it should go in front of whoever handles the filings.
2. **aquaHALT H/C – Sinks is out of stock**, at $187.99, linked from the main navigation, and
   the most expensive product in the range.
