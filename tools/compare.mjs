/**
 * Compare the mirror against the live site the way a person would: open both in
 * a real browser, scroll each one to the bottom so lazy images, carousels and
 * scroll-triggered animations actually run, then check that what ended up on
 * screen matches.
 *
 * Comparing HTML would not answer this. Two documents can be byte-identical and
 * still render differently if a stylesheet, a font or a script is missing from
 * the copy, and that is exactly the failure this is looking for. So the checks
 * are all made against the rendered page:
 *
 *   - full-page screenshot of each, diffed pixel by pixel
 *   - visible text, compared word for word
 *   - counts of img/video/iframe/svg, and how many images actually decoded
 *   - every console error and failed request the copy produces
 *
 * Needs `node tools/serve.mjs` running (or pass --local http://host:port).
 *
 *   node tools/compare.mjs                    # every route in routes.txt
 *   node tools/compare.mjs / /shop/           # just these
 *   node tools/compare.mjs --mobile           # 390x844 instead of 1440x900
 *   node tools/compare.mjs --shots            # keep the PNGs in shots/
 */
import { chromium } from 'playwright-core'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ORIGIN, UA } from './site.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argVal = (f) => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1] }
const LOCAL = argVal('--local') || 'http://localhost:4400'
const MOBILE = args.includes('--mobile')
const KEEP_SHOTS = args.includes('--shots')
const SHOTS = join(ROOT, 'shots', MOBILE ? 'mobile' : 'desktop')
const EXEC = process.env.CHROME || join(process.env.USERPROFILE || process.env.HOME || '',
  'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 }

// A screenshot of a page carrying a live chat widget, a reviews carousel and
// autoplaying video will never match twice in a row, let alone across two
// origins. These are hidden on both sides so the diff reports layout and
// content drift rather than the frame each animation happened to be on.
const NEUTRALISE = `
  for (const el of document.querySelectorAll(
      'iframe, video, [id*="fastbots"], [class*="fastbots"], .ti-widget, [class*="trustindex"]')) {
    el.style.visibility = 'hidden'
  }
  const s = document.createElement('style')
  s.textContent = \`*,*::before,*::after{
    animation-duration:0s!important;animation-delay:0s!important;
    transition-duration:0s!important;transition-delay:0s!important;
    caret-color:transparent!important;scroll-behavior:auto!important}\`
  document.head.appendChild(s)
`

async function routeList() {
  const cli = args.filter((a) => !a.startsWith('--') && a !== LOCAL)
  if (cli.length) return cli
  const text = await readFile(join(ROOT, 'routes.txt'), 'utf8')
  return text.split('\n').map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#') && !s.endsWith('.xml'))
}

const routes = await routeList()
await mkdir(SHOTS, { recursive: true })

const browser = await chromium.launch({ executablePath: EXEC })

/** Load one page, run it, and report what it rendered. */
async function capture(ctx, url, tag) {
  const page = await ctx.newPage()
  const errors = []
  const failed = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)))
  page.on('requestfailed', (r) => {
    const u = r.url()
    // Third-party widgets fail independently on both sides and say nothing
    // about whether the copy is faithful.
    if (!u.startsWith(ORIGIN) && !u.startsWith(LOCAL)) return
    failed.push(`${r.failure()?.errorText || 'failed'}  ${u.replace(ORIGIN, '').replace(LOCAL, '')}`)
  })
  // A 404 is a perfectly successful HTTP exchange, so requestfailed never sees
  // it — but a 404 on the copy is exactly the signature of an asset that was
  // never downloaded, which is the main thing worth catching here.
  page.on('response', (r) => {
    const u = r.url()
    if (!u.startsWith(ORIGIN) && !u.startsWith(LOCAL)) return
    if (r.status() >= 400) failed.push(`HTTP ${r.status()}  ${u.replace(ORIGIN, '').replace(LOCAL, '')}`)
  })

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  } catch (e) {
    await page.close()
    return { error: e.message.split('\n')[0], tag }
  }

  // Scroll the whole page so anything deferred loads and any scroll-triggered
  // animation has run before the screenshot.
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const step = Math.round(window.innerHeight * 0.6)
    let last = -1
    for (let y = 0; y < document.body.scrollHeight && y !== last; y += step) {
      last = y; window.scrollTo(0, y); await sleep(80)
    }
    window.scrollTo(0, document.body.scrollHeight); await sleep(250)
    window.scrollTo(0, 0); await sleep(150)
  }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.evaluate(NEUTRALISE).catch(() => {})
  await page.waitForTimeout(400)

  const info = await page.evaluate(() => {
    const vis = (el) => {
      const s = getComputedStyle(el)
      return s.display !== 'none' && s.visibility !== 'hidden'
    }
    const imgs = [...document.images]
    return {
      title: document.title,
      text: (document.body.innerText || '').replace(/\s+/g, ' ').trim(),
      height: document.body.scrollHeight,
      counts: {
        img: imgs.length,
        imgLoaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
        video: document.querySelectorAll('video').length,
        iframe: document.querySelectorAll('iframe').length,
        svg: document.querySelectorAll('svg').length,
        link: [...document.querySelectorAll('a[href]')].filter(vis).length,
        button: document.querySelectorAll('button,[role="button"],.elementor-button').length,
        form: document.querySelectorAll('form').length,
      },
      // Images the browser tried and could not decode. On the copy this is the
      // signature of a file that was never downloaded.
      brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc)
        .map((i) => i.currentSrc.replace(location.origin, '')).slice(0, 25),
    }
  })

  let shot = null
  try {
    shot = await page.screenshot({ fullPage: true, animations: 'disabled', timeout: 45000 })
  } catch { /* very tall pages can time out; the DOM checks still stand */ }

  await page.close()
  return { ...info, errors, failed, shot, tag }
}

