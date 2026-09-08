/**
 * Corrections applied to the mirror after capture.
 *
 * The mirror is generated. Anything hand-edited into a page is lost the next
 * time `npm run mirror` runs, silently, and the site quietly regresses to the
 * broken state it was captured in. So every deliberate change to the captured
 * HTML lives here instead, as data, and is re-applied by
 * `tools/apply-fixes.mjs` as the last step of a rebuild.
 *
 * Rules for anything added to this list:
 *
 *   - It fixes something that is broken on the live site. This is not the place
 *     for redesign, copy changes or SEO edits.
 *   - `expect` is the number of files the change must touch. If the real count
 *     differs, apply-fixes stops rather than half-applying — a count that has
 *     moved means the capture changed underneath the fix and it needs re-reading
 *     before it is trusted.
 *   - `why` explains the decision, not the mechanics.
 */

export const FIXES = [
  {
    id: 'products-404',
    from: 'href="/products"',
    to: 'href="/buy-now/"',
    expect: 9,
    why: `
      /products returns 404 on the live site — both with and without the trailing
      slash, verified 8 September 2026. The link wraps the "aquahalt-all" product
      family image in the hero, immediately beside a /buy-now/ call to action, and
      /buy-now/ is also where the header nav's own "Products" item points. So the
      destination is not a guess: it is the page this link was always meant to
      reach.

      This one is for crawlers, not visitors. The homepage carries three copies of
      that image — Elementor's desktop/tablet/mobile variants — and the linked copy
      is 0x0 and hidden at every breakpoint, while the copy a visitor actually sees
      (358x352 on desktop) is not wrapped in a link at all. Verified against live
      and the copy at 1440, 900 and 390 wide: identical on both. So nobody was
      clicking a broken link, but every crawl of these 9 pages followed an href to
      a 404.

      Fixed at the link rather than with a redirect. /products has never resolved,
      so nothing links to it from outside and there is no equity to preserve — a
      redirect would only add a hop to a URL that has never existed.`,
  },
  {
    id: 'partner-insurance-404',
    from: 'href="/partner/insurance"',
    to: 'href="/partner/#insurance"',
    expect: 14,
    why: `
      /partner/insurance returns 404 on the live site. The link is the "Explore
      Leak Detection Solutions" button that appears on the homepage, about-us,
      partner, q-and-a, contact-us, buy-now and the eight city landing pages.

      The header nav already links this destination correctly as /partner/#insurance,
      and that anchor exists on /partner/ (id="insurance", confirmed alongside
      #property, #plumbers and #builder). The button was simply written as a path
      where it should have been an anchor. Same target as the nav, so this is a
      correction rather than a decision.`,
  },
]
