/**
 * Deliberate content changes to the captured HTML, held as data so a rebuild
 * cannot silently undo them. Applied by tools/apply-content.mjs.
 *
 * This is the SEO/content counterpart to tools/fixes.mjs. That file is reserved
 * for repairing things that are broken on the live site; this one is for changes
 * we are choosing to make. Keeping them apart is what keeps `npm run fix:dry`
 * readable as "what was wrong with the capture".
 *
 * Every entry carries a `why`, because the reason a sentence says "five years"
 * is not recoverable from the sentence.
 *
 *   kind: 'replace'  — swap an exact string. `expect` is the total number of
 *                      replacements across all listed files; a mismatch aborts
 *                      the whole run rather than half-applying.
 *   kind: 'insert'   — place a block before/after an anchor that must appear
 *                      exactly once in the file. Wrapped in
 *                      <!-- wa:content:ID --> markers, which is how re-running
 *                      is made a no-op.
 */

// ---------------------------------------------------------------------------
// Battery life: the site has to say one thing
// ---------------------------------------------------------------------------
//
// The client confirmed the manufacturer's rating is up to 5 years on 2x AA.
// Before this, the site published at least six different aquaHALT battery
// durations across indexed pages — "over a year", "up to two years", "once a
// year", "every six months". Publishing a five-year headline while those stand
// is the inconsistency a competitor screenshots, and it also splits the answer
// an AI assistant would quote.
//
// Scope note: two other duration claims on the site are deliberately NOT changed,
// because they are not claims about aquaHALT at all —
//   /why-i-installed-water-leak-detectors-in-my-home-and-why-you-should-too/
//     "Battery life of at least 1 year" describes what the author wanted from a
//     Wi-Fi smart-home sensor they bought, not from an aquaHALT.
//   /smart-leak-sensors-always-on-always-watching/
//     "many models last over 3 years on a single battery" is about the category.
// Rewriting either would misrepresent the author, not fix a contradiction.
//
// Also unchanged, and needing a client decision rather than an edit: the device
// SERVICE life is published as 10 years on /buy-now/ and 15 years in five blog
// posts. That contradiction is real but it is not a battery figure, and guessing
// which is right would just move the error.

const BATTERY = [
  {
    id: 'battery-partner',
    kind: 'replace',
    files: ['partner/index.html'],
    from: 'it delivers up to two years of maintenance-free protection',
    to: 'it delivers up to five years of maintenance-free protection',
    expect: 1,
    why: `The hardest of the wrong numbers, because /partner/ sells to builders and
      property managers who buy in volume and who compare maintenance cost per unit
      over a building. Doubling-and-a-half the true interval understates the actual
      selling point.`,
  },
  {
    id: 'battery-rental-checklist',
    kind: 'replace',
    files: [
      'rental-property-owners-the-complete-water-leak-prevention-checklist-before-you-turn-over-a-unit/index.html',
    ],
    from: 'Uses AA batteries that last over a year',
    to: 'Uses 2 AA batteries that last up to five years',
    expect: 1,
    why: `Aimed at landlords, in a list whose whole argument is "set-and-forget".
      A one-year battery is not set-and-forget; a five-year one outlasts most
      tenancies, which is the point the paragraph was trying to make.`,
  },
  {
    id: 'battery-silent-destroyers',
    kind: 'replace',
    files: [
      'the-silent-destroyers-how-hidden-leaks-ruin-homes-and-wallets/index.html',
      'blog/page/4/index.html',
    ],
    from: 'Low Maintenance: Runs up to two years on AA batteries.',
    to: 'Low Maintenance: Runs up to five years on 2 AA batteries.',
    expect: 2,
    why: `The post body and the paginated blog archive both carry this list, so the
      string appears twice across two files and both must move together — fixing
      only the post would leave the old figure indexed on /blog/page/4/.`,
  },
  {
    id: 'battery-smart-vs-dumb',
    kind: 'replace',
    files: ['smart-leaks-vs-dumb-leaks-why-traditional-alarms-arent-enough-anymore/index.html'],
    from: 'AA batteries (over one year of use)',
    to: 'AA batteries (up to five years of use)',
    expect: 1,
    why: `Sits under a "Set-and-Forget Reliability" heading, so the number directly
      contradicts the claim it is offered as evidence for.`,
  },
  {
    id: 'battery-ice-makers-cadence',
    kind: 'replace',
    files: [
      'from-ice-makers-to-sinks-my-diy-water-defense-plan-with-aquahalt/index.html',
      'blog/page/6/index.html',
    ],
    from: 'Replace batteries once a year without waiting for them to die.',
    to: 'Change the batteries when the panel drops to two blinking LEDs, rather than waiting for them to die.',
    expect: 2,
    why: `An annual replacement habit implies an annual battery. Rewriting it to the
      device's own low-battery indicator keeps the author's point — do not wait for
      failure — while making it consistent with a five-year cell, and it is more
      accurate besides: the manual's two-blink state is exactly the "replace soon,
      still working" signal this sentence is reaching for.`,
  },
  {
    id: 'battery-six-months-cadence',
    kind: 'replace',
    files: [
      'i-was-one-forgotten-leak-away-from-disaster-how-aquahalt-saved-the-day/index.html',
      'blog/page/6/index.html',
    ],
    from: 'Every six months, I swap the AA batteries.',
    to: 'I change the AA batteries when the panel drops to two blinking LEDs.',
    expect: 2,
    why: `Same reasoning as the annual cadence above, and the shortest interval on the
      site — a six-month habit reads as a six-month battery. Both the post and
      /blog/page/6/ carry it, and /blog/page/6/ also carries the ice-maker list, so
      that one file takes two separate corrections.`,
  },
]

