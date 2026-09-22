/**
 * Make the enquiry forms submit somewhere that exists.
 *
 * Every Elementor form in this mirror is hijacked by Elementor Pro's own
 * front-end JavaScript before the browser can use the form. The chain is:
 *
 *   1. elements-handlers.min.js calls
 *      `elementorFrontend.elementsHandler.attachHandler("form", [...])`.
 *   2. elementor/assets/js/frontend.min.js walks the DOM, reads each element's
 *      `data-widget_type`, and fires `frontend/element_ready/form.default` for
 *      anything whose value is `form.default`.
 *   3. That runs module 2176 of
 *      elementor-pro/assets/js/form.cfd61a9174be80f835c6.bundle.min.js, whose
 *      `bindEvents()` does `this.elements.$form.on("submit", this.handleSubmit)`
 *      and whose handleSubmit is, verbatim:
 *
 *        handleSubmit(e){ ... e.preventDefault(), ... jQuery.ajax({
 *          url: t.getSettings("ajaxUrl"), type:"POST", ... })}
 *
 *      with `ajaxUrl: elementorProFrontend.config.ajaxurl`, which every page in
 *      this build sets to "/wp-admin/admin-ajax.php".
 *   4. The same bundle's reCAPTCHA v3 module binds a second interceptor to the
 *      submit BUTTON's click, preventDefault()s that too, waits on
 *      grecaptcha.execute() and then re-triggers submit — so even the click is
 *      not the browser's own any more.
 *
 * The preventDefault is unconditional. There is no class to drop that makes the
 * handler fall through, the way Forminator's `forminator_ajax` does on the In
 * The Light Roofing build. What there is, is the hook name: the handler only
 * ever reaches a form whose widget wrapper says `data-widget_type="form.default"`.
 * Rename that one attribute value and step 2 fires an action nobody listens to,
 * the lazy chunk in step 3 is never even fetched, the reCAPTCHA interceptor in
 * step 4 never binds, and the browser performs an ordinary form post.
 *
 * Nothing about the look changes: `data-widget_type` is referenced by exactly
 * one CSS rule in the whole build, and that rule names `e-component.default`.
 * The `.elementor-form` and `.elementor-widget-form` classes every stylesheet
 * actually targets are untouched.
 *
 * So this tool:
 *   - renames `form.default` to `form-static.default` on the 31 form widgets;
 *   - gives each <form> the `action="/_forms/submit.php"` it never had (these
 *     forms carry method="post" and no action at all, so without one a native
 *     post would go back to the page itself);
 *   - stamps the page's own path into a hidden field, so the notification email
 *     names the right page even when the browser sends no Referer;
 *   - deletes the reCAPTCHA v3 api.js <script>, which after the rename is a
 *     third-party request on 29 pages that renders nothing and is called by
 *     nothing (the secret key that verified those tokens belongs to the
 *     WordPress install and does not come with us);
 *   - loads /_forms/forms.js on every page with a form, which puts back what
 *     Elementor's handler did for a visitor: the post goes by fetch, the
 *     button shows its busy state, and the answer appears in place under the
 *     form, in Elementor's own markup and words, without leaving the page. With
 *     no JavaScript the browser posts the form itself and lands on /thank-you/;
 *   - generates _forms/submit.php, the handler at the other end, which answers
 *     JSON to that script and a 303 to a plain post;
 *   - generates _forms/forms.js;
 *   - generates /thank-you/, the page a successful plain post lands on.
 *
 * Idempotent, and it checks its counts: if the number of forms it finds is not
 * the number this build is known to have, it stops rather than half-applying.
 * Like tools/fixes.mjs, this lives in a tool and not in the pages, because
 * `npm run mirror` rewrites the pages from the live site and would silently
 * undo every one of these edits.
 *
 *   node tools/forms-wire.mjs
 *   node tools/forms-wire.mjs --dry     # report what would change
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { join, resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { MESSAGES, CONTACT } from './forms-messages.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, process.env.MIRROR_DIR || '.')
const DRY = process.argv.includes('--dry')

const SKIP_DIRS = new Set(['.git', 'node_modules', '_raw', 'tools', 'shots', '.probe', '_forms'])

/* ------------------------------------------------------------- what we expect */

// Counted from the build on 17 September 2026 and agreeing with
// `npm run forms`, with COMMERCE.md, and with the switchover preflight. If any
// of these move, the capture changed underneath this tool and it needs reading
// again before it is trusted.
const EXPECT = {
  widgets: 31,       // data-widget_type="form.default" wrappers
  forms: 31,         // <form class="elementor-form"> open tags
  files: 30,         // pages carrying at least one of them
  definitions: 10,   // distinct form_id values
  recaptcha: 29,     // pages loading Google's reCAPTCHA api.js
}

// Checked on every run, wired or not, because the edits behind them are newer
// than the wiring and apply to a build that is already wired.
const EXPECT_ALWAYS = {
  formPages: 30,     // pages that must load /_forms/forms.js
}

const FORM_ACTION = '/_forms/submit.php'
const FORMS_JS = '/_forms/forms.js'
const PAGE_FIELD = 'wa_page'
const THANKS_URL = '/thank-you/'

// Both addresses are the site's own, decoded from the Cloudflare-obfuscated
// mailto links on /contact-us/. That page says, in its own words, "For general
// inquiries, please contact us at support@waterautomation.com", and reserves
// sales@waterautomation.com for "bulk order inquiries". The enquiry forms are
// general enquiries, so support@ is where they go. It is one line to change if
// the owner would rather have leads land in sales@.
const TO = 'support@waterautomation.com'
const FROM_NAME = 'Water Automation website'

/* ------------------------------------------------------------------ the walk */

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}

const urlOf = (file) => '/' + relative(DIR, file).split('\\').join('/').replace(/index\.html$/, '')

