import { pages, decode, table } from './lib.mjs';

/**
 * Two affiliate disclosures run in parallel and neither replaces the other:
 *
 *  1. the footer statement, required by Amazon on every page; and
 *  2. one compact in-page note, only on pages that actually link to Amazon,
 *     merged into the dateline row as "Updated <Month Year> · Has affiliate
 *     links" and pointing at /privacy/#affiliate.
 *
 * It used to be a separate boxed component under the header. The box was
 * redundant with the footer and heavy on mobile, so it is now one muted line.
 * What has to stay true is the part that matters legally: exactly one note, on
 * exactly the pages with Amazon links, above the first one.
 *
 * Detection runs on the finished HTML. The *injection* in Layout.astro reads
 * the rendered slot instead — scanning the whole document there would match
 * CookieBanner's a[href*="amzn.to"] tracking selector and stamp every page.
 */
const AMAZON_LINK = /href=["']https?:\/\/(?:www\.)?(?:amzn\.to|amazon\.com)/i;
const NOTE = /class="affiliate-note"/g;
const FOOTER = /As an Amazon Associate I earn from qualifying purchases/g;
const LABEL = 'I earn a commission from qualifying purchases at no extra cost to you.';

export default {
  name: 'Affiliate disclosure placement',
  run() {
    const problems = [];
    const rows = [];
    let withLinks = 0;

    for (const page of pages()) {
      const html = page.html;
      const hasLink = AMAZON_LINK.test(html);
      const notes = (html.match(NOTE) || []).length;
      const footer = (html.match(FOOTER) || []).length;

      if (footer !== 1) problems.push(`${page.route}: footer Amazon statement appears ${footer} time(s), want exactly 1`);

      if (hasLink) {
        withLinks++;
        if (notes !== 1) {
          problems.push(`${page.route}: ${notes} in-page disclosure note(s), want exactly 1`);
        } else {
          // it has to come before the first Amazon link in document order
          const noteAt = html.search(NOTE);
          const linkAt = html.search(AMAZON_LINK);
          if (noteAt > linkAt) problems.push(`${page.route}: the disclosure note appears after the first Amazon link`);

          // and it has to say what it is, for anyone who cannot see it
          const tag = html.slice(noteAt - 200, noteAt + 400);
          if (!tag.includes(LABEL)) problems.push(`${page.route}: the note is missing the title/aria-label text`);
          if (!/href="\/privacy\/#affiliate"/.test(tag)) problems.push(`${page.route}: the note does not link to /privacy/#affiliate`);
        }
      } else if (notes !== 0) {
        problems.push(`${page.route}: carries an in-page disclosure but has no Amazon links`);
      }

      // the old boxed component must not come back alongside the line
      if (/class="affiliate-disclosure"/.test(html)) {
        problems.push(`${page.route}: the retired AffiliateDisclosure box is back — the note replaced it`);
      }

      rows.push([page.route, hasLink ? 'yes' : 'no', String(notes), String(footer)]);
    }

    return {
      problems,
      summary: `${rows.length} pages: ${withLinks} with Amazon links carry exactly one dateline note above the first link, ${rows.length - withLinks} carry none; footer statement on all`,
      report: table(['route', 'amazon link', 'notes', 'footer'], rows),
    };
  },
};