// ---------------------------------------------------------------------------
// Product page metadata
// ---------------------------------------------------------------------------

const META = [
  {
    id: 'meta-2x-wrong-product',
    kind: 'replace',
    files: ['product/aquahalt-2x/index.html'],
    from:
      '<meta name="description" content="Discover the aquaHALT Flip for toilets—easy to install, compact, and reliable water protection that attaches directly to your fill valve for seamless use." />',
    to:
      '<meta name="description" content="aquaHALT 2X shuts off the toilet water supply the moment a leak is detected. Two 3/8-inch hoses, 2 AA batteries lasting up to 5 years, no plumber." />',
    expect: 1,
    why: `The 2X page's meta description described the Flip — a different product, with
      a different mounting method — so the snippet Google shows for the 2X advertised
      the wrong item and set the wrong expectation before the click. Copy-paste error
      on the live site, not something the capture introduced.

      Note for whoever reads this next: every product page carries TWO
      <meta name="description"> tags, Yoast's and WooCommerce's short description.
      Google reads the first. That duplication is a separate, structural problem and
      is deliberately not fixed here — removing the second tag means editing the
      WooCommerce template, which is a decision for the commerce migration, not a
      copy change.`,
  },
]

// ---------------------------------------------------------------------------
// Product specifications
// ---------------------------------------------------------------------------
//
// The five product pages carried a title, one short paragraph, a price and an
// add-to-cart button — and nothing else. No specification anywhere, including
// the battery life, which is the product's strongest differentiator and the
// thing buyers in this category ask about first.
//
// Each block is a question-phrased <h2>, a self-contained answer paragraph, and
// a real <table> (thead / tbody / th scope="row") inside an overflow-x container
// so it does not break the mobile layout. Semantic table markup matters here
// beyond tidiness: a spec grid built from <div>s renders identically and
// extracts as nothing, and extraction is the point.
//
// Every row is traceable to one of the three PDF manuals or to the product
// page's own copy. Specs that no source publishes — dimensions, flow rate,
// pressure rating, operating temperature, warranty term, battery chemistry, and
// which position the valve holds when the cells are flat — are deliberately
// absent rather than guessed. Those are a client question, and the fail-state
// one is worth asking first because it is the objection that loses the sale.
//
// The aquaHALT H/C block is visibly shorter than the other four. That is not an
// oversight: there is no H/C manual. The site's nav links a 2X manual, a Flip
// manual and an ICE manual, and the H/C — the most expensive product in the
// range, and currently out of stock — has none to cite.

