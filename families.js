// The families of patterns: each one is built around a class of fault found by testing implementations against V8.
//
// generate.js runs this after it has written its own three files. Everything here comes from fixed lists and from
// generators with fixed seeds, so every run builds the same patterns and texts in the same order.
//
// A family has
//   seeds     the patterns that found the fault, each with the text it failed on, written by hand;
//   patterns  the seeds, then the patterns that a small grammar builds around them;
//   texts     the texts every pattern of the family is matched against, the seeds' texts among them.
'use strict';

// xorshift32, as in generate.js. Each family has a generator of its own, so that changing one family leaves the
// others, and the three files that generate.js builds itself, as they were.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s;
  };
}

const pick = (r, list) => list[r() % list.length];
const chance = (r, n, outOf) => r() % outOf < n;

function unique(list) {
  return [...new Set(list)];
}

// Every text of up to maxLength characters over the alphabet, shortest first.
function exhaustive(alphabet, maxLength) {
  const all = [""];
  let last = [""];
  for (let n = 1; n <= maxLength; n++) {
    const now = [];
    for (const t of last) for (const c of alphabet) now.push(t + c);
    all.push(...now);
    last = now;
  }
  return all;
}

// The fixed texts, then count more that are each a run of pieces drawn at random, as generate.js makes its texts.
function withRandomTexts(r, fixed, pieces, count, fewest, most, maxLength) {
  const all = unique(fixed);
  const seen = new Set(all);
  for (let made = 0; made < count;) {
    const n = fewest + r() % (most - fewest + 1);
    let s = "";
    for (let k = 0; k < n; k++) s += pick(r, pieces);
    if (s.length > maxLength || seen.has(s)) continue;
    seen.add(s);
    all.push(s);
    made++;
  }
  return all;
}

// The seeds, then the systematic patterns, then patterns from the random grammar until there are total in all.
function assemble(seeds, systematic, random, total) {
  const all = unique([...seeds.map((s) => s[0]), ...systematic]);
  if (all.length > total) throw new Error("the fixed patterns alone are more than " + total);
  const seen = new Set(all);
  while (all.length < total) {
    const p = random();
    if (seen.has(p)) continue;
    seen.add(p);
    all.push(p);
  }
  return all;
}

// ---------------------------------------------------------------------------------------------------------------
// Anchors and assertions inside list-like and alternation shapes.
//
// An implementation that recognises a shape such as ^head(sep item)*$, a prefix, a suffix, an alternation of literals
// or a sequence of classes, and matches it without a regular expression engine, has to notice an anchor or an
// assertion anywhere inside the shape. Each seed is a pattern on which one did not.
// ---------------------------------------------------------------------------------------------------------------

const anchoredListSeeds = [
  ["^x(,a$)*$", "x,a,a"], ["^x(?:,a$)*$", "x,a,a"], ["^x(,a$)+$", "x,a,a"],
  ["^x$(,a)*$", "x,a"], ["^(x$)(,a)*$", "x,a"], ["^(?:x$)(,a)+$", "x,a"],
  ["^$(,a)*$", ",a"],
  ["^(a,$)*b$", "a,b"], ["^(?:a,$)*b$", "a,b"], ["^(a,$)+b$", "a,b"],
  ["^([a-z]+)(\\.[a-z]+$)*$", "a.b.c"],
  ["^([a-z]+\\.$)*[a-z]+$", "a.b"],
  ["^(a*,)+,$", "a,,"],
  ["^(?:a.)+a{2}$", "aaaaaa"],
  ["^([a-z]+\\.)*.$", "a.b"],
  ["(a|b$)", "ax"],
  ["(^a|b)", "xb"],
];

