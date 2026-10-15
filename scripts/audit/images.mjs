import { pages, table } from './lib.mjs';

/**
 * Every <img> must carry explicit width and height so the browser can reserve
 * its box before the image loads — otherwise the page reflows once each image
 * arrives, which is the layout-shift bug this check exists to catch.
 */
export default {
  name: 'Image dimensions',
  run() {
    const problems = [];
    let total = 0;
    let missing = 0;

    for (const page of pages()) {
      for (const m of page.html.matchAll(/<img\b([^>]*)>/g)) {
        total++;
        const attrs = m[1];
        const hasWidth = /\bwidth\s*=\s*["']?\d+/.test(attrs);
        const hasHeight = /\bheight\s*=\s*["']?\d+/.test(attrs);
        if (!hasWidth || !hasHeight) {
          missing++;
          const src = (attrs.match(/src\s*=\s*["']([^"']*)["']/) || [, '(no src)'])[1];
          const want = [!hasWidth && 'width', !hasHeight && 'height'].filter(Boolean).join(' and ');
          problems.push(`${page.route}: <img src="${src}"> is missing ${want}`);
        }
      }
    }

    return {
      problems,
      summary: `${total} <img> tags, ${total - missing} with explicit width and height`,
      report: table(['what', 'count'], [['img tags', String(total)], ['missing dimensions', String(missing)]]),
    };
  },
};