const SPEC_ANCHOR =
  '<div class="elementor-element elementor-element-aa1a5a4 e-flex e-con-boxed e-con e-parent"'

const specBlock = (slug, why) => ({
  id: `specs-${slug}`,
  kind: 'insert',
  files: [`product/${slug}/index.html`],
  anchor: SPEC_ANCHOR,
  position: 'before',
  htmlFile: `content/specs-${slug}.html`,
  why,
})

const SPECS = [
  specBlock(
    'aquahalt-2x',
    `Best-selling product and the page with the most to gain: it had no battery
     statement of any kind, so a buyer comparing it against a Wi-Fi sensor had
     nothing to compare on. Sourced from 2X-Manual.pdf.`
  ),
  specBlock(
    'aquahalt-flip',
    `Sourced from FLIP-Manual.pdf, which is genuinely the Flip manual — it shows a
     different device from the 2X, mounts to the toilet tank fill valve rather
     than the wall, and removes the supply hose completely. Worth recording
     because an automated review of this build claimed the file was a duplicate
     of the 2X manual and that these steps were invented; it is not, and they
     are not. The two PDFs differ in size, checksum, illustrations and procedure.`
  ),
  specBlock(
    'aquahalt-for-a-sink',
    `Shorter than its siblings because no H/C manual exists to cite. Everything
     here comes from the product page's own copy. The page's job while the
     product is out of stock is to hold the buyer, so it says what is known and
     does not invent the rest.`
  ),
  specBlock(
    'aquahalt-for-ice-makers',
    `Sourced from ICE-Manual.pdf. Note the ICE and Flip manuals (2025) omit the
     8-hour low-power shutdown and the 2-minute alert timeout that the 2X manual
     (2020) prints, so those rows are stated only where a manual backs them.`
  ),
  specBlock(
    'aquahalt-replacement-censor',
    `The one product with no battery of its own — it is a passive probe on a
     cable. Saying so explicitly matters because the page's own copy calls it
     part of "the only battery-operated ... water detection system", which reads
     as though the sensor itself needs cells.`
  ),
]

// ---------------------------------------------------------------------------
// Floating overlays
// ---------------------------------------------------------------------------

const OVERLAYS = [
  {
    id: 'overlay-hygiene',
    kind: 'insert',
    allHtml: true,
    anchor: '</head>',
    position: 'before',
    htmlFile: 'content/overlay-hygiene.html',
    why: `
      Four things pin themselves to the viewport on every page and none of them
      knows about the others: an Elementor fixed widget holding an autoplaying
      greeter video on an 8-second delay, the FastBots greeting bubble, the
      FastBots launcher, and the cart pill. Between them they carry no media
      query at all, so on a 390px screen three of them stack down the left edge
      and cover the hero's proof paragraph — the one naming Chubb, the patent and
      the TIME listing. That is the overlap the client reported.

      The chat widget is third-party and injects at z-index 2147483647, so it can
      only be constrained from outside with !important. Everything is scoped to a
      breakpoint: below 768px the auto-opening bubble and the video greeter are
      suppressed and the launcher is shrunk into the corner; at 768px and above
      the bottom-left chat pattern is left working and merely tidied, because
      there it is normal and unobtrusive.

      Two judgement calls worth surfacing to the client, both reversible in this
      one file: hiding the greeter video on phones removes a marketing asset on
      the device where most traffic is, and suppressing the auto-greeting will
      reduce chat volume. Both were traded for not covering the copy that does
      the selling.

      Injected before </head> on every page rather than into a stylesheet,
      because the mirror's CSS files are captured artefacts and a rebuild would
      overwrite an edit to them without warning.`,
  },
]

