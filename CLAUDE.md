# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm install        # install deps (node_modules is not checked in)
npm run dev        # dev server at http://localhost:4321
npm run build      # static build to ./dist
npm run preview    # serve ./dist locally
npm run audit      # build, then run every SEO/content check (see "Before you push")
```

There is no unit-test suite, linter, or formatter, and `astro check` is not wired up (`@astrojs/check` + `typescript` are not dependencies). The build itself catches content-collection schema violations and broken imports; **everything else is caught by `npm run audit`**, which is the real verification step here.

`README.md` is the unmodified Astro starter boilerplate; it is not a source of truth about this site.

## Before you push

Run:

```sh
npm run audit
```

It must pass. The command builds the site and then runs every check in `scripts/audit/` against `dist/`, printing a PASS/FAIL line each and exiting non-zero if anything fails. Nine checks run today:

| check | what it asserts |
| --- | --- |
| `titles` | every page has a title ≤ 60 chars and a description of 140–155, with no leftover `(year)` |
| `dates` | the visible dateline, the JSON-LD `dateModified` and the sitemap `<lastmod>` agree on every route |
| `schema` | every JSON-LD block parses; exactly one `WebSite` and one `Person` per page; no orphan `@id` references; no `Organization` |
| `breadcrumbs` | each `BreadcrumbList` matches the visible trail rung for rung |
| `disclosure` | pages with Amazon links carry `AffiliateDisclosure` before the first one, pages without carry none |
| `sponsored` | every `amzn.to` / `amazon.com` link has `rel="sponsored"` (and `noopener` when `target="_blank"`) |
| `products` | the best-of `positiveNotes` / `negativeNotes` match the visible Pros/Cons verbatim and in order |
| `links` | every internal href resolves to a real built page, with the trailing slash, and every `#fragment` matches a real id |
| `inbound` | per-page inbound content-link counts, with floors on the money pages and no orphan pages |

Useful flags while iterating: `npm run audit -- --no-build` reuses the existing `dist/`, `--verbose` prints each check's full table, and naming checks runs only those (`npm run audit -- titles links`).

Adding a check is a new `scripts/audit/<name>.mjs` default-exporting `{ name, run() }`, where `run` returns `{ problems: string[], summary, report? }`. The runner picks it up automatically; shared helpers (page list, entity decoding, JSON-LD parsing, `<main>` extraction, anchor parsing) are in `scripts/audit/lib.mjs`.
## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`. Feature work happens on branches (e.g. `seo-sprint`) and merging to `main` publishes to https://howtokillgophers.com. The workflow touches `dist/.nojekyll`; nothing else is needed.

## What this is

A static Astro 5 site — an SEO/affiliate content site about gopher control, written in the first person as "Mark the Bagger". No UI framework integrations, no client islands; the only JS is a handful of `is:inline` scripts. Because the whole point is organic search traffic and Amazon affiliate revenue, SEO details (trailing slashes, JSON-LD, titles, datelines) are load-bearing, not cosmetic — a large share of the commit history is audit fixes to exactly these.

## Architecture

**`src/layouts/Layout.astro` is the entire design system.** Every page wraps in it. It holds the global stylesheet (`<style is:global>` — `.card`, `.btn`, nav, FAQ accordion, breadcrumb, etc.), the nav, the footer with the affiliate disclosure, the Brevo form scripts, and `CookieBanner`. There are no CSS files; page-specific styling is a scoped `<style>` block in that page.

**Nav menus are hardcoded in `Layout.astro`.** The "The Playbook" and "Problems" dropdowns list every method and problem page by hand. Adding a markdown file to a collection does *not* add it to the nav — update the `<ul class="nav-dropdown-menu">` lists too (and the relevant index page, `src/pages/methods.astro` / `problems.astro`).

**Content collections** (`src/content/config.ts`): `methods` (13 entries) and `problems` (11) share one `baseSchema`. All fields are required except `updated`. Two consequences worth knowing:

- `sources` is required by the schema but **never rendered** by any page. Citations are written inline in the markdown prose instead (`*(Source: [...](url))*`). Fill `sources` to satisfy the schema, but put the user-visible citation in the body.
- The markdown bodies contain **raw HTML**: product boxes using `.method-product-box` / `.mpb-*` classes (defined in a `<style is:global>` at the bottom of `src/pages/methods/[slug].astro`), YouTube iframes, and `<figure>` blocks with inline styles. Those classes only exist on method pages.

**`src/pages/methods/[slug].astro` and `problems/[slug].astro`** render the collections and carry per-slug hardcoded data:

