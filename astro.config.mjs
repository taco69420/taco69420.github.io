// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { pageDates } from './src/data/pageDates.ts';

/**
 * <lastmod> for every route, from the same dates the page itself renders:
 * markdown frontmatter for collection pages, pageDates.ts for static ones.
 * Routes absent from both (privacy, quiz, redlands) get no lastmod rather than
 * a guessed one.
 *
 * The frontmatter is read off disk because astro.config cannot import
 * `astro:content`; only the two date lines are needed, so a full YAML parse
 * would be overkill.
 */
function lastmodByRoute() {
  const routes = {};

  for (const [route, dates] of Object.entries(pageDates)) {
    routes[route] = dates.updated;
  }

  for (const collection of ['methods', 'problems']) {
    const dir = path.join('src/content', collection);
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const source = fs.readFileSync(path.join(dir, file), 'utf8');
      const frontmatter = source.slice(0, source.indexOf('\n---', 3));
      const updated = frontmatter.match(/^updated:\s*(\d{4}-\d{2}-\d{2})/m);
      const published = frontmatter.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);
      const stamp = (updated ?? published)?.[1];
      if (stamp) routes[`/${collection}/${file.replace(/\.md$/, '')}/`] = stamp;
    }
  }

  return routes;
}

const lastmod = lastmodByRoute();

// https://astro.build/config
export default defineConfig({
  site: 'https://howtokillgophers.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // The referral form is noindex, so it has no business in the sitemap.
      filter: (page) => new URL(page).pathname !== '/find-a-trapper/',
      serialize(item) {
        const stamp = lastmod[new URL(item.url).pathname];
        if (stamp) item.lastmod = `${stamp}T00:00:00.000Z`;
        return item;
      },
    }),
  ],
});
