import fs from 'node:fs';
import path from 'node:path';
import { ROOT, pages, anchors, table } from './lib.mjs';

/**
 * Every amzn.to link in the built site must be registered in
 * src/data/amazonLinks.ts with the product it was manually verified to point
 * at. An id that isn't registered is either a typo or a link nobody has
 * actually checked — both are a problem on an affiliate site. See "Bad Amazon
 * links" in CLAUDE.md for the two ids that were registered once, got
 * verified as wrong, and were removed rather than fixed.
 */
const AMAZON_SHORTLINK = /^https?:\/\/(?:www\.)?amzn\.to\/([a-zA-Z0-9]+)/i;

export default {
  name: 'Amazon links are verified',
  run() {
    const problems = [];
    const rows = [];

    const dataPath = path.join(ROOT, 'src/data/amazonLinks.ts');
    const data = fs.readFileSync(dataPath, 'utf8');
    const registry = new Map(
      [...data.matchAll(/'([a-zA-Z0-9]+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]])
    );
    if (!registry.size) problems.push('amazonLinks.ts: registry is missing or empty');

    const seen = new Set();
    for (const page of pages()) {
      for (const a of anchors(page.html)) {
        const m = a.href && a.href.match(AMAZON_SHORTLINK);
        if (!m) continue;
        const id = m[1];
        seen.add(id);
        if (!registry.has(id)) {
          problems.push(`${page.route}: amzn.to/${id} is not in amazonLinks.ts — verify the destination and register it`);
        }
      }
    }

    for (const [id, name] of registry) {
      rows.push([id, name, seen.has(id) ? 'used' : 'UNUSED']);
    }

    return {
      problems,
      summary: `${seen.size} distinct amzn.to ids on the site, ${registry.size} registered in amazonLinks.ts`,
      report: table(['id', 'product', 'state'], rows),
    };
  },
};