// ---------------------------------------------------------------------------
// Brand name: one spelling
// ---------------------------------------------------------------------------
//
// Raised by the client: the company name is written inconsistently, "water"
// lowercase against "AUTOMATION" uppercase, and differently again on other
// pages. Measured across the mirror, it is worse than it looks from the page:
//
//   Organization + WebSite schema "name"   waterAUTOMATION    366x, all 183 pages
//   og:site_name                           Water Automation   183x, all 183 pages
//   <title>                                Water Automation    59 of 65
//   visible body copy                      Water Automation    68 of 73
//
// So every page tells Google the organisation is called "waterAUTOMATION" while
// telling Facebook and LinkedIn it is called "Water Automation". Those are the
// two machine-readable brand fields on the page and they disagree sitewide. The
// schema name is the one that feeds a knowledge panel, and it is the minority
// spelling.
//
// Normalised to "Water Automation" because that is already the dominant form on
// every surface a human or a crawler reads: all 183 og:site_name tags, 59 of 65
// titles, 68 of 73 visible mentions. It also reads correctly in a sentence,
// which "waterAUTOMATION" does not.
//
// The LOGO is untouched. A stylised lockup that differs from the written name is
// normal branding, not an inconsistency — this is about the text.
//
// If the client would rather standardise on the stylised form, it is these four
// blocks and nothing else.
//
// Deliberately NOT touched: https://www.facebook.com/WaterAutomationNow, which
// appears 170 times across 169 pages. A blanket replace of "WaterAutomation"
// would break that link on every page, which is why each replacement below is
// anchored to the exact surface it corrects rather than matching the bare word.

const BRAND = [
  {
    id: 'brand-schema-name',
    kind: 'replace',
    allHtml: true,
    from: '"name":"waterAUTOMATION"',
    to: '"name":"Water Automation"',
    expect: 366,
    why: `The Organization and WebSite schema names. This is what structured-data
      consumers — Google's knowledge panel among them — read as the name of the
      business, and it disagreed with og:site_name on all 183 pages.`,
  },
  {
    id: 'brand-visible-spaced',
    kind: 'replace',
    allHtml: true,
    from: 'water AUTOMATION',
    to: 'Water Automation',
    expect: 46,
    why: `The spelling the client actually pointed at. 46 occurrences across 12
      pages, in body copy, an H2, a marketing-consent checkbox on /expo-signup/
      and several meta descriptions. Safe as a plain string replace because this
      spaced form never appears inside a URL.`,
  },
  {
    id: 'brand-nospace',
    kind: 'replace',
    allHtml: true,
    from: 'waterAUTOMATION',
    to: 'Water Automation',
    expect: 258,
    why: `The run-together form, which the spaced replacement above does not catch.
      258 occurrences across 186 pages: the Organization logo caption in the schema
      on every page, plus body copy and calls to action across the blog — "Contact
      waterAUTOMATION", "Request a demo from waterAUTOMATION", "aquaHALT by
      waterAUTOMATION".

      Safe as a plain global replace, checked rather than assumed: this exact
      casing never appears inside an href, a src or any URL. The site's own links
      use lowercase waterautomation.com, and the Facebook profile is
      WaterAutomationNow — a different string that this does not touch.`,
  },
  {
    id: 'brand-title-contact',
    kind: 'replace',
    files: ['contact-us/index.html'],
    from: '<title>Contact waterAUTOMATION | Contact Us</title>',
    to: '<title>Contact Water Automation | Contact Us</title>',
    expect: 1,
    why: `A title tag, so this is the brand as it appears in the search result.`,
  },
  {
    id: 'brand-title-suffixes',
    kind: 'replace',
    files: ['detection-is-protection/index.html'],
    from: ' | waterAUTOMATION</title>',
    to: ' | Water Automation</title>',
    expect: 1,
    why: `Title suffix on /detection-is-protection/.`,
  },
  {
    id: 'brand-title-dotcom',
    kind: 'replace',
    files: ['habtrack-lander/index.html'],
    from: ' | WaterAutomation.com</title>',
    to: ' | Water Automation</title>',
    expect: 1,
    why: `/habtrack-lander/ used the domain as the brand in its title. The brand is
      the company name; the domain is an address.`,
  },
  {
    id: 'brand-title-nospace',
    kind: 'replace',
    files: ['when-insurance-wont-pay-understandingwater-damage-exclusions-and-howprevention-covers-the-gaps/index.html'],
    from: ' | WaterAutomation</title>',
    to: ' | Water Automation</title>',
    expect: 1,
    why: `Title suffix on the insurance-exclusions post.`,
  },
]