/** Split a document into one chunk per Elementor form, so fields land on the right form. */
function formChunks(html) {
  const out = []
  const re = /<form[^>]*class="[^"]*elementor-form[^"]*"[\s\S]*?<\/form>/gi
  for (const m of html.matchAll(re)) out.push(m[0])
  return out
}

/**
 * What one form collects, read off the page rather than off documentation, so
 * the notification email calls every field what the visitor saw above it.
 */
function readForm(chunk) {
  const id = /name="form_id" value="([^"]+)"/.exec(chunk)?.[1]
  if (!id) return null

  const labels = new Map()
  for (const m of chunk.matchAll(/<label for="form-field-([^"]+)"[^>]*class="[^"]*elementor-field-label[^"]*"[^>]*>([\s\S]*?)<\/label>/gi)) {
    labels.set(m[1], m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
  }

  const fields = new Map()
  const honeypots = []
  for (const m of chunk.matchAll(/<(input|textarea|select)\b([^>]*)>/gi)) {
    const attrs = m[2]
    const name = /name="form_fields\[([^\]]+)\]"/.exec(attrs)?.[1]
    if (!name) continue
    // Elementor's spam trap is a real field hidden with an inline style rather
    // than a type="hidden" input, and it is not called the same thing on every
    // form: /expo-signup/ calls its one "field_f6ed4c3". Harvesting them by the
    // style that hides them catches all of them without a hardcoded list.
    if (/display:\s*none/i.test(attrs)) {
      if (!honeypots.includes(name)) honeypots.push(name)
      continue
    }
    if (fields.has(name)) continue
    const label = labels.get(name) || /placeholder="([^"]*)"/.exec(attrs)?.[1] || name
    fields.set(name, label)
  }

  const button = /<button[^>]*type="submit"[\s\S]*?<span class="elementor-button-text">([^<]*)</.exec(chunk)?.[1]?.trim()
  return { id, fields, honeypots, button: button || 'Website form' }
}

/* ------------------------------------------------------------------ the edits */

const files = await walk(DIR)
console.log(`Wiring the enquiry forms across ${files.length} HTML files${DRY ? ' (dry run)' : ''}\n`)

const FORMS_JS_SOURCE = formsJs()
const FORMS_JS_VER = createHash('sha256').update(FORMS_JS_SOURCE).digest('hex').slice(0, 10)
// data-cfasync="false" because these pages carry Cloudflare's Rocket Loader,
// which otherwise defers every script until it gets round to them; this one
// should be listening before anyone can press submit.
const FORMS_JS_TAG = `<script src="${FORMS_JS}?ver=${FORMS_JS_VER}" id="wa-forms-js" defer data-cfasync="false"></script>`

const edits = new Map()
const defs = new Map()          // form_id -> { id, fields, honeypots, button, pages:Set }
const touched = []
let widgets = 0
let forms = 0
let recaptcha = 0
let alreadyWired = 0
let scriptPages = 0
let scriptsElsewhere = 0
let formPages = 0

for (const f of files) {
  const before = await readFile(f, 'utf8')
  let html = before
  const url = urlOf(f)

  // Harvest before editing, while the markup is still the capture's own.
  for (const chunk of formChunks(html)) {
    const def = readForm(chunk)
    if (!def) continue
    if (!defs.has(def.id)) defs.set(def.id, { ...def, pages: new Set() })
    const d = defs.get(def.id)
    d.pages.add(url)
    for (const [k, v] of def.fields) if (!d.fields.has(k)) d.fields.set(k, v)
    for (const h of def.honeypots) if (!d.honeypots.includes(h)) d.honeypots.push(h)
  }

  // 1. Take the widget out of Elementor's reach.
  const w = (html.match(/data-widget_type="form\.default"/g) || []).length
  widgets += w
  html = html.replace(/data-widget_type="form\.default"/g, 'data-widget_type="form-static.default"')

  // 2. Give every form an action, and stamp the page it sits on. The hidden
  //    field goes straight after form_id, which every one of these forms has.
  //    Both lookaheads are what make a second run a no-op rather than a form
  //    with two actions and two page stamps.
  const m = (html.match(/<form class="elementor-form" method="post"(?! action=)/g) || []).length
  forms += m
  html = html.replace(
    /<form class="elementor-form" method="post"(?! action=)/g,
    `<form class="elementor-form" method="post" action="${FORM_ACTION}"`,
  )
  html = html.replace(
    new RegExp(`(<input type="hidden" name="form_id" value="[^"]+"/>)(?!\\s*<input type="hidden" name="${PAGE_FIELD}")`, 'g'),
    `$1\n\t\t\t<input type="hidden" name="${PAGE_FIELD}" value="${url}"/>`,
  )

  // 3. Drop the reCAPTCHA loader. Nothing calls grecaptcha once the handler in
  //    step 1 no longer binds — the script is loaded with render=explicit, so
  //    it draws nothing by itself — and no key we hold can verify a token, so
  //    leaving it would be a third-party request that buys nothing.
  const r = (html.match(/<script id="elementor-recaptcha_v3-api-js"[^>]*><\/script>\n?/g) || []).length
  recaptcha += r
  html = html.replace(/<script id="elementor-recaptcha_v3-api-js"[^>]*><\/script>\n?/g, '')

  // 4. The in-place submit script, on every page with a form and no other.
  //    Removed and re-added rather than left alone, so a changed script gets a
  //    new ?ver= and no browser or CDN keeps serving the old one.
  const hadScript = /<script src="\/_forms\/forms\.js/.test(html)
  html = html.replace(/[ \t]*<script src="\/_forms\/forms\.js[^"]*"[^>]*><\/script>\n?/g, '')
  if (html.includes(`action="${FORM_ACTION}"`)) {
    formPages++
    const at = html.lastIndexOf('</body>')
    if (at !== -1) {
      html = `${html.slice(0, at)}${FORMS_JS_TAG}\n${html.slice(at)}`
      scriptPages++
    }
  } else if (hadScript) {
    scriptsElsewhere++
  }

  if (html !== before) { edits.set(f, html); touched.push(url) }
  else if (before.includes(`action="${FORM_ACTION}"`)) alreadyWired++
}

