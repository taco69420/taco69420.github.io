import { pages, anchors, table } from './lib.mjs';

// Every Amazon affiliate link must be marked rel="sponsored" (Google's
// requirement for paid/affiliate links). The site convention is
// target="_blank" rel="sponsored noopener", so noopener is checked too --
// without it, target="_blank" hands the new tab a window.opener reference.
const AMAZON = /^https?:\/\/(?:www\.)?(?:amzn\.to|amazon\.com)/i;

export default {
  name: 'Amazon links are rel="sponsored"',
  run() {
    const problems = [];
    const rows = [];
    let total = 0;

    for (const page of pages()) {
      let n = 0;
      for (const a of anchors(page.html)) {
        if (!a.href || !AMAZON.test(a.href)) continue;
        total++;
        n++;
        const rel = a.rel.toLowerCase().split(/\s+/).filter(Boolean);
        if (!rel.includes('sponsored')) {
          problems.push(`${page.route}: Amazon link without rel="sponsored" -> ${a.href}  (anchor: "${a.text}")`);
        }
        if (a.target === '_blank' && !rel.includes('noopener')) {
          problems.push(`${page.route}: target="_blank" Amazon link without rel="noopener" -> ${a.href}`);
        }
      }
      if (n) rows.push([page.route, n]);
    }

    if (!total) problems.push('no Amazon links found at all — the detection is probably broken');

    return {
      problems,
      summary: `${total} Amazon links across ${rows.length} pages, every one rel="sponsored"`,
      report: table(['route', 'amazon links'], rows),
    };
  },
};
