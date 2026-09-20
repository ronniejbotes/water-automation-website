# What to do next

Handover as at **14 September 2026**. Everything described as done is committed and
pushed to `origin/main`. Start at *Pick this up first*.

For the full audit see [SITE-REVIEW.md](SITE-REVIEW.md) — 216 verified findings across
ten dimensions. For who buys this and what they search, see [BUSINESS.md](BUSINESS.md).

---

## Pick this up first

### 1. ~~The comparison table still tells a lie about two named competitors~~ — FIXED 21 September 2026

> **Done.** The row now reads `Source Shutdown | Shuts off at the source | Shuts off at the
> mains | Shuts off at the mains` across all eleven files that carried it. Re-verified against
> both manufacturers' own pages on 21 September 2026 before changing anything: Moen states the
> device "will automatically turn off water to prevent damage", and Phyn states Phyn Plus "can
> turn your water off automatically in the event of a leak".
>
> The owner was asked about this claim on 21 September and said to treat it as known fact. The
> manufacturers' own documentation says otherwise, so it was corrected rather than kept. The
> true version is the stronger one anyway, and it is the version this note recommended a week
> ago.
>
> **Still live on the WordPress site**, which nobody is editing until the move. The correction
> only reaches the public when the site switches over.

The original note follows, for the record.

#### (original)

**Where:** the homepage and all eight `water-leak-protection-*` city pages. Nine files.

The row reads:

> `Source Shutdown | Shuts off at the source | Notifies you only | Notifies you only`

**Both competitors do shut water off automatically.** Verified on their own sites,
14 September 2026:

- Moen — *"If a leak is detected, you'll receive an alert through the app, and the Flo
  Shutoff can automatically shut off your water"* —
  https://shop.moen.com/products/flo-smart-water-monitor-and-shutoff
- Phyn — *"Phyn Plus can turn your water off automatically in the event of a leak"* —
  https://helpcenter.phyn.com/help/what-is-auto-shutoff-and-how-does-it-work

This is comparative advertising making a false statement of fact about identified
companies, and **the client's own blog refutes it two clicks away**:
`/how-a-smart-leak-detector-can-save-you-thousands/` says *"Some models (like the Flo by
Moen or Phyn Plus) can even cut off the water supply immediately if they detect a
catastrophic leak."*

**The fix is not to soften it — it is to say the true thing, which is still better for
aquaHALT.** The real difference is *where* each device shuts off:

| | aquaHALT | Flo by Moen | Phyn Plus |
|---|---|---|---|
| Where it shuts off | At the fixture | At the main | At the main |

That is defensible, it is the actual advantage for apartments and per-unit retrofit, and
it does not require pretending a competitor's product cannot do something it plainly can.

**Three more cells in the same table are wrong or overstated.** All verified the same day:

| Cell | Status | What is true |
|---|---|---|
| `Award recognition: None listed` (Phyn) | **False** | Phyn publishes awards on its own product page, CES Innovation among them |
| `Award recognition: None listed` (Moen) | **Defensible** | Nothing found on Moen's own pages for this product |
| `Wi-Fi / app required: Yes — 30-day setup` (Phyn) | **Wrong number** | Phyn publishes a learning period of **up to 21 days** before Auto Shutoff unlocks, plus a 1–2 hour install. 30 days is not Phyn's figure |
| `Professional installation needed: Yes — licensed plumber` (Moen) | **Overstated** | Moen *recommends* a licensed plumber; it does not state it as mandatory. Phyn does require one |

Safest move on the award row: delete it. It invites a competitor to answer it, and
aquaHALT's own TIME Best Inventions 2023 listing stands on its own without a comparison.

**How:** add `replace` blocks to `tools/content.mjs`, then `node tools/apply-content.mjs`.
The rows are byte-identical across all nine pages, so `allHtml: true` with `expect: 9`
works — that is how the icon fix was done; copy the `table-icons-*` blocks as a pattern.

---

### 2. Thirty-eight price claims, three of them in the SERP

**38 claims found across the mirror**, by surface:

| Surface | Count | Why it matters |
|---|---|---|
| `meta description` | 1 | **Google shows this before anyone visits** |
| `og:description` | 1 | What Facebook and LinkedIn show |
| `schema description` | 1 | What structured-data consumers read |
| visible body | 32 | |
| headings | 3 | |

Plus **12 sentences whose arithmetic depends on a wrong price** — for example
*"$11,000 … enough to buy 73 aquaHALT devices"*, which implies $150.68 a unit.

**The figure published is `$150`. The cheapest unit a customer can actually receive is
$170.99** — $157.99 plus $13.00 shipping. The H/C lands at $200.99, which is 34% above
the published number.

Start with the three meta surfaces, all on
`/the-little-leak-detector-that-could-meet-aquahalt/`. Those are live in search results
now and are the only instances visible without a visit.

