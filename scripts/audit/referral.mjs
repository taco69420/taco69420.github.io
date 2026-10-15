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
        // The wording is "I may be paid for referrals" rather than "a referral
        // fee if you hire them": compensation is not tied to the visitor
        // actually hiring, and that distinction matters for the CCPA "sale"
        // disclosure on /privacy/#referrals.
        ['compensation disclosure', /may be paid for referrals|may be paid by the licensed company/i],
        ['third party will contact you', /contact you directly/i],
        ['fallback link to the form', /Open it here/i],
      ]) {
        if (!re.test(text)) problems.push(`${REFERRAL_PAGE}: missing ${label}`);
        rows.push([REFERRAL_PAGE, label, re.test(text) ? 'present' : 'MISSING']);
      }
    }

    // ── /privacy/ must not over-promise about the referral data ───────────
    const privacy = all.find((p) => p.route === '/privacy/');
    if (!privacy) problems.push('/privacy/ is not built');
    else {
      const t = decode(privacy.html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
      // Claims that would be false now that referrals may be compensated.
      for (const re of [/do not sell these details/i, /I do not sell your data/i, /Neither is sold/i]) {
        const m = t.match(re);
        if (m) problems.push(`/privacy/: stale claim "${m[0]}" — referral details may count as a "sale" under CCPA`);
      }
      // And the disclosures that must be there instead.
      for (const [label, re] of [
        ['CCPA "sale" disclosure', /may count as a "sale" of personal information under California law/i],
        ['compensation disclosure', /may be paid by the licensed company for referrals/i],
        ['newsletter never sold', /Newsletter emails are never sold or shared/i],
        ['deletion route', /hello@howtokillgophers\.com/i],
      ]) {
        if (!re.test(t)) problems.push(`/privacy/: missing ${label}`);
        rows.push(['/privacy/', label, re.test(t) ? 'present' : 'MISSING']);
      }
      if (!/id="do-not-sell"/.test(privacy.html)) problems.push('/privacy/: the #do-not-sell section anchor is gone');
    }

    // ── the custom 404 ────────────────────────────────────────────────────
    // dist/404.html is not an index.html, so pages() does not see it.
    const p404 = path.join(DIST, '404.html');
    if (!fs.existsSync(p404)) {
      problems.push('dist/404.html is missing — GitHub Pages needs it to serve the custom 404');
    } else {
      const h = fs.readFileSync(p404, 'utf8');
      const robots = (h.match(/<meta name="robots" content="([^"]*)"/) || [, ''])[1];
      if (!/noindex/i.test(robots)) problems.push(`404.html: robots is "${robots}" — must be noindex`);
      for (const href of ['/quick-start/', '/best-gopher-traps/', '/methods/', '"/"']) {
        const needle = href === '"/"' ? 'href="/"' : `href="${href}"`;
        if (!h.includes(needle)) problems.push(`404.html: no link to ${href}`);
      }
      rows.push(['404.html', 'robots', robots || '(none)']);
      rows.push(['404.html', 'links', 'quick-start, best-gopher-traps, methods, home']);
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
