import { pages, jsonLd, table } from './lib.mjs';

const AUTHOR_ID = 'https://howtokillgophers.com/about/#mark';
const WEBSITE_ID = 'https://howtokillgophers.com/#website';

/**
 * Walks a JSON-LD tree collecting defined vs referenced @ids.
 *
 * A bare {"@id": "..."} is a reference. A node carrying anything else (an
 * @type, properties) asserts something about that id, so it counts as a
 * definition -- `mainEntityOfPage: {"@type": "WebPage", "@id": url}` is
 * self-describing, not a dangling pointer.
 */
function collect(node, defined, referenced, types) {
  if (Array.isArray(node)) {
    for (const n of node) collect(n, defined, referenced, types);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const keys = Object.keys(node);
  if (node['@id']) {
    const others = keys.filter((k) => k !== '@id' && k !== '@context');
    (others.length === 0 ? referenced : defined).add(node['@id']);
  }
  if (node['@type']) types.push(String(node['@type']));
  for (const k of keys) collect(node[k], defined, referenced, types);
}

export default {
  name: 'JSON-LD structure',
  run() {
    const problems = [];
    const rows = [];
    let blocks = 0;

    for (const page of pages()) {
      let parsed;
      try {
        parsed = jsonLd(page.html, page.route);
      } catch (e) {
        problems.push(e.message);
        rows.push([page.route, '?', 'DID NOT PARSE']);
        continue;
      }
      blocks += parsed.length;

      const defined = new Set();
      const referenced = new Set();
      const types = [];
      collect(parsed, defined, referenced, types);

      const topTypes = parsed.map((p) => String(p['@type']));
      const count = (t) => topTypes.filter((x) => x === t).length;

      if (count('WebSite') !== 1) problems.push(`${page.route}: ${count('WebSite')} WebSite nodes (want 1)`);
      if (count('Person') !== 1) problems.push(`${page.route}: ${count('Person')} top-level Person nodes (want 1)`);
      if (count('FAQPage') > 1) problems.push(`${page.route}: FAQPage emitted ${count('FAQPage')} times`);
      if (!defined.has(AUTHOR_ID)) problems.push(`${page.route}: Person @id never defined`);
      if (!defined.has(WEBSITE_ID)) problems.push(`${page.route}: WebSite @id never defined`);

      for (const id of referenced) {
        if (!defined.has(id)) problems.push(`${page.route}: orphan @id reference -> ${id}`);
      }

      // exactly one Person object anywhere: everything else uses authorRef
      const people = types.filter((t) => t === 'Person').length;
      if (people !== 1) problems.push(`${page.route}: ${people} Person objects total (want exactly 1, the rest should be authorRef)`);

      // the site is a personal brand; no Organization node should exist
      const orgs = types.filter((t) => t === 'Organization').length;
      if (orgs) problems.push(`${page.route}: ${orgs} Organization node(s) — publishers should use authorRef`);

      rows.push([page.route, parsed.length, topTypes.join(', ')]);
    }

    return {
      problems,
      summary: `${rows.length} pages, ${blocks} JSON-LD blocks parse; one WebSite + one Person each, no orphan @ids`,
      report: table(['route', 'n', 'top-level @types'], rows),
    };
  },
};
