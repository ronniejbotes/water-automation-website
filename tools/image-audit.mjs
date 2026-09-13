/**
 * Find images that are stretched, upscaled, or laid out badly.
 *
 * Why this exists
 * ---------------
 * The client's words were "image stretching" and "stretched imagery, awkward
 * positioning, or old imagery", and that the product should look "polished and
 * credible". Stretch is not a matter of taste — it is measurable. An image has a
 * natural aspect ratio and a rendered one, and when they differ the picture is
 * distorted. Same for upscaling: rendering a 300px-wide file at 900px is why a
 * product photo looks soft next to a competitor's.
 *
 * Four faults, all measured rather than judged:
 *
 *   STRETCH    rendered aspect ratio differs from the file's own by more than
 *              the tolerance. The picture is visibly squashed or pulled.
 *   UPSCALE    rendered larger than the file's natural size, so the browser is
 *              inventing pixels. This is what "low quality" usually turns out to be.
 *   OVERSIZE   the opposite — a huge file rendered small. Costs load time, and on
 *              a product page it is the difference between fast and sluggish.
 *   NODIMS     no width/height attributes and no CSS aspect-ratio, so the page
 *              reflows as it loads. This is the jumping-about during page load.
 *
 * Runs at both phone and desktop widths, because a layout can be fine at one and
 * broken at the other, and the client reported problems on both.
 *
 *   node tools/image-audit.mjs                       # all routes, both widths
 *   node tools/image-audit.mjs --only /buy-now/,/shop/
 *   node tools/image-audit.mjs --width 390           # one width only
 *   node tools/image-audit.mjs --limit 30
 */
import { chromium } from 'playwright-core'
import { readFile, writeFile } from 'node:fs/promises'
import { appendFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argVal = (f, d) => { const i = args.indexOf(f); return i === -1 ? d : args[i + 1] }
const BASE = argVal('--local', 'http://localhost:4400')
const ONLY = argVal('--only', '')
const LIMIT = Number(argVal('--limit', 0))
const ONE_WIDTH = Number(argVal('--width', 0))
const EXEC = process.env.CHROME || join(
  process.env.USERPROFILE || process.env.HOME || '',
  'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
)

// How much distortion to tolerate before calling it stretched. 3% is below what
// a person notices on a photograph but above sub-pixel rounding noise.
const STRETCH_TOLERANCE = 0.03
// How much upscaling to tolerate. Retina screens render at 2x, so the honest
// question is whether the file is smaller than the CSS box, not the device box.
const UPSCALE_TOLERANCE = 1.15
// A file more than this many times larger than its rendered box is wasted bytes.
const OVERSIZE_FACTOR = 3

let routes = ONLY
  ? ONLY.split(',').map((s) => s.trim()).filter(Boolean)
  : (await readFile(join(ROOT, 'routes.txt'), 'utf8'))
      .split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
// routes.txt lists the sitemaps and robots.txt alongside the pages. Those have no
// document to probe, so they only produce errors here.
routes = routes.filter((r) => !/\.(xml|txt|json)$/i.test(r))
if (LIMIT) routes = routes.slice(0, LIMIT)

const VIEWPORTS = ONE_WIDTH
  ? [{ name: `${ONE_WIDTH}px`, width: ONE_WIDTH, height: 844, mobile: ONE_WIDTH < 900 }]
  : [
      { name: 'phone', width: 390, height: 844, mobile: true },
      { name: 'desktop', width: 1440, height: 900, mobile: false },
    ]

const PROBE = ({ stretchTol, upscaleTol, oversizeFactor }) => {
  const out = []
  for (const img of document.querySelectorAll('img')) {
    if (typeof img.checkVisibility === 'function' &&
        !img.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue
    const r = img.getBoundingClientRect()
    if (r.width < 24 || r.height < 24) continue
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    const cs = getComputedStyle(img)

    const src = (img.currentSrc || img.src || '').replace(location.origin, '')
    const base = {
      src: src.slice(0, 110),
      rendered: `${Math.round(r.width)}x${Math.round(r.height)}`,
      natural: nw && nh ? `${nw}x${nh}` : 'unknown',
      objectFit: cs.objectFit,
      alt: (img.getAttribute('alt') || '').slice(0, 40),
    }

    // NODIMS — nothing reserving space while the file loads
    const hasAttrs = img.hasAttribute('width') && img.hasAttribute('height')
    const hasRatio = cs.aspectRatio && cs.aspectRatio !== 'auto'
    if (!hasAttrs && !hasRatio) out.push({ ...base, fault: 'NODIMS', detail: 'no width/height attributes and no CSS aspect-ratio' })

    if (!nw || !nh) continue

    // STRETCH — only meaningful when the browser is not cropping for us
    if (cs.objectFit === 'fill' || cs.objectFit === 'none' || !cs.objectFit) {
      const naturalRatio = nw / nh
      const renderedRatio = r.width / r.height
      const drift = Math.abs(renderedRatio - naturalRatio) / naturalRatio
      if (drift > stretchTol) {
        out.push({
          ...base,
          fault: 'STRETCH',
          detail: `natural ${naturalRatio.toFixed(3)} vs rendered ${renderedRatio.toFixed(3)} — ${(drift * 100).toFixed(0)}% ${renderedRatio > naturalRatio ? 'wider' : 'taller'} than it should be`,
          drift,
        })
      }
    }

    // UPSCALE — the file is smaller than the box it is painted into
    if (r.width > nw * upscaleTol) {
      out.push({
        ...base,
        fault: 'UPSCALE',
        detail: `${nw}px file painted into a ${Math.round(r.width)}px box — ${(r.width / nw).toFixed(1)}x`,
        drift: r.width / nw,
      })
    }

    // OVERSIZE — far more pixels downloaded than used
    if (nw > r.width * oversizeFactor && r.width > 0) {
      out.push({
        ...base,
        fault: 'OVERSIZE',
        detail: `${nw}px file for a ${Math.round(r.width)}px box — ${(nw / r.width).toFixed(1)}x more pixels than needed`,
        drift: nw / r.width,
      })
    }
  }
  return out
}

const LOG = join(ROOT, '.image-audit.log')
const say = (l) => { console.log(l); appendFileSync(LOG, l + '\n') }
writeFileSync(LOG, '')

const browser = await chromium.launch({ executablePath: EXEC })
say(`Image audit — ${routes.length} route(s) at ${VIEWPORTS.map((v) => v.width + 'px').join(' and ')}\n`)

const all = []
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    userAgent: vp.mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
  })
  const page = await ctx.newPage()
  page.on('pageerror', () => {})
  // keep it local and deterministic; third-party images are not ours to fix
  await page.route('**/*', (r) => {
    const u = r.request().url()
    return u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:') ? r.continue() : r.abort()
  })

  say(`──────── ${vp.name} (${vp.width}x${vp.height})`)
  for (const route of routes) {
    try {
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 })
      await page.waitForTimeout(350)
      // pull lazy images in, then settle
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(450)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(200)
      const faults = await page.evaluate(PROBE, {
        stretchTol: STRETCH_TOLERANCE,
        upscaleTol: UPSCALE_TOLERANCE,
        oversizeFactor: OVERSIZE_FACTOR,
      })
      for (const f of faults) all.push({ route, viewport: vp.name, ...f })
      const bad = faults.filter((f) => f.fault === 'STRETCH' || f.fault === 'UPSCALE')
      if (bad.length) {
        say(`  ${route}`)
        for (const f of bad.slice(0, 4)) say(`      ${f.fault}  ${f.detail}\n              ${f.src}`)
      }
    } catch (e) {
      say(`  ERR ${route}  ${e.message.split('\n')[0]}`)
    }
  }
  await ctx.close()
}
await browser.close()

