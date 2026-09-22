<?php
/**
 * Shared PHP for the static waterautomation.com: the private config, the JSONL
 * logs, the visitor's address, outbound HTTP, and outgoing email.
 *
 * Hand-written and committed (not generated). The handlers include it with
 *
 *     require_once __DIR__ . '/../_lib/wa.php';
 *
 * and nothing ever requests it: .htaccess answers 404 for every path that
 * starts with "_" apart from the form handler and its script, and the file only
 * defines functions, so even a direct hit would do nothing.
 *
 * Plain PHP 8.x (Hostinger runs 8.3; nothing here needs more than 8.0), no
 * Composer, no namespaces, no extension beyond curl, json and openssl.
 * Everything is prefixed wa_.
 *
 * THE PRIVATE CONFIG
 *   One PHP file returning an array, OUTSIDE the web root and never committed,
 *   because this repo is public and is itself the website:
 *
 *     dirname($_SERVER['DOCUMENT_ROOT']) . '/private/config.php'
 *
 *   i.e. /home/<user>/domains/waterautomation.com/private/config.php, beside
 *   public_html. The environment variable WA_CONFIG overrides the path (the
 *   tests use it). tools/config.example.php documents every key. The same
 *   folder receives the logs written here.
 *
 * NOTHING HERE THROWS OR DIES. A missing config is an empty array, an
 *   unwritable log is a false return, a dead transport is a line in an errors
 *   list. What the visitor sees is the caller's decision, never this file's.
 */

if (!defined('WA_DEFAULT_FROM')) {
    // The address the enquiry form sent From before this library existed. Used
    // only when the config names no mail.from, so a server with no config file
    // at all sends exactly what it sent before.
    define('WA_DEFAULT_FROM', 'support@waterautomation.com');
}

/* ------------------------------------------------------------------ config */

/**
 * The web root. DOCUMENT_ROOT when the server provides one; otherwise the
 * folder above _lib/, which is where this file sits in the deployed site.
 */
function wa_docroot()
{
    $root = (isset($_SERVER['DOCUMENT_ROOT']) && is_string($_SERVER['DOCUMENT_ROOT']))
        ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') : '';
    return $root !== '' ? $root : dirname(__DIR__);
}

/** Where the private config lives: WA_CONFIG if set, else beside the web root. */
function wa_config_path()
{
    $env = getenv('WA_CONFIG');
    if (!is_string($env) || $env === '') {
        // Under PHP-FPM a SetEnv from the web server arrives in $_SERVER rather
        // than the process environment. A request header cannot land here: those
        // are all prefixed HTTP_.
        $env = (isset($_SERVER['WA_CONFIG']) && is_string($_SERVER['WA_CONFIG'])) ? $_SERVER['WA_CONFIG'] : '';
    }
    if ($env !== '') {
        return $env;
    }
    return dirname(wa_docroot()) . '/private/config.php';
}

/**
 * The private config as an array, or [] when there is none.
 *
 * Loaded once per path per request. A file that is missing, unreadable, does
 * not parse or does not return an array all give [] and a line in the PHP
 * error log, never a fatal: a broken config must not take the forms down with
 * it, because mail() still works without one.
 */
function wa_config()
{
    static $cache = [];
    $path = wa_config_path();
    if (array_key_exists($path, $cache)) {
        return $cache[$path];
    }
    $cfg = [];
    if (is_file($path) && is_readable($path)) {
        try {
            $loaded = wa_config_include($path);
            if (is_array($loaded)) {
                $cfg = $loaded;
            } else {
                error_log('wa: the config file did not return an array: ' . $path);
            }
        } catch (Throwable $e) {
            // Class and line only: a parse error's message can quote the token it
            // choked on, and in this file that token may be a secret.
            error_log('wa: the config file could not be loaded (' . get_class($e) . ' at line ' . $e->getLine() . '): ' . $path);
        }
    }
    $cache[$path] = $cfg;
    return $cfg;
}

/** Included from its own scope, so the config file sees none of the caller's variables. */
function wa_config_include($path)
{
    return include $path;
}

/** One config value by dotted path, e.g. wa_cfg('stripe.secret_key'). */
function wa_cfg($dotted, $default = null)
{
    $node = wa_config();
    foreach (explode('.', (string) $dotted) as $key) {
        if (!is_array($node) || !array_key_exists($key, $node)) {
            return $default;
        }
        $node = $node[$key];
    }
    return $node;
}

/* ----------------------------------------------------------- private dir */

/**
 * The folder the config lives in, which is also where the logs go. Created
 * 0700 if it does not exist yet.
 *
 * Refused (null) if it is, or resolves to, anywhere inside the web root: a
 * log of names, emails and phone numbers that the web server would hand to
 * anyone who guessed its filename is worse than no log. Checked twice, before
 * creating anything (so a bad path does not leave a folder in public_html) and
 * after, on the real path (so a symlink cannot smuggle it back in).
 */
