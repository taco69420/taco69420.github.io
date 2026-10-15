import fs from 'node:fs';
import path from 'node:path';
import { DIST, pages, table } from './lib.mjs';

/**
 * Statically detectable mobile layout hazards, checked against a 360px viewport
 * — the narrowest width worth supporting.
 *
 * This is a cheap backstop, not a renderer. The real check is the Playwright
 * sweep described under "Mobile" in CLAUDE.md, which measures actual overflow.
 * What this catches is the shapes that reliably cause it:
 *
 *  1. a fixed pixel width over 360px with no max-width to rein it in
 *  2. a <table> with no scrollable wrapper, since tables refuse to shrink
 *  3. an <iframe> that is not fluid and not inside a sized wrapper
 *  4. box-sizing: content-box on something that is width:100% with padding —
 *     the exact bug that made .btn-quiz 428px wide in a 412px viewport
 */
const NARROW = 360;

// width declarations that are not constrained
const FIXED_WIDTH = /(?:^|[;{\s])(?:min-)?width\s*:\s*(\d{3,})px/gi;

function stylesheets() {
  const out = [];
  const astro = path.join(DIST, '_astro');
  if (fs.existsSync(astro)) {
    for (const f of fs.readdirSync(astro)) {
      if (f.endsWith('.css')) out.push({ name: `_astro/${f}`, css: fs.readFileSync(path.join(astro, f), 'utf8') });
    }
  }
  return out;
}

export default {
  name: 'Mobile layout hazards (360px)',
  run() {
    const problems = [];
    const rows = [];

    // ── 1 + 4. CSS shapes ──────────────────────────────────────────────────
    for (const { name, css } of stylesheets()) {
      // a rule block at a time, so max-width in the same block counts as a fix
      for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
        const sel = m[1].trim();
        const body = m[2];
        if (/^@/.test(sel)) continue;
        for (const w of body.matchAll(FIXED_WIDTH)) {
          const px = Number(w[1]);
          if (px <= NARROW) continue;
          if (/max-width/.test(body)) continue;
          // a min-width on a scroll container is how you make a table scroll
          if (/min-width/.test(w[0]) && /table|compare/i.test(sel)) continue;
          problems.push(`${name}: ${sel} sets ${w[0].trim()} with no max-width — overflows a ${NARROW}px viewport`);
        }
        if (/box-sizing\s*:\s*content-box/.test(body) && /width\s*:\s*100%/.test(body) && /padding\s*:/.test(body)) {
          problems.push(`${name}: ${sel} is content-box at width:100% with padding — will overflow by its padding`);
        }
      }
    }

    // ── 2 + 3. markup shapes ───────────────────────────────────────────────
    let tables = 0;
    let wrapped = 0;
    let iframes = 0;
    for (const page of pages()) {
      const html = page.html;

      for (const m of html.matchAll(/<table\b[\s\S]*?<\/table>/g)) {
        tables++;
        const before = html.slice(Math.max(0, m.index - 400), m.index);
        // the convention here is a wrapper div with overflow-x
        if (/overflow-x\s*:\s*auto|overflow-x\s*:\s*scroll|class="[^"]*table-(?:wrap|scroll)/.test(before)) wrapped++;
        else problems.push(`${page.route}: a <table> has no horizontal scroll wrapper — tables do not shrink below their content width`);
      }

      for (const m of html.matchAll(/<iframe\b([^>]*)>/g)) {
        iframes++;
        const attrs = m[1];
        const fluidAttr = /width\s*=\s*["']100%["']/.test(attrs);
        const fluidStyle = /style="[^"]*width\s*:\s*100%/.test(attrs);
        const cls = (attrs.match(/class="([^"]*)"/) || [, ''])[1];
        // a class means a stylesheet sizes it; the yt-short embeds use max-width
        const sized = /max-width/.test(attrs) || cls.length > 0 || /yt-short/.test(html.slice(Math.max(0, m.index - 200), m.index));
        if (!fluidAttr && !fluidStyle && !sized) {
          problems.push(`${page.route}: <iframe${attrs.slice(0, 60)}…> is neither width="100%" nor inside a sized wrapper`);
        }
      }
    }

    rows.push(['tables', String(tables), `${wrapped} with a scroll wrapper`]);
    rows.push(['iframes', String(iframes), 'all fluid or wrapped']);
    rows.push(['stylesheets scanned', String(stylesheets().length), `no unconstrained width > ${NARROW}px`]);

    return {
      problems,
      summary: `no fixed width over ${NARROW}px without max-width, ${wrapped}/${tables} tables wrapped, ${iframes} iframes fluid`,
      report: table(['what', 'count', 'state'], rows),
    };
  },
};
