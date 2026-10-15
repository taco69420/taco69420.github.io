/**
 * Products reviewed on the three best-of pages, in page order.
 *
 * These pages render their quick-picks table, their table of contents and
 * their Pros/Cons lists from this data, and build the Product/Review JSON-LD
 * (positiveNotes / negativeNotes) from the same arrays, so the markup and the
 * structured data cannot drift apart. Removing a product here removes it from
 * all of them at once. Edit the copy here, not in the page markup.
 *
 * Deliberately no ratings, offers or prices: nothing on these pages supports a
 * numeric score, and review snippets without a real rating are the honest shape.
 *
 * Every product listed here must appear in FIRSTHAND_PRODUCTS below. A best-of
 * page is a recommendation, and the site only recommends gear it has actually
 * used. Untested gear lives on its own method page behind an UntestedNote.
 */
export interface ReviewedProduct {
  /** Matches the product section's heading id, so the schema and the anchor agree. */
  id: string;
  name: string;
  /** Label in the table of contents. */
  tocName: string;
  /** Label in the quick-picks table, which is sometimes shorter. */
  tableName: string;
  /** "Best For" cell in the quick-picks table. */
  bestFor: string;
  /** Price tier, rendered as a badge. Never a figure — Amazon prices must come from their API. */
  tier: 'budget' | 'mid' | 'premium';
  /** Affiliate destination for the table's Shop button. */
  url: string;
  pros: string[];
  cons: string[];
}

/**
 * Gear the site owner has personally used in the field. The audit fails if a
 * best-of page lists anything outside this set. See "Editorial facts" in
 * CLAUDE.md for the full first-hand / never-used split.
 */
export const FIRSTHAND_PRODUCTS = [
  "victor-easy-set",
  "victor-black-box",
  "cinch-traps",
  "bait-stations",
  "gassers",
  "soil-probe",
  "gopher-mesh",
  "mole-traps",
  "sonic-stakes",
] as const;

