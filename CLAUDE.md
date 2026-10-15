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

It must pass. The command builds the site and then runs every check in `scripts/audit/` against `dist/`, printing a PASS/FAIL line each and exiting non-zero if anything fails. Fourteen checks run today:

| check | what it asserts |
| --- | --- |
| `titles` | every page has a title ≤ 60 chars and a description of 140–155, with no leftover `(year)` |
| `dates` | the visible dateline, the JSON-LD `dateModified` and the sitemap `<lastmod>` agree on every route |
| `schema` | every JSON-LD block parses; exactly one `WebSite` and one `Person` per page; no orphan `@id` references; no `Organization` |
| `breadcrumbs` | each `BreadcrumbList` matches the visible trail rung for rung |
| `disclosure` | pages with Amazon links carry `AffiliateDisclosure` before the first one, pages without carry none |
| `sponsored` | every `amzn.to` / `amazon.com` link has `rel="sponsored"` (and `noopener` when `target="_blank"`) |
| `products` | the best-of `positiveNotes` / `negativeNotes` match the visible Pros/Cons verbatim and in order |
| `claims` | no anticoagulant bait is recommended, and no absolute safety claim ("completely safe", "zero risk") appears anywhere in `src/` |
| `firsthand` | every `firsthand: false` page renders the UntestedNote, untested gear is linked only on its own method page, and every best-of product is in `FIRSTHAND_PRODUCTS` |
| `mobile` | no fixed width over 360px without `max-width`, every table has a scroll wrapper, every iframe is fluid |
| `referral` | no service wording or business schema on any page; `/find-a-trapper/` is noindex, out of the sitemap, and carries its disclaimers |
| `figures` | gopher tunnel depth reads 6–12 inches everywhere (all dash types), and no unevidenced method advertises a numeric time-to-results |
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
**Affiliate disclosure is one compact line, not a box.** On the 20 pages that link to Amazon, `Layout.astro` appends ` · Has affiliate links` to that page's existing dateline paragraph, giving `Updated October 2026 · Has affiliate links` pointing at `/privacy/#affiliate`, with the commission sentence in `title` and `aria-label`. The dateline lives in the `<header>`, above every Amazon link on the page, which is what makes it "clear and conspicuous, before the link". The footer Amazon statement is separate and stays on every page. The old boxed `AffiliateDisclosure.astro` is deleted — do not reintroduce it; the audit fails if it comes back.

The note sets its own colour rather than inheriting the dateline's, because **the datelines themselves fail WCAG AA** — measured 2.29–4.43:1 against their own backgrounds. The note is `#4b5563` on light pages (6.92:1) and `#f3f4f6` inside the dark heroes `.hero-dateline`, `.locker-dateline` and `.mission-dateline` (9.10–17.16:1). Restyle a hero and you must re-measure. The dateline text itself is still below AA and is worth fixing on its own.

**The nav wraps on purpose below 880px.** It needs about 794px of items. The container gives 836px at 900px+ but only 577px at 641px, so one row is impossible in that band — a font small enough to fit would be unreadable. The touch treatment (44px targets) therefore starts at 879px instead of 640px, so it wraps deliberately rather than raggedly. One row is preserved from 880px up.

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

**Referral wording is allowed. Service wording is not.** `/find-a-trapper/` is a lead-referral page: a visitor fills in one Google Form and the lead goes to a DPR-licensed pest control company, which may pay a referral fee. So the site may say it will **"get you matched with"** or **"connect you with a licensed local trapper"**, and may describe where the **partner trappers** work. It may never read as though Mark or "we" do the work.

Forbidden anywhere, and failed by `scripts/audit/referral.mjs`: "free estimate", "get a quote from me", "we come out", "our technicians", "service area", "licensed and insured", plus `LocalBusiness`, `HomeAndConstructionBusiness`, `ProfessionalService`, `Service`, `Offer`, `AggregateOffer` and `PestControlService` schema, and the `areaServed` / `serviceArea` / `priceRange` / `openingHours` / `telephone` properties. The referral page itself must carry "I'm not a pest control company", the referral-fee disclosure, the line that the licensed business contacts you directly, and a working fallback link to the form.

