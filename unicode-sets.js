// The family for the v flag (ECMAScript 2024, "RegExp v flag with set notation and properties of strings").
//
// families.js runs this after the families of more-families.js. As there, everything comes from fixed lists and
// from a generator with a fixed seed, so every run builds the same patterns and texts in the same order. What is
// new is that every record of this family is answered in three modes: with the v flag ("unicode_sets"), with the
// u flag ("unicode") and with neither ("legacy"), because the three grammars read the same class differently, and
// that is the point.
//
// The v flag changes the grammar inside a class and nothing outside it. A class may hold a nested class, the
// difference of two operands (--), the intersection of two operands (&&), a disjunction of strings (\q{ab|c}) and
// a property of strings (\p{RGI_Emoji}); it may not hold a syntax character unescaped, a reserved double
// punctuator (&& is an operator; !!, ##, $$ and the rest are reserved), a union next to an operator without a
// nested class around one of them, or, under ^, anything that may match a string of more than one character.
// With the i flag the complement of a class is taken after case folding, where the u flag takes it before.
'use strict';

const { rng, pick, chance, unique, exhaustive, assemble } = require("./families");

const R = String.raw;
const lines = (block) => block.split("\n").filter((line) => line !== "");

// Emoji sequences of each kind the properties of strings name, written as escapes so the file stays ASCII.
const thumbs = "\u{1F44D}";                       // 👍 Basic_Emoji
const thumbsTone = "\u{1F44D}\u{1F3FD}";          // 👍🏽 RGI_Emoji_Modifier_Sequence
const flagFrance = "\u{1F1EB}\u{1F1F7}";          // 🇫🇷 RGI_Emoji_Flag_Sequence
const keycapOne = "1\uFE0F\u20E3";                // 1️⃣ Emoji_Keycap_Sequence
const family = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}"; // 👨‍👩‍👧 RGI_Emoji_ZWJ_Sequence
const england = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}"; // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 RGI_Emoji_Tag_Sequence
const grinning = "\u{1F600}";                     // 😀
const plane = "\u2708";                           // ✈ text-default, Basic_Emoji with FE0F
const planeEmoji = "\u2708\uFE0F";
const kelvin = "\u212A", longS = "\u017F", sharpS = "\u00DF";
const sigma = "\u03A3", smallSigma = "\u03C3", finalSigma = "\u03C2";
const deseret = "\u{10400}", deseretSmall = "\u{10428}";

const escapeOf = (s) => [...s].map((c) => "\\u{" + c.codePointAt(0).toString(16) + "}").join("");

// Each seed: the pattern, the text it is about (null for one that is a syntax error in the v mode), the flags.
const seeds = [
  [R`^[[a-z]--[aeiou]]$`, "a", ""],
  [R`^[\p{L}&&\p{ASCII}]$`, "\u00e9", ""],
  [R`^[\q{abc|ab|a}]$`, "ab", ""],
  [R`^[\q{ab|a}]b$`, "ab", ""],
  [R`^\p{RGI_Emoji}$`, thumbsTone, ""],
  [R`^[\p{RGI_Emoji_Flag_Sequence}]$`, flagFrance, ""],
  [R`^\p{Emoji_Keycap_Sequence}$`, keycapOne, ""],
  [R`^\p{RGI_Emoji_ZWJ_Sequence}$`, family, ""],
  [R`^\p{RGI_Emoji_Tag_Sequence}$`, england, ""],
  [R`^\p{Basic_Emoji}$`, plane, ""],
  [R`^[^\p{Lu}]$`, "A", "i"],
  [R`^\P{Lu}$`, "a", "i"],
  [R`^[\p{Lu}--[A]]$`, "a", "i"],
  [R`^[[a-z]--[aeiou]]$`, "A", "i"],
  [R`^[\q{ab}]$`, "AB", "i"],
  [R`^[\q{K}]$`, kelvin, "i"],
  [R`^[s]$`, longS, "i"],
  [R`^[\q{s}]$`, longS, "i"],
  [R`^[a&&b]$`, "&", ""],
  [R`^[a!!b]$`, null, ""],
  [R`^[\&\&]$`, "&", ""],
  [R`^[\q{}]$`, "", ""],
  [R`^[\q{a|}]$`, "", ""],
  [R`^[]$`, "", ""],
  [R`^[^]$`, "a", ""],
  [R`^[\q{ab}--\q{ab}]$`, "ab", ""],
  [R`^[\q{ab|cd}&&\q{cd|ef}]$`, "cd", ""],
  [R`^[^\q{a|b}]$`, "c", ""],
  [R`^(?:[\q{ab}]){2}$`, "abab", ""],
  [R`^([\q{ab|c}])\1$`, "abab", ""],
  [R`^[\q{abc}]+$`, "abcabc", ""],
  [R`^[a\q{bc}]{2}$`, "abc", ""],
  [R`[a--]`, null, ""],
  [R`[a&&b--c]`, null, ""],
  [R`[ab--c]`, null, ""],
  [R`[a-z&&[^m]]`, null, ""],
  [R`[^\q{ab}]`, null, ""],
  [R`\P{RGI_Emoji}`, null, ""],
  [R`[(]`, null, ""],
  [R`\q{a}`, null, ""],
];

