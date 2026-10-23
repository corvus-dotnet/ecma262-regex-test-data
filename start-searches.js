// The family for the searches an engine makes for where a match can start (start-searches.jsonl).
//
// families.js runs this last. As there, everything comes from fixed lists and from a generator with a fixed seed, so
// every run builds the same patterns and texts in the same order.
//
// An engine that does not try every start looks for something every match must hold (a literal after a run of
// loops, a literal inside, one of several alternatives) and works out from where it is found which starts could
// reach it. The Corvus .NET engine's search for a literal after loops (\b\w+n\b) stepped past a start it should have
// tried in two ways: an occurrence of the literal with no run before it can still be the first character of the run
// before a later occurrence (\b\w+n\b over "a nation"), and after a start fails, a later start of the same run can
// pass an assertion before the loops that the first did not (\B\w+n over "xan"). The test data had no pattern and
// text of either shape, so 26.9 million right answers did not find it; a benchmark's count did.
//
// So the patterns here are made of the pieces such a search reasons about: an assertion before the loops (\b, \B,
// ^, $), one to three loops over sets that hold or do not hold the literal, word characters and others, line
// terminators and characters beyond the Basic Multilingual Plane, then a literal or an alternation, then what may
// follow it. Each pattern has texts of its own, built from its literal, from members of its sets and from separators,
// in the shapes that ask where a match starts (separator, literal, run, literal; the literal at the start; the literal
// doubled), and at random, with characters of every width: two- and three-byte UTF-8, surrogate pairs, combining
// sequences, the characters case folding joins to ASCII (the long s, the Kelvin sign) and lone surrogates. Every
// record is also in captures.jsonl, whose answers say where each match is.
'use strict';

const { rng, pick, chance, unique } = require("./families");

const R = String.raw;

// The sets a loop may be over: the set as written, and characters it holds.
const SETS = [
  [R`\w`, ["a", "Z", "0", "_", "n"]],
  [R`\d`, ["0", "7"]],
  [R`[a-z]`, ["a", "q", "n", "s"]],
  [R`[A-Z]`, ["A", "N", "S"]],
  [R`\s`, [" ", "\t", "\n", " "]],
  [R`[^ ]`, ["a", "-", "\u{1F600}", "é", "n"]],
  [R`[^\n]`, ["a", " ", "\u{1F600}", "n"]],
  [R`.`, ["a", " ", "\u{1F600}", "n"]],
  [R`[a-zéè]`, ["é", "a", "n"]],
  [R`[Ѐ-ӿ]`, ["Ж", "ж"]],
  [R`[\u{1F600}-\u{1F64F}]`, ["\u{1F600}", "\u{1F602}"]],
  [R`\p{L}`, ["a", "é", "Ж", "中", "ſ", "n"]],
  [R`[^a-z]`, ["A", "1", " ", "\u{1F600}"]],
  [R`\W`, [" ", "-", "é"]],
  [R`[0-9a-f]`, ["0", "a", "f"]],
  [R`[\s\S]`, ["a", "\n", "\u{1F600}"]],
  [R`[^\w\s]`, ["-", ".", "é", "\u{1F600}"]],
];

// The literals a match may need: as written, and the text it matches.
const LITERALS = [
  ["n", "n"], ["x", "x"], ["a", "a"], ["s", "s"], ["k", "k"], ["S", "S"], ["é", "é"], ["Ж", "Ж"],
  ["中", "中"], ["\u{1F600}", "\u{1F600}"], ["\u{10400}", "\u{10400}"], ["ab", "ab"], ["nn", "nn"], ["-", "-"],
  [" ", " "], [R`\.`, "."], [R`\n`, "\n"], ["on", "on"], ["ét", "ét"],
];

const ASSERTIONS = ["", "", "", "", R`\b`, R`\b`, R`\B`, "^", "$"];
const QUANTIFIERS = ["+", "+", "+", "*", "*", "?", "{1,3}", "{0,4}", "{2,}", "+?"];
const AFTER = ["", "", "", R`\b`, R`\B`, "$", R`\w*`, "(?:x|y)", R`\d`, "."];
const FLAGS = ["", "", "", "i", "m", "s", "im"];

// Characters of every width and of the kinds a search can trip on.
const WIDE = ["\u{1F600}", "\u{10400}", "\u{10428}", "é", "中", "ß", "ſ", "K", "\ud83d",
  "\ude00", "\r\n", " ", "é", "Ж"];