// ---------------------------------------------------------------------------
// Images: stop the jumping, the pop-in and the stretch
// ---------------------------------------------------------------------------
//
// The client's words were "image stretching", "stretched imagery, awkward
// positioning", and that the site "looked unfinished". Measured with
// tools/image-audit.mjs across all 183 pages, three separate faults account for
// most of that impression, and all three are in markup rather than in the
// pictures themselves.
//
// 1. The header logo and the TIME badge both carry loading="lazy" while sitting
//    ABOVE THE FOLD. A lazily-loaded header is a header that arrives late and
//    pops in, on every page, on every visit.
// 2. Neither carries width/height, and neither has a CSS aspect-ratio, so the
//    browser cannot reserve space for them. The header reflows as they load.
//    That is the jumping-about, and it is the single most common cause of a site
//    feeling unfinished. 1,151 instances of this across 181 pages, and these two
//    images are 1,086 of them.
// 3. Their alt text is the filename — "water-automation-logo-final" and
//    "2023_-_Best_Inventions_Seal_-_RGB_-_REV". A screen reader announces that
//    verbatim, and it is the brand name rendered as a file on disk.
//
// The width/height values are the files' true intrinsic dimensions, so they give
// the browser the correct aspect ratio to reserve. CSS still governs the painted
// size — these attributes change nothing about how large either image appears.

const IMAGES = [
  {
    id: 'img-header-logo',
    kind: 'replace',
    allHtml: true,
    from:
      '<img src="/wp-content/uploads/2025/02/water-automation-logo-final.png" title="water-automation-logo-final" alt="water-automation-logo-final" loading="lazy" />',
    to:
      '<img src="/wp-content/uploads/2025/02/water-automation-logo-final.png" title="Water Automation" alt="Water Automation" width="3349" height="1100" fetchpriority="high" decoding="async" />',
    expect: 370,
    why: `The header logo, on 185 pages. Was lazy-loaded despite being the first
      thing on the page, had no dimensions so the header reflowed around it, and
      announced itself to a screen reader as "water-automation-logo-final".`,
  },
  {
    id: 'img-time-badge',
    kind: 'replace',
    allHtml: true,
    from:
      '<img src="/wp-content/uploads/2025/01/2023_-_Best_Inventions_Seal_-_RGB_-_REV.png" title="2023_-_Best_Inventions_Seal_-_RGB_-_REV" alt="2023_-_Best_Inventions_Seal_-_RGB_-_REV" loading="lazy" />',
    to:
      '<img src="/wp-content/uploads/2025/01/2023_-_Best_Inventions_Seal_-_RGB_-_REV.png" title="TIME Best Inventions 2023" alt="TIME Best Inventions 2023 award seal" width="1820" height="2560" decoding="async" />',
    expect: 370,
    why: `The TIME Best Inventions seal in the header, on 185 pages. This is the
      strongest verifiable credential the business has, and its alt text was a
      filename — so to a screen reader, and to anything reading alt text as a
      signal, the award was invisible.`,
  },
]

