export const REVIEW_YEAR = 2026;
export const SITE_NAME = "Mark the Bagger";

const SUFFIX = ` | ${SITE_NAME}`;
const MAX_TITLE = 60;

/**
 * Appends the brand suffix only when the result still fits in 60 characters,
 * which is the point search results start truncating. Longer base titles ship
 * bare rather than getting cut off mid-brand.
 */
export function pageTitle(base: string): string {
  return base.length + SUFFIX.length <= MAX_TITLE ? base + SUFFIX : base;
}
