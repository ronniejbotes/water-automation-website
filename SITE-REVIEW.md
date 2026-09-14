# Site review — waterautomation.com

Ten reviewers worked the static mirror at `localhost:4400` in parallel — mobile and desktop rendering, technical SEO, content accuracy, commerce, forms, accessibility, performance, internal linking and trust/legal — then every finding was re-checked by an adversarial verifier who re-ran the measurements, opened the cited sources, and downgraded or corrected anything that did not survive. Roughly a third of the original severities were corrected; the figures below are the verifier's, not the reviewer's. The honest headline is three things. **First, the site publishes statements that are not true** — about two named competitors, about a named insurer, about what aquaHALT physically does, and about what it costs. Those are live on production today and they are the largest exposure on this list; several are refuted by the client's own blog posts two clicks away. **Second, the static mirror cannot take an order or capture a lead.** Add to cart does nothing, the cart panel opens blank on 181 of 182 pages, and all thirty form pages POST to an endpoint a static host cannot serve — the visitor sees a bare lowercase "error". That is a cutover blocker, not a live loss, because production is still WordPress. **Third, the site's structure is working against it**: more than half the pages cannot be reached from the homepage, the storefront tells Google it is a duplicate of the homepage, and about 90% of a typical blog post is four other blog posts repeated in full.

Two corrections to the brief, both verified, because work will be mis-scoped without them: the dead forms do **not** show a success message (they render `<div class="elementor-message elementor-message-danger">error</div>`), and the three stacked mobile overlays **are** already fixed below 768px by an existing `<style id="wa-overlay-hygiene">` block on every page — the unfixed half is 768px and up.

---

## Fix this week

### 1. Nothing on the site can be bought

*Found by: commerce-conversion, mobile-visual, desktop-visual.*

Three separate failures on the same path. `button.single_add_to_cart_button` POSTs to the page itself, gets a 200 back, and shows no message of any kind — the cart badge stays `$0.00 0` and no notice element exists. On `/shop/` the AJAX button POSTs to `/?wc-ajax=add_to_cart`, which returns 247,371 bytes of homepage HTML, so the spinner turns indefinitely. The floating cart pill — the only cart affordance on a phone — opens a full-height blank white sheet with a close X and nothing else, on 181 of 182 pages, at **both** mobile and desktop breakpoints (the desktop widget `.elementor-element-dbae0af` carries no hidden-breakpoint classes; the reviewer originally tested only mobile). Eighteen purchase surfaces are affected, including flip-box "Add To Cart" links on the homepage and all eight city pages that loop back to the homepage. Separately, `/checkout/` ships a stranger's frozen session: `aquaHALT 2X – Toilet 1 × $157.99`, `Taxes $11.06`, `Total $169.05` baked into the HTML as literal strings (and again as `1106` / `16905` in the block hydration payload), shown to every visitor regardless of cart, with $0 shipping against a verified $13.00/item rate.

**Fix.** Until a real cart exists, remove the WooCommerce add-to-cart UI, the `.elementor-menu-cart__container` markup, the cart-fragments enqueue and `/cart/` and `/checkout/`, and point every purchase CTA at the correct per-model Amazon listing. Then ship the Snipcart plan already in `COMMERCE.md` — note that file's own line 24: no SKUs are set on any product, so that is the first blocker. Also strip the live Stripe publishable key and the frozen `mids[muid]`/`mids[sid]` device identifiers out of the captured checkout.

**Size.** Removal and Amazon fallback: one day. Real cart: 1–2 weeks, blocked on client answers (SKUs, per-model ASINs, shipping model).

### 2. The comparison table states something false about Flo by Moen and Phyn Plus

*Found by: content-accuracy (the claim), mobile-visual and desktop-visual (the same table, different defects).*

On the homepage and all eight city pages, under the heading "Why Property Professionals Choose aquaHALT Over Flo by Moen & Phyn", the row **Source Shutdown** reads `Shuts off at the source | Notifies you only | Notifies you only`. Both competitor products are sold as automatic shutoff valves. Moen's own page: *"If your system detects a leak, your smart water valve will automatically close to prevent flooding — all without you even lifting a finger."* Phyn's own help centre: *"If you do not respond within the specified time window, Phyn will automatically shut off your water."* (Both opened 14 September 2026.) This is comparative advertising making a false statement of fact about identified competitors, and the client's own blog refutes it — `/how-a-smart-leak-detector-can-save-you-thousands/` says *"Some models (like the Flo by Moen or Phyn Plus) can even cut off the water supply immediately"*. Two more cells in the same table are also false or unsupported: `Award recognition: None listed` for Phyn, whose own press release lists Red Dot, CES Innovation and SXSW awards; and `Phyn Plus: Yes — 30-day setup`, a day count Phyn does not publish.

