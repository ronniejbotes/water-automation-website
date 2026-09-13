/** scratch: run one measurement fn over many routes, print compact per-route results */
import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const argVal = (f, d) => { const i = args.indexOf(f); return i === -1 ? d : args[i + 1] }
const BASE = 'http://localhost:4400'
const WIDTH = Number(argVal('--width', 390))
const HEIGHT = Number(argVal('--height', 844))
const ALLOW_3P = args.includes('--3p')
const WAIT = Number(argVal('--wait', ALLOW_3P ? 12000 : 900))
const ROUTES = argVal('--routes', '/').split(',').map((s) => s.trim()).filter(Boolean)
const FN = await readFile(argVal('--fn'), 'utf8')
const EXEC = process.env.CHROME || join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
const browser = await chromium.launch({ executablePath: EXEC })
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2,
  isMobile: !args.includes('--nomobile'), hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const page = await ctx.newPage()
page.on('pageerror', () => {})
const failed = []
page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()) })
if (!ALLOW_3P) await page.route('**/*', (r) => {
  const u = r.request().url()
  return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort()
})
const all = {}
for (const route of ROUTES) {
  failed.length = 0
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 })
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await page.evaluate(() => scrollTo(0, 0))
    await page.waitForTimeout(WAIT)
    const out = await page.evaluate(`(${FN})()`)
    all[route] = { ...out, httpFailures: failed.filter((f) => f.startsWith('4') || f.startsWith('5')).slice(0, 6) }
  } catch (e) {
    all[route] = { error: e.message }
  }
}
console.log(JSON.stringify(all, null, 1))
await browser.close()