// The shapes, with no assertion inside them. Every assertion below is put into every gap of every one.
const anchoredListShapes = [
  "^x(,a)*$", "^x(?:,a)*$", "^x(,a)+$", "^x(,a)?$", "^x(,a){2}$", "^x(?:,a){1,}$", "^x(,a){0,2}$",
  "^(x)(,a)*$", "^(?:x)(,a)+$",
  "^(a,)*b$", "^(?:a,)*b$", "^(a,)+b$", "^(a,){1,2}b$",
  "^([a-z]+)(\\.[a-z]+)*$", "^([a-z]+\\.)*[a-z]+$", "^[a-z]+(?:-[a-z]+)*$",
  "^(a*,)+,$", "^(?:a.)+a{2}$", "^([a-z]+\\.)*.$",
  "(a|b)", "(?:a|b|x)", "^(a|b)$", "^(?:a|b),(?:a|x)$", "^(a|b|x)+$", "^(?:ab|x)*$",
  "^x-", "-x$", "^x,a", "a,b$", "^ab", "^a.b$",
  "^[a-z][a-z]$", "^[a-z]+,[a-z]+$", "^[ab]+[.-][ax]*$", "^[^,]+,[^,]+$", "^[a-z]{2}\\.[a-z]{1,}$",
  "^x((,a))*$", "^(?:x(?:,(a))*)$", "^((a,)+)b$", "^(?:(?:a|b),)*x$",
];

const anchoredListAssertions = [
  "^", "$", "\\b", "\\B", "(?=a)", "(?!a)", "(?<=a)", "(?<!a)", "(?=$)", "(?!$)", "(?<=^)", "(?<!^)", "\\$", "\\^",
];

// The terms of a pattern: a group's opening, its closing with its quantifier, an alternation bar, or an atom with its
// quantifier. A gap is a place between two terms, or at either end.
const quantifier = "(?:[*+?]|\\{\\d+(?:,\\d*)?\\})?\\??";
const term = new RegExp("\\(\\?<?[=!]|\\(\\?:|\\(|\\)" + quantifier + "|\\\\." + quantifier
  + "|\\[(?:\\\\.|[^\\]])*\\]" + quantifier + "|\\||[^]" + quantifier, "g");

function inEveryGap(shape, insertions) {
  const terms = shape.match(term);
  const all = [];
  for (let gap = 0; gap <= terms.length; gap++) {
    for (const x of insertions) all.push(terms.slice(0, gap).join("") + x + terms.slice(gap).join(""));
  }
  return all;
}