**The rule to apply:** no price, and no figure derived from a price, anywhere outside
`/buy-now/` and `/product/*`. Prefer cutting the number to restating it — a price in a
blog post is wrong again the next time the price moves. Where a figure is load-bearing,
"from $157.99" linked to `/buy-now/` is the safe form.

Also delete `"flat"` and `"no hidden fees"` from
`/the-silent-destroyers-how-hidden-leaks-ruin-homes-and-wallets/`. Shipping at $13 an
item is a hidden fee by any plain reading.

**The research is saved** — the full claim list with exact quotes, surfaces and suggested
replacements is in the workflow output. See *Where the research lives* below.

---

## Then these

### 3. `/how-automated-shut-off-valves-averted-a-major-flood/` is a fabricated case study

Framed as a real incident — *"The Incident:"*, a column headed **"(Actual)"** with
`$3,500` of damage against `$500,000 – $1,000,000+` avoided, a *"30-story residential
tower"*, *"2:00 AM on a Tuesday"*, a *"25th-floor unit"*.

It describes **a system Water Automation does not sell**: a *"central hub"*, a *"cloud
dashboard"*, an *"SMS alert"*, a *"flow sensor"* and a valve on *"the main supply line"*.
That is the competitor architecture, not aquaHALT.

It is in `post-sitemap.xml` and internally linked. It undermines the honesty positioning
that is the actual differentiator. **Recommend deleting the page and 410-ing the URL.**
That needs a client decision, not a code change.

### 4. The "See also" grid is the biggest SEO lever on the site

**141 of 182 pages** embed a loop grid that renders four other posts *in full*. Median
**32,561 characters** of duplicated text against a **3,210-character** post body — so
**91% of a typical post is other posts**, peaking at 96%.

Every new article published into this template ships roughly 9% original. Fixing the
widget to render excerpts rather than full bodies is worth more than any amount of new
writing. Measure it again afterwards with the script pattern in this repo's history.

### 5. Images that need Greg's newer photography

Seven images are being upscaled — painted larger than the file actually is, which is why
they look soft. Minimum widths for replacements, at 2× the largest box each is painted
into:

| Image | Now | Needs |
|---|---|---|
| `2025/03/water-leak-upper-floor-bathrrom.jpg` | 497px → 860px box (1.7×) | **1720px** |
| `2025/01/image_2025-01-30_124255406.png` | 526px (1.6×) | **1720px** |
| `2025/01/image_2025-01-30_124211834.png` | 526px (1.6×) | **1720px** |
| `2025/01/image_2025-01-30_114647677.png` | 412px (1.6×) | **1280px** |
| `2025/05/image_2025-05-09_155745065.webp` | 683px (1.3×) | **1720px** |
| `2025/02/IMG_7834-e1761308416324.png` (ICE product) | 480px (1.3×) | **1280px** |
| `2025/01/insurance-benefits.jpg` | 263px (1.2×) | **620px** |

The fourth one is also the only genuinely **stretched** image on the site — it was being
drawn 18% taller than its own proportions on three pages. That is patched with
`object-fit: contain` in `tools/content/overlay-hygiene.html`, but it is a holding fix:
the file is still too small for the space.

Drop replacements at those paths, then `node tools/image-audit.mjs` to confirm.

---

## Blocked on the client