Three separate rendering defects sit on the same table. Below 680px, `@media(max-width:680px){.aqt-th-f,.aqt-td-f{display:none}}` (index.html:1254) hides the entire Feature label column — 11 cells at 390px — so rows read `Yes — fixture level | No — mainline only | No — mainline only` with no question attached. At **every** viewport, the tick/cross icons are inverted against the text on three rows: aquaHALT's "No — 10 min DIY" and "No — fully standalone" get a red ✗ (`stroke="#A32D2D"`) while the competitors' "Yes — licensed plumber" and "Yes — app dependent" get a green ✓. A skimmer reading icons reads the table backwards. And at 390px the third column clips mid-word — "Yes — 30-day setup" renders as "Yes — 3 / day setup", misstating a competitor's figure.

**Fix.** Rewrite the row to the true and stronger distinction: `Where it shuts off` → "At the fixture" / "At the main" / "At the main". Delete the award and 30-day cells or cite them. Make the icon agree with the verdict, not the literal yes/no. Restack the table into per-feature blocks below 680px instead of hiding the label column — dropping it bought 22% of width and still did not fit three columns.

**Size.** Copy and icons: two hours across 9 files. Responsive restack: half a day.

### 3. The price published on eight URLs is $150; the cheapest delivered unit is $170.99

*Found by: content-accuracy.*

Six blog posts and two blog index pages state `$150` as aquaHALT's price — "Affordable: $150 flat — no subscriptions, no hidden fees", "Your $150 Leak Bodyguard", "For $150, you get a battery-powered leak detection device". Verified prices are $157.99–$187.99 plus $13.00 per item shipping, so the cheapest landed unit is $170.99 (14% above) and the H/C is $200.99 (34% above). One instance sits in the `<meta name="description">`, the `og:description` **and** the JSON-LD `description` of `/the-little-leak-detector-that-could-meet-aquahalt/` — so Google advertises $150 in the SERP snippet before a buyer ever reaches the site. `/hidden-dangers-of-water-leaks/` also runs derived arithmetic: "$11,000… That's enough to buy 73 aquaHALT devices" ($11,000 ÷ 73 = $150.68).

**Fix.** Delete every price from editorial content — the meta description first, since it is the only instance visible without a visit. Replace with "from $157.99" linked to `/buy-now/`, or no number. Delete the "73 devices" sentence rather than recomputing it. Delete "flat" and "no hidden fees" from `/the-silent-destroyers.../` — $13/item is a hidden fee by any plain reading. Content rule: no price, and no figure derived from a price, outside `/buy-now/` and `/product/*`.

**Size.** Two hours.

### 4. "Chubb-vetted" on 14 pages, including eight SERP snippets, with no evidence anywhere

*Found by: content-accuracy and trust-legal, independently.*

A named insurer's endorsement is asserted in visible copy on 14 pages (homepage, about-us, buy-now, contact-us, partner, q-and-a and all eight city pages), using Chubb's registered wordmark under an `<h3>Vetted by</h3>`, alongside the exclusivity claim *"aquaHALT is the only Chubb-vetted, award-winning automatic water shutoff system"*. Nine pages carry that superlative. Worse than reported: "Chubb-vetted" is in the `<meta name="description">` of **all eight city pages** (Miami: *"…Chubb-vetted, salt-air ready. Bulk pricing."*), so it is the first thing an underwriter or broker reads in the SERP; and `page-sitemap.xml` submits `chubb_clean.png` as an `<image:loc>` on 14 URLs, actively offering Chubb's wordmark to Google Images under this domain. There is no document, letter, programme name, scope or date anywhere in the repo, and the logo carries `alt=""`. A related claim, *"Recognised by leading insurers for measurable risk reduction"*, names nobody and uses a British spelling on an en-US site.

**Fix.** Strip it from the eight meta descriptions first — that is a one-line change each and it is what the most sceptical audience sees. Then the two `og:image` tags, the 14 sitemap image entries, the visible block, and the "Insurer vetted" table row. Get from the client, in writing: what "vetted" meant contractually, who at Chubb, on what date, whether aquaHALT appears on any Chubb-published list, and whether wordmark use was granted. If it is real, state it once, dated and specific, linked to the source. Delete "the only" regardless — it is an unprovable market-wide negative. Lead instead with TIME Best Inventions 2023, which is real, linkable and correctly handled already (`https://time.com/collections/best-inventions-2023/6324170/water-automation-aquahalt/` — note the site links the singular `/collection/` form, which 301s).

**Size.** Meta descriptions: 30 minutes. Full removal: two hours. Blocked on one client answer.

### 5. The pages that sell the product describe a different product

*Found by: content-accuracy, commerce-conversion.*

aquaHALT is a battery valve on one fixture's supply hose, with a wired floor sensor, a local buzzer that self-silences after two minutes, and no connectivity of any kind. Across the commercial pages it is sold as something else:

