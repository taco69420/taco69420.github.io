import fs from 'node:fs';
import path from 'node:path';
import { ROOT, pages, decode, table } from './lib.mjs';

/**
 * Guards two numeric claims that drifted repeatedly, because grep could not see
 * them: the ranges use an en dash, which byte-oriented patterns miss.
 *
 *  1. Gopher tunnel depth is 6-12 inches, per UC IPM 7433 ("Feeding burrows are
 *     usually 6 to 12 inches below ground"). Earlier passes left 6-18 inches on
 *     /gopher-vs-mole/, / and /best-gopher-poison/ while /faq/ said 6-12.
 *  2. A method the research does not support must not advertise a numeric
 *     "Time to Results". Sonic stakes and castor oil both promised a timeframe
 *     directly above copy saying the evidence doesn't back them.
 *
 * Every dash variant is matched: hyphen, non-breaking hyphen, figure dash,
 * en dash, em dash, horizontal bar and minus sign.
 */
const DASH = '[-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\u2212]';

// Depth figures that are NOT gopher tunnel depth, and are allowed. The
// gopher-vs-mole comparison states mole depths and both animals' body sizes
// right beside the gopher figure, so those markers have to be excluded too.
const NOT_TUNNEL_DEPTH =
  /trench|barrier|skirt|bury|buried|mesh|hardware cloth|overlap|wide|width|mole|emitter|post|bed perimeter|surface ridge|paddle|\bsize\b|\bbody\b|shallow/i;
// Gopher depth stated as a range must be exactly 6-12 inches, with one exception.
const ALLOWED_DEPTH = /^6\s*[-‐-―−]\s*12$/;
// /redlands/ records a first-hand observation of clay soil, explicitly flagged as
// atypical ("deeper than average"). It is an observation, not a general range.
const DEPTH_EXCEPTIONS = new Set(['/redlands/']);

// Methods whose efficacy the research does not support: no numeric timeframe.
const UNEVIDENCED = ['sonic-stakes', 'castor-oil'];
const NUMERIC = /\d/;

export default {
  name: 'Numeric claims (depths, time-to-results)',
  run() {
    const problems = [];
    const rows = [];

    // ── 1. tunnel depth ─────────────────────────────────────────────────────
    const re = new RegExp(`(\\d+)\\s*${DASH}\\s*(\\d+)\\s*inches`, 'g');
    for (const page of pages()) {
      const text = decode(page.html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
      for (const m of text.matchAll(re)) {
        const ctx = text.slice(Math.max(0, m.index - 90), m.index + m[0].length + 60);
        const aboutTunnel = /tunnel|main run|burrow|deep|down|depth/i.test(ctx);
        if (!aboutTunnel || NOT_TUNNEL_DEPTH.test(ctx)) continue;
        // a distance from the mound is not a depth
        if (/from the (plug|mound)|out from|semicircle|drop|sinks|inside the (run|tunnel)|into the tunnel|from the opening/i.test(ctx)) continue;
        const range = `${m[1]}-${m[2]}`;
        if (ALLOWED_DEPTH.test(range)) {
          rows.push([page.route, m[0], 'ok']);
          continue;
        }
        if (DEPTH_EXCEPTIONS.has(page.route)) {
          rows.push([page.route, m[0], 'allowed exception (first-hand observation)']);
          continue;
        }
        problems.push(`${page.route}: gopher tunnel depth stated as ${m[0]} — UC IPM 7433 says 6-12 inches  ::  ${ctx.trim().slice(0, 130)}`);
      }
    }

    // ── 1b. the specific regression, asserted without any context heuristic.
    // "6-18 inches" was the wrong gopher depth and it survived three passes on
    // /gopher-vs-mole/, / and /best-gopher-poison/ because grep could not match
    // the en dash. No context test here: the figure is simply never correct.
    const banned = new RegExp(`6\\s*${DASH}\\s*18\\s*inches`, 'gi');
    let bannedSeen = 0;
    for (const page of pages()) {
      const text = decode(page.html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
      for (const m of text.matchAll(banned)) {
        bannedSeen++;
        problems.push(`${page.route}: "${m[0]}" — the gopher depth figure that keeps regressing; UC IPM 7433 says 6-12 inches`);
      }
    }
    rows.push(['(all pages)', '"6-18 inches" occurrences', String(bannedSeen)]);

    // the gopher column of the comparison table must state the right depth
    const vs = pages().find((p) => p.route === '/gopher-vs-mole/');
    if (!vs) problems.push('/gopher-vs-mole/ is not built');
    else {
      const text = decode(vs.html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
      const ok = new RegExp(`6\\s*${DASH}\\s*12\\s*inches`).test(text);
      if (!ok) problems.push('/gopher-vs-mole/: no "6-12 inches" gopher depth found on the page');
      rows.push(['/gopher-vs-mole/', 'gopher depth 6-12 present', ok ? 'ok' : 'MISSING']);
    }

    // ── 2. time-to-results on unevidenced methods ───────────────────────────
    for (const slug of UNEVIDENCED) {
      const file = path.join(ROOT, 'src/content/methods', slug + '.md');
      if (!fs.existsSync(file)) {
        problems.push(`${slug}.md is missing`);
        continue;
      }
      const m = fs.readFileSync(file, 'utf8').match(/^timeToResults:\s*"([^"]*)"/m);
      if (!m) {
        problems.push(`${slug}.md: no timeToResults`);
        continue;
      }
      if (NUMERIC.test(m[1])) {
        problems.push(
          `/methods/${slug}/: timeToResults is "${m[1]}" — the research does not support this method, so it must not advertise a timeframe`
        );
      }
      rows.push([`/methods/${slug}/`, `timeToResults: ${m[1]}`, NUMERIC.test(m[1]) ? 'NUMERIC' : 'ok']);

      // the rendered stat box must agree
      const page = pages().find((p) => p.route === `/methods/${slug}/`);
      if (page) {
        const shown = page.html.match(/Time to Results:<\/strong>\s*([^<]+)</);
        if (shown && NUMERIC.test(decode(shown[1]))) {
          problems.push(`/methods/${slug}/: stat box renders a numeric timeframe — "${decode(shown[1]).trim()}"`);
        }
      }
    }

    return {
      problems,
      summary: `every gopher tunnel depth reads 6-12 inches; neither unevidenced method advertises a timeframe`,
      report: table(['page', 'figure', 'state'], rows),
    };
  },
};
