/**
 * Scratch harness: take real phone screenshots and measure phone-specific faults
 * that the occlusion audit does not cover (tap targets, input font size, fixed
 * furniture, hero, menu). Not part of the build.
 *
 *   node tools/_phoneshots.mjs --route /shop/ --width 390 [--3p] [--wait 12000]
 *   node tools/_phoneshots.mjs --route /shop/ --menu     # open the mobile menu
 */
import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argVal = (f, d) => { const i = args.indexOf(f); return i === -1 ? d : args[i + 1] }
const BASE = 'http://localhost:4400'
const WIDTH = Number(argVal('--width', 390))
const HEIGHT = Number(argVal('--height', 844))
const ROUTE = argVal('--route', '/')
const ALLOW_3P = args.includes('--3p')
const WAIT = Number(argVal('--wait', ALLOW_3P ? 12000 : 1200))
const MENU = args.includes('--menu')
const OUT = argVal('--out', join(ROOT, '..', '..', 'shots-scratch'))
const TAG = argVal('--tag', (ROUTE === '/' ? 'home' : ROUTE.replace(/^\/|\/$/g, '').replace(/\//g, '_')) + '-' + WIDTH)

const EXEC = process.env.CHROME || join(
  process.env.USERPROFILE || process.env.HOME || '',
  'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
)

const MEASURE = () => {
  const vw = innerWidth, vh = innerHeight
  const desc = (el) => {
    if (!el) return '(none)'
    const id = el.id ? `#${el.id}` : ''
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50)
    return `${el.tagName.toLowerCase()}${id}${cls}${txt ? ` "${txt}"` : ''}`
  }
  const vis = (el) => typeof el.checkVisibility !== 'function'
    || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })

  // 1. every fixed / sticky element currently painting
  const pinned = []
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el)
    if (s.position !== 'fixed' && s.position !== 'sticky') continue
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) continue
    pinned.push({
      el: desc(el), pos: s.position, z: s.zIndex,
      x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height),
      right: Math.round(vw - r.right), bottom: Math.round(vh - r.bottom),
    })
  }

  // 2. tap targets under 44x44 (Apple HIG) / 48x48 (Material)
  const small = []
  const seen = new Set()
  for (const el of document.querySelectorAll('a,button,input,select,textarea,[role="button"],[onclick]')) {
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    if (r.width >= 44 && r.height >= 44) continue
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim()
    const k = desc(el) + Math.round(r.width) + 'x' + Math.round(r.height)
    if (seen.has(k)) continue
    seen.add(k)
    small.push({ el: desc(el), w: Math.round(r.width), h: Math.round(r.height),
      docY: Math.round(r.top + scrollY), text: t.slice(0, 40),
      href: el.getAttribute('href') || '' })
  }

  // 3. form fields whose font-size is under 16px -> iOS zooms on focus
  const zoomy = []
  for (const el of document.querySelectorAll('input,select,textarea')) {
    if (!vis(el)) continue
    const s = getComputedStyle(el)
    const fs = parseFloat(s.fontSize)
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const type = (el.getAttribute('type') || el.tagName).toLowerCase()
    if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'image'].includes(type)) continue
    zoomy.push({ el: desc(el), fontSize: fs, h: Math.round(r.height), type,
      name: el.getAttribute('name') || '', placeholder: el.getAttribute('placeholder') || '' })
  }

  // 4. images: natural vs rendered aspect ratio (distortion), and overflow
  const imgs = []
  for (const el of document.querySelectorAll('img')) {
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 20 || r.height < 20) continue
    const nw = el.naturalWidth, nh = el.naturalHeight
    if (!nw || !nh) { imgs.push({ el: desc(el), broken: true, src: el.currentSrc || el.src, w: Math.round(r.width), h: Math.round(r.height) }); continue }
    const nar = nw / nh, rar = r.width / r.height
    const skew = Math.abs(nar - rar) / nar
    const fit = getComputedStyle(el).objectFit
    if (skew > 0.06 && fit !== 'cover' && fit !== 'contain') {
      imgs.push({ el: desc(el), natural: `${nw}x${nh}`, rendered: `${Math.round(r.width)}x${Math.round(r.height)}`,
        skewPct: Math.round(skew * 100), objectFit: fit, docY: Math.round(r.top + scrollY), src: (el.currentSrc || el.src).split('/').pop() })
    }
  }

  // 5. tables
  const tables = []
  for (const t of document.querySelectorAll('table')) {
    if (!vis(t)) continue
    const r = t.getBoundingClientRect()
    let scroller = null, p = t.parentElement
    while (p && p !== document.body) {
      const ps = getComputedStyle(p)
      if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') { scroller = desc(p); break }
      p = p.parentElement
    }
    tables.push({ el: desc(t).slice(0, 60), w: Math.round(r.width), scrollW: t.scrollWidth,
      cols: t.querySelector('tr') ? t.querySelector('tr').children.length : 0,
      scroller, overflowsViewport: r.left + scrollX + r.width > vw + 1 })
  }

  // 6. smallest body text actually rendered
  const fonts = new Map()
  for (const el of document.querySelectorAll('p,li,span,td,th,div,a,h1,h2,h3,h4,h5,h6,label,figcaption')) {
    let own = ''
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent
    own = own.replace(/\s+/g, ' ').trim()
    if (own.length < 12) continue
    if (!vis(el)) continue
    const fs = Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10
    if (fs >= 14) continue
    const k = fs + '|' + desc(el).split('"')[0]
    if (!fonts.has(k)) fonts.set(k, { fontSize: fs, el: desc(el), sample: own.slice(0, 60), docY: Math.round(el.getBoundingClientRect().top + scrollY) })
  }

  return {
    docW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    vw, docH: document.documentElement.scrollHeight,
    pinned, small: small.sort((a, b) => a.w * a.h - b.w * b.h).slice(0, 40), smallCount: small.length,
    zoomy, imgs, tables, tinyText: [...fonts.values()].sort((a, b) => a.fontSize - b.fontSize).slice(0, 20),
  }
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXEC })
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const page = await ctx.newPage()
page.on('pageerror', () => {})
if (!ALLOW_3P) {
  await page.route('**/*', (r) => {
    const u = r.request().url()
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort()
  })
}
await page.goto(BASE + ROUTE, { waitUntil: 'load', timeout: 60000 })
await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(600)
await page.evaluate(() => scrollTo(0, 0))
await page.waitForTimeout(WAIT)

if (MENU) {
  const sel = await page.evaluate(() => {
    const c = document.querySelector('.elementor-menu-toggle, .menu-toggle, [aria-label*="Menu" i], button[aria-expanded]')
    return c ? (c.id ? '#' + c.id : '.' + c.className.trim().split(/\s+/)[0]) : null
  })
  if (sel) { await page.click(sel, { force: true }).catch(() => {}); await page.waitForTimeout(900) }
  console.log('menu toggle used:', sel)
}

const m = await page.evaluate(MEASURE)
console.log(JSON.stringify(m, null, 1))

// screenshots: top viewport, then every 0.85 viewport down, capped
const H = await page.evaluate(() => document.documentElement.scrollHeight)
const step = Math.floor(HEIGHT * 0.85)
const maxShots = Number(argVal('--maxshots', 6))
let n = 0
for (let y = 0; y < H && n < maxShots; y += step, n++) {
  await page.evaluate((yy) => scrollTo(0, yy), y)
  await page.waitForTimeout(450)
  await page.screenshot({ path: join(OUT, `${TAG}-${String(n).padStart(2, '0')}.png`) })
}
console.log('shots ->', OUT, TAG, n)
await browser.close()
