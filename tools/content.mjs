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

export const CONTENT = [...BATTERY, ...META, ...SPECS]
