import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root, derived from this file's location so the scripts stay portable. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DIST = path.join(ROOT, 'dist');

/** Every file in dist, as paths relative to dist with forward slashes. */
export function distFiles(dir = DIST, base = DIST, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) distFiles(p, base, out);
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

/**
 * Every built page, sorted by route. `route` is the trailing-slash URL path the
 * page is served at, matching `trailingSlash: 'always'`.
 */
export function pages() {
  return distFiles()
    .filter((f) => f === 'index.html' || f.endsWith('/index.html'))
    .map((f) => ({
      file: path.join(DIST, f),
      route: '/' + f.replace(/index\.html$/, ''),
      get html() {
        const v = fs.readFileSync(path.join(DIST, f), 'utf8');
        Object.defineProperty(this, 'html', { value: v });
        return v;
      },
    }))
    .sort((a, b) => a.route.localeCompare(b.route));
}

/** HTML entities -> text, so lengths and string compares match what a reader sees. */
export function decode(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export const stripTags = (h) => String(h).replace(/<[^>]*>/g, '');
export const text = (h) => decode(stripTags(h)).replace(/\s+/g, ' ').trim();

/** Parsed JSON-LD blocks. Throws with the route if one does not parse. */
export function jsonLd(html, route = '') {
  const out = [];
  let i = 0;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      out.push(JSON.parse(m[1]));
    } catch (e) {
      throw new Error(`${route} JSON-LD block ${i} does not parse: ${e.message}`);
    }
    i++;
  }
  return out;
}

/**
 * The page's own content: everything inside <main>. The nav and footer live
 * outside it, so this is what "links in page content" means throughout.
 * Note Layout ships an inline script whose comment mentions `<main>`, so the
 * slice runs from the first real <main ...> tag to the single closing tag.
 */
export function mainOf(html) {
  const open = html.match(/<main\b[^>]*>/);
  const close = html.lastIndexOf('</main>');
  if (!open || close < 0) return null;
  return html.slice(open.index + open[0].length, close);
}

/** Anchors in a chunk of HTML, with href and visible text. */
export function anchors(html) {
  return [...String(html).matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a>/g)].map((m) => {
    const attrs = m[1];
    const href = (attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)')/) || [])[0];
    return {
      href: href ? href.replace(/^href\s*=\s*["']/, '').replace(/["']$/, '') : '',
      rel: (attrs.match(/rel\s*=\s*["']([^"']*)["']/) || [, ''])[1],
      target: (attrs.match(/target\s*=\s*["']([^"']*)["']/) || [, ''])[1],
      text: text(m[2]),
      attrs,
    };
  });
}

/** Splits an internal href into its path and fragment. */
export function splitHref(href) {
  const [noHash, ...rest] = href.split('#');
  const [p] = noHash.split('?');
  return { path: p, hash: rest.join('#') };
}

export const isInternal = (href) => href.startsWith('/') && !href.startsWith('//');

/** Renders rows as a markdown table for the verbose report. */
export function table(headers, rows) {
  if (!rows.length) return '';
  const w = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)));
  const line = (cells) => '| ' + cells.map((c, i) => String(c ?? '').padEnd(w[i])).join(' | ') + ' |';
  return [line(headers), '|' + w.map((n) => '-'.repeat(n + 2)).join('|') + '|', ...rows.map(line)].join('\n');
}
