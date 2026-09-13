# Water Automation — business and audience brief

**Read this first, before you write a single line for this account.** Everything below was verified against the actual files. Last updated 13 September 2026.

---

## Provenance, and a correction to how this brief was built

All site facts here come from the static mirror of `waterautomation.com` in this repo. **Two things about that mirror matter, and an earlier version of this brief got one of them wrong.**

**1. The working tree has been edited since capture. Use `_raw/` for anything about the live site.** The repo contains a pristine capture at `_raw/` (182 HTML files, taken 8 September 2026) and a working copy at the repo root (183 files — the same 182 plus `404.html`). I compared them byte-for-byte on 13 September 2026: **all 182 pages differ.** Most of the difference is the reviews-widget fix in commit `42164b0`, but some is content: the five `/product/` pages have been rewritten, and several battery-life figures have already been corrected to "up to 5 years" in the working copy while `_raw/` still carries the originals. **Every count in this brief was re-run against `_raw/` on 13 September 2026.** Anything you measure against the repo root is measuring our own edits, not the client's site.

**2. Product-mechanism facts come from the three PDF manuals read as rendered images, not as extracted text.** `pdftotext` returns a **stale 2020 text layer** underneath the vector-outlined visible text of the 2025 FLIP and ICE manuals. An earlier version of this brief, and two of the three original post concepts, were built on that stale layer and stated things the printed manuals do not say. The manuals were re-read on 13 September 2026 as PNGs rendered with `pdftoppm -png -r 150` from `wp-content/uploads/2025/11/`. **Do not use `pdftotext` on these files.**

**The live site was not opened.** Anything on it could have changed since 8 September 2026. Re-check before publishing anything that depends on a page still saying what it said.

---

## What the business actually sells

waterAUTOMATION (the company) sells **aquaHALT** (the product): a battery-powered inline shut-off valve that fits on the flexible supply hose feeding **one** plumbing fixture.

### The mechanism — and where the three manuals stop agreeing

**Confirmed in all three manuals** (rendered pages, 13 Sep 2026):

- The valve body goes **inline between the wall supply stop and the fixture**, using 3/8" compression fittings (1/4" on the ICE model).
- A **wired sensor on a lead** plugs into a port on the bottom of the device and sticks to the floor. All three manuals: *"It is imperative that the sensor touches the flooring in order to detect water for proper operation."*
- Sensor placement is a documented risk. All three: *"Sensor placement is critical for proper operation… recommends using a level to check the pitch of your bathroom floor and toilet"* (ICE: *"the pitch of your kitchen floor"*).
- **The install gate.** All three, Step 1, bold: *"Be sure the water supply valve is working properly and that water is not passing through the valve. If water is still flowing through the water supply valve, contact a plumber in order to replace the wall valve for proper installation."*
- Power is 2× AA. All three, "Parts (Included)": device, leak detection sensor, supply hose, AA batteries (quantity 2).
- **Tools (Not Included): a Small Adjustable Wrench and a Small Level.** All three.
- **Powering the device on closes the valve.** All three, "Testing": *"Press the POWER button for 3 seconds to turn on the device. aquaHALT will stop the water supply and the LED above 'close' will be on."* You then press `open`.
- **After a shutoff, the reset is manual.** All three: *"Dry off the sensor and press the 'open' button in order to supply water to the tank"* (ICE: *"to the ice maker"*).
- **The audible alert covers two different events** — water *and* low battery.
- All three: *"aquaHALT should not be submersed or installed under water."*
- **Patent No. 10,895,068** is printed in all three.
- Manuals are bilingual English/Spanish.

**Where they diverge — this is the single most useful thing in this brief.** The 2X manual is ©2020; the FLIP and ICE manuals are ©2025 and carry a **revised Usage Guide**:

| Behaviour | 2X-Manual.pdf (©2020) | FLIP-Manual.pdf and ICE-Manual.pdf (©2025) |
|---|---|---|
| Alert wording | *"When the sensor detects water or battery is low, an alert will sound. Press 'close' to silent alert. **Alert will only last 2 min if 'close' is not pressed.**"* | *"When the sensor detects water or the battery is low, an alert will sound. Press 'close' to change the batteries and to dry off the sensor."* **No two-minute statement at all.** |
| Battery ladder, step 3 | *"Only 1 LED blinks - low power, **device will turn off after 8 hours**."* | *"Only 1 LED blinks - low power."* **The 8-hour cutoff is gone.** |
| Removal | Twist or slice the double-sided tape with a string. *"DO NOT PULL THE DEVICE DIRECTLY OFF THE WALL AS IT MAY DAMAGE THE WALL OR TILES BEHIND THE UNIT."* Then a contractor's solvent for the residue. | **FLIP:** shut the wall valve, flush the tank, *"Then remove the hoses accordingly."* No adhesive, no tiles, no solvent — nothing is stuck to the wall. **ICE:** shut the valve under the sink, remove the hoses, twist rather than pull. No tile or solvent warning. |

Steps 1 and 3 of the battery ladder are identical in all three (*"3 LEDs blink - full power, device functions normally; 2 LEDs blink - reminder to change battery, device functions normally"*).

**Never attribute the two-minute alert or the 8-hour shutdown to the product generally.** Both are documented for the 2X only, in a 2020 document, and the manufacturer removed both from the 2025 manuals. That divergence is a real, publishable, first-hand finding — and it is also an open question for the client.

**The 2X and the Flip are two physically different installs**, documented only in the manuals:

| | aquaHALT 2X | aquaHALT Flip |
|---|---|---|
| Hoses | Two 3/8" — one each side of the device | One new 3/8" × 3/8"; the existing hose is *"remove[d]… completely"* (Step 2) |
| Mounting | *"peel off the cover of the adhesive pad… install the aquaHALT device to the wall"* (Step 4) | *"install the aquaHALT device to the bottom of the toilet tant fill valve"* (Step 4 — typo in the original) |
| Leaves behind on removal | Tape residue; solvent required; tile-damage warning | Nothing on the wall |

**Legal entity and copyright, corrected** (rendered page 1 of each):

| Manual | Licence line | Trademark line | Copyright |
|---|---|---|---|
| 2X | *"Assembled in the USA under license from Water Automation Corp"* | *"AquaHalt is a registered Trademark of Water Automation Corp."* | © 2020 |
| FLIP | *"Assembled in the USA under license from water AUTOMATION LLC"* | *"aquaHALT is a registered Trademark of Water AUTOMATION LLC."* | © 2025 |
| ICE | *"Assembled in USA under license from LLC"* — **the company name is missing from the printed line** | *"aquaHALT is a registered Trademark of Water AUTOMATION LLC."* | © 2025 |

The split is **2X (Corp, ©2020) against FLIP and ICE (LLC, ©2025)** — not, as an earlier note had it, 2X+FLIP against ICE. The ICE manual's licence line is broken in print.

**One thing the manuals themselves get wrong, in all three:** *"The insurance benefits are endless. aquaHALT can save you money on your insurance."* That is the same unsupported premium claim the website makes. Do not quote it as though a manual makes it safe.

**The deliberate dumbness is the product thesis, and the manual argues it better than the website does:** *"Other leak detection systems operate over wireless communication which at times, lose communication or connectivity. Nothing else compares, as our device is hardwired and battery operated, to always operate at all times."* Use that argument. It is a failure-mode argument, not a convenience argument, and it is the strongest thing this company owns.

Founder and CEO is Gregory "Easy" Capizzi. Per `/about-us/`, he came out of hospitality, watched water losses in buildings he managed, and founded aquaHALT in 2020 on the smoke-alarm analogy: a cheap, dumb device in every room that acts on its own.

### What it is NOT

Say this plainly and early in anything we publish. Getting it wrong attracts traffic that cannot buy.

| It is not | Because |
|---|---|
| A mainline / whole-house shutoff | It sits on one fixture's supply hose. Whole-house coverage means one device per toilet, per sink, per ice maker. |
| A smart device | No Wi-Fi, no app, no hub, no cloud, no radio, no account, no subscription. |
| A notification system | Nobody gets a phone alert. It beeps locally. |
| A flow monitor | It has no flow sensing of any kind. It is a floor-water sensor. |
| Able to see leaks it cannot touch | It cannot detect a leak inside a wall, under a slab, in a ceiling, or a drip that evaporates or runs to a drain. |
| Prevention | It is a *reaction*. Damage happens between the leak starting and water reaching the sensor. "Limit" is the honest verb; "prevent" overstates it. |
| Tool-free | All three manuals list a **small adjustable wrench** and a **small level** under *"Tools (Not Included)"*, and require the compression nut *"snug so that you cannot unscrew it with your hand"*. |
| Available for every fixture | There is no washing-machine, dishwasher or water-heater product. Five SKUs exist and the nav on all 182 pages lists all five. |

### The five SKUs

Prices and stock read off `_raw/product/…`, `_raw/shop/` and `_raw/buy-now/` (8 Sep 2026 capture), re-verified 13 Sep 2026.

| Product | Price | Connection (from the product page) | Manual? | Install video? | Status |
|---|---|---|---|---|---|
| aquaHALT 2X — Toilet | $157.99 | *"two 3/8 water hoses"*; mounts to the wall | 2X-Manual.pdf | youtu.be/oW5Gbn3W8ik | In stock |
| aquaHALT Flip — Toilet | $165.99 | *"one 3/8 water hose"*; attaches to the fill valve | FLIP-Manual.pdf | youtu.be/O5yA_c4Xqbs | In stock |
| aquaHALT ICE — Ice Makers | $163.99 | *"¼ inch adaptors"*, under the kitchen sink | ICE-Manual.pdf | youtu.be/UUHM25-aEAs | In stock |
| aquaHALT H/C — Sinks | $187.99 | *"a double port valve… utilizes 3/8 water hoses"* | **None published** | **None published** | **Out of stock** |
| aquaHALT Replacement Sensor | $16.25 | Plugs into the device's sensor port | n/a | n/a | In stock |

**New finding, verified 13 Sep 2026:** three manuals and three install videos are linked from **all 182 pages** of the capture. **There is no H/C manual and no H/C install video anywhere on the site.** The only product covering the most-used fixture in a home has no price you can pay, no document and no video.

`/buy-now/` prints **"Expected Service Life: 10 Years"** four times — once under each of the four devices. The H/C shows *"Currently Unavailable — Contact Us"* on **12 pages**, and `/product/aquahalt-for-a-sink/` carries the WooCommerce **"Out of stock"** flag.

