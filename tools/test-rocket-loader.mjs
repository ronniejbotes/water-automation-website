/**
 * Cases the Rocket Loader restore has to keep getting right.
 *
 * Every fixture here is a shape taken from this site: the captured pages, or
 * what Cloudflare's edge served on www on 22 September 2026. See
 * tools/rocket-loader.mjs for why the restore exists.
 *
 *   node tools/test-rocket-loader.mjs
 */
import { undoRocketLoader, rocketLoaderResidue } from './rocket-loader.mjs'

const H = '2337cf6bc0f1edfb8b1a7eb0'
const H2 = '0a7ad7abdbb83f4378ec0c8d'
const LOADER = (h) => `<script src="/cdn-cgi/scripts/7d0fa10a/cloudflare-static/rocket-loader.min.js" data-cf-settings="${h}-|49" defer></script>`
const page = (body, ...hashes) => `<html><head>${body}</head><body>\n${hashes.map(LOADER).join('')}</body></html>`
const bare = (body) => `<html><head>${body}</head><body>\n</body></html>`

let failures = 0
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) console.log('ok    ' + name)
  else { failures++; console.log(`FAIL  ${name}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`) }
}
const restored = (html) => undoRocketLoader(html).html

check('an appended type is removed, putting back a script that had none',
  restored(page(`<script id="jquery-core-js" src="/wp-includes/js/jquery/jquery.min.js?ver=3.7.1" type="${H}-text/javascript"></script>`, H)),
  bare('<script id="jquery-core-js" src="/wp-includes/js/jquery/jquery.min.js?ver=3.7.1"></script>'))

check('an inline script with no other attribute comes back bare',
  restored(page(`<script type="${H}-text/javascript">var a = 1</script>`, H)),
  bare('<script>var a = 1</script>'))

check('the FastBots snippet keeps its own attribute order',
  restored(page(`<script defer src="https://app.fastbots.ai/embed.js" data-bot-id="x" type="${H}-text/javascript"></script>`, H)),
  bare('<script defer src="https://app.fastbots.ai/embed.js" data-bot-id="x"></script>'))

check('a type rewritten in place is restored in place',
  restored(page(`<script type="${H}-text/javascript" src="/a.js"></script>`, H)),
  bare('<script type="text/javascript" src="/a.js"></script>'))

check('a module keeps type="module" (the beacon, as the www edge served it)',
  restored(page(`<script type="${H}-module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"spa":2}'></script>`, H)),
  bare(`<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"spa":2}'></script>`))

check('data-cfasync, ld+json, speculationrules and email protection are left alone',
  restored(page([
    '<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>',
    '<script type="application/ld+json" class="yoast-schema-graph">{}</script>',
    '<script type="speculationrules">{}</script>',
    '<a href="/cdn-cgi/l/email-protection#abc"><span class="__cf_email__" data-cfemail="abc">[email&#160;protected]</span></a>',
    `<script id="x" type="${H}-text/javascript"></script>`,
  ].join(''), H)),
  bare([
    '<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>',
    '<script type="application/ld+json" class="yoast-schema-graph">{}</script>',
    '<script type="speculationrules">{}</script>',
    '<a href="/cdn-cgi/l/email-protection#abc"><span class="__cf_email__" data-cfemail="abc">[email&#160;protected]</span></a>',
    '<script id="x"></script>',
  ].join('')))

check('two loaders (a capture taken from www today) are both undone',
  restored(page(`<script src="/a.js" type="${H}-text/javascript"></script><script type="${H2}-module" src="/b.js"></script>`, H, H2)),
  bare('<script src="/a.js"></script><script type="module" src="/b.js"></script>'))

check('event-handler guards and their markers are removed',
  restored(page(`<button onclick="if (!window.__cfRLUnblockHandlers) return false; go()" data-cf-modified-${H}-="">x</button>`, H)),
  bare('<button onclick="go()">x</button>'))

{
  const once = restored(page(`<script src="/a.js" type="${H}-text/javascript"></script>`, H))
  const again = undoRocketLoader(once)
  check('idempotent: a restored page is left exactly as it is',
    [again.changed, again.problems, again.html === once], [false, [], true])
}

check('nothing of Rocket Loader is left after a restore',
  rocketLoaderResidue(restored(page(`<script src="/a.js" type="${H}-text/javascript"></script>`, H))), 0)

check('a hash no loader declares is reported, not guessed at',
  undoRocketLoader(page(`<script src="/a.js" type="${H2}-text/javascript"></script>`, H)).problems.length > 0, true)

check('retyped scripts with no loader tag are reported, not guessed at',
  undoRocketLoader(bare(`<script src="/a.js" type="${H}-text/javascript"></script>`)).problems.length > 0, true)

check('a page with no Rocket Loader at all is untouched and clean',
  (() => { const r = undoRocketLoader(bare('<script src="/a.js"></script>')); return [r.changed, r.problems] })(),
  [false, []])

console.log(failures ? `\n${failures} failing case(s)` : '\nall cases pass')
process.exit(failures ? 1 : 0)