/* ----------------------------------------------------------------- the checks */

const pagesWithForms = new Set([...defs.values()].flatMap((d) => [...d.pages]))
const report = {
  widgets, forms, files: pagesWithForms.size, definitions: defs.size, recaptcha,
}

let failed = false
if (widgets === 0 && formPages > 0) {
  console.log(`Already wired: ${formPages} page(s) carry action="${FORM_ACTION}".`)
} else {
  for (const [k, want] of Object.entries(EXPECT)) {
    const got = report[k]
    const ok = got === want
    if (!ok) failed = true
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${k.padEnd(12)} expected ${String(want).padEnd(4)} found ${got}`)
  }
}

// The newer edits, checked whatever state the build was in. Each one must have
// found either its full expected count (first run) or nothing (already done),
// and must leave the finished state behind; anything in between means the
// capture moved and nothing is written.
const always = [
  ['formPages', formPages, formPages === EXPECT_ALWAYS.formPages, ''],
  ['scriptPages', scriptPages, scriptPages === EXPECT_ALWAYS.formPages, ''],
]
for (const [k, got, ok, hint] of always) {
  if (!ok) failed = true
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${k.padEnd(12)} found ${got}${!ok && hint ? `  (${hint})` : ''}`)
}
console.log()
if (failed) {
  console.error('Counts moved. Refusing to half-apply — re-read the build before trusting this tool.')
  process.exit(1)
}

/* ------------------------------------------------------------------- the PHP */