function wa_private_dir()
{
    $dir = dirname(wa_config_path());
    if ($dir === '' || $dir[0] !== '/' || preg_match('#(^|/)\.\.?(/|$)#', $dir)) {
        error_log('wa: the private directory must be an absolute path without . or .. segments: ' . $dir);
        return null;
    }
    $planned = wa_path_resolve_nearest($dir);
    if ($planned === null || wa_path_inside_webroot($planned)) {
        error_log('wa: refusing a private directory inside the web root: ' . $dir);
        return null;
    }
    if (!is_dir($dir)) {
        $old = umask(0077);
        $made = @mkdir($dir, 0700, true);
        umask($old);
        if (!$made && !is_dir($dir)) {
            error_log('wa: cannot create the private directory ' . $dir);
            return null;
        }
    }
    $real = realpath($dir);
    if ($real === false || wa_path_inside_webroot($real)) {
        error_log('wa: refusing a private directory inside the web root: ' . $dir);
        return null;
    }
    return $real;
}

/** A path with every existing part resolved (symlinks included) and the rest appended. */
function wa_path_resolve_nearest($path)
{
    $tail = '';
    $p = $path;
    while (!file_exists($p)) {
        $parent = dirname($p);
        if ($parent === $p) {
            return null;
        }
        $tail = '/' . basename($p) . $tail;
        $p = $parent;
    }
    $real = realpath($p);
    return ($real === false) ? null : rtrim($real, '/') . $tail;
}

/** True if $path is the web root or anything under it, by DOCUMENT_ROOT or by where this file sits. */
function wa_path_inside_webroot($path)
{
    foreach ([wa_docroot(), dirname(__DIR__)] as $root) {
        $r = realpath($root);
        if ($r === false) {
            continue;
        }
        $r = rtrim($r, '/');
        if ($path === $r || strpos($path . '/', $r . '/') === 0) {
            return true;
        }
    }
    return false;
}

/* -------------------------------------------------------------------- logs */

/**
 * Append one record as a JSON line to private/<stream>-YYYY-MM.jsonl (UTC
 * month). Adds 'ts' (UTC, ISO 8601) unless the record has one.
 *
 * Exclusive flock around the write, so two submissions landing together can
 * never interleave half-lines; the file is 0600 from the moment it exists. A
 * write that fails part-way is truncated back off, so one bad append cannot
 * corrupt the line after it. Returns true only when the whole line is on disk.
 * Never throws: a log failure must not stop an email going out.
 */
