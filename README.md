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
- **[.htaccess](.htaccess)** — what production actually reads. Hostinger (LiteSpeed) ignores
  `_redirects`, so the same redirects live here too, along with the rules that keep this
  repo's documents and tooling from being served, and the bare domain's 301 to www. Change
  a redirect in both files.
- **[routes.txt](routes.txt)** — the 186 URLs that make up the site.
- **[COMMERCE.md](COMMERCE.md)** — the plan for decommissioning WordPress entirely: what the
  shop actually is (5 simple products, $13/item flat shipping, state-rate tax, Stripe), what
  replaces it, what must be exported before switch-off, and the three business questions that
  block the build.

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
                    # (and the Rocket Loader restore's cases, tools/test-rocket-loader.mjs)
npm run verify      # every route present, every reference resolves, no origin leaks
npm run linkcheck   # requests every internal link, checks every #anchor exists
npm run audit       # loads every page with real input, logs every same-origin 404
npm run compare     # rendered pixel + text + element diff against the live site
npm run compare:mobile
npm run functions   # drives the menus, carousels and accordions on both sites
npm run textdiff /some-page/   # which text lines differ on one page
npm run forms       # inventory every form: fields, required flags, which pages
npm run forms:wire  # point every form at /_forms/submit.php and generate the handler
npm run forms:wire:dry
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
npm run forms:wire        # re-wire the forms to /_forms/submit.php
```

**`npm run fix` and `npm run forms:wire` are not optional after a rebuild.** The capture
writes the live site's markup verbatim, broken links and all, so skipping `fix` silently
reverts the two link fixes and the site goes back to linking two 404s from 23 places, and
skipping `forms:wire` hands every form back to Elementor's JavaScript and to an
`admin-ajax.php` that is not there. Both are idempotent, so running them when nothing needs
fixing is free. `forms:wire` checks its own counts and stops rather than half-applying if the
capture has changed underneath it.

## Before cutover

1. **The enquiry forms are wired now, and they need a host that runs PHP.**

   This section used to say "the 23 Elementor forms submit to nothing" and that they "still
   say thank you… so a broken form looks identical to a working one". Both halves were wrong.
   The count is **31 form instances, 10 distinct forms, across 30 pages** — 23 matches neither
   figure. And submitted in a browser, a broken one did not say thank you: Elementor's handler
   only renders the success message for a JSON response with `success: true`, so the 404 from
   `admin-ajax.php` landed in the error branch and showed the visitor a red `error` with their
   typing still in the fields.

   `npm run forms:wire` fixes it, and is as not-optional after a rebuild as `npm run fix` is.
   It renames the widget hook Elementor's JavaScript binds to, gives every form
   `action="/_forms/submit.php"`, and generates that handler and the `/thank-you/` page it
   redirects to. `tools/serve.mjs` answers the same path in dev, so the whole flow can be
   submitted and watched locally without a mail server.

   **The handler is PHP.** On Netlify, Cloudflare Pages, GitHub Pages or any other pure-static
   host it is not executed and every form on the site posts into nothing. The cutover check is
   one request: a `GET` of `/_forms/submit.php` must answer **405**. If it hands back a file
   beginning `<?php`, the host is not running PHP and no form works.

2. **WooCommerce does not transact.** Cart, checkout and Stripe render but do nothing.
   [COMMERCE.md](COMMERCE.md) sets out what replaces it, and what to export from WordPress
   before the install is switched off — that part is unrecoverable.

Item 2 is covered in MIRROR.md under *What a static copy cannot do*.
