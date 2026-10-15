import fs from 'node:fs';
import path from 'node:path';
import { ROOT, pages, text, table } from './lib.mjs';

/**
 * Guards the two editorial rules that a factual correction pass established and
 * that are easy to reintroduce by accident. See "Editorial facts" in CLAUDE.md.
 *
 *  1. Anticoagulant baits (diphacinone, chlorophacinone) have been prohibited
 *     for residential use in California since 2024-01-01. They may be NAMED, to
 *     explain the prohibition or the carcass hazard, but never recommended.
 *  2. No absolute safety claims anywhere. Nothing on this site is "completely
 *     safe" — the defensible phrasing is "no rodenticide involved".
 *
 * The check reads the source tree, not dist/, so it also catches a claim sitting
 * in a JSON-LD string or a data file that no page happens to render yet.
 */

// an absolute safety claim, in any casing
const ABSOLUTES = [
  /completely safe/i,
  /100%\s*safe/i,
  /totally safe/i,
  /perfectly safe/i,
  /entirely safe/i,
  /zero risk/i,
  /no risk\b/i,
  /completely pet[- ]safe/i,
  /completely pet and kid safe/i,
  /absolutely safe/i,
  /eliminates all\b/i,
];

/**
 * Overclaims found in a 2026-10-15 credibility sweep: invented-precision
 * numbers (an exact %, angle, or hour-ratio presented as fact with no
 * source) and hype/absolutes that overstate evidence. See CLAUDE.md
 * "Editorial facts that must not regress". These are the literal patterns
 * that regressed, not a blanket ban on the underlying words — e.g. "best"
 * and "permanent" have many legitimate uses on this site and are not here.
 */
const OVERCLAIMS = [
  [/\d+%\s+of the result/i, 'invented-precision percentage with no source'],
  [/off by \d+\s*degrees/i, 'invented-precision angle with no source'],
  [/\bthe number one reason\b/i, 'unsourced ranking claim — use "a common reason"'],
  [/\bdramatically reduc/i, 'unsourced magnitude claim — state the effect without a hype adverb'],
  [/\b(two|three|four|\d+)\s+hours? of .{0,40}(is|dramatically) worth\b/i, 'invented labor-time ratio with no source'],
  [/\bis worth (ten|\d+)\s+hours?\b/i, 'invented labor-time ratio with no source'],
  [/together you'?re unbeatable\b/i, 'absolute/hype claim with no evidence'],
  [/\bfast and effective\b/i, 'unsourced results claim'],
  [/zinc phosphide acts? (in|within)\s*\d/i, 'invented timing — UC IPM only confirms "lethal after a single feeding," no hour window'],
  [/\bcan discourage scouts\b/i, 'unsupported efficacy claim for a method UC IPM found not effective'],
];

// wording that turns a mention of an anticoagulant into a recommendation
const RECOMMENDS = [
  /\bmy (?:preference|pick|choice|go-to)\b/i,
  /\bI (?:use|prefer|reach for|recommend)\b/i,
  /\b(?:is|are) (?:the )?(?:safer|better|smarter|best|preferred|more consistent)\b/i,
  /\blower secondary (?:poisoning )?risk\b/i,
  /\bonly responsible call\b/i,
  /\brecommend(?:ed|s)?\b/i,
  /\bgenerally available\b/i,
  /\bmost (?:consistently )?effective\b/i,
  /\bstable (?:across|in)\b/i,
];

// wording that marks a mention as a prohibition / hazard explanation
const PROHIBITION = [
  /prohibit/i,
  /no longer legal/i,
  /not legal/i,
  /illegal/i,
  /restrict/i,
  /off the table/i,
  /off[- ]limits/i,
  /used to/i,
  /can'?t (?:any ?more|recommend)/i,
  /persist/i,
  /antidote/i,
  /same warning/i,
  /\bnot a budget line\b/i,
  /\bwhich leaves\b/i,
  /\bwon'?t find them recommended\b/i,
];

const ANTICOAG = /diphacinone|chlorophacinone|anticoagulant/i;

function sourceFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules') sourceFiles(p, out);
    } else if (/\.(astro|md|ts|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

// split into sentences, keeping it crude but good enough to scope a claim
const sentences = (s) =>
  s
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .map((x) => x.trim())
    .filter(Boolean);

export default {
  name: 'Editorial claim guards',
  run() {
    const problems = [];
    const rows = [];

    const files = sourceFiles(path.join(ROOT, 'src'));
    let anticoagMentions = 0;

    for (const f of files) {
      const rel = path.relative(ROOT, f).split(path.sep).join('/');
      const raw = fs.readFileSync(f, 'utf8');

      // this audit file itself holds the patterns verbatim
      if (rel.includes('scripts/audit/claims.mjs')) continue;

      raw.split(/\r?\n/).forEach((line, i) => {
        const where = `${rel}:${i + 1}`;

        for (const re of ABSOLUTES) {
          const m = line.match(re);
          if (m) problems.push(`${where}: absolute safety claim "${m[0]}" — use "no rodenticide involved" instead`);
        }

        for (const [re, reason] of OVERCLAIMS) {
          const m = line.match(re);
          if (m) problems.push(`${where}: overclaim "${m[0]}" — ${reason}`);
        }

        if (!ANTICOAG.test(line)) return;
        for (const sent of sentences(line)) {
          if (!ANTICOAG.test(sent)) continue;
          anticoagMentions++;
          const rec = RECOMMENDS.find((re) => re.test(sent));
          const pro = PROHIBITION.some((re) => re.test(sent));
          if (rec && !pro) {
            problems.push(
              `${where}: anticoagulant named with recommending language (${rec.source}) and no prohibition context — ${sent.slice(0, 150)}`
            );
          } else if (!pro) {
            problems.push(
              `${where}: anticoagulant named without prohibition or hazard context — ${sent.slice(0, 150)}`
            );
          } else {
            rows.push([where, sent.slice(0, 80)]);
          }
        }
      });
    }

    // the prohibition itself must be stated somewhere a reader will see it
    const stated = pages().filter((p) => /prohibited for residential use|no longer legal for residential use/i.test(text(p.html)));
    if (!stated.length) {
      problems.push('no built page states the anticoagulant residential prohibition — the correction is not visible to readers');
    }

    return {
      problems,
      summary: `${anticoagMentions} anticoagulant mentions, all prohibition/hazard context; no absolute safety claims; prohibition stated on ${stated.length} pages`,
      report: table(['location', 'anticoagulant mention (scoped sentence)'], rows),
    };
  },
};
