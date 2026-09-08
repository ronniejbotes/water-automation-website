# Keeping orders working after the move to static HTML

What the shop actually is, what a static site can and cannot do for it, and the options —
with the numbers checked rather than remembered.

Everything in the first section was read off the live store on **8 September 2026**, through
the same paths a customer uses: the WooCommerce Store API and a real browser session. None
of it is assumed.

---

## The shop, as it actually is

**Five products. All simple — no variations, no subscriptions, no digital goods.**

| Product | Price | Stock | WooCommerce ID |
|---|---|---|---|
| aquaHALT Flip – Toilet | $165.99 | in stock | 1508 |
| aquaHALT ICE – Ice Makers | $163.99 | in stock | 1486 |
| aquaHALT 2X – Toilet | $157.99 | in stock | 1494 |
| aquaHALT H/C – Sinks | $187.99 | **out of stock** | 1491 |
| aquaHALT Replacement Sensor | $16.25 | in stock | 360 |

No SKUs are set on any product.

**Shipping: a single flat rate of $13.00 per item.** Not per order — a four-item cart is
charged $52.00. The UPS shipping plugin is installed but is not offering live rates: the only
method returned for any US address is `flat_rate`.

**Tax: state base rate, applied to the item subtotal, not to shipping.** The table is
correct at state level and correctly charges nothing in the five states with no statewide
sales tax:

| | | | |
|---|---|---|---|
| NH $0.00 | OR $0.00 | MT $0.00 | DE $0.00 |
| AK $0.00 | CO 2.90% | NY 4.00% | AZ 5.60% |
| FL 6.00% | PA 6.00% | TX 6.25% | IL 6.25% |
| MA 6.25% | WA 6.50% | CA 7.50% | *(no address: 7.00%)* |

**Payments: Stripe — card and Stripe Link.** No Klarna, Affirm or Afterpay.

**Checkout: the WooCommerce Blocks checkout**, not the classic shortcode. Guest checkout is
allowed, with an optional "create an account" tick box and a login prompt for returning
customers.

An affiliates plugin is installed and loads its stylesheet on every page. Whether an
affiliate programme is actually running needs confirming with the client — it cannot be told
from the front end.

---

## The thing worth noticing first

**The shop is 6 URLs out of 186.** `/shop/`, four in-stock product pages and one out-of-stock
one. Add `/cart/`, `/checkout/` and `/my-account/` and it is 9.

The other 177 are blog posts, service pages, city landing pages and the sitemaps — and those
are the entire reason for the static rebuild. Nothing about editing titles, headings, schema
or internal linking on 177 content pages requires moving the checkout.

So the question is not "how do we replace WooCommerce". It is "does WooCommerce need to move
at all". It does not, and moving it is the only part of this project that can lose money if
it goes wrong.

---

## Recommended: static content, WooCommerce for the shop

Serve the static HTML for everything except the handful of paths the store needs, and let the
existing WordPress keep handling those. The site is already behind Cloudflare, so the routing
can live in a Cloudflare Worker in front of both.

**Route to WordPress:**

```
/shop/…            /cart/…           /checkout/…        /my-account/…
/product/…         /wp-admin/…       /wp-login.php      /wp-content/uploads/woocommerce_uploads/…
/wp-json/…         /wc-api/…         /?wc-ajax=…        /?add-to-cart=…
```

**Everything else → the static site.**

Two details that are easy to miss and both break the store quietly if missed:

1. **Route on the query string, not just the path.** WooCommerce refreshes the header
   mini-cart with `GET /?wc-ajax=get_refreshed_fragments` — path `/`, which is the *static*
   homepage. A static host ignores query strings and answers with the 242 KB homepage where
   WooCommerce expects 827 bytes of JSON. It then retries, which is why `/cart/` currently
   renders three Stripe iframes instead of one on the static copy. The same applies to the
   `?add-to-cart=1494&quantity=1` links, which are on static pages such as `/buy-now/`.

2. **The mini-cart is in the header of all 181 pages.** Route `/?wc-ajax=…` to WordPress and
   it works site-wide, static pages included, exactly as it does today.

**What this costs you:** WordPress stays alive. But it stops serving 177 pages, so its public
surface shrinks to the shop, and it is no longer in the way of any SEO work.

**What it saves you:** every order, customer record, tax rate, shipping rule, Stripe
connection and affiliate record stays exactly where it is. No data migration, no re-testing
of a payment flow, no risk to revenue. It is days of work, not weeks.