Also verified: **`/product/aquahalt-2x/` serves the Flip's meta description** (*"Discover the aquaHALT Flip for toilets—easy to install, compact, and reliable water protection that attaches directly to your fill valve…"*).

### Site shape

183 HTML files in the working copy (182 + `404.html`); 182 in `_raw/`. Sitemaps: `post-sitemap.xml` 135 URLs, `page-sitemap.xml` 28, `product-sitemap.xml` 6, `category-sitemap.xml` 2. WordPress + Elementor + WooCommerce.

**Correction to carry forward:** the four partner audiences are **not** four URLs. They are four anchor sections on one page — `/partner/#insurance`, `/partner/#property`, `/partner/#plumbers`, `/partner/#builder`. None can rank independently. There is a second, near-orphaned page at `/partner/become-a-partner/` that nothing in the navigation links to.

---

## Where the money is

One-time hardware sale. **No recurring revenue at all** — and the site makes that a selling point. Growth has to come from unit volume and multi-unit deployments, not from a subscription base.

### The shipping rule — and why we are not building a post on it yet

`COMMERCE.md` in this repo (line 27) records shipping as **a flat $13.00 per item, not per order**, with a four-item cart billing $52.00. **Verified:** the string `13.00` appears on **zero** of the 182 pages in `_raw/` (counted 13 Sep 2026), so the rule is invisible until checkout.

**Two reasons not to publish arithmetic built on it yet.** First, `COMMERCE.md` is an internal document with no public URL and no public date; the only honest citation is the live checkout, screenshotted, with the date. Second, `COMMERCE.md` itself lists per-item shipping as an **open client question** (lines 94 and 203) — the client may move to a flat per-order rate or free shipping over a threshold. A page whose spine is `$13/item` can be wrong the day the new checkout ships. Ask the question first (open question 8); publish after.

What we *can* publish today, because the product pages carry it:

| Order | Devices | Product subtotal |
|---|---|---|
| One toilet | 1× 2X | $157.99 |
| Two toilets + ice maker (buyable today) | 2× 2X + 1× ICE | $479.97 |
| Two toilets + two sinks + ice maker | + 2× H/C | $855.95 — **not buyable; H/C out of stock** |
| 200-unit building, one toilet each | 200× 2X | $31,598.00 |

Add shipping only once the live checkout has been opened and dated.

**Average order value is unknown.** It is in WooCommerce, and `COMMERCE.md` flags the order export as unrecoverable once WordPress is switched off. Get it before cutover. Do not infer it from the price list — a price range is not an order-value distribution.

**Fixture count, stated conditionally rather than as an average:** protecting every fixture aquaHALT currently makes a product for means one device per toilet, per sink and per ice maker. `/book-a-call-tradeshow/` states it: *"Use one aquaHALT for each toilet, sink, ice maker, or appliance you want protected."*

### Channels

| Channel | How it works | The gap |
|---|---|---|
| **Own site** | WooCommerce + Stripe (card and Stripe Link), guest checkout allowed | Per-item shipping never disclosed before checkout. No SKUs set on any product |
| **Amazon** | Every "Switch to Amazon" button points at ASIN **B09PF2YCPM** (the 2X), on 13 pages. The deep link still carries someone's copied browser session parameters | **Unverified and blocking:** nobody has opened the Amazon listings and recorded price, shipping and warranty with a date. Until that is done we cannot write "one toilet lands at $X" without saying which channel. Zero blog posts mention Amazon, yet the Trustindex widget pulls its review display from Amazon — Amazon is where the social proof lives |
| **Bulk / B2B** | Every path is "email sales@waterautomation.com" or a form. Pitched as the growth channel | No volume price list, no spec sheet, no order minimum, no trade-account mechanism, no stated shipping treatment at volume |
| **Partner / affiliate** | The WordPress affiliates plugin is installed; every partner CTA anchors to a single `#affiliate-form` on `/partner/` | No rates, no terms, no partner agreement published |
| **Trade shows** | `/expo-signup/` and `/book-a-call-tradeshow/` exist | Not measurable from the site |

### Where to point content — order shape, not invented order sizes

Nothing in the mirror, the manuals or any cited page establishes typical portfolio sizes or per-project volumes. The earlier version of this brief published a table of order sizes ("100–500+ devices", "300+ per project phase", "2–6 devices") with no source. Those are gone. What survives is arithmetic anyone can check:

| Segment | Order shape | Repeat? | Commercial weight |
|---|---|---|---|
| Multifamily property managers | One device per protected fixture, per unit. A 200-unit property specifying toilets only is 200 devices at $157.99 | Per property, per phase | **Highest.** Fixture count compounds; one conversation replaces a great many retail orders |
| Builders / specifiers | One device per fixture per home, carried forward into every later phase by the spec | Every subsequent project, automatically | **High**, slowest cycle |
| Condo / co-op / HOA boards | Pilot floor → building-wide, same per-fixture arithmetic | Sticky once standardized; sensors recur | **High**, consensus sale |
| Insurance channel | Zero direct revenue | — | **Highest leverage, no revenue.** One accepted program can outweigh the retail channel |
| Landlords, 1–20 doors | Per-unit kit — toilet, kitchen sink, ice maker — bought at turnover | Annually, per turnover | **Best margin per content-hour.** Converts from organic with no human involvement |
| Second-home / snowbird | Per-property kit | Per property owned | Highest willingness to pay per device of any retail buyer |
| Plumbers / trades | Van stock, restocked | Continuous | Cheapest volume once onboarded; lowest margin per unit |
| Reactive homeowner | One to a few devices | Rarely | Smallest sale. **Broadest query surface — most of the autocomplete evidence we gathered sits here.** The traffic and trust engine |

**The imbalance to correct, restated from the counts we actually have.** Of 135 posts, roughly 40 slugs already carry a commercial, multifamily, landlord, tenant, manager, construction or restroom signal — the B2B audience is *not* unserved. But those are the most duplicated clusters on the site (23 commercial / facility-manager, 12 apartment / multifamily, 6 business-savings), none of them carries a price, a fixture count, a spec or a reference, and several sell capabilities this product does not have. **The problem is not audience. It is that no page written for a high-value buyer is decision-grade.**

---

## Who buys it

### 1. Multifamily property managers and apartment operators

**Who.** Regional managers, asset managers and maintenance directors at companies running rental communities. The budget owner is whoever carries the water-loss line in the operating budget. The install is done by an in-house maintenance tech, not a contractor. *(We do not know typical portfolio or property sizes for this client's buyers — that is open question 18, not a writing assumption.)*

**Trigger, in order of urgency.** (a) A supply-line failure in an occupied unit that ran overnight and damaged the units below, forcing an incident report. (b) The annual insurance renewal or loss-run review where water is the leading named cause and the deductible has moved. (c) **The make-ready / turnover cycle** — `/water-leak-protection-dallas/` builds its whole pitch on this, because that is the only moment the unit is empty and a tech is already inside it with tools.

**Pain.** Mainline shutoffs mount on the main supply line, and the vendors' own installation guidance calls for a licensed plumber — which is why they cannot be deployed across occupied stock without riser access and board or owner approval. *(Cite the competitors' own pages with a date checked — never our comparison table.)* Meanwhile one failed toilet supply line travels down a stack and becomes several units of drywall, flooring, displacement and lost rent. Alert-only sensors don't help: nobody is in the unit at 2am to respond.

**Buying criteria.** Cost per fixture that stays flat as unit count climbs; installable by existing staff inside a normal make-ready slot with no plumber, permit or unit downtime; no subscription, no network, no app accounts to provision; something they can document to their carrier.

**Objections.**

| Objection | What they'll actually say | Where it bites |
|---|---|---|
| Price with no published tier | "What's my per-door number?" | A 200-toilet rollout is $31,598 at list; the only route is a "Request Bulk Pricing" button (on 9 pages) and the sales@ mailbox |
| Shipping at volume | "How is freight handled on 200 items?" | Unpublished. `13.00` appears on zero pages; the bulk treatment is unstated |
| Battery replacement at scale | "Who changes 200 sets of AAs, and how often?" | The site publishes **six different aquaHALT battery figures** (see *What we can and cannot say*) |
| Tenant tampering | "It's stuck to the wall with tape." | True of the 2X. The Flip hangs off the fill valve and is not taped to anything — nobody on the site has noticed that this is an answer |
| No proof | "Show me a building that did this." | `/case-studies/` renders *"No articles for Case Studies found."* |

**How they search.** Portfolio and procurement language, not symptom language. They search at the moment of spec, so the page must answer fixture count, per-unit cost, install time and insurer documentation **above the fold**.

---

### 2. Condo, co-op and HOA boards and their managing agents

**Who.** Volunteer board members plus the managing agent who prepares the recommendation. Approved by vote against a reserve budget, not by a single buyer.

**Trigger.** A stack loss: one unit's toilet floods the finished apartments below and the association absorbs the claim and the deductible. Then: reserve studies, milestone/recertification inspections, renewals where water history has driven premium or deductible up, and the prospect of a special assessment.

**Pain.** Their exposure is shared and their remedy is political. `/water-leak-protection-new-york/` states it best on the whole site: *"one overflowing toilet on the 14th floor becomes a ceiling collapse on the 12th"*, and mainline systems *"require cutting into the riser, a licensed plumber, and board approval."* They also cannot easily compel a unit owner to install anything inside privately owned space.

**Buying criteria.** No riser work, no board-approved plumbing contract, no special assessment, no recurring subscription line. A one-time capital item a board can approve once and a superintendent can install. Documentation that goes in a board packet and can be handed to the carrier.

**Objections.** Who pays and who owns it. Whether the board has authority to require a device inside privately owned units. Whether the association inherits liability if a device fails to close. Battery replacement and the access problem it creates across hundreds of private units, on a cycle the site cannot state consistently. And the total absence of an association reference.

**How they search.** As a committee building a case for other people, in governance vocabulary. They need tables, a priceable scope and something printable — the opposite of the emotive first-person blog the site currently publishes.

---

### 3. Landlords and small rental portfolios at turnover

**Who.** Individual owners and small LLCs self-managing a handful of doors, buying at list price on the site or Amazon with a card. No PO, no procurement, no sales call.

**Trigger.** **The turnover itself** — the tenant has gone, the unit is empty, every fixture is accessible, and there is a short window. Secondary: a tenant reporting damage the owner pays for personally; a repair bill that landed under the deductible; a mold or habitability complaint.

**Pain.** They carry the loss personally and they are not there to catch it. A leak in a tenanted unit is reported late, if at all, and the bill arrives with lost rent attached. They cannot rely on a tenant to respond to an app notification — the tenant has no incentive to install an app or own an account.