function wa_log_append($stream, array $record)
{
    try {
        if (!is_string($stream) || !preg_match('/^[a-z0-9][a-z0-9_-]{0,63}$/', $stream)) {
            error_log('wa: refusing a log stream name that is not [a-z0-9_-]');
            return false;
        }
        $dir = wa_private_dir();
        if ($dir === null) {
            return false;
        }
        if (!array_key_exists('ts', $record)) {
            $record = ['ts' => gmdate('Y-m-d\TH:i:s\Z')] + $record;
        }
        // Invalid UTF-8 is substituted and anything unencodable becomes null,
        // so a record is never lost to one bad byte.
        $line = json_encode($record, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
        if (!is_string($line)) {
            error_log('wa: could not encode a ' . $stream . ' record');
            return false;
        }
        $data = $line . "\n";
        $file = $dir . '/' . $stream . '-' . gmdate('Y-m') . '.jsonl';

        $old = umask(0077);
        $fh = @fopen($file, 'ab');
        umask($old);
        if ($fh === false) {
            error_log('wa: cannot open ' . $file);
            return false;
        }
        $ok = false;
        if (flock($fh, LOCK_EX)) {
            clearstatcache(true, $file);
            $stat = fstat($fh);
            $before = is_array($stat) ? $stat['size'] : null;
            $written = 0;
            $len = strlen($data);
            while ($written < $len) {
                $n = fwrite($fh, substr($data, $written));
                if ($n === false || $n === 0) {
                    break;
                }
                $written += $n;
            }
            $ok = ($written === $len) && fflush($fh);
            if (!$ok && $before !== null) {
                @ftruncate($fh, $before);
            }
            flock($fh, LOCK_UN);
        }
        fclose($fh);
        $perms = @fileperms($file);
        if ($perms !== false && ($perms & 0777) !== 0600) {
            @chmod($file, 0600);
        }
        if (!$ok) {
            error_log('wa: the write to ' . $file . ' failed');
        }
        return $ok;
    } catch (Throwable $e) {
        error_log('wa: log append failed (' . get_class($e) . ')');
        return false;
    }
}

/* --------------------------------------------------------------- client IP */

/**
 * Cloudflare's published edge ranges, https://www.cloudflare.com/ips-v4 and
 * /ips-v6, as fetched on 22 September 2026. They change rarely; when they do,
 * a stale list only means an address from a new range is logged as the
 * Cloudflare edge instead of the visitor, never that a forged header is
 * believed.
 */
function wa_net_cloudflare_ranges()
{
    return [
        '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
        '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
        '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
        '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
        '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
        '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
    ];
}

/** An address in packed form, with an IPv4-mapped IPv6 address unwrapped to IPv4. */
function wa_net_pack($ip)
{
    $bin = @inet_pton((string) $ip);
    if ($bin === false) {
        return false;
    }
    if (strlen($bin) === 16 && substr($bin, 0, 12) === str_repeat("\0", 10) . "\xff\xff") {
        return substr($bin, 12);
    }
    return $bin;
}

function wa_net_ip_in_cidr($ip, $cidr)
{
    $parts = explode('/', $cidr, 2);
    if (count($parts) !== 2) {
        return false;
    }
    $ipBin = wa_net_pack($ip);
    $netBin = @inet_pton($parts[0]);
    if ($ipBin === false || $netBin === false || strlen($ipBin) !== strlen($netBin)) {
        return false;
    }
    $bits = (int) $parts[1];
    if ($bits < 0 || $bits > strlen($netBin) * 8) {
        return false;
    }
    $whole = intdiv($bits, 8);
    $rest = $bits % 8;
    if (substr($ipBin, 0, $whole) !== substr($netBin, 0, $whole)) {
        return false;
    }
    if ($rest === 0) {
        return true;
    }
    $mask = (0xFF << (8 - $rest)) & 0xFF;
    return (ord($ipBin[$whole]) & $mask) === (ord($netBin[$whole]) & $mask);
}

/**
 * The visitor's address.
 *
 * www is proxied by Cloudflare, so there REMOTE_ADDR is a Cloudflare edge and
 * the visitor is in CF-Connecting-IP. The apex is not proxied, and anyone can
 * send a CF-Connecting-IP header to it, so the header is believed only when
 * the connection itself came from one of Cloudflare's published ranges.
 * Otherwise, and whenever the header is not an IP address, REMOTE_ADDR.
 * '' if even that is missing or malformed.
 */
function wa_client_ip()
{
    $remote = isset($_SERVER['REMOTE_ADDR']) ? trim((string) $_SERVER['REMOTE_ADDR']) : '';
    if ($remote === '' || @inet_pton($remote) === false) {
        return '';
    }
    $cf = isset($_SERVER['HTTP_CF_CONNECTING_IP']) ? trim((string) $_SERVER['HTTP_CF_CONNECTING_IP']) : '';
    if ($cf !== '' && @inet_pton($cf) !== false) {
        foreach (wa_net_cloudflare_ranges() as $range) {
            if (wa_net_ip_in_cidr($remote, $range)) {
                return $cf;
            }
        }
    }
    return $remote;
}

/* -------------------------------------------------------------------- HTTP */

function wa_net_is_loopback($host)
{
    $host = strtolower(trim((string) $host, '[]'));
    if ($host === 'localhost' || $host === '::1') {
        return true;
    }
    return (bool) preg_match('/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/', $host);
}

/**
 * One HTTP request with curl. Returns ['status' => int, 'body' => string,
 * 'error' => string]; status 0 means no response at all.
 *
 * TLS is verified (peer and host name). Redirects are not followed, so a
 * credential sent to one host can never be replayed to another. Plain http is
 * refused except to this machine, which is how the tests point it at local
 * mocks without an API key ever crossing a network in the clear.
 * $headers is either ['Name' => 'value'] or ['Name: value'].
 */
function wa_http($method, $url, array $headers, $body, $timeout = 15)
{
    $out = ['status' => 0, 'body' => '', 'error' => ''];
    try {
        $parts = parse_url((string) $url);
        $scheme = (is_array($parts) && isset($parts['scheme'])) ? strtolower($parts['scheme']) : '';
        $host = (is_array($parts) && isset($parts['host'])) ? $parts['host'] : '';
        if ($host === '' || !($scheme === 'https' || ($scheme === 'http' && wa_net_is_loopback($host)))) {
            $out['error'] = 'refused: only https URLs (or http to this machine) are allowed';
            return $out;
        }
        if (!function_exists('curl_init')) {
            $out['error'] = 'the curl extension is not available';
            return $out;
        }
        $lines = [];
        $hasExpect = false;
        foreach ($headers as $k => $v) {
            $line = is_string($k) ? $k . ': ' . $v : (string) $v;
            $line = str_replace(["\r", "\n"], '', $line);
            if (stripos($line, 'expect:') === 0) {
                $hasExpect = true;
            }
            $lines[] = $line;
        }
        if (!$hasExpect) {
            // curl otherwise sends "Expect: 100-continue" on bodies over 1 KB and
            // waits up to a second for an answer many servers never give.
            $lines[] = 'Expect:';
        }
        $method = strtoupper((string) $method);
        $timeout = max(1, (int) $timeout);
        $ch = curl_init();
        $opts = [
            CURLOPT_URL => (string) $url,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $lines,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => false,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => min(10, $timeout),
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_NOSIGNAL => true,
        ];
        if ($method === 'HEAD') {
            $opts[CURLOPT_NOBODY] = true;
        }
        if ($body !== null) {
            $opts[CURLOPT_POSTFIELDS] = (string) $body;
        }
        curl_setopt_array($ch, $opts);
        $resp = curl_exec($ch);
        $out['status'] = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        if ($resp === false) {
            $out['error'] = 'curl ' . curl_errno($ch) . ': ' . curl_error($ch);
        } else {
            $out['body'] = is_string($resp) ? $resp : '';
        }
        unset($ch); // curl_close() has done nothing since PHP 8.0 and is deprecated in 8.5
    } catch (Throwable $e) {
        $out['error'] = get_class($e) . ': ' . $e->getMessage();
    }
    return $out;
}

/** A short, secret-free description of a failed HTTP answer, for the errors list and the log. */
function wa_http_problem($label, array $r)
{
    $detail = ($r['error'] !== '') ? $r['error'] : substr(trim(preg_replace('/\s+/', ' ', (string) $r['body'])), 0, 300);
    return $label . ': HTTP ' . $r['status'] . ($detail !== '' ? ' ' . $detail : '');
}

/* ------------------------------------------------------------------- email */

/**
 * Send one email, trying each transport in mail.transports until one takes it.
 *
 * $m = [
 *   'to'        => 'a@x' or ['a@x', 'b@y'],
 *   'subject'   => string,
 *   'text'      => string,            plain-text body (always sent)
 *   'html'      => ?string,           optional; sent as multipart/alternative with 'text'
 *   'reply_to'  => ?string,           one address; dropped if it is not one
 *   'from_name' => ?string,           display name; default mail.from_name
 *   'from'      => ?string,           overrides mail.from, but only with an address
 *                                     on the same domain (anything else would fail
 *                                     DMARC, or be refused by the provider)
 *   'id'        => ?string,           optional reference, used as the idempotency key
 * ]
 *
 * Returns ['ok' => bool, 'transport' => name|null, 'errors' => string[],
 * 'skipped' => string[]]. errors lists every transport that was tried and
 * failed (so a success after a fallback still says what fell over); skipped
 * names the transports that were not configured.
 *
 * The default order is resend, graph, smtp, mail. A transport with no config is
 * skipped rather than failed; mail() needs none, so with no config file at all
 * the result is exactly the PHP mail() call the site made before.
 */
function wa_deliver(array $m)
{
    $errors = [];
    $skipped = [];
    $msg = wa_mail_normalise($m, $errors);
    if ($msg === null) {
        return ['ok' => false, 'transport' => null, 'errors' => $errors, 'skipped' => $skipped];
    }
    $map = [
        'resend' => 'wa_mail_send_resend',
        'graph' => 'wa_mail_send_graph',
        'smtp' => 'wa_mail_send_smtp',
        'mail' => 'wa_mail_send_phpmail',
    ];
    $order = wa_cfg('mail.transports', ['resend', 'graph', 'smtp', 'mail']);
    if (!is_array($order) || !$order) {
        $order = ['resend', 'graph', 'smtp', 'mail'];
    }
    foreach ($order as $name) {
        if (!is_string($name) || !isset($map[$name])) {
            $errors[] = 'unknown transport in mail.transports: ' . (is_string($name) ? $name : gettype($name));
            continue;
        }
        $problem = '';
        try {
            $result = call_user_func_array($map[$name], [$msg, &$problem]);
        } catch (Throwable $e) {
            $result = false;
            $problem = $name . ': ' . get_class($e) . ' ' . $e->getMessage();
        }
        if ($result === true) {
            return ['ok' => true, 'transport' => $name, 'errors' => $errors, 'skipped' => $skipped];
        }
        if ($result === null) {
            $skipped[] = $name;
            continue;
        }
        $errors[] = ($problem !== '') ? $problem : $name . ': failed';
        error_log('wa-mail: ' . $msg['id'] . ' ' . end($errors));
    }
    if (!$errors) {
        $errors[] = 'no transport is configured';
    }
    error_log('wa-mail: ' . $msg['id'] . ' every transport failed');
    return ['ok' => false, 'transport' => null, 'errors' => $errors, 'skipped' => $skipped];
}

/** One bare address, or null. CR, LF and angle brackets never get as far as a header. */
function wa_mail_addr($value)
{
    if (!is_string($value)) {
        return null;
    }
    $value = trim(str_replace(["\r", "\n", "\0"], '', $value));
    if (preg_match('/<([^<>]+)>\s*$/', $value, $mm)) {
        $value = trim($mm[1]);
    }
    return (filter_var($value, FILTER_VALIDATE_EMAIL) !== false) ? $value : null;
}

function wa_mail_domain($addr)
{
    $at = strrpos((string) $addr, '@');
    return ($at === false) ? '' : strtolower(substr($addr, $at + 1));
}

/** Everything a transport needs, checked once. Null when there is no one to send to. */
function wa_mail_normalise(array $m, array &$errors)
{
    $from = wa_mail_addr(wa_cfg('mail.from', WA_DEFAULT_FROM));
    if ($from === null) {
        $errors[] = 'mail.from is not an email address; using ' . WA_DEFAULT_FROM;
        $from = WA_DEFAULT_FROM;
    }
    $domain = wa_cfg('mail.domain');
    $domain = (is_string($domain) && $domain !== '') ? strtolower($domain) : wa_mail_domain($from);
    if (isset($m['from']) && is_string($m['from']) && trim($m['from']) !== '') {
        $asked = wa_mail_addr($m['from']);
        if ($asked !== null && wa_mail_domain($asked) === $domain) {
            $from = $asked;
        } else {
            $errors[] = 'from override refused: not an address on ' . $domain;
        }
    }

    $name = (isset($m['from_name']) && is_string($m['from_name'])) ? $m['from_name'] : wa_cfg('mail.from_name', 'Water Automation');
    $name = trim(preg_replace('/\s+/', ' ', str_replace(["\r", "\n", "\0", '"', '<', '>', '\\'], ' ', (string) $name)));
    $name = wa_mail_cut($name, 100);

    $to = [];
    $seen = [];
    foreach ((array) (isset($m['to']) ? $m['to'] : []) as $candidate) {
        $addr = wa_mail_addr($candidate);
        if ($addr === null) {
            $errors[] = 'dropped a recipient that is not an email address';
            continue;
        }
        if (!isset($seen[strtolower($addr)])) {
            $seen[strtolower($addr)] = true;
            $to[] = $addr;
        }
    }
    if (!$to) {
        $errors[] = 'no valid recipient';
        return null;
    }
    if (count($to) > 50) {
        $errors[] = 'more than 50 recipients; sending to the first 50';
        $to = array_slice($to, 0, 50);
    }

    $replyTo = '';
    if (isset($m['reply_to']) && is_string($m['reply_to']) && trim($m['reply_to']) !== '') {
        $r = wa_mail_addr($m['reply_to']);
        if ($r === null) {
            $errors[] = 'dropped a reply-to that is not an email address';
        } else {
            $replyTo = $r;
        }
    }

    $subject = isset($m['subject']) && is_string($m['subject']) ? $m['subject'] : '';
    $subject = wa_mail_cut(trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', $subject)), 250);
    if ($subject === '') {
        $subject = '(no subject)';
    }

    $html = (isset($m['html']) && is_string($m['html']) && $m['html'] !== '') ? $m['html'] : null;
    $text = isset($m['text']) && is_string($m['text']) ? str_replace(["\r\n", "\r"], "\n", $m['text']) : '';
    if ($text === '' && $html !== null) {
        $text = trim(html_entity_decode(strip_tags(preg_replace('#<br\s*/?>|</p>#i', "\n", $html)), ENT_QUOTES, 'UTF-8'));
    }

    $id = (isset($m['id']) && is_string($m['id']) && preg_match('/^[A-Za-z0-9._-]{1,100}$/', $m['id']))
        ? $m['id'] : gmdate('Ymd\THis\Z') . '-' . bin2hex(random_bytes(5));

    return [
        'to' => $to, 'from' => $from, 'from_name' => $name, 'domain' => $domain,
        'reply_to' => $replyTo, 'subject' => $subject, 'text' => $text, 'html' => $html, 'id' => $id,
    ];
}

/** Cut to a length in characters without splitting a UTF-8 sequence. */
function wa_mail_cut($value, $max)
{
    if (strlen($value) <= $max) {
        return $value;
    }
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max, 'UTF-8');
    }
    return preg_replace('/[\x80-\xBF]*$/', '', substr($value, 0, $max));
}