/** A JS value as a PHP literal. Only the shapes this file produces. */
function phpLiteral(v) {
  if (v === null || v === undefined) return 'null'
  if (Array.isArray(v)) return v.length ? `[${v.map(phpLiteral).join(', ')}]` : '[]'
  if (v instanceof Map) return phpLiteral(Object.fromEntries(v))
  if (typeof v === 'object') {
    const parts = Object.entries(v).map(([k, x]) => `${phpLiteral(String(k))} => ${phpLiteral(x)}`)
    return parts.length ? `[${parts.join(', ')}]` : '[]'
  }
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

/**
 * The handler, ported from the In The Light Roofing build's _forms/submit.php
 * and adapted to this site: Elementor names its fields form_fields[x] rather
 * than flat, hides its honeypot behind an inline style under a different name
 * on each form, and there is no upload control anywhere in this build — zero
 * matches for type="file" across all 186 pages — so the whole attachment path
 * is gone with it.
 *
 * Two things it does that the roofing one does not:
 *
 *   - It answers a failure with a page that says so and gives the visitor the
 *     site's own email address, instead of bouncing them back to a form that
 *     shows nothing. A host whose mail() is not configured is the one failure
 *     mode that would otherwise reproduce exactly what we are fixing: a form
 *     that looks like it worked and lost the lead.
 *   - The timestamp is written in UTC and labelled, because this business
 *     publishes no address anywhere on the site and guessing its timezone
 *     would be inventing something.
 *
 * And three things it does since the site went live on 21 September 2026 and
 * enquiries did not arrive:
 *
 *   - It sends through wa_deliver() in _lib/wa.php (Resend first) instead of
 *     mail(). mail() from Hostinger is unsigned mail claiming to be from
 *     waterautomation.com, whose SPF ends -all and whose DMARC is quarantine, so
 *     Microsoft 365 treated it as spoofed. mail() stays as the last fallback,
 *     and is the only transport with no config at all, so a server with no
 *     private config behaves exactly as before.
 *   - Every validated enquiry is written to a private JSONL log, outside the
 *     web root, before any email is attempted, and the outcome is appended
 *     under the same id. No transport failure can now lose one silently.
 *   - It answers JSON to /_forms/forms.js, which shows the answer in place
 *     under the form, as Elementor did, and still answers a plain browser post
 *     with the 303 to /thank-you/.
 *
 * String.raw, because PHP is full of backslashes. Nothing in the PHP may
 * contain a backtick or a ${ ; the only interpolations are the ones here.
 */
function submitPhp(definitions) {
  const map = {}
  for (const d of [...definitions.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    map[d.id] = {
      label: d.button,
      honeypots: d.honeypots,
      fields: Object.fromEntries(d.fields),
    }
  }
  return String.raw`<?php
/**
 * Form handler for the static build of waterautomation.com.
 *
 * GENERATED by tools/forms-wire.mjs. Do not edit this file -- edit submitPhp()
 * in that tool and re-run it, or the next run overwrites what you wrote.
 *
 * THIS FILE NEEDS A HOST THAT RUNS PHP. On Netlify, Cloudflare Pages, GitHub
 * Pages or any other pure-static host it is not executed, and every form on the
 * site posts into nothing. See
 * SEO Program/plans/water-automation/switchover-preflight.md.
 *
 * Every enquiry form on the site posts here: tools/forms-wire.mjs sets
 * action="${FORM_ACTION}" on each one and renames the Elementor widget hook
 * that would otherwise have JavaScript intercept the submit and send it to
 * WordPress's admin-ajax.php, which does not exist on a static host.
 *
 * What happens to a submission, in order:
 *   1. A filled spam trap gets the success answer and nothing is sent. It is
 *      noted in private/spam-YYYY-MM.jsonl, so a real person caught by it
 *      can still be found.
 *   2. It must carry an email address or a phone number, and a well-formed
 *      email if it has one.
 *   3. It is written to private/submissions-YYYY-MM.jsonl, outside the web
 *      root, BEFORE any email is attempted.
 *   4. wa_deliver() (_lib/wa.php) sends it: Resend, Microsoft Graph, SMTP,
 *      then mail(), in the order the private config gives.
 *   5. The outcome is appended to the same log under the same id.
 *   6. The answer: JSON {success, message} to /_forms/forms.js, which shows it
 *      in place under the form the way Elementor did; to a browser posting
 *      the form itself, a 303 to /thank-you/ or the failure page.
 *
 * The private config is dirname(public_html)/private/config.php; see
 * tools/config.example.php. With none at all, step 4 is the plain mail() this
 * handler always used and step 3 still happens if PHP can create that folder.
 */

// Never show a PHP notice to a visitor; the host's error log is where they go.
ini_set('display_errors', '0');
error_reporting(E_ALL);

// UTC, and labelled as UTC in the mail. This business publishes no address and
// no phone number anywhere on its site, so its local time is not something this
// file is in a position to know.
date_default_timezone_set('UTC');

require_once __DIR__ . '/../_lib/wa.php';

// Where enquiries go when the private config names nowhere else (forms.to, or
// forms.to_by_form keyed by form_id), and the address a visitor is given when
// sending fails.
$TO = '${TO}';
$FROM_NAME = '${FROM_NAME}';
$THANKS = '${THANKS_URL}';
$CONTACT = '${CONTACT}';

// form_id -> the button's own words, the hidden spam-trap fields, and every
// visible field under the label the page puts above it. Harvested from the
// pages themselves at build time, so it cannot drift from what was shipped.
$FORMS = [
${Object.entries(map).map(([id, def]) => `    ${phpLiteral(id)} => ${phpLiteral(def)},`).join('\n')}
];

// What the visitor is told, in Elementor Pro's own default words (see
// tools/forms-messages.mjs). HTML, as Elementor's were.
$MESSAGES = ${phpLiteral(MESSAGES)};

// Posted with every form and never worth repeating in the email: Elementor's
// plumbing, and the page stamp, which is reported once at the foot instead.
$MACHINE = ['post_id', 'form_id', 'queried_id', 'referer_title', 'action',
  'g-recaptcha-response', '${PAGE_FIELD}'];

// Elementor posted by AJAX and answered in place; /_forms/forms.js does the
// same and asks for JSON. A browser posting the form itself asks for HTML.
$WANTS_JSON = isset($_SERVER['HTTP_ACCEPT']) && is_string($_SERVER['HTTP_ACCEPT'])
    && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

/**
 * A path on this site, or null. Everything that reaches a Location header goes
 * through here first: an absolute URL, a protocol-relative "//elsewhere" or a
 * header-splitting newline is refused outright rather than cleaned up, because
 * a redirector that tries to repair hostile input is how open redirects happen.
 */
function wa_local_path($url) {
    if (!is_string($url) || $url === '') {
        return null;
    }
    $path = parse_url($url, PHP_URL_PATH);
    if (!is_string($path) || $path === '' || $path[0] !== '/' || substr($path, 0, 2) === '//') {
        return null;
    }
    if (preg_match('#[^A-Za-z0-9/_.~%:@!$&()*+,;=-]#', $path)) {
        return null;
    }
    return $path;
}

/**
 * The page the visitor was on. HTTP_REFERER first, because it is the browser's
 * own answer; the ${PAGE_FIELD} field that tools/forms-wire.mjs stamps into the
 * markup is the fallback for the browsers and privacy settings that send no
 * referer at all.
 */
function wa_page() {
    $host = isset($_SERVER['HTTP_HOST']) ? preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST']) : '';
    $ref = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
    if (is_string($ref) && $ref !== '') {
        $parts = parse_url($ref);
        $refHost = (is_array($parts) && isset($parts['host'])) ? $parts['host'] : '';
        if ($refHost === '' || ($host !== '' && strcasecmp($refHost, $host) === 0)) {
            $path = wa_local_path($ref);
            if ($path !== null) {
                return $path;
            }
        }
    }
    // The stamped field is a bare path and nothing else, so a value carrying a
    // scheme or a host did not come from the markup and is not trusted to name
    // the page. Refused rather than reduced to its path: a
    // "//elsewhere.example/contact-us/" would otherwise pass as "/contact-us/".
    $raw = isset($_POST['${PAGE_FIELD}']) ? $_POST['${PAGE_FIELD}'] : '';
    if (is_string($raw) && $raw !== '' && $raw[0] === '/' && substr($raw, 0, 2) !== '//') {
        $stamped = wa_local_path($raw);
        if ($stamped !== null) {
            return $stamped;
        }
    }
    return '/';
}

/** 303, so the browser turns the POST into a GET and a refresh cannot resubmit. */
function wa_redirect($path) {
    header('Cache-Control: no-store');
    header('Location: ' . $path, true, 303);
    exit;
}

/** A JSON answer for /_forms/forms.js. */
function wa_json($status, array $payload) {
    http_response_code($status);
    header('Cache-Control: no-store');
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

/** Success: Elementor's message in place for the script, /thank-you/ for a plain post. */
function wa_succeed() {
    global $WANTS_JSON, $THANKS, $MESSAGES;
    if ($WANTS_JSON) {
        wa_json(200, ['success' => true, 'message' => $MESSAGES['success']]);
    }
    wa_redirect($THANKS);
}

/**
 * The failure answer.
 *
 * To the script: JSON with success false, the message it shows under the form,
 * and any per-field messages, shaped as Elementor's were so the same markup
 * appears. The fields keep what the visitor typed; only success clears them.
 *
 * To a plain post: a page, not a redirect. The whole point of this handler is
 * that an enquiry never disappears without anyone noticing, so say it plainly,
 * give them the address that does work, and leave the back button holding
 * everything they typed.
 */
function wa_fail($code, $headline, $detail, $message = null, array $errors = []) {
    global $CONTACT, $WANTS_JSON, $MESSAGES;
    if ($WANTS_JSON) {
        $out = ['success' => false, 'message' => ($message !== null) ? $message : $MESSAGES['error']];
        if ($errors) {
            $out['errors'] = $errors;
        }
        wa_json($code, $out);
    }
    http_response_code($code);
    header('Cache-Control: no-store');
    header('Content-Type: text/html; charset=UTF-8');
    $h = htmlspecialchars($headline, ENT_QUOTES, 'UTF-8');
    $d = htmlspecialchars($detail, ENT_QUOTES, 'UTF-8');
    $c = htmlspecialchars($CONTACT, ENT_QUOTES, 'UTF-8');
    // No "go back" link on this page: the only way to write one is a
    // javascript: href, which a content-security policy is entitled to block,
    // and a link that may do nothing is worse than a sentence that always does.
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
       . '<meta name="viewport" content="width=device-width, initial-scale=1">'
       . '<meta name="robots" content="noindex">'
       . '<title>' . $h . ' | Water Automation</title>'
       . '<style>body{margin:0;background:#f4f7f9;color:#12303f;'
       . 'font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}'
       . 'main{max-width:34rem;margin:12vh auto;padding:2rem;background:#fff;border-radius:12px;'
       . 'box-shadow:0 2px 18px rgba(18,48,63,.09)}h1{font-size:1.5rem;margin:0 0 1rem}'
       . 'a{color:#0d6e9e}p{margin:0 0 1rem}</style></head><body><main>'
       . '<h1>' . $h . '</h1><p>' . $d . '</p>'
       . '<p>Please email us at <a href="mailto:' . $c . '">' . $c . '</a> and we will pick it up from there.</p>'
       . '<p>Your browser\'s back button will take you to the form with everything '
       . 'you typed still in it. <a href="/">Back to the homepage</a></p>'
       . '</main></body></html>';
    exit;
}

/** Multi-line text with the control characters and the stray carriage returns taken out. */
function wa_text($value) {
    if (!is_string($value)) {
        return '';
    }
    $value = str_replace(["\0", "\r\n", "\r"], ['', "\n", "\n"], $value);
    $value = preg_replace('/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);
    return trim($value);
}

/** One line of text. Also what makes a value safe to put in a mail header. */
function wa_line($value) {
    return trim(str_replace("\n", ' ', wa_text($value)));
}

/** Cut to a byte length without splitting a UTF-8 character in half. */
function wa_cut($value, $max) {
    if (strlen($value) <= $max) {
        return $value;
    }
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max, 'UTF-8');
    }
    return preg_replace('/[\x80-\xBF]*$/', '', substr($value, 0, $max));
}

/**
 * Who this form's enquiries go to: forms.to_by_form[form_id], else forms.to,
 * else ${TO}. Each may be one address or a list. A configured value with no
 * valid address in it falls back to ${TO} rather than sending to no one.
 */
function wa_form_recipients($formId) {
    global $TO;
    $want = null;
    $byForm = wa_cfg('forms.to_by_form');
    if ($formId !== '' && is_array($byForm) && array_key_exists($formId, $byForm)) {
        $want = $byForm[$formId];
    }
    if ($want === null) {
        $want = wa_cfg('forms.to');
    }
    $list = [];
    foreach ((array) $want as $addr) {
        if (is_string($addr) && filter_var(trim($addr), FILTER_VALIDATE_EMAIL) !== false) {
            $list[] = trim($addr);
        }
    }
    if (!$list) {
        if ($want !== null) {
            error_log('wa-forms: forms.to / forms.to_by_form holds no valid address for form ' . $formId . '; using ' . $TO);
        }
        $list = [$TO];
    }
    return $list;
}

/**
 * A spam-trap hit, noted so a real person caught by it can be found, and
 * capped at 20 MB a month so a bot flood cannot fill the disk.
 */
function wa_log_spam(array $record) {
    $dir = wa_private_dir();
    if ($dir === null) {
        return;
    }
    $file = $dir . '/spam-' . gmdate('Y-m') . '.jsonl';
    clearstatcache(true, $file);
    if (is_file($file) && filesize($file) > 20 * 1024 * 1024) {
        return;
    }
    wa_log_append('spam', $record);
}

/* ------------------------------------------------------------------------ */

if (!isset($_SERVER['REQUEST_METHOD']) || strtoupper($_SERVER['REQUEST_METHOD']) !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    header('Content-Type: text/plain; charset=UTF-8');
    echo "This address accepts form submissions only.\n";
    exit;
}

$page = wa_page();
$ip = wa_client_ip();
$agent = wa_cut(wa_line(isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : ''), 400);

// A post larger than the host's post_max_size arrives with $_POST emptied and
// no warning of its own. Say so here rather than letting it fall through and
// look like an empty form.
if (empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && (int) $_SERVER['CONTENT_LENGTH'] > 0) {
    wa_fail(413, 'That message was too long to send',
        'The server would not accept a message that size, so it has not reached us.',
        $MESSAGES['error'] . '<br>' . $MESSAGES['contact']);
}

$posted = (isset($_POST['form_fields']) && is_array($_POST['form_fields'])) ? $_POST['form_fields'] : [];

$formId = preg_replace('/[^0-9a-z]/', '', strtolower(wa_line(isset($_POST['form_id']) ? $_POST['form_id'] : '')));
$known = isset($FORMS[$formId]) ? $FORMS[$formId] : null;

// The bot trap, before any validation. A filled-in honeypot gets the same
// answer a real submission gets, so nothing is learned from the difference.
// Which field is the trap is per-form, so an unrecognised form_id falls back to
// checking every trap name any form on this site uses.
$traps = ($known !== null) ? $known['honeypots'] : [];
if ($known === null) {
    foreach ($FORMS as $f) {
        foreach ($f['honeypots'] as $t) {
            $traps[] = $t;
        }
    }
}
foreach ($traps as $trap) {
    if (isset($posted[$trap]) && is_string($posted[$trap]) && wa_line($posted[$trap]) !== '') {
        $caught = [];
        foreach ($posted as $k => $v) {
            if (is_string($k) && is_string($v) && $v !== '') {
                $caught[$k] = wa_cut(wa_text($v), 500);
            }
        }
        wa_log_spam(['type' => 'honeypot', 'form' => $formId, 'page' => $page, 'trap' => $trap,
            'ip' => $ip, 'user_agent' => $agent, 'fields' => $caught]);
        wa_succeed();
    }
}

$name = wa_cut(wa_line(isset($posted['name']) ? $posted['name'] : ''), 200);
$email = wa_cut(wa_line(isset($posted['email']) ? $posted['email'] : ''), 250);
$tel = wa_cut(wa_line(isset($posted['tel']) ? $posted['tel'] : ''), 200);

// One way to answer, and no more than the form itself asks for. Every one of
// the ten forms marks its email field required; nothing else on any of them is
// worth turning a person away over, so nothing else is checked here.
if ($email === '' && $tel === '') {
    wa_fail(400, 'We need a way to reply',
        'The message arrived without an email address or a phone number, so there is no way to answer it.',
        $MESSAGES['error'], ['email' => $MESSAGES['required']]);
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    wa_fail(400, 'That email address did not look right',
        'The message has not been sent, because the address on it would bounce.',
        $MESSAGES['error'], ['email' => $MESSAGES['badEmail']]);
}

$label = ($known !== null && $known['label'] !== '') ? $known['label'] : 'Website form';
$label = substr(preg_replace('/\s+/', ' ', preg_replace('/[^A-Za-z0-9 &\/\x27-]/', '', $label)), 0, 40);
if (trim($label) === '') {
    $label = 'Website form';
}

/* ---------------------------------------------------------------- the body */

$inline = [];
$blocks = [];
$seen = [];
$fieldLabels = ($known !== null) ? $known['fields'] : [];

// The form's own fields first, in the order the page lays them out, under the
// label the page puts above them.
foreach ($fieldLabels as $field => $fieldLabel) {
    $seen[$field] = true;
    if (!isset($posted[$field]) || !is_string($posted[$field])) {
        continue;
    }
    $value = wa_cut(wa_text($posted[$field]), 20000);
    if ($value === '') {
        continue;
    }
    $shown = ($fieldLabel !== '') ? $fieldLabel : $field;
    if (strpos($value, "\n") === false) {
        $inline[] = [$shown, $value];
    } else {
        $blocks[] = [$shown, $value];
    }
}

// Anything a form grows later still reaches the inbox, under its own name --
// except the traps, which are never repeated back.
foreach ($posted as $field => $value) {
    if (isset($seen[$field]) || !is_string($field) || !is_string($value)) {
        continue;
    }
    if (in_array($field, $traps, true)) {
        continue;
    }
    $value = wa_cut(wa_text($value), 20000);
    if ($value === '') {
        continue;
    }
    if (strpos($value, "\n") === false) {
        $inline[] = [$field, $value];
    } else {
        $blocks[] = [$field, $value];
    }
}

foreach ($_POST as $field => $value) {
    if ($field === 'form_fields' || !is_string($field) || !is_string($value)) {
        continue;
    }
    if (in_array($field, $MACHINE, true)) {
        continue;
    }
    $value = wa_cut(wa_text($value), 20000);
    if ($value !== '' && strpos($value, "\n") === false) {
        $inline[] = [$field, $value];
    }
}

/* ---------------------------------------------------------------- the mail */

// One id for the log line, the delivery line and the email, so each can be
// found from the others.
$id = gmdate('Ymd\THis\Z') . '-' . bin2hex(random_bytes(5));

$width = 0;
foreach ($inline as $row) {
    $width = max($width, strlen($row[0]));
}
$width = max($width, 9);

$body = 'New ' . $label . ' submission from ' . $page . "\n\n";
foreach ($inline as $row) {
    $body .= str_pad($row[0] . ':', $width + 2) . $row[1] . "\n";
}
foreach ($blocks as $row) {
    $body .= "\n" . $row[0] . "\n" . str_repeat('-', strlen($row[0])) . "\n" . $row[1] . "\n";
}
$body .= "\n" . str_repeat('-', 40) . "\n";
$body .= str_pad('Page:', $width + 2) . $page . "\n";
$body .= str_pad('Form:', $width + 2) . ($formId !== '' ? $formId : 'unknown') . "\n";
$body .= str_pad('Received:', $width + 2) . date('Y-m-d H:i:s T') . "\n";
if ($ip !== '') {
    $body .= str_pad('From IP:', $width + 2) . $ip . "\n";
}
$body .= str_pad('Ref:', $width + 2) . $id . "\n";

$subject = wa_line('Water Automation: ' . $label . ' from ' . $page);
$to = wa_form_recipients($formId);

// On disk first. If every transport below fails, the enquiry is still here.
$fields = [];
foreach ($posted as $k => $v) {
    if (is_string($k) && is_string($v) && !in_array($k, $traps, true)) {
        $fields[$k] = wa_cut(wa_text($v), 20000);
    }
}
$logged = wa_log_append('submissions', [
    'type' => 'submission', 'id' => $id, 'form' => ($formId !== '' ? $formId : 'unknown'), 'label' => $label,
    'page' => $page, 'to' => $to, 'ip' => $ip, 'user_agent' => $agent, 'fields' => $fields,
    'subject' => $subject, 'text' => $body,
]);
if (!$logged) {
    error_log('wa-forms: ' . $id . ' could not be written to the submissions log; sending anyway');
}

$result = wa_deliver([
    'id' => $id,
    'to' => $to,
    'subject' => $subject,
    'text' => $body,
    // So hitting reply answers the person who filled the form in.
    'reply_to' => $email,
    'from_name' => $FROM_NAME,
]);

wa_log_append('submissions', [
    'type' => 'delivery', 'id' => $id, 'ok' => $result['ok'], 'transport' => $result['transport'],
    'errors' => $result['errors'], 'skipped' => isset($result['skipped']) ? $result['skipped'] : [],
    'logged' => $logged,
]);

if (!$result['ok']) {
    wa_fail(500, 'We could not send that message',
        'Something went wrong on our side and your message did not reach us. Nothing you typed has been lost -- go back and it will still be there.',
        $MESSAGES['server'] . '<br>' . $MESSAGES['contact']);
}

wa_succeed();
`
}

/* ------------------------------------------------------------ the script */

/**
 * /_forms/forms.js: what Elementor Pro's form handler did for a visitor, put
 * back without Elementor.
 *
 * Read off the captured handler, module 2176 of
 * elementor-pro/assets/js/form.cfd61a9174be80f835c6.bundle.min.js, and done
 * the same way, in the same markup and classes, so the site's own stylesheets
 * draw it exactly as before:
 *
 *   before sending   the form fades to 0.45 and gains elementor-form-waiting;
 *                    old messages and error marks are cleared; every submit
 *                    button is disabled and its inner span gets Elementor's
 *                    <span class="elementor-button-text elementor-form-spinner">
 *   on success       the form is reset (fields cleared) and
 *                    <div class="elementor-message elementor-message-success"
 *                    role="alert"> is appended under it, plus
 *                    elementor-message-svg because this site runs Elementor's
 *                    e_font_icon_svg experiment (that class draws the green
 *                    tick in widget-form.min.css)
 *   on refusal       per-field <span class="elementor-message
 *                    elementor-message-danger elementor-help-inline
 *                    elementor-form-help-inline"> in the field's group, and a
 *                    elementor-message-danger div under the form; the fields
 *                    keep what was typed
 *   events           submit_success, form_destruct and error are triggered on
 *                    the form through jQuery, as Elementor did, for anything
 *                    that listened for them (a tag manager trigger, the popup
 *                    module)
 *
 * One deliberate difference: when the request itself fails (network down, a
 * reply that is not JSON), Elementor printed jQuery's bare status word,
 * "error". This prints Elementor's own error sentence and the address to
 * write to instead.
 *
 * Progressive enhancement: with no fetch, or no JavaScript at all, nothing
 * binds and the browser posts the form itself, to the same handler, which
 * answers with the 303 to /thank-you/.
 *
 * Generated rather than hand-kept so its messages and endpoint cannot drift
 * from the handler's. Plain ES5 on purpose: it runs on the same old phones the
 * rest of the site does. No backtick or ${ may appear in it.
 */
function formsJs() {
  return String.raw`/*!
 * Enquiry forms, waterautomation.com.
 * GENERATED by tools/forms-wire.mjs (formsJs); edit it there, not here.
 * Posts the form by fetch and answers in place, as Elementor Pro's form
 * handler did. Without it the form still posts and lands on /thank-you/.
 */
(function () {
  'use strict';

  var ENDPOINT = ${JSON.stringify(FORM_ACTION)};
  var FAILED = ${JSON.stringify(`${MESSAGES.error}<br>${MESSAGES.contact}`)};
  var SPINNER = '<i class="fa fa-spinner fa-spin"></i>&nbsp;';

  if (!window.fetch || !window.FormData || !document.querySelectorAll) {
    return;
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  function drop(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  // Elementor announced these as jQuery events on the form.
  function announce(form, name, data) {
    var $ = window.jQuery;
    if (typeof $ === 'function') {
      try {
        $(form).trigger(name, data === undefined ? [] : [data]);
      } catch (e) { /* a listener's failure is not the form's */ }
    }
  }

  function svgIcons() {
    var c = window.elementorFrontendConfig;
    return !!(c && c.experimentalFeatures && c.experimentalFeatures.e_font_icon_svg);
  }

  function inputsOf(el) {
    return el.querySelectorAll('input, select, textarea, button');
  }

  function note(form, className, html) {
    var div = document.createElement('div');
    div.className = className;
    div.setAttribute('role', 'alert');
    div.innerHTML = html;
    form.appendChild(div);
  }

  function beforeSend(form, buttons) {
    form.style.transition = 'opacity 500ms';
    form.style.opacity = '0.45';
    form.classList.add('elementor-form-waiting');
    each(form.querySelectorAll('.elementor-message'), drop);
    each(form.querySelectorAll('.elementor-error'), function (el) {
      el.classList.remove('elementor-error');
    });
    each(form.querySelectorAll('div.elementor-field-group'), function (group) {
      group.classList.remove('error');
      each(group.querySelectorAll('span.elementor-form-help-inline'), drop);
      each(inputsOf(group), function (i) {
        i.setAttribute('aria-invalid', 'false');
      });
    });
    each(buttons, function (button) {
      button.setAttribute('disabled', 'disabled');
      each(button.children, function (child) {
        if (child.tagName === 'SPAN') {
          var spin = document.createElement('span');
          spin.className = 'elementor-button-text elementor-form-spinner';
          spin.innerHTML = SPINNER;
          child.insertBefore(spin, child.firstChild);
        }
      });
    });
  }

  function settle(form, buttons) {
    each(buttons, function (button) {
      button.removeAttribute('disabled');
      each(button.querySelectorAll('.elementor-form-spinner'), drop);
    });
    form.style.transition = 'opacity 100ms';
    form.style.opacity = '1';
    form.classList.remove('elementor-form-waiting');
  }

  function answered(form, buttons, res) {
    settle(form, buttons);
    if (res && res.success) {
      announce(form, 'submit_success', res);
      announce(form, 'form_destruct', res);
      form.reset();
      if (res.message) {
        note(form, 'elementor-message elementor-message-success' + (svgIcons() ? ' elementor-message-svg' : ''), res.message);
      }
      return;
    }
    var errors = res && res.errors;
    if (errors && typeof errors === 'object') {
      Object.keys(errors).forEach(function (id) {
        var field = form.querySelector('[id="form-field-' + String(id).replace(/[^A-Za-z0-9_-]/g, '') + '"]');
        var group = field && field.parentNode;
        if (!group) {
          return;
        }
        group.classList.add('elementor-error');
        var span = document.createElement('span');
        span.className = 'elementor-message elementor-message-danger elementor-help-inline elementor-form-help-inline';
        span.setAttribute('role', 'alert');
        span.innerHTML = errors[id];
        group.appendChild(span);
        each(inputsOf(group), function (i) {
          i.setAttribute('aria-invalid', 'true');
        });
      });
      announce(form, 'error');
    }
    note(form, 'elementor-message elementor-message-danger', (res && res.message) || FAILED);
  }

  function failed(form, buttons) {
    note(form, 'elementor-message elementor-message-danger', FAILED);
    settle(form, buttons);
    announce(form, 'error');
  }

  function bind(form) {
    if (form.getAttribute('data-wa-ajax') === '1') {
      return;
    }
    form.setAttribute('data-wa-ajax', '1');
    form.addEventListener('submit', function (event) {
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      if (form.classList.contains('elementor-form-waiting')) {
        return;
      }
      var buttons = form.querySelectorAll('[type="submit"]');
      var data = new FormData(form);
      beforeSend(form, buttons);
      window.fetch(ENDPOINT, {
        method: 'POST',
        body: data,
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      }).then(function (response) {
        return response.json();
      }).then(function (res) {
        answered(form, buttons, res);
      }, function () {
        failed(form, buttons);
      });
    });
  }

  function init() {
    each(document.querySelectorAll('form[action="' + ENDPOINT + '"]'), bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`
}

/* ------------------------------------------------------------ the thank you */

/**
 * The page a successful post lands on.
 *
 * Built from /sample-page/, which is WordPress's own default page and so is the
 * one page in this build whose content region is a plain heading and a plain
 * body -- everything else is Elementor containers. Taking the shell from a real
 * page means the header, the footer, the navigation and every stylesheet are
 * the site's own, with nothing hand-drawn to go stale.
 *
 * noindex, and deliberately not added to any sitemap: a thank-you page has
 * nothing to rank for, and one that is indexed collects visitors who never
 * filled anything in.
 */
function thankYouPage(shell) {
  let html = shell

  const headEnd = html.indexOf('</head>')
  let head = html.slice(0, headEnd)
  const rest = html.slice(headEnd)

  head = head.replace(/https:\/\/www\.waterautomation\.com\/sample-page\//g, 'https://www.waterautomation.com/thank-you/')
  head = head.replace(/Sample Page/g, 'Thank you')
  head = head.replace(
    /<meta name='robots' content='[^']*' \/>/,
    `<meta name="robots" content="noindex, follow" />`,
  )
  // Yoast's graph for this page carries /sample-page/'s publication dates and a
  // ReadAction for a page nobody should read from search. It is noise on a page
  // that is not indexed, so it goes rather than being half-corrected.
  head = head.replace(/<script type="application\/ld\+json" class="yoast-schema-graph">[\s\S]*?<\/script>/, '')
  head = head.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    '<meta property="og:description" content="Your message has been sent." />',
  )
  head = head.replace(
    /<meta name="description" content="[^"]*"\s*\/>/,
    '<meta name="description" content="Your message has been sent." />',
  )

  html = head + rest

  const main = /<main id="content"[^>]*>[\s\S]*?<\/main>/
  if (!main.test(html)) throw new Error('thank-you: could not find the <main> region in the shell page')
  html = html.replace(main, `<main id="content" class="site-main">

			<div class="page-header">
			<h1 class="entry-title">Thank you &mdash; your message has been sent</h1>		</div>

	<div class="page-content">

<p class="wp-block-paragraph">We have it, and someone from Water Automation will be in touch using the details you gave us.</p>

<p class="wp-block-paragraph">If it is easier to write to us directly, the address is <a href="mailto:${TO}">${TO}</a>.</p>

<p class="wp-block-paragraph">In the meantime: <a href="/blog/">the blog</a> covers how leaks start and what stops them, <a href="/q-and-a/">the questions page</a> answers the ones we are asked most, and <a href="/buy-now/">the aquaHALT range is here</a>.</p>

		</div>

</main>`)

  return html
}