| Claim, as published | Where | What is true |
|---|---|---|
| "Identifies abnormal water flow in real time"; "Closes the **main water supply**" | `/buy-now-lander/` — the destination of 190 header "Buy now" links across 183 pages | No flow sensing. Closes one fixture's supply. |
| "Compatible with toilets, bathroom and kitchen sinks, ice makers, **dishwashers, washing machines**… If the fixture is fed by a hose, aquaHALT can protect it." | `/buy-now-lander/`, "Where It Works", above a Buy now CTA | Five SKUs: 3/8" toilet, 3/8" sink, 1/4" ice maker. No dishwasher or washing-machine fitting is sold. |
| "your **entire building** is protected — all with a device powered by just 2 AA batteries"; "safeguard every floor, unit, and corner" | `/partner/` plus 10 others incl. the homepage | One device per fixture. |
| "Prevents costly callbacks & warranty claims through **instant leak alerts**"; "Simply **snap it onto pipes**"; "fast, **tool-free** setup—no plumbers" | `/partner/` | No alerts to any person. Threads inline with an adjustable wrench. |
| "aquaHALT can be purchased **directly on this page for immediate checkout**" | `/buy-now-lander/` | That page has zero `<form>` elements and zero add-to-cart controls. |
| "My phone buzzed with a notification"; "sending you an immediate alert"; "detecting abnormal flow rates and sending instant alerts" | 6 blog posts, one naming the $187.99 H/C SKU | Manual: *"an alert will sound… Alert will only last 2 min."* |
| "No Tools Required" / "60 seconds or less" / "install in seconds" | 5–22 pages depending on phrasing | All three manuals list *"Tools (Not Included): Small Adjustable Wrench, Small Level"*. Product pages already say so. |
| Placement lists naming basements, crawl spaces, water heaters, washing machines | ~13 pages | Product does not fit any of them. |

The `/buy-now-lander/` compatibility sentence is the worst of these because it names two appliance classes on a purchase page: a buyer pays $157.99–$187.99 plus $13.00 shipping and receives a valve that will not fit, which is a refund, a return shipping cost and a one-star review per sale.

**Fix.** Rewrite each to the real mechanism — "a wired sensor on the floor; when it gets wet, the valve closes that fixture's supply" — and the real installation ("threads inline on the fixture supply hose; a small adjustable wrench is all you need"). The site already contains the correct wording, on `/why-i-recommend-aquahalt-flip-to-every-property-manager-i-know/` and on the product spec tables. Delete "entire building" in favour of a per-unit deployment table ("a 40-unit building, one toilet and one sink per unit = 80 devices"), which is a stronger B2B pitch anyway. Do **not** blanket find-and-replace "no tools" — `/toilet-leak-repair/` uses it correctly about a flapper.

**Size.** Two to three days, plus a content brief so it does not recur.

### 6. Three city pages name the wrong city

*Found by: technical-seo (verification of the geo-page cluster).*

- `water-leak-protection-boston/index.html` — visible `<h2>`: **"Best leak detector for commercial buildings in Chicago"**
- `water-leak-protection-dallas/index.html` — visible `<h2>`: **"Best leak detector for commercial buildings in NYC"**
- `water-leak-protection-miami/index.html` — hero paragraph ends **"Trusted by property managers across the five boroughs."** (verbatim duplicate of the New York hero)

**Fix.** Three string edits. **Size.** 15 minutes. Do it today.

### 7. Fabricated customer stories, and blog posts that recommend competitors by name

*Found by: content-accuracy, trust-legal, technical-seo.*

`/how-automated-shut-off-valves-averted-a-major-flood/` (already known) is confirmed worse than logged: its outcome table's column header is literally **"With Automated Shut-Off (Actual)"** against "(Estimated)", and the Actual column carries "2 minutes", "1 unit", "$3,500". The system it describes has a flow sensor with a learned baseline, a central hub, SMS and a cloud dashboard. It is in `post-sitemap.xml`, and the full text is republished on `/blog/page/3/`, so removing it requires regenerating the whole `/blog/page/N/` set, not deleting one grid. A second fabricated case study was found: `/my-under-sink-solution-for-office-break-room-leaks/` describes fitting aquaHALT ICE and H/C to a dishwasher and a coffee machine — a deployment that cannot be bought.

Six posts recommend named competitors in the first person on the client's own domain: *"I use the Flo by Moen system in my own house"*; *"Personally, I use a combination of Govee sensors… and a Flo by Moen shutoff on my main line"*; *"Tools like Flume or Moen Flo allow me to track water usage in real time"*. None mentions aquaHALT in its body. A seventh, `/how-smart-sensors-are-changing-the-game-in-apartment-leak-detection/`, opens with a **dofollow outbound link to `https://www.moen.com/flo`** — the only competitor outbound link on the site.

Roughly fifteen more posts answer "what should I look for" with a spec aquaHALT fails: *"go for a system that includes mainline shut-off functionality"*, *"Look for certifications like UL or CSA"* (no page claims either), *"These Wi-Fi-enabled devices… The cost? Around $40–$70 per unit"* — a price anchor 3–4× below the client's cheapest SKU, on the client's own domain.

**Fix.** 410 the two fabricated case studies and drop them from `post-sitemap.xml`. Strip the moen.com link today — one line. Rewrite or 410 the six first-person competitor posts; `/2435/` is a bare post-ID URL with no keyword value, so 410 is the cheapest correct answer there. Rewrite the buying-criteria posts around what aquaHALT does well — acts rather than alerts, no network, works in a rental, per-fixture cost that scales.

