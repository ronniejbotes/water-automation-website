/**
 * Build a new blog post page from an existing one.
 *
 * Why cloning rather than templating
 * ---------------------------------
 * Every page here is a WordPress + Elementor render: ~163KB of head, inlined
 * critical CSS, a fixed header, a footer, a chat widget and a "See also" grid.
 * None of that is ours to regenerate, and a hand-built page would drift from the
 * other 150 immediately — different CSS bundle, different nav, different footer.
 * So a new post is an existing post with the parts that identify it swapped out.
 * That is what keeps a new page visually and structurally identical to the rest
 * of the site, which is the whole requirement.
 *
 * What gets swapped, and nothing else:
 *   - the slug, everywhere it appears (canonical, og:url, schema @ids, breadcrumb)
 *   - the title, in <title>, og/twitter, the schema headline, the breadcrumb and
 *     the on-page heading
 *   - the meta description, in <meta>, og/twitter and the schema
 *   - datePublished / dateModified in the schema graph
 *   - the article body, between the post-content widget's open and close tags,
 *     and the schema's wordCount, counted from it
 *   - the "See also" block, made for the new post by tools/see-also.mjs
 *   - the featured image: og:image with its size and type, the schema's
 *     ImageObject, the hero above the title, written the way WordPress writes
 *     a featured image, with the alt text the spec gives, and the
 *     "featuredImage" in Elementor's frontend config, beside the title there
 *     in its percent-encoded form
 *
 * The image is required. The donor's own is a photo of two people catching water
 * from a leaking ceiling, with empty alt text, and a post built without an image
 * of its own would show it.
 *
 * Checked rather than swapped: the author. A post carries no author's name
 * (the owner's rule, 7 October 2026), and in the schema graph its author is the
 * Organization, by @id. The donor already says so, through the author-* blocks
 * in tools/content.mjs, and the build stops if a post would carry an author meta
 * tag, an article:author tag, a Person node, an author archive link, or any
 * schema author but the Organization.
 *
 * One deliberate difference from the donor: the on-page title heading is emitted
 * as <h1>, not the <h2> the template ships. The theme styles headings by class,
 * so it looks identical — but 147 of 183 pages currently have no <h1> at all,
 * and there is no reason to reproduce that on a page we are writing from scratch.
 *
 * The "See also" block is the one every other post carries: at most five links,
 * each a title and the linked post's own meta description, chosen from the new
 * post's topic by the rule at the top of tools/see-also.mjs. It is chosen from
 * the posts already on the site plus this batch, so it is the block that
 * tools/apply-content.mjs would give the post too. The posts before the new
 * one in its topic only start linking to it when apply-content.mjs next runs,
 * which is why that is the next step this script prints.
 *
 *   node tools/new-post.mjs posts.json          # build every post in the file
 *   node tools/new-post.mjs posts.json --dry    # report without writing
 *
 * posts.json is an array of:
 *   { slug, title, metaDescription, excerpt, bodyFile, datePublished, dateModified,
 *     image: { path, width, height, alt } }
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  loadPosts, post, openingSentence, chooseLinks, linkable, seeAlsoMarkup, swapSeeAlso,
  SEE_ALSO_OPEN, SEE_ALSO_CLOSE,
} from './see-also.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const SPEC = args.find((a) => !a.startsWith('--'))
const DRY = args.includes('--dry')

if (!SPEC) {
  console.error('usage: node tools/new-post.mjs <posts.json> [--dry]')
  process.exit(1)
}

// The donor. Chosen because it is a plain post on the standard template with no
// unusual widgets. Its own "See also" block is replaced, so its links do not
// carry over to the new page.
const DONOR_SLUG = 'battery-powered-water-leak-detector-vs-smart-home-systems'
const DONOR_TITLE_SHORT = 'Battery Powered Water Leak Detectors vs Smart Home Systems'
const DONOR_TITLE_LONG = 'Battery-Powered Water Leak Detectors vs Smart Home Systems: Which Is Better?'
const DONOR_DESC = 'Compare battery powered water leak detectors vs smart home systems to find the best protection for your property.'
const DONOR_PUBLISHED = '2026-05-13T20:42:43+00:00'
const DONOR_MODIFIED = '2026-05-13T20:43:01+00:00'
const DONOR_WORD_COUNT = '"wordCount":1079'
const CONTENT_OPEN = '<div class="elementor-element elementor-element-3bf7867 elementor-widget elementor-widget-theme-post-content"'

// The donor's featured image, in the two forms the page carries it: plain in the
// og:image meta, and JSON-escaped inside the Yoast schema graph.
const DONOR_IMG = '/wp-content/uploads/2026/05/Inspecting-water-damage-together.png'
const DONOR_IMG_W = '1536'
const DONOR_IMG_H = '1024'

// The hero above the title shows the donor's image as WordPress's 1024px size,
// with every size of it in a srcset. Swapping the plain path alone changes only
// the last entry of that srcset, which leaves the donor's photo, with empty alt
// text, as what most screens show; so the whole <img> is replaced.
const DONOR_HERO_SRC = '/wp-content/uploads/2026/05/Inspecting-water-damage-together-1024x683.png'
const DONOR_IMG_STEM = 'Inspecting-water-damage-together'
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }

// The one schema author a post may carry: the Organization the graph already
// describes, by its @id, escaped the way the graph escapes it.
const ORG_AUTHOR = '"author":{"@id":"https:\\/\\/www.waterautomation.com\\/#organization"}'

const donorPath = join(ROOT, DONOR_SLUG, 'index.html')
if (!existsSync(donorPath)) {
  console.error(`donor missing: ${donorPath}`)
  process.exit(1)
}
const donor = await readFile(donorPath, 'utf8')

// Escape for use in a double-quoted HTML attribute and in JSON-LD.
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const jsonStr = (s) => JSON.stringify(s).slice(1, -1)

const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The hero <img> for a post's own image, written as WordPress writes a featured
 * image: its largest size no wider than 1024px as the src, shown at most 800px
 * wide, and every size of it on disk in the srcset.
 */