**Buying criteria.** Price per door justified against one avoided repair; installable during a make-ready with hand tools; nothing that requires the tenant to do anything; nothing that generates a support call when the tenant changes.

**Objections.** Sticker price against a per-door budget. Whether the device survives a turnover or walks off with the tenant. Whether it is the landlord's asset or a fixture. Whether insurance actually gives credit. And the practical blocker: the sink model is out of stock, so a landlord who wants a complete unit cannot buy one today.

**How they search.** Landlord vocabulary mixed with task vocabulary, in the singular and first person, **before** the incident. The asset that wins them is a checklist, not a scare story.

> **Competitive note, corrected.** The Water Scrooge (`thewaterscrooge.com`) sells a **motion-activated toilet valve** at `/landlords/auto-toilet-shutoff-valve-toilet-scrooge` (opened 13 Sep 2026): a water-wheel-powered valve that opens when a user is present and closes when they leave. It is a water-conservation device, **not a floor-sensor leak shutoff**, so it is not a like-for-like competitor. Its FAQ is nine questions, all product and installation (*"Is The Toilet Scrooge easy to install?"*, *"What kind of shut-off valve do I need for a toilet?"*, *"How To Shut Off Water Supply To Toilet?"*) — it does **not** contain the tenant-objection content an earlier version of this brief attributed to it. **The landlord gap on aquaHALT's side is real and provable from our own mirror without borrowing anybody's FAQ:** there is no landlord page, only a "Property Management" nav item that anchors to `/partner/#property`.

---

### 4. Second-home, snowbird and vacation-rental owners

**Who.** Owners of a property they do not live in full-time — a coastal condo empty through the off-season, a lake or ski house, a short-term rental with gaps between guests.

**Trigger.** Closing the property for the season, or the moment of departure. Also: returning to damage; a neighbor's flood in the same building; a cleaner reporting a soft floor between guests.

**Pain.** A device that *notifies* depends on someone being reachable and within reach; in a vacant property that assumption fails. `/water-leak-protection-fort-lauderdale/` puts it exactly: *"Alert-based systems assume someone is watching; in a vacant unit, the owner is a thousand miles away… aquaHALT doesn't need anyone to respond."* *(Note: "every competing product's core mechanism fails outright" was in an earlier draft of this brief and is too strong — several competitors act on flow without a human present. Make the argument about response, not about every product.)*

**Buying criteria.** Autonomy above everything — it must act, not notify. Independence from mains power and Wi-Fi. No subscription for a property visited twice a year. Long unattended battery life.

**Objections.** The battery question is the *entire* objection — *"if I'm away six months, will it still be alive?"* — and the site answers it six different ways. Second: it beeps, and nobody is there to hear it. Third: if it closes mid-stay for a guest, who handles that? Fourth: there is no remote confirmation of any kind, by design — the correct product decision, but it needs stating plainly rather than left to be discovered.

**How they search.** By situation rather than product category, and almost always seasonally, in a narrow window before departure. This is the one segment where **publishing timing and seasonal refresh genuinely change the commercial outcome.**

---

### 5. Reactive homeowner after a fixture failure

**Who.** An owner-occupier who has just had, or narrowly avoided, one specific failure. Not shopping a category; trying to understand what happened to them.

**Trigger.** The incident, or the arrival of the quote afterwards. Second trigger: the near-miss.

**Pain.** They have just learned that a cheap part can cost them a floor and that nothing in the house was watching. They do not want a dashboard or another app; they want the specific fixture that betrayed them never to do it again.

**Buying criteria.** Will it fit my toilet, sink or ice maker; can I install it myself tonight; does it actually stop the water rather than text me. This buyer arrives with a specific failure in mind rather than a budget, which is why the page has to answer fitment and self-install before it argues price. *(An earlier draft asserted that price sensitivity is "unusually low in the days immediately after an incident and rises steeply within weeks." That is a claim about buyer behaviour over time with no source and no data from this account. It is cut.)*

**Objections.** *"Will it fit my fixture?"* is dominant, and the site answers it only inside product-description prose. There is no fitment guide and no side-by-side of the fixture types. `/installation/` is a **navigation shell with no body content** — 1,070 characters of visible text, all header and footer nav, "Skip to content" and "$0.00 0 Cart". `/demo/` is the same. Then: will it close by accident; can I still use the toilet; what happens when the battery dies; and price.

**How they search.** The only segment that searches **symptoms** rather than solutions, in natural question form, often on a phone while standing in the bathroom.

---

### 6. Insurance carriers, brokers and loss-control teams *(channel)*

**Who.** Personal-lines and commercial underwriters, loss-control and risk-engineering staff, and brokers placing habitational and high-value homeowner business. They never buy for themselves.

**Trigger.** A loss-run review where non-weather water leads claim frequency; a carrier building a policyholder mitigation program; a renewal where the insured must demonstrate mitigation.

**Pain.** Water is a frequency problem they cannot underwrite their way out of, and the devices they would normally recommend cannot be fitted in the stock that generates most of the claims. They need something distributable: cheap enough to bundle, simple enough that a policyholder fits it without a service visit.

**Buying criteria.** Evidence and defensibility. Independent validation, a real patent, documented failure modes, and something that demonstrably *stops* water rather than notifying. Plus a program they can administer.

**Objections — and this is the highest-risk audience on the account.** "Chubb-vetted" is asserted on **16 pages** with no supporting document, no scope, no date and no link anywhere — **including the meta description of all 8 city pages**, which is what a broker sees in the SERP before they ever reach the page. The loss figures on the homepage and every city page carry no source link and no date. The premium claim names no carrier and no credit. And `/case-studies/` is empty.

**How they search.** Barely at all — they are reached through brokers, trade press, conferences and direct outreach. When they do search it is verification-shaped and brand-first. **The SEO job here is not ranking for volume; it is ensuring that when a named underwriter checks the company after a meeting, a credentials page substantiates what the sales conversation claimed.**

---

### 7. Plumbers and service trades *(channel)*

**Who.** Independent plumbers, small service companies, handyman and maintenance contractors already standing inside the property for a repair.

**Trigger.** The service call they are on right now. Second trigger: the callback, which is margin out of their own pocket.

**Pain.** Revenue is per call, reputation is per callback. They want something to leave behind that raises the ticket without adding a return visit.

**Buying criteria.** Trade pricing with real margin, van stock, an install fast enough not to extend the call, and no warranty exposure if it misfires.

**Objections — the blocking one is a contradiction we have to resolve before writing for them.** "No plumber" messaging appears on **26 pages** (`no plumber` on 12, `No plumber` on 14, counted in `_raw/` 13 Sep 2026) while `/partner/#plumbers` asks plumbers to stock and fit the product. The contradiction sits on a single page: `/partner/#property` promises *"fast, tool-free setup — no plumbers, no fuss"* a few hundred pixels above the section asking plumbers to partner. Beyond that: no published trade price, no trade account, no dealer portal, no spec documentation, and the H/C — the one a plumber most wants under a sink — is out of stock with no manual.

**How they search.** As a supplier-hunting trade buyer, and *on a customer's behalf mid-call*. **Note:** every plumber-seed completion we recorded was a *homeowner hiring a plumber*, not a plumber buying — see the query list below. A page built to rank for "water leak detection near me" would attract people wanting a technician dispatched, which this company does not do. A `/partner/plumbers/` page is a sales asset a rep sends, not an SEO asset that ranks. Budget it accordingly.

---

### 8. Builders, GCs and new-construction specifiers *(channel)*

**Who.** Production and custom homebuilders, multifamily developers, and the GCs who assemble the fixture package. The decision is made at specification, by someone weighing warranty exposure.

**Trigger.** Writing or revising the fixture spec; a warranty callback after handover; a developer's insurer or lender asking what water mitigation is in the building.

**Pain.** Water damage in the first years after handover comes out of the warranty reserve and the builder's reputation. Anything needing an electrician, a circuit or a network drop adds a trade and a schedule dependency.

**Buying criteria.** Spec-sheet completeness above all — model numbers, dimensions, connection sizes, service life, battery interval, something a specifier can drop into a submittal. Zero added trades. A per-unit cost that survives value engineering.

**Objections.** They will ask exactly the questions the site answers inconsistently: what is the service life (10 years on `/buy-now/`, 15 in five blog posts); what is the battery interval (six different published figures); is it listed or certified to anything a spec writer or code official recognizes (**no** — "NSF", "lead-free", "UPC" and "IAPMO" appear on **0 pages each**); who owns battery replacement after handover. And they want a submittal package, which does not exist — and for the H/C, not even a manual. `/builder-lander/` opens with generic homeowner copy under the animated headline *"your apartment's favorite…"* and carries the title *"DIY Water Leak Detection & Automatic Shut-Off Valves"*. It is not a builder page.

**How they search.** In specification and liability language, and critically **they search for documents rather than pages** — spec sheet, cut sheet, submittal, warranty, installation manual. The asset that converts them is a downloadable PDF indexed under those terms. Keep the builder assets as sales enablement, measured on demos booked, not traffic.

---

## What each segment types into Google and Bing

**Method, stated so you can re-run it.** These phrasings came back live on 13 September 2026 from Google's public autocomplete endpoint (`suggestqueries.google.com`, `hl=en`, `gl=us`), Bing's autosuggest (`api.bing.com/osjson.aspx`, `market=en-US`), Brave result URLs for `site:reddit.com`, and US web search.

**No search volumes exist in this research.** No keyword tool was reachable. That means **this document must not rank anything by volume**, and where an earlier version did ("largest addressable search volume", "highest-evidence entry point", "almost every high-volume plumber query"), those magnitudes have been struck. What we have is a list of phrasings the engines returned, and nothing more. Ordering below is by how short a seed produced the completion — directional, not measured.

**Locale caveat, plainly.** The requests left from a non-US IP, so both endpoints leaked UK and South African suggestions; those were stripped. Bing's `market=en-US` was respected more strictly than Google's `gl=us`. **Re-pull every seed from a US IP before anything is built on this.**

**What a missing suggestion does and does not tell us.** Several seeds returned nothing. Autocomplete suppresses low-frequency queries by design, so **absence of a suggestion is evidence of low or no suggestion-threshold volume, not proof that nobody searches the phrase.** Confirm in Search Console before a budget decision rests on it. The seed `aquahalt` returned only itself and an unrelated product — so there is no observable brand search to harvest, and every visit has to be earned on a problem or category query.

### Homeowner — the core buyer

*(Q) marks a question query.*

