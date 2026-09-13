/** scratch: screenshot one route at a scroll position or scrolled to a selector */
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
const SEL = argVal('--sel', '')
const Y = argVal('--y', '')
const OFFSET = Number(argVal('--offset', 100))
const OUT = argVal('--out', join(ROOT, 'shots', 'scratch'))
const TAG = argVal('--tag', 'shot')
const FULL = args.includes('--full')
const CLICK = argVal('--click', '')
const EXEC = process.env.CHROME || join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXEC })
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const page = await ctx.newPage()
page.on('pageerror', () => {})
if (!ALLOW_3P) await page.route('**/*', (r) => {
  const u = r.request().url()
  return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort()
})
await page.goto(BASE + ROUTE, { waitUntil: 'load', timeout: 60000 })
await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(600)
await page.evaluate(() => scrollTo(0, 0))
await page.waitForTimeout(WAIT)
if (CLICK) {
  await page.click(CLICK, { force: true, timeout: 5000 }).catch((e) => console.log('click failed:', e.message))
  await page.waitForTimeout(1000)
}
if (SEL) {
  const ok = await page.evaluate(([s, off]) => {
    const el = document.querySelector(s)
    if (!el) return false
    const r = el.getBoundingClientRect()
    scrollTo(0, r.top + scrollY - off)
    return { y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }
  }, [SEL, OFFSET])
  console.log('selector', SEL, JSON.stringify(ok))
} else if (Y) {
  await page.evaluate((y) => scrollTo(0, y), Number(Y))
}
await page.waitForTimeout(700)
const p = join(OUT, TAG + '.png')
const CLIP = argVal('--clip', '')
const clip = CLIP ? (() => { const [x, y, w, h] = CLIP.split(',').map(Number); return { x, y, width: w, height: h } })() : undefined
await page.screenshot({ path: p, fullPage: FULL, clip })
console.log('->', p)
await browser.close()
