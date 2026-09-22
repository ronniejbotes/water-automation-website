<?php
/**
 * EXAMPLE of the private config for the static waterautomation.com.
 *
 * Copy it to the server as
 *
 *     /home/<user>/domains/waterautomation.com/private/config.php
 *
 * i.e. a folder named "private" NEXT TO public_html, never inside it. That is
 * dirname($_SERVER['DOCUMENT_ROOT']) . '/private/config.php', the one path
 * _lib/wa.php reads (the WA_CONFIG environment variable overrides it, for
 * tests). Permissions 0600. The same folder receives the logs (see "logs" at
 * the bottom). hPanel's File Manager can create both the folder and the file.
 *
 * Not sure where that is on the host? Submit any form once before creating
 * this file: the handler creates the "private" folder, with a submissions log
 * in it, at exactly the place it will read this file from.
 *
 * NEVER COMMIT THE REAL FILE. This repository is public, and it is also the
 * website: anything committed is published.
 *
 * Every key is optional. With no file at all the forms still work exactly as
 * before this config existed: PHP mail() from support@waterautomation.com to
 * support@waterautomation.com, which is the path that fails DMARC and lands in
 * quarantine. The mail section below is what fixes that.
 *
 * This file lives in tools/, which .htaccess never serves.
 */
return [

    /* =====================================================================
     * mail -- how every email the site sends leaves the server
     * (enquiry notifications now; order emails from the shop use it too).
     * Read by wa_deliver() in _lib/wa.php.
     * ===================================================================== */
    'mail' => [

        // Transports, tried in this order until one accepts the message. A
        // transport with no settings below is skipped, not counted as a
        // failure. 'mail' (PHP mail()) needs no settings and stays last as the
        // final fallback: from Hostinger it is unsigned for this domain, so
        // Microsoft 365 may quarantine it, but it is better than nothing.
        'transports' => ['resend', 'graph', 'smtp', 'mail'],

        // The From address on everything the site sends. It must be on the
        // domain Resend has verified (waterautomation.com), or Resend refuses
        // the message. A dedicated address that nobody replies to is best:
        // replies to enquiries go to the visitor anyway (Reply-To).
        // Default when unset: support@waterautomation.com (the old From).
        'from' => 'website@waterautomation.com',

        // Display name used when the sender does not give one. The enquiry
        // forms always give "Water Automation website".
        'from_name' => 'Water Automation',

        // Optional. The domain a per-message From override must be on;
        // defaults to the domain of 'from'.
        // 'domain' => 'waterautomation.com',

        // ---- Resend (primary). https://resend.com/docs/api-reference/emails/send-email
        // Needs the domain verified in Resend first: the DNS records Resend
        // lists for waterautomation.com (a DKIM TXT at resend._domainkey and
        // the MX + SPF TXT on the send. subdomain) added in Cloudflare, DNS
        // only (grey cloud). They do not touch the Microsoft 365 records.
        // Use a key with "Sending access" only, restricted to this domain.
        'resend' => [
            'api_key' => 're_REPLACE_ME',
            // For tests only: point at a local mock. Leave out in production.
            // 'api_base' => 'http://127.0.0.1:18091',
        ],

        // ---- Microsoft Graph (optional second transport), app-only.
        // An Entra app registration with the Mail.Send application permission,
        // limited by an Exchange RBAC scope to the one sender mailbox. Sends
        // as that mailbox, so the mail is Microsoft 365's own and passes
        // DMARC. The client secret expires; note the date.
        // 'graph' => [
        //     'tenant_id' => '8bf669b1-2391-49dc-9fcb-734020842c53', // waterautomation.com's tenant
        //     'client_id' => '00000000-0000-0000-0000-000000000000',
        //     'client_secret' => 'REPLACE_ME',          // the secret's VALUE, not its id
        //     'sender' => 'website@waterautomation.com', // a mailbox inside the RBAC scope
        //     'save_to_sent' => false,
        //     // Tests only: 'token_base' => 'http://127.0.0.1:18092', 'api_base' => 'http://127.0.0.1:18092',
        // ],

        // ---- SMTP submission (optional). AUTH LOGIN over 'ssl' (465) or
        // 'starttls' (587). Only worth configuring for a server whose mail
        // passes DMARC for the From address (for example Microsoft's High
        // Volume Email). Not smtp.office365.com with a user's password: Basic
        // SMTP AUTH is being switched off for Microsoft 365 tenants.
        // 'smtp' => [
        //     'host' => 'smtp-hve.office365.com',
        //     'port' => 587,
        //     'mode' => 'starttls',
        //     'username' => 'forms-hve@waterautomation.com',
        //     'password' => 'REPLACE_ME',
        //     // 'envelope' => 'bounces@waterautomation.com', // MAIL FROM; default: 'from'
        // ],

        // ---- PHP mail() (last resort). Only sets sendmail's -f. Leave unset
        // unless SPF for waterautomation.com authorises Hostinger's servers.
        // 'envelope' => null,
    ],

    /* =====================================================================
     * forms -- the enquiry forms (_forms/submit.php)
     * ===================================================================== */
    'forms' => [

        // Who receives enquiries. One address or a list.
        // Default when unset: support@waterautomation.com, which /contact-us/
        // gives as the address "for general inquiries".
        'to' => 'support@waterautomation.com',

        // Optional: a different recipient per form, keyed by the form's
        // form_id (npm run forms lists them, with the pages each is on). A
        // form not listed here goes to 'to'. The WordPress site configured
        // each Elementor form's email action separately; if those sent some
        // forms elsewhere (partner applications to sales@, say), repeat that
        // here.
        //   f070572  /partner/                    "Become a Partner"
        //   d0d16b3  /partner/become-a-partner/   "Request a call"
        //   66e5502  /expo-signup/                "Submit"
        //   6f38a5b5 /blog/ and its pages   53ba0a2 / and the landers and city pages
        //   b7b7273  /book-a-call/, /book-a-call-tradeshow/   d53150b /about-us/
        //   a69a1db  /case-studies/   4016f62, c847ee0 /contact-us/
        'to_by_form' => [
            // 'f070572' => ['sales@waterautomation.com'],
        ],
    ],

    /* =====================================================================
     * stripe, shop -- added by the shop build. Kept as separate top-level
     * sections so the two can be merged without touching each other.
     * ===================================================================== */

];

/*
 * LOGS (written by _lib/wa.php into the same private folder, 0600, one JSON
 * object per line, UTC months):
 *
 *   submissions-YYYY-MM.jsonl  every enquiry that passed validation, written
 *                              BEFORE any email is attempted ("type":
 *                              "submission", with every field, the email
 *                              subject and text), then its outcome under the
 *                              same "id" ("type": "delivery": ok, transport,
 *                              errors). The id is also the "Ref:" line at the
 *                              foot of the email.
 *   spam-YYYY-MM.jsonl         spam-trap hits (answered as success, not
 *                              emailed), capped at 20 MB a month.
 *   graph-token.json           cached Graph token, if Graph is configured.
 *
 * Reading them over SSH, from the private folder:
 *   tail -n 20 submissions-2026-09.jsonl
 *   grep '"type":"delivery"' submissions-2026-09.jsonl | grep '"ok":false'
 *   php -r 'foreach (file($argv[1]) as $l) { $r = json_decode($l, true); echo $r["ts"], "  ", $r["type"], "  ", $r["id"], "  ", $r["type"] === "delivery" ? ($r["ok"] ? "sent via " . $r["transport"] : "FAILED " . implode(" | ", $r["errors"])) : $r["page"], "\n"; }' submissions-2026-09.jsonl
 */
