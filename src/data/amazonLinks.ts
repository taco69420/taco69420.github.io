/**
 * Every amzn.to short link used anywhere on the site, paired with the product
 * it was manually verified to point at. This exists because a short link can
 * silently rot or get mistyped, and nothing else catches that — the id tells
 * you nothing on its own.
 *
 * `scripts/audit/amazonLinks.mjs` fails the build on any amzn.to link in the
 * built site that isn't a key here, so a new product box always has to be
 * registered (and verified) before it can ship.
 *
 * Two ids that used to be here were removed after manual verification found
 * the destination didn't match what the page claimed — see "Bad Amazon
 * links" in CLAUDE.md for what they were and why they're gone. Do not
 * re-add '47l872T' or '3P7QFIM' without re-verifying the destination first.
 */
export const AMAZON_LINKS: Record<string, string> = {
  '4cIJ64V': 'Victor Easy Set Gopher Trap',
  '4bqUakW': 'Victor Black Box Gopher Trap',
  '4sMH5cR': 'Cinch Traps (Scissor-Jaw Style)',
  '4lr3Al6': 'Mole Traps',
  '40JUZ3u': 'Gopher Probe',
  '4b9UG87': '1/2-Inch Galvanized Hardware Cloth',
  '46XnfTH': 'Underground Bait Applicator',
  '4b4oF11': 'Gopher Gassers (Fumigation Cartridges)',
  '4sF1zUD': 'Solar Sonic Repeller Stakes',
  '4sKmKFc': 'Barn Owl Nesting Box',
};