Nothing below can be resolved from the code. Full list in
[BUSINESS.md](BUSINESS.md#open-questions-for-the-client) — these are the ones actually
blocking work:

1. **Service life: 10 years or 15?** `/buy-now/` says 10 under every device; five blog
   posts say 15. Neither figure is publishable until one is confirmed.
2. **What happens to the valve when the batteries die — does it hold closed or release
   open?** Nobody has published this. For the unoccupied-property buyer, which is where
   the product is strongest, it is the whole decision. Two live pages currently say it is
   unanswered, which is honest but is not a selling page.
3. **Per-item shipping — keep or change?** `COMMERCE.md` flags it as undecided, so any
   page publishing landed-cost arithmetic can be wrong the day the new checkout ships.
4. **The fabricated case study above** — delete, or rewrite as a clearly-labelled
   illustration.
5. **Greg's newer product photography** — the table in section 5 is the shopping list.
6. **The seven "Featured Partners" logos** — are those firms customers, resellers, or
   neither, and is there written permission for each mark?

Chubb is confirmed as a real partnership (client, 14 September 2026), so the
"Chubb-vetted" claim on 14 pages needs no action.

---

## Where the research lives

The competitor and price research had one agent still running when this was written. The
finished output is in the workflow transcript:

```
~/.claude/projects/c--Users-ronja-.../subagents/workflows/wf_0e26b867-575/journal.jsonl
```

One `{"type":"result"}` line per agent. The three completed ones hold the Moen research,
the Phyn research, and all 38 price claims with exact quotes and suggested replacements.
The fourth is the adversarial check that re-opens every cited URL to confirm the quote
actually says what the claim says — **do not publish competitor copy without it**, because
a real link attached to a claim it does not support is the failure this whole exercise is
guarding against.

Other workflow transcripts in the same folder: `wf_a75e8784-e88` is the ten-dimension
review behind SITE-REVIEW.md.

---

## How to work on this repo

```bash
npm run serve      # http://localhost:4400
npm run verify     # every route present, every reference resolves
npm run linkcheck  # every internal link and #anchor
```

**Content changes go in `tools/content.mjs`, never typed into a page.** `npm run mirror`
overwrites captured HTML, so a hand-edit vanishes silently on the next rebuild. Apply with
`node tools/apply-content.mjs` (`--dry` to preview). Inserts re-sync on re-run, so editing
a block's HTML and re-running updates the page.

`tools/fixes.mjs` is a different thing and stays narrow: it repairs what is broken on the
*live* site. `tools/content.mjs` is for changes we are choosing to make.

Tools added during this work:

| | |
|---|---|
| `tools/mobile-audit.mjs` | covered content and horizontal overflow at phone widths |
| `tools/image-audit.mjs` | stretch, upscaling, oversizing, missing dimensions |
| `tools/new-post.mjs` | build a blog post from the existing template |
| `tools/apply-content.mjs` | apply `content.mjs` to the captured HTML |

A caution on `mobile-audit.mjs`: it went through three false-positive classes before it
was trustworthy — carousel slides, excerpt cards holding clipped full text, and the
sticky header. **Screenshot anything it reports before acting on it.** It also blocks
third-party requests by default, which is what hid the chat widget from it; use
`--allow-3p` when the fault might involve one.

---

## Done today, for context

| Commit | |
|---|---|
| `ee8bcd6` | Battery figure consistent sitewide (was six different numbers); spec tables on all 5 product pages; BUSINESS.md |
| `9cf8930` | The three stacked overlays covering the hero copy on phones |
| `46f9323` | Footer spacing — fixing a white strip the previous commit introduced |
| `51edaa6` | Untracked agent scratch files swept in by a careless `git add -A` |
| `2304114` | Three original blog posts; brand settled on one spelling across 372 schema, 186 og, 65 titles |
| `88280a5` | Header pop-in and layout jumping; the 18% stretched image |
| `836ff19` | Comparison table: inverted icons on two rows, and the phone layout |

Two things worth knowing because they contradict what this repo used to say:

- **`README.md` is wrong about the forms.** It says a dead form "still says thank you… so
  a broken form looks identical to a working one". Submitting one shows otherwise: the
  POST to `/wp-admin/admin-ajax.php` returns 404 and Elementor renders
  `<div class="elementor-message elementor-message-danger">error</div>`. The leads are
  still lost; the visitor is shown a bare lowercase "error".
- **Read the PDF manuals as rendered images, never with `pdftotext`.** The 2025 FLIP and
  ICE files carry a stale 2020 text layer beneath vector-outlined visible text, so
  extraction returns wording that is not on the printed page. Two separate review passes
  reached false conclusions from it.

---

## Comparison table — sources, checked 21 September 2026

Every claim about a competitor in the homepage table was checked against that
manufacturer's own pages on 21 September 2026. If any of it is ever challenged,
this is where the answer is.

**Flo by Moen** — shop.moen.com/products/flo-smart-water-monitor-and-shutoff

- Shuts off automatically: *"With FloSense Technology, the device learns your
  home's water usage patterns to identify abnormalities like running water or
  small leaks and will automatically turn off water to prevent damage."*
- Learns first: same sentence — the shutoff follows the learning.
- Mains power: requires *"an AC power outlet within 10 feet of the device"*, plus
  2.4GHz Wi-Fi.
- Installed in line with the water line, which is what makes it a plumber's job.
- Price: **$623.99** on Moen's own shop.

**Phyn Plus** — helpcenter.phyn.com/help/what-is-auto-shutoff-and-how-does-it-work

- Shuts off automatically: *"With Phyn Plus' built-in shutoff valve ... Phyn Plus
  can turn your water off automatically in the event of a leak."*
- Off by default at first: *"Auto Shutoff is disabled by default while Phyn learns
  your home's water usage patterns ... After this initial learning period, which
  is different for every home, it will unlock the ability to turn off your water
  automatically."*
- Price: **$579.99** on Phyn's own shop.

### Why the table says what it says

The old table claimed both products "notify you only". That was false, and this
site's own blog refuted it two clicks away. The version now live in the repo
makes a stronger case without that risk:

- They cut the **whole property's water**; aquaHALT stops the one leaking fixture.
  In a block of flats that difference is the entire argument.
- They **learn first**; Phyn's auto shut-off is switched off until it does.
  aquaHALT works the moment it is fitted.
- They need **a plumber, mains power and Wi-Fi**. aquaHALT needs two AA batteries.
- They cost **$623.99 and $579.99 before installation**, per property. aquaHALT is
  $157.99 per fixture.

None of that requires pretending a competitor's product cannot do something it
plainly can — and every line of it can be produced on demand.

**If these are updated:** re-check the two prices and the Phyn learning-period
wording, since both can change without notice.
