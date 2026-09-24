/**
 * Pull the homepage cover's water plate and loop video into the mirror.
 *
 * The cover references two files that are generated rather than captured:
 *
 *   wp-content/uploads/2026/09/hero-water-poster.jpg   the still behind the copy
 *   wp-content/uploads/2026/09/hero-water-loop.mp4     an 8s seamless loop
 *
 * Both were generated with Higgsfield (Cinema Studio Image 2.5 for the plate,
 * Cinema Studio Video 3.0 for the loop, with the plate as both the first and the
 * last frame so it loops without a cut). The source URLs are below. They are
 * recorded here rather than in a commit message because this is the only thing
 * that can act on them.
 *
 * Why this exists as a script instead of two curl commands: the poster wants to
 * be a 1600px JPEG and the loop wants to be 720p, and doing either by hand is
 * how a 6MB PNG ends up shipped as a hero background.
 *
 *   node tools/fetch-cover-media.mjs
 *   node tools/fetch-cover-media.mjs --dry     # say what it would do, write nothing
 *
 * Needs a Chromium for the JPEG encode — same CHROME convention as the other
 * browser tools here. ffmpeg is optional: without it the loop ships at whatever
 * the source is, and the script says so rather than failing.
 *
 * Re-running is safe. Both outputs are overwritten from source each time.
 */
import { mkdir, stat, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const run = promisify(execFile)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, process.env.MIRROR_DIR || '.')
const OUT = join(DIR, 'wp-content/uploads/2026/09')
const TMP = tmpdir()
const DRY = process.argv.includes('--dry')
const EXEC = process.env.CHROME || join(process.env.USERPROFILE || process.env.HOME || '',
  'AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe')

const HOST = 'https://d8j0ntlcm91z4.cloudfront.net/user_3473Ds6dmjqBsdAMXdsAJwAejPJ'

// The plate the cover is built around: a calm dark water surface with caustics
// and light rays, and a quiet centre for the copy. 2752x1536.
const PLATE = `${HOST}/hf_20260924_212014_8696bcaa-04e6-4e4f-b7d3-1d188160da99.png`
// The same plate in motion. Locked-off camera, ripples and drifting droplets.
const CLIP = `${HOST}/hf_20260924_212249_6727b78a-62cc-444c-a73c-096fe5bdcbbf.mp4`

// Three more plates were generated and not used. Kept so the choice can be
// revisited without paying for them again:
//   droplet impact crown + ripples   hf_20260924_212014_cba272dd-cd9b-4b55-b53e-4c3d054862a8.png
//   suspended droplet, refraction    hf_20260924_212014_ae7b25b7-4724-43c2-91b4-8a499a732fb2.png
//   curling sheet, emerald rim light hf_20260924_212014_bf8f1258-c488-4a76-a69d-79ed254eef7b.png

const mb = (n) => (n / 1048576).toFixed(2) + ' MB'
const sizeOf = async (p) => (await stat(p)).size

/**
 * fetch first, curl second. fetch is the obvious choice and needs nothing
 * installed, but it ignores HTTPS_PROXY, so it fails outright anywhere the
 * network is mediated by one — including a CI container. curl reads the proxy
 * environment and is present on every platform this repo is worked on.
 */
async function download(url, dest) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { writeFile } = await import('node:fs/promises')
    await writeFile(dest, Buffer.from(await res.arrayBuffer()))
  } catch (err) {
    const { stdout } = await run('curl', ['-sS', '--fail', '--max-time', '300', '-o', dest, '-w', '%{http_code}', url])
    if (stdout.trim() !== '200') throw new Error(`${err.message}, then curl got HTTP ${stdout.trim()}`)
  }
  return sizeOf(dest)
}

/** ffmpeg-static if it is installed, else whatever is on PATH, else nothing. */
async function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG
  try {
    const m = await import('ffmpeg-static')
    if (m.default) return m.default
  } catch { /* not installed */ }
  try {
    await run('ffmpeg', ['-version'])
    return 'ffmpeg'
  } catch { return null }
}

if (DRY) {
  console.log(`Would write into ${OUT}:`)
  console.log(`  hero-water-poster.jpg   1600x893 JPEG q74, re-encoded from ${PLATE.split('/').pop()}`)
  console.log(`  hero-water-loop.mp4     1280x720 H.264 CRF 30, from ${CLIP.split('/').pop()}`)
  console.log(`\nffmpeg: ${(await findFfmpeg()) ?? 'not found — the loop would ship at source size'}`)
  process.exit(0)
}

await mkdir(OUT, { recursive: true })

// ---- poster ---------------------------------------------------------------
// A 2752px PNG is not a hero background. The only image encoder guaranteed to be
// here is the browser the other tools already use, and it encodes a perfectly
// good JPEG, so the plate is drawn at the target size and screenshotted.
const platePath = join(TMP, 'wa-cover-plate.png')
console.log(`plate   ${mb(await download(PLATE, platePath))}  source PNG`)

const browser = await chromium.launch({ executablePath: EXEC })
const page = await browser.newPage({ viewport: { width: 1600, height: 893 }, deviceScaleFactor: 1 })
await page.goto(`file://${platePath.split('\\').join('/')}`)
await page.addStyleTag({ content: 'html,body{margin:0;background:#03121b}img{width:1600px;height:893px;display:block;object-fit:cover}' })
await page.waitForTimeout(400)
await page.screenshot({ path: join(OUT, 'hero-water-poster.jpg'), type: 'jpeg', quality: 74 })
await browser.close()
console.log(`poster  ${mb(await sizeOf(join(OUT, 'hero-water-poster.jpg')))}  1600x893 JPEG`)

// ---- loop video -----------------------------------------------------------
// Shipped at 720p: it sits behind a scrim at 55% opacity and is never the
// subject, so 1080p pays full price for detail nobody can resolve. It is also
// never loaded below 900px, under reduced motion, or on Data Saver — see the
// cover's own script — so this file is desktop-only weight.
const clipPath = join(TMP, 'wa-cover-clip.mp4')
console.log(`clip    ${mb(await download(CLIP, clipPath))}  source MP4`)

const ffmpeg = await findFfmpeg()
if (!ffmpeg) {
  const { copyFile } = await import('node:fs/promises')
  await copyFile(clipPath, join(OUT, 'hero-water-loop.mp4'))
  console.log(`video   ${mb(await sizeOf(join(OUT, 'hero-water-loop.mp4')))}  SOURCE SIZE — no ffmpeg found`)
  console.log(`\n        Install one (npm i -D ffmpeg-static) and re-run to cut this down.`)
} else {
  await run(ffmpeg, [
    '-y', '-i', clipPath,
    '-an',                                  // decorative, and it autoplays
    '-vf', 'scale=1280:-2:flags=lanczos',
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-crf', '30', '-preset', 'slow',
    '-movflags', '+faststart',              // first frame without the whole file
    '-g', '48',
    join(OUT, 'hero-water-loop.mp4'),
  ])
  console.log(`video   ${mb(await sizeOf(join(OUT, 'hero-water-loop.mp4')))}  1280x720 H.264`)
}

console.log(`\nDone. Run \`npm run verify\` — it should go back to zero unresolved references.`)
await access(join(OUT, 'hero-water-poster.jpg'))
