# water-automation-website

A complete static HTML copy of **https://www.waterautomation.com/**, captured
8 September 2026 from the live WordPress + Elementor + WooCommerce site.

The point of the copy is control. The same pages, at the same URLs, as plain HTML we own —
so titles, headings, internal linking, schema and page structure can be changed in minutes
instead of fought through a page builder, and so nothing we do for SEO is limited by what a
plugin will let us edit.

**Nothing has been redesigned or rewritten.** The capture is faithful, broken links
included. Two link fixes were then applied deliberately on top of it — `/products` and
`/partner/insurance`, both of which 404 on the live site — and they live in
`tools/fixes.mjs` rather than being typed into the pages, so a rebuild cannot lose them.
Everything else is exactly as captured.

## Start here

- **[MIRROR.md](MIRROR.md)** — what was captured, everything that was changed and why, how
  it was verified, what the new host needs configuring, and the honest list of what a static
  copy cannot do.
- **[_redirects](_redirects)** — the four redirects the live site already answers. Nothing
  here is new; they are carried across so the URLs that work today keep working.
- **[routes.txt](routes.txt)** — the 186 URLs that make up the site.
- **[COMMERCE.md](COMMERCE.md)** — what the shop actually is (5 simple products, $13/item
  flat shipping, state-rate tax, Stripe) and how orders keep working after the move. Short
  version: the shop is 6 URLs out of 186, so it does not have to move at all.

## Working on it

```bash
npm install
npm run serve     # http://localhost:4400 — serves this repo the way production will
```

`tools/serve.mjs` does what a static host does: directory indexes, `404.html` with a real
404 status, byte ranges for the videos, and a replay of `_redirects`. If it works there, it
works on Netlify, Cloudflare Pages, Vercel, GitHub Pages, Apache or nginx.

## Checking it

```bash
npm test            # the extractor's edge cases — 17 shapes this site's markup actually uses
npm run verify      # every route present, every reference resolves, no origin leaks
npm run linkcheck   # requests every internal link, checks every #anchor exists
npm run audit       # loads every page with real input, logs every same-origin 404
npm run compare     # rendered pixel + text + element diff against the live site
npm run compare:mobile
npm run functions   # drives the menus, carousels and accordions on both sites
npm run textdiff /some-page/   # which text lines differ on one page
```

`compare`, `functions` and `textdiff` need `npm run serve` running in another terminal. All
three open the live site and the copy side by side in a real browser and scroll them,
because the failure worth catching — one missing script leaving every widget inert —
screenshots perfectly at the top of the page.

As captured: **137 of 181 pages are pixel-identical to live**, 171 are within 1%, and page
height and `<title>` match on all 181. Broken images, and requests that fail on the copy but
not on live, are both zero. The pages that differ by more than 1% compare at 0% when re-run
on their own — the site rotates carousels and reveals sections on scroll, so a single sample
is not evidence. **Run any comparison twice before acting on it.**

`npm run audit` is the check to trust most, because it needs no list of what to look for: it
loads every page and records anything that 404s. It is what would have caught the reviews
widget, whose stylesheet was named in an attribute the extractor did not know about. Full
numbers, and the two ways that failure hid from every other check, are in
[MIRROR.md](MIRROR.md#verification).

## Rebuilding from live

```bash
npm run discover          # crawl live, rewrite routes.txt
npm run mirror            # browser capture (--resume continues an interrupted run)
npm run assets            # backfill what a browser never requests: srcset variants,
                          # font weights, PDFs, video
npm run mirror:checkout   # the checkout template, which only renders with a filled cart
npm run fix               # re-apply the link corrections in tools/fixes.mjs
```

**`npm run fix` is not optional after a rebuild.** The capture writes the live site's markup
verbatim, broken links and all, so skipping it silently reverts the two link fixes and the
site goes back to linking two 404s from 23 places. It is idempotent, so running it when
nothing needs fixing is free.

## Before cutover

Two things must be wired up or the site loses money quietly:

1. **The 23 Elementor forms submit to nothing.** They still say "thank you" — that part is
   client-side — so a broken form looks identical to a working one. Every lead-capture page
   is affected.
2. **WooCommerce does not transact.** Cart, checkout and Stripe render but do nothing.
   [COMMERCE.md](COMMERCE.md) sets out the options; the recommended one keeps WooCommerce
   serving the 6 shop URLs and changes nothing about how orders are taken.

Both are covered in MIRROR.md under *What a static copy cannot do*.
