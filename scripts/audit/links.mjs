import { pages, distFiles, anchors, splitHref, isInternal, table } from './lib.mjs';

// astro.config.mjs sets trailingSlash: 'always'. An internal link without the
// slash produces a 301, which shows up as an error in Search Console -- so a
// missing slash is a failure here, not a warning.
export default {
  name: 'Internal links resolve',
  run() {
    const problems = [];
    const all = pages();
    const routes = new Set(all.map((p) => p.route));
    const files = new Set(distFiles());

    // ids available on each page, for checking fragments
    const idsByRoute = new Map();
    for (const page of all) {
      const ids = new Set();
      for (const m of page.html.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)) ids.add(m[1]);
      for (const m of page.html.matchAll(/\sname\s*=\s*["']([^"']+)["']/g)) ids.add(m[1]);
      idsByRoute.set(page.route, ids);
    }

    let checked = 0;
    let fragments = 0;
    const rows = [];

    for (const page of all) {
      let pageBad = 0;
      // the whole document, so nav and footer links are covered too
      for (const a of anchors(page.html)) {
        const href = a.href;
        if (!href || !isInternal(href)) continue;
        const { path: p, hash } = splitHref(href);
        checked++;

        if (p === '') {
          // same-page fragment
          if (hash && !idsByRoute.get(page.route).has(hash)) {
            problems.push(`${page.route}: fragment #${hash} has no matching id on the page  (anchor: "${a.text}")`);
            pageBad++;
          } else if (hash) fragments++;
          continue;
        }

        const isFile = /\.[a-z0-9]+$/i.test(p);
        if (isFile) {
          if (!files.has(p.replace(/^\//, ''))) {
            problems.push(`${page.route}: links to missing file ${p}  (anchor: "${a.text}")`);
            pageBad++;
          }
          continue;
        }

        if (!p.endsWith('/')) {
          problems.push(`${page.route}: internal link missing trailing slash -> ${href}  (anchor: "${a.text}")`);
          pageBad++;
          continue;
        }

        if (!routes.has(p)) {
          problems.push(`${page.route}: links to ${p} which is not a built page  (anchor: "${a.text}")`);
          pageBad++;
          continue;
        }

        if (hash) {
          if (!idsByRoute.get(p).has(hash)) {
            problems.push(`${page.route}: links to ${p}#${hash} but that page has no id "${hash}"  (anchor: "${a.text}")`);
            pageBad++;
          } else fragments++;
        }
      }
      if (pageBad) rows.push([page.route, pageBad]);
    }

    return {
      problems,
      summary: `${checked} internal hrefs across ${all.length} pages all resolve to built pages (${fragments} with a verified #fragment)`,
      report: rows.length ? table(['route', 'bad links'], rows) : '',
    };
  },
};
