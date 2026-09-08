/**
 * Capture the WooCommerce checkout page.
 *
 * /checkout/ is in the sitemap and is a real, indexable URL, but a cold visitor
 * never sees it: with an empty cart WooCommerce 302s straight to /cart/. So the
 * ordinary mirror run captures the redirect, not the page, and the copy ends up
 * with no checkout template at all.
 *
 * This adds a product to the cart in a live session first, then loads /checkout/
 * and writes what it renders — the billing fields, the order table, the Stripe
 * payment block, the terms copy. That markup is the thing worth keeping; the
 * cart contents baked into it are a sample of one order and are noted as such
 * in MIRROR.md.
 *
 *   node tools/capture-checkout.mjs
 */
import { chromium } from 'playwright-core'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ORIGIN, UA, rewrite, pathToFile, isPlausiblePage, describeBadPage } from './site.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, process.env.MIRROR_DIR || '.')
const RAW = join(ROOT, '_raw')
const EXEC = process.env.CHROME || join(process.env.USERPROFILE || process.env.HOME || '',
  'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')

const PRODUCT = process.env.PRODUCT || '/product/aquahalt-2x/'

const browser = await chromium.launch({ executablePath: EXEC })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA })
const page = await ctx.newPage()

const assets = []
page.on('response', async (res) => {
  const url = res.url()
  if (!url.startsWith(ORIGIN) || res.status() !== 200) return
  if (res.request().resourceType() === 'document') return
  const urlPath = url.slice(ORIGIN.length) || '/'
  const bare = urlPath.split('?')[0]
  if (/\.php(\?|$)/.test(bare) || bare.startsWith('/wp-json/')) return
  // No extension means this is a page route, and pages are not this handler's
  // to write. WooCommerce's /?wc-ajax=get_refreshed_fragments is an XHR whose
  // path is "/", and without this guard it overwrites index.html. See the
  // longer note in mirror-browser.mjs.
  if (!extname(bare)) return
  const file = pathToFile(OUT, urlPath)
  assets.push((async () => {
    try {
      const { existsSync } = await import('node:fs')
      if (existsSync(file)) return
      const buf = await res.body()
      await mkdir(dirname(file), { recursive: true })
      const ext = extname(bare)
      await writeFile(file, ext === '.css' || ext === '.js' || ext === '.svg'
        ? rewrite(buf.toString('utf8'), false) : buf)
    } catch { /* body evicted */ }
  })())
})

console.log(`Adding ${PRODUCT} to the cart…`)
await page.goto(ORIGIN + PRODUCT, { waitUntil: 'domcontentloaded', timeout: 60000 })

// The add-to-cart control is a normal form submit on a simple product and an
// AJAX button on a variable one; clicking the button covers both.
const btn = page.locator('button[name="add-to-cart"], .single_add_to_cart_button').first()
await btn.waitFor({ state: 'visible', timeout: 20000 })
await btn.click()
await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(2500)

for (const route of ['/cart/', '/checkout/']) {
  console.log(`Capturing ${route}…`)
  const res = await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (!res) { console.log(`  ! no response for ${route}`); continue }
  if (res.url() !== ORIGIN + route) {
    console.log(`  ! ${route} still redirected to ${res.url().replace(ORIGIN, '')} — cart did not fill`)
    continue
  }
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await sleep(80) }
    window.scrollTo(0, 0)
  }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1500)

  const html = await page.content()
  if (!isPlausiblePage(html)) { console.log(`  ! rejected: ${describeBadPage(html)}`); continue }

  for (const [dir, protect] of [[RAW, false], [OUT, true]]) {
    const file = pathToFile(dir, route)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, protect ? rewrite(html, true) : html)
  }
  console.log(`  wrote ${route} (${html.length} bytes)`)
}

await Promise.allSettled(assets)
await browser.close()
console.log('done')