/**
 * A header value, RFC 2047-encoded when it is not plain ASCII. Split into
 * several encoded words joined by spaces rather than folded onto new lines,
 * because PHP's mail() refuses a Subject containing a line break.
 */
function wa_mail_header_encode($value)
{
    if (!preg_match('/[^\x20-\x7E]/', $value)) {
        return $value;
    }
    $words = [];
    $chunk = '';
    foreach (preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY) ?: str_split($value) as $ch) {
        if (strlen($chunk . $ch) > 45) {
            $words[] = '=?UTF-8?B?' . base64_encode($chunk) . '?=';
            $chunk = '';
        }
        $chunk .= $ch;
    }
    if ($chunk !== '') {
        $words[] = '=?UTF-8?B?' . base64_encode($chunk) . '?=';
    }
    return implode(' ', $words);
}

/** "Name <addr>" for a header. $encode: RFC 2047 for MIME, raw UTF-8 for a JSON API. */
function wa_mail_mailbox($name, $addr, $encode)
{
    if ($name === '') {
        return $addr;
    }
    if (preg_match('/[^\x20-\x7E]/', $name)) {
        return ($encode ? wa_mail_header_encode($name) : $name) . ' <' . $addr . '>';
    }
    if (preg_match('/[()<>\[\]:;@\\\\,."]/', $name)) {
        return '"' . $name . '" <' . $addr . '>';
    }
    return $name . ' <' . $addr . '>';
}

