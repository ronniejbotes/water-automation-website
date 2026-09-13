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
 *   - the article body, between the post-content widget's open and close tags
 *
 * One deliberate difference from the donor: the on-page title heading is emitted
 * as <h1>, not the <h2> the template ships. The theme styles headings by class,
 * so it looks identical — but 147 of 183 pages currently have no <h1> at all,
 * and there is no reason to reproduce that on a page we are writing from scratch.
 *
 * The "See also" grid is carried across unchanged, because the brief is that new
 * posts match the existing ones. Note what that means: the grid renders four
 * other posts in full, so a new post inherits roughly 32,000 characters of text
 * belonging to other pages. That is a template-level problem, identical on all
 * 141 posts that have it, and fixing it is a separate job from publishing.
 *
 *   node tools/new-post.mjs posts.json          # build every post in the file
 *   node tools/new-post.mjs posts.json --dry    # report without writing
 *
 * posts.json is an array of:
 *   { slug, title, metaDescription, excerpt, bodyFile, datePublished, dateModified }
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const SPEC = args.find((a) => !a.startsWith('--'))
const DRY = args.includes('--dry')

if (!SPEC) {
  console.error('usage: node tools/new-post.mjs <posts.json> [--dry]')
  process.exit(1)
}

// The donor. Chosen because it is a plain post on the standard template with no
// unusual widgets, and it is topically adjacent so its "See also" picks are not
// absurd on the new pages.
const DONOR_SLUG = 'battery-powered-water-leak-detector-vs-smart-home-systems'
const DONOR_TITLE_SHORT = 'Battery Powered Water Leak Detectors vs Smart Home Systems'
const DONOR_TITLE_LONG = 'Battery-Powered Water Leak Detectors vs Smart Home Systems: Which Is Better?'
const DONOR_DESC = 'Compare battery powered water leak detectors vs smart home systems to find the best protection for your property.'
const DONOR_PUBLISHED = '2026-05-13T20:42:43+00:00'
const DONOR_MODIFIED = '2026-05-13T20:43:01+00:00'
const CONTENT_OPEN = '<div class="elementor-element elementor-element-3bf7867 elementor-widget elementor-widget-theme-post-content"'

// The donor's featured image, in the two forms the page carries it: plain in the
// og:image meta, and JSON-escaped inside the Yoast schema graph.
const DONOR_IMG = '/wp-content/uploads/2026/05/Inspecting-water-damage-together.png'
const DONOR_IMG_W = '1536'
const DONOR_IMG_H = '1024'

const donorPath = join(ROOT, DONOR_SLUG, 'index.html')
if (!existsSync(donorPath)) {
  console.error(`donor missing: ${donorPath}`)
  process.exit(1)
}
const donor = await readFile(donorPath, 'utf8')

// Escape for use in a double-quoted HTML attribute and in JSON-LD.
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const jsonStr = (s) => JSON.stringify(s).slice(1, -1)

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

for (const p of posts) {
  for (const k of ['slug', 'title', 'metaDescription', 'bodyFile']) {
    if (!p[k]) { console.error(`${p.slug || '(no slug)'}: missing ${k}`); process.exit(1) }
  }
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

  // 2. title, longest form first so the short form cannot eat part of it
  html = html.split(DONOR_TITLE_LONG).join(attr(p.title))
  html = html.split(DONOR_TITLE_SHORT).join(attr(p.title))

  // 3. description
  html = html.split(DONOR_DESC).join(attr(p.metaDescription))

  // 4. dates
  html = html.split(DONOR_PUBLISHED).join(p.datePublished || DONOR_PUBLISHED)
  html = html.split(DONOR_MODIFIED).join(p.dateModified || p.datePublished || DONOR_MODIFIED)

  // 5. featured image, if the spec names one. Swapped in both forms the page uses:
  //    the plain URL in og:image, and the backslash-escaped URL inside the schema
  //    graph. Without this a new post inherits the donor's image in every share
  //    card and every structured-data consumer.
  if (p.image?.path) {
    const esc = (s) => s.split('/').join('\\/')
    html = html.split(DONOR_IMG).join(p.image.path)
    html = html.split(esc(DONOR_IMG)).join(esc(p.image.path))
    if (p.image.width) {
      html = html.replace(
        `<meta property="og:image:width" content="${DONOR_IMG_W}" />`,
        `<meta property="og:image:width" content="${p.image.width}" />`
      )
    }
    if (p.image.height) {
      html = html.replace(
        `<meta property="og:image:height" content="${DONOR_IMG_H}" />`,
        `<meta property="og:image:height" content="${p.image.height}" />`
      )
    }
    html = html.replace(/"width":1536,"height":1024/g, `"width":${p.image.width || 1536},"height":${p.image.height || 864}`)
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

  // 7. the article body
  const start = html.indexOf(CONTENT_OPEN)
  if (start === -1) { console.error(`${p.slug}: post-content widget not found in donor`); process.exit(1) }
  const openEnd = html.indexOf('>', start) + 1
  const end = matchingClose(html, start)
  if (end === -1) { console.error(`${p.slug}: could not find end of post-content widget`); process.exit(1) }
  html = html.slice(0, openEnd) + '\n' + body + '\n\t\t\t\t' + html.slice(end - 6)

  // sanity: the donor's identity must be completely gone
  for (const [what, needle] of [
    ['donor slug', DONOR_SLUG],
    ['donor title', DONOR_TITLE_LONG],
    ['donor description', DONOR_DESC],
  ]) {
    if (html.includes(needle)) { console.error(`${p.slug}: ${what} still present after rewrite`); process.exit(1) }
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
  if (r.titleChars > 62) console.log(`           WARNING: title is long for a SERP`)
  if (r.metaChars > 158) console.log(`           WARNING: meta description is long for a SERP`)
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
if (!DRY) console.log('Next: npm run verify, then npm run linkcheck')
