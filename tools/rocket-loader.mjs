/**
 * Undo Cloudflare Rocket Loader's rewrite of a captured page.
 *
 * The capture was taken from the old site's public URL, which sat behind
 * Cloudflare with Rocket Loader switched on. Rocket Loader is not in the origin
 * HTML: Cloudflare's edge rewrites every page on its way out. It retypes every
 * script it will manage from `text/javascript` (or no type at all) to
 * `<hash>-text/javascript`, so the browser skips them, and injects its own
 * loader before </body> to run them later. The capture saved that output, so
 * every page in this repo arrived with a finished Rocket Loader pass baked in.
 *
 * On its own that works: the baked-in loader runs the baked-in scripts. It
 * breaks the moment the page is served through Cloudflare with Rocket Loader on
 * again, which is how www is served today. The edge adds a SECOND loader with a
 * new hash, and the two fire the page's ready events early and twice. Elementor
 * Pro never finishes starting, so the mobile menu, the desktop dropdowns, the
 * sticky header, the carousels, the hotspots and the menu cart are all dead on
 * www while the unproxied apex, with one loader, works.
 *
 * The fix is to ship what the origin sent before Cloudflare touched it. Then
 * the page works natively with Rocket Loader off, and with Rocket Loader on the
 * edge does exactly one pass over it, which is the arrangement the old site ran
 * on for years.
 *
 * What Rocket Loader does to a script, and so how each one is put back:
 *
 *   - No type attribute: it APPENDS type="<hash>-text/javascript" as the last
 *     attribute. Removing it restores the tag byte for byte. The FastBots embed
 *     is the proof in this capture: FastBots publishes that snippet with no type,
 *     and it arrived with the type appended after data-bot-id.
 *   - A JavaScript type it recognises (text/javascript, module, ...): it
 *     rewrites the value IN PLACE, keeping the attribute where it was. So a
 *     hashed type anywhere but last is put back as type="<original>". Seen live
 *     on 22 Sep 2026: the edge turned the analytics beacon's type="module" into
 *     type="0a7ad7abdbb83f4378ec0c8d-module" without moving it.
 *   - Anything else (application/ld+json, speculationrules, a type that already
 *     carries another hash) and any script marked data-cfasync="false": left
 *     alone, so they are left alone here too. Cloudflare's email-obfuscation
 *     decoder is one of those and keeps working untouched.
 *
 * The one case the markup cannot settle: a script whose original type was
 * text/javascript AND the last attribute comes out of Rocket Loader looking
 * exactly like an appended one. It is restored with no type. That is the same
 * script to every browser, and WordPress does not write that type at all here:
 * the theme (hello-elementor) declares HTML5 script and style support, which is
 * visible in the capture as stylesheet <link>s carrying no type='text/css'.
 *
 * Also removed, if present: the event-handler guards Rocket Loader writes into
 * on* attributes ("if (!window.__cfRLUnblockHandlers) return false; ") and the
 * data-cf-modified-<hash>- marker it puts on those elements. None are in the
 * current capture, but a future one could carry them, and a page with the
 * guards left in and no loader to lift them has dead buttons.
 *
 * Deliberately NOT touched: the Cloudflare Web Analytics beacon (a separate
 * product, not part of Rocket Loader; whether it stays is an analytics
 * decision), the email-decode script, and the /cdn-cgi/l/email-protection
 * links.
 */

const LOADER_TAG = /<script\b[^>]*\bsrc="[^"]*\/cloudflare-static\/rocket-loader\.min\.js"[^>]*><\/script>/g
const LOADER_SETTINGS = /\bdata-cf-settings="([0-9a-f]{24})-\|\d+"/
const SCRIPT_START = /<script\b[^>]*>/g
const HASHED_TYPE = /\stype="([0-9a-f]{24})-([^"]*)"/
const ANY_HASHED_TYPE = /\btype="[0-9a-f]{24}-/g
const HANDLER_GUARD = /if\s*\(\s*!\s*window\.__cfRLUnblockHandlers\s*\)\s*return\s+false;\s*/g
const MODIFIED_MARKER = /\s+data-cf-modified-([0-9a-f]{24})-(?:="[^"]*")?(?=[\s/>])/g
const RESIDUE = /rocket-loader\.min\.js|\bdata-cf-settings=|\btype="[0-9a-f]{24}-|\bdata-cf-modified-|__cfRLUnblockHandlers/g

/** Every trace of Rocket Loader left in a page. Zero once a page is restored. */
export function rocketLoaderResidue(html) {
  return (html.match(RESIDUE) || []).length
}

/**
 * Restore one page. Pure: returns the new markup and what it did, and lists
 * anything it found but did not understand in `problems`, in which case the
 * caller must not write the result.
 */
export function undoRocketLoader(html) {
  const problems = []
  const loaders = html.match(LOADER_TAG) || []
  const hashes = new Set()
  for (const tag of loaders) {
    const m = LOADER_SETTINGS.exec(tag)
    if (m) hashes.add(m[1])
    else problems.push(`loader tag without a data-cf-settings hash: ${tag.slice(0, 160)}`)
  }

  const typedBefore = (html.match(ANY_HASHED_TYPE) || []).length
  const result = { html, changed: false, loaders: loaders.length, hashes: [...hashes],
    typeRemoved: 0, typeRestored: 0, handlers: 0, problems }

  if (!loaders.length) {
    // A retyped script with no loader to run it never runs. That is a page
    // broken in a way this function was not written for, so say so.
    if (typedBefore) problems.push(`${typedBefore} Rocket Loader script type(s) but no loader tag`)
    return result
  }

  let out = html.replace(LOADER_TAG, '')
  let foreign = 0

  out = out.replace(SCRIPT_START, (tag) => {
    const m = HASHED_TYPE.exec(tag)
    if (!m) return tag
    const [attr, hash, original] = m
    if (!hashes.has(hash)) { foreign++; return tag }
    const appended = original === 'text/javascript' && tag.endsWith(`${attr}>`)
    if (appended) {
      result.typeRemoved++
      return tag.slice(0, tag.length - attr.length - 1) + '>'
    }
    result.typeRestored++
    return tag.replace(attr, ` type="${original}"`)
  })

  out = out.replace(MODIFIED_MARKER, (m, hash) => (hashes.has(hash) ? '' : m))
  out = out.replace(HANDLER_GUARD, () => { result.handlers++; return '' })

  // Self-checks. Every retyped script must be accounted for, and nothing of
  // Rocket Loader may be left, including its hash anywhere in the page.
  if (foreign) problems.push(`${foreign} script(s) retyped with a hash no loader tag on the page declares`)
  if (result.typeRemoved + result.typeRestored + foreign !== typedBefore) {
    problems.push(`found ${typedBefore} retyped script(s) but restored ` +
      `${result.typeRemoved + result.typeRestored}; a retyped script is not in a shape this understands`)
  }
  const residue = rocketLoaderResidue(out)
  if (residue) problems.push(`${residue} Rocket Loader trace(s) left after restoring`)
  for (const h of hashes) if (out.includes(h)) problems.push(`hash ${h} still appears in the page`)

  result.html = out
  result.changed = out !== html
  return result
}
