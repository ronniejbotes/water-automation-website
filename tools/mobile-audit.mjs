/**
 * Find mobile layout faults: content covered by something, and horizontal overflow.
 *
 * Why this is not just a screenshot pass
 * -------------------------------------
 * `npm run compare:mobile` answers "does the copy look like live?", which is the
 * wrong question when live is broken too. A fault the client can see on their
 * phone will be pixel-identical on both sides and score 0% difference. This
 * measures the layout itself, so a fault is reported whether or not live shares it.
 *
 * How "overlapping" is decided, and why it is done this way
 * --------------------------------------------------------
 * The obvious implementation — compare every pair of bounding boxes — does not
 * work on this site, and the first version of this file proved it. Elementor
 * carousels keep every slide in the DOM at the same coordinates, so box-vs-box
 * comparison reported hundreds of "overlaps" per page that no human can see,
 * while missing the two faults a person actually notices.
 *
 * So this asks the question the eye asks instead: **is this text actually
 * covered?** For each element that paints its own text, it samples points across
 * that element and calls document.elementFromPoint. If the topmost element at
 * those points is not the text element (nor an ancestor or descendant of it),
 * something is painted on top of it. That is hit-testing, so it inherits the
 * browser's own answers about clipping, stacking and visibility for free:
 * a carousel slide translated out of an overflow:hidden track is not hit-testable
 * and so is never reported.
 *
 * This also means fixed and sticky furniture is INCLUDED rather than excluded.
 * A sticky header badge and a floating cart button covering body text is the
 * single most common real complaint, and the box-comparison version had been
 * deliberately skipping exactly that.
 *
 * elementFromPoint only sees the current viewport, so the page is walked down in
 * viewport-sized steps and each element is tested while it is on screen.
 *
 * The second fault class is OVERFLOW — something wider than the viewport, so the
 * page scrolls sideways and content runs off the edge. Usually a fixed pixel
 * width, a wide table, a long unbroken string, or a negative margin.
 *
 * Third-party requests (GTM, HubSpot, YouTube, the Trustindex reviews widget) are
 * blocked by default: they add 20-30s per page and make results differ run to run,
 * which is fatal for a check meant to be rerun after a fix. `--allow-3p` turns them
 * back on. The overlap findings were confirmed identical both ways.
 *
 *   node tools/mobile-audit.mjs                      # all routes at 390px
 *   node tools/mobile-audit.mjs --width 360          # a narrower phone
 *   node tools/mobile-audit.mjs --only /q-and-a/,/shop/
 *   node tools/mobile-audit.mjs --shots              # save a PNG per faulty page
 *   node tools/mobile-audit.mjs --limit 40           # first N routes
 *   node tools/mobile-audit.mjs --allow-3p           # let third-party widgets load
 */
import { chromium } from 'playwright-core'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { appendFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argVal = (f, d) => {
  const i = args.indexOf(f)
  return i === -1 ? d : args[i + 1]
}
const BASE = argVal('--local', 'http://localhost:4400')
const WIDTH = Number(argVal('--width', 390))
const HEIGHT = Number(argVal('--height', 844))
const SHOTS = args.includes('--shots')
const ALLOW_3P = args.includes('--allow-3p')
const LIMIT = Number(argVal('--limit', 0))
const ONLY = argVal('--only', '')
const SHOT_DIR = join(ROOT, 'shots', `mobile-audit-${WIDTH}`)
const EXEC =
  process.env.CHROME ||
  join(
    process.env.USERPROFILE || process.env.HOME || '',
    'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
  )

// --only takes a comma list because Git Bash rewrites bare /paths into Windows
// paths before node ever sees them.
let routes = ONLY
  ? ONLY.split(',').map((s) => s.trim()).filter(Boolean)
  : (await readFile(join(ROOT, 'routes.txt'), 'utf8'))
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('#'))
if (LIMIT) routes = routes.slice(0, LIMIT)

/**
 * Runs in the page, once per scroll step. Reports text that is covered by
 * something else, for elements currently within the viewport.
 */