export const bestOfProducts: Record<string, ReviewedProduct[]> = {
  "/best-gopher-traps/": [
    {
      id: "victor-easy-set",
      name: "Victor Easy Set Gopher Trap",
      tocName: "Victor Easy Set Gopher Trap",
      tableName: "Victor Easy Set Gopher Trap",
      bestFor: "Main tunnel intercept, highest catch rate",
      tier: "budget",
      url: "https://amzn.to/4cIJ64V",
      pros: [
        "Among the lowest cost-per-catch of any trap on the market",
        "Fast to set once the technique is dialed in",
        "Durable — same traps can run for years of daily use",
        "High catch rate on correctly located active runs",
        "No bait required (peanut butter behind the trigger helps, but isn't mandatory)",
      ],
      cons: [
        "Spring force can snap fingers during placement — heavy gloves required",
        "Entirely dependent on accurate tunnel location — a bad set catches nothing",
        "Wire ends can wear through thinner gloves over time",
      ],
    },
    {
      id: "victor-black-box",
      name: "Victor Black Box Gopher Trap",
      tocName: "Victor Black Box Gopher Trap",
      tableName: "Victor Black Box Gopher Trap",
      bestFor: "Enclosed design, safer around pets & kids",
      tier: "budget",
      url: "https://amzn.to/4bqUakW",
      pros: [
        "Fully enclosed — no exposed jaws, far safer around pets and kids",
        "Less intimidating to set than an open high-tension wire trap",
        "Weather-resistant plastic housing holds up outdoors for years",
        "Sets with a smaller tunnel opening — less digging per set",
      ],
      cons: [
        "Bulkier than a bare wire trap — needs a slightly wider run to seat",
        "Typically a hair slower to catch than an open wire set in the same run",
        "Costs a little more per trap than the Easy Set",
      ],
    },
    {
      id: "cinch-traps",
      name: "Cinch Traps (Scissor-Jaw Style)",
      tocName: "Cinch Traps (Scissor-Jaw Style)",
      tableName: "Cinch Traps (Scissor-Jaw)",
      bestFor: "Beginners, easier arming, fewer misfires",
      tier: "mid",
      url: "https://amzn.to/4sMH5cR",
      pros: [
        "Scissor-jaw mechanism is significantly more forgiving to arm than Victor wire traps",
        "Fewer accidental misfires during placement in tight or curved tunnels",
        "Good trigger sensitivity when properly aligned in the run",
        "Solid catch rate — competitive with Victor when placement is correct",
      ],
      cons: [
        "More expensive per trap than the Victor Easy Set or Black Box",
        "Slightly bulkier body — harder to fit in narrow tunnel geometries",
        "Alignment is still critical — off-angle and the gopher pushes it aside",
      ],
    },
  ],
  "/best-gopher-baits/": [
    {
      id: "bait-stations",
      name: "Underground Bait Applicator",
      tocName: "Underground Bait Applicator",
      tableName: "Underground Bait Applicator",
      bestFor: "Deep or inaccessible runs, no pets on property",
      tier: "budget",
      url: "https://amzn.to/46XnfTH",
      pros: [
        "Effective on deeply established tunnel systems difficult to reach with traps",
        "Low cost per application relative to the area covered",
        "Can address multiple tunnel runs simultaneously with a single session",
        "Zinc phosphide is the one bait still open to California homeowners, label permitting",
      ],
      cons: [
        "Real secondary poisoning risk to dogs, cats, and raptors that eat affected gophers",
        "Zinc phosphide variants off-gas and require more careful handling",
        "Takes 3–7 days to work — slower than mechanical traps",
        "Anticoagulant baits are prohibited for residential use in California — zinc phosphide only",
        "Requires accurate tunnel location — bait in the wrong spot does nothing",
      ],
    },
    {
      id: "gassers",
      name: "Gopher Gassers (Fumigation Cartridges)",
      tocName: "Gopher Gassers (Fumigation Cartridges)",
      tableName: "Gopher Gassers (Fumigation Cartridges)",
      bestFor: "Mid-depth branching systems, fast deployment",
      tier: "budget",
      url: "https://amzn.to/4b4oF11",
      pros: [
        "Fast to deploy — no probing or precise placement required",
        "Inexpensive per treatment",
      ],
      cons: [
        "UC IPM found cartridge fumigation \"isn't effective because gophers can seal off their burrows rapidly\"",
        "A burning cartridge is a fire hazard — never under or near structures, decks, porches, dry vegetation or mulch",
        "Completely ineffective if any tunnel exit is left unsealed",
        "Keep away from structures — gas can travel underground and enter basements",
        "Results are harder to confirm than mechanical trapping",
      ],
    },
  ],
  "/best-gopher-poison/": [
    {
      id: "bait-stations",
      name: "Underground Bait Applicator",
      tocName: "Underground Bait Applicator",
      tableName: "Underground Bait Applicator",
      bestFor: "Most reliable lethal bait for tunnel placement",
      tier: "budget",
      url: "https://amzn.to/46XnfTH",
      pros: [
        "Highly effective when placed correctly inside an active run",
        "Low cost per treatment area",
        "Can cover multiple tunnel runs in a single application session",
        "Zinc phosphide remains available for home use where the label lists pocket gophers",
      ],
      cons: [
        "Secondary poisoning risk to any animal that eats an affected gopher",
        "Zinc phosphide off-gases and requires a mask plus gloves during application",
        "Anticoagulant baits like diphacinone are prohibited for California residential use",
        "Zinc phosphide can fail outright in damp soil — slower going than trapping",
        "Completely ineffective if placed near the entrance or in an inactive run",
      ],
    },
    {
      id: "gassers",
      name: "Gopher Gassers (Fumigation Cartridges)",
      tocName: "Gopher Gassers (Fumigation Cartridges)",
      tableName: "Gopher Gassers (Fumigation Cartridges)",
      bestFor: "Fast deployment on mid-depth sealed systems",
      tier: "budget",
      url: "https://amzn.to/4b4oF11",
      pros: [
        "Same-day results on a properly sealed system",
        "No precise tunnel placement required — just find an active entrance",
        "Inexpensive per cartridge",
      ],
      cons: [
        "UC IPM found cartridge fumigation \"isn't effective because gophers can seal off their burrows rapidly\"",
        "A burning cartridge is a fire hazard — never under or near structures, decks, porches, dry vegetation or mulch",
        "Completely ineffective if any tunnel exit is left open",
        "Limited penetration in very deep or extensive branching systems",
        "Cannot be used near structures — gas follows underground paths",
        "Results are harder to confirm than mechanical trapping",
        "Requires walking the whole yard to seal every visible exit first",
      ],
    },
  ],
};