**Size.** Deletions and the link: one hour. Rewrites: a week.

### 8. Seven named firms' logos under "Featured Partners"

*Found by: trust-legal.*

`/partner/become-a-partner/` displays an autoplaying carousel of seven real property-management wordmarks — Choice New York Companies, FirstService Residential, Charles H. Greenthal, KW Property Management, Maxwell-Kates, Halstead Management, Douglas Elliman Property Management — under the word "Partners", with no caption, no link, no date, no qualifier, and all seven sharing the alt text `"diy water leak protection"`. The Choice New York logo is also the page's `og:image` and JSON-LD `#primaryimage`, so sharing that URL renders a third party's logo as the card. The page is orphaned (nothing links to it) but is in `page-sitemap.xml`. Meanwhile `/case-studies/`, linked in the footer of every page, renders *"No articles for Case Studies found."*

**Fix.** Do not publish any of the seven until the client produces written permission naming the firm and the permitted use. For any that are authorised, relabel to what is true ("Deployed with", "Customers include") with a named, dated reference and the company name as alt text. Repoint the `og:image` to a Water Automation asset regardless.

**Size.** Removal: 30 minutes. Blocked on a client answer.

### 9. Every form submission is lost, and the visitor sees the word "error"

*Found by: forms-leadgen, commerce-conversion, trust-legal.*

31 form instances across 30 pages, 9 reachable form designs, all POSTing to `/wp-admin/admin-ajax.php`, which does not exist in the mirror. Reproduced on ten pages: POST → 404 → the page appends `<div class="elementor-message elementor-message-danger" role="alert">error</div>` in small red text under the button. The brief recorded this as a silent success; it is a visible, unbranded failure. Destinations lost include partner and distributor applications (job title + company + phone), tradeshow signups, bulk-order enquiries, and every "Request a call" on the site. The copy above the forms promises *"we will contact you as soon as possible"* and *"Fill out the form to start the conversation and we'll be in touch shortly"*.