const heroImg = ({ path, width, height, alt }) => {
  const ext = extname(path)
  const sized = new RegExp(`^${reEscape(basename(path, ext))}-(\\d+)x(\\d+)${reEscape(ext)}$`)
  const sizes = readdirSync(join(ROOT, dirname(path)))
    .map((f) => f.match(sized))
    .filter(Boolean)
    .map((m) => ({ src: `${dirname(path)}/${m[0]}`, w: Number(m[1]), h: Number(m[2]) }))
  const all = [...sizes, { src: path, w: width, h: height }]
  const large = all.filter((s) => s.w <= 1024).sort((a, b) => b.w - a.w)[0] || all.at(-1)
  const w = Math.min(800, large.w)
  const h = Math.round((w * large.h) / large.w)
  const srcset = [large, ...all.filter((s) => s !== large).sort((a, b) => a.w - b.w)]
    .map((s) => `${s.src} ${s.w}w`)
    .join(', ')
  return {
    src: large.src,
    tag: `<img width="${w}" height="${h}" src="${large.src}" class="attachment-large size-large" alt="${attr(alt)}" srcset="${srcset}" sizes="(max-width: ${w}px) 100vw, ${w}px" />`,
  }
}

// Elementor's frontend config names the post too, for its share buttons: the
// title percent-encoded the way PHP's rawurlencode writes it, and the hero as
// "featuredImage".
const rawurlencode = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

/** Find the close of the div that starts at `start`, by depth-counting. */
const matchingClose = (html, start) => {
  let depth = 0
  let i = start
  while (i < html.length) {
    const o = html.indexOf('<div', i)
    const c = html.indexOf('</div>', i)
    if (c === -1) return -1
    if (o !== -1 && o < c) { depth++; i = o + 4 } else { depth--; i = c + 6; if (depth === 0) return i }
  }
  return -1
}

const posts = JSON.parse(await readFile(resolve(SPEC), 'utf8'))
let built = 0
const report = []