/**
 * Pixel-diff two PNGs by decoding both in a page and comparing on a canvas.
 * Done in the browser to avoid a native image dependency for one number.
 */
const differ = await browser.newPage()
async function diffPct(a, b) {
  if (!a || !b) return null
  return differ.evaluate(async ([da, db]) => {
    const load = (d) => new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = d
    })
    const [ia, ib] = await Promise.all([load(da), load(db)])
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height)
    const mk = (img) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h)
      x.drawImage(img, 0, 0)
      return x.getImageData(0, 0, w, h).data
    }
    const A = mk(ia), B = mk(ib)
    let diff = 0
    for (let i = 0; i < A.length; i += 4) {
      if (Math.abs(A[i] - B[i]) > 12 || Math.abs(A[i + 1] - B[i + 1]) > 12 ||
          Math.abs(A[i + 2] - B[i + 2]) > 12) diff++
    }
    return {
      pct: +(100 * diff / (w * h)).toFixed(2),
      sizeA: `${ia.width}x${ia.height}`, sizeB: `${ib.width}x${ib.height}`,
    }
  }, [`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`])
}

/** Words present on one side and not the other. */
function textDelta(liveText, mineText) {
  const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s$%.,-]/gu, ' ').split(/\s+/).filter(Boolean)
  const L = norm(liveText), M = norm(mineText)
  const cnt = (arr) => { const m = new Map(); for (const w of arr) m.set(w, (m.get(w) || 0) + 1); return m }
  const cl = cnt(L), cm = cnt(M)
  const missing = [], extra = []
  for (const [w, n] of cl) { const d = n - (cm.get(w) || 0); if (d > 0) missing.push([w, d]) }
  for (const [w, n] of cm) { const d = n - (cl.get(w) || 0); if (d > 0) extra.push([w, d]) }
  return {
    liveWords: L.length,
    mineWords: M.length,
    missing: missing.sort((a, b) => b[1] - a[1]).slice(0, 12),
    extra: extra.sort((a, b) => b[1] - a[1]).slice(0, 12),
  }
}

const ctxLive = await browser.newContext({ viewport: VIEWPORT, userAgent: UA })
const ctxMine = await browser.newContext({ viewport: VIEWPORT, userAgent: UA })