Two adjacent faults on the same forms, both verified: the `/case-studies/` phone field is `type="email"` and `required`, so anyone typing a phone number is told *"Please include an '@' in the email address"* and cannot submit at all; and the `pattern="[0-9()#&+*-=.]+"` on the other 29 tel fields does not compile under the `v` flag and is silently discarded, so those fields accept any text. Do **not** "fix" that pattern by escaping the parentheses — the character class excludes the space, so `+1 617 555 0134` (the field's own placeholder format) would then be rejected on 28 pages.

**Fix.** Point every form at a serverless function or hosted form service before launch; map the nine `form_id` values to routing rules so a distributor application does not land in the same inbox as a blog-sidebar enquiry; re-implement the honeypot and verify the reCAPTCHA token server-side; show an actionable failure message with the support email, never the string "error"; fire a `generate_lead` GA4 event and the Google Ads conversion on genuine success only. Change the `/case-studies/` field to `type="tel"`, and delete the broken `pattern` attributes rather than escaping them.

**Size.** Endpoint plus routing: two days. The two field fixes: 15 minutes.

### 10. `/shop/` tells Google it is a duplicate of the homepage

*Found by: technical-seo.*

`shop/index.html` carries `<link rel="canonical" href="https://www.waterautomation.com/?page_id=152" />` and the matching `og:url`, and the JSON-LD `WebPage`, `ImageObject` and `BreadcrumbList` `@id`s all use the same query URL. `/?page_id=152` returns HTTP 200 with byte-identical homepage HTML — and that page's own canonical is `https://www.waterautomation.com/`, so the declared chain is `/shop/` → `/?page_id=152` → homepage. `/shop/` is submitted in `page-sitemap.xml` while disclaiming itself. Three blog posts do the same with `?p=` IDs: `/how-much-water-the-toilet-uses/`, `/water-sensors-for-insurance/`, `/why-is-my-toilet-making-noise-when-not-in-use/`. `robots.txt` blocks `?add-to-cart=`, `?orderby=` and `?utm_*` but not `?p=` or `?page_id=`, so the bad targets are fully crawlable.

**Fix.** Four one-line edits to self-referencing pretty URLs, plus the matching `og:url` and every JSON-LD `@id`. Add a build assertion that every page's canonical equals the origin plus its own route, and fail the build otherwise.

**Size.** One hour including the build check. This is the cheapest high-value fix on the list.

### 11. Overlays cover the checkout address fields on common phone widths

*Found by: mobile-visual; the same overlay family found by desktop-visual, accessibility and trust-legal.*

At 320×568 on `/checkout/`, with no scrolling, the Country/Region field renders as "…d States (US)": the 53px FastBots launcher (`left:12px`, `z-index:2147483647`) eats the left 54px and the 119px cart pill covers the right. Address fields are 300px wide, so 58% of every field is blocked, and hit-testing shows 5 of 7 sample columns return an overlay rather than the input — so the covered strip is mis-tappable, not merely unreadable. It is not 320-only: at 360, 375 and 390 the launcher covers the "Last name" label; 414 is the first clean width.

**Fix.** The proposed `body.woocommerce-checkout {…}` rule is inert — every page in the mirror ships a bare `<body>` with no classes. Scope by path instead: add a page-scoped `<style>` to `checkout/index.html` and `cart/index.html` hiding both overlays, or set a class on those two `<body>` tags first. Drop `div.grecaptcha-badge` from the selector; it occurs zero times in the repo.

**Size.** One hour.

### 12. Same-day deletions

| What | Where | Why | Size |
|---|---|---|---|
| `<span style="color:transparent">Water Leak Detection System` (unclosed) | `buy-now/index.html`, one occurrence sitewide | Transparent text on the primary buy page, measured at 1.00:1 contrast. Zero ranking upside — the phrase is already in the title, two `<h2>`s and visible body copy. Latent Google spam-policy risk, 27 characters to remove. | 5 min |
| `/sample-page/` | Live on production (verified: the mirror serves it, and so does `waterautomation.com`) | Renders *"I'm a bike messenger by day… I like piña coladas"*, *"The XYZ Doohickey Company… Located in Gotham City"*, and instructs the reader to *"go to your dashboard to delete this page"*. Indexable, in `page-sitemap.xml`. | 15 min |
| `/checkout/`, `/cart/`, `/my-account/` sitemap entries | `page-sitemap.xml` | All three are `Disallow`ed in `robots.txt` (lines 26–28) — submitted and blocked at once. | 10 min |
| Internal notes in `<style id="wa-overlay-hygiene">` | All 184 pages | Ships agency working notes in view-source, including *"That is the 'everything is overlapping' the client reported"*. Keep the CSS, move the rationale to `MIRROR.md`. | 20 min |

---

## Fix this month

**The "See also" loop grid — one change that fixes six findings.** *Found independently by technical-seo, linking-ia, desktop-visual, mobile-visual, performance and trust-legal.* A `theme-post-content` widget renders the **same four posts in full** on 129 pages. Consequences, all verified: ~91% of a typical post's text is other posts; 24,149 characters per page of generic contractor boilerplate ("Acceptance checklist", "permits, coordination", "What should I receive at handoff") repeated four times, amounting to 62–67% of visible text on a typical post; 520 links to `/shop/` under two anchors, "related resource" and "the relevant service information", with zero descriptive anchors sitewide; the same two anchor phrases resolving to four different destinations across 1,040 links; the agency template sentence *"See the client's related resource… It establishes what the client actually offers"* on 130 public pages; duplicate heading IDs five deep; 296 extra DOM nodes and four extra images per page; and four cards in one eyeline on `/blog/` opening with the identical machine-written stem *"…works best when the decision begins with observed conditions rather than assumptions"*, three of them starting lowercase mid-sentence. Two of the four source posts have byte-identical 9,312-character bodies at separate indexed URLs.

Replace the widget with a post-excerpt widget and a curated 3–5 link list; write one real 20–25 word excerpt per post; delete the boilerplate from the **four source files** (not 130 — the rest inherit it); de-duplicate `/diy-water-leak-protection/` and `/leak-detection-solutions-for-apartment-buildings/`; repair the seven posts whose own bodies begin mid-sentence in lowercase; drop the `-webkit-line-clamp: 3` rule once excerpts are short enough. **Size: one week.**

**Blog pagination and crawl reachability.** *linking-ia, technical-seo.* Every pagination block on all eleven blog pages renders anchors to pages 1–5 only — no Next, no ellipsis, no current marker on pages 6–11. Pages 6–11 exist only as `<link rel="next">` and an inert `data-next-page` attribute on a load-more div whose script is never enqueued; page 11's attribute points at `/blog/page/12/`, which 404s. Consequence: 68 of 135 posts have their only internal inbound link on an unreachable page, five posts appear on no listing page at all (their sole parent is the orphaned `/uncategorized/`), and 101 of 182 pages are unreachable from the homepage by following links. Emit the full 1…11 set plus Prev/Next (page 1 must be `/blog/`, not `/blog/page/1/`, which 404s), recategorise the five stranded posts, and add real inbound links for `/shop/`, `/installation/` and `/partner/become-a-partner/`. **Size: two days.**

**Headings.** *technical-seo, accessibility, linking-ia.* Beyond the known 147/183 with zero `<h1>`: the homepage and all eight city pages share one `<h1>` reading **"Where and how to order the product"**, and on the eight city pages it computes to `visibility: hidden` — so those pages have an invisible, off-topic, crawler-only sole heading plus a 100px blank block. The same string appears as `<h2>`/`<h4>` on six more pages, so it is a copy-pasted Elementor buy block. Heading levels also describe font size rather than structure (homepage: H4→H4→H4→H3→…→H5×3→H2), and 37 pages skip levels. Do the `<h1>` work and the re-levelling in **one pass** — doing them separately means touching 181 files twice. **Size: three days.**

**Contrast — five tokens, not a page-by-page job.** *accessibility, mobile-visual, desktop-visual.* 6,173 failing text runs across 181 pages trace to five values in `wp-content/uploads/elementor/css/post-6.css`. White on brand green `#59B748` = 2.53:1 on every CTA sitewide; header nav `rgba(19,19,18,0.5)` = 3.50:1; footer links and the support email `rgba(255,255,255,0.5)` on `#4A4A4A` = 3.58:1; breadcrumbs `#2F2F2F61` = 2.17:1 on 150 pages; `/shop/` prices in WooCommerce's stock olive `#958e09` = 3.41:1. Three more need separate rules: the real Add to cart button is `#4898C4` at 3.20:1 (darkening the green does not touch it); the hero's green positioning line sits directly on photography at 1.00–2.51:1 on nine pages; and form fields have **no visible focus indicator** (measured 1.18:1 — Elementor kills the outline and a page-level rule zeroes the border that would have replaced it). Do not change the brand green as a fill — change the text on it, or introduce a separate darker token for green used as text. **Size: two days including a re-measurement sweep.**

**The overlays above 768px.** *desktop-visual, mobile-visual, accessibility, trust-legal.* The existing `wa-overlay-hygiene` block stops at 767px. From 768px to ~1440px the Elementor video widget (fixed, `left:24px`, 110×145) and the FastBots bubble paint over real body copy: on `/about-us/` at 768–1280 they eat 79–100px off seven bullets of the central comparison card; on `/blog/` they cover a card title and three excerpt lines; on `/book-a-call/` — a booking page — they cover hero copy and the primary green CTA at **every** width tested including 1920. Separately, the site's own `overflow: hidden !important` on `#welcomeMessages` clips that bubble's close X out of hit-testing, so on tablet and desktop **nobody can dismiss it** with mouse or keyboard, on all 183 pages. Extend the existing block: move the video widget and chat stack into the right gutter alongside the cart, staggered; hide the video widget below 1440px; suppress the bubble's unprompted auto-open; delete the `overflow: hidden` line. Then re-run a text-rect intersection assertion at 768/1024/1280/1366/1440/1920 — a four-width spot check misses it. **Size: one day.**

**Legal and policy pages.** *trust-legal, forms-leadgen, commerce-conversion.* None of these exist: privacy policy, terms of sale, warranty, shipping policy. Meanwhile `/checkout/` tells the buyer *"By proceeding with your purchase you agree to our Terms and Conditions and Privacy Policy"* as unlinked plain text (WooCommerce's own config declares both pages unassigned: `"privacy":{"id":0,...},"terms":{"id":0,...}`), the one privacy link on the site — in the `/my-account/` register form — points at `/?page_id=3`, which returns 200 and serves the homepage, and 15 cookies are set on a single homepage load before any interaction (`_fbp`, `_ttp`, `_ga`, `_gcl_au`, `test_cookie` on `.doubleclick.net`, seven Sourcebuster) with no consent mechanism of any kind. `/return-policy/` is four paragraphs, gives no return address despite telling customers they pay return shipping, contains the typo *"defective of damaged"*, and sits alongside a published *"Expected Service Life: 10 Years"* (×4 on `/buy-now/`, contradicted by "15 years" in five posts) and an unbounded *"We guarantee the quality of the product"* on 13 pages. The flat $13.00/item shipping rate appears on **zero** pages — first visible after a full address form, on a page whose Total is $13 light. Also add the reCAPTCHA branding disclosure: the badge is collapsed to 0×0 on 29 pages and the required sentence appears nowhere. **Size: policies are a client/attorney task; the site-side wiring is one day once they exist.**

**Product pages.** *commerce-conversion, technical-seo, desktop-visual.* No Product/Offer schema on any of the five (the only Product markup on the site is three nodes on the robots-blocked `/checkout/`, two of whose Offer URLs 404, declaring the out-of-stock H/C as `InStock` and merging the 2X and Flip into one $157.99 offer). No dimensions or weight, on a product whose copy sells "tucking it away behind the toilet". No shipping cost. No warranty. No cross-sell — a visitor on the 2X page cannot discover the Flip. No reviews: the Trustindex Amazon widget's entire payload sits inside an un-instantiated `<template>` and renders an 85px empty band on all 11 pages that carry it, so the site displays **zero** customer reviews anywhere despite having them. No comparison table answering "2X or Flip?". The out-of-stock H/C is a dead end — no button, no CTA, no back-in-stock capture, and on `/shop/` and `/cart/` its tile shows $187.99 with no availability signal at all. Two duplicate `<meta name="description">` tags on each (known). **Size: three days plus the schema.**

**Performance.** Two items pay for themselves immediately. `women-pointing-down.mp4` (848KB) is embedded **three times** on every one of 183 pages; two of the three render at 0×0 at every breakpoint and still download in full — 1.7MB of wholly invisible transfer per page view, measured at ~2.0s of mobile LCP on a throttled connection. And `/buy-now/` pulls ~12.6MB of first-party bytes before a click, including a 4.4MB video loaded twice from duplicate widgets and a 19.3MB product film that Chrome aborts at ~3.2MB. Delete the two dead video elements, de-duplicate the 3D widget, run `ffmpeg -movflags +faststart` on `3D-video-with-features-1.mp4` (its moov atom is at the end, causing three range requests), and set `preload="none"` **plus removing `autoplay`** on the product film — preload alone is a no-op while autoplay is present. **Size: half a day for ~2MB/page.**

**Copy hygiene.** British/SA spellings on a US site: "Recognised" ×14 pages (inside the Chubb trust block), "programme" ×9, "mould" ×3 (on the Houston and Dallas pages, beside "Assembled in the USA"), "galvanised" ×1. Typos on trust pages: "Becoma a waterAUTOMATION Partner", "singal loss", "defective of damaged". Author metadata on all 134 blog posts points at either `RonnieScale` (110) or `Greg Cappizi` (24 — the founder's surname is `Capizzi` in visible copy and in his own photo filename); neither renders as a visible byline and neither resolves to an author page, while 45 posts are written as first-hand personal experience. **Size: one day.**

---

## Fix this quarter

- **Topic hubs and cannibalisation.** No hub or pillar page exists; the only taxonomies are `/blog/` and `/uncategorized/`. Twelve posts target apartments, ten target commercial, two pairs carry byte-identical `<title>` tags, and two of those titles describe content the page does not contain (`/water-sensors-for-insurance/` is titled "How Much Water Can a Leaking Toilet Waste Over Time?"). Build four or five hubs — apartments/multifamily, commercial, toilets, insurance, homeowners — each with a real `<h1>`, original orientation copy, a genuine `<table>` comparing the models for that use case, and curated links. Put them in the nav. Merge the genuine duplicate pairs and 301 the losers.
- **A design system.** One product page uses four different left margins (60/70/129/170px at 1440) and four `<h2>` sizes; across templates there are 13 distinct `<h2>` sizes and five content widths (1320/1200/1140/900/700). WooCommerce pages sit in a 1140px column inset 90px from their own header and footer. There are three unharmonised Add-to-cart treatments, none matching the site's own primary CTA, and the `/cart/` button's label turns invisible on hover (1.03:1). Publish one type scale and one container in the Elementor kit and delete the per-widget overrides.
- **The image library.** 159 photographs are stored as lossless PNG (96.9MB), which re-encode to 6.8MB as WebP at native size with no visible change. 105 files already contain WebP bytes under `.png`/`.jpg` names and are served with a false Content-Type, which will break any extension-keyed pipeline. The `sizes` attribute lies on ~403 instances (`(max-width: 800px) 100vw, 800px` on a 269px card), so `/blog/` pulls 20.3MB at DPR2 where 3.3MB would look identical.
- **Accessibility remediation and a statement.** 287 links have no accessible name; the TIME seal and the logo are announced as their upload filenames on every page; `/q-and-a/` is video-only; the skip link points at `#content`, which exists on 8 of 183 pages, and 174 pages have no `<main>` landmark at all — so there is no working bypass mechanism anywhere.
- **Third-party tags and measurement.** Third parties account for ~82–93% of main-thread blocking time, GA4 is loaded twice (via GTM and hardcoded), FastBots is embedded twice per page, and there is **no conversion tracking of any kind** — no `form_submit`, no `generate_lead`, no `purchase`, no `add_to_cart`. Any ad spend is currently optimising against zero conversion signal.

---

## Watch, but do not act yet

- **The eight city pages.** Reviewer called doorway abuse; verification does not support that. Rendered similarity is 47–59% pairwise (not 88–90%), and each carries 25–31% genuinely local material — Back Bay brownstones, Lincoln Park garden units, freeze-thaw on galvanised supply lines. The real defects are the three wrong city names (fix this week), the hidden shared `<h1>`, and the fact that nothing links to them. Whether to cut to 3–5 depends on where the client actually has installations or distributors. Do not 301 on the similarity numbers alone.
- **$13.00 per item shipping.** Per-item punishes exactly the multi-fixture order the Partner page exists to win — four fixtures is $52. The repo's own `COMMERCE.md` and `BUSINESS.md` already flag this as an open client decision and warn against publishing arithmetic built on it. Disclose the current rate now; change the model only on a client decision.
- **Three competing buy pages.** `/buy-now/` (nav "Products"), `/buy-now-lander/` (header CTA, and its public `<title>` is literally "Buy Now Lander"), and `/shop/` (the actual catalogue, in no navigation). Consolidating needs traffic data nobody has yet.
- **Publishing a phone number.** 30 of 31 forms demand the visitor's phone under a button labelled "Request a call", and the site has no `tel:` link anywhere. Either publish one or change the button label and state a response time — that is a staffing decision, not a build one.
- **The malformed `</script` tag** on 182 pages. Downgraded to low: spec-compliant parsers, all browsers and Googlebot handle it identically (I diffed the full DOM with and without the fix — 517 nodes, byte-identical). It only breaks naive regex-based extractors. Worth a one-character fix, not worth scheduling.
- **Missing Twitter Card tags.** Downgraded to low: X falls back to Open Graph for title, description and image, the business has no X presence, and the real problem is that ~25 pages' `og:image` is wrong — `/about-us/` and `/q-and-a/` use a 757×78 Chubb logo strip as their share image.
- **The brand green.** Do not darken `--e-global-color-accent` globally; it also drives the hero headline colour, the underline stroke, icon fills and a nav toggle. Introduce a separate button token instead, and patch the four stylesheets that hardcode `#59B748`.
- **`/_raw/`.** 182 duplicate pages serve 200 locally, but `.gitignore` excludes the directory, so it should not deploy. Verify at cutover rather than treating it as a live duplicate-content issue.
- **GT Eesti "Trial" fonts.** Every self-hosted face is named `-Trial`, and the same family is also loaded from `fonts.cdnfonts.com` — the same typeface downloaded twice from two origins. The licence question is the client's to answer.

---

## What we could not check

- **Search Console.** Nothing here says which URLs Google has actually indexed, which are already throwing coverage errors, or what the four `?p=`/`?page_id=` canonicals have already cost. Pull the Pages report and run URL Inspection on `/shop/` first — it takes minutes and it determines whether the canonical fix is cheap or expensive.
- **Analytics.** No conversion, traffic or bounce data. Every commercial impact statement here is mechanical ("the form POSTs to a 404"), never a number of lost enquiries. Note that the GA4 comparison the original reviewer proposed — `form_start` vs `form_submit` — returns zero rows: `form_start` goes only to Google Ads, never to GA4, so that number does not exist.
- **Backlinks.** Several recommendations involve 410s and 301s (`/sample-page/`, `/demo/`, `/2435/`, the duplicate posts). All are made on the assumption of no inbound links, which nobody has verified.
- **The live site vs the mirror.** Everything above is measured against the static mirror. Production is still WordPress (its `admin-ajax.php` returns 200), so the live forms and cart presumably work; the content, schema, canonical and copy defects are live on production, and `/sample-page/` was confirmed live. The commerce breakage is a cutover blocker, not a current loss.
- **Real devices and assistive technology.** All rendering is Chromium under emulation on Windows. No real iOS Safari, no physical tablet, and no screen reader was run — announcement order is inferred from the accessibility tree, not heard.
- **Payments.** No card transaction was attempted. The Stripe publishable key is live (`pk_live_51Iksf2…`) and the Link express element renders at ~3.4× the size of the real Add to cart, but whether it can complete a charge is unverified. Its backend endpoint (`?wc-ajax=wc_stripe_get_cart_details`) returns homepage HTML.
- **Ad spend.** The Google Ads conversion ID, Meta Pixel and TikTok Pixel all fire on every page. Whether campaigns are currently running is an Ads-account question.
- **Competitor list prices.** Moen publishes $623.99 and Phyn $579.99 today (checked 14 September 2026), so the table's "$500+" understates Moen by $124. Whether the client wants to publish live competitor prices at all is a judgement call.

---

## Questions only the client can answer

1. **Chubb.** What did "vetted" mean contractually — who, when, under which programme? Is aquaHALT on any Chubb-published list? Was use of the wordmark granted in writing? Until this is answered the claim must come off 14 pages and eight meta descriptions.
2. **The seven "Featured Partners".** Written permission for each, naming the firm and the permitted use — or the logos come down.
3. **What is the warranty?** Term, what is covered, what is excluded, the claim process, the remedy. Then reconcile "Expected Service Life: 10 Years" (`/buy-now/`) against "15 years" (five blog posts) and decide whether to keep the figure at all.
4. **What happens to the water when the batteries die** — does the valve stay open or closed? The manuals do not say. This is the top objection on a battery-only device and the site currently half-answers it ("the device turns off after 8 hours") and then stops.
5. **Product dimensions, weight, clearance behind the fixture, and the replacement sensor's cable length.** Someone needs to physically measure them. The copy sells "tucking it away behind the toilet" with no number behind it.
6. **Shipping.** Is $13.00 per item staying? Which destinations, what dispatch time, which carrier? And is there a bulk or multi-item cap?
7. **Return address and RMA process.** The policy tells customers to pay their own return shipping and never says where to send it.
8. **SKUs and Amazon ASINs.** No SKUs are set on any product (`COMMERCE.md` line 24), and the repo contains exactly one ASIN — `B09PF2YCPM` — used for all 16 "Switch to Amazon" buttons, so four of five products link to the wrong listing.
9. **Corp or LLC?** The product spec tables say "Water Automation Corp." on the 2X and "Water Automation LLC" on the Flip and ICE. And is `Water Automation, LLC, 1727 Certainty Dr, Point Pleasant, NJ 08742` current? It exists only inside the robots-blocked `/checkout/` JSON-LD and appears on no page a human can read.
10. **Is there a phone number**, and will it be staffed?
11. **Who writes the blog?** 134 posts are attributed in metadata to `RonnieScale` or the misspelled `Greg Cappizi`, and 45 of them are written in the first person as personal experience. Those either need a real named author with a bio page, or rewriting out of the first person.
12. **Is there one real, permissioned customer story?** One named deployment with a date beats the whole badge row — and it is the only honest way to fill `/case-studies/`, which is linked from the footer of all 183 pages and currently reads "No articles for Case Studies found."