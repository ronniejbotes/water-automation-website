/**
 * Static server for the mirror, behaving the way the production host will:
 * directory indexes, the 404 template with a real 404 status, and a replay of
 * the redirects the live site already answers.
 *
 * It exists so "does the copy behave like the original?" can be answered by
 * clicking through it, not by reading HTML.
 *
 * It also answers /_forms/submit.php the way the real handler will, so the
 * enquiry forms can be submitted and watched end to end without PHP, both the
 * in-place JSON answer /_forms/forms.js asks for and the 303 a plain post
 * gets. See handleForm below.
 *
 *   node tools/serve.mjs            # http://localhost:4400
 *   PORT=5000 node tools/serve.mjs
 *   npm run serve:lan              # 0.0.0.0:4401 — reachable from a phone on
 *                                  # the same network; prints the LAN URL
 */
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, resolve, dirname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MESSAGES, CONTACT } from './forms-messages.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, process.env.SERVE_DIR || '.')
const PORT = Number(process.env.PORT || 4400)
// 0.0.0.0 exposes the preview to the local network so it can be opened on a
// phone. Every URL in the mirror is root-relative, so it serves correctly from
// any host without a rebuild.
const HOST = process.env.HOST || '127.0.0.1'

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.pdf': 'application/pdf',
}

/** The redirects the live site already answers, so the copy answers them too. */
let redirects = []
try {
  const text = await readFile(join(DIR, '_redirects'), 'utf8')
  redirects = text.split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => { const [from, to, code] = l.split(/\s+/); return { from, to, code: Number(code) || 301 } })
  console.log(`Loaded ${redirects.length} redirect(s) from _redirects`)
} catch { /* none yet */ }

async function tryFiles(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/\\/g, '/')
  if (clean.includes('..')) return null
  const candidates = clean.endsWith('/')
    ? [join(DIR, clean, 'index.html')]
    : [join(DIR, clean), join(DIR, clean, 'index.html')]
  for (const f of candidates) {
    try {
      const s = await stat(f)
      if (s.isFile()) return f
    } catch { /* next */ }
  }
  return null
}

/**
 * The form handler, in dev.
 *
 * _forms/submit.php is PHP, and nothing here runs PHP. This answers the same
 * path with the same contract — POST only, 303 to /thank-you/, a filled
 * honeypot answered exactly like a success, a missing reply address refused —
 * so the whole submit flow can be clicked through and watched in the network
 * panel without a mail server. It prints what the real handler would have
 * emailed instead of sending it.
 *
 * It is also what stops the dev server handing out the PHP source as a
 * download to anyone who opens that URL, which is what a static file server
 * does with a .php file.
 */
const FORM_ENDPOINT = '/_forms/submit.php'

function readBody(req) {
  return new Promise((ok, fail) => {
    const parts = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 2 * 1024 * 1024) { req.destroy(); fail(new Error('body too large')) }
      parts.push(c)
    })
    req.on('end', () => ok(Buffer.concat(parts)))
    req.on('error', fail)
  })
}

/**
 * The posted fields, whichever way they came: a plain browser post is
 * urlencoded, /_forms/forms.js sends FormData, which is multipart (as
 * Elementor's handler did). PHP reads both into $_POST; this does the same.
 */
async function readFields(req) {
  const raw = await readBody(req)
  const type = req.headers['content-type'] || ''
  if (type.startsWith('multipart/form-data')) {
    const form = await new Response(raw, { headers: { 'content-type': type } }).formData()
    return new URLSearchParams([...form].filter(([, v]) => typeof v === 'string'))
  }
  return new URLSearchParams(raw.toString('utf8'))
}