const SEPARATORS = [" ", ".", "-", "\n", "\u{1F600}", " "];

// The texts a pattern is asked about: its seed's text, the shapes that ask where a match starts, and random runs of
// its pieces.
function textsOf(r, literal, sets, seedTexts) {
  const lit = literal[1];
  const variants = unique([lit, lit.toUpperCase(), lit.toLowerCase(),
    ...(lit === "s" || lit === "S" ? ["ſ"] : []), ...(lit === "k" ? ["K"] : [])]);
  const members = sets.flatMap(([, chars]) => chars);
  const run = () => {
    let s = "";
    for (let k = 1 + r() % 4; k > 0; k--) s += pick(r, members);
    return s;
  };
  const shaped = [];
  for (const sep of SEPARATORS) {
    const v = pick(r, variants);
    shaped.push(sep + v + run() + v, run() + sep + v + run() + v, sep + v, v + sep + v + run() + v + sep);
  }
  shaped.push(lit, lit + lit, lit + run() + lit, run() + lit, "", pick(r, WIDE) + lit + run() + lit);
  const pieces = [...variants, ...members, ...SEPARATORS, ...WIDE];
  const random = [];
  for (let made = 0; made < 40 && random.length < 16; made++) {
    let s = "";
    for (let k = 1 + r() % 9; k > 0; k--) s += pick(r, pieces);
    random.push(s);
  }
  return unique([...seedTexts, ...shaped, ...random]).slice(0, 36);
}

// The shapes found while this family was written, each with the text that showed it.
const seeds = [
  [R`\b\w+n\b`, "a nation", ""],
  [R`\b\w+n\b`, "an nation", ""],
  [R`\w+\s+Holmes`, "Holmes Holmes", ""],
  [R`\B\w+n`, "xan", ""],
  [R`\b[^ ]+n`, ".an", ""],
  [R`^[^ ]+n`, "a x\nan", "m"],
  [R`\B[a-z]+\s+Holmes`, "xa Holmes", ""],
];

// The family: its fixed seed and size in generate.js; fuzz.js gives a seed and a size of its own.
function startSearches(seed = 0x57a27001, count = 2000) {
  const r = rng(seed);
  const lists = [];
  const patterns = [];
  const seen = new Set();
  const add = (pattern, flags, literal, sets, seedTexts = []) => {
    const key = flags + "/" + pattern;
    if (seen.has(key)) {
      // A seed's text joins the list of the pattern already made.
      if (seedTexts.length) {
        const p = patterns.find((q) => q.flags + "/" + q.pattern === key);
        lists[p.texts] = unique([...seedTexts, ...lists[p.texts]]);
      }
      return;
    }
    seen.add(key);
    lists.push(textsOf(r, literal, sets, seedTexts));
    patterns.push({ pattern, flags, texts: lists.length - 1 });
  };

  for (const [pattern, text, flags] of seeds) {
    const literal = pattern.endsWith("Holmes") ? ["Holmes", "Holmes"] : ["n", "n"];
    const sets = pattern.includes(R`\s`) ? [SETS[0], SETS[4]] : [pattern.includes("[^ ]") ? SETS[5] : SETS[0]];
    add(pattern, flags, literal, sets, [text]);
  }

  while (patterns.length < count) {
    const flags = pick(r, FLAGS);
    const sets = [];
    for (let k = 1 + (chance(r, 1, 3) ? 1 + r() % 2 : 0); k > 0; k--) sets.push(pick(r, SETS));
    const loops = sets.map(([set]) => set + pick(r, QUANTIFIERS)).join("");
    const literal = pick(r, LITERALS);
    const second = pick(r, LITERALS);
    let pattern;
    switch (r() % 5) {
      case 0:
        // A literal inside: something before the loops that is not an assertion.
        pattern = pick(r, ASSERTIONS) + second[0] + loops + literal[0] + pick(r, AFTER);
        break;
      case 1:
        // An alternation after the loops.
        pattern = pick(r, ASSERTIONS) + loops + "(?:" + literal[0] + "|" + second[0] + ")" + pick(r, AFTER);
        break;
      default:
        pattern = pick(r, ASSERTIONS) + loops + literal[0] + pick(r, AFTER);
    }
    add(pattern, flags, literal, sets);
  }
  return { source: "start-searches", seeds, patterns, texts: [], lists, deviations: true };
}

module.exports = { startSearches };