const OCCLUSION = ({ minCoveredRatio }) => {
  const vw = window.innerWidth
  const vh = window.innerHeight

  const desc = (el) => {
    if (!el) return '(none)'
    const id = el.id ? `#${el.id}` : ''
    const cls =
      el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : ''
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 45)
    return `${el.tagName.toLowerCase()}${id}${cls}${txt ? ` "${txt}"` : ''}`
  }

  const paintsOwnText = (el) => {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent.trim().length > 1) return true
    }
    return false
  }

  const related = (a, b) => a === b || a.contains(b) || b.contains(a)

  // A full-width bar pinned to the top of the screen is a site header, and text
  // scrolling underneath one is what a sticky header is for — not a fault. Find
  // it once so its coverage can be ignored; everything else pinned still counts,
  // which is the point, because a floating cart button covering the buy button is
  // exactly the fault worth catching.
  // Decide on the NEAREST pinned ancestor and stop there. Walking further up
  // matters: the floating cart button is itself fixed but lives inside the fixed
  // header markup, so continuing the walk would wrongly excuse it as "the header".
  const isTopBar = (el) => {
    let p = el
    while (p && p !== document.body) {
      const s = getComputedStyle(p)
      if (s.position === 'fixed' || s.position === 'sticky') {
        const r = p.getBoundingClientRect()
        return r.top <= 1 && r.width >= vw * 0.95
      }
      p = p.parentElement
    }
    return false
  }

  // Text is the obvious thing to check, but a covered image or a covered buy
  // button is worse, not better — a floating cart sitting on "Add to cart" costs
  // an order. So controls and sizeable images are candidates too.
  const CONTROL = new Set(['img', 'button', 'input', 'select', 'textarea', 'a'])
  const worthTesting = (el) => {
    const t = el.tagName.toLowerCase()
    if (paintsOwnText(el)) return true
    if (!CONTROL.has(t)) return false
    const r = el.getBoundingClientRect()
    if (t === 'a') return r.width >= 40 && r.height >= 20 && !el.querySelector('a')
    return r.width >= 30 && r.height >= 20
  }

  // Excerpt cards ("See also") hold the FULL article text in the DOM and show a
  // few lines of it, the rest clipped by a line-clamped container. That text is
  // not display:none, so it passes every visibility test, and hit-testing where
  // it nominally sits returns the card — which reads as "covered" but is just
  // text the card is deliberately hiding. Measure how much of the element
  // survives its clipping ancestors, and skip anything mostly clipped away.
  const visibleFraction = (el, r) => {
    let box = { l: r.left, t: r.top, rt: r.right, b: r.bottom }
    let p = el.parentElement
    while (p && p !== document.body) {
      const ps = getComputedStyle(p)
      if (ps.overflow !== 'visible' || ps.overflowX !== 'visible' || ps.overflowY !== 'visible') {
        const pr = p.getBoundingClientRect()
        box = {
          l: Math.max(box.l, pr.left),
          t: Math.max(box.t, pr.top),
          rt: Math.min(box.rt, pr.right),
          b: Math.min(box.b, pr.bottom),
        }
      }
      p = p.parentElement
    }
    const w = Math.max(0, box.rt - box.l)
    const h = Math.max(0, box.b - box.t)
    const area = r.width * r.height
    return area > 0 ? (w * h) / area : 0
  }

  const found = []
  for (const el of document.querySelectorAll('body *')) {
    if (!worthTesting(el)) continue
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue

    const r = el.getBoundingClientRect()
    if (r.width < 8 || r.height < 8) continue
    if (visibleFraction(el, r) < 0.6) continue
    // only test what is on screen right now — elementFromPoint sees the viewport
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue

    // sample a grid of points inside the element, clamped to the viewport
    const xs = [0.15, 0.35, 0.5, 0.65, 0.85]
    const ys = [0.25, 0.5, 0.75]
    let tested = 0
    let covered = 0
    const coverers = new Map()

    for (const fx of xs) {
      for (const fy of ys) {
        const x = r.left + r.width * fx
        const y = r.top + r.height * fy
        if (x < 1 || x > vw - 1 || y < 1 || y > vh - 1) continue
        tested++
        const top = document.elementFromPoint(x, y)
        if (!top) continue
        if (related(top, el)) continue
        if (isTopBar(top)) continue
        covered++
        const k = desc(top)
        coverers.set(k, (coverers.get(k) || 0) + 1)
      }
    }

    if (tested < 4) continue
    const ratio = covered / tested
    if (ratio < minCoveredRatio) continue

    // name the thing doing the covering, and say whether it is pinned furniture
    let topCoverer = null
    let best = 0
    for (const [k, n] of coverers) if (n > best) { best = n; topCoverer = k }

    // find whether the covering element is fixed/sticky, by re-hit-testing centre
    let pinned = false
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1)
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1)
    const topEl = document.elementFromPoint(cx, cy)
    if (topEl && !related(topEl, el)) {
      let p = topEl
      while (p && p !== document.body) {
        const pos = getComputedStyle(p).position
        if (pos === 'fixed' || pos === 'sticky') { pinned = true; break }
        p = p.parentElement
      }
    }

    found.push({
      covered: desc(el),
      by: topCoverer,
      ratio: Number(ratio.toFixed(2)),
      pinned,
      docY: Math.round(r.top + window.scrollY),
    })
  }
  return found
}