async function handleForm(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('This address accepts form submissions only.\n')
  }
  const fields = await readFields(req)
  const get = (n) => (fields.get(`form_fields[${n}]`) || '').trim()

  // The script asks for JSON and shows the answer under the form; a plain post
  // gets the redirect or the status. Same messages the real handler bakes in.
  const json = /application\/json/i.test(req.headers.accept || '')
  const answer = (status, body, location) => {
    if (json) {
      res.writeHead(status === 303 ? 200 : status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      return res.end(JSON.stringify(body))
    }
    if (status === 303) {
      res.writeHead(303, { Location: location, 'Cache-Control': 'no-store' })
      return res.end()
    }
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end(body.message.replace(/<[^>]+>/g, '') + '\n')
  }
  const ok = () => answer(303, { success: true, message: MESSAGES.success }, '/thank-you/')

  // Elementor hides its spam trap with an inline style rather than type=hidden,
  // and calls it something different on each form, so anything that arrives
  // filled and is not one of the fields a person can see is treated as one.
  const visible = new Set(['name', 'email', 'tel', 'message', 'job_title', 'company', 'consent'])
  for (const [k, v] of fields) {
    const m = /^form_fields\[([^\]]+)\]$/.exec(k)
    if (m && !visible.has(m[1]) && v.trim() !== '') {
      console.log(`  [form] honeypot "${m[1]}" filled — answered as success, nothing sent`)
      return ok()
    }
  }

  if (get('email') === '' && get('tel') === '') {
    return answer(400, { success: false, message: MESSAGES.error, errors: { email: MESSAGES.required } })
  }
  if (get('email') !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(get('email'))) {
    return answer(400, { success: false, message: MESSAGES.error, errors: { email: MESSAGES.badEmail } })
  }

  console.log(`\n  [form] POST ${FORM_ENDPOINT}`)
  console.log(`  [form]   form_id ${fields.get('form_id') || '(none)'}   page ${fields.get('wa_page') || '(none)'}   referer ${req.headers.referer || '(none)'}`)
  for (const [k, v] of fields) {
    const m = /^form_fields\[([^\]]+)\]$/.exec(k)
    if (m && v.trim() !== '') console.log(`  [form]   ${m[1].padEnd(12)} ${v.replace(/\n/g, ' ')}`)
  }
  console.log(`  [form]   -> ${json ? 'JSON success, shown in place' : '303 /thank-you/'}  (the real handler would log and mail this to ${CONTACT} or forms.to)\n`)

  return ok()
}

createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0]

  if (urlPath === FORM_ENDPOINT) return handleForm(req, res)

  // Match a rule with or without its trailing slash, in both directions. The
  // live site answers /products/aquahalt and /products/aquahalt/ with the same
  // 301, and pages link the slashless form — so a matcher that compares the two
  // strings literally sends a real visitor to the 404 handler instead.
  const bare = (s) => (s.length > 1 ? s.replace(/\/$/, '') : s)
  const hit = redirects.find((r) => bare(r.from) === bare(urlPath))
  if (hit) {
    res.writeHead(hit.code, { Location: hit.to })
    return res.end()
  }

  // A directory URL without its trailing slash resolves relative links one
  // level too high, exactly as it would on a real host. Redirect rather than
  // serve, so the mirror is exercised the way production will serve it.
  if (!extname(urlPath) && !urlPath.endsWith('/')) {
    if (await tryFiles(urlPath + '/')) {
      res.writeHead(301, { Location: urlPath + '/' })
      return res.end()
    }
  }

  const file = await tryFiles(urlPath)
  if (file) {
    const body = await readFile(file)
    const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream'

    // Byte ranges, because <video> depends on them. Chromium asks for a range
    // when it loads media; a server that answers 200 with the whole file makes
    // it abort the request, and the video then looks broken on the copy while
    // working on the original — a difference introduced by the test rig rather
    // than by the mirror. Every real static host answers 206 here.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
    if (range) {
      const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1
      const start = range[1] ? Number(range[1]) : Math.max(0, body.length - Number(range[2] || 0))
      if (start > end || start >= body.length) {
        res.writeHead(416, { 'Content-Range': `bytes */${body.length}` })
        return res.end()
      }
      const slice = body.subarray(start, end + 1)
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Length': slice.length,
        'Content-Range': `bytes ${start}-${end}/${body.length}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
      })
      return res.end(slice)
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': body.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    })
    return res.end(body)
  }

  try {
    const body = await readFile(join(DIR, '404.html'))
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('404')
  }
}).listen(PORT, HOST, () => {
  console.log(`Serving ${DIR}`)
  console.log(`  http://localhost:${PORT}/`)
  if (HOST === '0.0.0.0') {
    for (const [name, addrs] of Object.entries(networkInterfaces())) {
      for (const a of addrs || []) {
        if (a.family === 'IPv4' && !a.internal) {
          console.log(`  http://${a.address}:${PORT}/   (${name} — open this on a phone)`)
        }
      }
    }
  }
})