/** The MIME headers and body: text/plain, or multipart/alternative when there is HTML. */
function wa_mail_mime(array $m)
{
    $text = chunk_split(base64_encode(str_replace("\n", "\r\n", $m['text'])), 76, "\r\n");
    if ($m['html'] === null) {
        return [
            'headers' => ['MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64'],
            'body' => $text,
        ];
    }
    $b = 'wa-' . bin2hex(random_bytes(12));
    $body = "This is a multi-part message in MIME format.\r\n\r\n"
        . '--' . $b . "\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . $text
        . '--' . $b . "\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($m['html']), 76, "\r\n")
        . '--' . $b . "--\r\n";
    return [
        'headers' => ['MIME-Version: 1.0', 'Content-Type: multipart/alternative; boundary="' . $b . '"'],
        'body' => $body,
    ];
}

/* ------------------------------------------ transport: Resend (HTTP API) */

/**
 * https://resend.com/docs/api-reference/emails/send-email
 * POST {api_base}/emails, Bearer key, JSON body; 200 {"id": ...} on success.
 * The message id doubles as the Idempotency-Key, so a retried request can
 * never become a second email.
 */
function wa_mail_send_resend(array $m, &$problem)
{
    $key = wa_cfg('mail.resend.api_key');
    if (!is_string($key) || $key === '') {
        $problem = 'resend: not configured';
        return null;
    }
    $base = rtrim((string) wa_cfg('mail.resend.api_base', 'https://api.resend.com'), '/');
    $payload = [
        'from' => wa_mail_mailbox($m['from_name'], $m['from'], false),
        'to' => $m['to'],
        'subject' => $m['subject'],
        'text' => $m['text'],
        'headers' => ['X-WA-Id' => $m['id']],
    ];
    if ($m['html'] !== null) {
        $payload['html'] = $m['html'];
    }
    if ($m['reply_to'] !== '') {
        $payload['reply_to'] = $m['reply_to'];
    }
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    $r = wa_http('POST', $base . '/emails', [
        'Authorization' => 'Bearer ' . $key,
        'Content-Type' => 'application/json',
        'Idempotency-Key' => $m['id'],
        'User-Agent' => 'waterautomation.com-site/1',
    ], $json, 15);
    if ($r['status'] >= 200 && $r['status'] < 300) {
        return true;
    }
    $problem = wa_http_problem('resend', $r);
    return false;
}

