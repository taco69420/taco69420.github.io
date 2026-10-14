import { pages, table } from './lib.mjs';

// Layout.astro injects AffiliateDisclosure just under the page header on any
// page whose own content holds an Amazon link. Pages without one must not
// carry it. Detection runs on the rendered slot, not the whole document --
// CookieBanner's `a[href*="amzn.to"]` tracking selector would otherwise match
// every page. The audit looks at the finished HTML, so it checks the outcome.
const AMAZON_LINK = /href=["']https?:\/\/(?:www\.)?(?:amzn\.to|amazon\.com)/i;
const DISCLOSURE = /class="affiliate-disclosure"/;

export default {
  name: 'Affiliate disclosure placement',
  run() {
    const problems = [];
    const rows = [];
    let withLinks = 0;

    for (const page of pages()) {
      const html = page.html;
      const linkAt = html.search(AMAZON_LINK);
      const discAt = html.search(DISCLOSURE);
      const hasLink = linkAt >= 0;
      const hasDisc = discAt >= 0;
      const first = hasLink && hasDisc ? discAt < linkAt : null;

      if (hasLink) {
        withLinks++;
        if (!hasDisc) problems.push(`${page.route}: has Amazon links but no disclosure`);
        else if (first !== true) problems.push(`${page.route}: disclosure appears after the first Amazon link`);
      } else if (hasDisc) {
        problems.push(`${page.route}: carries a disclosure but has no Amazon links`);
      }

      // more than one disclosure means the slot was rendered twice
      const count = (html.match(/class="affiliate-disclosure"/g) || []).length;
      if (count > 1) problems.push(`${page.route}: disclosure rendered ${count} times`);

      rows.push([page.route, hasLink ? 'yes' : 'no', hasDisc ? 'yes' : 'no', first === null ? '-' : first ? 'yes' : 'NO']);
    }

    return {
      problems,
      summary: `${rows.length} pages: ${withLinks} with Amazon links (disclosure first on each), ${rows.length - withLinks} without (none carry one)`,
      report: table(['route', 'amazon link', 'disclosure', 'disclosure first'], rows),
    };
  },
};