const report = []
console.log(`Comparing ${routes.length} route(s) at ${VIEWPORT.width}x${VIEWPORT.height}`)
console.log(`  live:  ${ORIGIN}\n  local: ${LOCAL}\n`)

for (const route of routes) {
  const [live, mine] = await Promise.all([
    capture(ctxLive, ORIGIN + route, 'live'),
    capture(ctxMine, LOCAL + route, 'mine'),
  ])

  const row = { route }
  if (live.error || mine.error) {
    row.error = live.error ? `live: ${live.error}` : `mine: ${mine.error}`
    report.push(row)
    console.log(`! ${route}  ${row.error}`)
    continue
  }

  const d = await diffPct(live.shot, mine.shot).catch(() => null)
  row.pixel = d
  row.title = live.title === mine.title ? null : { live: live.title, mine: mine.title }
  row.text = textDelta(live.text, mine.text)
  row.counts = {}
  for (const k of Object.keys(live.counts)) {
    if (live.counts[k] !== mine.counts[k]) row.counts[k] = { live: live.counts[k], mine: mine.counts[k] }
  }
  row.brokenImages = mine.brokenImages
  // Only failures the copy has and the original does not. The live site 404s on
  // a few of its own links (/products, /partner/insurance), and those are
  // faithfully reproduced here — reporting them as mirror defects would bury
  // the real ones.
  const liveFailed = new Set(live.failed)
  row.failedRequests = mine.failed
    .filter((f) => !liveFailed.has(f))
    // /cdn-cgi/ is Cloudflare's own edge namespace — the RUM beacon and
    // rocket-loader endpoints are injected into the HTML by the CDN, not served
    // from the site's files. They 404 off the copy by definition and say
    // nothing about whether the mirror is complete.
    .filter((f) => !f.includes('/cdn-cgi/'))
  row.liveFailedRequests = live.failed
  row.jsErrors = { live: live.errors.length, mine: mine.errors.length }
  row.mineErrorSamples = mine.errors.filter((e) => !live.errors.includes(e)).slice(0, 5)

  if (KEEP_SHOTS && live.shot && mine.shot) {
    const base = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'
    await writeFile(join(SHOTS, `${base}.live.png`), live.shot)
    await writeFile(join(SHOTS, `${base}.mine.png`), mine.shot)
  }

  const bad = (d && d.pct > 2) || row.title || Object.keys(row.counts).length ||
    row.text.missing.length || row.brokenImages.length || row.failedRequests.length
  const flag = bad ? '!' : ' '
  console.log(`${flag} ${route}` +
    `  pixel ${d ? d.pct + '%' : 'n/a'}` +
    `  words ${row.text.liveWords}/${row.text.mineWords}` +
    `  img ${live.counts.imgLoaded}/${live.counts.img} vs ${mine.counts.imgLoaded}/${mine.counts.img}` +
    (row.brokenImages.length ? `  BROKEN-IMG ${row.brokenImages.length}` : '') +
    (row.failedRequests.length ? `  FAILED-REQ ${row.failedRequests.length}` : '') +
    (Object.keys(row.counts).length ? `  COUNTS ${JSON.stringify(row.counts)}` : ''))
  report.push(row)
}

await browser.close()

const out = join(ROOT, `.compare${MOBILE ? '-mobile' : ''}.json`)
await writeFile(out, JSON.stringify(report, null, 1))

const flagged = report.filter((r) => r.error || (r.pixel && r.pixel.pct > 2) || r.title ||
  (r.counts && Object.keys(r.counts).length) || (r.brokenImages && r.brokenImages.length) ||
  (r.failedRequests && r.failedRequests.length) || (r.text && r.text.missing.length))

console.log(`\n--- comparison complete ---`)
console.log(`routes compared: ${report.length}`)
console.log(`clean:           ${report.length - flagged.length}`)
console.log(`flagged:         ${flagged.length}`)
console.log(`full report:     ${out}`)
