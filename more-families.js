// More families of patterns, each built around classes of fault found by testing implementations against V8 after
// the first four families were written.
//
// families.js runs this after its own four. As there, everything comes from fixed lists and from generators with
// fixed seeds, so every run builds the same patterns and texts in the same order. Two things are new here. A pattern
// may have flags, and it may have a list of texts of its own (see timed.js). And V8 itself answers some patterns of
// these kinds wrongly, so each family asks deviations.js to find and mark those records.
//
// A list of patterns is written as a block of lines, one pattern to a line, exactly as it is given to V8.
'use strict';

const { rng, pick, chance, unique, exhaustive, withRandomTexts, assemble } = require("./families");

const R = String.raw;
const lines = (block) => block.split("\n").filter((line) => line !== "");
const escapeOf = (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
const hasReference = (p) => /\\[1-9]|\\k</.test(p);
// Whether a pattern has a backreference, and has a group for every number it refers to. A number with no group is
// an error with the u flag and an octal escape without it, which is not what these families are about.
const refersToGroups = (p) => {
  const groups = (p.match(/\((?!\?)|\(\?<(?![=!])/g) || []).length;
  return hasReference(p) && (p.match(/\\[1-9]\d*/g) || []).every((n) => Number(n.slice(1)) <= groups);
};

// The patterns of one part of a family, each with the part's flags and its list of texts.
function part(patterns, flags, texts) {
  return patterns.map((pattern) => ({ pattern, flags, texts }));
}

// The parts of a family in order, without a pattern that an earlier part has with the same flags.
function together(...parts) {
  const seen = new Set(), all = [];
  for (const p of parts.flat()) {
    const key = p.flags + "/" + p.pattern;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(p);
  }
  return all;
}

// ---------------------------------------------------------------------------------------------------------------
// Backreferences to groups of repetitions, of alternatives and of optional groups.
//
// A group that has not taken part in the match reads as the empty string. The groups of a repeated body are unset
// when each iteration starts, so a group reads as what its last iteration left, and a repetition that gives an
// iteration back gives back what the groups held before it. Host engines differ on every one of these.
// ---------------------------------------------------------------------------------------------------------------

const backreferenceSeeds = [
  ["^(?:x(.)){1,2}\\1", "xxxb"],
  ["(a(){1})?\\2a", "a"],
  ["^(?:(a?))+\\1b$", "ab"],
  ["^(?:(?:(a|)|){2})?(?:x\\1)?$", "axa"],
  ["(?:(?=(.){3}|\\1))*", "aax"],
  ["^([^a]?a+){2,3}?\\1a$", "aaaa"],
  ["^(?:(a)|x)*\\1-$", "ax-"],
  ["^(a*)+\\1x", "ax"],
  ["(x|\\1)x", "xx"],
  ["^(a|\\1a)$", "a"],
  ["(a?\\1)a", "aa"],
  ["^(a){0}(?:x+|\\1){3}$", "xx"],
];

const backreferenceList = lines(R`
^(?:(a)|x)\1-$
^(a)?\1x$
^\1(a)x
^(a\1)x
(?:(a)|(x))+\1\2-
^(?:(?<n>a)|(?<n>x))+\k<n>-$
^(?:(?:(a)|x)\1)+$
^(?:(a)x?|-)+\1$
^(?:(a)|x){2}\1-
^(?:(?:(a)|(x)|-)\1\2)*$
^(?:(a)|(x\1))+\2-
^(?:(a)|)+\1x
^(a|){2,3}\1x
^(?:(a)|(?=x))*\1x
^(?:(a|)x?)*\1-$
^(?:(a)|(x)|)+?\1\2-
^(?:(a)|-|){2,}\1x$
^(?:(a)?\1)*x$
^(?:(a)?\1){2}x$
^(?:(a)?\1){2,3}?x$
^(?:(a)|x)*\1$
^(?:(a)|())*\1\2$
^(?:(a)|()){2,3}\1\2-$
^(?:a|()|x)*\1-
(\b){0,}(a\1){3}$
(x*){0,}(?:a|\1){2,3}$
(?:^|(|[ax]){2}\1){0,}a
^(a*)*\1x$
^(?:(a*)x)+\1$
^(?:(a)|(x))+\1\2$
^(?:(?:x(.)){2})?\1$
(?:([^a]x\1){1,1}|(?:\1){2,3})?\1$
^(?:|($|)?\1){2,3}?a
^(?:(a|x)\1?)+-$
^(?:(?:(a)|x)\1-?){2,}$
^(?:(a)|(x)|-)*(?:\1x|\2a)$
^(?:(a+)|x){2}\1$
^(a|x(a)?){2}\2-$
^(x|\1(?=(|a)|)){1,3}\1\2$
((?:\1|(a|)|.)*|a())*x
()([x]|\2)x
(?:(?<n>a)|(?<n>x)){2}\k<n>
([^a][^a]|.(?:\1\1|a?[ax]){2}){4}a$
(\b([ax]?){3}|x|\1)*?x$
^((x|()|\2){0,}|){4}?x
^(?:(?:(?:(a)|x){1,2}-){1,2}\1)+$
^(?:(?:(a)|(x))+\1\2-)*$
^(?:(?:(a)|x){1,2}\1-)+$
^(?:(?:(a)|x){2,}\1-)+$
^(?:(?:(a)|x?){2,}\1-)+$
^(?:(?:(a)|x|)+\1-)+$
^(?:(?:(a)|x|){1,2}\1-)+$
^(?:(?:(a)|x|-){0,2}?\1x)+$
^(?:(?<m>a)|(?<m>x))(?:(?<n>a)|(?<n>x))\k<m>\k<n>$
^(?:(?<n>a)|(?<n>x))\k<n>$
^(?:(?<n>a)|(?<n>x)|-)*\k<n>$
^(?:(a)|(x\2))+$
^(?:(a|x\1)-)+$
^(?:(|\B\1){2}|){3,5}$
^(\b([^a]|\2){1,}){4}?a$
^(a|(?:(?<=a)\1|){3}?){2}a$
^(|(a|$|\1(?:))+())+a
^(?:(a)|x|){2,4}\1$
^(a|x|-)*?(?=\1)
((a){0,2}?(\2?)x|){3}((x))
^(a)(x)?\2-$
^(?:(a)(x)?)+\2\1$
^((a)(?:\2|x))+$
^((a)|(x)|(-))+\2\3\4$
^(.+)\1$
^(.+?)\1+$
^(.*)\1$
^(.{1,2})+\1$
^(?:(.)\1)+$
^(?:(.)\1?)+?$
`);

// Shapes written by hand, each with every count below in place of #.
const backreferenceShapes = lines(R`
^(?:(a)|x)#\1-$
^(?:(a)?\1)#x$
^(?:x(.))#\1
(a()#)?\2a
^(a*)#\1x
^(?:(a)|())#\1\2$
^(?:(?:(a)|x)\1)#$
^(a|x(a)?)#\2-$
^(a)#(?:x+|\1)#$
^(?:(a)|(x\1))#\2-
^(\1a|x)#-
^(?:(?<n>a)|(?<n>x))#\k<n>-$
(x|\1)#x
^(a\1)#x
^\1(a)#x
^(?:\2(a)(x))#-
^(?:(a)|x)#(?:\1|-)#$
^(?:(a+)|x)#\1$
^((a)|(x))#\2\3$
^(?:(a)x?|-)#\1$
^(?:(a|x)\1?)#-$
^(?:(?:(a)|x)#-)#\1$
^(a)#\1$
^(a|)#\1x
^(?:(a)|-|)#\1x$
^(?:a(x)?)#\1-
`);
const backreferenceCounts = [
  "{0}", "{1}", "{2}", "{3}", "{0,}", "{1,}", "{2,}", "{0,0}", "{0,1}", "{1,1}", "{0,2}", "{1,2}", "{1,3}", "{2,3}",
  "*", "+", "?", "{0}?", "{1}?", "{0,2}?", "{1,2}?", "{2,}?", "*?", "+?", "??",
];

function backreferences() {
  const r = rng(0xbac4ef05);
  let groups = 0, names = [];
  const literal = () => pick(r, ["a", "a", "a", "x", "x", "-", "[ax]", "[^a]", "."]);
  const count = () => {
    const n = r() % 4;
    let q;
    switch (r() % 9) {
      case 0: case 1: q = "{" + n + "}"; break;
      case 2: case 3: q = "{" + n + ",}"; break;
      case 4: case 5: case 6: q = "{" + n + "," + (n + r() % 3) + "}"; break;
      default: q = pick(r, ["*", "+", "?"]);
    }
    return q + (chance(r, 1, 3) ? "?" : "");
  };
  // A reference to a group that there is, or one in six times to the one after the last so far.
  const reference = () => {
    if (names.length > 0 && chance(r, 1, 3)) return "\\k<" + pick(r, names) + ">";
    return "\\" + (groups === 0 ? 1 : 1 + r() % (groups + (chance(r, 1, 6) ? 1 : 0)));
  };
  const group = (depth) => {
    switch (r() % 6) {
      case 0: case 1: case 2: groups++; return "(" + alternation(depth) + ")";
      case 3: {
        // One named group, or two with one name in separate alternatives.
        const name = "n" + names.length;
        names.push(name);
        groups++;
        if (chance(r, 1, 2)) return "(?<" + name + ">" + alternation(depth) + ")";
        groups++;
        return "(?:(?<" + name + ">" + sequence(depth) + ")|(?<" + name + ">" + sequence(depth) + "))";
      }
      default: return "(?:" + alternation(depth) + ")";
    }
  };
  const term = (depth) => {
    switch (r() % 12) {
      case 0: case 1: case 2: return literal();
      case 3: return pick(r, ["^", "$", "\\b", "(?!$)", "(?=a)", "(?<=x)", "(?<!a)"]);
      case 4: case 5: case 6: return reference() + pick(r, ["", "", "", "?", "*", "{2}", "+?"]);
      case 7: return literal() + pick(r, ["?", "*", "+", "??", "*?", "{1,2}"]);
      case 8: groups++; return pick(r, ["(|a)", "(a|)", "()", "(a)?", "(x)*"]);
      default: return depth < 3 ? group(depth + 1) + count() : literal();
    }
  };
  function sequence(depth) {
    const n = pick(r, [1, 1, 2, 2, 3]);
    let t = "";
    for (let k = 0; k < n; k++) t += term(depth);
    return t;
  }
  function alternation(depth) {
    const n = depth < 3 ? pick(r, [1, 1, 2, 2, 3]) : pick(r, [1, 1, 2]);
    const alternatives = [];
    for (let k = 0; k < n; k++) alternatives.push(sequence(depth));
    return alternatives.join("|");
  }
  const random = () => {
    for (;;) {
      groups = 0; names = [];
      let p = pick(r, ["", "^", "^"]) + group(1) + count();
      if (chance(r, 1, 2)) p += reference();
      if (chance(r, 1, 3)) p += group(1) + count();
      if (chance(r, 1, 2)) p += reference();
      p += pick(r, ["", "$", "$", "a", "-$", "x", "x$"]);
      if (!refersToGroups(p)) continue;
      // One in eight after an escape that the u flag does not allow, so that the pattern is valid only without it.
      return chance(r, 1, 8) ? "(?:\\-|)" + p : p;
    }
  };

  const systematic = [...backreferenceList];
  for (const shape of backreferenceShapes) {
    for (const c of backreferenceCounts) systematic.push(shape.replaceAll("#", c));
  }
  const patterns = assemble(backreferenceSeeds, systematic, random, 4000);

  const texts = unique([
    ...exhaustive(["a", "x", "-"], 4),
    ...backreferenceSeeds.map((s) => s[1]),
    "b", "ab", "aab", "xb", "xaxbb", "xxxxb", "aaaaa", "xaxax", "a-a-a", "ax-ax-", "xaxa-",
  ]);

  return { source: "backreferences", seeds: backreferenceSeeds, patterns, texts, deviations: true };
}

// ---------------------------------------------------------------------------------------------------------------
// Groups that a lookaround sets, read outside it.
//
// A lookahead keeps the captures of the first way it matched and is not entered again, so a group of it may be set
// on some ways and not on others, and a backreference after it reads whichever was taken. A lookbehind matches
// backwards: its last term first, a greedy repetition as far left as it can go, and a backreference before its
// group reads nothing. A host engine that matches a lookbehind forwards, or that does not restore a lookaround's
// captures when the match around it takes another way, answers differently.
//
// The family has three alphabets, each with every text of up to four characters: a, b, c for the lookaheads, and
// a, x, - and a, b, x for the lookbehinds.
// ---------------------------------------------------------------------------------------------------------------

const lookaheadSeeds = [
  ["(?=(a)?b)\\1", "ab"],
  ["^(?:(?=([ab]))[ab](?:c|ca)\\1)*$", "acab"],
  ["^(?:(?=([ab]))[ab](?:c\\1|ca\\1))*$", "acab"],
  ["^(?=((?:c??)?))\\1$", "c"],
  ["^(?=((?:|a)*))\\1$", "a"],
  ["^(?=(?:(a)*(?:c|cb))*\\1b)\\1", "acbcb"],
];
const lookbehindSeeds = [
  ["(?<=(x*?)a*)\\1", "xa"],
  ["(?<=(a|x){2})-\\1", "ax-a"],
  ["(?<=(?:(a)|.)+)x\\1", "ax-"],
  ["(?<=(a|x)+?)-\\1", "ax-x"],
  ["(?<=\\1(a))x", "ax"],
];
const mixedLookbehindSeeds = [
  ["(?<=\\1a*(b))x", "abx"],
  ["(?<=([abc])+)x\\1", "abxa"],
];

const lookaheadList = lines(R`
(?=(?:(a)|b)c)\1
^(?=[bc]*(c)?)b\1$
^(?=(?:b|bc)*(c)?)\1
^(?=(a)*?b?)\1
^(?=(a*)*?(b)?)\2\1
^(?=((?:|c)*))\1$
^(?=(a)?(?:(b)|c)*?\1)\2
^(?=(?:(a)|(b))+?c?)\1\2$
^(?=((?:a|ab)*)c?\1(b)?)\2
^(?=(?:((?:a|ab)*)c)*\1(b)?)\2.
^(?=(?:a(b)?)*c)a\1
^(?=(?:(a)|b){1,2}c?)\1
^(?=(?=(a)?)(b)?a)\1\2
(?=(a|ab)(?:c|(b)c))\1\2
^(?=(a)??(?:b|a))\1
^(?=(?:(a)|(ab))(?:c|bc))\1\2
^(?=(?:((?:a|ab)*)\1c)*)\1
^(?=(?:(a)|b)*?(?:c|(b))\1)\2a
^(?=(a)?(?:\1b)*(c)?)\2
^(?=(?:(a+)|b)(?:\1|c)*?(b)?c)\2
(?=((?:.|.b))??(?:(a)|a)(?:\1)*)\1.
^(?=(?:((?:bb|a))|[ab])\1[bc])\1\1.
a(?=((?:a|cc))*?\1(ab|a))\1\2\1
^(?=(a*?)\1(?:(a?)|c?))\1\1$\2$
^(?=(?:(?:(c)|(b[bc]))|(?:([bc])|(?:[^a]|ba)))(a)?)\1\2\3\4
^(?=(?:b|((?:(?:[bc][^a]|b)a)+)+\1.)\1)a\1\1\1c
^(?=(?:(?:(a)|b)*?(?:c|(b))\1)*)\2a
c(?=b+?((?:(?:.|c[bc]).{0,2}?){1,2})*?)[^a][ab]\1a
^(?=(?:(?:a|ab)(?:b|bc)(?:c|ca)(?:a|ab)(?:b|bc)(?:c|ca)(?:a|ab)(?:b|bc)(?:c|ca))?(a)?)\1
^(?:(?=([ab]+?))(?:\1.)*?b)+$
^(?:(?=(.))(?:[bc]\1[^a]?)+)*$
^(?:(?=([ab]c?))(?:\1([bc]+?))*)*$
^(?:(?=(a*))(?:b\1(?<=\1b?))*?)*$
^(?:(?<=(.))(?:a\1c?)?\1|b)*$
^(?:a(?:(?=(b))b(?:c|\1)*)*)*$
^(?:[bc]?(?:.(?=([ab]c?))(?:c\1)*\1)*?b?)*$
^(?:b?(?:(?<=(a)[^a])a\1\2(?=(?:(a*?)(a)?\1)?)(?:c*\2c?)?\3)?.?){2}
^(?:(?=(a|b))(?:c*\1)+?c)+$
^(?:(?=(a)|b)[ab](?:c|cb)\1)*$
^(?:(?=(a)?)(?:b|ba)\1c)+$
^(?:(?<=(a|b))c(?:a|ab)\1)+$
^(?=(?:(?=(a|b))[ab](?:c|ca)\1)*)\1
^(?=(?:(?:((?:a|ab)*)\1c)*b)*)\1
^(?=(?:(?=(a|b))[ab](?:c|b)*?\1(c)?)*)\1\2
^(?:a?(?:a?(?=(((?:a|ac)){0,2})(?:(?:(?:(?:aa|[^a])a)*(b))*)*)(?!b\3).\2)+c?){2}$
^(?=(?:((?:ba?)?){0,2}|((?:.[ab]|b))??(a)(|a))((c{0,2}?)?))\5$
(?:(?=()((|(.))*))(\2)a)
(?:(?=b(?:((?:c){0,}?))*(([c]))?)[b]\2)$
((?=((?:[^]{0,}?)?)((b)|)(b))(.b))\3
^(?=(()()())((c{0,}?)?))\5$
(?=(()((())(()))(()(())))(?=([^]{0,}?)+((|[^])a))b)\13
^(?=((?:|a)*))\1b
^(?=((?:a??)*))\1b
^(?=(?:a*?)*(a*))\1$
^(?=((?:a|b??)+))\1c
^(?=((?:|a|ab)*)).\1c
^(?=((?:a??){2,3}))\1b
^(?=((?:a??){0,2}))\1b
^(?=((?:|a){1,}?)b?)\1b
(?<=((?:|a)*))b\1
(?<=((?:a??)*)c)b\1
^.*(?<=((?:a??b??)*))c\1$
(?<=(?:c??)*(a|b))c\1
^(?:(?=((?:|a)*))\1b)+$
^(?!(?=((?:|a)*))\1b)
(?=(?=((?:|a)*)).)\1b
^(?=((?:|a)*)\1b)
^(?=(a)?b)\1b$
^(?=(a)|b)\1.$
^(?=(?:(a)|b)(?:(c)|a))\1\2
^(?:(?=(a)?b)\1.)+$
^(?:(?=(.))(?:a|ab)\1)+$
^(?:(?<=(.))(?:a|ab)\1)+$
^(?:(?=([ab]))[ab]c*?\1)*$
(?<=(a+))b\1
(?<=([ab]+)([bc]+))c\1
(?<=(a+)(b*))c\2\1
(?<=\1(a))b
(?<=\1(a+))b
(?<=(a+)\1)b
(?<=\1b*(a+))c
(?<=(a|ab)(b*))c\1
^.*(?<=(?:(a)|b)+)c\1$
(?<=(\w+?)(\w*))c\1
(?<=(a*)\1b)c
(?<=(?:(a|b)(?:c|b){2})+)\1
(?<=(?:(?:c|b){2}(a))+)\1$
(?!(a))\1b
(?=(a))\1
^(?:(?=(a)))?\1b
^(?=(a+))a*b\1$
^(?!.*(.).*\1)[a-c]+$
^(?:(\w)(?!\1))+$
^(?:(\w)(?=\1))+
(?=.*?(a))\1
`);

const lookbehindList = lines(R`
(?<=\1(.))x
(?<=\1(a|x))-
(?<=\1(?:(a)|.))x
(?<!\1(a)|x)-
(?<=\1\1(a))x
(?<=(?:\1-|x)(a)-)x
(?<=\2(a)(x))-
^(?:a|-|(?<=\1(x)))+$
(?<=(a|x){2,}?)-\1
(?<=(a)*?x)-\1
(?<=(?:(a)|x){3})-\1
(?<=(?:(a|x)(-|x)){2})-\1\2
(?<=((a|x){2}-){2})\2\1
(.)?(?<=a(?=\1*?)|(($)+?))x-$
(?:(a)|x)*(?<=x|(?=x{3}\1*|x))x(?<=\1)\1
(a|x)(?<=(?=(?!\1{2,})(?:\1*?a)*?)$|-)-
(?:(?:(?<=$|(|a)\b)(|-)?|.x){4,}?\1){2,}a
(?<=(a|x)+)-\1
(?<=(a|x)*)-\1
(?<=(a|x){2,})-\1
(?<=(a|x){1,2})-\1
(?<=(a|x){0,2}-)\1
(?<=(?:(a)|x)+)-\1
(?<=((a)|x){2,3})-\2
(?<=(a+))-\1
(?<=(a*)x)-\1
(?<=(x)*a)-\1
(?<=((?:a|x)-)+)\1
(.)(?<=([ax])+-)\2\1
(?<=([ax])+)-(?<=(x)*-)\1\2
(?<=(a|x)+)-(?:\1|x)$
^(?:a|x)*(?<=(a|x)+)-\1
(?<=a*(x))-\1
(?<=a+(x|-))\1
(?<=(?:a|xx)?(.)-)\1
(.)(?<=\1*(x)-)\2
(?:(?<=a*(x))-\1)+$
(?<=(|a)x)-\1
(?<=(a??)x)-\1
(?<=(?<!|\1)(a)|x)-\1
(?<=(?!)(a+)|x)-\1
(?<=(?:(a+)(?!))?x)-\1
(?<=^|(a){2,}x)\1
(?<=(a|)x)\1
(?<=(ax|a)-)\1
(?<=(a|ax)-)\1
(?<=(?:(a)|(xa)|)-)\1\2
(?<=a|(x)+)-\1
(?<=(x)+|(a)-)\1\2
(.)(?<=\1+|(a)+)-\2
(?<=(?:(a)|[ax])+)-\1
(?<=(?:(a)|.)*-)\1$
(?<=a?(x*?))-\1
(?<=(a)*x+?)-\1
(?<=(a)*x+?|-+?)\1
(?<=a*(x){1,2}?)-\1
(?<=(?:a|)(x)+?)-\1
(?<=a*(x|-)??)\1
(?=(a)?x)\1
(?=(a)?x)\1x
(?=(?:(a)|x)*-)\1x
(?=(a|(x))-?)\1\2
(?:(?=(a)?x).\1)+$
(?!(a)?x)\1-
^(?:(?=([ax]))[ax](?:-|-a)\1)*$
^(?:(?=(a|x))[ax](?:-|-a)\1)*$
^(?:(?=(.))(?:a|ax)\1)+$
^(?:(?=(a)?)(?:x|xa)\1)*-$
(a)(?<=\1\1)x
(a|x)-(?<!\1-)
^(?:(a)|x)(?<=\1)-
(?<=(a)|(x)-)\1\2
(?<=(?<n>a)|(?<n>x-))\k<n>-
(?<=(?:(?:(a)|x){1,2}\1)+)-
(?<=(\1x|a))-
(?<=^(?:\1(?:(a)|x){1,2}-)+)x
x?(?<=((?:(a)?)+?[ax]|(a|)))\1
x?(?<=((?:[ax]){1,3}?(?:(a)?)+?))\1
x?(?<=((?:(?:a|))+?(?:(x|))+(a)?))\1$
^(?<=((?:(?:a|))*\b(?:(x|))+?|.?))\1+$
a(?<=((?:^)*(?:(a|))+?(?:(a|)){2,}?|$))\1a$
x?(?<=((?:(|a))+))\1a$
(?<=(x*?)a+)\1
(?<=(x*)a*)\1
(?<=(x+?)a*)-\1
(?<=(x{1,2}?)a*)\1
`);

const mixedLookbehindList = lines(R`
(?<=\1(a))b
(?<=\1(.))a
(?<!\1(.))a$
(\w)(?<=\1\1)x
(?<=\1\1(.))x
(?<=(a)(b))x\2\1
(?<=\2\1(a)(b))x
(?<=(?:\1(.)){2})x$
(?<=([ab])+)x\1
(?<=([ab])*)x\1
(?<=([ab]){1,2})x\1
(?<=([ab])+?)x\1
(?<=([ab]){2})x\1
(?<=(a|b)+?)x\1
(?<=(?<n>a)|(?<n>b))\k<n>x
(?<=$|(|a)\b)x\1a
(?<=(a*))x\1b
(?<=(a|ab))x\1$
(?<=^a*(b))x\1$
(?<=(a)x|(b)x)\1\2$
(?<=(?:(a)|(b))x)\1\2$
(?<=(?:(a|b)(?:x|b){2})+)\1
(?<=(?:(?:x|b){2}(a))+)\1
(?<=(?:(a)(?:x|b){2})*)\1$
(?<=^(?:(a|x)(?:a|b){2})*)\1\1
(?<=(?:(a)(?:x|b){2})+b)\1
(?<=\1a+(b))x
(?<=\1a?(b))x
(?<=\1[ab]*(b))x
(?<=\1(?:a|bb)*(b))x
(?<=(a)\1)b
(?<=(\d+)(\d+))$
(?<=([abx])+)x\1
(\d)(?<=\1\1)
(?<=(.)\1)a
(?<=\1(.))a
`);

function lookarounds() {
  const r = rng(0x100ca006);
  const rnd = (n) => r() % n;
  const of = (list) => list[r() % list.length];
  let groups = 0;

  // Lookaheads over a, b, c: a group set on some ways through the lookahead and not on others, and a lookaround
  // whose group is read in the same repetition, with places between the two where the match can take another way.
  const ahead = () => {
    const ch = () => of(["a", "b", "c", "a", "b", "[ab]", ".", "[^a]", "[bc]"]);
    const quant = () => of(["*", "+", "?", "*?", "+?", "??", "{1,2}", "{2}", "{0,2}?", "{2,}"]);
    const ref = () => "\\" + (1 + rnd(Math.max(groups, 1) + (rnd(8) === 0 ? 1 : 0)));
    const plain = (depth) => {
      const k = rnd(12);
      if (k < 5 || depth > 2) return ch();
      if (k < 7) return "(?:" + ch() + "|" + ch() + ch() + ")";
      if (k < 8) return "(?:" + ch() + ch() + "|" + ch() + ")";
      if (k < 10) return ch() + quant();
      if (k < 11) return "(?:" + plain(depth + 1) + plain(depth + 1) + ")" + quant();
      return of(["\\b", "^", "$", "(?!a)", "(?=b)", ""]);
    };
    const laTerm = (depth) => {
      const k = rnd(16);
      if (k < 3) return plain(depth);
      if (k < 5) { groups++; return "(" + plain(depth) + ")" + of(["?", "?", "*", "??", "*?", "+", "{0,2}", ""]); }
      if (k < 7) { groups++; return "(?:(" + plain(depth) + ")|" + plain(depth) + ")"; }
      if (k < 8) { groups += 2; return "(?:(" + ch() + ")|(" + ch() + ch() + "))"; }
      if (k < 9) { groups++; return "(?:" + plain(depth) + "(" + ch() + "))" + of(["*", "+", "?", "*?", "{1,2}"]); }
      if (k < 10) { groups++; return "(" + of(["a|ab", "ab|a", "a*", "a*?", "|a", "a|", "[ab]+", "[ab]+?"]) + ")"; }
      if (k < 11 && groups > 0) return ref();
      if (k < 12 && depth < 2) return "(?:" + laSeq(depth + 1) + "|" + laSeq(depth + 1) + ")";
      if (k < 13 && depth < 2) return "(?:" + laSeq(depth + 1) + ")" + of(["?", "*", "*?", "??", "{1,2}"]);
      if (k < 14 && depth < 2) return "(?=" + laSeq(depth + 1) + ")";
      if (k < 15 && depth < 2) { groups++; return "(" + laSeq(depth + 1) + ")"; }
      return plain(depth);
    };
    function laSeq(depth) {
      let s = "";
      for (let n = 1 + rnd(3); n > 0; n--) s += laTerm(depth);
      return s;
    }
    const look = () => {
      const k = rnd(10);
      if (k < 6) return "(?=" + laSeq(0) + ")";
      if (k < 7) { groups++; return "(?=(" + of(["[ab]", ".", "a|b", "[ab]c?", "a*"]) + "))"; }
      if (k < 8) { groups++; return "(?<=(" + of(["a", "[ab]", ".", "b"]) + "))"; }
      if (k < 9) { groups++; return "(?=(" + ch() + ")|" + ch() + ")"; }
      groups++;
      return "(?<=(" + ch() + ")" + ch() + ")";
    };
    const between = () => {
      const k = rnd(14);
      if (k < 3) return ch();
      if (k < 5) return "(?:" + ch() + "|" + ch() + ch() + ")";
      if (k < 6) return ch() + quant();
      if (k < 7) return "(?:" + ch() + ref() + "|" + ch() + ch() + ref() + ")";
      if (k < 8) return "(?:" + ch() + ref() + ")" + quant();
      if (k < 9) return "(?:" + ch() + "|" + ref() + ")" + quant();
      if (k < 10) return "(?:" + ch() + of(["", "?", "*"]) + ref() + ch() + "?)" + of(["?", "*", "*?", "{0,2}"]);
      if (k < 11) { groups++; return "(" + ch() + of(["", "?", "*", "+?"]) + ")"; }
      if (k < 12) return of(["(?!", "(?="]) + ch() + ref() + ")";
      if (k < 13) return "(?<=" + ref() + ch() + "?)";
      return "";
    };
    const tail = () => {
      let s = "";
      for (let n = rnd(4); n > 0; n--) s += of([ref, ref, ch, () => "$", between])();
      return s;
    };
    const body = () => {
      let s = of(["", "", ch(), ch() + "?"]) + look();
      for (let n = 1 + rnd(3); n > 0; n--) s += between();
      s += ref() + tail();
      if (rnd(5) === 0) s += look() + between() + ref();
      return s;
    };
    for (;;) {
      groups = 0;
      const k = rnd(10);
      let p;
      if (k < 3) {
        p = of(["", "^", "^", ch(), "(?:a|ab)"]) + look() + tail() + ref() + of(["", "$", ch()]);
      } else if (k < 8) {
        p = of(["^", "^", ""]) + "(?:" + body() + (rnd(4) === 0 ? "|" + ch() : "") + ")"
          + of(["*", "+", "*?", "{2}", "{1,3}", "*", "+"]) + of(["$", "$", "", ref()]);
      } else if (k < 9) {
        p = "^(?:" + ch() + "?(?:" + body() + ")" + of(["*", "+", "?", "*?"]) + ch() + "?)" + of(["*", "+", "{2}"])
          + of(["$", ""]);
      } else {
        p = "^(?:" + look() + "(?:" + between() + ref() + between() + ")" + of(["*", "+", "*?"]) + tail() + ")"
          + of(["*", "+"]) + "$";
      }
      if (refersToGroups(p)) return p;
    }
  };

  // Lookbehinds over a, x, -: any body, with its groups read after it or inside it.
  const behindAny = () => {
    const ref = () => groups === 0 ? "a" : "\\" + (1 + rnd(Math.max(groups + (rnd(3) === 0 ? 1 : 0), 1)));
    const quant = () => of(["", "", "", "", "{2}", "{1,2}", "?", "*", "+", "{2}?", "*?", "+?", "{0}", "{3}", "{2,}"]);
    const atom = (d) => {
      switch (rnd(12)) {
        case 0: case 1: return of(["a", "x", "-", "[ax]", ".", "[^a]"]);
        case 2: case 3: groups++; return "(" + alt(d + 1) + ")";
        case 4: return "(?:" + alt(d + 1) + ")";
        case 5: return d < 3 ? "(?=" + alt(d + 1) + ")" : "a";
        case 6: return d < 3 ? "(?!" + alt(d + 1) + ")" : "x";
        case 7: return ref();
        case 8: return of(["", "\\b", "^", "$"]);
        default: return of(["a", "x", "-"]);
      }
    };
    const seq = (d) => {
      let t = "";
      for (let n = 1 + rnd(3); n > 0; n--) {
        const a = atom(d);
        const bare = a === "" || a === "^" || a === "$" || a === "\\b" || a.startsWith("(?=") || a.startsWith("(?!");
        t += a + (bare ? "" : quant());
      }
      return t;
    };
    function alt(d) {
      let t = seq(d);
      if (d < 3 && rnd(3) === 0) t += "|" + seq(d);
      return t;
    }
    for (;;) {
      groups = 0;
      let p = of(["", "", "(a|x)", "(.)?", "(?:(a)|x)*"]);
      if (p) groups += 1;
      p += of(["(?<=", "(?<=", "(?<=", "(?<!"]) + alt(1) + ")";
      for (let n = 1 + rnd(3); n > 0; n--) {
        p += of([ref, ref, () => "a", () => "x", () => "-", () => "$", () => "(?<=" + ref() + ")"])();
      }
      if (refersToGroups(p)) return p;
    }
  };

  // Lookbehinds over a, x, -: a repetition first, groups with alternatives that set a group or not, fixed ends.
  const behindLeading = () => {
    const ch = () => of(["a", "x", "-", ".", "[ax]", "[^a]", "[a-]"]);
    const g = (b) => "(" + b + ")";
    const open = () => { groups++; return ""; };
    const fixed = (d) => {
      switch (rnd(9)) {
        case 0: return open() + g(ch());
        case 1: return "(?:" + open() + g(ch()) + "|" + ch() + ")";
        case 2: return "(?:" + ch() + "|" + open() + g(ch()) + ")";
        case 3: groups += 2; return g(g(ch()) + "|" + ch());
        case 4: return d < 2 ? fixed(d + 1) + fixed(d + 1) : ch();
        case 5: return open() + g(ch() + ch());
        case 6: return d < 2 ? "(?:" + fixed(d + 1) + "){2}" : ch();
        case 7: return of(["\\b", "(?=a)", "(?!x)", "(?<!-)", "^"]) + open() + g(ch());
        default: return ch();
      }
    };
    const count = () => of(["+", "*", "?", "{2,}", "{1,2}", "{0,2}", "{2,3}", "{1,}", "+?", "*?", "{1,2}?"]);
    const first = () => {
      switch (rnd(10)) {
        case 0: case 1: case 2: return "(?:" + fixed(0) + ")" + count();
        case 3: return open() + g(of(["a", "x", "[ax]", "."]) + count());
        case 4: {
          const b = of(["a|ax", "ax|a", "a|", "|a", "a|x", "ax|-x|x", "(a)|xx", "a|(x)x"]);
          groups += b.includes("(") ? 2 : 1;
          return g(b);
        }
        case 5: {
          const b = of(["(a)|(xa)|", "(a)|x(x)", "a(x)|(-)", "(?:(a)|x)|(xa)"]);
          groups += 2;
          return "(?:" + b + ")";
        }
        case 6: return of(["a*", "x?", ".*?", "(?:a|xx)*", "-+", "a*x?"]);
        case 7: return open() + g("(?:" + fixed(1) + ")" + count());
        default: return "";
      }
    };
    const alt = () => {
      let t = first();
      for (let n = rnd(3); n > 0; n--) t += fixed(1);
      return t;
    };
    for (;;) {
      groups = 0;
      let p = of(["", "", "", "(.)", "(a|x)?", "^", "(?:a|x)*", "-"]);
      if (p.startsWith("(.") || p.startsWith("(a")) groups++;
      let body = alt();
      for (let n = rnd(3); n > 0 && rnd(2); n--) body += "|" + alt();
      p += "(?<=" + body + ")";
      const ref = () => "\\" + (1 + rnd(Math.max(groups, 1)));
      for (let n = 1 + rnd(4); n > 0; n--) {
        p += of([ref, ref, ref, () => "a", () => "x", () => "-", () => "$", () => "(?:" + ref() + "|x)",
          () => "(?<=" + ref() + ")", () => ref() + "?", () => "(?!" + ref() + ")", () => "."])();
      }
      if (rnd(5) === 0) p += "(?<=" + alt() + ")" + of([ref(), ref() + "$", "\\" + Math.max(groups, 1)]);
      if (refersToGroups(p)) return p;
    }
  };

  // Lookbehinds over a, b, x: terms of a fixed length, groups read outside, references to groups of the lookbehind.
  const behindRigid = () => {
    const ch = () => of(["a", "b", "x", ".", "[ab]", "[^a]", "\\w"]);
    const rigid = (depth, inside) => {
      const k = rnd(10);
      if (k < 4 || depth > 2) return ch();
      if (k < 6) { const b = seq(depth + 1, inside); groups++; return "(" + b + ")"; }
      if (k < 7) return "(?:" + ch() + "|" + ch() + ")";
      if (k < 8) return "(?:" + seq(depth + 1, inside) + "){" + (1 + rnd(2)) + "}";
      if (k < 9) return of(["\\b", "^", "(?=a)", "(?!b)", "$", "(?<!x)"]);
      return inside ? "\\" + (groups + 1 + rnd(2)) : ch();
    };
    function seq(depth, inside) {
      let s = "";
      for (let n = 1 + rnd(3); n > 0; n--) s += rigid(depth, inside);
      return s;
    }
    const first = () => {
      const k = rnd(8);
      if (k < 2) return "";
      if (k < 3) return of(["a*", ".*", "^", "x?", "(?:a|bb)*", "b+?"]);
      if (k < 5) { groups++; return "(" + ch() + ")" + of(["*", "+", "?", "+?", "*?", "{1,2}", "{2,}", "{0,2}?"]); }
      if (k < 6) { groups++; return "(" + of(["a*", "a+?", "|a", "a|", "a|ab", "ab|a", "[ab]{1,2}", ".*?"]) + ")"; }
      if (k < 7) { groups++; return "(?:(" + ch() + ")" + ch() + ")" + of(["*", "+", "{2}", "+?"]); }
      return "(?:" + seq(1, true) + ")" + of(["*", "+", "{1,2}"]);
    };
    const alt = () => first() + seq(0, true);
    for (;;) {
      groups = 0;
      const pre = of(["", "", "(.)", "(a|b)?", "^"]);
      if (pre.includes("(")) groups++;
      let body = alt();
      for (let n = rnd(3); n > 0 && rnd(2); n--) body += "|" + alt();
      let p = pre + (rnd(6) === 0 ? "(?<!" : "(?<=") + body + ")";
      for (let n = rnd(3); n >= 0; n--) p += of(["x", "a", "\\1", "\\2", "\\1", "\\3", "$", "(?<=\\1)", "b"]);
      if (rnd(4) === 0) p = "(?:" + p + ")" + of(["+", "*", "{2}"]) + of(["", "\\1", "$"]);
      if (refersToGroups(p)) return p;
    }
  };

  const lists = [
    unique([...exhaustive(["a", "b", "c"], 4), ...lookaheadSeeds.map((s) => s[1]), "acaca", "acbcb", "acbccb", "abcabc",
      "aabbaa", "acacab", "bcbcab", "abababa", "ababcab", "acaacab", "abcab"]),
    unique([...exhaustive(["a", "x", "-"], 4), ...lookbehindSeeds.map((s) => s[1]), "aaxa-", "ax-ax", "xa-xa", "a-a-a",
      "xx-xx", "aax-a", "axx-x", "xxa-a"]),
    unique([...exhaustive(["a", "b", "x"], 4), ...mixedLookbehindSeeds.map((s) => s[1]), "ababx", "xaaxa", "aaxaab",
      "abxba", "baabx", "aabbx", "abxab", "xabxba", "aaaxaa", "ababxab", "12", "a1x11"]),
  ];
  const behind = () => (chance(r, 1, 2) ? behindAny() : behindLeading());
  const patterns = together(
    part(assemble(lookaheadSeeds, lookaheadList, ahead, 1800), "", 0),
    part(assemble(lookbehindSeeds, lookbehindList, behind, 1600), "", 1),
    part(assemble(mixedLookbehindSeeds, mixedLookbehindList, behindRigid, 1100), "", 2));

  return {
    source: "lookarounds", seeds: [...lookaheadSeeds, ...lookbehindSeeds, ...mixedLookbehindSeeds], patterns,
    texts: lists[0], lists, deviations: true,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Case-insensitive matching, with the u flag and without it.
//
// With the u flag two characters are the same when their simple case foldings are the same. Without it they are the
// same when their upper cases are, and a character that is not ASCII never matches an ASCII one. So the Kelvin sign
// matches k with the u flag only, and the long s matches s with the u flag only. The dotless and dotted i of
// Turkish match i in neither. A backreference is compared the same way, one character at a time. Host engines have
// case tables of their own, and their own way with a backreference.
//
// The pairs below are those on which a host engine was measured to differ from V8: the regular expression engines
// of .NET 10, of Java 21 and 25, of Python 3.10 to 3.14 (re, and the regex package), and PCRE2 10.42 and 10.46.
// Each is two code points in hexadecimal, and a-b*n is n pairs that go up together from a and b. A host engine holds
// one of a pair to match the other where V8 does not, or the other way about, with the u flag or without it. The
// 50 measured pairs with a character that Unicode 16 has not assigned are left out: an engine with a later Unicode
// holds them to match, and V8's answer would only say that it does not know the character.
// ---------------------------------------------------------------------------------------------------------------

const casePairs = ("49-130 49-131 4b-212a 53-17f 69-130 69-131 6b-212a 73-17f b5-39c b5-3bc c5-212b df-1e9e e5-212b "
  + "130-131 19b-a7dc 264-a7cb 345-399 345-3b9 345-1fbe 390-1fd3 392-3d0 395-3f5 398-3d1 398-3f4 399-1fbe "
  + "39a-3f0 3a0-3d6 3a1-3f1 3a3-3c2 3a6-3d5 3a9-2126 3b0-1fe3 3b2-3d0 3b5-3f5 3b8-3d1 3b8-3f4 3b9-1fbe "
  + "3ba-3f0 3c0-3d6 3c1-3f1 3c2-3c3 3c6-3d5 3c9-2126 3d1-3f4 412-1c80 414-1c81 41e-1c82 421-1c83*2 "
  + "422-1c85 42a-1c86 432-1c80 434-1c81 43e-1c82 441-1c83*2 442-1c85 44a-1c86 462-1c87 463-1c87 "
  + "1c84-1c85 1c88-a64a 1c88-a64b 1c89-1c8a 1e60-1e9b 1e61-1e9b 1f80-1f88*8 1f90-1f98*8 1fa0-1fa8*8 "
  + "1fb3-1fbc 1fc3-1fcc 1ff3-1ffc 2c2f-2c5f a7c0-a7c1 a7cc-a7cd a7d0-a7d1 a7d6-a7d7 a7d8-a7d9 a7da-a7db "
  + "fb05-fb06 10400-10428*40 104b0-104d8*36 10570-10597*11 1057c-105a3*15 1058c-105b3*7 10594-105bb*2 "
  + "10c80-10cc0*51 10d50-10d70*22 118a0-118c0*32 16e40-16e60*32 1e900-1e922*34").split(" ");
// Pairs that are in none of those measurements, for the ordinary cases beside the others: ASCII, Latin-1, a letter
// with three cases, the final sigma, Cherokee (whose folding goes to the upper case) and a ligature with no pair.
const plainPairs = "41-61 49-69 4b-6b 53-73 c9-e9 1c4-1c5 1c5-1c6 1c4-1c6 3a3-3c3 39c-3bc 13a0-ab70 13f0-13f8 fb00-fb01"
  .split(" ");

const caseSeeds = [
  ["^(.)\\1$", "s\u017f", "i"],
  ["^(.)\\1$", "k\u212a", "i"],
  ["^(.)\\1$", "i\u0130", "i"],
  ["^(.)\\1$", "\u00df\u1e9e", "i"],
  ["^(.)\\1$", "\u03c2\u03c3", "i"],
  ["^(.)\\1$", "\ufb05\ufb06", "i"],
  ["\\-{0}^(.)\\1$", "s\u017f", "i"],
  ["\\-{0}^(.)\\1$", "\u1f80\u1f88", "i"],
  ["^(.)(?i:\\1)$", "k\u212a", ""],
  ["^(b*)(?<=\\1)c$", "bBc", "i"],
  ["^(?:(?=(a|))c\\1)*$", "cAc", "i"],
  ["(s)(.)((?<=\\1)|-)+", "sS", "i"],
  ["^\\u212a$", "k", "i"],
  ["^\\u017f$", "s", "i"],
  ["^[\\W]$", "s", "i"],
  ["^(..)\\1$", "\u00dfSs\u1e9e", "i"],
  ["^(...)\\1$", "\u1e9eS\u00df\u1e9e\u00df\u017f", "i"],
  ["^(.)(.)(.)\\1\\2\\3$", "\u1e9eS\u00df\u1e9e\u00df\u017f", "i"],
  ["^(?<n0>\\1|\u00df)*?(..\\W){1,2}\\2{2}$", "\u00df\u1e9e\u017f\u00df\u1e9eS\u00df\u1e9e\u00df\u017f", "i"],
  ["^(?i:\\u212a)$", "k", ""],
  ["(?i:\\Bs)", "s\u017f", ""],
];

// Patterns that read two characters and compare them. Each is matched against every pair, both ways round.
const casePairPatterns = lines(R`
^(.)\1$
^(?<n>.)\k<n>$
^(.+)\1$
^(?:(.)\1)+$
^([^])\1$
^(\w)\1$
^(\W)\1$
^([^a])\1$
^(.)?\1.$
^(?:(.)|.)\1
^..(?<=(.)\1)$
^..(?<=\1(.))$
^(.).(?<=\1)$
^(?=.(.))\1
^(.)(?!\1).$
^.\b.$
^.\B.$
^\w\W$
^\W\w$
^[a-z][^a-z]$
^[^\W\d][\W\d]$
`);
const caseModifierPatterns = lines(R`
^(.)(?i:\1)$
^(?i:(.))\1$
^(?i:(.)(?-i:\1))$
(?i:^(.)\1$)
^(?i:(.)\1)$
^(.)(?i:\1)(?-i:\1)?$
^(?:(.)|-)(?i:\1)$
(?<=(.)(?i:\1))$
(?<=(?i:\1)(.))$
^.(?i:\b).$
^(?i:.\b).$
^(?i:\w)\W$
^(?i:\w\W)$
^(?i:[a-z])(?-i:[^a-z])$
`);
// Patterns that read two, three or four characters and compare them as a whole.
const caseGroupPatterns = lines(R`
^(..)\1$
^(...)\1$
^(.)(.)\1\2$
^(.)(.)(.)\1\2\3$
^(.+)\1$
^(?:(.)\1|..)*$
^....(?<=(..)\1)$
^....(?<=\1(..))$
^(?=..(..))\1
^(?:(..)\1)+$
^(.)\1(.)\2$
^(..)(?i:\1)$
^(?i:(..)\1)$
`);

function caseFolding() {
  const r = rng(0xca5ef007);
  // Every pair, and the characters that have a pattern of their own: all of those in the Basic Multilingual Plane,
  // and of a run of pairs beyond it the first two pairs and the last.
  const pairs = [], characters = [];
  for (const token of [...casePairs, ...plainPairs]) {
    const [a, b, n] = token.split(/[-*]/).map((x, k) => (k < 2 ? parseInt(x, 16) : Number(x)));
    for (let k = 0; k < (n || 1); k++) {
      pairs.push([String.fromCodePoint(a + k), String.fromCodePoint(b + k)]);
      if (b < 0x10000 || k < 2 || k === n - 1) characters.push(...pairs[pairs.length - 1]);
    }
  }
  characters.splice(0, characters.length, ...unique(characters));

  // Each pair both ways round, and each of those characters twice and beside one that is not its pair.
  const pairTexts = ["", "a", "ab", "a-", "aa"];
  for (const [a, b] of pairs) pairTexts.push(a + b, b + a);
  for (const c of characters) pairTexts.push(c + c, c + "a");
  const singles = ["", ...characters, "a", "z", "-", "_", "0", " ", "\u00e0", "\u00c0", "\u03b1", "\ufb00", "aa"];
  // Words of sharp s, capital sharp s, s, S and long s, and of two ligatures, which full case folding would join.
  const wide = ["\u00df", "\u1e9e", "s", "S"];
  const groupTexts = ["", "ss", "s\u00df", "\ufb00ff\ufb00", "ff\ufb00\ufb00", "\ufb00\ufb00", "\ufb05st\ufb06",
    "st\ufb05\ufb06", "\u00df\u1e9e\u017f\u00df\u1e9eS\u00df\u1e9e\u00df\u017f", "\u1e9eS\u00df\u1e9e\u00df\u017f",
    "sSs\u017f\u017fS", "kK\u212a\u212akK", "iI\u0130I\u0131i", "\u0149n\u02bcn", "\u01f0j\u030c", "aAAa", "abAB",
    "\u{10400}\u{10428}\u{10428}\u{10400}"];
  for (const a of wide) {
    for (const b of wide) for (const c of wide) for (const d of wide) groupTexts.push(a + b + c + d);
  }

  // The letters of the random patterns and of their texts: one or two of each kind of pair.
  const letters = ["s", "S", "\u017f", "k", "K", "\u212a", "i", "I", "\u0131", "\u0130", "\u00df", "\u1e9e", "\u01c5",
    "\u01c4", "\u01c6", "\u1f80", "\u1f88", "\u03c3", "\u03c2", "\u03a3", "\u00b5", "\u03bc", "\u039c", "\u00e5",
    "\u212b", "\u03c9", "\u2126", "\u03b8", "\u03d1", "\u03f4", "\u0432", "\u1c80", "\ufb05", "\ufb06", "\u0390",
    "\u1fd3", "\u13a0", "\uab70", "\u019b", "\ua7dc", "\u0345", "\u0399", "a", "A", "-", "0", "\u{10400}",
    "\u{10428}", "\u{1e900}", "\u{1e922}"];
  const orbit = (c) => {
    const set = [c];
    for (const [a, b] of pairs) {
      if (a === c) set.push(b);
      if (b === c) set.push(a);
    }
    return set;
  };
  const variant = (c) => pick(r, orbit(c));
  const words = ["", ...letters];
  const seen = new Set(words);
  while (words.length < 160) {
    let w = "";
    for (let k = 1 + r() % 3; k > 0; k--) w += pick(r, letters);
    let t = w;
    if (chance(r, 2, 3)) t += [...w].map(variant).join("");
    if (chance(r, 1, 4)) t += pick(r, letters);
    if (chance(r, 1, 4)) t = pick(r, letters) + t;
    if (chance(r, 1, 5)) t += [...w].map(variant).join("");
    if (seen.has(t)) continue;
    seen.add(t);
    words.push(t);
  }
  const lists = [unique(pairTexts), unique(singles), unique([...groupTexts, ...caseSeeds.map((s) => s[1])]), words];

  // A pattern that is valid only without the u flag: an escape of a character that needs none, repeated no times.
  const legacyOnly = (p) => "\\-{0}" + p;

  // One character at a time: as a literal, in a class, in a class it is not in, and in a modifier group. Each is
  // matched against the character, the characters it is paired with and theirs, and a few that every one has.
  const core = ["", "a", "A", "k", "K", "\u212a", "s", "S", "\u017f", "i", "I", "\u0130", "\u0131", "\u00df", "\u1e9e",
    "\u03c3", "\u03c2", "\u03a3", "\u00b5", "\u03bc", "\u039c", "\u00e5", "\u00c5", "\u212b", "\u03c9", "\u03a9",
    "\u2126", "\u03b8", "\u0398", "\u03d1", "\u03f4", "-", "0", "_", "aa", "\u{10400}", "\u{10428}"];
  const ofCharacter = [], ofCharacterModifier = [];
  for (const c of characters) {
    const written = c.length === 1 ? escapeOf(c) : c;
    lists.push(unique([c, ...orbit(c), ...orbit(c).flatMap(orbit), c + c, ...core]));
    const forms = ["^" + written + "$", "^[" + written + "]$", "^[^" + written + "]$"];
    if (c.length === 1) forms.push(legacyOnly("^" + written + "$"));
    ofCharacter.push(...part(forms, "i", lists.length - 1));
    ofCharacterModifier.push(...part(["^(?i:" + written + ")$"], "", lists.length - 1));
  }
  const single = [], singleModifier = [];
  const sets = ["^\\w$", "^\\W$", "^[\\w]$", "^[\\W]$", "^[^\\w]$", "^[^\\W]$", "^[a-z]$", "^[^a-z]$", "^[A-Z]$", "^.$",
    "^\\p{Lu}$", "^\\p{Ll}$", "^\\P{Lu}$", "^[^\\p{Ll}]$", "^\\p{L}$", "^[\\u0370-\\u03ff]$", "^[^\\u0370-\\u03ff]$",
    "^[\\u1f80-\\u1faf]$", "^[k-s]$", "\\b.\\b", "\\B.\\B", "^\\b", "\\b$"];
  single.push(...sets, ...sets.map(legacyOnly));
  for (const p of ["\\w", "\\W", "[\\w]", "[\\W]", "[^\\W]", "[a-z]", "[^a-z]", "[k-s]", ".", "\\b.\\b", "\\B.\\B"]) {
    singleModifier.push("^(?i:" + p + ")$", legacyOnly("^(?i:" + p + ")$"));
  }

  // Random patterns: groups, classes and backreferences compared without case, in repetitions and lookarounds.
  let groups = 0, names = [];
  const written = (c) => (c.length === 1 && c.charCodeAt(0) > 127 && chance(r, 1, 3) ? escapeOf(c) : c);
  const cls = () => pick(r, ["[a-z]", "[^a]", "[is\\u0130\\u0131\\u017fk]", "\\w", "\\W", "[\\w\\u017f\\u212a\\u0130]",
    "[^-]", "[\\u03b1-\\u03c9]", "\\S", "[^\\W\\d]", "[\\W_]", "[k-s]", "[^k]", "[\\u00df-\\u00ff]", "[A-Z]"]);
  const quantifier = () => pick(r, ["", "", "", "", "?", "*", "+", "{2}", "{1,2}", "+?", "*?", "??"]);
  const reference = () => names.length > 0 && chance(r, 1, 3) ? "\\k<" + pick(r, names) + ">"
    : "\\" + (1 + r() % Math.max(groups, 1));
  const modifier = () => pick(r, ["i", "i", "i", "-i", "im", "is", "i-s", "s-i", "m-i"]);
  // With scoped, a third of the groups that capture nothing are modifier groups.
  const atom = (depth, scoped) => {
    switch (r() % 15) {
      case 0: case 1: return written(pick(r, letters));
      case 2: case 3: return cls();
      case 4: return ".";
      case 5: case 6: case 7: {
        if (depth >= 3) return ".";
        let open = "(";
        if (chance(r, 1, 4)) { const name = "n" + names.length; names.push(name); open = "(?<" + name + ">"; }
        groups++;
        return open + alternation(depth + 1, scoped) + ")" + quantifier();
      }
      case 8: case 9: case 10:
        return groups > 0 ? reference() + pick(r, ["", "", "?", "+", "{2}"]) : written(pick(r, letters));
      case 11: return depth < 3 ? pick(r, ["(?<=", "(?<=", "(?<!"]) + alternation(depth + 1, scoped) + ")" : ".";
      case 12: return depth < 3 ? pick(r, ["(?=", "(?=", "(?!"]) + alternation(depth + 1, scoped) + ")" : ".";
      case 13: return pick(r, ["\\b", "\\B", "^", "$"]);
      default: {
        if (depth >= 3) return written(pick(r, letters));
        const open = scoped && chance(r, 2, 3) ? "(?" + modifier() + ":" : "(?:";
        return open + alternation(depth + 1, scoped) + ")" + quantifier();
      }
    }
  };
  function sequence(depth, scoped) {
    let t = "";
    for (let k = 1 + r() % 3; k > 0; k--) t += atom(depth, scoped);
    return t;
  }
  function alternation(depth, scoped) {
    let t = sequence(depth, scoped);
    if (chance(r, 1, 5)) t += "|" + sequence(depth, scoped);
    return t;
  }
  const make = (scoped) => () => {
    for (;;) {
      groups = 0; names = [];
      let p = pick(r, ["^", "^", ""]) + alternation(0, scoped) + pick(r, ["$", "$", ""]);
      if (scoped && !/\(\?[ims-]+:/.test(p)) p = "(?i:" + p + ")";
      if (chance(r, 1, 3)) p = pick(r, ["\\-{0}", "(?:\\-|)"]) + p;
      // A text with a great many of one letter is no use here, and a counted reference to nothing is slow.
      if (hasReference(p) || chance(r, 1, 3)) return p;
    }
  };
  const none = [];
  const withFlag = assemble(none, [], make(false), 1200);
  const withModifier = assemble(none, [], make(true), 400);

  const both = (list) => [...list, ...list.map(legacyOnly)];
  const patterns = together(
    part(both(casePairPatterns), "i", 0),
    part(both(caseModifierPatterns), "", 0),
    ofCharacter,
    ofCharacterModifier,
    part(single, "i", 1),
    part(singleModifier, "", 1),
    part(both(caseGroupPatterns.filter((p) => !p.includes("(?i"))), "i", 2),
    part(caseGroupPatterns.filter((p) => p.includes("(?i")), "", 2),
    part(caseSeeds.filter((s) => s[2] === "i").map((s) => s[0]), "i", 2),
    part(caseSeeds.filter((s) => s[2] === "").map((s) => s[0]), "", 2),
    part(withFlag, "i", 3),
    part(withModifier, "", 3));

  return {
    source: "case-folding", seeds: caseSeeds, patterns, texts: lists[0], lists, deviations: true, reference: true,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Patterns that are matched by UTF-16 code unit.
//
// A pattern that is valid only without the u flag is matched a code unit at a time. A character beyond the Basic
// Multilingual Plane is then two units to the dot, to a class and to a quantifier, and a literal one in the pattern
// is two atoms, of which a quantifier repeats the second. A host engine that matches code points answers
// differently for every such text. Each pattern here is given twice: as it is, which the u flag accepts, and after
// \-{0}, which only the grammar without the u flag accepts and which matches nothing.
//
// The family also has classes that are the complement of a property and of its own complement, such as
// [^\p{L}\P{L}], which matches no character at all.
// ---------------------------------------------------------------------------------------------------------------

const deseret = "\u{10400}", deseretSmall = "\u{10428}", face = "\u{1F600}";

const codeUnitSeeds = [
  ["^\\-?.$", deseret],
  ["^\\-?" + deseret + "*$", deseret + deseret],
  ["[^\\p{L}\\P{L}]", "a"],
  ["\\-{0}^.$", deseret],
  ["\\-{0}^[^a]{2}$", face],
  ["(?<!^.*)", deseretSmall],
];

const codeUnitList = lines(R`
^\-?X*$
^\-?X+$
^\-?X?x$
^\-?[X]$
^\-?[X]{2}$
^\-?.$
^\-?..$
^\-?[^a]$
^\-?[^a]{2}$
^\-?\W$
^\-?\S\S$
^\-?\D{3}$
^\-?X{2}$
^\-?(?:X){2}$
^\-?(X)\1$
^\-?(.)\1$
^\-?(?i:X)$
^\-?(?i:[X])$
^\-?[a-X]+$
\-?(?<=X)a
^\-?\u{2}$
\-?X\b
\-?\BX
^\-?.\B.$
\-?a|X
^\-?(?<n>X)\k<n>$
^\-?[^X]$
^\-?(?:.|X)$
\-?^.{2}(?!.)
^\-?\x{1}X$
^\-?[\s\S]$
^\-?[\w-X]{2}$
\-?(?=X)..$
^\-?a?$
^[\w\-]+\-?$
^\-?[a-z]*$
\B\&?
\-?(?!a)(?<!a)
\-?(?<=a)(?=a)
(?m:\-?^$)
\-?a\Ba
\-?\b\b$
^\-?a(?=.a)
^\-?a(?=..a)
(?<!^.*)
(?<!^.+)a
(?<=^.*)$
\B
^.\B
(?<!a)
(?<=X)
`);

function codeUnits() {
  const r = rng(0xc0de0008);
  const atoms = [deseret, "\\ud801\\udc00", ".", "[^a]", "\\W", "\\S", "\\D", "[\\s\\S]", "[^]", "[" + deseret + "]",
    "[^" + deseret + "]", "[" + deseret + "-" + deseretSmall + "]", "[a" + deseret + "]", "[\\w" + deseret + "]", face,
    "[" + face + "]", "[^" + face + "a]", "\\p{L}", "\\P{L}", "[^\\p{L}\\P{L}]", "[\\p{L}\\P{L}]", "[^\\P{L}]",
    "[^\\p{Lu}\\P{Lu}a]", "[^\\d\\D]", "[^\\w\\W]", "[^\\s\\S]", "(?:.)", "(.)", "(?:" + deseret + ")", "\\p{Any}",
    "[\\P{L}\\p{Lu}]", "[^\\p{Ll}\\P{L}]", "\\u{10400}", "[\\u{10400}-\\u{10428}]", "(?:a|" + deseret + ")"];
  const templates = ["^#$", "^#{2}$", "^#+$", "^#*$", "^#?a$", "^##$", "^a#$", "^#a$", "#", "^(?:#){2}$", "^#{2,3}$",
    "^#*?a", "(?<=#)a", "(?<!#)a$", "#\\b", "\\B#", "^.#$", "^#.$", "^#+?$", "^(?=#).{2}$", "^.{2}(?<=#)$", "^#{0}$",
    "^(?:#|a)+$", "a#|#a"];
  const legacyOnly = (p) => "\\-{0}" + p;
  const systematic = [];
  for (const p of codeUnitList) systematic.push(p.replaceAll("X", deseret));
  for (const a of atoms) {
    for (const t of templates) systematic.push(t.replaceAll("#", a), legacyOnly(t.replaceAll("#", a)));
  }
  const quantifier = () => pick(r, ["", "", "", "?", "*", "+", "{2}", "{1,2}", "*?", "+?", "{2,}", "{3}"]);
  const random = () => {
    let p = chance(r, 2, 3) ? "^" : "";
    for (let k = 1 + r() % 3; k > 0; k--) {
      p += chance(r, 1, 8)
        ? pick(r, ["a", "x", "\\b", "\\B", "(?<=.)", "(?!.)", "(?<!" + deseret + ")", "(?=" + face + ")"])
        : pick(r, atoms) + quantifier();
    }
    if (chance(r, 2, 3)) p += "$";
    return chance(r, 2, 3) ? legacyOnly(p) : p;
  };
  const patterns = assemble(codeUnitSeeds, systematic, random, 3000);

  const texts = unique([
    ...exhaustive(["a", deseret, deseretSmall, face], 3),
    ...codeUnitSeeds.map((s) => s[1]),
    "-", "x", "\u00e9", "aa" + deseret, deseret + "x", "x" + deseretSmall, "-" + deseret, deseret + "-",
    "\u00e9" + face,
    deseret + deseret + deseret + deseret, "\u{1d49c}", "a\u{10ffff}", "\uffff", "\u{10000}", "\uffff\uffff", "p{L}",
    "u", "uu", "aaaa", "a\n" + deseret, "\n",
  ]);

  return { source: "code-units", seeds: codeUnitSeeds, patterns, texts, deviations: true };
}

// ---------------------------------------------------------------------------------------------------------------
// Texts with half of a surrogate pair.
//
// These are the patterns of the code-units family against texts that hold a high or a low surrogate with no partner.
// Without the u flag such a unit is a character like any other. With it, it is a code point of its own, and it does
// not match half of a pair that is whole. The texts are in a file of their own because they are not Unicode text:
// a JSON parser may refuse the file, or put U+FFFD in place of the unit, and an implementation whose strings are
// UTF-8 cannot hold them at all.
// ---------------------------------------------------------------------------------------------------------------

const high = "\ud801", low = "\udc00", lowSmall = "\udc28";

const loneSurrogateSeeds = [
  ["^\\-?" + deseret + "*$", deseret + low + low],
  ["^\\-?.$", high],
  ["^\\ud801$", high],
  ["\\udc00", deseret],
];

const loneSurrogateList = lines(R`
^\-?[X-\udfff]$
\-?(?<!\ud801)\udc00
^\-?\ud801$
^\-?[\ud801]\udc00$
^\-?\ud801+\udc00$
^\-?(?<X>.)\k<X>$
^\ud801\udc00$
^[\ud801\udc00]$
^[\ud801\udc00]{2}$
^(?:\ud801)\udc00$
^\ud801(?:\udc00)$
^\ud801{2}\udc00$
^\ud801\udc00{2}$
^[\ud800-\udbff][\udc00-\udfff]$
^[\ud800-\udfff]$
^[^\ud800-\udfff]$
^[\ud800-\udbff]$
^[\udc00-\udfff]$
(?<=\ud801)\udc00
\ud801(?=\udc00)
\ud801(?!\udc00)
(?<!\ud801)\udc28
^(\ud801)(\udc00)\1\2$
^(.)\1$
^.\udc00$
^\ud801.$
`);

function loneSurrogates() {
  const r = rng(0x5a22a009);
  const atoms = ["\\ud801", "\\udc00", "[\\ud801]", "[\\udc00]", "[^\\ud801]", "[\\ud800-\\udbff]", "[\\udc00-\\udfff]",
    "[\\ud800-\\udfff]", "[^\\ud800-\\udfff]", ".", "[^a]", "\\W", "\\S", "[^]", deseret, "[" + deseret + "]",
    "[^" + deseret + "]", "\\ud801\\udc00", "[\\ud801\\udc00]", "(?:\\ud801)", "\\udc28", "\\p{Cs}", "\\P{Cs}",
    "[\\s\\S]", "\\D"];
  const templates = ["^#$", "^#{2}$", "^#+$", "^#*$", "^##$", "^a#$", "^#a$", "#", "^(?:#){2}$", "^#?\\udc00$",
    "^\\ud801#$", "(?<=#)a", "(?<!#)a$", "#\\b", "\\B#", "^.#$", "^#.$", "(?<=\\ud801)#", "#(?=\\udc00)", "^#{2,3}$"];
  const legacyOnly = (p) => "\\-{0}" + p;
  const systematic = [];
  for (const p of [...codeUnitList, ...loneSurrogateList]) systematic.push(p.replaceAll("X", deseret));
  for (const a of atoms) {
    for (const t of templates) systematic.push(t.replaceAll("#", a), legacyOnly(t.replaceAll("#", a)));
  }
  const quantifier = () => pick(r, ["", "", "", "?", "*", "+", "{2}", "{1,2}", "*?"]);
  const random = () => {
    let p = chance(r, 2, 3) ? "^" : "";
    for (let k = 1 + r() % 3; k > 0; k--) p += pick(r, atoms) + quantifier();
    if (chance(r, 2, 3)) p += "$";
    return chance(r, 1, 2) ? legacyOnly(p) : p;
  };
  const patterns = assemble(loneSurrogateSeeds, systematic, random, 1500);

  const texts = unique([
    "", "a", "x", deseret, deseretSmall, deseret + deseret, deseret + deseretSmall, high, low, lowSmall, high + "a",
    low + "a", deseret + low, deseret + low + low, high + deseret, deseret + "a", "a" + deseret, "a" + deseret + "a",
    deseret + lowSmall, high + high + low, deseretSmall + deseretSmall, "a" + high, "a" + low,
    high + lowSmall + lowSmall,
    "aa", deseret + "x", "x" + deseretSmall,
    ...loneSurrogateSeeds.map((s) => s[1]),
    low + high, "a" + low + high + "a", high + "x" + low, high + high, low + low, "\ud800", "\udfff", "\udbff\udfff",
    "\ud83d", "\ude00", face + high, high + face, low + face, face + low, high + "\n", "\n" + low, high + high + high,
    low + deseret + high, "-" + high, low + "-",
  ]);

  return { source: "lone-surrogates", seeds: loneSurrogateSeeds, patterns, texts, deviations: true };
}

// ---------------------------------------------------------------------------------------------------------------
// Patterns on which a host engine itself goes wrong, and syntax that only a host engine has.
//
// Translating a pattern for a host engine is not enough where the engine has a fault of its own. The ones found:
// a lazy repetition of a group whose body can match the empty string (an engine that loops, or throws), a group
// counted zero times that holds an anchor, (?!) and the other ways of writing nothing or never, an empty
// alternative beside a repetition, and the order of the ways through a lookaround whose group is read afterwards.
//
// The other half of the family is syntax. Every host engine accepts constructs that ECMA-262 does not have, and
// most of those are a syntax error with the u flag and something else without it: \z is the letter z, (?=a)* is
// allowed, and a{2,1} is an error in both. Each such pattern is here with V8's verdicts, and with its answers
// where it is valid.
// ---------------------------------------------------------------------------------------------------------------

const engineFaultSeeds = [
  ["(?:a+|)+", "aa"],
  ["(?:(?=b|)(?:(?:(a)){0,2}?x)?){3}x", "aaaa"],
  ["(\\B|[]){4,}(?:(?<=(.??)\\2))$", "-x-"],
  ["(?:a|^){0}x", "ax"],
  ["^(?:(?:xy)+|(?=)){3}$", "xyxy"],
  ["(?=((?:(?:a|))+?)a)(?:\\1|a)$", "aa"],
  ["(?!)", ""],
  ["[]", "a"],
  ["^(a+)+$", "aaaa"],
  ["a{2,1}", null],
  ["(?i)a", null],
  ["a*+", null],
  ["(?>a)", null],
  ["(?P<n>a)", null],
  ["\\z", "z"],
  ["(?=a)*", "x"],
];

const engineFaultList = lines(R`
.*(?=((a*)(?:.?)+?)x)(?:\1|a)$
x?(?<=((?:(a)?)+?[ax]|(a|)))\1
x?(?<=((?:[ax]){1,3}?(?:(a)?)+?))\1
x?(?<=((?:(?:a|))+?(?:(x|))+(a)?))\1$
^(?<=((?:(?:a|))*\b(?:(x|))+?|.?))\1+$
a(?<=((?:^)*(?:(a|))+?(?:(a|)){2,}?|$))\1a$
.*(?=((?:(?:(|a)(?:x)*?(?!$)))+?(?:a)+)$)x\1
.*(?=((?:(?:(a)?)*(?:(?:(?=x)|(?:a|)))+?)|x)a)\1a$
a(?=((?:(?:(?:(a*))+(?:(?:)(?:(?:a|))??)(?:\b)*))+?(?:a|))$)\1
^(?=((?:(?:(|a)(?:(?:(?:(a|)){1,3}?(?:.?)??))*?(?:.?)+))*[ax]))\1$
x?(?<=((?:(|a))+))\1a$
a(?=((?:(?:(?:(?:(|a))+?))+)))\1a$
^(?=((?:(?:(?:(?:x)??(|a)))*|\b)(?:a)??|[ax]))x\1
((a){0,2}?(\2?)x|){3}((x))
(|()((?!)()9)){2}((?<!(|\B)()\9{3})((1))?)
(?:(?=((?:ab?){0,9}?(?:ab?){1,2}?)$)\1x){2}$
(?:(?=((?:(a)){0,12}?x)?)\1\2?){3}x
(?:(?=((?:(a)|x){2,11}?(?:a|ab){1,2}?)$)x\1)?$
(?:(?=((?:ab?)*?(?:ab?){1,2}?)$)\1x){2}$
(?=((((x)+|())){3}))\1
^(a){0}(?:x+|\1){3}$
(?:([^a]*?|x)+\B|[^a]){4,}(?:[ax](?<=(.??){1}\2|(?!ax))|\b|)+x$
(?:x*\B){2}(?<=((?:ab)*?)\1)$
(?:\b|-){3}(?<=((?:a|b){0,9}?)\1)$
(?:(?=x)|^){0}$
(()|^(?=x)){0}x$
(?:((?=a)|^x|(?=|(|a).)){0}|^[^a]){0}?x
((?:(x|x\2){0,}?|^){0,0}(?!$)){4}?x
(?:a|(?<=\Ba|(?:|[^a]){4,}?)^|){0}?(){1,}?x$
(?:a|^){0}?x
(?:a|^){0,0}x
(a|^){0}x$
(?:(?:a|^){0}x){2}
(?:a|(?:x|^)){0}-
(?=(?:a|^){0}x)x
(?:((?=x)|()|){4,5}?){4}?$
^(|(|[^a](a|)){2,4}\B){4,6}(?:[^a]?|)+a
^((?!$)(||\Ba?){1,3}|-x){4}?x$
(?:$-|((-??|\b)*|){3,5}\b|a??$)+$
^(?:|\b){2,}x
^(?:(?=a)|\B)*a
(?:(?=x)|^){3}?x$
^(?:(|\b)*-)+$
^(?:a*)*$
^(?:a?x?)*-$
^(?:(?:a|){0,3}x)*-$
^(?:(?:a*x?)+-)*$
^(?:a|\b|x){2,}-$
^(?:(?:a|(?=x))*x){2,3}$
^(?:\1a|(x)|){3,}-$
^(x|(a|)\2){2,}-
^(?!-)(?:(?:(?:a|){1,300}x){1,300}-)+$
^(?!-)(?:(?:(?:a|x){1,300}|){1,300}-)+$
^(?!-)(?:(?:ax){300}-)+$
^(?!-)(?:(?:a|){1,300}-)+$
^(?!-)(?:(?:a|x){1,200}-)+$
^(?!-)(?:[ax]{1,300}-)+$
^(?!-)(?:(?:a|\b){2,}?x)+$
^(?!-)(?:(?:a|\b){2,}x)+$
(?:a|){3}(^(?:(?:|[^a])+(?<![^a]\1)|[ax]){1}?|x)+$
`);

// Syntax that a host engine has and ECMA-262 has not, and syntax that ECMA-262 allows only without the u flag.
const syntaxList = lines(R`
a{2,1}
a{1,0}
a{3,2}?
(a){2,1}
[a]{2,1}
.{10,9}
a{0,0}
a{0}
a{,2}
a{,}
a{}
a{ 2}
a{2 }
a{2, 3}
a{-1}
a{1,2,3}
a{2}{3}
a{2}+
a{2}*
a{2}??
a**
a+*
a?*
a*+
a++
a?+
a{1,2}+
a*?+
a+?+
(?:a)++
[ax]*+x
a*+a
x++x
(?i)a
(?i)A
(?s).
(?m)^a
(?x)a x
(?x: a )
(?U)a
(?-i)a
(?i-s)a
a(?i)x
(?im)a
(?^:a)
(?^i:a)
(?i-s:a)
(?i:a)
(?-i:a)
(?s:.)
(?m:^a)
(?ii:a)
(?i-i:a)
(?:a)
(?>a)
(?>a|ax)x
(?>a*)a
(?P<n>a)
(?P<n>a)(?P=n)
(?P>n)
(?'n'a)
(?'n'a)\k'n'
(?<n>a)\k'n'
(?<n>a)\k{n}
(?<n>a)\g{n}
(?<n>a)\g<n>
(?<n>a)\k<n>
(?<n>a)(?&n)
(a)\g1
(a)\g{1}
(a)\g{-1}
(a)(?1)
(a)(?R)?
(?<n>a)(?<n>x)
(?<n>a)|(?<n>x)
(?<-n>a)
(?<n-m>a)
(?<1>a)
(?<n->a)
(?<>a)
(?<n a>a)
(?#a)
(?#a)x
a(?#)x
(?|a|x)
(?|(a)|(x))\1
(?(1)a|x)
(a)?(?(1)a|x)
(?(?=a)a|x)
(?(n)a)
(?=a)*
(?=a)+
(?=a)?
(?=a){2}
(?=a){0}
(?=a)*?
(?!a)*
(?!a)+
(?!a)?x
(?!a){2}
(?<=a)*
(?<=a)+
(?<=a)?
(?<=a){2}
(?<!a)*
(?<!a)+
(?<!a)?
(?<!a){0}
^*
^+
^?
^{2}
$*
$+
$?
\b*
\b+
\b?
\b{2}
\b{0}
\B*
\B+
\B?
\B{1,}?x
(?:\b)+a
(?=a\B+)
(a\b*)
[\b+]
[a]\b+
^\b{2}a
a\b?
\z
\Z
\A
\Aa
a\z
a\Z
\G
\Ga
\K
a\Kx
\Qa\E
\Q.\E
\h
\H
\R
\X
\N
\N{U+61}
\e
\a
\x{61}
\x{0061}
\o{141}
\u{61}
\u0061
\x61
\141
\0141
\08
\8
\9
(a)\2
(a)\10
\1(a)
\k<n>
\k
\ka
\cA
\c1
\c
\ca
\C
\i
\I
\y
\<a\>
\<
\`
\'
\_
\-
\&
\#
\%
\,
\:
\;
\=
\@
\~
\!
\"
\/
\
\p{L}
\pL
\PL
\p{IsGreek}
\p{InGreek}
\p{Greek}
\p{Script=Greek}
\p{sc=Grek}
\p{IsL}
\p{L&}
\p{Lu}
\p{^Lu}
\P{^Lu}
\p{Alpha}
\p{Alphabetic}
\p{alpha}
\p{Latin}
\p{IsLatin}
\p{javaLowerCase}
\p{Lower}
\p{XDigit}
\p{Punct}
\p{L}{2}
\p{}
\p
[[:alpha:]]
[[:alpha:]]+
[[:^alpha:]]
[[:digit:]x]
[[.a.]]
[[=a=]]
[a&&x]
[a&&[^x]]
[a-z&&[^aeiou]]
[a--x]
[a~~x]
[a||x]
[[a]x]
[[a]]
[a[x]]
[a-[x]]
[a-z-[aeiou]]
[\w-[a]]
[]a]
[^]a]
[]
[^]
[]]
[a-]
[-a]
[a-a]
[x-a]
[\d-x]
[a-\d]
[\p{L}-x]
[\b]
[\B]
[\z]
[\A]
[\e]
[\N]
[\h]
[\R]
[\Q]
[\k]
[\c]
[\c1]
[\_]
[\-]
[\x{61}]
[\u{61}]
[\1]
[\8]
[\0]
[\00]
[(?i)a]
{
}
]
)
(
a{
a{1
a{1,
a{1,2
a{a}
{1}
{1}a
{a}
x{1}{
x{,1}
a|{1}
a|*
(*)
(+)
(?)
(?:*)
(?
(?a)
(?:
(?=
(?<
(?<=
(?<a
(?i
(?i:
(?i:a
(?-:a)
(?:a))
(()
())
a)
[a
a\
*
+
?
*a
+a
?a
a|*a
|
a||x
(|a)
()
(?:)
(?=)
(?!)
(?<=)
(?<!)
(?!)a
a(?!)
(?:(?!)|a)x
(?:a(?!))?x
(?:(?!))*a
(?:(?!)){0}a
(?=(?!))|a
(?!(?!))a
(?<!(?!))a
(?<=(?!)a|x)a
(?!|a)
(?=|a)x
(?<!|a)x
(?:(?=)|a)+x
(?:()|a)+x
(?:(?:)|a)+x
(?:(?<=)|a)+x
(?:a|()){2,}x
(?:(|)|a)*x
(?:a{0}|x)+$
(?:(a){0}|x)+\1$
(?:(?:)*|a)+x
^(?:()|())*$
^(?:(?=)|(?!))*$
`);

// Shapes written by hand whose repeated body can match the empty string, each with every count below.
const engineFaultShapes = lines(R`
(?:a|)#x
(a|)#x
(?:|a)#x
(|a)#x
^(?:a*)#$
^(a*)#x
^(?:a?)#x$
^(a?)#\1x
^(?:a*?)#x
(?:a+|)#$
(?:(?:a|)x?)#-
^(?:a|\b)#x
^(?:(a)|)#\1x
(?:()|a)#x
(?:(?=)|a)#x
(?:(?!)|a)#x
(?:a(?!))#x
^(?:(?:a|)#x)#$
^(?:(?:a*)#x?)#$
(?=((?:a|)#)a)\1a$
(?<=((?:a|)#))x\1
(?=((?:a?)#x?))\1$
^(?:(?:xy)+|(?=))#$
^(?:x*|a)#-
(?:\B|a)#$
^(?:$|a)#x?
`);
const engineFaultCounts = [
  "*?", "+?", "??", "{0,2}?", "{1,2}?", "{1,3}?", "{2,}?", "{2,3}?", "{0,9}?", "{1,12}?", "{3,14}?", "{0,20}?", "{2}?",
  "{1}?", "{0}?", "*", "+", "?", "{0}", "{1}", "{2}", "{3}", "{0,2}", "{1,3}", "{2,}", "{4,}", "{3,5}",
];

function engineFaults() {
  const r = rng(0xfa017a0a);
  let groups = 0;

  // Alternatives that are nothing in disguise beside repetitions, inside repetitions.
  const nothings = ["x+", "(?:xy)+", "x*", "a", "()", "(?:)", "(?=)", "(?<=)", "(?!)", "(a){0}", "\\1", "\\2",
    "(?:(?:))", "x{0}", "(?:)*", "(?:|)", "$", "\\b", "(|)", "x+?", "[ax]+", "(x)+", "(?:()|())", "(?:x+)?", "(?=x)",
    "(?:){2}", "(?:x|)+", "a{0}()", "(?!a{0})", "(?<!)", "(?:\\b)*"];
  const disguised = () => {
    const alt = (d) => {
      const alternatives = [];
      for (let n = pick(r, [1, 2, 2, 2, 3]); n > 0; n--) {
        let seq = "";
        for (let k = pick(r, [1, 1, 1, 2]); k > 0; k--) {
          let a = pick(r, nothings);
          if (d < 1 && chance(r, 1, 4)) {
            a = "(?:" + alt(d + 1) + ")" + pick(r, ["", "{3}", "+", "*", "{2,}", "{1,2}", "?", "{2}?", "+?"]);
          }
          seq += a;
        }
        alternatives.push(seq);
      }
      return alternatives.join("|");
    };
    const core = "(?:" + alt(0) + ")" + pick(r, ["{3}", "+", "*", "{2,}", "{2}", "{1,3}", "", "{0,2}"]);
    return pick(r, ["^#$", "^#$", "#$", "^#", "(?=(#))\\1$", "^(?:#)+$", "(?<=(#))$"]).replace("#", () => core);
  };

  // Lazy repetitions with a wide range of counts inside lookarounds whose captures are read.
  const wide = () => {
    const atoms = ["a", "x", "(a|)", "(|a)", "(a)?", "(?:a|)", "ab?", "\\b", "(?=x)", "(x|)", "[ax]", ".?", "(a*)",
      "a|ab", "(a)|x"];
    let used = false;
    const body = () => {
      const parts = [];
      for (let n = 1 + r() % 2; n > 0; n--) {
        let a = pick(r, atoms);
        const k = r() % 10;
        if (k < 6 && !used) {
          a = "(?:" + a + ")" + pick(r, ["{0,9}?", "{1,12}?", "{2,11}?", "{0,10}?", "{3,14}?", "{0,20}?"]);
          used = true;
        } else if (k < 8) {
          a = "(?:" + a + ")" + pick(r, ["??", "{1,2}?", "?", "{0,2}", "{1,2}?", "{2,3}?"]);
        }
        parts.push(a);
      }
      return parts.join("") + (chance(r, 1, 5) ? "|" + pick(r, atoms) : "");
    };
    const inner = "(" + body() + ")";
    const look = pick(r, [() => "(?=" + inner + ")", () => "(?<=" + inner + ")",
      () => "(?=" + inner + pick(r, ["x", "a", "$", ""]) + ")"])();
    let core = look + pick(r, ["\\1", "\\1$", "\\1x", "\\1a$", "x\\1", "(?:\\1|a)$", "\\1+$"]);
    if (chance(r, 1, 2)) core = "(?:" + core + ")" + pick(r, ["{2}", "{1,2}", "{3}", "?"]) + pick(r, ["", "x", "$"]);
    return pick(r, ["", "^", "a", "x?", ".*"]) + core;
  };

  // Groups, backreferences, lookarounds, lazy and greedy repetitions and empty alternatives, some of them quantified
  // where ECMA-262 allows no quantifier.
  const general = () => {
    const atom = (d) => {
      const k = r() % 50;
      if (k < 11) return pick(r, ["a", "x", "-", ".", "[ax]", "[^a]", "\\b", "\\B", "^", "$"]);
      if (k < 17 && groups > 0) return "\\" + (1 + r() % (groups + (chance(r, 3, 10) ? 1 : 0)));
      if (k < 26 && d < 3) { groups++; return "(" + alt(d + 1) + ")"; }
      if (k < 31 && d < 3) return "(?:" + alt(d + 1) + ")";
      if (k < 38 && d < 3) return pick(r, ["(?=", "(?!", "(?<=", "(?<!"]) + alt(d + 1) + ")";
      if (k < 41) { const g = pick(r, ["(|a)", "(a|)", "()", "(?:)"]); if (g !== "(?:)") groups++; return g; }
      return pick(r, ["a", "x", "a?", "x*", ".?"]);
    };
    const term = (d) => {
      let a = atom(d);
      // An assertion has a quantifier one time in twelve, where the others have one four times in ten.
      const assertion = /^(?:\^|\$|\\b|\\B|\(\?<?[=!])/.test(a);
      if (assertion ? chance(r, 1, 12) : chance(r, 4, 10)) {
        a += pick(r, ["*", "+", "?", "{2}", "{2,}", "{1,2}", "{0,2}", "{2,3}", "{3}"]);
        if (chance(r, 35, 100)) a += "?";
      }
      return a;
    };
    const seq = (d) => {
      let s = "";
      for (let n = (d ? 0 : 1) + r() % (d ? 4 : 3); n > 0; n--) s += term(d);
      return s;
    };
    function alt(d) {
      let s = seq(d);
      while (chance(r, 1, 4)) s += "|" + seq(d);
      return s;
    }
    groups = 0;
    return (chance(r, 3, 10) ? "^" : "") + alt(0) + (chance(r, 3, 10) ? "$" : "");
  };
  const random = () => pick(r, [disguised, disguised, wide, general, general])();

  const systematic = [...engineFaultList, ...syntaxList, "$" + "{2}"];
  for (const shape of engineFaultShapes) {
    for (const c of engineFaultCounts) systematic.push(shape.replaceAll("#", c));
  }
  // A quantifier after each kind of assertion, and each order of the two numbers of a count.
  for (const a of ["^", "$", "\\b", "\\B", "(?=a)", "(?!a)", "(?<=a)", "(?<!a)"]) {
    for (const q of ["*", "+", "?", "{2}", "{0}", "{1,2}", "*?", "{2,}", "{0,1}?"]) {
      systematic.push(a + q + "x", "a" + a + q);
    }
  }
  for (const a of ["a", "(a)", "[ax]", ".", "(?:ax)", "\\w"]) {
    for (let m = 0; m < 4; m++) for (let n = 0; n < 4; n++) systematic.push("^" + a + "{" + m + "," + n + "}$");
  }
  const patterns = assemble(engineFaultSeeds, systematic, random, 4000);

  const run = (c, n) => c.repeat(n);
  const texts = unique([
    ...exhaustive(["a", "x", "-"], 3),
    ...engineFaultSeeds.map((s) => s[1]).filter((t) => t !== null),
    "aaaa", "xy", "xyxy", "xxx", "y", "1", "x1", "91", "--a", "ab", "-ab", "abab", "xx-a", "--x", "aabab", "ba", "b",
    "z", "Z", "A", "az", "aZ", "ax ", "a x", " a ", "n", "na", "aa1", "a{2}", "a{2,1}", "a+", "a*", "aax-", "E", "aE",
    "e", "h", "R", "X", "N", "G", "K", "Q", "L", "pL", "p{L}", "\u03b1", "\u00e9", "a\na", "\n", "\t", "\x07", "\x1b",
    "\x01", "_", "&", "<a>", "[:alpha:]", ":", "]", "[a]", "a]", "{", "}", "(", "a)", "(?i)a", "8", "a8",
    run("a", 9), run("a", 10), run("a", 11) + "x", run("a", 13), run("ab", 10) + "x", run("a", 9) + "x" + run("a", 10),
    "x" + run("a", 14), run("a", 10) + "xa", run("ax", 20) + "-", run("a", 14) + "-",
  ]);

  return { source: "engine-faults", seeds: engineFaultSeeds, patterns, texts, deviations: true };
}

function moreFamilies() {
  return [backreferences(), lookarounds(), caseFolding(), codeUnits(), loneSurrogates(), engineFaults()];
}

module.exports = { moreFamilies };
