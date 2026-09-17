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
 *   - generates _forms/submit.php, the handler at the other end;
 *   - generates /thank-you/, the page a successful post lands on.
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

const FORM_ACTION = '/_forms/submit.php'
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

const edits = new Map()
const defs = new Map()          // form_id -> { id, fields, honeypots, button, pages:Set }
const touched = []
let widgets = 0
let forms = 0
let recaptcha = 0
let alreadyWired = 0

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

  if (html !== before) { edits.set(f, html); touched.push(url) }
  else if (before.includes(`action="${FORM_ACTION}"`)) alreadyWired++
}

/* ----------------------------------------------------------------- the checks */

const pagesWithForms = new Set([...defs.values()].flatMap((d) => [...d.pages]))
const report = {
  widgets, forms, files: pagesWithForms.size, definitions: defs.size, recaptcha,
}

let failed = false
if (widgets === 0 && alreadyWired > 0) {
  console.log(`Already wired: ${alreadyWired} page(s) carry action="${FORM_ACTION}". Nothing to change in the markup.`)
} else {
  for (const [k, want] of Object.entries(EXPECT)) {
    const got = report[k]
    const ok = got === want
    if (!ok) failed = true
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${k.padEnd(12)} expected ${String(want).padEnd(4)} found ${got}`)
  }
  console.log()
  if (failed) {
    console.error('Counts moved. Refusing to half-apply — re-read the build before trusting this tool.')
    process.exit(1)
  }
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
 * THIS FILE NEEDS A HOST THAT RUNS PHP AND CAN SEND MAIL. On Netlify,
 * Cloudflare Pages, GitHub Pages or any other pure-static host it is not
 * executed, and every form on the site posts into nothing. See
 * SEO Program/plans/water-automation/switchover-preflight.md.
 *
 * Every enquiry form on the site posts here: tools/forms-wire.mjs sets
 * action="${FORM_ACTION}" on each one and renames the Elementor widget hook
 * that would otherwise have JavaScript intercept the submit and send it to
 * WordPress's admin-ajax.php, which does not exist on a static host.
 */

// Never show a PHP notice to a visitor; the host's error log is where they go.
ini_set('display_errors', '0');
error_reporting(E_ALL);

// UTC, and labelled as UTC in the mail. This business publishes no address and
// no phone number anywhere on its site, so its local time is not something this
// file is in a position to know.
date_default_timezone_set('UTC');

$TO = '${TO}';
$FROM = '${FROM_NAME} <${TO}>';
$THANKS = '${THANKS_URL}';
$CONTACT = '${TO}';

// form_id -> the button's own words, the hidden spam-trap fields, and every
// visible field under the label the page puts above it. Harvested from the
// pages themselves at build time, so it cannot drift from what was shipped.
$FORMS = [
${Object.entries(map).map(([id, def]) => `    ${phpLiteral(id)} => ${phpLiteral(def)},`).join('\n')}
];

// Posted with every form and never worth repeating in the email: Elementor's
// plumbing, and the page stamp, which is reported once at the foot instead.
$MACHINE = ['post_id', 'form_id', 'queried_id', 'referer_title', 'action',
  'g-recaptcha-response', '${PAGE_FIELD}'];

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

/**
 * The failure answer.
 *
 * A page, not a redirect. The whole point of this handler is that an enquiry
 * never disappears without anyone noticing, and the likeliest failure by far is
 * a host whose mail() is not configured -- which would otherwise look to the
 * visitor exactly like success. So say it plainly, give them the address that
 * does work, and leave the back button holding everything they typed.
 */
function wa_fail($code, $headline, $detail) {
    global $CONTACT;
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

/* ------------------------------------------------------------------------ */

if (!isset($_SERVER['REQUEST_METHOD']) || strtoupper($_SERVER['REQUEST_METHOD']) !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    header('Content-Type: text/plain; charset=UTF-8');
    echo "This address accepts form submissions only.\n";
    exit;
}

$page = wa_page();

// A post larger than the host's post_max_size arrives with $_POST emptied and
// no warning of its own. Say so here rather than letting it fall through and
// look like an empty form.
if (empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && (int) $_SERVER['CONTENT_LENGTH'] > 0) {
    wa_fail(413, 'That message was too long to send',
        'The server would not accept a message that size, so it has not reached us.');
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
        wa_redirect($THANKS);
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
        'The message arrived without an email address or a phone number, so there is no way to answer it.');
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    wa_fail(400, 'That email address did not look right',
        'The message has not been sent, because the address on it would bounce.');
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
if (isset($_SERVER['REMOTE_ADDR'])) {
    $body .= str_pad('From IP:', $width + 2) . wa_line($_SERVER['REMOTE_ADDR']) . "\n";
}

$subject = wa_line('Water Automation: ' . $label . ' from ' . $page);

$headers = ['From: ' . $FROM];
if ($email !== '') {
    // So hitting reply answers the person who filled the form in.
    $headers[] = 'Reply-To: ' . wa_line($email);
}
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
// base64 rather than 8bit: it is the only encoding that cannot be tripped up by
// a long line or by a mail server that rewrites one.
$headers[] = 'Content-Transfer-Encoding: base64';
$message = chunk_split(base64_encode($body), 76, "\r\n");

if (!mail($TO, $subject, $message, implode("\r\n", $headers))) {
    wa_fail(500, 'We could not send that message',
        'Something went wrong on our side and your message did not reach us. Nothing you typed has been lost -- go back and it will still be there.');
}

wa_redirect($THANKS);
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
  console.log(`\nWould write _forms/submit.php (${defs.size} form definition(s) baked in)`)
  console.log('Would write thank-you/index.html')
  process.exit(0)
}

for (const [f, html] of edits) await writeFile(f, html, 'utf8')

if (defs.size) {
  await mkdir(join(DIR, '_forms'), { recursive: true })
  await writeFile(join(DIR, '_forms', 'submit.php'), submitPhp(defs), 'utf8')
}

const shellPath = join(DIR, 'sample-page', 'index.html')
await mkdir(join(DIR, 'thank-you'), { recursive: true })
await writeFile(join(DIR, 'thank-you', 'index.html'), thankYouPage(await readFile(shellPath, 'utf8')), 'utf8')

console.log(`Rewrote ${edits.size} page(s).`)
console.log(`  ${widgets} widget hook(s) renamed, ${forms} form action(s) set, ${recaptcha} reCAPTCHA loader(s) dropped`)
console.log(`  _forms/submit.php   -> ${TO}   (needs a PHP host — see the preflight)`)
console.log(`  thank-you/index.html written (noindex, not in any sitemap)`)
