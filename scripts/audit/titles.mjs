import { pages, decode, table } from './lib.mjs';

// Search-result limits. Titles are built by pageTitle() in src/data/site.ts,
// which drops the " | Mark the Bagger" suffix rather than overrun 60.
const TITLE_MAX = 60;
const DESC_MIN = 140;
const DESC_MAX = 155;

export default {
  name: 'Titles & meta descriptions',
  run() {
    const problems = [];
    const rows = [];

    for (const page of pages()) {
      const html = page.html;
      const title = decode((html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1]);
      const desc = decode((html.match(/<meta name="description" content="([\s\S]*?)"/) || [, ''])[1]);

      if (!title) problems.push(`${page.route}: no <title>`);
      if (!desc) problems.push(`${page.route}: no meta description`);
      if (title.length > TITLE_MAX) problems.push(`${page.route}: title ${title.length} chars (max ${TITLE_MAX}) — ${title}`);
      if (desc && (desc.length < DESC_MIN || desc.length > DESC_MAX)) {
        problems.push(`${page.route}: description ${desc.length} chars (want ${DESC_MIN}-${DESC_MAX})`);
      }
      // REVIEW_YEAR belongs in the title text, never as a bare "(2026)" tail
      if (/\(20\d\d\)/.test(title)) problems.push(`${page.route}: leftover "(year)" in title — ${title}`);

      rows.push([page.route, title.length, desc.length]);
    }

    return {
      problems,
      summary: `${rows.length} pages: all titles <= ${TITLE_MAX}, all descriptions ${DESC_MIN}-${DESC_MAX}`,
      report: table(['route', 'title', 'desc'], rows),
    };
  },
};
