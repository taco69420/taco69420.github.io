import fs from 'node:fs';
import path from 'node:path';
import { DIST, pages, decode, table } from './lib.mjs';

/**
 * Mark refers work out; he does not perform it. The site may say it will match
 * you with, or connect you to, a licensed trapper — it may never read as though
 * Mark or "we" turn up and do the job.
 *
 * Referral wording is allowed. First-person service wording is not, and neither
 * is business schema that would make the site look like a pest control company.
 * See "The two location pages" and "Editorial facts" in CLAUDE.md.
 *
 * Also keeps the referral form out of the index: it is a lead-capture page with
 * thin content pointed at commercial-intent queries, so it is noindex and out
 * of the sitemap.
 */
const REFERRAL_PAGE = '/find-a-trapper/';

// Wording that would present the site as the service provider.
const FORBIDDEN = [
  /free estimate/i,
  /get a quote from me/i,
  /we come out/i,
  /our technicians/i,
  /service area/i,
  /licensed and insured/i,
  /\bwe'?ll come\b/i,
  /\bour crew\b/i,
  /\bi'?ll come out\b/i,
  /\bmy technicians\b/i,
  /\bbook (?:me|my) service\b/i,
  /\bcall me for (?:a quote|service)\b/i,
];

// Schema that would describe the site as a local business or a service.
const FORBIDDEN_SCHEMA = /"@type"\s*:\s*"(LocalBusiness|HomeAndConstructionBusiness|ProfessionalService|Service|Offer|AggregateOffer|PestControlService)"/;
const FORBIDDEN_PROPS = /"(areaServed|serviceArea|priceRange|openingHours|openingHoursSpecification|telephone)"\s*:/;

export default {
  name: 'Referral framing, not a service',
  run() {
    const problems = [];
    const rows = [];
    const all = pages();

    for (const page of all) {
      const html = page.html;
      const text = decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

      for (const re of FORBIDDEN) {
        const m = text.match(re);
        if (m) {
          const i = text.search(re);
          problems.push(`${page.route}: service wording "${m[0]}"  ::  ${text.slice(Math.max(0, i - 60), i + 80).trim()}`);
        }
      }
      // schema checks run on the raw JSON-LD, not the stripped text
      for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        const t = block[1].match(FORBIDDEN_SCHEMA);
        if (t) problems.push(`${page.route}: forbidden schema @type "${t[1]}" — the site is a personal brand, not a business listing`);
        const p = block[1].match(FORBIDDEN_PROPS);
        if (p) problems.push(`${page.route}: business schema property "${p[1]}" — would present the site as a service provider`);
      }
    }

    // ── the referral page itself ───────────────────────────────────────────
    const page = all.find((p) => p.route === REFERRAL_PAGE);
    if (!page) {
      problems.push(`${REFERRAL_PAGE} is not built`);
    } else {
      const robots = (page.html.match(/<meta name="robots" content="([^"]*)"/) || [, ''])[1];
      if (!/noindex/i.test(robots)) problems.push(`${REFERRAL_PAGE}: robots is "${robots}" — must be noindex`);
      if (!/follow/i.test(robots)) problems.push(`${REFERRAL_PAGE}: robots is "${robots}" — should still be follow`);
      rows.push([REFERRAL_PAGE, 'robots', robots || '(none)']);

      // every other page must stay indexable
      for (const other of all) {
        if (other.route === REFERRAL_PAGE) continue;
        const r = (other.html.match(/<meta name="robots" content="([^"]*)"/) || [, ''])[1];
        if (/noindex/i.test(r)) problems.push(`${other.route}: unexpectedly noindex`);
      }

      // the disclaimer has to be on the page, not just in the commit message
      const text = decode(page.html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
      for (const [label, re] of [
        ['not a pest control company', /not a pest control company/i],
        ['referral fee disclosure', /referral fee/i],
        ['third party will contact you', /contact you directly/i],
        ['fallback link to the form', /Open it here/i],
      ]) {
        if (!re.test(text)) problems.push(`${REFERRAL_PAGE}: missing ${label}`);
        rows.push([REFERRAL_PAGE, label, re.test(text) ? 'present' : 'MISSING']);
      }
    }

    // ── sitemap exclusion ──────────────────────────────────────────────────
    const smPath = path.join(DIST, 'sitemap-0.xml');
    if (!fs.existsSync(smPath)) problems.push('dist/sitemap-0.xml is missing');
    else {
      const sm = fs.readFileSync(smPath, 'utf8');
      const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
      if (locs.includes(REFERRAL_PAGE)) problems.push(`${REFERRAL_PAGE} is in the sitemap — it must be filtered out`);
      rows.push(['sitemap', `${locs.length} urls`, locs.includes(REFERRAL_PAGE) ? 'INCLUDES referral page' : 'referral page excluded']);
    }

    return {
      problems,
      summary: `no service wording or business schema on ${all.length} pages; ${REFERRAL_PAGE} is noindex, out of the sitemap, and carries its disclaimers`,
      report: table(['where', 'check', 'value'], rows),
    };
  },
};