function anchoredLists() {
  const r = rng(0x1157a001);
  const heads = ["x", "x", "a", "[a-z]+", "[a-z]", "a*", "a+", "ab", "\\w+", "[^,]+", "a?", "x{2}", ""];
  const separators = [",", ",", "\\.", "-", "[,.-]", "."];
  const items = ["a", "a", "b", "[a-z]+", "[a-z]", "a*", "[ab]", "ab", "a{2}", "\\w+", "[^,]*", "."];
  const literals = ["a", "b", "x", "ab", "a,", "x-", ",a", "a\\.b", "-", "\\$", "\\^"];
  const classes = ["[a-z]", "[ab]", "[^,]", "[a-z0-9]", "[,.-]", "\\w", "[^a]", "."];
  const lookBodies = ["a", "b", "x", ",", "\\.", "$", "^", "[a-z]", ",a", "a,", ".", "-", "\\b", "x$", "^x"];
  const quantifiers = ["*", "*", "*", "+", "+", "?", "{2}", "{1,}", "{2,}", "{0,2}", "{1,3}", "*?", "+?", "{2,3}?"];
  const open = () => pick(r, ["(", "(", "(?:"]);
  const quant = () => pick(r, quantifiers);
  const assertion = () => {
    switch (r() % 10) {
      case 0: case 1: return "$";
      case 2: case 3: return "^";
      case 4: return "\\b";
      case 5: return "\\B";
      case 6: return pick(r, ["\\$", "\\^"]);
      default: return pick(r, ["(?=", "(?!", "(?<=", "(?<!"]) + pick(r, lookBodies) + ")";
    }
  };
  // An assertion in n gaps out of every outOf, and nothing in the others.
  // One in sixteen of them has a quantifier of its own, which is a syntax error for most assertions.
  const a = (n, outOf) => (chance(r, n, outOf) ? assertion() + (chance(r, 1, 16) ? quant() : "") : "");
  const start = () => (chance(r, 5, 6) ? "^" : "");
  const end = () => (chance(r, 5, 6) ? "$" : "");

  const random = () => {
    switch (r() % 9) {
      case 0: // head, then a repeated separator and item
        return start() + a(1, 6) + pick(r, heads) + a(1, 4) + open() + a(1, 4) + pick(r, separators) + a(1, 4)
          + pick(r, items) + a(1, 3) + ")" + quant() + a(1, 6) + end();
      case 1: // a repeated item and separator, then a tail
        return start() + a(1, 6) + open() + a(1, 4) + pick(r, items) + a(1, 4) + pick(r, separators) + a(1, 3) + ")"
          + quant() + a(1, 4) + pick(r, items) + a(1, 6) + end();
      case 2: // the head in a group of its own
        return start() + open() + a(1, 4) + pick(r, heads) + a(1, 2) + ")" + a(1, 6) + open() + pick(r, separators)
          + a(1, 6) + pick(r, items) + a(1, 3) + ")" + quant() + end();
      case 3: // the repeated group inside another group
        return start() + pick(r, heads) + open() + a(1, 4) + open() + pick(r, separators) + a(1, 4) + pick(r, items)
          + a(1, 3) + ")" + (chance(r, 1, 3) ? quant() : "") + a(1, 3) + ")" + quant() + a(1, 6) + end();
      case 4: { // an alternation of literals, with assertions on single alternatives
        const n = 2 + r() % 3;
        const alternatives = [];
        for (let k = 0; k < n; k++) alternatives.push(a(1, 3) + pick(r, literals) + a(1, 3));
        return (chance(r, 1, 2) ? "^" : "") + open() + alternatives.join("|") + ")"
          + (chance(r, 1, 3) ? quant() : "") + (chance(r, 1, 3) ? pick(r, literals) : "") + (chance(r, 1, 2) ? "$" : "");
      }
      case 5: // a prefix
        return a(1, 4) + "^" + a(1, 3) + pick(r, literals) + a(1, 2) + (chance(r, 1, 2) ? pick(r, items) : "")
          + a(1, 6);
      case 6: // a suffix
        return a(1, 6) + (chance(r, 1, 2) ? pick(r, items) : "") + a(1, 2) + pick(r, literals) + a(1, 3) + "$"
          + a(1, 4);
      case 7: { // a sequence of classes
        const n = 2 + r() % 3;
        let s = start() + a(1, 6);
        for (let k = 0; k < n; k++) {
          s += pick(r, classes) + (chance(r, 1, 2) ? pick(r, ["+", "*", "?", "{2}", "{1,2}", "{2,}"]) : "") + a(1, 3);
        }
        return s + end();
      }
      default: // the list inside a lookaround, or after one
        return start() + pick(r, heads) + pick(r, ["(?=", "(?!", "(?<=", "(?<!"]) + a(1, 4) + open()
          + pick(r, separators) + pick(r, items) + a(1, 3) + ")" + quant() + a(1, 2) + ")" + (chance(r, 1, 2)
            ? open() + pick(r, separators) + pick(r, items) + ")" + quant() : "") + end();
    }
  };

  const systematic = [];
  for (const shape of anchoredListShapes) systematic.push(...inEveryGap(shape, anchoredListAssertions));
  const patterns = assemble(anchoredListSeeds, [...anchoredListShapes, ...systematic], random, 6000);

  const texts = withRandomTexts(r, [
    ...exhaustive(["a", "b", "x", ",", ".", "-"], 1),
    ...anchoredListSeeds.map((s) => s[1]),
    "x,a,a,a", "a,a,b", "a,b,", ",a,a", "x,", "x,b", "xa", "aa", "ab", "ba", "a,", "a,a", "a.b.", ".a.b", "a-b",
    "x-", "-x", "x-a", "a.", "ab.ab", "ab,ab", "a,x", "b,x", "a$", "$", "^a", "x$,a", "x,a$", "a,$b", "a\n",
    "x,a\n",
  ], ["a", "a", "b", "x", ",", ",", ".", "-", "a,", ",a", "x,a", "a.b", "ab", "aa"], 10, 2, 5, 8);

  return { source: "anchored-lists", seeds: anchoredListSeeds, patterns, texts };
}

