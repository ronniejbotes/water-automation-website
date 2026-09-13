import { chromium } from 'playwright-core'
import { join } from 'node:path'
const EXEC = join(process.env.USERPROFILE, 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
const routes = process.argv.slice(2)
const b = await chromium.launch({ executablePath: EXEC })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
for (const r of routes) {
  const url = 'http://localhost:4400/' + String(r).replace(/^\/+/, '')
  const p = await ctx.newPage()
  const errs = []
  p.on('response', (res) => { if (res.status() >= 400) errs.push(res.status() + ' ' + res.url()) })
  try {
    await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  } catch (e) { console.log('### NAV ISSUE ' + url + ': ' + e.message) }
  await p.waitForTimeout(2500)
  const t = await p.evaluate(() => {
    const main = document.querySelector('main') || document.querySelector('#content') || document.body
    return main.innerText
  })
  console.log('===== ' + url + ' =====')
  console.log(t)
  if (errs.length) console.log('--- FAILED REQUESTS ---\n' + [...new Set(errs)].join('\n'))
  await p.close()
}
await b.close()
