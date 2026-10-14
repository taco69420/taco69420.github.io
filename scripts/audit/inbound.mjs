import { pages, mainOf, anchors, splitHref, isInternal, table } from './lib.mjs';

/**
 * Inbound internal links per page, counting links inside <main> only -- the nav
 * and footer link almost everything from almost everywhere, so they tell you
 * nothing about how the content is wired together.
 *
 * FLOORS are regression guards on the commercially important routes, set just
 * below the counts at the time they were written. If a floor trips, either a
 * link was removed or a page stopped rendering one -- check before lowering it.
 */
const FLOORS = {
  '/best-gopher-traps/': 22,
  '/best-gopher-baits/': 13,
  '/best-gopher-poison/': 5,
  '/traps/': 24,
  '/cost/': 6,
  '/quick-start/': 11,
  '/methods/hiring-a-pro/': 6,
  '/what-doesnt-work/': 5,
};

// Pages with no inbound content links. Both are reached from the footer only,
// which is deliberate for /privacy/; /about/ is a known gap, not a regression.
const NO_INBOUND_OK = new Set(['/about/', '/privacy/']);

export default {
  name: 'Inbound internal link counts',
  run() {
    const problems = [];
    const all = pages();
    const routes = new Set(all.map((p) => p.route));
    const inbound = new Map(all.map((p) => [p.route, new Set()]));
    const links = new Map(all.map((p) => [p.route, 0]));

    for (const page of all) {
      const main = mainOf(page.html);
      if (main === null) {
        problems.push(`${page.route}: no <main> element, so its content links cannot be counted`);
        continue;
      }
      for (const a of anchors(main)) {
        if (!a.href || !isInternal(a.href)) continue;
        const { path: p } = splitHref(a.href);
        if (!routes.has(p) || p === page.route) continue;
        inbound.get(p).add(page.route);
        links.set(p, links.get(p) + 1);
      }
    }

    const rows = [...routes]
      .map((r) => ({ route: r, pages: inbound.get(r).size, links: links.get(r) }))
      .sort((a, b) => b.links - a.links || a.route.localeCompare(b.route));

    for (const [route, floor] of Object.entries(FLOORS)) {
      if (!routes.has(route)) {
        problems.push(`floor set for ${route} but that page is not built`);
        continue;
      }
      const got = inbound.get(route).size;
      if (got < floor) problems.push(`${route}: only ${got} pages link to it in content (floor ${floor})`);
    }

    for (const r of rows) {
      if (r.pages === 0 && !NO_INBOUND_OK.has(r.route) && r.route !== '/') {
        problems.push(`${r.route}: orphan — no page links to it from content`);
      }
    }

    const total = rows.reduce((a, r) => a + r.links, 0);
    return {
      problems,
      summary: `${total} internal content links; all ${Object.keys(FLOORS).length} money-page floors met`,
      report: table(['route', 'links', 'from pages'], rows.map((r) => [r.route, r.links, r.pages])),
    };
  },
};