const OVERFLOW = () => {
  const vw = window.innerWidth
  const docW = Math.max(
    document.documentElement.scrollWidth,
    document.body ? document.body.scrollWidth : 0
  )
  const desc = (el) => {
    const id = el.id ? `#${el.id}` : ''
    const cls =
      el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : ''
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 45)
    return `${el.tagName.toLowerCase()}${id}${cls}${txt ? ` "${txt}"` : ''}`
  }
  const out = []
  if (docW > vw + 1) {
    for (const el of document.querySelectorAll('body *')) {
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      const right = r.left + window.scrollX + r.width
      if (right <= vw + 1) continue
      const childOverflows = [...el.children].some((c) => {
        const cr = c.getBoundingClientRect()
        return cr.left + window.scrollX + cr.width > vw + 1
      })
      if (childOverflows) continue
      out.push({ el: desc(el), width: Math.round(r.width), over: Math.round(right - vw) })
    }
  }
  out.sort((a, b) => b.over - a.over)

  // CLIPPED: content wider than its container, where the container hides the
  // excess instead of scrolling it. This is worse than the page scrolling
  // sideways, because the hidden part cannot be reached at all — no scrollbar,
  // no swipe. A comparison table losing its last column to this is invisible to
  // every check that only asks whether the document scrolls sideways.
  const clipped = []
  for (const el of document.querySelectorAll('body *')) {
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
    const s = getComputedStyle(el)
    const ox = s.overflowX
    if (ox !== 'hidden' && ox !== 'clip') continue
    const hidden = el.scrollWidth - el.clientWidth
    if (hidden <= 2) continue
    const r = el.getBoundingClientRect()
    if (r.width < 40 || r.height < 20) continue
    // ignore decorative wrappers with no text of their own to lose
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim()
    if (txt.length < 10) continue
    clipped.push({
      el: desc(el),
      visibleWidth: el.clientWidth,
      contentWidth: el.scrollWidth,
      hiddenPx: hidden,
      hasTable: !!el.querySelector('table'),
      docY: Math.round(r.top + window.scrollY),
    })
  }
  clipped.sort((a, b) => b.hiddenPx - a.hiddenPx)

  return {
    documentWidth: Math.round(docW),
    viewportWidth: vw,
    scrollsSideways: docW > vw + 1,
    overflow: out.slice(0, 8),
    overflowCount: out.length,
    clipped: clipped.slice(0, 8),
    clippedCount: clipped.length,
  }
}

const browser = await chromium.launch({ executablePath: EXEC })
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})

if (SHOTS) await mkdir(SHOT_DIR, { recursive: true })

const LOG = join(ROOT, `.mobile-audit-${WIDTH}.log`)
const say = (line) => {
  console.log(line)
  appendFileSync(LOG, line + '\n')
}
writeFileSync(LOG, '')

say(`Mobile audit at ${WIDTH}x${HEIGHT} — ${routes.length} route(s) against ${BASE}`)
say(`third-party requests: ${ALLOW_3P ? 'allowed' : 'blocked'}\n`)

const page = await ctx.newPage()
page.on('pageerror', () => {})
if (!ALLOW_3P) {
  await page.route('**/*', (route) => {
    const u = route.request().url()
    return u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')
      ? route.continue()
      : route.abort()
  })
}