**Stage 1 — bill shock (not a product query; a person holding a bill)**
`why is my water bill so high` · `why is my water bill so high all of a sudden` · `why is my water bill so high this month` · `running toilet water bill` · (Q) `can a leaking toilet cause high water bill` · (Q) `how much water does a leaking toilet use per day` · (Q) `how much does a toilet leak cost`

**Stage 2 — the failure already happened (their words: "burst", "exploded", "ruptured" — not "leak detection")**
`toilet supply line leaking` · `braided supply line leaking` · `toilet flooded what to do` · `toilet flooded through ceiling` · `water damage from toilet overflow` · `ice maker line leaking` · `refrigerator ice maker hose leaking` · (Q) `how to stop a toilet from overflowing` · (Q) `what causes a toilet supply line to leak` · (Q) `how often should you replace toilet supply line`

**Stage 3 — shopping**
`automatic water shut off valve` · `automatic water shut off valve for toilet` · `automatic water shut off valve for homes` · `automatic water shut off valve cost` · `water leak detector with shut off valve` · `best water leak detector for home` · `best water leak detector reddit` · **`water leak detector no wifi`** · **`water leak sensor without wifi`** · **`water leak detector no hub`** · `under sink leak detector` · **`water leak detector for washing machine`** · **`water leak detector for water heater`** · (Q) `are water leak detectors worth it` · (Q) `do water leak detectors work` · (Q) `where should water sensors be placed` · (Q) `do i need a water leak detector`

**Stage 4 — comparison**
`moen flo smart water monitor & shutoff` · `phyn vs moen flo` · `phyn vs flo reddit` · `govee water sensor review` · (Q) `what are the best water leak detectors`

**Stage 5 — away-from-home**
`pipe burst while on vacation` · `water damage while on vacation` · (Q) `should i shut off the water to my house when i go on vacation`

### Landlords and small rental owners

Product-shaped landlord queries barely appeared. Seeds like `leak detector for landlord` and `water leak sensor for rental` returned rental-equipment-hire confusion — both engines read "rental" as renting a detection tool. **What landlords search is the argument about who pays.**

`tenant caused water damage` · `rental property water damage` · `landlord insurance water damage` · `tenant left water running` · `landlord won't fix water damage` · `airbnb water leak` · `rental turnover checklist` · (Q) `is tenant responsible for water damage` · (Q) `who pays for water damage in a rental property` · (Q) `does landlord have to fix water damage` · (Q) `are landlords responsible for water leaks` · (Q) `how long does a landlord have to fix a leak` · (Q) `can my landlord charge me for water damage` · (Q) `does rental property insurance cover water damage`

> **Sourcing note on the BiggerPockets evidence.** The research pass recorded thread titles from BiggerPockets on 13 Sep 2026 — *"Make Tenants Pay Water Leak Bill?"*, *"Tenant left toilet running, water bill went up."*, *"Tenants did not inform about running toilet, huge utility bill"*, *"Water leak tenant told me after it was leaking a month"* — **but captured no URLs.** Under this account's own sourcing rule that makes them unusable in published copy. Three of the four are a running toilet the tenant did not report and a bill the owner paid; the first is about billing liability generally. **Before any of this is quoted, re-open the forum and record the URLs and dates.** The strategic point — that this audience argues about liability, not about products — stands on the autocomplete evidence alone.

### Property managers and HOA / condo boards

`hoa leak detection`, `condo leak detection requirement`, `water leak detector bulk` and `leak detection apartment building` returned **no Google suggestions on 13 Sep 2026** — so there is no autocomplete evidence of demand for them. (See the caveat above: that is not proof of zero searches.) It is still a reason to doubt that a page called "Water Leak Detection System for Property Managers" — which the site has — is pointed at a phrase anyone types.

**The demand we could observe is in the dispute:**
`condo water leak` · `condo water leak from above responsibility` · `condo water leak who pays` · `upstairs neighbor leaking water` · `upstairs neighbors toilet leaking` · `upstairs neighbor refuses to fix leak` · `apartment flooded from upstairs` · `condo water leak ceiling` · (Q) `who is responsible for water damage in a condo` · (Q) `who is responsible for water damage in a condo florida` · (Q) `does hoa cover water leaks` · (Q) `what to do if water leaks from upstairs` · (Q) `can i sue my upstairs neighbor for water damage` · (Q) `apartment flooded who is responsible`

> Note the state modifiers — people search this **with their jurisdiction attached**. Also: searches for HOAs *requiring* leak devices returned recommendations, not mandates. **Do not build content premising that boards are being forced to install these.** Build on the deductible and the chargeback fight.

### Facility managers

The thinnest segment, and the honest answer is to say so. `facility water leak`, `restroom water waste`, `hotel guest room water leak` and `preventive maintenance toilet leaks` returned nothing usable. Only two things here are real:

`commercial building water leak detection` · `commercial property water leak detection` *(contested by Alert Labs, Leak Defense, WaterCop, Water Alert)* · **`commercial toilet leaking`** with a dense completion set: `at spud` · `when flushed` · `at base` · `at vacuum breaker` · `from handle`

