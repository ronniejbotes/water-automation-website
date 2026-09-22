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
  {
    id: 'fastbots-embed-loaded-twice',
    from: '<div id="aqvc-bot-wrap">\n    <script defer src="https://app.fastbots.ai/embed.js" data-bot-id="cmpmo1o4e00a7p01oh2nflf81"></script>\n  </div>',
    to: '<div id="aqvc-bot-wrap">\n  </div>',
    expect: 185,
    why: `
      Every page includes the FastBots chat script twice: once in <head>, and
      again inside #aqvc-bot-wrap, part of a floating video widget in the header
      template. embed.js declares top-level constants, so the second copy
      throws "Identifier 'darkLogos' has already been declared" on every page
      load and does nothing else. Seen in Chromium on the pre-change build, on
      every page checked, served and behind a simulated Rocket Loader.

      The <head> copy is the one kept, because it is the one that runs today:
      the chat launcher it builds is unchanged. The one removed sits in an
      Elementor HTML widget that is hidden at every breakpoint, and embed.js
      appends its launcher to <body> whichever copy loads it, so the wrapper
      was never where the chat appeared. The empty wrapper div stays, to keep
      the widget's markup otherwise as the site wrote it.

      185 is every captured page: all 184 routes plus 404.html. /checkout/ has
      the same duplicate but was captured from the rendered DOM (defer="") and
      is left to the shop work, which owns that page.`,
  },

  // Internal links that only reach their page through a redirect. Each one is
  // pointed straight at where the redirect lands. The redirect rules stay in
  // _redirects and .htaccess regardless: outside links and old bookmarks still
  // use the old addresses.
  {
    id: 'link-via-redirect-contact',
    from: 'href="/contact/"',
    to: 'href="/contact-us/"',
    expect: 2,
    why: `
      /contact/ is an old slug that 301s to /contact-us/ (_redirects). Linked as
      "Contact us" in the closing paragraph of
      /how-much-water-does-a-running-toilet-use/, and again in that post's
      excerpt on /blog/page/11/.`,
  },
  {
    id: 'link-via-redirect-dated-top-10-post',
    from: 'href="/2025/11/05/top-10-hidden-plumbing-lines-that-cause-water-damage-and-how-to-stop-leaks-before-they-start/"',
    to: 'href="/top-10-hidden-plumbing-lines-that-cause-water-damage-and-how-to-stop-leaks-before-they-start/"',
    expect: 3,
    why: `
      The post's old dated permalink, which 301s to its post-name URL
      (_redirects). Five links on the post itself, five in its card on
      /blog/page/4/, one in
      /how-climate-change-is-increasing-residential-water-leak-risk-in-the-us-and-what-homeowners-should-do/.`,
  },
  {
    id: 'link-via-redirect-new-buy-now-lander',
    from: 'href="/new-buy-now-lander/#learnmore"',
    to: 'href="/buy-now/"',
    expect: 2,
    why: `
      The "Learn More" button on /book-a-call/ and /buy-now-lander/ links a
      retired lander that 301s to /buy-now/ (_redirects). The fragment is
      dropped because /buy-now/ has no #learnmore, so the browser has always
      landed at the top of /buy-now/: the destination a visitor reaches is
      unchanged.

      Not changed, and worth a decision: both pages have their own
      id="learnmore" section a few lines below the button, so the button was
      probably meant to be an on-page jump (#learnmore) that kept the visitor
      on the lander. That is a behaviour change, so it is left to the client.`,
  },
  {
    id: 'link-via-redirect-products-aquahalt',
    from: 'href="/products/aquahalt"',
    to: 'href="/product/aquahalt-2x/"',
    expect: 3,
    why: `
      The old product URL scheme, which 301s to /product/aquahalt-2x/
      (_redirects). Linked from three blog posts: the climate-change post, the
      rental-property checklist (twice) and the winter plumbing post. MIRROR.md
      used to leave these alone as "a change to working links"; on 22 September
      2026 production answered /products/aquahalt with a 404, so they were not
      reliably working links.`,
  },
  {
    id: 'link-via-redirect-contact-us-no-slash',
    from: 'href="/contact-us"',
    to: 'href="/contact-us/"',
    expect: 12,
    why: `
      Written without its trailing slash, so every click costs a 301 to
      /contact-us/ (production answered it that way on 22 September 2026).
      Two links on each of the homepage, the eight city pages,
      /builder-lander/ and /habtrack-lander/, and one on /buy-now/: the "Contact
      us" calls to action on the site's main landing pages.`,
  },
  {
    id: 'link-via-redirect-buy-now-no-slash',
    from: 'href="/buy-now"',
    to: 'href="/buy-now/"',
    expect: 1,
    why: `
      Same as link-via-redirect-contact-us-no-slash: one link on /contact-us/
      that 301s to /buy-now/ for want of the slash.`,
  },
]