/* ------------------------------------------- transport: Microsoft Graph */

/**
 * App-only token (client credentials), cached in the private dir until two
 * minutes before it expires. Any cache problem just means a fresh token.
 */
function wa_mail_graph_token(array $g, &$problem)
{
    $cache = null;
    $dir = wa_private_dir();
    if ($dir !== null) {
        $cache = $dir . '/graph-token.json';
        $raw = @file_get_contents($cache);
        if (is_string($raw)) {
            $c = json_decode($raw, true);
            if (is_array($c) && isset($c['token'], $c['exp'], $c['client'])
                && $c['client'] === $g['client_id'] && (int) $c['exp'] > time() + 120) {
                return $c['token'];
            }
        }
    }
    $base = isset($g['token_base']) ? rtrim($g['token_base'], '/') : 'https://login.microsoftonline.com';
    $r = wa_http('POST', $base . '/' . rawurlencode($g['tenant_id']) . '/oauth2/v2.0/token',
        ['Content-Type' => 'application/x-www-form-urlencoded'],
        http_build_query([
            'client_id' => $g['client_id'],
            'client_secret' => $g['client_secret'],
            'scope' => 'https://graph.microsoft.com/.default',
            'grant_type' => 'client_credentials',
        ], '', '&'),
        10);
    $j = json_decode($r['body'], true);
    if ($r['status'] !== 200 || !is_array($j) || empty($j['access_token'])) {
        // Entra's error bodies name the problem (AADSTS7000215 bad secret,
        // AADSTS7000222 expired secret) and never echo the secret itself.
        $problem = wa_http_problem('graph token', $r);
        return null;
    }
    if ($cache !== null) {
        $exp = time() + (isset($j['expires_in']) ? (int) $j['expires_in'] : 3000);
        $tmp = $cache . '.' . bin2hex(random_bytes(4));
        $old = umask(0077);
        if (@file_put_contents($tmp, json_encode(['token' => $j['access_token'], 'exp' => $exp, 'client' => $g['client_id']])) !== false) {
            @rename($tmp, $cache);
        }
        umask($old);
    }
    return $j['access_token'];
}