> **Product-fit caveat to resolve before commissioning anything here.** A commercial restroom has flushometer valves on a 1" or 1-1/4" supply, not a 3/8" compression stop with a braided hose. All five SKUs are 3/8" (1/4" for ICE). Nothing on the site establishes that any of them fit commercial fixtures. If they don't, this is a break-room-and-office-kitchen play, not a restroom play.

### Insurance

`chubb water leak detection` · **`chubb approved water leak detection`** · **`chubb flow based water leak detection system`** · `home insurance water leak detector` · `insurance discounts for water leak detection` · `automatic water shut off valve for insurance` · `usaa water leak detection discount` · `water damage claim denied` · `state farm denied water damage claim` · (Q) `does homeowners insurance cover water damage` · (Q) `will homeowners insurance cover a toilet leak` · (Q) `does homeowners insurance cover a toilet overflow` · (Q) `why would a water damage claim be denied` · (Q) `what is considered sudden and accidental water damage` · (Q) `should i file a claim for water damage`

> **The finding that matters most.** `chubb approved water leak detection` and `chubb flow based water leak detection system` are **live Google completions**. People are searching for Chubb's approved-device list. The site claims "Chubb-vetted" on 16 pages, including eight meta descriptions. That claim sits on a query people type, which cuts both ways — the people searching it are exactly the people who can check.
>
> The completion tells us **what searchers type**, and that they expect flow-based products. It does **not** establish Chubb's own terminology: nobody on this account has opened a Chubb device-list page. That is part of open question 4.
>
> **What one carrier page actually says.** Amica's water-damage-mitigation-device discount page (`amica.com/en/products/home-insurance/discounts/water-damage-mitigation-devices.html`, opened 13 Sep 2026) lists **three qualifying categories — point/leak sensors, flow monitors, and all-in-one devices that both notify and stop a leak** — and says a policyholder may qualify with any of them. Point/leak sensors are described as best for *"under sinks and next to water heaters, washing machines, toilets, etc."* It names Phyn, StreamLabs, Flume and Moen as partner examples. **It does not name aquaHALT, and we have found no carrier page that does.** An earlier version of this brief concluded from that page that "the category of device that earns carrier discounts is not this category of device" — that conclusion is contradicted by the source itself and is withdrawn. The operative rule below is unchanged and stands on its own.
>
> Almost none of this segment's search demand comes from insurance professionals. It comes from homeowners with a claim problem — and the gradual-versus-sudden distinction is the thing people don't understand, the thing that gets claims denied, and the honest argument for prevention.
>
> **The site's existing insurance page is broken.** `/water-sensors-for-insurance/` carries the `<title>` *"How Much Water Can a Leaking Toilet Waste Over Time?"*, shared with `/why-is-my-toilet-making-noise-when-not-in-use/`.

### Plumbers

**Every plumber-seed completion we recorded was a homeowner hiring a plumber**, not a plumber buying: `plumbing leak detection near me` · `water leak detection plumber near me` · `plumber leak detection cost` · (Q) `can a plumber detect a water leak` · (Q) `how much does leak detection cost`

**The one genuine opening** — the wall stop failing, which puts the product in front of both audiences without pretending to be a service business:
`toilet water shut off valve replacement` · `toilet water shut off valve stuck` · `toilet water shut off valve leaking when closed` · `toilet water shut off valve not working` · `toilet supply line replacement` · (Q) `what kind of shut-off valve do i need for a toilet` · (Q) `how often should you replace toilet supply line`

### Builders

Seeds returning nothing on 13 Sep 2026: `leak detection new construction`, `water leak protection for new construction`, `fixture level leak detection`, `point of use leak detection`. `leak detection requirement` returns **refrigerant** completions — that phrase is owned by HVAC, not water.

The only adjacent demand we could observe is warranty-shaped and belongs to home-warranty companies: `home warranty water leak` · (Q) `does home warranty cover water leaks` · (Q) `does home warranty cover plumbing leaks`. **Treat builder assets as sales enablement on the commercial argument, not on a demand measurement we do not have.** If any SEO effort goes near this segment, aim it at the buyer of a new home, not the builder.

### Bing vs Google — is a separate strategy worth paying for?

**No.** Autosuggest-only comparison (ranked results could not be compared — Bing served a decoy page; DuckDuckGo and Brave rate-limited). Four differences observed:

1. **Bing is noisier and drifts to services.** On `water leak detector with shut off`, Google returned a tight purchase cluster; Bing collapsed it into leak-detection-*service* queries. **Build to Google's suggestion set, or you will write service pages for a product company.**
2. **Bing geolocates the pain query.** `why is my water bill so high riverside ca`, `…in farmington nh`. Useful for method: from outside the US, Bing's endpoint is the more trustworthy of the two.
3. Thin commercial-modifier split: Google surfaced `cost`, Bing surfaced `reviews`. Not worth restructuring for.
4. Insurance vocabulary splits — Bing points at finding a local adjuster, Google at self-researching a claim. **Write for the self-researcher.**

**One concrete action:** verify the site in Bing Webmaster Tools and submit the sitemaps there as well as in Google Search Console. It costs one session, and a moved site should not rely on either engine finding the new URLs on its own. **We have no measurement of relative discovery speed between the two engines and should not claim one.**

### What AI answer engines are already doing

Observed on 13 Sep 2026 through **one generative search engine that returns its citation list. The engine was not recorded by name, which means nobody can re-run this pass** — fix that on the next one. One engine, one pass: indicative, not definitive.

| Query shape | Who got cited | What it means for us |
|---|---|---|
| Consumer "best leak detector" | Bob Vila, Consumer Reports, Tom's Guide, TechHive, Home Depot, vendor listicles. **aquaHALT absent.** Named products: Flo by Moen, Phyn, Flume, YoLink, StreamLabs | Not an on-site content problem. It's a **review-inclusion** problem — outreach, not another blog post |
| **Product-definition query** — `automatic water shut off valve for toilet no wifi battery powered` | **aquaHALT's Amazon listing cited first**, described accurately and at length | **The most valuable observation in the research.** When the query carries the product's constraints, aquaHALT already *is* the answer — but it's cited through Amazon, not the site the client owns. Fixable on-site |
| "Who pays" questions | A leak-sensor vendor's blog, a property-management blog, two plumbing blogs, a tenant-rights site. No authority, no publisher, no notable firm | **The most beatable field on the list.** A vendor is already winning these — proof we can |
| Running-toilet / water-waste | Denver Water, Portland Water District, several city utilities, plus two posts from a competitor | The site has seven pages competing here and was cited on none. **Consolidate, cite the utilities, add what they cannot: what to do at the fixture** |
| Commercial facility restroom | **`/water-leak-detection-for-commercial-buildings/` and `/how-automated-water-leak-detection-saves-commercial-buildings/`** cited alongside Alert Labs, Leak Defense, WaterCop | **The only citation of the client's own domain in the entire research pass.** Both are long, topically narrow, and name specific failure modes. That is the template — and those two URLs must be protected through the WordPress decommission |
| Insurance discount | Amica, Farmers, Mercury, Nationwide's press room, StreamLabs | When the engine has the carrier's own page in front of it, a vendor page claiming a discount the carrier doesn't list gets contradicted or ignored |

**Four traits recurred across the pages that engine cited on 13 Sep 2026:** the question is the heading, phrased as typed; the answer lands in the first 40–75 words; comparative facts sit in real `<table>` markup; the page has one narrow topic rather than being one of seven overlapping posts. Add a fifth of our own, which is our editorial reasoning rather than observed engine behaviour: **trace every figure to a named, linked, dated source.** Treat all five as a working hypothesis that also happens to be good writing practice — not as a ranking model.

---

## What we can and cannot say

**This is the section that stops us publishing something a competitor can attack.** Read it before every brief.

### Safe and checkable — use these

| Claim | Why it holds | Where to source it |
|---|---|---|
| It **shuts the water off**; it does not merely notify | Documented in all three manuals and demonstrable | Manual, "Testing" |
| It closes the water **at one fixture**, not the house | Mechanism fact | Manual, Installation |
| **No Wi-Fi, no app, no hub, no cloud, no subscription, no account** | Verifiable by inspection; the manual argues it directly | Manual, Introduction |
| Runs on **2× AA batteries** | All three manuals, "Parts (Included)" | Manual |
| **Patent No. 10,895,068** | All three manuals; independently checkable at the USPTO — link it | **Note: this number appears on 0 of the 182 pages.** Our strongest verifiable credential lives only inside PDFs |
| **3 LEDs = full, 2 LEDs = replace soon, 1 LED = low power** | Identical in all three manuals | Manual, Usage Guide |
| **The alert covers water *or* low battery** | All three manuals | Manual, Usage Guide |
| **Powering on closes the valve**; reset after a shutoff is manual (*dry the sensor, press "open"*) | All three manuals | Manual, Testing |
| **Tools actually needed:** a small adjustable wrench and a small level | All three manuals, "Tools (Not Included)" | Manual |
| **If the wall stop doesn't fully close, a plumber must replace it first** | All three manuals, Step 1, bold | Manual |
| **3/8" default; 1/2" needs an adapter; ICE is 1/4"** | 2X and FLIP manuals, Introduction; ICE manual, Introduction | Manual + product descriptions |
| **Sensor must physically touch the floor**, and floor pitch matters | All three manuals, Step 5 | Manual |
| **The 2X mounts to the wall on an adhesive pad; the Flip hangs off the tank fill valve** | 2X Step 4 vs FLIP Steps 2–4 | Manuals, rendered pages |
| **The five prices and the H/C out-of-stock flag** | Read off `_raw/product/…` in the 8 Sep 2026 capture, re-checked 13 Sep 2026 | Always cite the date; re-verify before publishing |
| **30-day returns with receipt; free replacement including shipping if defective** | `/return-policy/` | Link the page |
| Competitors are **mainline** and **notify rather than act** | Supportable from their own installation pages | Cite *their* pages, dated — never our own table |

### Model-scoped — true of one manual, not of the product

| Claim | Scope |
|---|---|
| *"Alert will only last 2 min if 'close' is not pressed"* | **2X manual only (©2020).** The 2025 FLIP and ICE manuals do not contain it |
| *"Only 1 LED blinks - low power, device will turn off after 8 hours"* | **2X manual only (©2020).** The 2025 manuals end the line at "low power" |
| *"DO NOT PULL THE DEVICE DIRECTLY OFF THE WALL…"* + contractor's solvent | **2X manual only.** The Flip is not stuck to the wall; the ICE manual says twist rather than pull but carries no tile or solvent warning |

### Avoid, or qualify with named sources — the attack surface

**1. The service life contradiction — 10 vs 15 years.**
`/buy-now/` prints **"Expected Service Life: 10 Years"** four times, once under each device. Five blog posts claim 15: `/stop-leaks-before-they-start-your-toilet-needs-an-aquahalt-2x/` (*"with 15 years of service life"*), `/double-trouble-meet-the-aquahalt-h-c-for-your-sink/` (*"Built to last 15 years"*), `/protect-your-ice-maker-and-your-kitchen-with-aquahalt-ice/` and `/total-under-sink-defense-with-aquahalt-h-c/` (*"up to 15 years of service life"*), `/why-you-need-a-water-leak-control-device-like-aquahalt/` (*"built for 15 years"*). **Publish neither figure until the client confirms which is right.**

**2. Battery life — six aquaHALT figures, all in the 8 Sep 2026 capture.**
Counted against `_raw/` on 13 Sep 2026:

| Figure | Where, verbatim |
|---|---|
| "up to two years of maintenance-free protection" | `/partner/` (Builders block): *"Powered by just 2× AA batteries, it delivers up to two years of maintenance-free protection"* |
| "up to two years" | `/the-silent-destroyers-how-hidden-leaks-ruin-homes-and-wallets/`: *"Low Maintenance: Runs up to two years on AA batteries."* |
| "over a year" | `/rental-property-owners-…-turn-over-a-unit/`: *"Uses AA batteries that last over a year"* |
| "over one year" | `/smart-leaks-vs-dumb-leaks-…/`: *"long-lasting AA batteries (over one year of use)"* |
| "once a year" | `/from-ice-makers-to-sinks-my-diy-water-defense-plan-with-aquahalt/`: *"Replace batteries once a year"* |
| **"every six months"** | `/i-was-one-forgotten-leak-away-from-disaster-how-aquahalt-saved-the-day/`: *"Every six months, I swap the AA batteries."* — **not previously logged** |
| *(generic, not aquaHALT)* "over 3 years on a single battery" | `/smart-leak-sensors-always-on-always-watching/`: *"many models last over 3 years on a single battery"* |
| *(client-confirmed, not verified by us)* **up to 5 years** | Client statement |

**Publish no duration until the client confirms one.** What we *can* publish today is the behavior: the LED ladder, quoted, and the fact that the 2025 manuals removed the 8-hour statement. **Note also that the working copy in this repo has already been edited to say "up to 5 years" in several of these places while `_raw/` still says otherwise — finish that correction consistently, or the live site will contradict itself in a new way.**

**3. "Chubb-vetted" / "Vetted by Chubb Insurance" / "Recognised by leading insurers for measurable risk reduction."**
Three different strings with three different footprints — a remediation pass must be scoped per string, or pages will be missed:

| String | Pages (counted in `_raw/`, 13 Sep 2026) |
|---|---|
| `Chubb` | **16** — `/`, `/about-us/`, `/buy-now/`, `/contact-us/`, `/partner/`, `/q-and-a/`, all 8 city pages, plus `/blog/page/8/` and `/water-damage-is-silent-and-brutal-heres-how-to-outsmart-it/` |
| `Vetted by` | **14** |
| `Recognised by leading insurers for measurable risk reduction` | **14** |

**It is already in the meta description of all 8 city pages** — Miami's reads *"Battery-powered, no-plumber leak shutoff for Miami condo towers & commercial buildings. Chubb-vetted, salt-air ready. Bulk pricing."* and the other seven match. **Remove it from those first**, because a meta description is what a broker or underwriter sees in the SERP before they ever reach the page. Then: do not put it in a title, an H1, a meta description or a first paragraph. The Chubb wordmark image is shown under a "Vetted by" heading **with an empty alt attribute**. Before writing anything around this, get from the client: what "vetted" means contractually, who at Chubb said it, when, and whether aquaHALT appears on any Chubb-published device list. **Do not write this page on verbal assurance.**

*(Separately: "Recognised" is British spelling on a US site. It needs fixing on all 14 pages regardless of whether the claim survives.)*

**4. "Named TIME Magazine Best Inventions 2023" and the derived adjective "award-winning."**
`TIME Best Inventions 2023` on **9 pages** (homepage + 8 city pages); `award-winning` on **9**; the seal image also sits on `/partner/become-a-partner/`. No link, no citation. A TIME listing is publicly checkable — **either link the actual TIME page or drop the claim.**

**5. "The only battery-operated automatic shutoff system on the market…"**
On **14 pages**, including the homepage "Cost of Inaction" block, the comparison-table header on every city page, and the Replacement Sensor product description (*"the only battery-operated, easy-to-install water detection system"*). **An unqualified "only on the market" superlative is the easiest claim in the world to disprove and the easiest to report.** Cut the superlative; describe what it does.

**6. Any insurance saving.**
*"By installing aquaHALT you can potentially reduce your insurance premium"* appears on **12 pages** (homepage, `/buy-now/`, both landers, all 8 city pages). *"Many insurance companies now offer discounts"* appears across numerous blog posts. All three manuals say *"The insurance benefits are endless. aquaHALT can save you money on your insurance."* **No carrier is named, no credit is quantified, no program is cited, and we have found no carrier page anywhere that names aquaHALT.** Amica's discount page (URL and date above) lists point/leak sensors as a qualifying category and names four partner brands, none of them this one. **Write no saving, no discount and no premium claim without a named carrier, a linked page and a date.** The honest version: it stops the water at the fixture with no plumber, no power and no app.

**7. The stat block on the homepage and all 8 city pages.**
*"$13,000+ Average water damage claim cost (Insurance Institute)"* — "Insurance Institute" is not a resolvable organization name, and there is no link or date. The `$13,000` stat block is on **9 pages**; the bare string "Insurance Institute" is on **11** (the extra two are `/blog/page/9/` and `/the-silent-destroyer-how-to-outsmart-water-leaks-before-they-cost-you-thousands/`). *"24% Of all property insurance claims are water-related"* — no source at all. **Do not restate either.** Two more unsourced figures sit nearby and must not be reproduced: *"Water damage insurance claim — $11,000 average"* (`/the-silent-destroyers-…/`) and *"A $165 or less shut-off device could have prevented 95% of that damage"* (`/top-10-hidden-plumbing-lines-…/`).

**8. The competitor comparison table's price figures.**
*"Flo by Moen $500+ plus install"*, *"Phyn Plus $579+ plus install"* on **9 pages**. Undated and unlinked. **If we keep the table — and we should; it is a genuine `<table role="table" aria-label="aquaHALT vs Flo by Moen vs Phyn Plus feature comparison">` and only 30 of 183 pages contain any table at all — either link each competitor's own product page with a date checked, or remove the price row.**

> **Read the table before pitching anything against it.** It already publishes, on the homepage and all 8 city pages: *Works in apartments / rentals — Yes, fixture level | No — mainline only | No — mainline only*; *Professional installation needed — No — 10 min DIY | Yes — licensed plumber | Yes — licensed plumber*; *Power source — 2 AA batteries | Mains power required*; *Wi-Fi / app required — No — fully standalone*; **and *Price per fixture — From $157.99***. The fixture-versus-mainline argument and per-fixture pricing are **not** unpublished. Any brief claiming them as new is wrong.

**9. Two false feature tiles, with different footprints.**
- *"Detects leaks instantly — Identifies abnormal water flow in real time"* — the string `abnormal water flow` is on **7 pages**: `/buy-now-lander/`, `/book-a-call/`, `/book-a-call-tradeshow/`, `/blog/page/8/`, `/how-climate-change-is-increasing-residential-water-leak-risk-…/`, `/smart-leaks-vs-dumb-leaks-…/`, `/why-every-building-needs-an-automatic-water-shut-off-valve-…/`.
- *"Automatic shut-off — Closes the main water supply immediately after a leak is detected"* — **`/buy-now-lander/` only (1 page).**

There is no flow sensing of any kind, and it does not close the main. **Both are false. Flag for correction; never repeat.**

**10. "Prevents costly callbacks & warranty claims through instant leak alerts"** (`/partner/`, Builders).
There are no alerts to any person. The device beeps locally. **Do not use "alert" language for this product.**

**11. "No tools needed" — two content pages, and three better contradictions.**
The genuine aquaHALT no-tools claims are on **two** content pages: `/smart-leak-detection-without-the-smart-home-hassle/` (*"Install It in Seconds - No Tools Required"* and *"No tools needed: truly DIY-friendly"*) and `/why-you-need-a-water-leak-control-device-like-aquahalt/` (*"installs in about 10 minutes—no tools needed"*). **Do not cite `/toilet-leak-repair/` or `/blog/page/8/`** — there, "No tools required" describes replacing a toilet **flapper**, not installing the device, and citing it would be unfair and wrong.

Three stronger contradictions to use instead: `/water-leak-protection-dallas/` (*"thread the supply hose, hand-tighten, done"*); `/stop-leaks-before-they-start-your-toilet-needs-an-aquahalt-2x/` (*"Tighten connections gently. A secure twist is all it takes"*); and the comparison table on the homepage and all 8 city pages (*"Professional installation needed: No — 10 min DIY"*). All three collide with the manuals' own *"snug so that you cannot unscrew it with your hand"* and with "Tools (Not Included): Small Adjustable Wrench, Small Level". **Never write "no tools".**

**12. "Installs in about 10 minutes" / "under 10 minutes per unit"** (`under 10 minutes per unit` on **9 pages**).
Plausible for someone who has done it before, on a wall stop that closes. Unsupported as a general promise, and it collides with the manuals' "replace the wall valve first" note. **Qualify or drop.**

**13. "Compatible with … dishwashers, washing machines, and similar appliances"** (`/buy-now-lander/`, one page, in full: *"aquaHALT installs anywhere a standard water supply hose is used. Compatible with toilets, bathroom and kitchen sinks, ice makers, dishwashers, washing machines, and similar appliances. If the fixture is fed by a hose, aquaHALT can protect it."*).
There is no product for either, and the manuals document only 3/8" and 1/4" compression fittings. **Do not repeat. This is also a content opportunity — see concept 2.**

**14. "Featured Partners" — seven property-management logos on `/partner/become-a-partner/`.**
Douglas Elliman Property Management, FirstService Residential, Halstead Management, Maxwell-Kates Inc., KW Property Management & Consulting, Charles H. Greenthal & Co., Choice New York Companies. Identified by opening the image files (`image-9.png` through `image-15.png` and `image-1282.png`); **all seven carry the same keyword-stuffed alt text, *"diy water leak protection"***. No caption, no stated relationship, no link, on a page nothing in the navigation links to. If these relationships are real and documented they are worth more than every award badge combined — **but do not describe them as customers, partners or references until the client confirms the relationship in writing.** Displaying another company's mark without a stated basis is a legal exposure, not just an SEO one.

**15. City-page copy that is factually wrong about its own city.** Verified 13 Sep 2026:
- `/water-leak-protection-boston/` says *"Best leak detector for commercial buildings in Chicago"*
- `/water-leak-protection-dallas/` says *"…in NYC"*
- `/water-leak-protection-miami/` says *"Trusted by property managers across the five boroughs"*
- `/water-leak-protection-washington-dc/` says *"Whashington's Best Leak Detection"*
- `/water-leak-protection-dallas/` asserts *"mould developing within roughly 48 hours in Texas heat"* — unsourced, and British spelling

**Fix before anything else on those pages. Never quote them as a source.**

**16. ⚠ URGENT REMEDIATION, NOT A FOOTNOTE — the fabricated case study.**
`/how-automated-shut-off-valves-averted-a-major-flood/` is headed *"Case Study: How Automated Shut-Off Valves Prevented a Catastrophe in a Multi-Unit Building"*, calls itself *"a real-world scenario"*, and supplies invented specifics: a 30-story tower, 2:00 AM on a Tuesday, a 25th-floor failure, 24 units below, detection *"within 30 seconds"*, shutoff *"within two minutes"*, and an avoided loss of *"$500,000 – $1,000,000+"*. **None of it is attributed** — no building, no firm, no date, no source. And the system it describes is **not aquaHALT**: mainline valves, a flow sensor, a central hub, SMS to an on-call manager, a cloud dashboard.

**This is a fabricated case study presented as fact on a live commercial site, and it is the highest-risk asset on the domain.** It is the single fastest way to lose an insurance or property-management conversation. Raise it with the client as an immediate take-down, ahead of any content work. Never cite it, never reproduce its numbers, never write anything in its shape.

**17. Author metadata.** The author name in page metadata is spelled **"Greg Cappizi"** on **24 pages** against "Gregory Capizzi" on 2 and "Greg Capizzi" on 2. Get the correct legal spelling before any author schema is published.

---

## Content rules for this account

**1. US English. This account is the exception to house style.** Organize, optimize, color, program, mold, meter. Dollars. US spelling in body copy, headings, titles and metadata. Never Rand, never "programme", never "optimise". **The site currently uses "Recognised" on 14 pages and "mould" on the Dallas and Houston pages — both need fixing.**

**2. Cadence: two to three genuinely new pieces a month, and nothing else.** This site does not have a volume problem. It has 135 posts and effectively no organic authority. **The highest-return work for the next quarter is consolidation and correction, not publication.** Every publishing slot spent on a near-duplicate is a slot not spent fixing the 147 pages with no H1.

**3. ⚠ Fix the "See also" template before publishing any new post.** 129 of 135 posts carry a duplicated block, and on 125 it is byte-identical. Median block: **32,902 characters**; median own body: **4,072**; **median share of page text: 89%** (method below). The block is an Elementor Loop Grid using `elementor-widget-theme-post-content`, which renders the **full body** of four templated posts inline on every page — which is why *"Do not climb onto damaged roofs"*, from a template written for a roofing company, appears on **130 of 182 pages**. **Any new post published into this template inherits roughly 5,000 words of duplicate content wrapped around its own 700.** Until the widget is changed to show titles and excerpts, no cannibalisation judgement about any new post is meaningful, because the duplication that would actually harm it is structural rather than topical.

**4. Originality is the entry requirement, not a bonus.** Every brief must name, in one sentence, the specific fact or analysis on the page that does not currently exist elsewhere on the web. *"A comprehensive guide to X"* is not an answer. The realistic sources of genuine originality on this account are exactly four:
   - **The three installation manuals, read as rendered images** — operating states, the 2020-vs-2025 divergence, the exact install sequences, the removal failure modes, the sensor-touches-the-floor requirement, the connection sizes.
   - **First-hand arithmetic and counting** nobody else has bothered to do, using real published figures.
   - **Honest treatment of the product's limits**, which competitors will not write.
   - **Answering the specific questions the research surfaced that have no good answer anywhere.**

   **And before it is commissioned, run a five-sites test:** search the claimed-original fact; if five distinct domains already publish it, it is not original. Two of the three original concepts for this account failed that test on their first pass.

**5. No invented numbers, and quantifiers count as numbers.** "Most", "typically", "many homeowners", "roughly half", "within 48 hours", "largest volume", "highest demand" are all numeric claims. Every figure needs a source we opened ourselves, a URL, and the date we checked it. If it can't be sourced: cut it, or write it qualitatively. Assume AI-assisted drafting has inserted confident-sounding numbers and go looking for them.

**6. Answer first, detail second.** Headings phrased as the question a buyer would type. The first 40–75 words under each must make sense quoted on their own.

**7. Real `<table>` markup** for anything comparative. Never a grid of `<div>`s. The homepage comparison table is already a proper `<table role="table">` — that is the standard to hold. Only 30 of 183 pages contain any table at all.

**8. No `aggregateRating` or `review` markup on Organization or LocalBusiness schema.** Google's structured-data documentation treats reviews about an entity placed on that entity's own page as self-serving and ineligible for the review snippet — the markup is ignored rather than rewarded. Plain HTML testimonials are fine. The site displays a Trustindex widget sourced from Amazon showing "EXCELLENT — Based on 72 reviews" — leave it as display markup and keep it out of entity schema. (Confirmed: `aggregateRating` appears on 0 pages today. Keep it that way.)

**9. Never mass-generate location pages.** There are already eight, and each shares **95.0–96.2%** of its text lines with the homepage (16–18 lines of its own out of 337–339; method below), plus an identical H1. **Do not add a ninth.** Cap geo pages at three to five, each with something genuinely local. `/water-leak-protection-boston/` has the best local material on the site (brownstones, triple-deckers, student-housing turnover) and is the model for what a kept page should look like.

**10. Rename URLs before the sitemap is submitted.** Google's site-move documentation treats 301s as the correct method but notes that rankings can fluctuate while a move settles — so a rename that happens before anything is indexed avoids that window entirely, at no cost. Once URLs are indexed, the rename becomes a migration with a settling period. Do it now, not later.

**11. One page per query cluster.** If a brief overlaps an existing URL, the deliverable is a consolidation plan — which URL survives, what merges into it, what 301s where — not a new post.

**12. Don't write for the negative category.** A large slice of the blog sells IoT, smart meters, real-time flow monitoring, app alerts and dashboards — the exact category this product deliberately is not in. Four existing posts actively recommend Flo by Moen, Phyn Plus and Govee to the reader. **Never write a sentence that sells a capability this device lacks.**

**13. Don't optimize for grading tools.** Lighthouse SEO scores, SEOptimer and similar are vendor checklists, not ranking factors. Diagnose from Search Console and the real SERP.

**14. Never promise a ranking position, a traffic figure, or a date for page one.** Promise the work, the cadence and the reporting.

---

## What already exists

### Topic clusters and saturation

**Do not pitch anything in a `saturated` row.** A `covered` row needs a consolidation plan before anything new is added.

| Cluster | Posts | Saturation |
|---|---:|---|
| Commercial / facility-manager water automation (IoT, smart buildings, ROI) | 23 | **Saturated** |
| Generic "leaks are silent and cost you thousands" | 15 | **Saturated** |
| Toilet leaks, running toilets, toilet noise, toilet water usage | 14 | **Saturated** |
| First-person "how I use aquaHALT" testimonial posts | 13 | **Saturated** |
| Apartment / multifamily leak detection ("non-negotiable", "not optional") | 12 | **Saturated** |
| Generic home water-damage prevention ("5 ways to stop water damage") | 11 | **Saturated** |
| Template-spun "planning guide" posts (Aug 2026) | 4 | **Saturated** |
| Leak detection methods and tools (acoustic, thermal, sensor selection) | 10 | Covered |
| Product promos (2X, Flip, ICE, H/C) — always in near-identical pairs | 8 | Covered |
| Insurance, claims and coverage exclusions | 6 | Covered |
| Automatic shut-off valve as a category ("why every home needs one") | 5 | Covered |
| Landlord / property-manager operations and turnover checklists | 3 | Thin |
| No-Wi-Fi / deliberately-dumb positioning — **the actual differentiator** | 3 | Thin |
| Environmental cost of leaks / water waste | 2 | Thin |
| Causes of leaks / vulnerable plumbing components | 2 | Thin |
| Seasonal and regional risk (winter freeze, climate) | 2 | Thin |
| Water damage repair costs | 1 | Thin |

*(The "product promos" row counts 8 posts whose subject is a named SKU. For the record, 11 post slugs contain "aquahalt" and 13 posts name a specific SKU in the body — prefer the named list to the count when it matters.)*

### Near-duplicate groups — pick the survivor, 301 the rest

**Running toilets and water bills (7).** `how-much-water-does-a-running-toilet-use` · `how-much-water-does-a-running-toilet-use-2` · `can-leaking-toilet-increase-water-bill` · `can-a-running-toilet-increase-your-water-bill` · `is-your-toilet-wasting-water-how-to-check-and-fix-it-fast` · `toilet-leak-repair` · `how-to-tell-if-your-toilet-is-leaking` — **Nobody writes number eight.**

**Toilet noise (3).** `how-to-fix-a-humming-toilet` · `why-your-toilet-is-humming-stop-toilet-noise-with-some-quick-tips` · `why-is-my-toilet-making-noise-when-not-in-use`

**Toilet water usage (2).** `how-much-water-does-a-toilet-use-per-flush` · `how-much-water-the-toilet-uses`

**Apartments — "essential/non-negotiable" (5).** `why-leak-detection-for-apartments-is-non-negotiable` · `why-leak-detection-in-apartments-isnt-optional-its-essential` · `why-leak-detection-in-apartments-shouldnt-be-an-afterthought` · `water-damage-in-apartments-prevention-isnt-optional-its-essential` · `water-leak-detection-for-apartments-a-smart-investment-in-prevention`

**Apartments — ripple/risk (4).** `prevent-water-damage-in-apartments` · `hidden-water-leak-risks-apartments` · `one-leak-five-floors-…` · `how-smart-sensors-are-changing-the-game-in-apartment-leak-detection`

**First-person testimonial (10).** `how-i-use-an-automatic-water-shut-off-valve-to-protect-my-property` · `why-i-installed-water-leak-detectors-in-my-home-and-why-you-should-too` · `i-was-one-forgotten-leak-away-from-disaster-…` · `the-quiet-protector-…` · `invisible-leaks-cost-big-…` · `leaks-dont-announce-themselves-…` · `why-a-smart-water-leak-detector-is-my-most-valuable-home-upgrade` · `leak-detection-the-most-underrated-home-investment-you-can-make` · `what-gets-measured-gets-managed-…` · `how-often-do-you-actually-check-for-leaks-…`

**"Silent destroyer" / hidden cost (6).** `the-silent-destroyer-how-to-outsmart-…` · `the-silent-destroyer-in-your-walls-…` · `the-silent-destroyers-how-hidden-leaks-ruin-homes-and-wallets` · `hidden-dangers-of-water-leaks` · `the-hidden-cost-of-water-leaks-and-how-aquahalt-can-save-you-big` · `the-cost-of-silence-…`

**"Save you thousands" (11 slugs contain "save").** `can-water-leak-detection-save-you-money` · `how-a-leak-detector-with-auto-shut-off-can-save-thousands-and-peace-of-mind` · `how-a-smart-leak-detector-can-save-you-thousands` · `how-automated-water-leak-detection-saves-commercial-buildings` · `how-can-leak-detection-technology-save-you-thousands-…` · `how-to-detect-and-fix-water-leaks-early-to-save-money-…` · `how-water-leak-detection-can-save-your-business` · `how-water-leak-detectors-can-save-your-home-and-your-wallet` · `i-was-one-forgotten-leak-away-from-disaster-how-aquahalt-saved-the-day` · `the-cost-of-silence-how-early-leak-detection-can-save-thousands` · `the-hidden-cost-of-water-leaks-and-how-aquahalt-can-save-you-big`

**Generic prevention (8).** `stopping-water-damage-before-it-starts` · `water-vs-home-preventing-water-damage-in-your-house` · `the-prevention-blueprint-5-ways-…` · `stop-the-drip-before-it-drowns-you-…` · `water-damage-is-silent-and-brutal-…` · `how-to-prevent-costly-water-damage-with-smart-prevention-systems` · `how-to-protect-your-property-with-smart-water-damage-prevention-systems` · `protect-your-property-the-smart-way-…`

**Business/commercial savings (6).** `why-water-leak-detection-is-critical-for-businesses-in-2025` · `can-water-leak-detection-save-you-money` · `how-water-leak-detection-can-save-your-business` · `why-water-leak-detection-shouldnt-wait` · `stop-the-drip-how-to-detect-water-leaks-before-they-drain-your-budget` · `what-are-the-best-leak-detection-tools-for-commercial-properties`

**Commercial buildings (4).** `water-leak-detection-for-commercial-buildings` · `commercial-water-leak-detection-systems` · `smart-leak-detection-for-commercial-building-complete-guide` · `how-automated-water-leak-detection-saves-commercial-buildings`
⚠ **The first and last are the only two URLs on the domain observed being cited by an AI answer engine. Protect them. Do not merge them away without checking.**

**Smart water management (5).** `the-ultimate-guide-to-smart-water-management-in-commercial-properties` · `the-hidden-costs-of-small-leaks-in-commercial-facilities…` · `smart-water-automation-systems` · `enhancing-water-management-efficiency-through-automation` · `how-can-smart-leak-detection-revolutionize-your-propertys-water-management`

**Water waste (4).** `reducing-water-waste-with-automated-systems-in-commercial-buildings` · `beyond-the-bill-…` · `why-water-leaks-are-costing-more-than-your-water-bill` · `why-water-leaks-hurt-more-than-your-home-…`

**Facility managers (3).** `why-facility-managers-are-turning-to-water-automation` · `iot-and-water-management-…` · `signs-your-building-needs-a-water-automation-system`

**Insurance (4).** `water-damage` · `hidden-water-damage-and-insurance-…` · `when-insurance-wont-pay-…` · `water-sensors-for-insurance`

**Shut-off valve category (6).** `why-every-home-needs-an-automatic-water-shut-off-valve` · `why-every-building-needs-…` · `why-every-property-needs-a-water-leak-control-device-in-2025` · `why-you-need-a-water-leak-control-device-like-aquahalt` · `automatic-water-leak-detection-and-shut-off-system` · `how-a-leak-detector-with-auto-shut-off-can-save-thousands-…`

**Ice makers (3).** `protect-your-ice-maker-and-your-kitchen-with-aquahalt-ice` · `smart-protection-for-kitchen-ice-makers` · `from-ice-makers-to-sinks-my-diy-water-defense-plan-with-aquahalt`

**Sinks / H/C (3).** `double-trouble-meet-the-aquahalt-h-c-for-your-sink` · `total-under-sink-defense-with-aquahalt-h-c` · `my-under-sink-solution-for-office-break-room-leaks`

**Toilet product promos (3).** `stop-leaks-before-they-start-your-toilet-needs-an-aquahalt-2x` · `defend-your-home-toilets-first` · `detection-is-protection`

**Detect-and-fix methods (5).** `how-to-detect-and-fix-water-leaks-early-…` · `proven-methods-to-detect-fix-and-prevent-damage-from-leaks` · `2435` · `why-home-water-leaks-are-so-dangerous-and-how-to-stop-them` · `the-hidden-threat-of-home-water-leaks-…`

**DIY detection (3).** `diy-water-leak-detection-that-actually-works` · `the-silent-destroyer-how-to-outsmart-…` · `diy-leak-protection-insurance-headache-prevention`

**Pure spun template — one skeleton, keyword swapped (4).** `automatic-shutoff-vacation-home` · `water-leak-protection-for-new-construction-specify-early` · `fixture-level-leak-detection-apartments` · `commercial-restroom-leak-detection-a-facility-plan`
These four are the posts the "See also" Loop Grid renders **in full** on 130 of 182 pages, which is how *"Do not climb onto damaged roofs"* got everywhere. **Delete or rewrite entirely; never cite. Fixing the widget is the higher priority.**

**City pages (8).** `water-leak-protection-` + `boston` · `chicago` · `dallas` · `fort-lauderdale` · `houston` · `miami` · `new-york` · `washington-dc`

### Structural problems measured, not assumed

All counted on 13 Sep 2026 against `_raw/` (the 8 Sep 2026 capture, 182 files) unless the row says otherwise. Method given so you can re-run each one. Text extraction throughout: strip `<script>`, `<style>`, `<noscript>`, `<svg>` and comments, tolerating malformed closing tags (see the last row); split the remainder at every tag boundary; trim and drop empties.

| Finding | Figure | Method |
|---|---|---|
| **Pages with no `<h1>` at all** | **147 of 183** (working copy; `_raw/` behaves the same) | Regex count of `<h1[\s>]` per file |
| The homepage and all 8 city pages share the H1 **"Where and how to order the product"** | 9 pages | First `<h1>` extracted per file |
| **Posts carrying a duplicated "See also" block** | **129 of 135**; **125** carry a byte-identical version | Line extraction split at the `See also` line; MD5 of the block |
| **Size of that block** | median **32,902 chars**; median own body **4,072 chars**; **median 89%** of page text | Same method. *(An earlier note published 59% from a different element set. 89% is what this method returns; publish the method with the figure, or say "the large majority of the text on nearly every post" and skip the decimal.)* |
| `"Do not climb onto damaged roofs"` — roofing-template boilerplate | **130 of 182 pages** | Sitewide string count |
| Duplicate `<title>` pairs | **3** — `/water-sensors-for-insurance/` + `/why-is-my-toilet-making-noise-when-not-in-use/`; `/the-hidden-costs-of-small-leaks-…/` + `/the-ultimate-guide-to-smart-water-management-…/`; `/my-account/` + `/my-account/lost-password/`. **180 distinct titles across 183 pages** | `<title>` extraction and grouping |
| `/product/aquahalt-2x/` serves the **Flip's** meta description | 1 page | Meta extraction |
| Pages with no meta description | **12** | `<meta name="description">` extraction |
| City pages vs the homepage | **16–18 unique lines out of 337–339; 95.0–96.2% overlap** | Line-set difference against the homepage, same extractor |
| `<form>` elements | **40 total, 36 with no `action`, across 38 pages** | Regex over `<form …>` tags. *(An earlier note cited 62 forms across 30 pages; not reproducible. Use 40/36/38 or re-count.)* |
| `/installation/` | **navigation shell, no body content** — 1,070 chars of visible text, all header/footer nav | Script/style-stripped text |
| `/demo/` | Same — 1,057 chars, nav only | Same |
| `/case-studies/` | Renders *"No articles for Case Studies found."*, linked from the footer of every page | Direct read |
| `/q-and-a/` | Seven tabs, each containing only a YouTube Short. **Not one word of answer text.** Also carries the Chubb "Vetted by" block | Direct read |
| `/sample-page/` | Still the default WordPress placeholder, live and indexable | Direct read |
| `/builder-lander/` and `/habtrack-lander/` | **Identical visible body text, differing only in `<title>`** ("DIY Water Leak Detection & Automatic Shut-Off Valves" vs "DIY Water Leak Protection \| WaterAutomation.com") | Visible-text comparison. Character count varies with extraction method — the finding is the identity, which is independently checkable |
| No phone number, no physical address anywhere, including `/contact-us/` | Two email addresses plus Facebook and Instagram | Direct read |
| No privacy policy page exists | "Privacy Policy" appears on exactly **1** page, `/checkout/`, with no target | Sitewide string count |
| "Warranty" appears on exactly **1** page, and refers to a *partner's* warranty claims | `/partner/` | Sitewide string count |
| **No certification language anywhere** | "NSF", "lead-free", "UPC", "IAPMO" — **0 pages each** | Sitewide regex |
| **Patent No. 10,895,068 appears on 0 pages** | Only in the three PDF manuals | Sitewide string count |
| **"Low battery" appears on 0 pages.** "Replace the batteries" — **0 pages** | The manuals document the behavior; the website documents none of it | Sitewide string count |
| **"$13.00" appears on 0 pages** | The per-item shipping rule is invisible until checkout | Sitewide string count |
| **No H/C manual and no H/C install video exist** | 3 manuals and 3 videos, linked from all 182 pages; none for the sink model | Sitewide link extraction |
| **Malformed script closing tags** | e.g. `</script` with no `>` on `/builder-lander/`. Browsers recover, but any crawler, parser or rebuild script that doesn't will swallow the rest of the page | Found while building the text extractor. **Fix on rebuild** |
| Pages containing any `<table>` | **30 of 183** | Regex over `<table[\s>]` |

---

## Open questions for the client

These genuinely block good work. Nothing important should ship until the starred ones are answered.

**★ 1. Service life: 10 years or 15?** `/buy-now/` says 10 under every device; five blog posts say 15. We will publish neither until you tell us which the manufacturer stands behind, and whether it differs by model.

**★ 2. Battery life: which figure is real?** The site publishes six different aquaHALT answers, from "every six months" to "up to two years". You have told us the manufacturer's rating is up to five years. Under what conditions — standby only, or including a shutoff event? Does it differ by model? What replacement interval should a property manager budget for across hundreds of devices?

**★ 3. The manuals were revised and now disagree. Which is current?** The 2020 2X manual says one blinking LED means *"low power, device will turn off after 8 hours"* and that the alert *"will only last 2 min if 'close' is not pressed"*. **The 2025 FLIP and ICE manuals contain neither statement.** Did the behavior change, or only the wording? And the question that follows from it: **when the device powers itself off on low battery, does the valve stay CLOSED or release OPEN?** Neither wording answers it. For the unoccupied-property buyer — the segment where this product is strongest — **that is the single most important unanswered question about the product**, and we cannot write for that segment honestly without it.

**★ 4. "Chubb-vetted": what exactly?** What did the vetting involve, who at Chubb conducted or signed it, on what date, is there a document we can link, and does aquaHALT appear on any Chubb-published device list? If the answer is "a conversation", we will rewrite every instance rather than defend it — starting with the meta descriptions of all 8 city pages. Related: is there **any** carrier that offers a premium credit for this specific device? Named, in writing.

**★ 5. The seven "Featured Partners" logos.** Are Douglas Elliman, FirstService Residential, Halstead, Maxwell-Kates, KW Property Management, Charles H. Greenthal and Choice New York actual customers, resellers, referral partners, or none of the above? Is there written permission to display each mark?

**★ 6. `/how-automated-shut-off-valves-averted-a-major-flood/` — take it down.** It is a fabricated case study with invented figures, describing a product you do not sell, presented as fact. This is the one item on the list we would act on before anything else.

**7. TIME Best Inventions 2023 — is there a link?** A URL to the published list, or we drop the badge.

**8. Warranty.** There is no published term anywhere. What is the warranty period, what does it cover, what voids it, and what is the claim process? A property manager deploying 200 units cannot take "30-day returns" to a board.

**9. Bulk pricing and bulk shipping — and is per-item shipping staying?** Is there a volume price break, and at what quantities? **Is the $13.00-per-item rule what you actually want?** `COMMERCE.md` flags it as undecided. We will not publish landed-cost arithmetic until you confirm, because a post built on it can be wrong the day the new checkout ships.

**10. The Amazon channel.** Is there any difference in price, shipping, warranty or support between buying on the site and buying on Amazon? Nobody has opened the listings and recorded the terms. Every "Switch to Amazon" button points at one ASIN (B09PF2YCPM) and the deep link still carries someone's copied browser session parameters.

**11. The sink model, and its missing documentation.** How long has aquaHALT H/C been out of stock, and when does it return? **And why is there no H/C installation manual and no H/C install video, when all three other devices have both, linked from every page?** It is the only product covering the most-used fixture in a home, it is promoted by name on the homepage and every city page, and today it is unbuyable and undocumented. If it is discontinued we need to know now.

**12. Washing machines, dishwashers and water heaters.** `/buy-now-lander/` says *"If the fixture is fed by a hose, aquaHALT can protect it"* and names dishwashers and washing machines. There is no product for either, and the manuals document only 3/8" and 1/4" compression. Is a product planned? Is there a supported adapter path? If not, that line has to come down and we will write the honest version instead.

**13. Commercial fixture fit.** Do any of the five SKUs fit a commercial restroom — flushometer valves on 1" or 1-1/4" supply, not a 3/8" compression stop? If not, 23 existing blog posts are pointed at buyers the product cannot serve.

**14. Certification and code.** Is the valve lead-free / NSF-61 compliant? Is it listed to anything a spec writer or code official recognizes? Does fitting it void a toilet, faucet or refrigerator manufacturer's warranty? Builders will ask all four.

**15. Water conditions.** What pressure range is it rated for? Well water, hard water, behind a softener — any known issues?

**16. Legal entity.** The 2X manual says "Water Automation Corp" (©2020); the FLIP manual says "water AUTOMATION LLC" (©2025); **the ICE manual's licence line reads "Assembled in USA under license from LLC" with the company name missing from the print.** Which is the trading entity, for schema, for the footer and for partner agreements — and can the ICE artwork be corrected? And what is the correct spelling of the founder's name? Page metadata says "Greg Cappizi" on 24 pages.

**17. Contact details.** Is there a phone number and a physical address we can publish? For a product a property manager is asked to deploy across 200 units, with no published warranty, their absence is a serious credibility gap — and a real local-SEO constraint.

**18. Who are your actual buyers?** We have no verified data on portfolio sizes, typical order sizes or repeat rates. Everything in *Where the money is* is fixture-count arithmetic, not observed behavior. The order history is in WooCommerce and `COMMERCE.md` flags the export as unrecoverable once WordPress is switched off. **Export it before cutover.**

**19. Privacy policy.** The `/my-account/` registration form refers to "our privacy policy" and there is no such page. The site collects names, emails and phone numbers and takes card payments. This needs writing before anything else is published.

**20. Is there a single real, nameable deployment?** One building, one landlord, one association, with permission to write it up. One real, attributable account would do more for the two highest-value segments than another twenty blog posts — and it would let us delete the fabricated one.
