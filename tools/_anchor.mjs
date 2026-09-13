/** scratch: load a URL with a hash and report where the target lands vs the fixed header */
import { chromium } from 'playwright-core'
import { join } from 'node:path'
const args = process.argv.slice(2)
const argVal = (f, d) => { const i = args.indexOf(f); return i === -1 ? d : args[i + 1] }
const BASE = 'http://localhost:4400'
const URLS = argVal('--urls', '/partner/#insurance').split(',')
const OUT = argVal('--out', '')
const EXEC = process.env.CHROME || join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
const browser = await chromium.launch({ executablePath: EXEC })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
const page = await ctx.newPage()
page.on('pageerror', () => {})
await page.route('**/*', (r) => { const u = r.request().url(); return (u.startsWith(BASE) || u.startsWith('data:')) ? r.continue() : r.abort() })
for (const u of URLS) {
  await page.goto(BASE + u, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(1800)
  const id = u.split('#')[1]
  const res = await page.evaluate((id) => {
    const el = document.getElementById(id) || document.querySelector('[name="' + id + '"]')
    if (!el) return { found: false, scrollY: Math.round(scrollY) }
    const r = el.getBoundingClientRect()
    let headerH = 0
    for (const e of document.querySelectorAll('body *')) {
      const s = getComputedStyle(e)
      if (s.position !== 'fixed' && s.position !== 'sticky') continue
      const rr = e.getBoundingClientRect()
      if (rr.top <= 1 && rr.width >= innerWidth * 0.9 && rr.height > headerH) headerH = Math.round(rr.height)
    }
    return { found: true, scrollY: Math.round(scrollY), targetTopInViewport: Math.round(r.top), headerH,
      hiddenUnderHeader: Math.round(Math.max(0, headerH - r.top)),
      firstText: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) }
  }, id)
  console.log(u, JSON.stringify(res))
  if (OUT) await page.screenshot({ path: join(OUT, 'anchor-' + id + '.png') })
}
await browser.close()