// What a "See also" block can link to: every post already on the site, and
// this batch, which takes the place of any post it rebuilds. A batch post is
// read from its spec and body, as its page will publish them.
const batch = posts.map((p) => {
  const bodyPath = p.bodyFile && resolve(p.bodyFile)
  return post({
    slug: p.slug,
    title: p.title,
    description: p.metaDescription,
    date: p.datePublished || DONOR_PUBLISHED,
    opening: bodyPath && existsSync(bodyPath) ? openingSentence(readFileSync(bodyPath, 'utf8')) : '',
  })
})
const onSite = await loadPosts((rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : ''))
const registry = [...onSite.filter((e) => !batch.some((b) => b.slug === e.slug)), ...batch]

for (const p of posts) {
  for (const k of ['slug', 'title', 'metaDescription', 'bodyFile']) {
    if (!p[k]) { console.error(`${p.slug || '(no slug)'}: missing ${k}`); process.exit(1) }
  }
  for (const k of ['path', 'width', 'height', 'alt']) {
    if (!p.image?.[k]) {
      console.error(`${p.slug}: missing image.${k}. Every post needs its own image, described, or it shows the donor's.`)
      process.exit(1)
    }
  }
  if (!existsSync(join(ROOT, p.image.path))) { console.error(`${p.slug}: image not found: ${p.image.path}`); process.exit(1) }
  if (!MIME[extname(p.image.path).toLowerCase()]) { console.error(`${p.slug}: unknown image type: ${p.image.path}`); process.exit(1) }
  const bodyPath = resolve(p.bodyFile)
  if (!existsSync(bodyPath)) { console.error(`${p.slug}: bodyFile not found — ${bodyPath}`); process.exit(1) }
  const body = (await readFile(bodyPath, 'utf8')).trim()

  if (body.includes('<h1')) {
    console.error(`${p.slug}: body contains an <h1>. The template supplies the h1; body headings start at h2.`)
    process.exit(1)
  }

  let html = donor

  // 1. identity: slug everywhere it appears
  html = html.split(DONOR_SLUG).join(p.slug)

  // 2. title, longest form first so the short form cannot eat part of it, then
  //    the percent-encoded form in Elementor's frontend config
  html = html.split(DONOR_TITLE_LONG).join(attr(p.title))
  html = html.split(DONOR_TITLE_SHORT).join(attr(p.title))
  html = html.split(rawurlencode(DONOR_TITLE_SHORT)).join(rawurlencode(p.title))

  // 3. description
  html = html.split(DONOR_DESC).join(attr(p.metaDescription))

  // 4. dates
  html = html.split(DONOR_PUBLISHED).join(p.datePublished || DONOR_PUBLISHED)
  html = html.split(DONOR_MODIFIED).join(p.dateModified || p.datePublished || DONOR_MODIFIED)

  // 5. the featured image. The hero above the title first, whole, while it still
  //    carries the donor's srcset. Then the plain URL in og:image and the
  //    backslash-escaped URL inside the schema graph, the og:image size and
  //    type, and the schema ImageObject's size. Without this a new post shows
  //    the donor's photo, and names it in every share card and every
  //    structured-data consumer.
  const hero = new RegExp(`<img\\b[^>]*\\bsrc="${reEscape(DONOR_HERO_SRC)}"[^>]*>`, 'g')
  const heroes = (html.match(hero) || []).length
  if (heroes !== 1) { console.error(`${p.slug}: expected the donor's hero image once, found ${heroes}`); process.exit(1) }
  const heroNew = heroImg(p.image)
  html = html.replace(hero, () => heroNew.tag)
  const esc = (s) => s.split('/').join('\\/')
  html = html.split(DONOR_IMG).join(p.image.path)
  html = html.split(esc(DONOR_IMG)).join(esc(p.image.path))
  for (const [from, to] of [
    [`"featuredImage":"${esc(DONOR_HERO_SRC)}"`, `"featuredImage":"${esc(heroNew.src)}"`],
    [`<meta property="og:image:width" content="${DONOR_IMG_W}" />`, `<meta property="og:image:width" content="${p.image.width}" />`],
    [`<meta property="og:image:height" content="${DONOR_IMG_H}" />`, `<meta property="og:image:height" content="${p.image.height}" />`],
    ['<meta property="og:image:type" content="image/png" />', `<meta property="og:image:type" content="${MIME[extname(p.image.path).toLowerCase()]}" />`],
    [`"width":${DONOR_IMG_W},"height":${DONOR_IMG_H}`, `"width":${p.image.width},"height":${p.image.height}`],
  ]) {
    if (html.split(from).length - 1 !== 1) { console.error(`${p.slug}: expected once in the donor: ${from}`); process.exit(1) }
    html = html.replace(from, () => to)
  }

  // 6. the on-page title heading: h2 -> h1, same classes so it renders identically
  const h2 = `<h2 class="elementor-heading-title elementor-size-default">${attr(p.title)}</h2>`
  const h1 = `<h1 class="elementor-heading-title elementor-size-default">${attr(p.title)}</h1>`
  const h2count = html.split(h2).length - 1
  if (h2count !== 1) {
    console.error(`${p.slug}: expected exactly 1 post-title heading, found ${h2count}`)
    process.exit(1)
  }
  html = html.replace(h2, h1)

  // 7. the article body, and its word count in the schema graph. The count goes
  //    in first: the graph sits above the body, and the body's position, taken
  //    next, is used by the identity check below.
  if (html.split(DONOR_WORD_COUNT).length - 1 !== 1) { console.error(`${p.slug}: expected once in the donor: ${DONOR_WORD_COUNT}`); process.exit(1) }
  const words = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;/gi, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length
  html = html.replace(DONOR_WORD_COUNT, () => `"wordCount":${words}`)
  const start = html.indexOf(CONTENT_OPEN)
  if (start === -1) { console.error(`${p.slug}: post-content widget not found in donor`); process.exit(1) }
  const openEnd = html.indexOf('>', start) + 1
  const end = matchingClose(html, start)
  if (end === -1) { console.error(`${p.slug}: could not find end of post-content widget`); process.exit(1) }
  html = html.slice(0, openEnd) + '\n' + body + '\n\t\t\t\t' + html.slice(end - 6)

  // 8. the "See also" block, in place of the donor's. It comes after the body
  //    on the page, so the body's position, used below, does not move.
  const { topic, links } = chooseLinks(registry, p.slug, html)
  const withBlock = swapSeeAlso(html, seeAlsoMarkup(links))
  if (!withBlock) { console.error(`${p.slug}: no "See also" block or grid found in the donor`); process.exit(1) }
  html = withBlock

  // sanity: the donor's identity must be completely gone from everything this
  // script rewrote. The article body is left out of the check: it is the
  // author's own text, and a new post may link to the donor post like any other
  // page. A body citing /battery-powered-water-leak-detector-vs-smart-home-systems/
  // is a link, not leftover identity, and must not stop the build. The "See
  // also" block is left out for the same reason: it may link to the donor too.
  const withoutBody = html.slice(0, openEnd) + html.slice(openEnd + 1 + body.length)
  const rewritten =
    withoutBody.slice(0, withoutBody.indexOf(SEE_ALSO_OPEN)) + withoutBody.slice(withoutBody.indexOf(SEE_ALSO_CLOSE))
  for (const [what, needle] of [
    ['donor slug', DONOR_SLUG],
    ['donor title', DONOR_TITLE_LONG],
    ['donor description', DONOR_DESC],
    ['donor image', DONOR_IMG_STEM],
    ['donor title, percent-encoded', rawurlencode(DONOR_TITLE_SHORT)],
  ]) {
    if (rewritten.includes(needle)) { console.error(`${p.slug}: ${what} still present after rewrite`); process.exit(1) }
  }

  // The page must carry no author's name either. The donor carries none once
  // tools/apply-content.mjs has run; a donor re-captured from WordPress and not
  // yet put through it carries the old login again, and so would every post
  // built from it.
  const schemaAuthors = rewritten.match(/"author":\{[^}]*\}/g) || []
  for (const [what, found] of [
    ['an author meta tag', rewritten.includes('<meta name="author"')],
    ['an article:author tag', rewritten.includes('article:author')],
    ['a Person node in the schema graph', rewritten.includes('"@type":"Person"')],
    ['a link to an author archive', rewritten.includes('/author/')],
    ['the schema author is not the Organization', schemaAuthors.length !== 1 || schemaAuthors[0] !== ORG_AUTHOR],
  ]) {
    if (found) {
      console.error(`${p.slug}: ${what}. Posts carry no author's name, so the donor must not either (see the author-* blocks in tools/content.mjs).`)
      process.exit(1)
    }
  }

  const outDir = join(ROOT, p.slug)
  const outFile = join(outDir, 'index.html')
  report.push({
    slug: p.slug,
    title: p.title,
    titleChars: p.title.length,
    metaChars: p.metaDescription.length,
    bodyBytes: body.length,
    pageBytes: html.length,
    existed: existsSync(outFile),
    topic,
    links: links.length,
    linkable: linkable(batch.find((b) => b.slug === p.slug)),
  })

  if (!DRY) {
    await mkdir(outDir, { recursive: true })
    await writeFile(outFile, html)
    built++
  }
}

