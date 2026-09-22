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
 *
 * FIXES are literal find-and-replace pairs. TRANSFORMS, at the bottom, are for
 * the corrections a literal pair cannot express, because the text differs on
 * every page (Rocket Loader's per-page hash) or the file is not HTML. They run
 * first, so FIXES are written against the page as it stands after them. Each
 * one checks itself: it reports what it could not understand instead of
 * guessing, and it names what must be gone afterwards (`residue`), which has to
 * come out at zero.
 */
import { undoRocketLoader, rocketLoaderResidue } from './rocket-loader.mjs'

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
  {
    id: 'case-studies-tel-typed-as-email',
    from: '<div class="elementor-field-type-email elementor-field-group elementor-column elementor-field-group-tel elementor-col-100 elementor-field-required">',
    to: '<div class="elementor-field-type-tel elementor-field-group elementor-column elementor-field-group-tel elementor-col-100 elementor-field-required">',
    expect: 1,
    why: `
      The phone field on /case-studies/ is typed as an email field, and it is
      required. So a visitor who types a phone number into the box labelled
      "Tel", with the placeholder "+1 999 999 9999", is refused by their own
      browser with "Please include an '@' in the email address". The only way to
      submit that form is to put an email address into the phone box. This is
      the one form of the ten that cannot be completed honestly.

      It is a mis-set field in the Elementor form on the live site, not a
      decision anyone made: the field is named tel, its group class is
      elementor-field-group-tel, its label is "Tel" and its placeholder is a US
      phone number. Only the type says email. The other nine forms all type the
      same field tel.

      Reproduced in a browser on both the pre-change build and this one, before
      and after the forms were wired, so it is inherited and not something the
      form work introduced: identical refusal, identical message, zero POSTs
      either way.

      This half of the fix is the wrapper class, which exists so Elementor's
      per-widget CSS can target the field. Layout-neutral, checked rather than
      assumed: post-1324.css puts .elementor-field-type-text,
      .elementor-field-type-email and .elementor-field-type-tel in one rule for
      this widget with the same two declarations, so both class names resolve to
      the same grid-column and margin.`,
  },
  {
    id: 'case-studies-tel-input-type',
    from: '<input size="1" type="email" name="form_fields[tel]" id="form-field-tel" class="elementor-field elementor-size-md  elementor-field-textual" placeholder="+1 999 999 9999" required="required">',
    to: '<input size="1" type="tel" name="form_fields[tel]" id="form-field-tel" class="elementor-field elementor-size-md  elementor-field-textual" placeholder="+1 999 999 9999" required="required" pattern="[0-9()#&amp;+*-=.]+" title="Only numbers and phone characters (#, -, *, etc) are accepted.">',
    expect: 1,
    why: `
      The other half of case-studies-tel-typed-as-email: the input itself.

      type="tel" rather than type="email", so the browser stops demanding an @
      in a phone number and a phone keypad comes up on a mobile. The pattern and
      title are not invented — they are copied character for character from the
      tel field on the other nine forms in this build, so this field now
      validates exactly as every other phone field on the site does.

      The field stays required, because it is required on the live site and
      nobody here decided otherwise. What changes is that it can now be
      satisfied.`,
  },
]

export const TRANSFORMS = [
  {
    id: 'cloudflare-rocket-loader-output',
    summary: 'restore every script to what the origin sent, and drop the baked-in Rocket Loader',
    run(html) {
      const r = undoRocketLoader(html)
      return {
        text: r.html,
        changed: r.changed,
        counts: { loaders: r.loaders, scripts: r.typeRemoved + r.typeRestored, handlers: r.handlers },
        problems: r.problems,
      }
    },
    residue: rocketLoaderResidue,
    why: `
      Every page was captured through Cloudflare with Rocket Loader on, so each
      one carries Rocket Loader's output rather than the origin's markup: its
      scripts retyped to "<hash>-text/javascript" and its loader tag before
      </body>. www is still served through Cloudflare with Rocket Loader on, so
      the edge adds a second loader over the first. Seen on production on 22
      September 2026: two rocket-loader.min.js tags on www, one on the unproxied
      apex. With two loaders the page's ready events fire early and twice and
      Elementor Pro never starts on any www page: the hamburger does nothing,
      the Products and Partner dropdowns do not open, the header is not sticky
      and the carousels, hotspots and menu cart are dead.

      Restoring the origin markup makes the pages correct either way. With
      Rocket Loader off they run natively. With it on, the edge does one pass,
      which is how the old WordPress site ran. Full reasoning, including how an
      appended type is told apart from a rewritten one, is in
      tools/rocket-loader.mjs.

      No page count is pinned here, unlike the literal FIXES. Nothing about this
      correction goes stale when a page is added or removed; what would make it
      unsafe is a page in a shape it does not understand, and that is checked on
      every page instead: each retyped script must be restored, the hash on the
      scripts must be the one the loader tag declares, and nothing of Rocket
      Loader may be left, the hash included.`,
  },
]
