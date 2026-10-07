/**
 * The "See also" block under every post: at most five links, each the linked
 * post's title and one line of summary, chosen from the post's own topic.
 *
 * Held here as a rule rather than typed into 136 pages, so a rebuild from the
 * WordPress capture gets the same block back. tools/content.mjs applies it to
 * every captured post (through tools/apply-content.mjs), and tools/new-post.mjs
 * gives a new post the same block.
 *
 * What it replaces
 * ----------------
 * WordPress renders an Elementor loop grid there that prints four other posts
 * IN FULL, and on almost every post they are the same four: the newest at the
 * time of the capture. So on a typical post most of the words on the page
 * belonged to other articles, and Google was shown a set of near-identical
 * pages each saying little of its own. The heading stays; the grid goes.
 *
 * The summary line
 * ----------------
 * The linked post's own meta description, as the post publishes it. Nothing is
 * written for the block; it only quotes. The one change made to the quote is
 * punctuation: an em or en dash in a title or description is written as a
 * spaced hyphen, the form the site's own copy already uses ("powered by two AA
 * batteries - discover how"), so the block puts no dash character on any page.
 *
 * Which posts: the rule
 * ---------------------
 * WordPress gives no usable topic. Every post is in the one category, "Blog",
 * and the tags are no better: 38 posts carry the same eight, whatever they are
 * about, so a toilet post is tagged "facility maintenance optimization".
 *
 * So the topic comes from the post's own address and title, tested against
 * TOPICS below in order, first match wins. The topics are the hubs that
 * SITE-REVIEW.md proposes for this site (apartments and multifamily,
 * commercial, toilets, insurance, homeowners), plus one for kitchens and
 * sinks: BUSINESS.md groups the ice maker posts and the H/C sink posts, and
 * those are product lines of their own, as the toilet devices are.
 * Homeowners is the remainder.
 *
 * Within a topic, posts are put in publish-date order (address breaks a tie)
 * and treated as a ring: each post links to the next five after it, wrapping
 * round from the newest to the oldest. That makes it deterministic, and fair:
 * every post in a topic of six or more is linked from about five others,
 * where the old grid linked the same four posts from everywhere and the rest
 * from nowhere. A new post changes the block on the five or so posts before
 * it in its topic and on no others.
 *
 * Walking the ring, a post is passed over, and the walk moves on, when:
 *
 *   - it has no meta description. The only other source for the line is the
 *     post's opening sentence, and the block's own test is that a linked
 *     post's opening sentence does not appear on the page. One post today.
 *   - its meta description quotes a price. The rule on this account is no
 *     price anywhere outside /buy-now/ and /product/, and the block would copy
 *     it onto five more pages. One post today.
 *   - linking it would put a linked post's opening sentence on the page, or
 *     the page carries that sentence already. The block points at other
 *     articles; it must not repeat them. This catches the case study whose
 *     first paragraph is a fragment of its own title, and a page that already
 *     says "apartment buildings." when a post opens with those two words.
 *
 *   node tools/see-also.mjs            # each post's topic and its links
 *   node tools/see-also.mjs --check    # the block's test, on every post
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ORIGIN } from './site.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, process.env.MIRROR_DIR || '.')

export const SEE_ALSO_ID = 'see-also'
export const SEE_ALSO_OPEN = `<!-- wa:content:${SEE_ALSO_ID} -->`
export const SEE_ALSO_CLOSE = `<!-- /wa:content:${SEE_ALSO_ID} -->`
export const MAX_LINKS = 5

// The heading WordPress puts over the grid. It stays, and it is how a post
// with the block is told apart from the five posts built on other templates.
const HEADING = '>See also</h2>'

// Tested against "<address> <title>", lowercased, in this order.
export const TOPICS = [
  { id: 'toilets', match: /toilet|restroom|aquahalt[- ](2x|flip)\b/ },
  { id: 'kitchens-and-sinks', match: /ice[- ]makers?|under[- ]sink|\bsinks?\b|kitchen|aquahalt[- ](h[-/]c|ice)\b/ },
  { id: 'insurance', match: /insurance/ },
  { id: 'commercial', match: /commercial|business|facilit|\boffices?\b|water[- ](management|automation)/ },
  { id: 'apartments', match: /apartment|multi[- ]?unit|multifamily|unit[- ]above|upstairs|rental|landlord|tenant|property[- ]managers?|condo/ },
  { id: 'homeowners', match: /(?:)/ },
]

export const topicOf = (p) => TOPICS.find((t) => t.match.test(`${p.slug} ${p.title}`.toLowerCase())).id

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] !== '#'
      ? NAMED[e.toLowerCase()] ?? m
      : String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
  )
const undash = (s) => s.replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, '$1-$2').replace(/\s*[\u2013\u2014]\s*/g, ' - ')
const tidy = (s) => undash(decode(s || '')).replace(/\s+/g, ' ').trim()
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// A page's text: no comments, scripts, styles or markup. A closing tag may be
// malformed, as in the "</script" with no ">" that some captured pages carry,
// so it is not required to end in ">"; requiring it lets one script swallow
// the rest of the page.
const textOf = (html) =>
  decode(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1\s*>?/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()

/**
 * The first sentence of a post's own first paragraph. Given a whole page, it
 * starts at the post's content; given just a post body, at its start.
 */
export function openingSentence(html) {
  let at = html.indexOf('elementor-element-3bf7867')
  if (at === -1) at = html.indexOf('data-elementor-type="wp-post"')
  for (const m of html.slice(Math.max(at, 0)).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const t = textOf(m[1])
    if (t) return (t.match(/^.*?[.!?](?=\s+["“‘(]?[A-Z0-9]|$)/) || [t])[0].trim()
  }
  return ''
}

/** The posts in `links` whose opening sentence is on the page, in any form. */
export function repeatedOn(html, links) {
  const forms = [html, decode(html), textOf(html)]
  return links.filter((p) => p.opening && forms.some((f) => f.includes(p.opening)))
}

// ---------------------------------------------------------------------------
// Reading the posts
// ---------------------------------------------------------------------------

/** A post as the block needs it. Title and description are as published. */
export const post = ({ slug, title, description, date, opening }) => ({
  slug,
  title: tidy(title),
  summary: tidy(description),
  date: date || '',
  opening: opening || '',
})

/** Read a post's title, meta description, date and opening from its page. */
export function postFromPage(slug, html) {
  const headline = html.match(/"headline":"((?:[^"\\]|\\.)*)"/)
  const title = headline
    ? JSON.parse(`"${headline[1]}"`)
    : (html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1]
  const description = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1]
  const date =
    (html.match(/<meta property="article:published_time" content="([^"]*)"/) || [])[1] ||
    (html.match(/"datePublished":"([^"]*)"/) || [])[1]
  return post({ slug, title, description, date, opening: openingSentence(html) })
}

const isPost = (html) => /<body [^>]*class="[^"]*\bsingle-post\b/.test(html)

/** The post slugs post-sitemap.xml lists, in its order. */
const slugsIn = (sitemap) =>
  [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => u.startsWith(ORIGIN + '/'))
    .map((u) => u.slice(ORIGIN.length).replace(/^\/|\/$/g, ''))
    .filter(Boolean)

const fromDisk = (rel) => readFileSync(join(DIR, rel), 'utf8')

/**
 * Every post on the site: what post-sitemap.xml lists, less anything that is
 * not a single post (the sitemap also lists /blog/). `read` takes a path
 * relative to the mirror and returns the file, so apply-content.mjs can hand
 * over pages it has already edited in memory.
 */
export async function loadPosts(read = fromDisk) {
  const posts = []
  for (const slug of slugsIn(await read('post-sitemap.xml'))) {
    const html = await read(`${slug}/index.html`)
    if (isPost(html)) posts.push(postFromPage(slug, html))
  }
  return posts
}

/** The pages that carry the block: every post with the "See also" heading. */
export function seeAlsoFiles() {
  return slugsIn(fromDisk('post-sitemap.xml'))
    .map((slug) => `${slug}/index.html`)
    .filter((rel) => existsSync(join(DIR, rel)))
    .filter((rel) => {
      const html = fromDisk(rel)
      return isPost(html) && html.includes(HEADING)
    })
}

// ---------------------------------------------------------------------------
// Choosing the links
// ---------------------------------------------------------------------------

const PRICE = /\$\s?\d/
export const linkable = (p) => p.summary !== '' && !PRICE.test(p.summary)

const byDate = (a, b) =>
  (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)

/**
 * The posts the page for `slug` links to: walking its topic's ring from it,
 * the first five that are linkable and that leave the page, `html`, passing
 * the test. Without a page there is nothing to test against, and the walk
 * just takes the first five linkable posts.
 */
export function chooseLinks(posts, slug, html = null) {
  const self = posts.find((p) => p.slug === slug)
  if (!self) throw new Error(`see-also: /${slug}/ is not a post in post-sitemap.xml`)
  const topic = topicOf(self)
  const ring = posts.filter((p) => topicOf(p) === topic && (p.slug === slug || linkable(p))).sort(byDate)
  const at = ring.indexOf(self)
  const links = []
  for (let k = 1; k < ring.length && links.length < MAX_LINKS; k++) {
    const next = [...links, ring[(at + k) % ring.length]]
    const page = html && swapSeeAlso(html, seeAlsoMarkup(next))
    if (!page || repeatedOn(page, next).length === 0) links.push(next.at(-1))
  }
  return { topic, links }
}

// ---------------------------------------------------------------------------
// The markup
// ---------------------------------------------------------------------------

// The card colour, corner radius, sizes and colours are the old grid's own
// (Elementor template 425), so the section keeps the site's look without the
// images or the article text.
const STYLE = `<style>
.wa-see-also{width:100%}
.wa-see-also__list{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.wa-see-also__item{margin:0;padding:20px 27px;border-radius:20px;background-color:var(--e-global-color-0795641)}
.wa-see-also__title{font-size:20px;font-weight:500;line-height:1.3;color:var(--e-global-color-primary)}
.wa-see-also__title:hover,.wa-see-also__title:focus{text-decoration:underline}
.wa-see-also__summary{margin:6px 0 0;font-size:16px;line-height:1.4;color:var(--e-global-color-text)}
</style>`

export function seeAlsoMarkup(links) {
  return [
    '<div class="wa-see-also">',
    STYLE,
    '<ul class="wa-see-also__list" role="list">',
    ...links.map(
      (p) =>
        `\t<li class="wa-see-also__item"><a class="wa-see-also__title" href="/${p.slug}/">${escape(p.title)}</a>` +
        `<p class="wa-see-also__summary">${escape(p.summary)}</p></li>`
    ),
    '</ul>',
    '</div>',
  ].join('\n')
}

// Read once per run, from the pages as they stand when the block is reached,
// so it quotes titles and descriptions after any earlier block has edited them.
let plan = null
export async function renderSeeAlso(rel, read) {
  plan ??= await loadPosts(read)
  const slug = rel.replace(/\/index\.html$/, '')
  return seeAlsoMarkup(chooseLinks(plan, slug, await read(rel)).links)
}

// ---------------------------------------------------------------------------
// Finding the grid in a captured page
// ---------------------------------------------------------------------------

/** End of the <div> that opens at `start`, found by counting depth. */
function matchingClose(html, start) {
  let depth = 0
  let i = start
  while (i < html.length) {
    const o = html.indexOf('<div', i)
    const c = html.indexOf('</div>', i)
    if (c === -1) return -1
    if (o !== -1 && o < c) {
      depth++
      i = o + 4
    } else {
      depth--
      i = c + 6
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * [start, end] of the loop grid that sits straight after the "See also"
 * heading, or null. It must follow the heading's own widget with nothing in
 * between, so nothing else on the page can be mistaken for it.
 */
export function findSeeAlso(html) {
  const h = html.indexOf(HEADING)
  if (h === -1 || html.indexOf(HEADING, h + 1) !== -1) return null
  const w = html.indexOf('elementor-widget-loop-grid', h)
  if (w === -1) return null
  const start = html.lastIndexOf('<div', w)
  if (start < h || !/^>See also<\/h2>\s*<\/div>\s*$/.test(html.slice(h, start))) return null
  const end = matchingClose(html, start)
  return end === -1 ? null : [start, end]
}

/** Put `markup` in place of the grid, or of the block already there. */
export function swapSeeAlso(html, markup) {
  const a = html.indexOf(SEE_ALSO_OPEN)
  const b = html.indexOf(SEE_ALSO_CLOSE)
  if (a !== -1 && b > a) return html.slice(0, a + SEE_ALSO_OPEN.length) + `\n${markup}\n` + html.slice(b)
  const span = findSeeAlso(html)
  if (!span) return null
  return html.slice(0, span[0]) + `${SEE_ALSO_OPEN}\n${markup}\n${SEE_ALSO_CLOSE}` + html.slice(span[1])
}

// ---------------------------------------------------------------------------
// Command line: the map, or the check
// ---------------------------------------------------------------------------

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const posts = await loadPosts()
  const bySlug = new Map(posts.map((p) => [p.slug, p]))
  if (!process.argv.includes('--check')) {
    const sizes = {}
    for (const p of posts) sizes[topicOf(p)] = (sizes[topicOf(p)] || 0) + 1
    console.log(`${posts.length} posts: ${Object.entries(sizes).map(([t, n]) => `${t} ${n}`).join(', ')}`)
    for (const p of posts.filter((p) => !linkable(p))) console.log(`never linked: /${p.slug}/`)
    for (const p of [...posts].sort((a, b) => topicOf(a).localeCompare(topicOf(b)) || byDate(a, b))) {
      const html = fromDisk(`${p.slug}/index.html`)
      if (!html.includes(HEADING)) {
        console.log(`\n[${topicOf(p)}] /${p.slug}/  (no See also block on this template)`)
        continue
      }
      const { topic, links } = chooseLinks(posts, p.slug, html)
      console.log(`\n[${topic}] /${p.slug}/`)
      for (const l of links) console.log(`    /${l.slug}/`)
    }
  } else {
    // The test the block exists to pass, on every post: five links or fewer,
    // the opening sentence of each linked post nowhere on the page, and the
    // template's "related resource" boilerplate gone.
    let failed = 0
    let blocks = 0
    for (const p of posts) {
      const html = fromDisk(`${p.slug}/index.html`)
      const faults = []
      const a = html.indexOf(SEE_ALSO_OPEN)
      const b = html.indexOf(SEE_ALSO_CLOSE)
      const block = a !== -1 && b > a ? html.slice(a, b) : ''
      if (html.includes(HEADING)) {
        blocks++
        if (!block) faults.push('no See also block between the markers')
        if (html.includes('elementor-widget-loop-grid')) faults.push('the WordPress loop grid is still on the page')
      }
      const linked = [...block.matchAll(/<a class="wa-see-also__title" href="\/([^"]*)\/"/g)].map((m) => m[1])
      if (linked.length > MAX_LINKS) faults.push(`${linked.length} links`)
      for (const s of linked) {
        if (s === p.slug) faults.push('links to itself')
        if (!bySlug.has(s)) faults.push(`links to /${s}/, which is not a post`)
      }
      for (const l of repeatedOn(html, linked.map((s) => bySlug.get(s)).filter(Boolean)))
        faults.push(`the opening sentence of /${l.slug}/ is on the page: "${l.opening}"`)
      if (/related resource/i.test(html) || /related resource/i.test(textOf(html))) faults.push('"related resource" is on the page')
      if (faults.length) {
        failed++
        console.log(`FAIL  /${p.slug}/`)
        for (const f of faults) console.log(`        ${f}`)
      }
    }
    console.log(`\n${posts.length} posts checked, ${blocks} with a See also block: ${failed ? `${failed} FAILED` : 'all pass'}`)
    process.exit(failed ? 1 : 0)
  }
}