/*
 * Four indexable pages that name a query-string URL as their own address.
 *
 * Each row is the page's own path, the URL Yoast wrote for it instead, and how
 * many files carry that URL in the schema graph (the shop's also appears as the
 * "Shop" breadcrumb on all five product pages). Three literal fixes per row:
 * the canonical and og:url tags, then the JSON-escaped schema graph, where it
 * is followed either by a quote or by a #fragment (#article, #breadcrumb, ...).
 */
const SELF_URLS = [
  ['/shop/', '?page_id=152', 6],
  ['/how-much-water-the-toilet-uses/', '?p=3284', 1],
  ['/water-sensors-for-insurance/', '?p=3294', 1],
  ['/why-is-my-toilet-making-noise-when-not-in-use/', '?p=3296', 1],
]
const SELF_URL_WHY = `
  <link rel="canonical">, og:url and the Yoast schema graph on these pages name
  WordPress's fallback address for the post (?p=NNNN, or ?page_id=152 for the
  shop) instead of the page's own URL. A static host ignores the query string,
  so each of those addresses serves the homepage, whose own canonical is /.
  Checked on production on 22 September 2026: all four return the homepage.
  So /shop/ and three blog posts tell a crawler they are duplicates of the
  homepage, while the sitemaps submit them as pages in their own right. The
  product pages' breadcrumb points its "Shop" step at the same address.

  Each now names its own clean URL, the one the sitemaps already list, which is
  what Yoast writes for every other page on the site. The schema @id values
  change with it, consistently, so the graph still ties together.`
{
  const O = 'https://www.waterautomation.com'
  const J = String.raw`https:\/\/www.waterautomation.com`
  const json = (p) => p.replace(/\//g, '\\/')
  for (const [path, query, schemaFiles] of SELF_URLS) {
    const id = `own-url-${path.split('/').filter(Boolean).pop()}`
    FIXES.push(
      { id, from: `${O}/${query}"`, to: `${O}${path}"`, expect: 1, why: SELF_URL_WHY },
      { id: `${id}-schema`, from: `${J}\\/${query}"`, to: `${J}${json(path)}"`, expect: schemaFiles, why: SELF_URL_WHY },
      { id: `${id}-schema-fragments`, from: `${J}\\/${query}#`, to: `${J}${json(path)}#`, expect: 1, why: SELF_URL_WHY },
    )
  }
}

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
  {
    id: 'sitemap-drop-robots-blocked-pages',
    summary: 'drop /checkout/, /my-account/ and /cart/ from page-sitemap.xml, as Yoast formats it',
    files: ['page-sitemap.xml'],
    expect: { entries: 3 },
    run(xml) {
      const before = (xml.match(/<url>/g) || []).length
      let entries = 0
      // One Yoast <url> block: tab-indented, <loc> first, closed by "\t</url>\n".
      // Removing the whole block, lines and all, leaves the file exactly as
      // Yoast would have written it without that page.
      const text = xml.replace(/\t<url>\n\t\t<loc>([^<]*)<\/loc>\n[\s\S]*?\t<\/url>\n/g, (block, loc) => {
        if (!ROBOTS_BLOCKED_IN_SITEMAP.includes(loc)) return block
        entries++
        return ''
      })
      const after = (text.match(/<url>/g) || []).length
      const problems = after === before - entries ? [] : [`<url> count went from ${before} to ${after} after removing ${entries}`]
      return { text, changed: text !== xml, counts: { entries }, problems }
    },
    residue: (xml) => ROBOTS_BLOCKED_IN_SITEMAP.filter((u) => xml.includes(`<loc>${u}</loc>`)).length,
    why: `
      Yoast lists WooCommerce's cart, checkout and account pages in
      page-sitemap.xml, and robots.txt disallows all three (its "WooCommerce
      transactional pages" block). Submitting a URL and blocking it at the same
      time is a Search Console error ("Submitted URL blocked by robots.txt"),
      and none of the three is a page anyone should land on from a search.
      Each <url> block is removed whole, matched by its <loc> rather than its
      <lastmod>, so a recapture with new dates is still caught.

      Deliberately not done, and why:

      /case-studies/ is not added. It is indexable, but it is an empty category
      archive: the page reads "No articles for Case Studies found." Yoast leaves
      empty terms out of category-sitemap.xml on purpose, and adding it would
      ask Google to index an empty listing. Fill it or noindex it first.

      /sample-page/ stays in the sitemap. It is WordPress's default sample page
      ("I'm a bike messenger by day...") and should be deleted at the source,
      but removing a live page is a content decision, not a sitemap fix.`,
  },
]

// Absolute, exactly as Yoast writes <loc>.
const ROBOTS_BLOCKED_IN_SITEMAP = [
  'https://www.waterautomation.com/checkout/',
  'https://www.waterautomation.com/my-account/',
  'https://www.waterautomation.com/cart/',
]