console.log(`${DRY ? 'Would build' : 'Built'} ${posts.length} post(s) from /${DONOR_SLUG}/\n`)
for (const r of report) {
  console.log(`${r.existed ? 'overwrite' : 'new      '}  /${r.slug}/`)
  console.log(`           title ${r.titleChars} chars | meta ${r.metaChars} chars | body ${r.bodyBytes}B | page ${(r.pageBytes / 1024).toFixed(0)}KB`)
  console.log(`           see also: ${r.links} link(s) from the ${r.topic} topic`)
  if (r.titleChars > 62) console.log(`           WARNING: title is long for a SERP`)
  if (r.metaChars > 158) console.log(`           WARNING: meta description is long for a SERP`)
  if (!r.linkable) console.log(`           WARNING: the meta description quotes a price, so no "See also" block will link here`)
}
// ---------------------------------------------------------------------------
// Register the new routes
// ---------------------------------------------------------------------------
// A page nobody links and no sitemap lists is a page Google will not find, and
// `npm run verify` checks routes.txt against what is on disk — so a post that
// is not registered will also fail the build's own check.

if (!DRY) {
  // routes.txt — kept in sorted order, with the count in its header honest
  const routesPath = join(ROOT, 'routes.txt')
  const raw = await readFile(routesPath, 'utf8')
  const lines = raw.split('\n')
  const header = []
  const routes = []
  for (const l of lines) {
    const t = l.trim()
    if (!t) continue
    if (t.startsWith('#')) header.push(t)
    else routes.push(t)
  }
  let added = 0
  for (const p of posts) {
    const r = `/${p.slug}/`
    if (!routes.includes(r)) { routes.push(r); added++ }
  }
  routes.sort()
  const newHeader = header.map((h) =>
    /^# Generated \d{4}-\d{2}-\d{2} — \d+ routes\.$/.test(h)
      ? h.replace(/\d+ routes\./, `${routes.length} routes.`)
      : h
  )
  await writeFile(routesPath, newHeader.join('\n') + '\n' + routes.join('\n') + '\n')
  console.log(`\nroutes.txt        +${added} (now ${routes.length})`)

  // post-sitemap.xml — append before the closing tag, matching Yoast's shape
  const smPath = join(ROOT, 'post-sitemap.xml')
  let sm = await readFile(smPath, 'utf8')
  let smAdded = 0
  for (const p of posts) {
    const loc = `https://www.waterautomation.com/${p.slug}/`
    if (sm.includes(`<loc>${loc}</loc>`)) continue
    const img = p.image?.path
      ? `\n\t\t<image:image>\n\t\t\t<image:loc>https://www.waterautomation.com${p.image.path}</image:loc>\n\t\t</image:image>`
      : ''
    const entry = `\t<url>\n\t\t<loc>${loc}</loc>\n\t\t<lastmod>${p.dateModified || p.datePublished}</lastmod>${img}\n\t</url>\n`
    sm = sm.replace('</urlset>', entry + '</urlset>')
    smAdded++
  }
  await writeFile(smPath, sm)
  const total = (sm.match(/<loc>/g) || []).length
  console.log(`post-sitemap.xml  +${smAdded} (now ${total} URLs)`)
}

console.log(`\n--- ${DRY ? 'dry run' : `${built} written`} ---`)
if (!DRY) {
  console.log('Next: node tools/apply-content.mjs, so the posts before it in its topic link to it;')
  console.log('      then node tools/see-also.mjs --check, npm run verify and npm run linkcheck')
}