/** POST /v1.0/users/{sender}/sendMail; 202 on success. Sends as the sender mailbox. */
function wa_mail_send_graph(array $m, &$problem)
{
    $g = wa_cfg('mail.graph');
    if (!is_array($g) || empty($g['tenant_id']) || empty($g['client_id']) || empty($g['client_secret']) || empty($g['sender'])) {
        $problem = 'graph: not configured';
        return null;
    }
    $token = wa_mail_graph_token($g, $problem);
    if ($token === null) {
        return false;
    }
    $to = [];
    foreach ($m['to'] as $addr) {
        $to[] = ['emailAddress' => ['address' => $addr]];
    }
    $message = [
        'subject' => $m['subject'],
        'body' => ($m['html'] !== null)
            ? ['contentType' => 'HTML', 'content' => $m['html']]
            : ['contentType' => 'Text', 'content' => $m['text']],
        'toRecipients' => $to,
        'internetMessageHeaders' => [['name' => 'X-WA-Id', 'value' => $m['id']]],
    ];
    if ($m['reply_to'] !== '') {
        $message['replyTo'] = [['emailAddress' => ['address' => $m['reply_to']]]];
    }
    $base = isset($g['api_base']) ? rtrim($g['api_base'], '/') : 'https://graph.microsoft.com';
    $r = wa_http('POST', $base . '/v1.0/users/' . rawurlencode($g['sender']) . '/sendMail',
        ['Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json'],
        json_encode(['message' => $message, 'saveToSentItems' => !empty($g['save_to_sent'])],
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
        15);
    if ($r['status'] === 202) {
        return true;
    }
    if ($r['status'] === 401) {
        $dir = wa_private_dir();
        if ($dir !== null) {
            @unlink($dir . '/graph-token.json'); // stale or revoked; the next send fetches a new one
        }
    }
    $problem = wa_http_problem('graph sendMail', $r);
    return false;
}

/* ----------------------------------- transport: authenticated SMTP (no library) */

/** One SMTP reply, multi-line aware: [code, text]. */
function wa_mail_smtp_read($fp)
{
    $data = '';
    while (($line = fgets($fp, 2048)) !== false) {
        $data .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') {
            break;
        }
    }
    return [(int) substr($data, 0, 3), trim($data)];
}

function wa_mail_smtp_step($fp, $command, array $expect, $label)
{
    if ($command !== null) {
        fwrite($fp, $command . "\r\n");
    }
    list($code, $text) = wa_mail_smtp_read($fp);
    if (!in_array($code, $expect, true)) {
        throw new RuntimeException('smtp ' . $label . ': ' . ($text !== '' ? substr($text, 0, 200) : 'no answer'));
    }
    return $text;
}

/**
 * SMTP submission with AUTH LOGIN over implicit TLS ('ssl', port 465) or
 * STARTTLS ('starttls', port 587). 'plain' exists so the tests can talk to a
 * local fake server, and is refused for any host but this machine.
 */