// Operands a class may hold: single characters and escapes, nested classes, strings, properties.
const characters = ["a", "b", "x", "A", "K", "k", "S", "s", "0", "_", " ", "\\u00e9", "\\u00c9", "\\u03a3",
  "\\u03c3", "\\u03c2", "\\u212a", "\\u017f", "\\u00df", "\\-", "\\&", "\\!", "\\t", "\\n", "\\b", "\\u{10400}",
  "\\u{1f600}", "\\x41", "\\u0041"];
const escapes = ["\\d", "\\w", "\\s", "\\D", "\\W", "\\S", "\\p{L}", "\\p{Lu}", "\\p{Ll}", "\\P{Lu}", "\\P{L}",
  "\\p{ASCII}", "\\p{Script=Greek}", "\\p{Emoji}", "\\p{Any}", "\\p{ASCII_Hex_Digit}", "\\p{Emoji_Presentation}"];
const ranges = ["a-z", "A-Z", "a-b", "0-9", "\\u0000-\\u007f", "\\u00e0-\\u00ff", "\\u{10400}-\\u{10428}", "k-s"];
const strings = ["\\q{ab}", "\\q{a|bc}", "\\q{abc|ab|a}", "\\q{}", "\\q{a|}", "\\q{ab|}", "\\q{xyz}", "\\q{aa|a}",
  "\\q{A}", "\\q{a}", "\\q{AB|ab}", "\\q{\\u{1f468}\\u200d\\u{1f469}\\u200d\\u{1f467}}", "\\q{1\\ufe0f\\u20e3}",
  "\\q{ss}", "\\q{\\u00df}", "\\q{\\u212a}", "\\q{s|S}", "\\q{cd|ef}", "\\q{ab|cd}"];
const stringProperties = ["\\p{RGI_Emoji}", "\\p{Basic_Emoji}", "\\p{Emoji_Keycap_Sequence}",
  "\\p{RGI_Emoji_Modifier_Sequence}", "\\p{RGI_Emoji_Flag_Sequence}", "\\p{RGI_Emoji_Tag_Sequence}",
  "\\p{RGI_Emoji_ZWJ_Sequence}"];
const simpleClasses = ["[a-z]", "[aeiou]", "[^aeiou]", "[\\p{L}]", "[^\\p{L}]", "[ab]", "[^ab]", "[\\w]", "[^a]",
  "[\\q{ab|c}]", "[a\\q{bc}]", "[\\p{RGI_Emoji}]", "[\\q{ab}\\q{cd}]", "[]", "[^]", "[\\q{}]", "[^\\q{a}]"];