// ---------------------------------------------------------------------------------------------------------------
// Counted groups whose body can match the empty string.
//
// ECMA-262 says exactly what a repeated group does when an iteration matches nothing: the iterations up to the
// minimum may be empty, and an empty one after the minimum is refused. Host engines differ here, and some of them
// leave the loop early, loop for ever, or give a different answer.
// ---------------------------------------------------------------------------------------------------------------

const emptyLoopSeeds = [
  ["(^|x){2}a", "xa"],
  ["^(?:-|(?!$)){2}$", "-"],
  ["(\\b|a){2}a$", "aa"],
  ["(?:(?=x)|^)*?$", "x"],
  ["(?:$a[^a]|^|x){2,3}((?!$)){2,}?a$", "x"],
  ["((?<!a)|(|){2,3}?(?!$)[ax])+$", "a"],
  ["(?<=(?:a+|)+)x", "x"],
];

// Shapes written by hand, each with every count below.
const emptyLoopShapes = [
  "(^|x)#a", "^(?:-|(?!$))#$", "(\\b|a)#a$", "(?:(?=x)|^)#$", "((?!$))#a$", "(|)#", "(?:|a)#$", "^(a|)#$",
  "^(a?)#$", "^(a*)#x", "^(?:a*)#$", "(?:^)#a", "(?:$)#", "^(?:\\b)#a", "(?:\\B)#-", "^(?:(a)|\\1)#$",
  "^(?:\\1(a))#$", "^(\\1)#a", "^(?:(a)?\\1)#x$", "(?<=(?:a+|)#)x", "(?<=(|a)#)x", "(?=(?:|x)#a)", "^(?:(?=a)|a)#$",
  "^(?:(?!a)|x)#$", "^(?:(?<=a)|a)#$", "^(?:(?<!x)|x)#a", "^((|a)#)#$", "^(?:(?:a?)#x?)#$", "^(()|a)#\\2$",
  "^(?:a|()|x)#\\1-", "^(?:(a)|())#\\1\\2$", "^(?:()|(a))#\\2$",
];
const emptyLoopCounts = [
  "{0}", "{1}", "{2}", "{3}", "{4}", "{0,}", "{1,}", "{2,}", "{3,}", "{0,1}", "{0,2}", "{1,2}", "{2,3}", "{2,4}",
  "{3,4}", "{4,5}", "*", "+", "?", "{2}?", "{2,}?", "{0,2}?", "{2,3}?", "{1,}?", "*?", "+?", "??",
];

