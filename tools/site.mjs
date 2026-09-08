/**
 * Shared facts about the site being mirrored, and the rewriting rules that
 * every tool has to agree on. Kept in one module so the HTTP crawler, the
 * browser capture and the verifier cannot drift apart.
 */
import { join, extname, dirname } from 'node:path'

export const ORIGIN = 'https://www.waterautomation.com'

/** Hosts that resolve to this same site and still appear inside the markup. */
export const ALIAS_HOSTS = [
  'www.waterautomation.com',
  'waterautomation.com',
]

export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/**
 * Identity metadata is deliberately left pointing at the live origin.
 *
 * Canonical, og:/twitter:, alternate, shortlink and the Yoast JSON-LD graph all
 * name the real site. Rewriting them to "/" would tell a crawler every page is
 * the homepage, and would strip the schema graph of the @id values that tie its
 * entities to one another. None of these are used to load anything, so leaving
 * them absolute costs nothing and preserves every SEO signal exactly.
 */
const KEEP_ABSOLUTE = [
  /<link[^>]+rel=["'](?:canonical|alternate|shortlink|EditURI|https:\/\/api\.w\.org\/)["'][^>]*>/gi,
  /<meta[^>]+(?:property|name)=["'](?:og:[a-z:_]+|twitter:[a-z:_]+|article:[a-z:_]+|product:[a-z:_]+)["'][^>]*>/gi,
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
]

const MARK = '\u0000MIRROR_ORIGIN\u0000'

/**
 * Same-origin absolute URLs -> root-relative, so the mirror runs from any
 * origin (localhost, a staging host, the real domain) without a rebuild.
 *
 * The bare-origin case matters: `https://www.waterautomation.com` with nothing
 * after it is a link to the homepage, and naively stripping the host leaves
 * href="", which browsers resolve as *the current document*. That turns the
 * header logo into a dead self-link on every page. So the with-path form is
 * parked under a sentinel first, leaving only the bare form to become '/'.
 */
export function rewrite(text, protectMeta = false) {
  const vault = []
  let out = text
  if (protectMeta) {
    for (const re of KEEP_ABSOLUTE) {
      out = out.replace(re, (m) => { vault.push(m); return ` MIRROR_KEEP_${vault.length - 1} ` })
    }
  }

  const hosts = []
  for (const h of ALIAS_HOSTS) hosts.push(`https://${h}`, `http://${h}`)
  for (const host of hosts) {
    out = out.split(host + '/').join(MARK)
    out = out.split(host).join('/')
    out = out.split(MARK).join('/')
  }

  // The same origin appears slash-escaped inside inline JSON and JS payloads
  // (Elementor settings, WooCommerce params, Yoast graph fragments).
  for (const h of ALIAS_HOSTS) {
    const esc = 'https:\\/\\/' + h
    out = out.split(esc + '\\/').join(MARK)
    out = out.split(esc).join('\\/')
    out = out.split(MARK).join('\\/')
  }

  // Protocol-relative form, emitted by Yoast's sitemap stylesheet link.
  for (const h of ALIAS_HOSTS) out = out.split('//' + h + '/').join('/')

  return out.replace(/ MIRROR_KEEP_(\d+) /g, (_, i) => vault[Number(i)])
}

/** Map a same-origin URL path to a file inside `out`. */
export function pathToFile(out, urlPath) {
  const p = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  if (p.endsWith('/') || p === '') return join(out, p, 'index.html')
  // Extension-less URLs are WordPress routes; everything else is a real file.
  return extname(p) ? join(out, p) : join(out, p, 'index.html')
}

/** Reduce any reference to a same-origin path, or null if it is not ours. */
export function toLocalPath(u) {
  if (!u) return null
  // WordPress escapes & in attribute URLs as the numeric entity &#038;, not just
  // &amp;. Every add-to-cart link on the site is written that way, and decoding
  // only the named form leaves "&#038;quantity=1" in the path — where the '#'
  // then reads as the start of a fragment and the URL is parsed as an anchor.
  u = u.trim().replace(/&(?:amp|#0*38);/g, '&')
  if (!u || u.startsWith('data:') || u.startsWith('#') || u.startsWith('mailto:') ||
      u.startsWith('tel:') || u.startsWith('javascript:') || u.startsWith('blob:')) return null
  for (const h of ALIAS_HOSTS) {
    for (const pre of ['https://' + h, 'http://' + h, '//' + h]) {
      if (u === pre) return '/'
      if (u.startsWith(pre + '/')) { u = u.slice(pre.length); break }
    }
  }
  if (/^https?:\/\//.test(u) || u.startsWith('//')) return null  // genuinely external
  if (!u.startsWith('/')) return null                            // relative; caller resolves
  return u
}

/** Collect every same-origin reference out of an HTML document. */
export function assetsFromHtml(html) {
  const found = new Set()
  const add = (raw) => {
    const u = toLocalPath(raw)
    if (!u) return
    if (/\.php(\?|$)/.test(u.split('?')[0])) return   // PHP cannot run statically
    found.add(u)
  }
  for (const m of html.matchAll(/(?:src|href|content|data-src|data-lazy-src|poster)=(["'])(.*?)\1/gi)) add(m[2])
  for (const m of html.matchAll(/(?:srcset|data-srcset|data-lazy-srcset|imagesrcset)=(["'])(.*?)\1/gi)) {
    for (const part of m[2].split(',')) add(part.trim().split(/\s+/)[0])
  }
  for (const m of html.matchAll(/url\((["']?)([^)"']*)\1\)/g)) add(m[2])
  // Elementor stores background images and video sources inside slash-escaped
  // JSON attributes, where the plain matchers above never see them. Two things
  // the match has to get right:
  //
  //   - Path segments are separated by an escaped slash, so it must span them.
  //     A class that merely excludes backslash stops at the first one and
  //     yields a directory instead of a file.
  //   - That JSON sits inside an HTML attribute, so its quotes arrive as
  //     &quot;. Allowing '&' would run the match past the end of the filename
  //     and ask the server for "…-1.mp4&quot;", which 404s — which is how the
  //     two homepage background videos would have gone missing.
  //
  // The scan runs over a copy with \uXXXX escapes decoded first. Yoast's JSON-LD
  // writes a filename's em-dash as —, and since that escape starts with a
  // backslash the class ends the match there — yielding a truncated path that
  // does not exist, next to the real one. Decoding first keeps them one ref.
  const decoded = html.replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
  for (const m of decoded.matchAll(/\\\/wp-(?:content|includes)(?:\\\/[^"'\\ )&<>]+)+/g)) {
    add(m[0].split('\\/').join('/'))
  }
  return [...found]
}

/** Collect url() references out of a stylesheet, resolved against its own path. */
export function assetsFromCss(css, cssPath) {
  const found = new Set()
  const dir = dirname(cssPath)
  for (const m of css.matchAll(/url\((["']?)([^)"']*)\1\)/g)) {
    const u = (m[2] || '').trim()
    if (!u || u.startsWith('data:') || u.startsWith('#')) continue
    const local = toLocalPath(u)
    if (local) { found.add(local.split('?')[0]); continue }
    if (/^https?:\/\//.test(u) || u.startsWith('//')) continue   // external font/CDN
    found.add(join(dir, u).split('\\').join('/').split('?')[0])
  }
  for (const m of css.matchAll(/@import\s+(?:url\()?(["'])(.*?)\1/g)) {
    const local = toLocalPath(m[2])
    if (local) found.add(local.split('?')[0])
  }
  return [...found]
}

/**
 * WordPress under load, or Cloudflare in front of it, can answer with an error
 * page at HTTP 200. Writing one of those would bake a broken page into the
 * mirror and still look like a successful capture.
 */
const ERROR_MARKERS = [
  'Error establishing a database connection',
  'Service Temporarily Unavailable',
  'Bad Gateway',
  'Too Many Requests',
  'Attention Required! | Cloudflare',
  'Just a moment...',
  'Checking your browser before accessing',
]
export const MIN_PAGE_BYTES = Number(process.env.MIN_PAGE_BYTES || 15000)

export function describeBadPage(html) {
  if (!html) return 'empty response'
  for (const m of ERROR_MARKERS) if (html.includes(m)) return `server/edge error page (${m})`
  if (html.length < MIN_PAGE_BYTES) return `only ${html.length} bytes`
  if (!/<body/i.test(html)) return 'no <body>'
  return 'unrecognised'
}

export function isPlausiblePage(html) {
  if (!html || html.length < MIN_PAGE_BYTES) return false
  for (const m of ERROR_MARKERS) if (html.includes(m)) return false
  return /<body/i.test(html)
}
