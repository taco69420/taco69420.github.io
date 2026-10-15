/**
 * Products reviewed on the three best-of pages, in page order.
 *
 * These pages render their Pros/Cons lists from this data, and build the
 * Product/Review JSON-LD (positiveNotes / negativeNotes) from the same arrays,
 * so the markup and the structured data cannot drift apart. Edit the copy here,
 * not in the page markup.
 *
 * Deliberately no ratings, offers or prices: nothing on these pages supports a
 * numeric score, and review snippets without a real rating are the honest shape.
 */
export interface ReviewedProduct {
  /** Matches the product section's heading id, so the schema and the anchor agree. */
  id: string;
  name: string;
  pros: string[];
  cons: string[];
}

export const bestOfProducts: Record<string, ReviewedProduct[]> = {
  "/best-gopher-traps/": [
    {
      id: "victor-easy-set",
      name: "Victor Easy Set Gopher Trap",
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
      pros: [
        "Scissor-jaw mechanism is significantly more forgiving to arm than Victor wire traps",
        "Fewer accidental misfires during placement in tight or curved tunnels",
        "Good trigger sensitivity when properly aligned in the run",
        "Solid catch rate — competitive with Victor when placement is correct",
      ],
      cons: [
        "More expensive per trap than the Victor Easy Set or Black Box",
        "Slightly bulkier body — harder to fit in narrow tunnel geometries",
        "Alignment is still critical — off by 15 degrees and the gopher pushes it aside",
      ],
    },
  ],
  "/best-gopher-baits/": [
    {
      id: "bait-stations",
      name: "Underground Bait Applicator",
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
    {
      id: "castor-oil",
      name: "Castor Oil Gopher Repellent Concentrate",
      pros: [
        "No rodenticide involved — nothing for a dog or a hawk to be poisoned by",
        "No license or permit required",
        "Easy to apply with a hose-end sprayer",
        "Useful for protecting specific high-value zones during active trapping campaigns",
      ],
      cons: [
        "UC IPM has not found repellents effective at protecting plantings from gophers",
        "Not a kill method — at best gophers relocate, they don't die",
        "Breaks down after rain or irrigation and needs reapplication every 1–2 weeks",
        "Won't hold an established gopher that's heavily invested in a tunnel system",
        "Treats symptoms, not the underlying population",
      ],
    },
  ],
  "/best-gopher-poison/": [
    {
      id: "bait-stations",
      name: "Underground Bait Applicator",
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
    {
      id: "co-burrow",
      name: "CO Burrow Treatment Device",
      pros: [
        "Most thorough coverage of complex, deep tunnel networks",
        "Active gas injection reaches areas cartridge gassers can't penetrate",
        "Same-day to 48-hour results on properly treated systems",
        "No residual chemical in soil after treatment",
      ],
      cons: [
        "Higher cost per treatment than cartridge gassers or bait pellets",
        "Requires more setup — pre-sealing secondary openings before injection",
        "Cannot be used near structures, enclosed spaces, or buildings",
        "CO is odorless and lethal — requires a personal CO monitor during use",
        "Check local regulations and label legality before first use",
      ],
    },
  ],
};
