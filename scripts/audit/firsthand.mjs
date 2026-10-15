import fs from 'node:fs';
import path from 'node:path';
import { ROOT, pages, table } from './lib.mjs';

/**
 * The site's credibility rests on first-hand field experience, so it has to be
 * honest about the pages that aren't. Three rules:
 *
 *  1. A method page with `firsthand: false` must render the UntestedNote.
 *  2. An affiliate link for untested gear may appear only on that gear's own
 *     method page — never in a best-of roundup, never in The Armory, never in
 *     a "my kit" context.
 *  3. Every product on a best-of page must be in FIRSTHAND_PRODUCTS. A best-of
 *     page is a recommendation; the site only recommends gear it has used.
 *
 * See "Editorian facts" in CLAUDE.md for the first-hand / never-used split.
 */

// affiliate id -> the one method page allowed to carry it
//
// castor-oil and carbon-monoxide used to have entries here too, but both
// affiliate links were removed after manual verification found the
// destination didn't match the page — see "Bad Amazon links" in CLAUDE.md.
// Neither page links a product anymore, so there's nothing to allowlist.
const UNTESTED_GEAR = {
  '4sKmKFc': { name: 'barn owl nesting box', home: '/methods/barn-owl-box/' },
};

export default {
  name: 'First-hand experience honesty',
  run() {
    const problems = [];
    const rows = [];
    const all = pages();
    const byRoute = new Map(all.map((p) => [p.route, p]));

    // ── rule 1: firsthand: false => UntestedNote rendered ───────────────────
    const methodsDir = path.join(ROOT, 'src/content/methods');
    const flagged = [];
    for (const f of fs.readdirSync(methodsDir).filter((x) => x.endsWith('.md'))) {
      const src = fs.readFileSync(path.join(methodsDir, f), 'utf8');
      const isFalse = /^firsthand:\s*false\s*$/m.test(src);
      const route = `/methods/${f.replace(/\.md$/, '')}/`;
      const page = byRoute.get(route);
      if (!page) {
        problems.push(`${route}: method file has no built page`);
        continue;
      }
      const hasNote = /<aside class="untested-note"/.test(page.html);
      if (isFalse) {
        flagged.push(route);
        if (!hasNote) problems.push(`${route}: firsthand: false but the UntestedNote is not rendered`);
      } else if (hasNote) {
        problems.push(`${route}: renders the UntestedNote without firsthand: false in frontmatter`);
      }
      rows.push([route, isFalse ? 'false' : 'first-hand', hasNote ? 'note' : '—']);
    }
    if (!flagged.length) problems.push('no method page is flagged firsthand: false — the flag is probably not wired up');

    // ── rule 2: untested gear links only on their own page ──────────────────
    for (const page of all) {
      for (const [id, g] of Object.entries(UNTESTED_GEAR)) {
        const n = (page.html.match(new RegExp(`href="https://amzn\\.to/${id}"`, 'g')) || []).length;
        if (n && page.route !== g.home) {
          problems.push(`${page.route}: ${n} affiliate link(s) for ${g.name}, which belongs only on ${g.home}`);
        }
        // on its own page the link must be labelled
        if (n && page.route === g.home) {
          const labelled = (page.html.match(/not personally tested/g) || []).length;
          if (!labelled) problems.push(`${g.home}: links ${g.name} without a "(not personally tested)" label`);
        }
      }
    }

    // ── rule 3: best-of products must all be first-hand ─────────────────────
    const dataPath = path.join(ROOT, 'src/data/bestOfProducts.ts');
    const data = fs.readFileSync(dataPath, 'utf8');
    const allow = [...(data.match(/export const FIRSTHAND_PRODUCTS = \[([\s\S]*?)\]/) || [, ''])[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    if (!allow.length) problems.push('bestOfProducts.ts: FIRSTHAND_PRODUCTS allowlist is missing or empty');

    for (const m of data.matchAll(/"(\/best-[a-z-]+\/)": \[([\s\S]*?)\n  \],/g)) {
      const route = m[1];
      const ids = [...m[2].matchAll(/id: "([^"]+)"/g)].map((x) => x[1]);
      for (const id of ids) {
        if (!allow.includes(id)) {
          problems.push(`${route}: lists "${id}", which is not in FIRSTHAND_PRODUCTS — a best-of page may only recommend gear actually used`);
        }
      }
      rows.push([route, `${ids.length} products`, ids.join(', ')]);
    }

    return {
      problems,
      summary: `${flagged.length} method pages flagged untested and all carry the note; untested gear linked only on its own page; every best-of product is first-hand`,
      report: table(['page', 'state', 'detail'], rows),
    };
  },
};