function emptyLoops() {
  const r = rng(0xe3b7100b);
  let groups = 0;
  const capture = (body) => { groups++; return "(" + body + ")"; };
  const literal = () => pick(r, ["a", "a", "a", "x", "x", "-", "[ax]", "[^a]", "."]);
  const count = () => {
    const n = r() % 5;
    let q;
    switch (r() % 8) {
      case 0: case 1: case 2: q = "{" + n + "}"; break;
      case 3: case 4: q = "{" + n + ",}"; break;
      case 5: case 6: q = "{" + n + "," + (n + r() % 3) + "}"; break;
      default: q = pick(r, ["*", "+", "?"]);
    }
    return q + (chance(r, 1, 3) ? "?" : "");
  };
  const look = (depth) => pick(r, ["(?=", "(?!", "(?<=", "(?<!"])
    + (depth < 3 ? alternation(depth + 1) : pick(r, ["a", "x", "$", "^", "", "-"])) + ")";
  // Something that matches the empty string at some positions and not at others, or at all of them.
  const assertion = (depth) => {
    switch (r() % 12) {
      case 0: return "^";
      case 1: return "$";
      case 2: return "\\b";
      case 3: return "\\B";
      case 4: return "(?!$)";
      case 5: return "(?=x)";
      case 6: return "(?<!a)";
      case 7: return "(?<=a)";
      case 8: return "(?<!^)";
      default: return look(depth);
    }
  };
  const group = (depth) => {
    if (chance(r, 1, 2)) {
      groups++;
      return "(" + alternation(depth) + ")";
    }
    return "(?:" + alternation(depth) + ")";
  };
  const part = (depth) => {
    switch (r() % 14) {
      case 0: case 1: case 2: return literal();
      case 3: case 4: case 5: case 6: return assertion(depth);
      case 7: return "\\" + (groups === 0 ? 1 : 1 + r() % groups);
      case 8: return literal() + pick(r, ["?", "*", "??", "*?"]);
      case 9: return pick(r, [() => capture("|"), () => capture(""), () => "(?:)", () => capture("|a"),
        () => capture("a|")])();
      case 10: case 11: case 12: return depth < 3 ? group(depth + 1) + count() : literal();
      default: return literal();
    }
  };
  const sequence = (depth) => {
    const n = depth < 3 ? pick(r, [0, 1, 1, 1, 2, 2]) : pick(r, [0, 1, 1, 2]);
    let s = "";
    for (let k = 0; k < n; k++) s += part(depth);
    return s;
  };
  function alternation(depth) {
    const n = depth < 3 ? pick(r, [1, 2, 2, 3]) : pick(r, [1, 1, 2]);
    const alternatives = [];
    for (let k = 0; k < n; k++) alternatives.push(sequence(depth));
    return alternatives.join("|");
  }
  const random = () => {
    groups = 0;
    let p = pick(r, ["", "", "^"]) + group(1) + count();
    if (chance(r, 1, 3)) p += group(1) + count();
    return p + pick(r, ["", "$", "$", "a", "a$", "x", "x$"]);
  };

  const systematic = [];
  for (const shape of emptyLoopShapes) {
    for (const c of emptyLoopCounts) systematic.push(shape.replaceAll("#", c));
  }
  const patterns = assemble(emptyLoopSeeds, systematic, random, 7000);

  const texts = withRandomTexts(r, [
    ...exhaustive(["a", "x", "-"], 3),
    ...emptyLoopSeeds.map((s) => s[1]),
    "aaaa", "xaxa", "aaax", "xxxa", "a-a-",
  ], ["a", "a", "x", "-"], 5, 4, 5, 5);

  return { source: "empty-loops", seeds: emptyLoopSeeds, patterns, texts };
}

// ---------------------------------------------------------------------------------------------------------------
// Line terminators at the ends of the text.
//
// Without the m flag, $ holds only at the very end of the text and ^ only at the very start. In several host engines
// the default $ also holds before a final line feed. The dot refuses the four line terminators of ECMA-262 (line
// feed, carriage return, U+2028 and U+2029) and nothing else, where a host engine's dot may refuse only the line
// feed, or others besides.
// ---------------------------------------------------------------------------------------------------------------

const lineTerminatorSeeds = [
  ["^abc$", "abc\n"],
  ["^abd.*\\n", "abd\n"],
  ["^.{1,3}$\\n", "abc\n"],
];

const terminators = ["\n", "\r", "\r\n", " ", " "];