// /checkout/ is captured by tools/capture-checkout.mjs, which serialises a live
// DOM rather than saving the raw response — the page only renders with a filled
// cart. A serialised DOM writes void elements without the trailing slash, so the
// same two <img> tags appear there in a form the blocks above do not match.
// Same fix, different spelling of the same markup.
const CHECKOUT_IMAGES = [
  {
    id: 'img-header-logo-checkout',
    kind: 'replace',
    files: ['checkout/index.html'],
    from:
      '<img src="/wp-content/uploads/2025/02/water-automation-logo-final.png" title="water-automation-logo-final" alt="water-automation-logo-final" loading="lazy">',
    to:
      '<img src="/wp-content/uploads/2025/02/water-automation-logo-final.png" title="Water Automation" alt="Water Automation" width="3349" height="1100" fetchpriority="high" decoding="async">',
    expect: 3,
    why: `The checkout page's copy of the header logo. Worth having right: this is
      the page where a buyer is entering card details, and a header that arrives
      late or shifts the layout is exactly where hesitation costs an order.`,
  },
  {
    id: 'img-time-badge-checkout',
    kind: 'replace',
    files: ['checkout/index.html'],
    from:
      '<img src="/wp-content/uploads/2025/01/2023_-_Best_Inventions_Seal_-_RGB_-_REV.png" title="2023_-_Best_Inventions_Seal_-_RGB_-_REV" alt="2023_-_Best_Inventions_Seal_-_RGB_-_REV" loading="lazy">',
    to:
      '<img src="/wp-content/uploads/2025/01/2023_-_Best_Inventions_Seal_-_RGB_-_REV.png" title="TIME Best Inventions 2023" alt="TIME Best Inventions 2023 award seal" width="1820" height="2560" decoding="async">',
    expect: 4,
    why: `The same seal on the checkout page — the one page where a trust signal
      most needs to render immediately and be described properly.`,
  },
]


// ---------------------------------------------------------------------------
// The competitor comparison table
// ---------------------------------------------------------------------------
//
// This table appears on the homepage and all eight city pages, under the heading
// "Why Property Professionals Choose aquaHALT Over Flo by Moen & Phyn". It is
// comparative advertising naming two competitors, so it has to be right rather
// than merely favourable.
//
// The icons contradicted the text in their own cells. The table's own colour
// classes are unambiguous — .aqt-gy is green (#1F6B2A) and .aqt-rn is red
// (#A32D2D) — and the text used them correctly throughout: aquaHALT green,
// competitors red. But on two rows the SVG icon was the other way round, so a
// reader skimming icons rather than reading cells got the opposite answer.
//
// Fixed here. The false "Source Shutdown" row is a separate change, because
// correcting it needs sourced copy rather than an icon swap.