`/find-a-trapper/` is **`noindex, follow`** (via `Layout`'s `noindex` prop) and is filtered out of the sitemap in `astro.config.mjs`. It is a thin lead-capture page aimed at commercial-intent queries, so it should not compete in search with the guides. The `dates` check exempts it from the "must be in the sitemap" rule; nothing else is exempt.

**Mark does not offer paid trapping, and nothing on the site may imply he is for hire.** That rules out `LocalBusiness`, `ProfessionalService`, `Service` and `Offer` schema, `areaServed` / `serviceArea` / `priceRange` / `telephone` properties, and any "contact me", "get a quote", "free estimate" or service-area copy. Both pages instead say plainly that he does not do paid trapping and then send the reader to the DIY path.

Both carry a "Hire an Exterminator or Do It Yourself?" section straight after the intro, which is honest about when hiring a pro is the right call. It may only use figures that already exist on `/cost/` — the ~$15 Victor 2-pack and the ~$150–500+ residential pro range. Do not invent prices there.

`NextSteps.astro` is the shared next-step block on both pages (`/quick-start/` then `/best-gopher-traps/`), so the two cannot drift. Note this makes `/cost/` and `/quick-start/` appear twice on `/southern-california-gopher-control/` — once in the new copy and once in the pre-existing related-links card and prose. That is a deliberate exception to the one-link rule, kept because the instruction was to link them from the new sections and the existing mentions are Mark's own prose.

Mark's personal Redlands story ("Where It Started", "The $5 Lesson") stays below the new sections, in his voice, untouched.
## Mobile

The site is read on phones more than desktops, and `body { max-width: 900px }` means the desktop layout is the same at 1280px and 1920px — so "it looks fine on my screen" proves nothing either way. Measure.

**How to measure.** Playwright is not a project dependency (deliberately — it would bloat `npm install` for a static site). Run it through `npx` and point the import at the cached copy:

```sh
npx playwright install chromium          # once
npm run preview                          # serve dist/ on :4321
# then a script importing from the npx cache, e.g.
#   import { chromium } from 'file:///…/npm-cache/_npx/<hash>/node_modules/playwright/index.mjs';
```

Sweep 360, 390 and 412px (412 is the ROG Phone 8 Pro, the device this was reported on) and check `documentElement.scrollWidth > clientWidth` per page, plus computed `font-size` on prose and `getBoundingClientRect().height` on links and buttons.

**The rules the CSS now enforces, in the `@media (max-width: 640px)` block in `Layout.astro`:**

- **Body copy is 16px.** The desktop sizes (0.82–0.95rem) land at 13–15px on a phone. The rules carry `!important` because Astro compiles page-scoped CSS to `.ps-desc[data-astro-cid-xxx]` — specificity (0,2,0) — which outranks any global selector. This is a readability floor, not a style preference. Labels, badges, datelines and `figcaption` are UI chrome and stay small on purpose.
- **Tap targets are 44px.** Nav links were 32px, dropdown buttons 26px, footer links 17px. Inline links inside a sentence are exempt, which is also what WCAG 2.5.8 says — do not try to make them 44px tall.
- **`.btn` is `border-box`.** It used to be `content-box`, so `.btn-quiz { width: 100% }` plus 48px of padding rendered 428px wide in a 412px viewport. That was the only horizontal overflow on the site.

**Measuring the form iframe on `/find-a-trapper/`.** Google Forms is cross-origin, so it cannot report its height to the page and there is no auto-resize. The form also gets *taller* as the viewport narrows, because questions wrap. Measure it by forcing the iframe short so the content overflows, then reading the real height from inside the frame:

```js
await page.evaluate(() => { document.querySelector('iframe').style.height = '600px'; });
const f = page.frames().find((x) => x.url().includes('docs.google.com'));
await f.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
```

Measured content height: **1824px** at 900px+, 1834 at 768, 1878 at 640, 2021 at 480, 2104 at 412, 2163 at 390, 2318 at 360, 2495 at 320. The stepped heights in `find-a-trapper.astro` come from those numbers plus a small buffer. The original 1600/1900 guesses **clipped the Submit button at every width** — if you add or remove a question on the form, re-measure and re-step, because nothing else will catch it.

`scripts/audit/mobile.mjs` is a static backstop only: fixed widths over 360px with no `max-width`, tables with no scroll wrapper, non-fluid iframes, and `content-box` at `width:100%` with padding. It cannot see rendered overflow — that still needs the Playwright sweep.

Known and accepted: the nav wraps to two rows between 641 and 768px, where the desktop nav is still active but the container has shrunk. Below 641px the mobile rules take over. The Brevo newsletter input and button are third-party markup at 38/40px.
## Editorial facts that must not regress

A factual review on 2026-10-14 found the rodenticide pages had been written from an outdated picture of California law, with a citation that contradicted its own source. These are the corrections. `npm run audit` enforces the first two (`scripts/audit/claims.mjs`); the rest are on you.

**First-hand experience: what Mark has and has not used.** This is the single most important editorial fact on the site, because the whole proposition is field experience. No page may state or imply first-hand use of anything in the second list.

*Has personally used:* Victor Easy Set, Victor Black Box, Cinch traps, soil probe, gopher wire mesh, flooding runs (with Taco), the underground bait applicator with zinc phosphide bait, gopher gassers (cartridges), gopher-resistant plants, mole traps, sonic stakes (front yard, heavy season), dog hunting with Taco.

*Has never used:* exclusion fencing, pressurized CO burrow devices, castor oil repellent, hiring a professional trapper, barn owl boxes, diphacinone.

Three mechanisms enforce this, all checked by `scripts/audit/firsthand.mjs`:

- A method page for something untested sets `firsthand: false` in its frontmatter, which renders `UntestedNote.astro` under the header. Never hardcode the note per page.
- An affiliate link for untested gear appears **only** on that gear's own method page, labelled "(not personally tested)". The castor oil, barn owl box and CO device links are not allowed in a best-of roundup, in The Armory, or in any "my kit" context.
- Every product on a best-of page must be listed in `FIRSTHAND_PRODUCTS` in `src/data/bestOfProducts.ts`. A best-of page is a recommendation, and the site only recommends gear it has used. This is why `/best-gopher-baits/` and `/best-gopher-poison/` carry two products each rather than three.

Site-wide claims have to match. "Every recommendation here is based on real field experience" and "Every method below has been field-tested" were both false once five of the thirteen methods were untested; both now say that the untested ones are flagged. `/traps/` may keep "the gear Mark actually uses" only while every product on it is in the first list.
**Anticoagulant baits are prohibited for residential use in California.** CDPR: "Effective January 1, 2024, most uses of the rodenticide diphacinone are prohibited," and those prohibitions "include residential or home uses"; products labelled for prohibited uses "can only be sold to an end user by a DPR-licensed pest control dealer." UC IPM 7433 puts it as chlorophacinone and diphacinone "are no longer legal for residential use in California." Diphacinone may be **named** — to explain the prohibition, or the carcass hazard — but never recommended, preferred, or called the safer option. The audit fails on a mention that carries recommending language without prohibition context.

**Zinc phosphide is the remaining homeowner bait.** UC IPM: 2% zinc phosphide baits are available, with exemptions for home use. Only recommend it where the product label lists pocket gophers.

**The secondary-poisoning comparison runs the opposite way from what the site used to say.** Zinc phosphide is not stored in the animal's tissue; anticoagulants persist in the liver, which is why that class is the one California restricted. The canonical wording lives on `/southern-california-gopher-control/`. The old claim that diphacinone was the lower-risk choice around pets and raptors was wrong and is the single worst error the review found.

**Cartridge fumigation does not work.** UC IPM: "Fumigation with smoke or gas cartridges isn't effective because gophers can seal off their burrows rapidly." Gas cartridges ("gassers") may stay listed, but with that verdict attached and **no "Best …" badge**. They are also a fire hazard — you light them and bury them — so every mention needs the warning: never under or near structures, decks, porches, dry vegetation or mulch, and follow the label. They are not carbon monoxide devices: cartridges are sodium nitrate, sulfur and charcoal, producing oxides of sulfur along with CO. Pressurized CO injection devices are a separate category and a separate page.

**No absolute safety claims, anywhere.** "Completely safe", "100% safe", "totally safe", "perfectly safe", "zero risk", "no risk" and "completely pet-safe" are all banned, including inside `bestOfProducts.ts` pros and JSON-LD strings. The defensible phrasing is **"no rodenticide involved"**. A set trap can still injure a paw; say so. The audit fails the build on any of these strings.

**One trap-check timing: "check daily; if nothing in one to two days, move the trap."** From UC IPM: "If you haven't captured a gopher within 1 to 2 days, reset the traps in a different location." The site previously had five different answers (12 h, 24 h, 12–48 h, 12–72 h, overnight). The `timeToResults` frontmatter field is a different claim — how long until results — and is left alone.

**Other numbers that are pinned to UC IPM 7433.** Feeding burrows 6–12 inches below ground; the nest and food storage chamber as deep as 6 feet; probe "about 4 to 12 inches from the plug side" of the mound; up to 3 litters a year in irrigated sites against 1 in nonirrigated, litters averaging 5–6 young; aluminum phosphide only in burrows "more than 100 feet from any building". Repellents: no repellent has proven effective, and castor bean and similar "haven't been shown to repel gophers". Frightening devices, including vibrating/sonic stakes: "haven't been effective in research trials". Owl boxes: "unlikely to reduce gopher numbers enough to prevent damage", and owls are "unreliable... particularly over small areas such as a yard".

**Gopher tunnel depth is 6–12 inches. Nothing else, anywhere.** UC IPM 7433: "Feeding burrows are usually 6 to 12 inches below ground," with the nest and food storage chamber as deep as 6 feet. The figure **6–18 inches** was wrong and survived three correction passes on `/gopher-vs-mole/`, `/` and `/best-gopher-poison/`, because these ranges use an en dash and `grep "6-18"` cannot match it. `scripts/audit/figures.mjs` now bans that figure outright and tests every dash variant — for anything with a dash in it, trust the audit and not grep. The one permitted exception is `/redlands/`'s "14–18 inches down" in clay, a first-hand observation explicitly flagged as deeper than average, allowlisted in that check.

**Probe distance is "about 4 to 12 inches from the plug side"** of the mound, from the same source.

**A method the research does not support must not advertise a timeframe.** `timeToResults` on `/methods/sonic-stakes/` and `/methods/castor-oil/` reads "Not established by research", and the `speed` cells in `methods.astro` match. A numeric figure there contradicts the page's own copy and fails the audit.

**Sonic stakes are the one hedged method Mark has actually used** — front yard, heavy season, run alongside trapping. `/traps/` states the UC IPM verdict first, then that anecdote explicitly labelled as an anecdote, with no outcome claim, because he was trapping at the same time. Do not turn it back into an efficacy claim.

**Cover the hole — keep this.** UC IPM says "Cover the hole so light doesn't get in," so the advice stays. What was removed is the stronger claim, stated as fact, that light makes a gopher *abandon or seal off* the area. Don't reintroduce it.

**TODO (needs field testing, not a desk edit):** the UC IPM alfalfa guidelines say "Studies have shown the Gophinator and Cinch traps to be more effective than other tested traps," while `/best-gopher-traps/` ranks the Victor Easy Set first and the Gophinator is not on the site at all. Deliberately left as-is — only change the ranking after actually testing a Gophinator.

**Prices live on `/cost/` only.** That page carries no Amazon links, which keeps stated prices away from buy buttons. Don't put a product price on a page that links to Amazon; link to `/cost/` instead.
## Editorial facts to keep consistent

These are site-wide claims that have been corrected before; don't reintroduce variants.

- Mark's tenure is framed as **"trapping gophers since age 15"** / "since 2022" for the site. Not "three decades".
- Mark **does not offer paid trapping**. The site is DIY instruction and affiliate gear; never write copy or schema that implies he can be hired. See "The two location pages".
- **Taco** is the dog: male (he/him), a chihuahua, Mark's former hunting partner, and **has passed away** — write about him in the past tense.
- The dog method requires a **"high-prey-drive dog"**, not a "trained dog".
- Carbon monoxide is **CO**, never CO2.
- Method claims stay hedged where the evidence is thin (sonic stakes, castor oil, flooding); UC IPM is the preferred citation source.