const results = []

for (const route of routes) {
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 })
    await page.waitForTimeout(ALLOW_3P ? 800 : 350)
    // trigger lazy content, then return to the top
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(ALLOW_3P ? 500 : 250)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(200)

    const flow = await page.evaluate(OVERFLOW)

    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    const step = Math.floor(HEIGHT * 0.8)
    const seen = new Map()
    for (let y = 0; y < height; y += step) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y)
      await page.waitForTimeout(90)
      const hits = await page.evaluate(OCCLUSION, { minCoveredRatio: 0.34 })
      for (const h of hits) {
        const k = h.covered + '|' + h.by
        // keep the worst instance of each pair
        if (!seen.has(k) || seen.get(k).ratio < h.ratio) seen.set(k, h)
      }
    }
    const occl = [...seen.values()].sort((a, b) => b.ratio - a.ratio)

    const r = { route, ...flow, occluded: occl, occludedCount: occl.length, pageHeight: height }
    results.push(r)

    const bad = r.scrollsSideways || occl.length > 0 || (r.clippedCount ?? 0) > 0
    if (bad) {
      say(`FAULT ${route}`)
      if (r.scrollsSideways)
        say(`        scrolls sideways: document ${r.documentWidth}px vs viewport ${r.viewportWidth}px (+${r.documentWidth - r.viewportWidth})`)
      for (const o of r.overflow.slice(0, 3)) say(`        overflow +${o.over}px (w${o.width})  ${o.el}`)
      for (const c of (r.clipped ?? []).slice(0, 3))
        say(`        CLIPPED ${c.hiddenPx}px unreachable${c.hasTable ? ' (contains a <table>)' : ''} @y${c.docY}  ${c.visibleWidth}px shown of ${c.contentWidth}px
           ${c.el}`)
      for (const o of occl.slice(0, 5))
        say(`        covered ${Math.round(o.ratio * 100)}%${o.pinned ? ' by PINNED element' : ''} @y${o.docY}\n           text: ${o.covered}\n           by:   ${o.by}`)
      if (SHOTS) {
        const name = (route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/\//g, '_')) + '.png'
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({ path: join(SHOT_DIR, name), fullPage: true })
      }
    } else {
      say(`ok    ${route}`)
    }
  } catch (e) {
    say(`ERR   ${route}  ${e.message.split('\n')[0]}`)
    results.push({ route, error: e.message.split('\n')[0] })
  }
}

await browser.close()

const errs = results.filter((r) => r.error)
const sideways = results.filter((r) => r.scrollsSideways)
const occluded = results.filter((r) => (r.occludedCount ?? 0) > 0)
const clippedPages = results.filter((r) => (r.clippedCount ?? 0) > 0)
const pinned = results.filter((r) => (r.occluded ?? []).some((o) => o.pinned))

say(`\n--- summary at ${WIDTH}px ---`)
say(`routes checked        : ${results.length}`)
say(`errored               : ${errs.length}`)
say(`scroll sideways       : ${sideways.length}`)
say(`clipped content      : ${clippedPages.length}`)
say(`have covered text     : ${occluded.length}`)
say(`  of which by pinned  : ${pinned.length}`)

// which coverers are responsible, across the whole site
const byCoverer = new Map()
for (const r of results) for (const o of r.occluded ?? []) {
  const k = o.by
  if (!byCoverer.has(k)) byCoverer.set(k, { pages: new Set(), pinned: o.pinned })
  byCoverer.get(k).pages.add(r.route)
}
say(`\ncoverers ranked by pages affected:`)
for (const [k, v] of [...byCoverer.entries()].sort((a, b) => b[1].pages.size - a[1].pages.size).slice(0, 12))
  say(`  ${String(v.pages.size).padStart(4)} page(s)  ${v.pinned ? '[pinned] ' : ''}${k}`)

const out = join(ROOT, `.mobile-audit-${WIDTH}.json`)
await writeFile(out, JSON.stringify({ width: WIDTH, height: HEIGHT, base: BASE, allow3p: ALLOW_3P, results }, null, 2))
say(`\nfull detail -> ${out}`)
if (SHOTS) say(`screenshots -> ${SHOT_DIR}`)
