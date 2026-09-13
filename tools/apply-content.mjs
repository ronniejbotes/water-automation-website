/**
 * Apply the content blocks in tools/content.mjs to the captured HTML.
 *
 * Why this exists separately from apply-fixes.mjs
 * -----------------------------------------------
 * tools/fixes.mjs is deliberately narrow: "it fixes something that is broken on
 * the live site. This is not the place for redesign, copy changes or SEO edits."
 * That rule is worth keeping, because it is what makes `npm run fix:dry` a
 * readable answer to "what did we change about the capture, and why?".
 *
 * But SEO edits have exactly the same failure mode as link fixes: `npm run mirror`
 * writes the live site's markup verbatim, so anything hand-typed into a page is
 * gone after the next rebuild, silently, with no error and no diff to notice.
 * A month of content work can evaporate into a command that looks like it
 * succeeded.
 *
 * So content gets the same treatment as fixes — held as data, re-applied by a
 * script — in its own file, so the two never get confused for each other.
 *
 * Rules for anything added to tools/content.mjs:
 *
 *   - It is a deliberate divergence from the live site. That is the point.
 *     `npm run verify -- --live` will report the title/description of an edited
 *     page as differing from live, and that is correct, not a regression.
 *   - Every block carries a `why`. Six months from now the reason a paragraph
 *     says "up to 5 years" is not recoverable from the paragraph.
 *   - Inserts are wrapped in <!-- wa:content:ID --> markers, which is how this
 *     script knows a block is already in place. Do not remove the markers.
 *   - Replacements carry `expect`. If the count moves, the capture changed
 *     underneath the edit and it needs re-reading before it is trusted.
 *
 *   node tools/apply-content.mjs
 *   node tools/apply-content.mjs --dry     # report what would change
 */
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CONTENT } from './content.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, process.env.MIRROR_DIR || '.')
const DRY = process.argv.includes('--dry')

const open = (id) => `<!-- wa:content:${id} -->`
const close = (id) => `<!-- /wa:content:${id} -->`

// A block's markup can live inline as `html`, or in its own file as `htmlFile`
// (relative to tools/). Anything longer than a few lines belongs in a file —
// a spec table is easier to edit as HTML than as a JS string, and it keeps
// content.mjs readable as a list of decisions rather than a wall of markup.
const BLOCK_DIR = resolve(dirname(fileURLToPath(import.meta.url)))
const markupFor = (block) => {
  if (block.html != null) return block.html
  if (block.htmlFile) {
    const p = join(BLOCK_DIR, block.htmlFile)
    if (!existsSync(p)) throw new Error(`${block.id}: htmlFile not found — ${block.htmlFile}`)
    return readFileSync(p, 'utf8').trimEnd()
  }
  throw new Error(`${block.id}: needs either html or htmlFile`)
}

const edits = new Map() // absolute path -> new content
const report = []
let failed = false

const read = async (abs) => edits.get(abs) ?? (await readFile(abs, 'utf8'))

// A block can name its files, or set allHtml to mean "every page in the mirror".
// Sitewide CSS has to go everywhere, and listing 183 paths in content.mjs would
// bury the decision under the data.
const SKIP_DIRS = new Set(['.git', 'node_modules', '_raw', 'tools', 'shots', '.probe'])
const allHtmlFiles = []
{
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith('.html')) allHtmlFiles.push(relative(DIR, p).split('\\').join('/'))
    }
  }
  walk(DIR)
}

for (const block of CONTENT) {
  const files = block.allHtml ? allHtmlFiles : block.files ?? []
  if (!files.length) {
    report.push({ id: block.id, ok: false, detail: 'no files listed' })
    failed = true
    continue
  }

  let applied = 0
  let already = 0
  let resynced = 0
  const problems = []

  for (const rel of files) {
    const abs = join(DIR, rel)
    if (!existsSync(abs)) {
      problems.push(`${rel}: file not found`)
      continue
    }

    let html = await read(abs)

    if (block.kind === 'insert') {
      // Already placed? Re-sync it rather than skipping, so editing the block's
      // HTML and re-running actually updates the page. Skipping instead would
      // make the markers a one-way door: the first run wins and every later
      // edit is silently ignored, which is a worse failure than a noisy one
      // because the file on disk looks correct.
      if (html.includes(open(block.id))) {
        const a = html.indexOf(open(block.id))
        const b = html.indexOf(close(block.id))
        if (b === -1) {
          problems.push(`${rel}: opening marker present but closing marker missing`)
          continue
        }
        const current = html.slice(a + open(block.id).length, b)
        const desired = `\n${markupFor(block)}\n`
        if (current === desired) {
          already++
          continue
        }
        html = html.slice(0, a + open(block.id).length) + desired + html.slice(b)
        edits.set(abs, html)
        resynced++
        continue
      }
      const hits = html.split(block.anchor).length - 1
      if (hits !== 1) {
        problems.push(`${rel}: anchor matched ${hits} time(s), needs exactly 1`)
        continue
      }
      const wrapped = `${open(block.id)}\n${markupFor(block)}\n${close(block.id)}\n`
      html =
        block.position === 'after'
          ? html.replace(block.anchor, block.anchor + '\n' + wrapped)
          : html.replace(block.anchor, wrapped + block.anchor)
      edits.set(abs, html)
      applied++
    } else if (block.kind === 'replace') {
      const hits = html.split(block.from).length - 1
      if (hits === 0) {
        // Either already applied, or the capture moved underneath it. Those are
        // very different situations, so tell them apart rather than guessing.
        if (html.includes(block.to)) already++
        else problems.push(`${rel}: neither the original nor the replacement is present`)
        continue
      }
      html = html.split(block.from).join(block.to)
      edits.set(abs, html)
      applied += hits
    } else {
      problems.push(`${rel}: unknown kind "${block.kind}"`)
    }
  }

  const expected = block.expect ?? files.length
  const ok =
    problems.length === 0 &&
    (applied === expected || applied + already + resynced === files.length)

  if (!ok) failed = true
  report.push({
    id: block.id,
    ok,
    detail:
      `${block.kind} across ${files.length} file(s): applied ${applied}, expected ${expected}` +
      (resynced ? `, re-synced ${resynced}` : '') +
      (already ? `, already in place ${already}` : ''),
    problems,
  })
}

console.log(
  `Applying ${CONTENT.length} content block(s)${DRY ? ' (dry run)' : ''}\n`
)
for (const r of report) {
  console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.id}`)
  console.log(`        ${r.detail}`)
  for (const p of r.problems ?? []) console.log(`        ${p}`)
}

if (!DRY && !failed) {
  for (const [abs, html] of edits) await writeFile(abs, html)
}

console.log(`\n--- ${DRY ? 'dry run' : failed ? 'aborted, nothing written' : 'content applied'} ---`)
console.log(`files rewritten: ${DRY || failed ? 0 : edits.size}`)
if (failed) {
  console.log(
    `\nNothing was written. A block that does not match means the capture changed\n` +
      `under it — re-read the page before trusting the block.`
  )
}
process.exit(failed ? 1 : 0)