// Classes written out: the operators between every kind of operand, with their errors.
const classList = lines(R`
[[a-z]--[aeiou]]
[[a-z]--[aeiou]--[xyz]]
[[a-z]--[aeiou]--x]
[\p{L}--\p{Lu}]
[\p{L}--\p{Lu}--\p{Ll}]
[\p{L}&&\p{ASCII}]
[\p{L}&&\p{ASCII}&&\p{Lu}]
[[\p{L}&&\p{ASCII}]--[aeiou]]
[[a-z]&&[^aeiou]]
[[a-z]&&[aeiou]]
[a-z&&[^aeiou]]
[[a-z]&&aeiou]
[a&&b]
[a&&a]
[a--a]
[a--b]
[a&&&b]
[a&&&&b]
[a---b]
[a--]
[--a]
[a&&]
[&&a]
[a&&b--c]
[a--b&&c]
[ab--c]
[a--bc]
[a-b--c]
[a--b-c]
[[a-b]--c]
[a-\q{b}]
[\q{a}-b]
[\q{ab}]
[\q{ab}--\q{ab}]
[\q{ab}--\q{a}]
[\q{ab|cd}--\q{cd}]
[\q{ab|cd}&&\q{cd|ef}]
[\q{ab}&&a]
[\q{a}&&a]
[\q{a}&&\q{a}]
[\q{abc|ab|a}]
[\q{a|ab|abc}]
[\q{ab|abc}--\q{ab}]
[a\q{bc}]
[\q{bc}a]
[\q{ab}\q{cd}]
[\q{ab}[\q{cd}]]
[[\q{ab}]--\q{ab}]
[[\q{ab|cd}]--[\q{cd}]]
[[a\q{bc}]--[\q{bc}]]
[[a\q{bc}]--a]
[^\q{ab}]
[^\q{a}]
[^\q{a|b}]
[^\q{}]
[^[\q{ab}]]
[^[a-z]--[aeiou]]
[^[a-z]&&[aeiou]]
[^\p{RGI_Emoji}]
[^[\p{RGI_Emoji}--\p{RGI_Emoji}]]
[\p{RGI_Emoji}--\p{RGI_Emoji}]
[\p{RGI_Emoji}--\p{Basic_Emoji}]
[\p{RGI_Emoji}&&\p{RGI_Emoji_Flag_Sequence}]
[\p{RGI_Emoji}--\q{\u{1f44d}\u{1f3fd}}]
[\p{RGI_Emoji}--\u{1f600}]
[\p{Basic_Emoji}--\p{Emoji}]
[\p{Emoji_Keycap_Sequence}\p{RGI_Emoji_Flag_Sequence}]
[\p{RGI_Emoji}a]
[a\p{RGI_Emoji}]
[\P{RGI_Emoji}]
[\P{Basic_Emoji}]
[\q{}]
[\q{|}]
[\q{a|}]
[\q{}a]
[\q{a}]
[\q{a|b}]
[\q{aa|a}]
[\q{a|aa}]
[\q{\u0041}]
[\q{\x41}]
[\q{\u{10400}}]
[\q{\n}]
[\q{\-}]
[\q{a\-b}]
[\q{a-b}]
[\q{a&b}]
[\q{a&&b}]
[\q{a|b|}]
[\q{ab|cd|}]
[\q{\q{a}}]
[\q{[a]}]
[\q{a]}]
[\q{(a)}]
[\q{\}}]
[\q{}}]
[\q]
[\q{]
[\q{a]
[(]
[)]
[{]
[}]
[/]
[-]
[|]
[a-]
[-a]
[a|b]
[\(]
[\)]
[\{]
[\}]
[\/]
[\-]
[\|]
[a\-b]
[a!!b]
[a##b]
[a$$b]
[a%%b]
[a**b]
[a++b]
[a,,b]
[a..b]
[a::b]
[a;;b]
[a<<b]
[a==b]
[a>>b]
[a??b]
[a@@b]
[a^^b]
[a~~b]
[a!b]
[a#b]
[a$b]
[a%b]
[a*b]
[a+b]
[a,b]
[a.b]
[a:b]
[a;b]
[a<b]
[a=b]
[a>b]
[a?b]
[a@b]
[a^b]
[a~b]
[^^]
[^^^]
[^]
[]
[\&]
[\&\&]
[\!]
[\#]
[\%]
[\,]
[\:]
[\;]
[\<]
[\=]
[\>]
[\@]
[\~]
[\`]
[\$]
[\.]
[\*]
[\+]
[\?]
[\^]
[a\&&b]
[a&\&b]
[&]
[&a]
[a&]
[\b]
[\B]
[\cA]
[\c]
[\0]
[\01]
[\1]
[\u0041]
[\u{41}]
[\u{110000}]
[\x41]
[\xg]
[\p{L}]
[\P{L}]
[\p{Lu}\p{Ll}]
[\p{Script=Greek}]
[\p{sc=Grek}]
[\p{Script_Extensions=Greek}]
[\p{Emoji}]
[\p{Any}]
[\p{ASCII}]
[\p{Assigned}]
[\p{Basic_Emoji}]
[\p{RGI_Emoji}]
[\p{Emoji_Keycap_Sequence}]
[\p{RGI_Emoji_Modifier_Sequence}]
[\p{RGI_Emoji_Flag_Sequence}]
[\p{RGI_Emoji_Tag_Sequence}]
[\p{RGI_Emoji_ZWJ_Sequence}]
[\p{Emoji_Component}]
[\p{Extended_Pictographic}]
[\p{Lowercase}]
[\p{Uppercase}]
[\p{Nope}]
[[]]
[[]a]
[[a]]
[[a][b]]
[[a]b[c]]
[[[a]]]
[[[[a]]]]
[[a-z]]
[[a-z][A-Z]]
[[a-z]-[A-Z]]
[[^a]]
[^[^a]]
[[^a]--[^b]]
[[^a]&&[^b]]
[^[^a]&&[^b]]
[[a]&&[^a]]
[\d--[0-4]]
[\w--\d]
[\w--[_]]
[\w&&\d]
[\w&&\p{L}]
[\s--\n]
[\S&&\p{L}]
[\D&&\W]
[\p{L}--\p{Script=Greek}]
[\p{Lu}--\p{ASCII}]
[\p{Any}--\p{L}]
[\p{Any}--[^a]]
[\p{ASCII}--\p{L}--\d]
[[\p{ASCII}--\p{L}]--\d]
[\p{ASCII}--[\p{L}--\d]]
[\p{L}&&[\p{Lu}\p{Ll}]]
[[\p{L}--\p{Lu}]&&\p{ASCII}]
[\u{10400}-\u{10428}--\u{10410}]
[[\u{10400}-\u{10428}]--\u{10410}]
[[\u{10400}-\u{10428}]&&\u{10400}]
[\u{10400}\u{10428}]
[\ud801\udc00]
[\ud801]
[\udc00]
[\ud801-\udc00]
[\uD83D\uDE00]
`);

