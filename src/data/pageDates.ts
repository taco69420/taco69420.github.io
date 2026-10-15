/**
 * Publish and update dates for the static pages, as ISO `yyyy-mm-dd` strings.
 *
 * Hand-maintained on purpose: bump `updated` only when a page's content
 * meaningfully changes, never for a typo, title or meta-only edit. See
 * "Updating dates" in CLAUDE.md. Collection pages are not listed here — they
 * carry their own `date` / `updated` in markdown frontmatter.
 *
 * This feeds the visible dateline, the Article/HowTo JSON-LD, and the sitemap's
 * <lastmod>, so all three can never drift apart.
 */
export interface PageDates {
  /** Left out where the codebase never recorded a real publish date. */
  published?: string;
  updated: string;
}

export const pageDates: Record<string, PageDates> = {
  "/": { updated: "2026-10-14" },
  "/about/": { updated: "2026-07-08" },
  "/best-gopher-baits/": { updated: "2026-10-14" },
  "/best-gopher-poison/": { updated: "2026-10-14" },
  "/best-gopher-traps/": { updated: "2026-10-14" },
  "/cost/": { updated: "2026-10-14" },
  "/faq/": { updated: "2026-10-14" },
  "/gopher-vs-mole/": { published: "2026-03-11", updated: "2026-07-08" },
  "/methods/": { updated: "2026-10-14" },
  "/problems/": { updated: "2026-07-08" },
  "/quick-start/": { updated: "2026-07-08" },
  "/redlands/": { updated: "2026-10-14" },
  "/seasons/": { updated: "2026-10-14" },
  "/southern-california-gopher-control/": { published: "2026-03-18", updated: "2026-10-14" },
  "/traps/": { updated: "2026-10-14" },
  "/what-attracts-gophers/": { published: "2026-03-18", updated: "2026-07-08" },
  "/what-doesnt-work/": { updated: "2026-07-08" },
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "2026-07-08" -> "July 2026". Read as UTC so the month never shifts under a
 * timezone, which is also how the collection renderers read frontmatter dates.
 */
export function formatDateline(date: string | Date): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Dates for a static route, or undefined for pages with no known date. */
export function datesFor(route: string): PageDates | undefined {
  return pageDates[route];
}

/**
 * The visible dateline for a static route ("Updated July 2026"), or null when
 * the page has no recorded date so the markup renders nothing.
 */
export function updatedLine(route: string): string | null {
  const dates = pageDates[route];
  return dates ? `Updated ${formatDateline(dates.updated)}` : null;
}
