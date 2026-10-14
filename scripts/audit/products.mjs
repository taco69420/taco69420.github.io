import fs from 'node:fs';
import path from 'node:path';
import { DIST, decode, stripTags, jsonLd, table } from './lib.mjs';

// The best-of pages render their visible Pros/Cons from src/data/bestOfProducts.ts
// and build the Review positiveNotes/negativeNotes from the same arrays, so the
// two cannot drift. This proves it on the built output rather than trusting it.
const ROUTES = ['/best-gopher-traps/', '/best-gopher-baits/', '/best-gopher-poison/'];
const clean = (h) => decode(stripTags(h)).replace(/\s+/g, ' ').trim();

export default {
  name: 'Best-of pros/cons fidelity',
  run() {
    const problems = [];
    const rows = [];

    for (const route of ROUTES) {
      const file = path.join(DIST, route.slice(1), 'index.html');
      if (!fs.existsSync(file)) {
        problems.push(`${route}: page not built`);
        continue;
      }
      const html = fs.readFileSync(file, 'utf8');

      // visible lists, in document order
      const visible = [];
      for (const m of html.matchAll(/<div class="ps-(pros|cons)"[^>]*>([\s\S]*?)<\/ul>/g)) {
        visible.push([...m[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((x) => clean(x[1])));
      }

      const list = jsonLd(html, route).find((b) => b['@type'] === 'ItemList');
      if (!list) {
        problems.push(`${route}: no ItemList schema`);
        continue;
      }

      const schema = [];
      for (const el of list.itemListElement) {
        const review = el.item?.review;
        if (!review) {
          problems.push(`${route}: ListItem ${el.position} has no Review`);
          continue;
        }
        schema.push((review.positiveNotes?.itemListElement ?? []).map((x) => x.name));
        schema.push((review.negativeNotes?.itemListElement ?? []).map((x) => x.name));
        // nothing on these pages supports a numeric score
        for (const k of ['reviewRating', 'aggregateRating']) {
          if (review[k]) problems.push(`${route}: Review has ${k}, but no score is shown on the page`);
        }
        if (el.item.offers) problems.push(`${route}: Product has offers/prices, which the page does not state`);
      }

      if (!visible.length) problems.push(`${route}: no visible pros/cons lists found`);
      if (JSON.stringify(visible) !== JSON.stringify(schema)) {
        problems.push(`${route}: schema notes do not match the visible lists`);
        for (let i = 0; i < Math.max(visible.length, schema.length); i++) {
          if (JSON.stringify(visible[i]) !== JSON.stringify(schema[i])) {
            problems.push(`  list ${i} visible: ${JSON.stringify(visible[i])}`);
            problems.push(`  list ${i} schema:  ${JSON.stringify(schema[i])}`);
          }
        }
      }

      rows.push([route, visible.length, visible.flat().length]);
    }

    return {
      problems,
      summary: `${rows.length} best-of pages: every pros/cons note matches the visible list verbatim, in order (${rows
        .map((r) => r[2])
        .join('/')} items)`,
      report: table(['route', 'lists', 'items'], rows),
    };
  },
};