function wa_mail_send_smtp(array $m, &$problem)
{
    $s = wa_cfg('mail.smtp');
    if (!is_array($s) || empty($s['host']) || empty($s['username']) || !isset($s['password'])) {
        $problem = 'smtp: not configured';
        return null;
    }
    $mode = isset($s['mode']) ? $s['mode'] : 'ssl';
    $port = isset($s['port']) ? (int) $s['port'] : ($mode === 'ssl' ? 465 : 587);
    if ($mode === 'plain' && !wa_net_is_loopback($s['host'])) {
        $problem = 'smtp: plain mode is for local testing only';
        return false;
    }
    if (!in_array($mode, ['ssl', 'starttls', 'plain'], true)) {
        $problem = 'smtp: mode must be ssl, starttls or plain';
        return false;
    }
    $ctx = stream_context_create(['ssl' => [
        'verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $s['host'],
    ]]);
    $scheme = ($mode === 'ssl') ? 'ssl://' : 'tcp://';
    $errno = 0;
    $errstr = '';
    $fp = @stream_socket_client($scheme . $s['host'] . ':' . $port, $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);
    if ($fp === false) {
        $problem = 'smtp connect: ' . $errno . ' ' . $errstr;
        return false;
    }
    stream_set_timeout($fp, 15);
    $helo = isset($s['helo']) ? $s['helo'] : $m['domain'];
    $envelope = (isset($s['envelope']) && wa_mail_addr($s['envelope']) !== null) ? wa_mail_addr($s['envelope']) : $m['from'];
    try {
        wa_mail_smtp_step($fp, null, [220], 'banner');
        wa_mail_smtp_step($fp, 'EHLO ' . $helo, [250], 'EHLO');
        if ($mode === 'starttls') {
            wa_mail_smtp_step($fp, 'STARTTLS', [220], 'STARTTLS');
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) {
                throw new RuntimeException('smtp: TLS negotiation failed');
            }
            wa_mail_smtp_step($fp, 'EHLO ' . $helo, [250], 'EHLO after STARTTLS');
        }
        wa_mail_smtp_step($fp, 'AUTH LOGIN', [334], 'AUTH');
        wa_mail_smtp_step($fp, base64_encode((string) $s['username']), [334], 'AUTH user');
        wa_mail_smtp_step($fp, base64_encode((string) $s['password']), [235], 'AUTH password');
        wa_mail_smtp_step($fp, 'MAIL FROM:<' . $envelope . '>', [250], 'MAIL FROM');
        foreach ($m['to'] as $addr) {
            wa_mail_smtp_step($fp, 'RCPT TO:<' . $addr . '>', [250, 251], 'RCPT TO');
        }
        wa_mail_smtp_step($fp, 'DATA', [354], 'DATA');
        $mime = wa_mail_mime($m);
        $head = array_merge([
            'Date: ' . date('r'),
            'From: ' . wa_mail_mailbox($m['from_name'], $m['from'], true),
            'To: ' . implode(', ', $m['to']),
            'Subject: ' . wa_mail_header_encode($m['subject']),
            'Message-ID: <' . $m['id'] . '@' . $m['domain'] . '>',
            'X-WA-Id: ' . $m['id'],
        ], $m['reply_to'] !== '' ? ['Reply-To: ' . $m['reply_to']] : [], $mime['headers']);
        $data = implode("\r\n", $head) . "\r\n\r\n" . $mime['body'];
        $data = preg_replace('/^\./m', '..', $data);
        fwrite($fp, $data . "\r\n.\r\n");
        wa_mail_smtp_step($fp, null, [250], 'end of DATA');
        @fwrite($fp, "QUIT\r\n");
        @fclose($fp);
        return true;
    } catch (RuntimeException $e) {
        @fwrite($fp, "QUIT\r\n");
        @fclose($fp);
        $problem = $e->getMessage();
        return false;
    }
}

/* ------------------------------------------- transport: PHP mail() (last) */

/**
 * The site's original path, kept as the last resort. true here only means
 * the server's own MTA accepted the message: from Hostinger that mail is not
 * DKIM-signed for waterautomation.com and its SPF says -all, so Microsoft 365
 * may quarantine it. That is why it runs last, and why the submission is
 * already in the log before any transport is tried.
 * mail.envelope sets sendmail's -f; leave it unset unless SPF allows the host.
 */
function wa_mail_send_phpmail(array $m, &$problem)
{
    if (!function_exists('mail')) {
        $problem = 'mail: the mail() function is disabled on this server';
        return false;
    }
    $mime = wa_mail_mime($m);
    $headers = array_merge([
        'From: ' . wa_mail_mailbox($m['from_name'], $m['from'], true),
        'X-WA-Id: ' . $m['id'],
    ], $m['reply_to'] !== '' ? ['Reply-To: ' . $m['reply_to']] : [], $mime['headers']);
    $envelope = wa_mail_addr(wa_cfg('mail.envelope'));
    $ok = @mail(implode(', ', $m['to']), wa_mail_header_encode($m['subject']), $mime['body'],
        implode("\r\n", $headers), $envelope !== null ? '-f' . $envelope : '');
    if (!$ok) {
        $problem = 'mail: mail() returned false';
    }
    return (bool) $ok;
}
