# waterautomation.com — static mirror

A 1:1 static HTML copy of the live WordPress site at **https://www.waterautomation.com/**,
captured **8 September 2026**.

Source stack that was mirrored: WordPress + Elementor / Elementor Pro + `hello-elementor`
theme + WooCommerce (Stripe gateway, UPS shipping) + Yoast SEO Premium 27.9 + an affiliates
plugin, behind WP Rocket and Cloudflare.

Nothing has been redesigned, rewritten, cleaned up or "improved". Copy first, optimise
later. Where the live site is broken, it is broken here too, in the same way — those are
listed under [Issues carried over from the live site](#issues-carried-over-from-the-live-site).

---

## URL and file mapping

Every live URL keeps its exact path, so **the migration itself needs no redirects and no
backlink changes target**.

| Live URL | File in this repo |
|---|---|
| `https://www.waterautomation.com/` | `index.html` |
| `https://www.waterautomation.com/shop/` | `shop/index.html` |
| `https://www.waterautomation.com/product/aquahalt-2x/` | `product/aquahalt-2x/index.html` |
| `https://www.waterautomation.com/blog/page/2/` | `blog/page/2/index.html` |
| `https://www.waterautomation.com/wp-content/uploads/…` | `wp-content/uploads/…` (identical path) |
| `https://www.waterautomation.com/sitemap_index.xml` | `sitemap_index.xml` |
| 404 template | `404.html` |

Asset paths (`/wp-content/…`) were deliberately left unchanged, so every image URL Google
has already indexed still resolves.

---

## What is in here

**181 HTML pages**, plus the 404 template:

| Type | Count |
|---|---|
| Blog posts | 135 |
| Pages | 27 |
| Products + shop | 6 |
| Blog pagination (`/blog/page/2/` … `/page/11/`) | 10 |
| Category archive (`/uncategorized/`), `/case-studies/`, `/my-account/lost-password/` | 3 |

Three of those routes are in no sitemap — `/case-studies/`, `/my-account/lost-password/`
and `/uncategorized/`. They were found by crawling every link on every page, return HTTP
200 on the live site, and so were mirrored too.

**1,241 files / 213 MB total**: 443 JPEG, 284 PNG, 38 WebP, 13 SVG, 5 MP4, 3 PDF product
manuals, 120 JavaScript, 99 stylesheets, 17 font files, the 5 Yoast sitemaps and the XSL
stylesheet that renders them.

---

## The only two deliberate changes to the HTML

1. **Internal asset and link references were made root-relative.**
   `https://www.waterautomation.com/wp-content/x.png` → `/wp-content/x.png`,
   `https://www.waterautomation.com/shop/` → `/shop/`. This is what lets the site be
   previewed and worked on before cutover, from any origin, without a rebuild.

   **Explicitly left absolute, byte-for-byte as WordPress emitted them:**
   `<link rel="canonical">`, every `og:*` / `twitter:*` / `article:*` / `product:*` meta
   tag, the whole Yoast `application/ld+json` schema graph, `rel="alternate"`, `shortlink`
   and `EditURI`, and all `<loc>` values in the sitemaps. None of those SEO signals
   changed. Rewriting the schema graph would have stripped it of the `@id` values that tie
   its entities together, and rewriting the canonicals would have told a crawler every page
   is the homepage.

2. **The header and footer logo links.** On the live site both are
   `href="https://www.waterautomation.com"` with no path after the host. Stripping the host
   would leave `href=""`, which a browser resolves as *the current document* — a dead
   self-link on all 181 pages. They are now `href="/"`, the same destination.

That is the complete list of changes made *by the capture*, and it is verified rather than
asserted: re-running the rewrite over the untouched capture in `_raw/` reproduces every
shipped page byte for byte, and normalising the host out of both sides leaves the two files
identical apart from item 2.

Two further corrections were applied afterwards, deliberately and separately — see
[Corrections applied after capture](#corrections-applied-after-capture).

---

## Corrections applied after capture

The capture is faithful, broken links included. These are fixes made on top of it, on
request, once the copy had been proved faithful.

They live in `tools/fixes.mjs` as data and are re-applied by `npm run fix`, **not** hand-
edited into the pages. The mirror is generated: anything typed directly into a captured page
is lost the next time `npm run mirror` runs, silently, and the site regresses to the broken
state without anything failing. Running `npm run fix` is therefore the last step of any
rebuild.

| Fix | Was | Now | Files |
|---|---|---|---|
| `products-404` | `href="/products"` (404) | `href="/buy-now/"` | 9 |
| `partner-insurance-404` | `href="/partner/insurance"` (404) | `href="/partner/#insurance"` | 14 |

Neither destination is a guess. `/buy-now/` is where the header nav's own "Products" item
points, and the broken link sits directly beside a `/buy-now/` call to action in the same
hero section. `/partner/#insurance` is exactly what the nav's "Insurance Providers" item
links, and that anchor exists on `/partner/` alongside `#property`, `#plumbers` and
`#builder`.

**The two are not equally serious, and it is worth being precise about which is which.**

`partner-insurance-404` was a **visible, clickable button** — "Explore Leak Detection
Solutions" — on 14 pages including the homepage, about-us and all eight city landing pages.
Real visitors clicking a prominent call to action were landing on a 404. Clicking it on the
copy now lands on `/partner/`, scrolled exactly to the "Insurance Providers — Prevent claims
before they happen" section.

`products-404` was **never clickable**. Elementor renders three copies of that hero image
(desktop/tablet/mobile); the linked copy is `0x0` and hidden at every breakpoint, and the
copy a visitor actually sees is not wrapped in a link at all. Checked against live and the
copy at 1440, 900 and 390 wide — identical on both. So no visitor was affected; what it cost
was crawl budget, nine internal links pointing at a 404, and a broken-links report in Search
Console.

Separately, and **not** changed: the product image a visitor can see is not a link on the
live site. If it should be one, that is a design decision for the client, not a repair.

**Both were fixed at the link, not with a redirect.** Neither URL has ever resolved, so
nothing links to them from outside and there is no equity to preserve — a redirect would
only add a hop to a URL that has never existed. Repointing the links recovers internal link
equity the site currently spends on a 404.

`npm run fix` is idempotent and checks its own counts: if a fix no longer matches the
expected number of files, it stops rather than half-applying, because a moved count means
the live site changed underneath the fix and it needs re-reading before it is trusted.

### Related, not fixed

`href="/products/aquahalt"` appears on 4 pages and **301s** to `/product/aquahalt-2x/` on
the live site, so it works. Pointing those four links straight at the destination would save
a redirect hop, but it is a change to working links rather than a fix, so it was left alone.
The redirect rule in `_redirects` has to stay either way — external backlinks may point at
that URL.

---

## Verification

Three independent checks, all reproducible from this repo.

### `npm run verify` — completeness, offline

Confirms all 186 routes are present, that every same-origin reference in every HTML and CSS
file resolves to a file that exists here, and that no live-origin URL survives anywhere
something would *load* from it. It also compares each shipped page against its raw capture
and flags any that shrank — see the note on that check in `tools/verify.mjs`, which exists
because of a real defect it now catches.

Current result: **186/186 routes present, 0 origin leaks**, and the only unresolved
references are the two links that are already broken on the live site.

### `npm run compare` — fidelity, against live

The one that matters, and the reason a screenshot diff alone is not enough. It opens each
route twice — once on the live site, once on `tools/serve.mjs` — scrolls both to the bottom
so lazy images load and scroll-triggered animations run, then compares the *rendered*
result: a full-page pixel diff, the visible text word by word, counts of
`img`/`video`/`iframe`/`svg`/`link`/`button`/`form`, how many images actually decoded, and
every console error and failed request the copy produces that the original does not.

Animations, video and the third-party review and chat widgets are frozen and hidden on both
sides first, so the diff reports layout and content drift rather than which frame each
animation happened to be on.

> **These figures were produced by a comparison that was blind to the reviews
> widget, and are superseded.** See [The reviews widget, and what it broke in
> this tooling](#the-reviews-widget-and-what-it-broke-in-this-tooling). The
> corrected numbers are in the table below it.

**Superseded result over all 181 pages, 8 September 2026:**

| Measure | Result |
|---|---|
| Pixel-identical (0.00%) | **127 of 181** |
| Within 0.10% | 151 of 181 |
| Within 1.00% | 170 of 181 |
| Mean / median pixel difference | 0.164% / 0.000% |
| Full-page height differs from live | **0 pages** |
| `<title>` differs from live | **0 pages** |
| Broken images on the copy | **0** |
| Requests failing on the copy but not live | **0** |

The 11 pages above 1% were each re-run individually and every one of them came back at
**0%**. The difference is the site itself, not the copy: it rotates carousel slides and
reveals sections on scroll, so two captures a few seconds apart legitimately differ. The two
worst pages in the batch run — 4.88% and 3.68% — both compared identical on a second pass.
This is why `tools/textdiff.mjs` says to run it twice before believing it.

Content differences reduce to exactly one thing, on every page: the five words
"No products in the cart." that WooCommerce injects into the mini-cart over AJAX. It sits
inside a closed dropdown, which is why those pages still diff at 0% visually.

### Corrected result — all 181 pages, reviews widget rendering on both sides

Re-run after the widget was fixed and the tooling stopped being blind to it. These are the
figures that stand.

| Measure | Result |
|---|---|
| Pixel-identical (0.00%) | **137 of 181** |
| Within 0.10% | 163 of 181 |
| Within 1.00% | 171 of 181 |
| Mean / median pixel difference | 0.177% / 0.000% |
| Full-page height differs from live | **0 pages** |
| `<title>` differs from live | **0 pages** |
| Broken images on the copy | **0** |
| Requests failing on the copy but not live | **0** |
| Reviews-widget geometry mismatches | **0 of 11** |
| Pages where the widget rendered on neither side (uncompared) | **0** |

The 10 pages above 1% are, with one exception, the pages carrying the reviews widget: its
carousel rotates, so the two screenshots catch different reviews. Re-running them
individually moves the number every time and in both directions —
`/product/aquahalt-2x/` went 4.24% → 0.00%, `/water-leak-protection-new-york/` 4.28% →
0.98%. Image-decode counts swing both ways too: Chicago showed 57 live / 60 copy on one
pass and 56 live / 61 copy on the next. That is lazy-loading timing, not missing files —
`brokenImages` is 0 everywhere and the runtime audit finds no 404 on any page.

Content differences reduce to the mini-cart's five words, plus the same rotating-content
noise: words that appear as "missing" on one city page show up as "extra" on another in the
same run.

### The reviews widget, and what it broke in this tooling

The Amazon reviews widget on the homepage rendered unstyled on the copy — avatars at full
size, the card grid collapsed, thousands of pixels of broken layout — while every check
above reported those pages as pixel-perfect. It was spotted by eye, not by any tool here.
Worth writing down, because two separate mistakes had to line up for that to happen.

**The cause.** Trustindex names its 72 KB stylesheet in a custom attribute,
`data-css-url="/wp-content/uploads/trustindex-amazon-widget.css"`, and its loader injects it
after the page loads. The extractor matched `src`, `href`, `content`, `poster` and the
`data-src` family — a list of attribute names — so it never saw that file, never downloaded
it, and `verify` called the page complete because every reference it *knew how to look for*
resolved. Fixed by matching **any** attribute whose value is a same-origin path ending in a
file extension. A re-scan of the whole site found exactly one file missed this way: that one.

**Why nothing caught it.** Two independent failures:

1. `compare.mjs` was told to hide `[class*="trustindex"]` before diffing, to stop the review
   carousel rotating between the two screenshots. A check that hides a widget cannot report
   that the widget is broken. Now it stays visible, its carousel controls are frozen instead,
   and its width, height, review count and avatar size are compared against live directly.

2. More seriously, **the widget was never rendering in any automated pass, on either site**.
   WP Rocket delays this script until a genuine user-input event, and `window.scrollTo()`
   from inside `page.evaluate` is script, not input. So both captures contained an empty
   `<template>`, and two identical blanks compare as a perfect match. Every tool here now
   opens pages with `waitUntil: 'load'` and dispatches real `mouse.move` and `mouse.wheel`
   events before measuring. The difference is not subtle: the homepage measures 1,758 words
   and 68 images with the widget built, against 1,107 and 20 without it.

`compare.mjs` now refuses to quietly repeat this. It records whether the widget was
*expected* on a page (the template is in the served HTML) and whether it actually built on
each side, and prints a warning naming any page where it rendered on neither — because that
page was not compared, it was skipped.

**Scope.** 11 pages carry this widget: the homepage, `/builder-lander/`,
`/habtrack-lander/` and all eight `/water-leak-protection-<city>/` pages. All eleven were
visibly broken, and they are among the most commercially important pages on the site.

`npm run audit` is the general defence: it loads every page against the local server, with
real input, and records every same-origin request that 404s. It needs no list of attribute
names, because a browser does not need to be told which attributes hold URLs — it just asks
for things. Across all 181 pages it now reports zero.

### `npm run functions` — does it still *work*

A pixel diff cannot tell a working carousel from a dead one, because both screenshot the
same standing still. This drives the actual controls on both sites and compares behaviour:
whether `elementorFrontend` and jQuery loaded, how many nav menus, dropdown parents,
carousels, accordions, tabs, forms and add-to-cart buttons exist, how many widgets are still
sitting invisible after a full scroll, and what happens when the dropdown is hovered, the
mobile toggle clicked, the accordion opened and the carousel advanced.

Across the 14 template-representative routes: `elementorFrontend` and jQuery load on every
page of the copy, and menu, dropdown, carousel, accordion and form counts match live exactly.
The only differences reported were the count of not-yet-revealed animated widgets (±3, the
scroll-observer timing again) and which carousel slide was active.

One finding worth recording, because it looks like a defect and is not: the desktop
"Products" and "Partner" dropdowns do not open under an automated pointer — the submenu
stays `display: none` — **on the live site as well as on the copy**, and a screenshot of the
header taken mid-hover is 0% different between the two. The copy reproduces the live
behaviour exactly; whether that behaviour is what the client wants is a separate question
for the fix-it pass.

### `npm test` — the extractor's edge cases

Fourteen cases the asset extractor and the URL rewriter have to keep getting right, each
one a shape that actually appears in this site's markup. Two of them are bugs this build
had and fixed; both are described in the test file.

---

## Needs configuring on the new host

1. **Four 301 redirects that already exist on the live site**, listed in `_redirects`.

   Nothing about this migration creates a redirect. These four are answered by
   waterautomation.com *today*; if the new host does not answer them, those URLs go from
   working to 404, and that is what would actually cost backlinks. `tools/serve.mjs`
   replays the file locally so the behaviour can be checked before cutover.

   | From | To |
   |---|---|
   | `/2025/11/05/top-10-hidden-plumbing-lines…/` | `/top-10-hidden-plumbing-lines…/` |
   | `/contact/` | `/contact-us/` |
   | `/new-buy-now-lander/` | `/buy-now/` |
   | `/products/aquahalt/` | `/product/aquahalt-2x/` |

   Netlify and Cloudflare Pages read `_redirects` as-is. For Apache or nginx:

   ```apache
   Redirect 301 /contact/ /contact-us/
   ```
   ```nginx
   location = /contact/ { return 301 /contact-us/; }
   ```

2. **`404.html` as the error document**, served with a real 404 status.

3. **Trailing-slash directory indexes** — the host must serve `foo/index.html` for `/foo/`.
   Netlify, Cloudflare Pages, Vercel, GitHub Pages, Apache and nginx all do this by default.

4. **HTTP range requests for the MP4s.** Every real static host does this; it is called out
   only because a server that answers `200` with the whole file instead of `206` makes
   Chromium abort the request and the videos look broken.

5. **`.nojekyll`** is present so GitHub Pages does not strip underscore-prefixed paths.

---

## What a static copy cannot do

This is the honest list. None of it is a defect in the copy — all of it needs a server, and
none of it survives the move to static HTML without a replacement being wired up.

| Feature | What it needs | Status in this copy |
|---|---|---|
| Add to cart, cart, checkout, payment | WooCommerce + Stripe | Pages render; nothing transacts |
| My account, login, register, lost password | WordPress users | Forms render; nothing submits |
| 23 Elementor Pro forms (contact, book a call, expo signup, demo, partner) | `admin-ajax.php` | Fields render; **submissions go nowhere** |
| Product search and catalogue filtering | WooCommerce queries | Not functional |
| Affiliate tracking | affiliates plugin | Not functional |
| Mini-cart contents | `?wc-ajax=get_refreshed_fragments` | Dropdown renders empty on every page |

**One visible consequence of that last row.** A static host ignores query strings, so
`GET /?wc-ajax=get_refreshed_fragments` resolves to `index.html`: WooCommerce's mini-cart
script asks for 827 bytes of JSON and receives the entire 242 KB homepage. It fails to parse
it and retries, which is why `/cart/` ends up with three Stripe controller iframes instead of
one. They are 1440x1 and invisible — the page still compares at 0% — and none of this
matters while WooCommerce cannot transact anyway. It is listed because it looks alarming in a
console and has an ordinary explanation. Silencing it needs host-level routing (a Netlify
redirect, a Cloudflare Worker) returning `{"fragments":{},"cart_hash":""}` for that query;
nothing in this repo can do it, because no file can answer a query string on a static host.

**The forms are the urgent one.** 23 of them across the site, including every
lead-capture page. On cutover they need a form endpoint (Formspree, Netlify Forms, a
serverless function) wired in, or the site will silently swallow enquiries — the form still
says "thank you" because that is client-side.

The mini-cart is the reason every page in the comparison differs from live by exactly five
words: live fills the dropdown with "No products in the cart." over AJAX, and the copy
cannot. It is inside a closed dropdown, so it has no visual effect — the pixel diff on those
pages is 0%.

### Third-party embeds

These load from their own CDNs on the copy exactly as they do on the live site, and keep
working: Google Tag Manager, Trustindex reviews, the FastBots chat widget, Google Fonts and
`fonts.cdnfonts.com`, and the YouTube installation videos linked from the Products menu.

Cloudflare's own `/cdn-cgi/` endpoints (the RUM beacon, Rocket Loader) are injected into the
HTML by the CDN rather than served from the site's files, so they 404 off the copy. Putting
the new host behind Cloudflare restores them; nothing else depends on them.

---

## Issues carried over from the live site

Not introduced by the migration. These are broken on waterautomation.com right now and were
left alone per the copy-exactly brief.

1. ~~**`/products` is linked from 9 pages and 404s.**~~ **Fixed** — see
   [Corrections applied after capture](#corrections-applied-after-capture). Both `/products`
   and `/products/` return 404 on live, verified 8 September 2026. Still broken on the live
   site; corrected here to `/buy-now/`.

2. ~~**`/partner/insurance` is linked from 14 pages and 404s.**~~ **Fixed** — corrected here
   to `/partner/#insurance`, the same destination the header nav already uses. Still broken
   on the live site.

3. **`/checkout/` 302s to `/cart/` for anyone with an empty cart.** This is normal
   WooCommerce behaviour, not a configured redirect, so it is deliberately *not* in
   `_redirects` — putting it there would make the checkout page permanently unreachable.
   The checkout template was captured with a product in the cart by
   `tools/capture-checkout.mjs`, which is the only way the page renders at all. `/cart/`
   itself is the cold, empty-cart version a first-time visitor sees.

4. **An uploaded image filename contains an encoded newline** —
   `When-Insurance-Wont-Pay-Understanding%0AWater-Damage-Exclusions-…`. It resolves, and all
   five of its generated sizes are mirrored, but the filename is malformed at the source.

5. **`/sample-page/`** is the default WordPress sample page. It is live, indexable and in
   the sitemap, so it was mirrored. It should probably be deleted at the source.

---

## Rebuilding the mirror

```bash
npm install
npm run discover        # crawl the live site, rewrite routes.txt and .probe.json
npm run mirror          # browser capture of every route (add --resume to continue)
npm run assets          # backfill srcset variants, fonts, PDFs, video the browser skipped
npm run mirror:checkout # the checkout template, which needs a filled cart
npm test && npm run verify
npm run serve           # http://localhost:4400
npm run compare         # rendered diff against live (needs serve running)
```

`_raw/` holds the untouched capture of every page, before rewriting. It is gitignored — it
duplicates every page and would roughly double the repo — but it is what makes the "only two
changes" claim above checkable rather than asserted, and it is what the homepage was
restored from when the mini-cart XHR overwrote it.
