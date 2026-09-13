/** scratch probe: arbitrary page.evaluate against a route on the phone viewport */
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
const ROUTE = argVal('--route', '/')
const ALLOW_3P = args.includes('--3p')
const WAIT = Number(argVal('--wait', ALLOW_3P ? 12000 : 1200))
const FN = await readFile(argVal('--fn'), 'utf8')
const EXEC = process.env.CHROME || join(process.env.USERPROFILE || '', 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
const browser = await chromium.launch({ executablePath: EXEC })
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2, isMobile: !args.includes('--nomobile'), hasTouch: true,
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
await page.waitForTimeout(500)
await page.evaluate(() => scrollTo(0, 0))
await page.waitForTimeout(WAIT)
const CLICK = argVal('--click', '')
if (CLICK) { await page.click(CLICK, { force: true, timeout: 8000 }).catch((e) => console.log('click failed', e.message)); await page.waitForTimeout(1200) }
const out = await page.evaluate(`(${FN})()`)
console.log(JSON.stringify(out, null, 1))
await browser.close()
