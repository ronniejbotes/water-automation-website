/**
 * What the enquiry forms say to the visitor, shared by tools/forms-wire.mjs
 * (which bakes it into _forms/submit.php and _forms/forms.js) and by
 * tools/serve.mjs (which answers the same way in dev).
 *
 * The first four are Elementor Pro's own defaults, verbatim, from
 * Ajax_Handler::get_default_messages() in modules/forms/classes/ajax-handler.php
 * of the 4.x line (the live site ran elementor-pro 4.1.x; checked against the
 * GPL mirror of 4.2.3). The captured pages cannot say whether the WordPress
 * install replaced any of them with a custom message per form: those settings
 * live in the form widget on the server and never reach the page. Until
 * someone reads them off the WordPress admin, these are what a visitor saw.
 *
 * Messages are HTML, as Elementor's were (its script appends them as markup),
 * and are only ever these fixed strings.
 */
export const CONTACT = 'support@waterautomation.com'

export const MESSAGES = {
  success: 'Your submission was successful.',
  error: 'Your submission failed because of an error.',
  required: 'This field is required.',
  server: 'Your submission failed because of a server error.',

  // Not Elementor's. Elementor checked email format only in the browser, so it
  // had no server-side wording for it; this one is the handler's own.
  badEmail: 'That email address did not look right.',

  // Added to the two failure messages, so a visitor whose enquiry did not go
  // through is never left without a way to reach the business.
  contact: `Please email us at <a href="mailto:${CONTACT}">${CONTACT}</a> and we will pick it up from there.`,
}