function lineTerminators() {
  const r = rng(0x71e2a003);

  const bodies = ["abc", "abd", "a", ".", ".*", ".+", ".{1,3}", ".{3}", "abd.*", "a.c", "ab.", "\\S+", "\\s", "\\s*",
    "[^a]", "[^a]+", "[^]", "\\w+", "\\W", "[\\s\\S]*", ""];
  const trails = ["", "\\n", "\\r", "\\r\\n", "\\u2028", "\\u2029", ".", "\\s", "[^a]", "\\S", "$"];
  const leads = ["\\n", "\\r", "\\r\\n", "\\u2028", "\\u2029", ".", "\\s", "[^a]"];
  const systematic = [];
  for (const start of ["^", ""]) {
    for (const body of bodies) {
      for (const end of ["$", ""]) {
        for (const trail of trails) systematic.push(start + body + end + trail);
      }
    }
  }
  for (const lead of leads) {
    for (const start of ["^", ""]) {
      for (const body of bodies) {
        for (const end of ["$", ""]) systematic.push(lead + start + body + end);
      }
    }
  }

  const parts = [
    "a", "abc", "abd", "ab", "b", ".", ".", ".*", ".+", ".{1,3}", ".{3}", ".{2,}", ".?", ".*?", "\\s", "\\S", "\\s*",
    "\\S+", "\\s+", "[^a]", "[^a]*", "[^a]{1,3}", "[^]", "[\\s\\S]", "\\n", "\\n", "\\r", "\\r\\n", "\\u2028",
    "\\u2029", "[\\n\\r]", "[^\\n]", "[^\\n]*", "\\r?\\n", "\\W", "\\w+", "\\D", "\\cJ", "\\cM", "\\x0a", "\\x0d",
    "\\u000a", "[\\u2028\\u2029]", "\\u0085", "\\v", "\\t", "[^\\s]", "(?!\\n)", "(?=\\n)", "(?<=\\n)", "(?<!\\n)",
    "(?=\\r)", "(?<=\\r)", "(?=\\u2028)", "(?=$)", "(?!$)", "(?<=^)", "(?<!^)", "$", "^", "\\b", "\\B",
    "(?m:^)", "(?m:$)", "(?s:.)", "(?s:.*)", "(?-s:.)", "\n", "(?:.|\\n)", "(?:\\r\\n|\\n)", "(.*)", "(?:a.)+",
  ];
  const random = () => {
    const n = 1 + r() % 4;
    let p = chance(r, 2, 3) ? "^" : "";
    for (let k = 0; k < n; k++) p += pick(r, parts);
    if (chance(r, 2, 3)) p += "$";
    if (chance(r, 1, 6)) p += pick(r, trails);
    return p;
  };
  const patterns = assemble(lineTerminatorSeeds, systematic, random, 3000);

  const fixed = ["", "a", "abc", "abd", "ab", "abcd", " ", "abc ", "\t", "abc\t", "\u0085", "abc\u0085", "abc\v",
    "abc\f", "abc ", "abc﻿"];
  for (const t of terminators) {
    fixed.push(t, t + t, "a" + t, t + "a");
    for (const word of ["abc", "abd"]) {
      fixed.push(word + t, t + word, word + t + t, t + word + t, word + t + word);
    }
  }
  fixed.push(...lineTerminatorSeeds.map((s) => s[1]), "abc\n\r", "abc\r\n\n", "\n\r", "a\nb\nc", "abc\n ",
    "abc\r\nabc\r\n");
  const texts = withRandomTexts(r, fixed, ["a", "b", "abc", "abd", " ", ...terminators, "\n"], 8, 2, 4, 9);

  return { source: "line-terminators", seeds: lineTerminatorSeeds, patterns, texts };
}

// ---------------------------------------------------------------------------------------------------------------
// Word boundaries at the edges of the text and on the empty text.
//
// \b holds between a word character and something that is not one, where the positions before the start and after
// the end count as not one. So \B holds in the empty text, and \b does not. A word character is one of the 63 ASCII
// ones. Host engines differ on the empty text, and on which characters are word characters.
// ---------------------------------------------------------------------------------------------------------------

const wordBoundarySeeds = [
  ["\\B", ""],
  ["^\\B$", ""],
  ["^(\\d|\\B){2}", ""],
  ["\\b", ""],
  ["\\B", "a"],
  ["\\B", "é"],
];