---

## If the goal is to switch WordPress off entirely

Then it is a re-platform, and it is a separate project from the SEO one. Three routes, with
pricing verified on **8 September 2026**:

### Stripe Checkout / Payment Links — cheapest, least machinery

Stripe hosts the payment page; no new platform fee. Card processing stays at Stripe's
[2.9% + $0.30 per successful domestic transaction](https://stripe.com/pricing), and Checkout
and Payment Links are *"Included with Payments"*. Tax needs
[Stripe Tax](https://stripe.com/pricing): Basic is *"0.5% per transaction, where you're
registered to collect taxes"*, or Tax Complete *"starting at $90.00 per month, 1-year
contract"*.

Good if most orders are a single item. A real multi-item cart needs a small serverless
function to build the session and apply the $13-per-item shipping. Orders live in the Stripe
dashboard — there is no store admin, no customer accounts and no affiliate tracking.

### Snipcart — keeps these exact pages and URLs

A JavaScript cart layered onto the static HTML: the buy buttons get `data-item-*` attributes
and the existing product pages stay exactly as they are, at exactly these URLs. That matters,
because the product URLs are indexed.

[Pricing](https://snipcart.com/pricing) is *"2% / transactions"* plus gateway fees, and for
businesses under $1,000 USD monthly sales *"the 2% will be replaced by a $20 USD monthly
fee"*. That 2% sits on top of Stripe's 2.9% + $0.30.

Handles cart, checkout, tax rates, shipping, inventory and abandoned carts. Does not bring
across WooCommerce order history, the customer accounts, or the affiliates plugin.

### Shopify Buy Buttons — most capable, biggest change

[Basic is $19/mo billed annually or $25 USD/mo billed monthly](https://www.shopify.com/pricing),
and third-party payment providers cost an extra *"2%"* on Basic — avoidable by moving from
Stripe to Shopify Payments. Shopify then owns tax, shipping, inventory and fulfilment, which
is genuinely less to maintain.

The catch for this site: the checkout runs on Shopify's domain unless you are on Plus. The
static product pages can stay at their current URLs with Buy Buttons embedded, but the
buying flow leaves the domain.

---

## Rough comparison

At **$160 average order** — the actual mid-point of this catalogue, not a made-up figure:

| | Per-order cost on top of the product | Fixed monthly |
|---|---|---|
| Keep WooCommerce (hybrid) | Stripe 2.9% + $0.30 = **$4.94** | WordPress hosting, as today |
| Stripe Checkout + Tax Basic | $4.94 + 0.5% tax = **$5.74** | none |
| Snipcart | $4.94 + 2% = **$8.14** | none above $1,000/mo, else $20 |
| Shopify Basic + Shopify Payments | Shopify's own card rate | $19–$25 |

Which of these is actually cheapest depends entirely on **monthly order volume**, which is
the one number none of this can be worked out without. Below roughly 30 orders a month the
fixed costs dominate and Stripe Checkout wins; above that the percentages do, and keeping
WooCommerce on cheap hosting is hard to beat.

---

## What would change this recommendation

1. **Monthly order volume and average order value.** Drives the whole comparison above.
2. **Whether the affiliate programme is live.** If affiliates are being paid on referred
   orders, that is tracking neither Snipcart nor Stripe Checkout replaces, and it argues
   strongly for keeping WooCommerce.
3. **Server access.** The hybrid needs either Cloudflare Worker access or control of the
   origin's nginx config. Without either, it is not available.
4. **Whether anyone still uses `/my-account/`.** If customers log in to see order history,
   that is WooCommerce-specific and does not survive a move to Stripe Checkout.

---

## Two things found while reading the store

Neither is caused by the migration; both were true before it.

1. **Tax is charged at the state base rate only — local and district rates are not added.**
   Chicago is billed 6.25% where the combined rate charged in the city is higher; Los Angeles
   is billed 7.50% likewise. Whether that is correct depends entirely on which states the
   business is registered in and how it has elected to collect, so it is not a fault as such
   — but it is worth putting in front of whoever handles their sales tax filings, because the
   gap is collected from customers or absorbed by the business, and neither is free.

2. **aquaHALT H/C – Sinks is out of stock**, and has been throughout this work. It is at
   $187.99, it is linked from the main navigation, and it is the most expensive product in
   the range.
