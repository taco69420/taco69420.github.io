import fs from 'node:fs';
import path from 'node:path';
import { pages, DIST, table } from './lib.mjs';

// One date per page feeds three outputs: the visible dateline, the
// Article/HowTo JSON-LD dateModified, and the sitemap's <lastmod>. They are
// generated from the same source (markdown frontmatter, or pageDates.ts), so
// any disagreement here means a page hardcoded a date somewhere.
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// "Updated July 2026" -> "2026-07". The day is not visible, so compare months.
function monthFromVisible(s) {
  const m = s.match(/Updated\s+([A-Z][a-z]+)\s+(\d{4})/);
  if (!m) return null;
  const i = MONTHS.indexOf(m[1]);
  return i < 0 ? null : `${m[2]}-${String(i + 1).padStart(2, '0')}`;
}

export default {
  name: 'Date agreement (visible / JSON-LD / sitemap)',
  run() {
    const problems = [];
    const rows = [];

    const smPath = path.join(DIST, 'sitemap-0.xml');
    if (!fs.existsSync(smPath)) return { problems: ['dist/sitemap-0.xml is missing'], summary: 'no sitemap' };
    const sitemap = fs.readFileSync(smPath, 'utf8');
    const lastmod = {};
    for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)) {
      lastmod[new URL(m[1]).pathname] = m[2] ? m[2].slice(0, 10) : null;
    }

    let withLastmod = 0;

    for (const page of pages()) {
      const html = page.html;

      const vis = html.match(/<p class="[a-z-]*dateline"[^>]*>([^<]*)</);
      const visible = vis ? vis[1].trim() : '';

      const mods = new Set();
      for (const b of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        for (const d of b[1].matchAll(/"dateModified"\s*:\s*"([^"]+)"/g)) mods.add(d[1]);
      }

      const sm = lastmod[page.route];
      if (sm) withLastmod++;

      if (mods.size > 1) {
        problems.push(`${page.route}: ${mods.size} different dateModified values — ${[...mods].join(', ')}`);
      }

      // every value that IS present must agree; absence is allowed
      const present = [];
      const visMonth = monthFromVisible(visible);
      if (visMonth) present.push(visMonth);
      if (mods.size === 1) present.push([...mods][0].slice(0, 7));
      if (sm) present.push(sm.slice(0, 7));
      if (new Set(present).size > 1) {
        problems.push(
          `${page.route}: dates disagree — visible ${visible || '(none)'}, JSON-LD ${[...mods][0] ?? '(none)'}, sitemap ${sm ?? '(none)'}`
        );
      }

      // a page showing a dateline should be in the sitemap with a lastmod
      if (visMonth && sm === null) problems.push(`${page.route}: shows a dateline but has no sitemap <lastmod>`);
      if (sm === undefined) problems.push(`${page.route}: not in the sitemap`);

      rows.push([
        page.route,
        visible || '(none)',
        mods.size ? [...mods].join(' / ') : '(no schema date)',
        sm === undefined ? '(not in sitemap)' : sm === null ? '(none)' : sm,
      ]);
    }

    return {
      problems,
      summary: `${rows.length} routes agree; ${withLastmod} carry a sitemap <lastmod>`,
      report: table(['route', 'visible', 'JSON-LD dateModified', 'sitemap lastmod'], rows),
    };
  },
};
