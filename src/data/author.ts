/**
 * Single source of truth for author identity in JSON-LD.
 *
 * The full `Person` node is emitted exactly once per page, by `Layout.astro`.
 * Everything else — `WebSite.publisher`, `Article.author`, `HowTo.author`,
 * `Review.author` — points at it with `authorRef` so there is only ever one
 * description, one image and one `sameAs` list to maintain.
 *
 * Don't inline another `{ "@type": "Person", ... }` anywhere; that is exactly
 * the duplication this module replaced.
 */
export const SITE_URL = "https://howtokillgophers.com";

export const AUTHOR_ID = `${SITE_URL}/about/#mark`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Visible profile links. Rendered in the footer and the about-page bio, and
 *  mirrored into the Person node's `sameAs` below — keep the two in step. */
export const SOCIAL_LINKS = [
  { label: "TikTok", url: "https://www.tiktok.com/@markthegopherbagger" },
  { label: "YouTube", url: "https://www.youtube.com/@ninjafrogtemple5290" },
] as const;

/** Use in place of an inline Person object. */
export const authorRef = { "@id": AUTHOR_ID };

export const authorSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": AUTHOR_ID,
  "name": "Mark the Bagger",
  "url": `${SITE_URL}/about/`,
  "image": `${SITE_URL}/markwt.jpg`,
  "description":
    "Gopher trapping expert from Redlands, CA. Started hunting gophers at 15 for $5 a head. Founder of howtokillgophers.com.",
  "knowsAbout": [
    "gopher control",
    "gopher trapping",
    "pest control",
    "Victor traps",
    "Cinch traps",
    "yard management",
    "burrow fumigation",
  ],
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Redlands",
    "addressRegion": "CA",
    "addressCountry": "US",
  },
  "sameAs": SOCIAL_LINKS.map((link) => link.url),
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  "name": "How To Kill Gophers",
  "url": SITE_URL,
  "description":
    "Field-tested gopher control methods and gear recommendations from Mark the Bagger, who has been trapping gophers since age 15.",
  "publisher": authorRef,
};

/** Home > Page breadcrumb. `name` should match the page's H1. */
export function breadcrumbSchema(name: string, route: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${SITE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": name, "item": `${SITE_URL}${route}` },
    ],
  };
}
