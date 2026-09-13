import { chromium } from 'playwright-core'
import { join } from 'node:path'
const EXEC = join(process.env.USERPROFILE, 'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')
const B = 'http://localhost:4400'
const browser = await chromium.launch({ executablePath: EXEC })

async function submitTest(path, formIdx, fill) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const net = []
  page.on('request', r => { if (r.method()==='POST' && r.url().includes('localhost')) net.push('POST '+r.url().replace(B,'')) })
  page.on('response', r => { if (r.request().method()==='POST' && r.url().includes('localhost')) net.push('  <- '+r.status()+' '+r.url().replace(B,'')) })
  await page.goto(B + path, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)
  const f = page.locator('form.elementor-form').nth(formIdx)
  for (const [sel, val] of fill) { try { await f.locator(sel).fill(val, { timeout: 8000 }) } catch(e){ net.push('FILL FAIL '+sel+': '+e.message.split('\n')[0]) } }
  await f.locator('button[type=submit]').click({ timeout: 10000 }).catch(e=>net.push('CLICK FAIL'))
  await page.waitForTimeout(7000)
  const msgs = await page.evaluate((i) => {
    const f = document.querySelectorAll('form.elementor-form')[i]
    return { formMsgs: [...f.querySelectorAll('.elementor-message')].map(e=>e.className+' :: '+JSON.stringify(e.textContent.trim())),
             valuesKept: [...f.querySelectorAll('input,textarea')].filter(e=>e.type!=='hidden'&&e.value).map(e=>e.name+'='+e.value.slice(0,25)) }
  }, formIdx)
  console.log('### ' + path + ' form#' + formIdx)
  console.log('  net:', JSON.stringify(net))
  console.log('  msgs:', JSON.stringify(msgs, null, 1))
  await ctx.close()
}

await submitTest('/contact-us/', 1, [['input[name="form_fields[name]"]','Test Buyer'],['input[name="form_fields[email]"]','test@example.com'],['input[name="form_fields[tel]"]','6175550134'],['textarea[name="form_fields[message]"]','whole house?']])
await submitTest('/expo-signup/', 0, [['input[name="form_fields[name]"]','Test Buyer'],['input[name="form_fields[email]"]','test@example.com']])
await submitTest('/partner/', 0, [['input[name="form_fields[name]"]','Test Buyer'],['input[name="form_fields[job_title]"]','Owner'],['input[name="form_fields[company]"]','Acme Plumbing'],['input[name="form_fields[email]"]','test@example.com'],['input[name="form_fields[tel]"]','6175550134']])
await browser.close()