function wordBoundaries() {
  const r = rng(0xb0d4a004);
  const core = ["a", "é", "_", "-", "\\d", " "];
  const atoms = [...core, "1", ".", "\\w", "\\W", "[a-z]", "\\s", "\\S", "[^a]", "\\D", "[é]"];
  const boundaries = ["", "\\b", "\\B"];

  const systematic = ["\\b", "\\B", "^\\b", "^\\B", "\\b$", "\\B$", "^\\b$", "^\\B$", "\\b\\b", "\\b\\B", "\\B\\b",
    "\\B\\B"];
  // One atom, with a boundary or none on each side, anchored and not.
  for (const atom of atoms) {
    for (const before of boundaries) {
      for (const after of boundaries) {
        if (before + after === "") continue;
        systematic.push(before + atom + after, "^" + before + atom + after + "$");
      }
    }
  }
  // Two atoms of the family's own alphabet, with a boundary or none in each of the three places.
  for (const first of core) {
    for (const second of core) {
      for (const before of boundaries) {
        for (const between of boundaries) {
          for (const after of boundaries) {
            if (before + between + after === "") continue;
            systematic.push(before + first + between + second + after);
          }
        }
      }
    }
  }

  const b = () => pick(r, ["", "", "\\b", "\\B"]);
  const sure = () => pick(r, ["\\b", "\\B"]);
  const atom = () => pick(r, atoms);
  const quant = () => pick(r, ["", "", "", "*", "+", "?", "{2}", "{1,2}", "*?", "{0,2}"]);
  const random = () => {
    switch (r() % 7) {
      case 0: case 1: { // two or three atoms, with quantifiers
        const n = 2 + r() % 2;
        let p = (chance(r, 1, 2) ? "^" : "") + b();
        for (let k = 0; k < n; k++) p += atom() + quant() + b();
        return p + (chance(r, 1, 2) ? "$" : "");
      }
      case 2: // a counted group with a boundary for an alternative
        return (chance(r, 1, 2) ? "^" : "") + pick(r, ["(", "(?:"]) + pick(r, [atom, sure])() + "|"
          + pick(r, [atom, sure])() + ")" + pick(r, ["{2}", "{3}", "{1,2}", "{2,}", "*", "+", "?", "{0,2}", "{2}?"])
          + pick(r, ["", "", atom()]) + (chance(r, 1, 2) ? "$" : "");
      case 3: // a boundary inside a lookaround
        return (chance(r, 1, 3) ? "^" : "") + b() + pick(r, ["", atom()]) + pick(r, ["(?=", "(?!", "(?<=", "(?<!"])
          + pick(r, ["", atom()]) + sure() + pick(r, ["", atom()]) + ")" + pick(r, ["", atom()]) + b()
          + (chance(r, 1, 3) ? "$" : "");
      case 4: // a boundary inside a repeated group
        return (chance(r, 1, 2) ? "^" : "") + pick(r, ["", atom()]) + pick(r, ["(", "(?:"]) + b() + atom() + b() + ")"
          + pick(r, ["*", "+", "?", "{2}", "{1,2}", "{2,}"]) + b() + (chance(r, 1, 2) ? "$" : "");
      case 5: { // boundaries and anchors with no atom, or one
        const n = 1 + r() % 3;
        let p = "";
        for (let k = 0; k < n; k++) p += pick(r, ["\\b", "\\B", "\\b", "\\B", "^", "$", "(?:\\b|\\B)", "(?!\\b)",
          "(?!\\B)", "(?=\\b)", "(?<=\\B)", "(?<!\\b)", "(\\B)", "(\\b)?", "(?:\\B)*", "(?:\\b)+", "(?:\\B){2}"]);
        return p + pick(r, ["", "", atom()]);
      }
      default: // an alternation with a boundary on one side
        return (chance(r, 1, 2) ? "^" : "") + pick(r, ["(", "(?:"]) + b() + atom() + b() + "|" + b() + atom() + b()
          + ")" + pick(r, ["", "", "+", "{2}"]) + (chance(r, 1, 2) ? "$" : "");
    }
  };
  const patterns = assemble(wordBoundarySeeds, systematic, random, 2000);

  const alphabet = ["a", "é", "_", "-", "1", " "];
  const texts = withRandomTexts(r, [...exhaustive(alphabet, 3), ...wordBoundarySeeds.map((s) => s[1])], alphabet, 12,
    4, 6, 6);

  return { source: "word-boundaries", seeds: wordBoundarySeeds, patterns, texts };
}

// The four families above, then those of more-families.js, which were written later and are built with the same
// pieces.
function families() {
  const { moreFamilies } = require("./more-families");
  return [anchoredLists(), emptyLoops(), lineTerminators(), wordBoundaries(), ...moreFamilies()];
}

module.exports = { families, rng, pick, chance, unique, exhaustive, withRandomTexts, assemble };