- A `relatedLinks` record keyed by slug. New content without an entry renders an empty "Related guides" section.
- Slug-specific conditionals (e.g. the Taco photo on `dog-hunting`, the trap diagram on `victor-traps`).
- A red warning box injected automatically when `petRisk === 'high'`.
- A table of contents generated from the body's `h2` headings, shown only when there are 3+.
- The method page's "Browse all 13 methods" link hardcodes the count.
- `GearForThis.astro` renders the problem pages' "The gear for this" block, inside `<main>` after `<Content />` and before the related-links block. It is shared so all 11 match, and it takes `exclude` — the renderer scans `entry.body` for the gear targets the markdown already links, and those rows drop out rather than giving the same page a second link to the same target.

## Conventions that are easy to break

**Trailing slashes.** `astro.config.mjs` sets `trailingSlash: 'always'`. Every internal link must end in `/` (`/methods/victor-traps/`, not `/methods/victor-traps`). Missing slashes produce 301 redirects that show up as errors in Search Console — three separate commits exist to clean this up.

**JSON-LD.** `src/data/author.ts` is the single source for author identity. It owns the full `Person` node (`@id` `…/about/#mark`) and the `WebSite` node (`@id` `…/#website`), both emitted exactly once per page by `Layout.astro`. Everything else references the author with `authorRef` (`{ "@id": … }`) — never inline another `{ "@type": "Person" }`, which is the duplication this replaced. `Article.publisher` and `HowTo.author` point at the Person too; there is no `Organization` node any more, since the site is a personal brand.

`SOCIAL_LINKS` in the same file is the single source for the TikTok and YouTube profiles: it fills the `Person`'s `sameAs`, the "Follow along" row in the `Layout.astro` footer, and the profile links in the about page bio. Those visible links carry `rel="me noopener"`, which is what makes `sameAs` verifiable rather than an unsupported claim.

Pages pass extra schemas via the `schemas` prop (`FAQPage`, `HowTo`, `Article`, `ItemList`, `BreadcrumbList`).