const by = (f) => all.filter((x) => x.fault === f)
say(`\n──────── summary`)
for (const f of ['STRETCH', 'UPSCALE', 'OVERSIZE', 'NODIMS']) {
  const rows = by(f)
  const pages = new Set(rows.map((r) => r.route)).size
  const imgs = new Set(rows.map((r) => r.src)).size
  say(`  ${f.padEnd(9)} ${String(rows.length).padStart(5)} instance(s)  ${String(imgs).padStart(4)} distinct image(s)  ${String(pages).padStart(4)} page(s)`)
}

// the worst offenders, deduped by image
say(`\n──────── most stretched images`)
const worst = new Map()
for (const r of by('STRETCH')) {
  const cur = worst.get(r.src)
  if (!cur || r.drift > cur.drift) worst.set(r.src, r)
}
for (const r of [...worst.values()].sort((a, b) => b.drift - a.drift).slice(0, 12)) {
  say(`  ${(r.drift * 100).toFixed(0)}%  ${r.viewport.padEnd(8)} ${r.natural} -> ${r.rendered}  ${r.src}`)
}

say(`\n──────── most upscaled images`)
const up = new Map()
for (const r of by('UPSCALE')) {
  const cur = up.get(r.src)
  if (!cur || r.drift > cur.drift) up.set(r.src, r)
}
for (const r of [...up.values()].sort((a, b) => b.drift - a.drift).slice(0, 12)) {
  say(`  ${r.drift.toFixed(1)}x  ${r.viewport.padEnd(8)} ${r.natural} -> ${r.rendered}  ${r.src}`)
}

await writeFile(join(ROOT, '.image-audit.json'), JSON.stringify(all, null, 2))
say(`\nfull detail -> .image-audit.json`)