const TABLE_ICONS = [
  {
    id: 'table-icons-installation',
    kind: 'replace',
    allHtml: true,
    from:
      "<tr>\r\n        <td class=\"aqt-td-f\">Professional installation needed</td>\r\n        <td class=\"aqt-td-a\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#A32D2D\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"/><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"/></svg>\r\n          <span class=\"aqt-gy\">No — 10 min DIY</span>\r\n        </td>\r\n        <td class=\"aqt-td-c\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F6B2A\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M22 11.08V12a10 10 0 1 1-5.93-9.14\"/><polyline points=\"22 4 12 14.01 9 11.01\"/></svg>\r\n          <span class=\"aqt-rn\">Yes — licensed plumber</span>\r\n        </td>\r\n        <td class=\"aqt-td-c\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F6B2A\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M22 11.08V12a10 10 0 1 1-5.93-9.14\"/><polyline points=\"22 4 12 14.01 9 11.01\"/></svg>\r\n          <span class=\"aqt-rn\">Yes — licensed plumber</span>\r\n        </td>\r\n      </tr>",
    to:
      "<tr>\r\n        <td class=\"aqt-td-f\">Professional installation needed</td>\r\n        <td class=\"aqt-td-a\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F6B2A\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M22 11.08V12a10 10 0 1 1-5.93-9.14\"/><polyline points=\"22 4 12 14.01 9 11.01\"/></svg>\r\n          <span class=\"aqt-gy\">No — 10 min DIY</span>\r\n        </td>\r\n        <td class=\"aqt-td-c\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#A32D2D\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"/><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"/></svg>\r\n          <span class=\"aqt-rn\">Yes — licensed plumber</span>\r\n        </td>\r\n        <td class=\"aqt-td-c\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#A32D2D\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"/><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"/></svg>\r\n          <span class=\"aqt-rn\">Yes — licensed plumber</span>\r\n        </td>\r\n      </tr>",
    expect: 9,
    why: `The icon contradicted its own cell. aquaHALT's "No — 10 min DIY" carried a RED
      CROSS while both competitors' "Yes — licensed plumber" carried a GREEN TICK, so
      anyone skimming the icons read the table backwards — and the text colours in the
      same cells already said the opposite (.aqt-gy is green, .aqt-rn is red). The icon
      now follows whether the cell is good for the reader, not whether the word is
      "yes" or "no".`,
  },
  {
    id: 'table-icons-wifi',
    kind: 'replace',
    allHtml: true,
    from:
      "<tr>\r\n        <td class=\"aqt-td-f\">Wi-Fi / app required</td>\r\n        <td class=\"aqt-td-a\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#A32D2D\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"/><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"/></svg>\r\n          <span class=\"aqt-gy\">No — fully standalone</span>\r\n        </td>\r\n        <td class=\"aqt-td-c\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F6B2A\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M22 11.08V12a10 10 0 1 1-5.93-9.14\"/><polyline points=\"22 4 12 14.01 9 11.01\"/></svg>\r\n          <span class=\"aqt-rn\">Yes — app dependent</span>\r\n        </td>\r\n        <td class=\"aqt-td-c\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F6B2A\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M22 11.08V12a10 10 0 1 1-5.93-9.14\"/><polyline points=\"22 4 12 14.01 9 11.01\"/></svg>\r\n          <span class=\"aqt-rn\">Yes — 30-day setup</span>\r\n        </td>\r\n      </tr>",
    to:
      "<tr>\r\n        <td class=\"aqt-td-f\">Wi-Fi / app required</td>\r\n        <td class=\"aqt-td-a\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#1F6B2A\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M22 11.08V12a10 10 0 1 1-5.93-9.14\"/><polyline points=\"22 4 12 14.01 9 11.01\"/></svg>\r\n          <span class=\"aqt-gy\">No — fully standalone</span>\r\n        </td>\r\n        <td class=\"aqt-td-c\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#A32D2D\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"/><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"/></svg>\r\n          <span class=\"aqt-rn\">Yes — app dependent</span>\r\n        </td>\r\n        <td class=\"aqt-td-c\">\r\n          <svg class=\"aqt-icon\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#A32D2D\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"/><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"/></svg>\r\n          <span class=\"aqt-rn\">Yes — 30-day setup</span>\r\n        </td>\r\n      </tr>",
    expect: 9,
    why: `Same inversion on the Wi-Fi row: "No — fully standalone" carried a red cross
      and "Yes — app dependent" a green tick. Not needing an app is the selling
      point, so it gets the tick. The Phyn cell's "30-day setup" text is a separate
      problem — it is a figure Phyn does not publish — and is handled elsewhere.`,
  },
]


// ---------------------------------------------------------------------------
// The comparison table on a phone
// ---------------------------------------------------------------------------

const TABLE_MOBILE = [
  {
    id: 'comparison-table-mobile',
    kind: 'insert',
    files: [
      'index.html',
      'water-leak-protection-boston/index.html',
      'water-leak-protection-chicago/index.html',
      'water-leak-protection-dallas/index.html',
      'water-leak-protection-fort-lauderdale/index.html',
      'water-leak-protection-houston/index.html',
      'water-leak-protection-miami/index.html',
      'water-leak-protection-new-york/index.html',
      'water-leak-protection-washington-dc/index.html',
    ],
    anchor: '</head>',
    position: 'before',
    htmlFile: 'content/comparison-table-mobile.html',
    why: `The page hides the table's Feature column below 680px to fit four columns
      onto a phone, which removes the labels — so eleven rows read as answers with
      no questions — and it still does not fit, leaving the third column clipped
      mid-word so "Yes - 30-day setup" renders as "Yes - 3 / day setup" and
      misstates a competitor's figure.

      Restacked into one card per feature instead: label as the heading, each
      product a labelled line inside. Scoped to the nine pages that carry the
      table rather than injected sitewide.`,
  },
]

export const CONTENT = [...BATTERY, ...META, ...SPECS, ...OVERLAYS, ...BRAND, ...IMAGES, ...CHECKOUT_IMAGES, ...TABLE_ICONS, ...TABLE_MOBILE]