// Templates around a class: # is the class.
const templates = ["#", "^#$", "^#+$", "^#*$", "^#{2}$", "^#?$", "^#{1,2}$", "^(?:#)$", "^(?:#|x)$", "^a#b$",
  "(?i:#)", "^(?i:#)$", "^(?-i:#)$", "^(#)\\1$", "(?<=#)x", "^(?=#)", "^#(?!#)$", "#\\b", "^#+?$", "^#{2,}$",
  "^[^a]#$", "^#.$", "^.#$"];

// Patterns outside a class that the v flag reads differently.
const outsideList = lines(R`
\p{RGI_Emoji}
^\p{RGI_Emoji}$
^\p{RGI_Emoji}+$
^\p{RGI_Emoji}{2}$
^\p{RGI_Emoji}?$
\p{RGI_Emoji}+
^\p{Basic_Emoji}$
^\p{Emoji_Keycap_Sequence}$
^\p{RGI_Emoji_Modifier_Sequence}$
^\p{RGI_Emoji_Flag_Sequence}$
^\p{RGI_Emoji_Tag_Sequence}$
^\p{RGI_Emoji_ZWJ_Sequence}$
^\p{RGI_Emoji_ZWJ_Sequence}+$
^(\p{RGI_Emoji})\1$
^(?:\p{RGI_Emoji}|a)+$
^(?:a|\p{RGI_Emoji})+$
\P{RGI_Emoji}
^\P{Basic_Emoji}$
\p{RGI_Emoji}*
\p{Emoji}
^\p{Emoji}$
^\p{Emoji}+$
\p{Emoji_Presentation}
^\p{Emoji_Modifier}$
\q{ab}
\q{}
\q
^\q{ab}$
a\q
\-
\&
\!
\p{L}--\p{Lu}
a--b
a&&b
[a]--[b]
(?:a)--(?:b)
^a$
.
^.$
^.+$
^\p{Any}$
^[\s\S]$
^[^]$
^\p{L}$
^\P{L}$
^\p{Lu}$
^\P{Lu}$
^[^\p{Lu}]$
^[^\P{Lu}]$
^[^\p{L}\P{L}]$
^[\p{L}\P{L}]$
^\w$
^\W$
^[^\w]$
^[^\W]$
^(?i:\P{Lu})$
^(?i:[^\p{Lu}])$
^(?i:[^a])$
^(?i:[^\q{a}])$
^(?i:[\q{ab}])$
^(?i:[\q{AB}])$
^(?i:[\q{s}])$
^(?i:[\q{K}])$
^(?i:\p{Lu})$
^(?-i:\p{Lu})$
^(?i:[\p{Lu}--[A]])$
^(?i:[[a-z]--[aeiou]])$
^(?i:[\p{Ll}&&\p{ASCII}])$
^(?i:[\p{Lu}&&\p{ASCII}])$
^(?i:[^\p{Ll}])$
^(?i:[\P{Lu}])$
^(?i:[\P{Ll}])$
^(?i:[^\p{Lu}\p{Ll}])$
^(?i:[^[a-z]])$
^(?i:[^[A-Z]--[AEIOU]])$
^(?i:[\p{Script=Greek}--\u03a3])$
^(?i:[^\u03a3])$
^(?i:[\u03c2])$
^(?i:[^\u03c2])$
^(?i:[\u00df])$
^(?i:[\q{ss}])$
^(?i:[\u212a])$
^(?i:[^\u212a])$
^(?i:[^k])$
^(?i:[\u017f])$
^(?i:[^s])$
^(?i:[\q{\u017f}])$
^(?i:[[k]--[\u212a]])$
^(?i:[[s]&&[\u017f]])$
^(?i:[[\u212a]--k])$
^(?i:\p{RGI_Emoji})$
^(?i:[\q{a}--\q{A}])$
^(?i:[\q{ab}--\q{AB}])$
^(?i:[\q{ab}&&\q{AB}])$
^(?i:[\q{ab|cd}--[\q{AB}]])$
`);

