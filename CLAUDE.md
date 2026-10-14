# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm install        # install deps (node_modules is not checked in)
npm run dev        # dev server at http://localhost:4321
npm run build      # static build to ./dist
npm run preview    # serve ./dist locally
```

There is no test suite, linter, or formatter in this project. `astro check` is not wired up (`@astrojs/check` + `typescript` are not dependencies), so `npm run build` is the only verification step — it fails on content-collection schema violations and broken imports, which is what catches most mistakes here.

`README.md` is the unmodified Astro starter boilerplate; it is not a source of truth about this site.

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

## Conventions that are easy to break

**Trailing slashes.** `astro.config.mjs` sets `trailingSlash: 'always'`. Every internal link must end in `/` (`/methods/victor-traps/`, not `/methods/victor-traps`). Missing slashes produce 301 redirects that show up as errors in Search Console — three separate commits exist to clean this up.

**JSON-LD.** `Layout.astro` already emits `WebSite` + `Person` schemas on *every* page. Pages pass additional schemas via the `schemas` prop (`FAQPage`, `HowTo`, `Article`, `BreadcrumbList`, `Organization`). Don't re-declare `WebSite` or `Person` in a page — `index.astro` currently does, which is a duplicate. Any FAQ accordion rendered on a page should have a matching `FAQPage` schema, and the answer text must match the visible copy.

**Titles and datelines.** Page titles follow `<Topic> (2026) | … | Mark The Bagger`. Sixteen pages carry `<p class="dateline">Updated July 2026</p>`; the `[slug]` renderers derive theirs from frontmatter `updated ?? date` instead. When refreshing dates, change all of them together — mixed dates have been an audit finding before.

**Affiliate links.** Amazon links are `amzn.to` shortlinks with `target="_blank" rel="sponsored noopener"` (74 of them). Product names must match what the link actually sells — a past audit removed a fictional product name that didn't match its destination. The footer disclosure in `Layout.astro` is required on every page, which it is by virtue of the shared layout.

**Analytics.** `src/components/CookieBanner.astro` holds the GA ID (`G-WGL40V0V8V`) and all analytics logic: GA loads by default, a prior opt-out stored as `localStorage['gdpr-consent'] === 'declined'` blocks it, and a delegated click listener fires an `affiliate_click` event for `amzn.to` / `amazon.com` links. It exposes `window.CookieConsent.showPreferences()`, which `privacy.astro` calls.

## Editorial facts to keep consistent

These are site-wide claims that have been corrected before; don't reintroduce variants.

- Mark's tenure is framed as **"trapping gophers since age 15"** / "since 2022" for the site. Not "three decades".
- **Taco** is the dog: male (he/him), a chihuahua, Mark's former hunting partner, and **has passed away** — write about him in the past tense.
- The dog method requires a **"high-prey-drive dog"**, not a "trained dog".
- Carbon monoxide is **CO**, never CO2.
- Method claims stay hedged where the evidence is thin (sonic stakes, castor oil, flooding); UC IPM is the preferred citation source.