/* ----------------------------------------------------------------- the write */

if (DRY) {
  console.log(`Would rewrite ${edits.size} page(s):`)
  for (const u of touched.slice(0, 12)) console.log(`   ${u}`)
  if (touched.length > 12) console.log(`   … and ${touched.length - 12} more`)
  console.log()
  console.log(`  ${scriptPages} page(s) to load ${FORMS_JS}?ver=${FORMS_JS_VER}`)
  console.log(`\nWould write _forms/submit.php (${defs.size} form definition(s) baked in)`)
  console.log(`Would write _forms/forms.js (${FORMS_JS_SOURCE.length} bytes, ver ${FORMS_JS_VER})`)
  console.log('Would write thank-you/index.html')
  process.exit(0)
}

for (const [f, html] of edits) await writeFile(f, html, 'utf8')

if (defs.size) {
  await mkdir(join(DIR, '_forms'), { recursive: true })
  await writeFile(join(DIR, '_forms', 'submit.php'), submitPhp(defs), 'utf8')
  await writeFile(join(DIR, '_forms', 'forms.js'), FORMS_JS_SOURCE, 'utf8')
}

const shellPath = join(DIR, 'sample-page', 'index.html')
await mkdir(join(DIR, 'thank-you'), { recursive: true })
await writeFile(join(DIR, 'thank-you', 'index.html'), thankYouPage(await readFile(shellPath, 'utf8')), 'utf8')

console.log(`Rewrote ${edits.size} page(s).`)
console.log(`  ${widgets} widget hook(s) renamed, ${forms} form action(s) set, ${recaptcha} reCAPTCHA loader(s) dropped`)
console.log(`  ${scriptPages} page(s) load ${FORMS_JS}?ver=${FORMS_JS_VER}`)
console.log(`  _forms/submit.php   -> forms.to from the private config, else ${TO}   (needs a PHP host — see the preflight)`)
console.log(`  _forms/forms.js     -> answers in place under the form, as Elementor did`)
console.log(`  thank-you/index.html written (noindex, not in any sitemap)`)