// One escape or character of a string in \q{...}: an escape of any shape, or a code point.
const unit = /\\u\{[0-9a-fA-F]+\}|\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}|\\c[a-zA-Z]|\\.|[\s\S]/gu;
const caseInsensitive = /\(\?[ms]*i[ims]*(?:-[ims]*)?:/;

// The pattern with every string of one character in a \q{...} written as a character of its class, which is
// what ECMA-262 makes of it. V8 answers the two differently with the i flag (see deviations.js).
function singlesAsCharacters(pattern) {
  return pattern.replace(/\\q\{((?:\\u\{[0-9a-fA-F]+\}|[^{}])*)\}/g, (whole, body) => {
    const singles = [], others = [];
    for (const alternative of body.split("|")) {
      const units = alternative.match(unit) || [];
      (units.length === 1 ? singles : others).push(alternative);
    }
    if (singles.length === 0) return whole;
    // As a nested class, so that it stays one operand where it stood beside -- or &&.
    return "[" + singles.join("") + (others.length > 0 ? "\\q{" + others.join("|") + "}" : "") + "]";
  });
}

// The pattern with \p{ASCII} written as the range it is, as a nested class. With the i flag V8 folds the property
// without the long s and the Kelvin sign, which fold to s and k, where it folds the range with them.
function asciiAsRange(pattern) {
  return pattern.replace(/\\p\{ASCII\}/g, "[\\u0000-\\u007f]");
}

// The class of V8's fault a record shows, or null: V8's own answers against a rewritten pattern's, for each
// rewriting that takes a construct V8 gets wrong under the i flag to one it gets right.
function check(r) {
  if (!r.valid.unicode_sets) return null;
  if (!r.flags.includes("i") && !caseInsensitive.test(r.pattern)) return null;
  for (const [rewrite, deviation] of [[singlesAsCharacters, "single-character-string-case"], [asciiAsRange, "ascii-case-folding"]]) {
    const rewritten = rewrite(r.pattern);
    if (rewritten === r.pattern) continue;
    let again = null;
    try { again = new RegExp(rewritten, r.flags + "v"); } catch (e) { continue; }
    if (r.tests.some((t) => again.test(t.text) !== t.unicode_sets)) return deviation;
  }
  return null;
}

function unicodeSets() {
  const r = rng(0x5e750001);

  const systematic = [];
  for (const c of classList) {
    systematic.push(c, "^" + c + "$", "^" + c + "+$");
  }

  for (const c of simpleClasses) {
    for (const t of templates) systematic.push(t.replaceAll("#", c));
  }

  for (const c of [...strings, ...stringProperties, ...escapes]) {
    systematic.push("^[" + c + "]$", "^[^" + c + "]$", "^[[" + c + "]--a]$", "^[a--[" + c + "]]$",
      "^[[" + c + "]&&\\q{ab|a}]$", "^[" + c + "]+$", "^[" + c + "\\q{ab}]$", "^(?i:[" + c + "])$");
  }

  for (const o of outsideList) systematic.push(o);

  // One operand of each kind.
  const operand = (depth) => {
    const k = r() % 10;
    if (depth < 2 && k === 0) return "[" + expression(depth + 1) + "]";
    if (depth < 2 && k === 1) return "[^" + union(depth + 1) + "]";
    if (k === 2) return pick(r, strings);
    if (k === 3) return pick(r, stringProperties);
    if (k === 4) return pick(r, escapes);
    if (k === 5) return pick(r, simpleClasses);
    return pick(r, characters);
  };
  const union = (depth) => {
    let s = "";
    for (let n = 1 + r() % 3; n > 0; n--) s += chance(r, 1, 4) ? pick(r, ranges) : operand(depth);
    return s;
  };
  const expression = (depth) => {
    const k = r() % 4;
    if (k === 0) return union(depth);
    const op = k === 1 ? "--" : "&&";
    let s = operand(depth);
    for (let n = 1 + r() % 2; n > 0; n--) s += op + operand(depth);
    // One pattern in eight breaks the grammar: an operand of the other operator, a range, or a union, beside it.
    if (chance(r, 1, 8)) s += pick(r, ["--", "&&", "-", "a", "a-z", "&", "[", "]", "\\q{a}"]) + operand(depth);
    return s;
  };
  const random = () => {
    const c = (chance(r, 1, 6) ? "[^" : "[") + expression(0) + "]";
    return pick(r, templates).replaceAll("#", c);
  };

  const patterns = assemble(seeds.map((s) => [s[0]]), systematic, random, 4000);

  const texts = unique([
    ...exhaustive(["a", "b", "x"], 3),
    ...seeds.filter((s) => s[1] !== null).map((s) => s[1]),
    "A", "B", "X", "AB", "aB", "Ab", "ABC", "abc", "abcabc", "ABAB", "abAB", "bc", "cd", "cde", "cdef", "ef", "xyz",
    "XYZ", "aa", "aaa", "ba", "e", "o", "u", "m", "z", "k", "K", "s", "S", "ss", "SS", kelvin, longS, sharpS,
    sigma, smallSigma, finalSigma, "\u00e9", "\u00c9", "\u00e0", "\u00ff", "\u0130", "\u0131", "\u00b5", "\u03bc",
    "0", "9", "_", "-", " ", "&", "&&", "!", "!!", "|", "(", ")", "{", "}", "/", "\n", "\t", "\b", "\u0000",
    "a-b", "a&&b", "a--b", "a&b", "ab|c", "p{L}", "q{ab}",
    thumbs, thumbsTone, "\u{1F3FD}", flagFrance, "\u{1F1EB}", keycapOne, "1", "1\uFE0F", "#\uFE0F\u20E3",
    family, "\u{1F468}", "\u{1F468}\u200D\u{1F469}", england, "\u{1F3F4}", grinning, plane, planeEmoji,
    "\u00a9", "\u00a9\uFE0F", "a" + grinning, grinning + "a", thumbsTone + "a", "x" + thumbsTone,
    thumbsTone + thumbsTone, flagFrance + flagFrance, family + family, grinning + grinning, "a" + family + "b",
    deseret, deseretSmall, "\u{10410}", deseret + deseretSmall, "a" + deseret, "\u{1D49C}", "\u{10FFFF}",
    "\uFFFF", "\u2028", "\r\n", "aa\nbb",
  ]);

  // Patterns with no flags, and the systematic ones with the i flag too.
  const all = [
    ...patterns.map((pattern) => ({ pattern, flags: "" })),
    ...unique([...seeds.filter((s) => s[2] === "i").map((s) => s[0]), ...systematic]).map((pattern) => ({ pattern, flags: "i" })),
  ];
  const seen = new Set(), together = [];
  for (const p of all) {
    const key = p.flags + "/" + p.pattern;
    if (seen.has(key)) continue;
    seen.add(key);
    together.push(p);
  }

  return { source: "unicode-sets", seeds, patterns: together, texts, deviations: true, unicodeSets: true, check };
}

module.exports = { unicodeSets, singlesAsCharacters };