**Breadcrumbs must match the visible trail**, because that is what Google's guidance asks for. Static pages declare `const crumbLabel = "…"` in the frontmatter, render it as the leaf of the `<nav class="breadcrumb">` trail, *and* pass it to `breadcrumbSchema(crumbLabel, route)` — one const feeding both, so the two cannot drift. The label is the short nav-style wording (`What Doesn't Work`), not the page's editorial H1 (`Let Me Save You Some Money`); several pages differ on purpose. The two `[slug].astro` renderers build their own three-level `BreadcrumbList` (Home > Methods > title, Home > Common Problems > title) from `entry.data.title`, which is also the H1, so they already agree.

`/about/`, `/methods/`, `/problems/` and `/quiz/` show a visible breadcrumb but have no `BreadcrumbList`; add one with the same `crumbLabel` pattern if you want them covered.

Any FAQ accordion rendered on a page should have a matching `FAQPage` schema, and the answer text must match the visible copy.

The three best-of pages add `Article` plus an `ItemList` of `Product` → `Review`, where `positiveNotes` / `negativeNotes` are generated from `src/data/bestOfProducts.ts` — the same arrays that render the visible Pros/Cons lists, so the two cannot drift. No `reviewRating`, `aggregateRating`, `offers` or prices: nothing on those pages supports a numeric score.

**Titles.** Every page builds its title through `pageTitle()` in `src/data/site.ts`, which appends ` | Mark the Bagger` only when the result still fits 60 characters and ships the base title bare otherwise. The review year is `REVIEW_YEAR` in the same file, and belongs only in the three best-of titles plus `/cost/`, `/traps/` and `/seasons/` — not on method or problem pages. All 43 pages go through it, including the two location pages.

**Datelines.** Never hardcoded; they render from the dates described under "Updating dates" below.

**Internal linking.** The best-of pages are the money pages, so method and problem pages are expected to point at them from inside the content, not just from the nav.

- Every `/methods/` page carries at least one content link to a best-of page or to `/traps/`. The mapping follows the method: trap pages to `/best-gopher-traps/`, bait and fumigation pages to `/best-gopher-baits/` and `/best-gopher-poison/`, barrier pages to `/traps/`. Skip it where no best-of page honestly fits rather than forcing one.
- Every `/problems/` page gets the shared `GearForThis` block described above.
- **One link per target per page.** Several bodies already link `/best-gopher-traps/` or `/traps/` inline, so check before adding — this is why the gear block takes `exclude`. Pre-existing duplicates to other targets (`/cost/` links each method twice, once in the table and once in prose) predate this rule and were left alone.
- Anchor text describes the destination: "the gopher traps I actually set", not "click here" or "read more".
- Adding an internal link to a page with no Amazon links does not trip the affiliate disclosure, which matches `amzn.to` / `amazon.com` hrefs only. The 11 problem pages still carry no Amazon links and no disclosure.
**Affiliate links.** Amazon links are `amzn.to` shortlinks with `target="_blank" rel="sponsored noopener"` (74 of them). Product names must match what the link actually sells — a past audit removed a fictional product name that didn't match its destination. The footer disclosure in `Layout.astro` is required on every page, which it is by virtue of the shared layout. Two disclosures run in parallel and neither replaces the other: the footer line in `Layout.astro` (`As an Amazon Associate I earn from qualifying purchases`, required by Amazon on every page) and `AffiliateDisclosure.astro`, which `Layout.astro` injects just under the page header on any page whose own content contains an Amazon link. That detection runs on the rendered default slot, not the finished document — scanning the whole document would match `CookieBanner`'s `a[href*="amzn.to"]` tracking selector and stamp a disclosure onto every page.

**Analytics.** `src/components/CookieBanner.astro` holds the GA ID (`G-WGL40V0V8V`) and all analytics logic: GA loads by default, a prior opt-out stored as `localStorage['gdpr-consent'] === 'declined'` blocks it, and a delegated click listener fires an `affiliate_click` event for `amzn.to` / `amazon.com` links. It exposes `window.CookieConsent.showPreferences()`, which `privacy.astro` calls.

## Updating dates

There is one date per page, in one place:

- **Collection pages** — `date` (published) and `updated` (modified) in the markdown frontmatter.
- **Static pages** — `src/data/pageDates.ts`, keyed by route. `published` is left out where the codebase never recorded a real publish date; don't invent one.

Both feed three outputs at once: the visible dateline (`updatedLine()` / `formatDateline()`), the `Article` / `HowTo` JSON-LD `datePublished` / `dateModified`, and the sitemap's `<lastmod>`. The sitemap's `serialize` hook in `astro.config.mjs` reads collection frontmatter off disk with a regex, because config files cannot import `astro:content`. Change a date in one place and all three move together.

**Bump `updated` only when a page's content meaningfully changes** — new or rewritten guidance, a changed recommendation, a different product. Never for a typo, a title change, or a meta-description edit. Dates are deliberately *not* derived from git history: an audit pass that touches every file would otherwise advertise the whole site as freshly updated.

Each page keeps its own dateline class (`.dateline`, `.hero-dateline`, `.cal-dateline`, `.locker-dateline`, `.mission-dateline`, `.diag-dateline`, `.waste-dateline`, `.redlands-dateline`) because each is coloured for its own hero. Only the text is shared.

Routes with no recorded date — `/privacy/` and `/quiz/` — render no dateline and get no `lastmod`. 41 of the 43 routes carry one.

## The two location pages

`/redlands/` and `/southern-california-gopher-control/` are the highest-impression pages in Search Console and they rank for commercial-intent queries — "gopher control redlands", "gopher exterminator redlands", "gopher control southern california". The people landing there are usually looking to hire somebody.

**Mark does not offer paid trapping, and nothing on the site may imply he is for hire.** That rules out `LocalBusiness`, `ProfessionalService`, `Service` and `Offer` schema, `areaServed` / `serviceArea` / `priceRange` / `telephone` properties, and any "contact me", "get a quote", "free estimate" or service-area copy. Both pages instead say plainly that he does not do paid trapping and then send the reader to the DIY path.

Both carry a "Hire an Exterminator or Do It Yourself?" section straight after the intro, which is honest about when hiring a pro is the right call. It may only use figures that already exist on `/cost/` — the ~$15 Victor 2-pack and the ~$150–500+ residential pro range. Do not invent prices there.

`NextSteps.astro` is the shared next-step block on both pages (`/quick-start/` then `/best-gopher-traps/`), so the two cannot drift. Note this makes `/cost/` and `/quick-start/` appear twice on `/southern-california-gopher-control/` — once in the new copy and once in the pre-existing related-links card and prose. That is a deliberate exception to the one-link rule, kept because the instruction was to link them from the new sections and the existing mentions are Mark's own prose.

Mark's personal Redlands story ("Where It Started", "The $5 Lesson") stays below the new sections, in his voice, untouched.
## Editorial facts to keep consistent

These are site-wide claims that have been corrected before; don't reintroduce variants.

- Mark's tenure is framed as **"trapping gophers since age 15"** / "since 2022" for the site. Not "three decades".
- Mark **does not offer paid trapping**. The site is DIY instruction and affiliate gear; never write copy or schema that implies he can be hired. See "The two location pages".
- **Taco** is the dog: male (he/him), a chihuahua, Mark's former hunting partner, and **has passed away** — write about him in the past tense.
- The dog method requires a **"high-prey-drive dog"**, not a "trained dog".
- Carbon monoxide is **CO**, never CO2.
- Method claims stay hedged where the evidence is thin (sonic stakes, castor oil, flooding); UC IPM is the preferred citation source.
