/**
 * Apply the corrections in tools/fixes.mjs to the captured HTML.
 *
 * Run after every capture — `npm run mirror` writes the live site's markup
 * verbatim, broken links included, so without this step a rebuild silently
 * undoes every fix.
 *
 * Idempotent: running it twice is a no-op, because a fix that is already applied
 * matches nothing. That is also why it checks counts. A fix whose `expect` no
 * longer matches means the live site changed under it, so it stops instead of
 * applying a stale correction to a page that may no longer need it.
 *
 * TRANSFORMS run before FIXES on every file they apply to. A transform that
 * reports a problem on any file, or leaves any residue, fails the run, and a
 * failed run writes nothing.
 *
 *   node tools/apply-fixes.mjs
 *   node tools/apply-fixes.mjs --dry     # report what would change
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FIXES, TRANSFORMS } from './fixes.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, process.env.MIRROR_DIR || '.')
const DRY = process.argv.includes('--dry')

// _raw is the untouched capture and is deliberately never fixed: it is the
// reference that makes "what did we change?" answerable.
const SKIP_DIRS = new Set(['.git', 'node_modules', '_raw', 'tools', 'shots', '.probe'])

// Pages a LATER step of the rebuild writes from a page this step has already
// fixed. They are fixed here too, so the committed copy is right, but they are
// left out of every count: on a rebuild they arrive already fixed, so counting
// them would make a correct run look like a moved count.
//   thank-you/index.html  built from sample-page/ by `npm run forms:wire`
const DERIVED = new Set(['thank-you/index.html'])

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}

const relOf = (f) => relative(DIR, f).split('\\').join('/')
// A fix or transform applies to every HTML page unless it names its files.
const appliesTo = (item, rel) => (item.files ? item.files.includes(rel) : rel.endsWith('.html'))
const shown = (s) => s.replace(/\n/g, '\\n')

const htmlFiles = await walk(DIR)
const named = [...new Set([...TRANSFORMS, ...FIXES].flatMap((x) => x.files || []))]
const missing = named.filter((r) => !existsSync(join(DIR, r)))
const files = [...new Set([...htmlFiles, ...named.filter((r) => !missing.includes(r)).map((r) => join(DIR, r))])]
console.log(`Applying ${TRANSFORMS.length} transform(s) and ${FIXES.length} fix(es) across ` +
  `${htmlFiles.length} HTML files${named.length ? ` and ${named.filter((r) => !r.endsWith('.html')).length} other file(s)` : ''}` +
  `${DRY ? ' (dry run)' : ''}\n`)

const edits = new Map()      // file -> new content
const perFix = new Map()     // fix id -> [files]
const perTransform = new Map(TRANSFORMS.map((t) => [t.id, { files: 0, derived: 0, counts: {}, problems: [] }]))
let alreadyApplied = 0

for (const f of files) {
  const rel = relOf(f)
  const original = await readFile(f, 'utf8')
  let text = original

  for (const t of TRANSFORMS) {
    if (!appliesTo(t, rel)) continue
    const out = t.run(text)
    const s = perTransform.get(t.id)
    for (const p of out.problems) s.problems.push(`/${rel}: ${p}`)
    if (!out.changed) continue
    text = out.text
    if (DERIVED.has(rel)) { s.derived++; continue }
    s.files++
    for (const [k, v] of Object.entries(out.counts)) s.counts[k] = (s.counts[k] || 0) + v
  }

  for (const fix of FIXES) {
    if (!appliesTo(fix, rel) || !text.includes(fix.from)) continue
    text = text.split(fix.from).join(fix.to)
    if (DERIVED.has(rel)) continue
    if (!perFix.has(fix.id)) perFix.set(fix.id, [])
    perFix.get(fix.id).push('/' + rel)
  }

  if (text !== original) edits.set(f, text)
}

let failed = false
const current = async (f) => edits.get(f) ?? await readFile(f, 'utf8')

for (const t of TRANSFORMS) {
  const s = perTransform.get(t.id)
  let residue = 0
  for (const f of files) if (appliesTo(t, relOf(f))) residue += t.residue(await current(f))
  const absent = (t.files || []).filter((r) => missing.includes(r))

  const wasAlreadyApplied = s.files === 0 && residue === 0 && !s.problems.length
  const countsOk = !t.expect || wasAlreadyApplied ||
    Object.entries(t.expect).every(([k, v]) => (s.counts[k] || 0) === v)
  const ok = !s.problems.length && residue === 0 && countsOk && !absent.length
  if (wasAlreadyApplied) alreadyApplied++

  const counts = Object.entries(s.counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing'
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${t.id}`)
  console.log(`        ${t.summary}`)
  console.log(`        changed ${s.files} file(s): ${counts}` +
    `${t.expect ? `; expected ${Object.entries(t.expect).map(([k, v]) => `${v} ${k}`).join(', ')}` : ''}` +
    `${s.derived ? `; plus ${s.derived} derived page(s), not counted` : ''}` +
    `${wasAlreadyApplied ? ' (already applied)' : ''}; ${residue} trace(s) left`)
  for (const r of absent) console.log(`        missing file: ${r}`)
  for (const p of s.problems.slice(0, 20)) console.log(`        ${p}`)
  if (s.problems.length > 20) console.log(`        …and ${s.problems.length - 20} more problem(s)`)
  if (!countsOk) console.log(`        Count moved: the capture changed under this transform. Re-read it before trusting it.`)
  if (!ok) failed = true
}

for (const fix of FIXES) {
  const hit = perFix.get(fix.id) || []

  // The meaningful check is that the broken form is gone — not that the correct
  // form is present. Both of these fixes point at a URL the header nav already
  // links on every page, so "does the page contain the target?" is true on all
  // 183 files whether the fix ran or not, and would mask a fix that silently
  // stopped matching.
  let remaining = 0
  for (const f of files) {
    if (!appliesTo(fix, relOf(f))) continue
    if ((await current(f)).includes(fix.from)) remaining++
  }

  const changedAsExpected = hit.length === fix.expect
  const wasAlreadyApplied = hit.length === 0 && remaining === 0
  const ok = remaining === 0 && (changedAsExpected || wasAlreadyApplied)
  if (wasAlreadyApplied) alreadyApplied++

  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${fix.id}`)
  console.log(`        ${shown(fix.from)}  ->  ${shown(fix.to)}`)
  console.log(`        changed ${hit.length} file(s), expected ${fix.expect}` +
    `${wasAlreadyApplied ? ' (already applied)' : ''}; ${remaining} still broken`)
  if (!ok) {
    failed = true
    console.log(hit.length && !changedAsExpected
      ? `        Count moved: the live site changed under this fix. Re-read it before trusting it.`
      : `        ${remaining} file(s) still carry the broken link.`)
  }
}

if (!DRY && !failed) {
  for (const [f, text] of edits) await writeFile(f, text)
}

console.log(`\n--- ${DRY ? 'dry run' : failed ? 'aborted, nothing written' : 'fixes applied'} ---`)
console.log(`files ${DRY ? 'that would be rewritten' : 'rewritten'}: ${failed ? 0 : edits.size}`)
if (alreadyApplied) console.log(`fixes already in place: ${alreadyApplied}`)
process.exit(failed ? 1 : 0)
