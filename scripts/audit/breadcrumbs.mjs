import { pages, jsonLd, text, table } from './lib.mjs';

// Google asks that BreadcrumbList markup reflect the visible trail. Static
// pages render both from one `crumbLabel` const; the collection renderers
// build theirs from entry.data.title, which is also the H1. Either way the
// rendered trail and the schema must agree rung for rung.
const SEP = '›'; // the visible separator

export default {
  name: 'Breadcrumbs match the visible trail',
  run() {
    const problems = [];
    const rows = [];
    let checked = 0;
    let visibleOnly = 0;

    for (const page of pages()) {
      const html = page.html;

      const nav = html.match(/<nav class="breadcrumb"[^>]*>([\s\S]*?)<\/nav>/);
      const visible = nav
        ? text(nav[1])
            .split(SEP)
            .map((s) => s.trim())
            .filter(Boolean)
        : null;

      const crumbs = jsonLd(html, page.route).filter((b) => b['@type'] === 'BreadcrumbList');
      if (crumbs.length > 1) problems.push(`${page.route}: ${crumbs.length} BreadcrumbList nodes`);

      const schema = crumbs.length
        ? crumbs[0].itemListElement
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((li) => li.name)
        : null;

      if (schema && !visible) {
        problems.push(`${page.route}: BreadcrumbList with no visible breadcrumb nav`);
      } else if (schema && visible) {
        checked++;
        if (visible.join(` ${SEP} `) !== schema.join(` ${SEP} `)) {
          problems.push(
            `${page.route}: trail mismatch — visible [${visible.join(' > ')}] vs schema [${schema.join(' > ')}]`
          );
        }
      } else if (visible && !schema) {
        visibleOnly++;
      }

      rows.push([page.route, visible ? visible.join(' > ') : '-', schema ? schema.join(' > ') : '-']);
    }

    return {
      problems,
      summary:
        `${checked} pages have a BreadcrumbList and all match the visible trail` +
        (visibleOnly ? `; ${visibleOnly} show a trail with no schema (/about/, /methods/, /problems/, /quiz/)` : ''),
      report: table(['route', 'visible trail', 'schema trail'], rows),
    };
  },
};
