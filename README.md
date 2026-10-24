# ECMA-262 regular expression test data

What the V8 JavaScript engine says about over a hundred thousand regular expression patterns, as plain JSON Lines:
which are valid under each of the grammars of ECMA-262 (the `u` and `v` flags, and neither), and whether each valid
one matches each of its texts, several million texts in all. Most of the patterns are written for this data. The
rest, and their texts, are taken from test262, the conformance suite of ECMA-262 (see
[the files from test262](#the-files-from-test262)).

Beside those answers are:

- where each match is and what each group captured, for a sample of the patterns ([`captures.jsonl`](#capturesjsonl));
- every call of `exec` that test262's tests make, with `lastIndex`, the `g`, `y` and `d` flags and the whole result
  ([`exec/test262.jsonl`](#exectest262jsonl));
- texts of bytes that are not UTF-8, for an engine that takes UTF-8, whose answer is a refusal
  ([ill-formed UTF-8](#ill-formed-utf8jsonl));
- the answers that differ under a later version of Unicode ([other versions of Unicode](#other-versions-of-unicode));
- ECMA-262's answer wherever V8's is known to be wrong
  ([the specification's answers](#the-specifications-answers-where-v8-departs)).

The counts of every file are in `data/manifest.json`, which the generators write and `verify.js` checks against the
files.

It is for testing a regular expression engine, or a translation from ECMAScript syntax to another engine's, against a
real implementation of ECMA-262. JSON Schema is one reason to need that: its `pattern` and `patternProperties`
keywords and its `regex` format are defined as ECMA-262 regular expressions, and most languages' own regex libraries
differ from it in many small ways (what `\d`, `\w`, `\s` and `.` mean, case folding, Unicode properties, lookbehind,
what is a syntax error).

The data is the oracle that the Corvus ECMA-262 regular expression engines (for .NET, Rust, Java and the languages
bound to the Rust crate) and the [Corvus JSON Schema](https://github.com/corvus-dotnet/Corvus.JsonSchema) evaluators
are tested against, written out in full.

## The files

Everything is in `data/`. Each `.jsonl` file has one JSON object to a line. The files are ASCII: every other
character is a `\uXXXX` escape, so no tool has to agree about an encoding.

| File | What is in it |
|---|---|
| `hand-written.jsonl` | Patterns written by hand to cover the grammar and the semantics: escapes, classes, quantifiers, groups, lookaround, backreferences, named groups, Unicode properties, case folding, the ECMAScript 2025 additions, and patterns found in real JSON schemas. Each is matched against 273 texts. |
| `flags.jsonl` | 150 patterns, each with the flags `i`, `m`, `s` and `ims`, matched against the same 273 texts. They cover case-insensitive matching, multiline anchors and the dot. |
| `generated.jsonl` | Patterns of 1 to 8 characters drawn at random from an alphabet of regular expression syntax. Most are not valid, which is the point: they test what a parser accepts and what it refuses. The first 4,000 are also matched against 80 short texts. |
| `anchored-lists.jsonl` | Anchors and assertions inside lists, prefixes, suffixes, alternations and class sequences. Each is matched against 58 texts. See [the families](#the-families). |
| `empty-loops.jsonl` | Counted groups whose body can match the empty string. Each is matched against 50 texts. |
| `line-terminators.jsonl` | Anchors, the dot and classes against texts that begin, end or are broken by a line terminator. Each is matched against 100 texts. |
| `word-boundaries.jsonl` | `\b` and `\B` at every place in short patterns. Each is matched against 271 texts, which include every text of up to three characters over a six-character alphabet. |
| `backreferences.jsonl` | Backreferences to groups of repetitions, of alternatives and of optional groups, to groups that are never set, and from inside the group. Each is matched against 133 texts. |
| `lookarounds.jsonl` | Groups that a lookahead or a lookbehind sets, read outside it or in the same repetition. Each is matched against about 130 texts, which include every text of up to four characters over its alphabet. |
| `case-folding.jsonl` | Case-insensitive literals, classes and backreferences, with the `i` flag and in `(?i:` groups, against the characters whose case pairs host engines get wrong. The number of texts depends on the pattern. |
| `code-units.jsonl` | Patterns that are valid only without the `u` flag, and so are matched by UTF-16 code unit, against texts with characters beyond the Basic Multilingual Plane. Each is matched against 105 texts. |
| `lone-surrogates.jsonl` | The same kind of pattern against 46 texts that hold half of a surrogate pair. The texts are not valid Unicode, which is why they have a file of their own. |
| `engine-faults.jsonl` | Patterns on which a host engine itself goes wrong, and syntax that host engines have and ECMA-262 has not. 628 of them are not valid. The others are matched against 116 texts. |
| `unicode-sets.jsonl` | The `v` flag: nested classes, the difference and the intersection of classes, strings in classes and the properties of strings, with the `i` flag and without. Every record is answered with the `v` flag as well as with `u` and with neither, because the three grammars read a class differently. Each is matched against 150 texts. See [the families](#the-families). |
| `test262.jsonl` | The patterns and texts of test262's regular expression tests, at the commit `manifest.json` names: every pattern a test builds or a syntax test refuses, and every text a test matches one against. A property escape test's text is the whole of a property, and is taken as the two ends of each of its ranges. See [the files from test262](#the-files-from-test262). |
| `test262-lone-surrogates.jsonl` | The texts and patterns of `test262.jsonl` that hold half of a surrogate pair, as `lone-surrogates.jsonl` holds those of the families. |
| `start-searches.jsonl` | Patterns made of what an engine's search for where a match can start reasons about (an assertion before one to three loops, then a literal or an alternation), each with texts of its own built from its literal, its sets and characters of every width, in the shapes that ask where a match starts. See [start searches](#start-searchesjsonl). |
| `captures.jsonl` | Not `test` but the rest of `RegExp`: where the match is and what each group captured (`exec`), the matches of a global search, the sticky flag, `replace` with every form of `$`, and `split`, for every pattern of `hand-written.jsonl`, `flags.jsonl` and `start-searches.jsonl` and one record in ten of each other file. See [captures](#capturesjsonl). |
| `ill-formed-utf8.jsonl` | Bytes that are not UTF-8, each of the ill-formed sequences of Unicode's Table 3-7 in six places in a text, for an engine's UTF-8 interface, which must refuse them. A test is its bytes in hexadecimal. It has no answer of V8's. See [ill-formed UTF-8](#ill-formed-utf8jsonl). |
| `manifest.json` | The versions of Node, V8 and Unicode the data was generated with, the counts of each file, for the families the limits and how many patterns they dropped, the overlays for other versions of Unicode (`unicode_overlays`), and the files of `exec` calls (`exec`). |
| `unicode/18.0.jsonl` | The answers that differ under Unicode 18.0, for an engine with that version's character database. Not a file of tests: an overlay on the others. See [other versions of Unicode](#other-versions-of-unicode). |
| `spec/answers.jsonl` | ECMA-262's answers where V8's recorded answer is wrong, on the records marked `v8_deviation`. Not a file of tests: answers to tests of the other files. See [the specification's answers](#the-specifications-answers-where-v8-departs). |
| `exec/test262.jsonl` | Every call of `exec` that test262's regular expression tests make in a test V8 passes, with V8's result in full: where the match and each group are, the named groups, and `lastIndex` before and after. In a directory of its own, so that a runner that reads the files of `data/` does not take it for a file of records. See [the exec calls of test262](#exectest262jsonl). |

The counts of each file, and of each file's patterns by grammar, are in `manifest.json`.

## A record

```json
{
  "pattern": "^a{2,3}?$",
  "flags": "",
  "source": "hand-written",
  "valid": {"unicode": true, "legacy": true},
  "tests": [
    {"text": "aa", "unicode": true, "legacy": true},
    {"text": "aaaa", "unicode": false, "legacy": false}
  ]
}
```

| Field | Meaning |
|---|---|
| `pattern` | The pattern's source text. |
| `flags` | Flags given to V8 besides `u`: empty, or some of `i`, `m` and `s`. |
| `source` | The file's kind, which is the file's name without `.jsonl`. |
| `valid.unicode` | Whether `new RegExp(pattern, flags + "u")` succeeds: the pattern is valid in Unicode mode. |
| `valid.legacy` | Whether `new RegExp(pattern, flags)` succeeds: the pattern is valid without the `u` flag, under the looser Annex B grammar. |
| `tests` | Present when the pattern has texts and is valid in at least one mode. |
| `tests[].text` | The text. |
| `tests[].unicode` | `RegExp.prototype.test` with the `u` flag: whether the pattern matches anywhere in the text. Present when `valid.unicode` is true. |
| `tests[].legacy` | The same without the `u` flag. Present when `valid.legacy` is true. |
| `valid.unicode_sets` | Only in `unicode-sets.jsonl`: whether `new RegExp(pattern, flags + "v")` succeeds. |
| `tests[].unicode_sets` | Only in `unicode-sets.jsonl`: `RegExp.prototype.test` with the `v` flag. Present when `valid.unicode_sets` is true. |
| `v8_deviation` | Present and true on 232 records where V8's answers are known to differ from the specification, or to change from run to run. See [where V8 departs from ECMA-262](#where-v8-departs-from-ecma-262). |
| `deviation` | On a marked record of the later families and of the files from test262, the class of the deviation: `unstable`, `surrogate-pair-start`, `modifier-group`, `full-case-folding`, `single-character-string-case` or `ascii-case-folding`. An `unstable` record has no `tests`. |
| `tests[].bytes`, `tests[].case` | Only in `ill-formed-utf8.jsonl`, in place of a text and its answers: the bytes in hexadecimal, and which ill-formed sequence they hold, and where. |
| `test262` | Only in the files from test262: the test files of test262 the pattern and its texts were taken from, as paths in that repository. |

The two modes can give different answers for one text. Without the `u` flag V8 matches UTF-16 code units, so a
character beyond the Basic Multilingual Plane is two units to `.`, a class or a quantifier. With it, V8 matches code
points.

## The families

The first three files test a regular expression engine broadly. The eleven families are narrower, and the two files
from test262 come last. Each was built
around a class of fault that the files before it did not reach, found by testing JSON Schema implementations against
V8, or, for the last, around a part of the language the files before it did not hold. A family starts from the
patterns that found the fault, which are written by hand, and a small grammar builds the rest around them. The
first four families are in `families.js`, the six later ones in `more-families.js` and the `v` flag's in
`unicode-sets.js`. Records of `case-folding.jsonl` and `unicode-sets.jsonl` have the `i` flag where they say so.
All the others have empty `flags`.

### `anchored-lists.jsonl`

For implementations that recognise a common shape and match it without running a regular expression engine. The
shapes are a list such as `^head(sep item)*$`, a prefix, a suffix, an alternation of literals and a sequence of
classes. Such a fast path has to notice an anchor or an assertion anywhere inside the shape, or decline the pattern.
The fault this family finds is a fast path that drops one.

The file holds 40 shapes with each of 14 insertions (`^`, `$`, `\b`, `\B`, the four kinds of lookaround, and the
escaped literals `\$` and `\^`) put into every gap of every shape, inside the repeated group, inside nested groups
and on single alternatives. A seeded grammar adds patterns with several insertions at once, over the alphabet `a`,
`b`, `x`, `,`, `.` and `-`, with every kind of quantifier. Many of these patterns match nothing at all, and that is
their use. An implementation that drops the anchor says yes.

Example. `^x(,a$)*$` does not match `x,a,a`. The `$` inside the group holds only after the last item, so the group
cannot repeat.

### `empty-loops.jsonl`

For the host engine's handling of a repeated group whose body can match the empty string. ECMA-262 is exact about
it. The iterations up to the minimum may be empty, and an empty iteration after the minimum is refused. Host engines
have their own rules. Some leave the loop after the first empty iteration, and some loop without end, throw, or
give a different answer. The fault this family finds is a translation that hands such a loop to the host engine
unchanged.

The bodies are empty at some positions only. They are made of assertions, empty alternatives, optional atoms, and
backreferences to groups that are unset or empty. The counts are `{n}`, `{n,}` and `{n,m}` with a minimum of 0 to 4,
and `*`, `+` and `?`, greedy and lazy, nested up to three deep, with lookarounds around and inside them. The texts
are every text of up to three characters over `a`, `x` and `-`, and a few longer ones.

Example. `(^|x){2}a` matches `xa`. The first iteration is the empty match of `^`, the second is `x`.

V8 backtracks, and some patterns of this grammar take it longer than anyone will wait. Those are left out. See
[what was left out](#what-was-left-out).

### `line-terminators.jsonl`

For the meaning of `$`, `^` and the dot next to a line terminator. Without the `m` flag, `$` holds only at the very
end of the text. In several host engines the default `$` also holds before a final line feed. The dot refuses four
characters (line feed, carriage return, U+2028 and U+2029) where a host engine's dot may refuse only the line feed,
or others such as U+0085. The fault this family finds is an anchor or a dot left to the host engine's default.

The patterns are anchored and not, with `$`, `^`, the dot, counted dots, `\s`, `\S`, `[^a]` and escapes for the line
terminators, including a terminator after `$` or before `^`. The texts begin with, end with, or are broken in the
middle by each of line feed, carriage return, the two together, U+2028 and U+2029.

Example. `^abc$` does not match the four characters `abc` and a line feed.

### `word-boundaries.jsonl`

For `\b` and `\B` at the edges of the text and on the empty text. The positions before the start and after the end
count as not a word character. So `\B` holds in the empty text, and `\b` does not. Some host engines say that
neither holds there. A word character is one of the 63 ASCII ones, where a host engine may count every Unicode
letter. The fault this family finds is either difference showing through.

The patterns have `\b`, `\B` or neither in every place of one or two atoms over `a`, `é`, `_`, `-`, a digit and a
space, and a seeded grammar adds quantifiers, counted groups, alternations and lookarounds. The texts are every text
of up to three characters over the same alphabet, the empty text among them, and twelve longer ones.

Example. `\B` matches the empty text, and it matches `é`, which is not a word character.

### `backreferences.jsonl`

For the value a group has when a backreference reads it. A group that has not taken part in the match reads as the
empty string, so `\1` then matches anywhere. The groups of a repeated body are unset when each iteration starts. A
repetition that gives an iteration back gives back what its groups held before it. A backreference inside its own
group, or before it, reads nothing. Host engines differ on every one of these, and a translation that renames or
copies groups has to keep all of them. The faults this family finds are a wrong answer from the host engine's own
rule, and a pattern refused because the translation could not keep the rule.

The file holds 26 shapes with each of 25 counts (`{0}`, `{1}`, `{1,2}`, `*?` and so on) on the repeated group,
the patterns that found the faults, and patterns from a seeded grammar with groups, named groups, two groups of one
name, and references after, inside and before them. One in eight of the grammar's patterns is valid only without
the `u` flag. The texts are every text of up to four characters over `a`, `x` and `-`, and a few longer ones.

Example. `^(?:x(.)){1,2}\1` matches `xxxb`. After two iterations the group holds `b`, and no `b` follows. The
second iteration is given back, the group holds `x` again as the first iteration left it, and `\1` matches the
third `x`.

### `lookarounds.jsonl`

For the groups that a lookaround sets. A lookahead keeps the captures of the first way its body matched, and the
match does not come back into it. So a group of it may be set on one way through the body and not on another, and
what follows reads whichever was taken. A lookbehind matches backwards. Its last term is matched first, a greedy
repetition goes as far left as it can, a lazy one stops at its minimum, and a backreference that stands before its
group reads nothing. When the match around a lookaround takes another way, the captures of the lookaround go back to
what they were. The faults this family finds are a lookbehind matched forwards, lookaround captures that are not
restored, and a pattern refused because its translation could not say what a group would hold.

The file has three parts, each with an alphabet of its own and every text of up to four characters over it. 1,800
patterns over `a`, `b`, `c` have a lookahead that sets a group on some ways only, or a lookaround whose group is
read in the same repetition with a choice between the two. 1,600 over `a`, `x`, `-` and 1,099 over `a`, `b`, `x`
have a lookbehind whose groups are read after it or inside it, with fixed and variable lengths, a greedy or a lazy
repetition first, and alternatives that set a group or not.

Example. `^(?:(?=([ab]))[ab](?:c|ca)\1)*$` does not match `acab`. In the first iteration the group holds `a`, the
alternative `c` is tried and `\1` matches the `a` after it. The second iteration sets the group to `b` and
fails. Going back to the alternative `ca` puts the group back to `a`, and `\1` does not match the `b` there.

### `case-folding.jsonl`

For which characters are the same when case is ignored. With the `u` flag two characters are the same when their
simple case foldings are. Without it they are the same when their upper cases are, and a character that is not ASCII
never matches an ASCII one. So the Kelvin sign matches `k`, and the long s matches `s`, with the `u` flag only.
The dotted and dotless i of Turkish match `i` in neither. A backreference is compared the same way, one character
at a time. Host engines have case tables of their own, from other versions of Unicode, and rules of their own for
a backreference. The fault this family finds is any of those showing through.

The family is built on 383 pairs of characters on which a host engine was measured to differ from V8, in one
direction or the other, with the `u` flag or without it. The engines measured were those of .NET 10, Java 21
and 25, Python 3.10 to 3.14 (`re` and the `regex` package), and PCRE2 10.42 and 10.46. The list is in
`more-families.js`. It has the Turkish i, the long s, the Kelvin, Angstrom and Ohm signs, the sharp s, the final
sigma and the Greek symbol letters, the letters with ypogegrammeni, the Cyrillic letters at U+1C80, the ligatures
U+FB05 and U+FB06, the pairs that Unicode added after version 14, and the cased scripts beyond the Basic
Multilingual Plane. Fifty measured pairs with a character that Unicode 16 has not assigned are not in it. A host
engine with a later Unicode holds those to match, and V8's answer would only say that it does not know them.

- 70 patterns that compare two characters, such as `^(.)\1$`, `^..(?<=\1(.))$` and `^.\b.$`, are matched against
  each pair both ways round (1,264 texts). Half of them are valid only without the `u` flag.
- Each of 235 characters has patterns of its own, as a literal, in a class, in a negated class and in a modifier
  group, matched against the character, its pairs and about 40 others.
- 68 patterns of classes and escapes, such as `^[^\W]$`, are matched against all those characters one at a time.
- 27 patterns, most of which compare groups of two and three characters, are matched against 286 texts made of
  the sharp s, its capital, `s` and `S`, and of ligatures.
- 1,588 patterns from a seeded grammar have groups, classes, lookarounds and backreferences, three quarters of
  them with the `i` flag and the rest with modifier groups such as `(?i:` and `(?-i:`. They are matched against
  160 texts.

Example. `^(.)\1$` with the `i` flag matches the two characters `k` and U+212A (the Kelvin sign) with the `u`
flag, and does not match them without it.

V8 answers some patterns of this family wrongly, and the family has the most marked records. See
[where V8 departs from ECMA-262](#where-v8-departs-from-ecma-262).

### `code-units.jsonl`

For a pattern that is valid only without the `u` flag. Such a pattern is matched a UTF-16 code unit at a time. A
character beyond the Basic Multilingual Plane is two units to the dot, to a class and to a quantifier. A literal one
in the pattern is two atoms, and a quantifier after it repeats the second. A host engine that matches code points
answers differently for every text with such a character. The fault this family finds is that, and a pattern
accepted that is an error in both grammars, such as a class range from one such character to another, which
without the `u` flag runs from a low surrogate down to a high one.

Each of 35 atoms (a literal U+10400, the dot, classes, negated classes, escapes) is put into each of 24 templates
(`^#$`, `^#{2}$`, `(?<=#)a` and so on), and each result is given twice. Once as it is, which the `u` flag accepts.
Once after `\-{0}`, an escape that only the grammar without the `u` flag allows, repeated no times. A seeded
grammar adds sequences of the atoms. The family also has classes that are the complement of a property and of that
property's complement, such as `[^\p{L}\P{L}]`, which match no character at all. The texts are every text of up to
three characters over `a`, U+10400, U+10428 and U+1F600, and a few others. None has half of a surrogate pair.

Example. `\-{0}^.$` does not match the one character U+10400, which is two code units. `^.$` does.

### `lone-surrogates.jsonl`

The atoms and templates of `code-units.jsonl`, with atoms for a high and a low surrogate, against 46 texts that
hold a surrogate with no partner. Without the `u` flag such a unit is a character like any other. With it, it is a
code point of its own, and `\udc00` does not match the second half of a pair that is whole.

These texts are in a file of their own because they are not Unicode text. The file is valid JSON by the grammar,
with the units written as `\ud801` escapes, but a JSON parser may refuse it or put U+FFFD in place of each unit,
and an implementation whose strings are UTF-8 cannot hold the texts at all. Leave the file out if that is your case.

Example. `^\-?.$` matches the one unit U+D801. `\udc00` with the `u` flag does not match U+10400.

### `engine-faults.jsonl`

For the places where translating a pattern is not enough, because the host engine has a fault of its own, and for
syntax that only host engines have.

The faults found were these. A lazy repetition of a group whose body can match the empty string made one engine
loop without end and another throw. A group counted zero times that holds an anchor was taken as an anchor. `(?!)`,
`[]`, `()` and `(?=)`, which are ways of writing never and nothing, were each mishandled somewhere. An empty
alternative beside a repetition was dropped by an optimiser. And the order of the ways through a lookaround whose
group is read afterwards differs between engines when a lazy repetition in it can match nothing. The file has the
patterns that found each, 26 shapes with each of 27 counts, and patterns from three seeded grammars.

The syntax is 350 patterns written by hand, and a quantifier after every kind of assertion and every order of the
two numbers of a count. Most of what host engines add is a syntax error with the `u` flag and something else
without it. `\z` is the letter `z`. `(?=a)*` is allowed. `(?i)a`, `a*+`, `(?>a)`, `(?P<n>a)` and `a{2,1}` are
errors in both. Each is here with V8's verdicts, and with its answers where it is valid.

Example. `(?:a|^){0}x` matches `ax`. The group is not matched at all, so its `^` anchors nothing.

### `unicode-sets.jsonl`

For the `v` flag (`unicodeSets`, ECMAScript 2024), which the other files have no record of. It changes the grammar
inside a class and nothing outside it. A class may hold a nested class, the difference of two operands (`--`), the
intersection of two operands (`&&`), a disjunction of strings (`\q{ab|c}`) and a property of strings
(`\p{RGI_Emoji}` and six others), which may also stand outside a class. It may not hold a syntax character
unescaped, a reserved double punctuator (`!!`, `##` and the rest), a union beside an operator without a nested
class around one of them, or, under `^`, anything that may match a string of more than one character. With the
`i` flag the complement of a class is taken after case folding, where the `u` flag takes it before.

Every record of this file is answered in three modes, with the `v` flag (`unicode_sets`), with `u` (`unicode`) and
with neither (`legacy`), each where the pattern is valid in it, because the point of most of them is that the
three grammars read the same class differently: `[a&&b]` is an intersection with `v` and three characters with `u`,
`[a!!b]` is an error with `v` and three characters with `u`, `[\q{ab}]` is a string with `v` and an error with
`u`, and `\P{Lu}` with the `i` flag matches `a` with `u` and not with `v`. Of the 5,520 patterns, 4,542 are valid
with `v`, 640 of them with `v` alone, and 216 are valid with `u` and not with `v`.

The patterns are 40 seeds, 300 or so classes written out with every operator between every kind of operand and
their errors, the single-character and string escapes each in a class, a negated class, each side of `--` and
`&&` and under `(?i:`, 100 patterns outside a class, 23 templates around 17 simple classes, and the rest from a
seeded grammar of classes up to two deep. The systematic patterns are repeated with the `i` flag. The texts are
every text of up to three characters over `a`, `b` and `x`, the characters whose case pairs differ between the
modes (the Kelvin sign, the long s, sharp s, the sigmas), one sequence of each kind of emoji the properties of
strings name, and 60 others.

Example. `^[[a-z]--[aeiou]]$` does not match `a` with the `v` flag. With `u` it is a syntax error, and without a
flag it is a class of `[`, the letters, `-`, `]` and the vowels, which does match `a`.

`captures.jsonl` has one record in ten of this family, as of the others.

### The files from test262

[test262](https://github.com/tc39/test262) is the conformance suite of ECMA-262, written to the text of the
specification and run by every JavaScript engine. `test262.js` takes from it the patterns and the texts of its tests
of regular expressions, in `built-ins/RegExp`, `annexB/built-ins/RegExp`, `language/literals/regexp` and the
`String.prototype` methods that take a regular expression. The answers are V8's, made as the families' are: each
pattern is compiled with the `u` flag, with the `v` flag and with neither, within the same limits, and each text
matched in each mode that is valid. So every record has all three verdicts, as in `unicode-sets.jsonl`.

What is taken, and from where:

- Every test is run in a context of its own with `RegExp.prototype.exec` and the `RegExp` constructor watched. Every
  pattern a test builds is a record, with the flags `i`, `m` and `s` it was built with, and every text the test
  matches it against (by `test`, `exec`, `match`, `replace`, `search` or `split`) is one of its tests, whatever the
  other flags and `lastIndex` were. A test asks the question of the record: does the pattern match anywhere in the
  text.
- The pattern of each negative syntax test, which is a regular expression literal that V8 must refuse.
- The generated tests of `property-escapes` and of `CharacterClassEscapes` give a text that is the whole of a set of
  code points, written as ranges, more than a million characters. Of each set a record takes the code points listed
  alone and the two ends of each range, each as a text of its own. The set and its complement are both taken, so
  `^\p{Lu}+$` has the ends of the ranges of `Lu` and of everything else.
- The generated tests of `unicodeSets`, and those of the properties of strings, give the strings a class has and
  strings it has not. Each is a text, and so is the join of the strings it has not, which is what the test asserts
  does not match. A string the class has not may still match as several strings it has: `^\p{RGI_Emoji}+$`
  matches an emoji followed by a skin tone.

Each record names its test files in `test262`, so a failure can be read against the test it came from.

**What test262 says, and V8.** Where test262's harness states an answer (a property escape matches each character
of its property and no other, a class of the `v` flag matches each of its strings and not the join of those it has
not), `test262.js` compares it with V8's, and a pattern a test builds must be valid to V8, and the pattern of a
negative syntax test not. Any difference stops the run. They agree everywhere: test262 has the character database
of Unicode 17, and so has V8 13.6.233.17 in Node 24.22.0, which wrote these files. (With Node 24.11.0, whose V8 has
Unicode 16, they differed on 7,216 answers: the characters and strings Unicode 17 changed, and the four scripts it
added, `Beria_Erfe`, `Sidetic`, `Tai_Yo` and `Tolong_Siki`.)

The later families' search for deviations (`deviations.js`) was run on these records too. It found two records whose
answers change from run to run, the two patterns of `regexp-modifiers/nesting-ignoreCase-does-not-affect-alternatives-outside.js`
(`a|(?-i:b|(?i:c)|d|(?-i:e)|f)|g|(?i:h)|k` with the `i` flag and `a|(?i:b|(?-i:c)|d|(?i:e)|f)|g|(?-i:h)|k` without),
which are marked `unstable` and have no tests. The matcher of `reference.js` gave V8's answer for all 1,240,121
answers it was asked for. It did not read the syntax 196 times, counting a pattern once for each grammar.

What it does not take. A test that is a JavaScript module (none of these directories has one). A test's pattern
with a flag that is not valid, or a negative test whose error is in the grammar of literals and not of patterns,
such as a line terminator before the closing `/`. A text that is not a string. And, of the property and class
escape sets, the code points inside a range, which are of the same property as its ends.

The patterns and texts are test262's and are used under its licence. See [NOTICE-test262.md](NOTICE-test262.md).

### `exec/test262.jsonl`

`test262.jsonl` keeps each pattern and text of test262 and asks of them whether the pattern matches anywhere.
`exec/test262.jsonl` keeps the calls themselves. Every built-in method that matches (`test`, `match`, `matchAll`,
`replace`, `search`, `split`) does so through `RegExp.prototype.exec`, and `test262-exec.js` keeps each call of it
that a test makes, whole, with V8's result:

```json
{"pattern": "a(?<x>b)?", "flags": "gu", "test262": ["test/built-ins/..."], "tests": [{"text": "xab", "lastIndex": 0, "answer": {"captures": [[1, 3], [2, 3]], "groups": {"x": [2, 3]}, "lastIndex": 3}}]}
```

- `flags` are the flags the test built the RegExp with, `g`, `y` and `d` among them.
- `lastIndex` is the value `exec` reads: 0 without `g` or `y`, where `exec` reads none.
- `answer` is `null` when `exec` gives null. Otherwise it gives the positions in UTF-16 code units of the match and of
  each group (`captures`, null for a group that took no part) and of each named group (`groups`), and, with `g` or
  `y`, the `lastIndex` that `exec` leaves. A null answer with `g` or `y` leaves `lastIndex` 0.

A call is kept when V8 passes the test, so test262's assertions hold of what V8 answered. It is a call on a RegExp of
`RegExp.prototype` itself, not a subclass, with a `lastIndex` that is a non-negative integer. Calls on the texts of
more than a million characters that the generated property escape tests build are left out (`test262.jsonl` keeps
those characters by the ends of their ranges), and so are negative tests. A call made twice is kept once. At the
commit `manifest.json` names, 2,077 of the 2,140 tests run pass under V8. Of the 63 others, 19 need a host this
script does not give them (`$262`, a second realm), 17 test Annex B's legacy accessors (`RegExp.$1` and the rest),
and 27 test the object protocol around the calls (a custom matcher on a primitive, a flags getter that throws, a
subclass given to `compile`), where V8 departs from test262. The passing tests make 135,390 calls, which give 1,406
patterns and 134,304 distinct calls: 131,823 with `g` or `y` (all but 777 of them from
`character-class-escape-non-whitespace.js`, which matches `\S+` against every code point alone) and 41 with `d`. The
script runs the tests without the proxy over `RegExp` that `test262.js` watches construction through, so that the tests
of the constructor's identity pass too, and in the watcher every built-in it needs is taken before a test runs
(`poisoned-stdlib.js` deletes `Array.prototype.push`).

A test whose answer under `u` or `v` has a match that starts between the halves of a surrogate pair would be marked
`surrogate-pair-start`, as in `captures.jsonl`. None is.

**Checked against engine262.** Every call was asked of engine262, a JavaScript engine written to the text of
ECMA-262, at `main` (d553e7b, with [engine262#378](https://github.com/engine262/engine262/issues/378) corrected). It
gives V8's answer on all of them but 404. 400 are calls of Annex B tests (`\c` before a letter outside ASCII,
identity escapes such as `\X`, `\k` with no named group), whose legacy syntax engine262 does not implement, and 3
more are such patterns in a test of `split`. The last is a fault of engine262's: in
`/(?<a>.(?<b>.(?<c>.)))/u` it gives the named groups in reverse order.

`verify-test262-exec.js` makes every call again and compares, and the verify workflow runs it. A runner builds the
named groups of an answer by definition, not assignment: one test names a group `__proto__`.

### `start-searches.jsonl`

For an engine that does not try every start of a match. Such an engine looks for something every match must hold (a
literal after a run of loops, a literal inside, one of several alternatives) and works out from where it is found
which starts could reach it. This family is made of the pieces such a search reasons about, so that a start it steps
past is a wrong answer here:

- an assertion before the loops, or none: `\b`, `\B`, `^` or `$`;
- one to three loops, unbounded or bounded, over sets that hold or do not hold the literal, word characters and
  others, line terminators and characters beyond the Basic Multilingual Plane;
- a literal, an alternation of two, or a literal before the loops as well as after them;
- then what may follow: an assertion, a loop, an alternation or nothing.

Each pattern has about 36 texts of its own. Some are in the shapes that ask where a match starts: a separator, the
literal, a run of the loops' sets and the literal again (`\b\w+n\b` over `a nation`, where the first `n` begins the
run before the second); the literal at the start of the text; the literal doubled. The rest are random runs of the
literal, members of the sets, separators and characters of every width: two- and three-byte UTF-8, surrogate pairs,
combining sequences, the long s and the Kelvin sign that case folding joins to ASCII, and lone surrogates. A match
without `u` can start between the halves of a pair, which over UTF-8 is the third byte of the four. Every record is
also in `captures.jsonl`, whose answers say where each match is, which a `test` answer alone does not.

The family was written when the Corvus .NET engine was found to step past starts in three ways that 26.9 million
answers of the other files did not show: an occurrence of the literal with no run before it that begins the run before
a later one, a later start of a run that passes an assertion the first failed (`\B\w+n` over `xan`), and a window back
from a bounded loop counted in characters where the text is in bytes or code units. Its seeds are those shapes.
`start-searches.js` writes it with a fixed seed. `fuzz.js` builds it with any other seed as a fuzzer (see
[regenerating it](#regenerating-it)).

### `captures.jsonl`

For a regular expression library rather than a JSON Schema implementation: what the members built on captures
give. Each record has the pattern, flags and validity of a record of another file (its `from` says which), with up
to 40 of that record's texts: every record of `hand-written.jsonl`, `flags.jsonl` and `start-searches.jsonl`, and one
in ten of each other file but `ill-formed-utf8.jsonl`, which has no texts. Each test holds, under `unicode` and under `legacy` for each grammar the pattern is
valid in, an object rather than a boolean:

| Field | What V8 gives |
|---|---|
| `exec` | `null`, or `[start, end]` for the match then `[start, end]` or `null` for each group, in UTF-16 code units, with `lastIndex` 0. |
| `all` | The `exec` results of a global search (`matchAll` with the `g` flag), at most 20 of them. |
| `sticky` | `exec` with the `y` flag and `lastIndex` 1, or `null` when the text is empty. |
| `replace` | `text.replace(pattern, "<$&|$1|$2|$10|$<a>|$$|$`|$'>")` with no `g` flag: every form of `$`, for groups the pattern may not have. |
| `replaceAll` | The same with the `g` flag. |
| `split` | `text.split(pattern)`, with `null` for a group that did not take part. |
| `split3` | `text.split(pattern, 3)`. |

Records marked `v8_deviation` in their own file are left out. A test whose answers under the `u` flag have a match
that starts between the halves of a surrogate pair is marked on the test itself, `"v8_deviation": true` with
`"deviation": "surrogate-pair-start"` (see [where V8 departs from ECMA-262](#where-v8-departs-from-ecma-262)): its
answers are V8's, and ECMA-262's differ. A test on which V8, in the generator's process, disagrees with the source
file's own `test` answer (the `unstable` class: a case-insensitive modifier group answered differently once V8
holds much compiled code) is marked `"deviation": "unstable"` and has no answers. `generate-captures.js` writes it
from the other files,
and `verify-captures.js` checks it; `verify.js` runs that for this file. The file is written by the Node the
manifest's entry for it names.

### `ill-formed-utf8.jsonl`

For an engine that takes UTF-8: texts that are not UTF-8. A JavaScript string is UTF-16 code units, any of them, so
JavaScript has no such text and V8 nothing to say about it. The answer is not V8's but the one an interface of bytes
owes its caller: the engine refuses the text with an error of its own, as invalid input. It does not match it, read
part of it, read an ill-formed sequence as U+FFFD or a byte as a Latin-1 character, crash or hang. An interface whose
text type cannot hold such bytes (a Rust `&str`, a Swift `String`) refuses them where the bytes become that type, and
that is its answer.

Its tests are the ill-formed sequences of Unicode's Table 3-7 (the well-formed UTF-8 byte sequences): lone
continuation bytes, bytes that are never used, overlong forms, encoded surrogates (one alone, and a pair as CESU-8
writes it), values beyond U+10FFFF, the old five- and six-byte forms, and sequences cut short at the end or by another
byte. Each is the whole text, and in five places in one: after `a`, between `ab` and `cd`, after `\u00e9`, after
300 `a`s, and before `a`. Each record is one of eight patterns, every one valid in both grammars, with the same 180
tests. `a`, and the empty pattern, match a text's first byte, so they tell an engine that checks a text as far as it
reads it from one that checks it all. `\u{FFFD}` tells one that reads an ill-formed sequence as U+FFFD, `[\x80-\xFF]`
one that reads a byte as a Latin-1 character, and `\p{Cs}` one that decodes an encoded surrogate.

A test has `bytes` (hexadecimal) and `case` (what the bytes hold) and no answer under a grammar, so a runner that
reads the other files by their fields asks it nothing. `ill-formed-utf8.js` writes it, and `verify.js` checks that
each test's bytes are not UTF-8.

### The sizes

Each family is sized to keep its file near the size of the first three, and a family with more texts has fewer
patterns. `word-boundaries.jsonl` needs all 259 short texts for every pattern, so it has 2,000 patterns and is 26
MB. `lookarounds.jsonl` is the largest file at 28 MB, `lone-surrogates.jsonl` the smallest at 3 MB, and the other
families are 15 to 24 MB.

### What was left out

A pattern is left out, and has no record, when V8 cannot answer it cheaply for every one of its texts. There are two
limits, and `manifest.json` records both and how many patterns each one dropped.

- **A budget of 250,000 backtracks for the search of one text.** V8 can count its backtracks, and the count is the
  same on every machine. This is the limit that decides. It dropped 162 of the 7,000 candidates for
  `empty-loops.jsonl`, 129 of the 4,000 for `backreferences.jsonl`, 115 of the 4,000 for `engine-faults.jsonl`, one
  for `case-folding.jsonl`, and none from the other families.
- **A time limit of 250 ms for one text.** Each match runs in a worker thread, and a worker still inside one match
  when the limit passes is terminated. The budget keeps every match far below this (the slowest that was kept took
  under 10 ms), so it dropped nothing. It is there so that a run always finishes.

## Using it

```python
import json, re

with open("data/generated.jsonl") as f:
    for line in f:
        record = json.loads(line)
        ...  # compare your engine's verdict with record["valid"]["unicode"]
```

A common way to use it for a JSON Schema implementation: treat a pattern as valid when either mode accepts it (many
schemas in the wild hold patterns that only the legacy grammar accepts), take the `unicode` answers when the pattern
is valid in Unicode mode, and the `legacy` answers otherwise, leaving out texts with characters beyond the Basic
Multilingual Plane for a legacy-only pattern if your engine matches code points.

A record with flags can be given to an engine that takes none as a modifier group around the pattern, `(?i:` then
the pattern then `)`, which means the same. Compare only the validity of a record that has `v8_deviation`.

## How a runner judges an engine

Engines are compared by the share of the data they answer as V8 does, so every runner asks the same questions and
counts them the same way. A runner that departs from this says so beside its figures.

- **What is skipped.** A test marked `v8_deviation`, and a record marked as one of V8's departures (section "Where
  V8 departs from ECMA-262"). Nothing else.
- **The grammars.** Each record is asked about under every grammar V8 judged it in: `unicode` (the record's flags
  with `u`), `legacy` (its flags alone) and, where the record has it, `unicode_sets` (with `v`).
- **The grammars an engine implements.** An engine that implements only some of the three (SRELL has no grammar but
  the `u` and `v` ones; `std::regex` has neither of those) is asked under those alone, and says which, as it says
  which encodings it answers in. Its figure is then a share of the answers of those grammars, and names them.
- **The version of Unicode.** The answers are V8's, from its version of the Unicode Character Database
  (`manifest.json`, `unicode`). An engine with another version says which, and is asked the questions of that
  version: the data with that version's overlay applied (`node unicode.js apply <version> <dir>`). See
  [other versions of Unicode](#other-versions-of-unicode).
- **Validity.** Under a grammar V8 found valid, an engine that refuses the pattern scores one *refused*; under a
  grammar V8 found invalid, one that accepts it scores one *accepted invalid*. A correct verdict is not counted on
  its own; it opens the tests.
- **The tests.** Each test's answer under each valid grammar is one answer over UTF-16 and, when the text holds no
  lone surrogate, one more over UTF-8. An engine with one encoding answers in that one only, and says which.
- **`captures.jsonl`.** For each test and each valid grammar: `exec`, `all` (the global search), `sticky`,
  `replace`, `replaceAll`, `split` and `split3` over UTF-16, and `exec`, `all`, `sticky`, `replace` and `replaceAll`
  over UTF-8 when the text holds no lone surrogate. Each is one answer, right or wrong. `sticky` is not asked of an
  empty text (its answer is `null`), nor over UTF-8 where `lastIndex` 1 falls between the halves of a supplementary
  character: UTF-8 has no such position, as it has no form of a lone surrogate. Over UTF-8, positions are
  byte offsets and a text answer is compared with V8's answer converted to UTF-8: where a match falls between the
  halves of a supplementary character (possible without `u` or `v`), V8's answer holds a lone half, which UTF-8
  cannot carry, so each lone half is U+FFFD.
- **`exec/test262.jsonl`.** A runner that takes it up asks each call as the record has it: the pattern with the
  record's flags, `lastIndex` set, one `exec`. Each call is one answer over UTF-16: right when the positions of the
  match and of every group, the named groups and, with `g` or `y`, the `lastIndex` after are all V8's. Over UTF-8,
  when the text holds no lone surrogate, it is one more answer, with positions in bytes and `lastIndex` as a byte
  offset, and not asked where `lastIndex` falls between the halves of a supplementary character. An engine that has
  no `d`, `g` or `y` answers the calls of those flags as unanswered.
- **`ill-formed-utf8.jsonl`.** Each test, under each grammar the pattern is valid in, is one answer over UTF-8 and
  none over UTF-16. The engine's UTF-8 interface is asked whether the pattern matches the bytes. The right answer
  is a refusal: the error the interface gives for input that is not UTF-8. A match or a mismatch is wrong, and a
  crash or a hang is unanswered.
- **No answer is a wrong answer.** A match that reaches the engine's time or memory limit, a crash or a hang scores
  one *unanswered* (the runner's `limit` column) for that answer, and every answer the record would have had.
- **The figure.** Right over everything judged: right, wrong, refused, accepted invalid and unanswered. An engine
  that answers everything as V8 does is 100%; a runner's summary line gives all five counts, as the Corvus runners
  print them (`right N  wrong N  refused-valid N  accepted-invalid N  limit N`).

## Other versions of Unicode

ECMA-262 asks an implementation for the latest version of Unicode, so engines differ in the version they have, and
an answer that depends on it is right for one version and wrong for another. `data/unicode/<version>.jsonl` holds
every answer and every validity that differs under another version than V8's, one JSON line each:

```json
{"file": "test262.jsonl", "line": 1234, "grammar": "unicode", "valid": true}
{"file": "test262.jsonl", "line": 1234, "grammar": "unicode", "test": 5, "answer": true}
```

`line` counts the lines of the file from 1 and `test` the record's tests from 0; an answer has the shape the file's
answers have. `node unicode.js apply <version> <dir>` writes the data with an overlay applied, which a runner reads in
place of `data/`; the number of answers is the same, and only some of them differ. `node unicode.js check` checks
that every line of every overlay fits the data, so an overlay made for other data cannot go stale unnoticed.

**How an overlay is made.** No V8 has a later version than 17.0 yet, so another engine answers for it, one whose
answers are V8's everywhere at 17.0 and whose tables alone change: the Corvus.Regex.Ecma262 data-set runner, built
with the other version's tables, with `--answers` (it writes its own answers wherever they differ from the data's).
For 18.0:

1. The tables come from the Unicode Character Database 18.0.0 (`UCD.zip`, `emoji-sequences.txt` and
   `emoji-zwj-sequences.txt`), through the `gen-unicode` program of the regress crate and the library's
   `tools/unicode` scripts. The same chain run on 17.0.0 gives the tables the library ships, byte for byte.
2. Run with the tables it ships, the runner's `--answers` writes nothing: every answer, every captures object and
   every validity is V8's. Built with the 18.0 tables it writes the 9,115 answers of `unicode/18.0.jsonl` (4,542 of
   `test262.jsonl` under `u`, the same under `v`, and 31 of `captures.jsonl`), and no validity.
3. Every one of those answers is to a text that holds a character whose properties differ between the two versions'
   tables, and SRELL (2026.07, an independent engine with the 18.0 database) departs from V8 on every one of them.
4. Judged both ways, the 18.0 engine on V8's answers and the 17.0 engine on the overlaid answers give the same
   18,495 wrong answers.

An overlay belongs to the data it was made for: when the data is regenerated, the overlays are made again.

## What to know before relying on it

- **It records one implementation.** The answers are V8's (13.6.233.17, in Node 24.22.0), not the specification's. For the
  great majority of patterns they are the same thing.
- **Known deviations.** V8 13.6 departs from ECMA-262 in six known ways, on 232 records. Those records have
  `"v8_deviation": true`. See the next section.
- **Unicode 17.** V8 13.6.233.17 has the Unicode 17.0 character database, as test262 has. An engine with another
  version answers otherwise on the characters whose properties differ, in `\p{...}` and in case folding. For the
  versions an overlay exists for (18.0 so far), the answers of that version are in `data/unicode/`.
- **No `v` flag in the first files.** Set notation and properties of strings are covered by `unicode-sets.jsonl`
  and the files from test262 only.
- **Whole-text answers, for the most part.** A test of the files of records says whether the pattern matches
  anywhere in the text. Where the match is and what the groups captured are in `captures.jsonl`, for a sample of
  them, and in `exec/test262.jsonl`, for the calls test262 makes.

## Where V8 departs from ECMA-262

The answers are V8's, and in six known classes of pattern V8 13.6 is wrong, or does not always say the same. A
record of one of them is marked with `"v8_deviation": true`, and in the later families with a `deviation` that
names the class. The answers of a marked record are still V8's. They should not be taken as the specification's. Where V8's answer is wrong, `spec/answers.jsonl` has the specification's (see
[the specification's answers](#the-specifications-answers-where-v8-departs)).

| Class | Records | What V8 does | Smallest example |
|---|---|---|---|
| `modifier-group` | 6 in `hand-written.jsonl`, 22 in `case-folding.jsonl` | A case-insensitive modifier group is answered differently from the same pattern with the `i` flag, which ECMA-262 does not allow. | `^(?i:\u212a)$` with the `u` flag does not match `k`. `^\u212a$` with `iu` does. |
| `unstable` | 18 in `case-folding.jsonl`, 13 in `unicode-sets.jsonl`, 2 in `test262.jsonl` | The answer depends on how V8 compiled the pattern, and so changes from one run to the next. All 33 have a case-insensitive modifier group, and the 13 of `unicode-sets.jsonl` a class with strings in it. The records have no `tests`. | `(?i:\Bs)` with the `u` flag on `s` and a long s (U+017F). False at first, true once V8 has switched its optimising compiler off. |
| `surrogate-pair-start` | 2 in `code-units.jsonl`, 2 in `lone-surrogates.jsonl`, 1 in `case-folding.jsonl` | With the `u` flag a match starts between the two halves of a surrogate pair. ECMA-262 moves from one start to the next a code point at a time. | `/(?<!^.*)/u.exec("\u{10428}")` has index 1. So has `/\B/u.exec("a\u{10428}a")`, at index 2. Both should be null. |
| `full-case-folding` | 6 in `case-folding.jsonl` | With the `i` and `u` flags a backreference is compared with the text by full case folding of the whole string. ECMA-262 compares one character at a time through Canonicalize, which is simple case folding. | `^(..)\1$` with `iu` matches the four characters sharp s, `S`, `s`, capital sharp s. `^(.)(.)\1\2$` does not. |
| `single-character-string-case` | 136 in `unicode-sets.jsonl` | With the `i` and `v` flags a string of one character in `\q{...}` is not canonicalized against the text: `[\q{k}]` does not match `K`, where `[k]` does. ECMA-262 makes such a string a character of the class. | `^(?i:[\q{k}])$` |
| `ascii-case-folding` | 24 in `unicode-sets.jsonl` | With the `i` and `v` flags `\p{ASCII}` is folded without the long s and the Kelvin sign, which fold to `s` and `k`, where the same range written out, `[\u0000-\u007f]`, is folded with them. ECMA-262 folds the two alike. | `[\p{ASCII}]` with `i` on the long s |

The six marked records of `hand-written.jsonl` have no `deviation` field. One of them, `(?i:\Bs)`, is unstable as
well, and so is `(?i:\bk\b)` in the same file, which is not marked. `flags.jsonl` covers what the modifier groups
of those records say through the flags, where V8 is right.

A record with a case-insensitive modifier group and a multi-character backreference is counted as
`modifier-group`, whichever of the two is the cause.

How they are found. `deviations.js` looks at every record of the seven later families.

- **Unstable.** V8 compiles a regular expression in more than one way. It interprets it at first and compiles it
  to machine code when it is used again, and it compiles differently once the process holds about 16 MB of
  compiled code. Each record is answered again in four ways. In processes that have compiled little. In a process
  that has first compiled 48 MB of other patterns. With `--no-regexp-optimization`. With
  `--regexp-interpret-all`. A record with an answer that differs in any of them is marked and loses its tests.
  No record of the other five families of `more-families.js` differs.
- **Surrogate pair start.** For each text with a surrogate pair, the pattern is tried with the `y` flag from each
  start that ECMA-262 allows. A record is marked when that finds no match and V8's own search finds one.
- **Modifier group and full case folding.** `reference.js` is a matcher written from the text of ECMA-262. It asks
  V8 what one character matches, and does the rest itself: the order of the search, the repetitions, the groups,
  the backreferences and the assertions. Every record of `case-folding.jsonl` is answered by it as well, with the
  `u` flag and without it. A record on which it disagrees with V8 is marked `modifier-group` when the pattern has
  a case-insensitive modifier group, and `full-case-folding` when it has the `i` flag and a backreference. Any
  other disagreement stops the generator, and there is none.
- **Single-character strings, and the folding of `\p{ASCII}`.** `reference.js` does not read the `v` flag's
  grammar. `unicode-sets.js` finds these two classes itself, by rewriting: a record with the `i` flag or a
  case-insensitive modifier group has every string of one character in a `\q{...}` written as a character of the
  class instead, which is what ECMA-262 makes of it, and `\p{ASCII}` written as the range `[\u0000-\u007f]`, and V8
  is asked again. A record whose answers change is marked with the class of the rewriting that changed them.

`reference.js` is not the oracle, and it is not asked about the other files when they are generated. It was run
over them once as a check, and the numbers of that run are in the section on checking.

## The specification's answers where V8 departs

`spec/answers.jsonl` holds ECMA-262's answer for each test of a marked record (`v8_deviation`) where V8's recorded
answer is wrong: 660 answers, to 651 tests of 183 records. Each is one JSON line, in the form of the overlays for
other versions of Unicode, with the class of the deviation and how the answer was established:

```json
{"file": "unicode-sets.jsonl", "line": 5194, "grammar": "unicode_sets", "test": 0, "answer": false, "deviation": "single-character-string-case", "basis": "engines and engine262"}
```

| Class | Answers | Records |
|---|---|---|
| `single-character-string-case` | 247 | 133 |
| `surrogate-pair-start` | 159 | 6 (one of them in `captures.jsonl`) |
| `modifier-group` | 130 | 27 |
| `full-case-folding` | 102 | 6 |
| `ascii-case-folding` | 20 | 10 |
| `unstable` | 2 | 1 test of `captures.jsonl`, which had no answers before |

The records stay marked, and a runner that skips them as before is not affected. A runner that judges them takes the
answer of this file where it has one, and the record's answer otherwise: on every other test of a marked record V8's
answer is the specification's.

**How the answers were found.** The marked records, with their marks removed, were given to the data-set runners of
the Corvus regular expression engines (the .NET and the Rust one), QuickJS-ng 0.17, SRELL 2026.07 and regress 0.12,
each judging its engine against V8's answers. Wherever the Corvus engines and QuickJS-ng departed from V8 they gave
the same answer, 737 answers in all counting each operation of a `captures.jsonl` test once; SRELL gave the same
wherever it was asked (it has no legacy grammar), and regress on all but 56 of them. Each of those answers was then
asked of engine262, a JavaScript engine written to the text of ECMA-262, at `main` (d553e7b): with one line of it
corrected ([engine262#378](https://github.com/engine262/engine262/issues/378), the complement of a class under the
`v` and `i` flags), it gives the same answer for all but 3. Those 3 (`[^\q{A}]` and `[^\q{\u212A}]` with `iv`) were
settled from the text of ECMA-262 (MaybeSimpleCaseFolding folds the string of `\q{...}`, so the complement leaves out
`a` and `k`), where engine262 has a second fault ([engine262#379](https://github.com/engine262/engine262/issues/379)).
The `basis` of each line says which.

**What is not in it.**

- 31 answers that depend on [tc39/ecma262#4006](https://github.com/tc39/ecma262/issues/4006): a lone General_Category
  value such as `\p{Lu}` in a set operation under the `v` and `i` flags, which the text of ECMA-262 does not case-fold
  while it folds `\p{gc=Lu}`. The engines above fold both, and so does engine262. They are held until that issue is
  decided; 17 records have no other answer that V8 gets wrong, and so no line here yet.
- The sticky answers of the six `surrogate-pair-start` tests of `captures.jsonl` with `lastIndex` 1 inside a surrogate
  pair. There V8's answer is the one intended: matching starts at the code point that holds `lastIndex`
  ([tc39/ecma262#128](https://github.com/tc39/ecma262/issues/128),
  [#2511](https://github.com/tc39/ecma262/issues/2511)). The text of ECMA-262 as it stands gives a match that starts
  after it ends there, and engine262 fails an assertion of the specification on it.
- The 33 `unstable` records, which have no tests, and `(?i:\Bs)` in `hand-written.jsonl`, whose recorded answers are
  the specification's although V8's change from one run to the next.

**V8 since.** Every class has been corrected in V8: the modifier groups and the unstable answers by the redesign of
how a pattern's flags are kept ([8260876](https://chromium-review.googlesource.com/c/v8/v8/+/8260876), V8 15.4;
[nodejs/node#66277](https://github.com/nodejs/node/issues/66277)), the backreferences under `iu`
([8423859](https://chromium-review.googlesource.com/c/v8/v8/+/8423859)), single characters in `\q{...}`
([8549637](https://chromium-review.googlesource.com/c/v8/v8/+/8549637)) and `\p{ASCII}`
([8641470](https://chromium-review.googlesource.com/c/v8/v8/+/8641470)). V8 15.8.45 gives the specification's answer
on every one of the 660 but the 20 of `ascii-case-folding`, which the last of those changes, made after that release, is to correct.

`node spec-answers.js check` checks that every line fits the data: the record or test is marked, the test exists, and
the answer differs from V8's. The answers belong to the data they were made for, and are made again when it is
regenerated.

## Checking it

```sh
node verify.js
```

`verify.js` does not use the generator. It reads every record of every file, compiles the pattern again, matches
every text again, and compares V8's answers with the recorded ones. It prints the patterns, tests and answers of
each file, and checks the counts in `manifest.json` and the marks of the deviations. With Node 24.22.0 it reports no
disagreements in 11,674,962 answers. With another Node, a disagreement is a place where its V8 differs. It checks
each file in a process of its own, because V8's answers for two of the hand-written patterns that it gets wrong
(`(?i:\Bs)` and `(?i:\bk\b)`) change in a process that has compiled a great many patterns.

```sh
node unicode.js check
```

checks that every line of the overlays in `data/unicode/` fits the data.

```sh
node spec-answers.js check
```

checks that every line of `data/spec/answers.jsonl` fits the data.

```sh
node verify-test262-exec.js
```

makes every call of `data/exec/test262.jsonl` again and compares its answer.

The matcher of `reference.js` was also run once over the twelve files that it has no part in generating. It was
asked for 7.3 million of their answers, and gave V8's for all but those of ten records, which are the six marked
ones of `hand-written.jsonl` and the four marked `surrogate-pair-start`. It was not asked where it does not read
the syntax (552 times, counting a pattern once for each grammar it is valid in), and it gave up 66 times on a
pattern that took it too long.

## Regenerating it

```sh
node generate.js
```

After any regeneration, make the overlays of `data/unicode/` again (see
[other versions of Unicode](#other-versions-of-unicode)); `node unicode.js check` fails while one is stale.

This needs Node 24.22.0, the Node that wrote the data (a later V8 may answer otherwise, and V8 has had Unicode 17 since
that release), and rewrites `data/`, all but the files that the three
scripts below write, whose entries in `manifest.json` it keeps. The patterns and texts come from
fixed lists and generators with fixed seeds, in `generate.js` for the first three files and in `families.js`,
`more-families.js`, `unicode-sets.js` and `start-searches.js` for the families. Each family has a seed of its own. A run with the same Node gives the same
files, and a run with a newer one shows what changed in V8. `timed.js` asks V8 about the families within the two
limits. It uses four worker threads. `deviations.js` then marks the records of the later families where V8 is
known to be wrong, with `reference.js` beside it. It starts other Node processes to do so. A run takes about half a
minute.

The two files from test262 are written by `test262.js`, from a checkout of test262 at the commit that
`manifest.json` names in their entries:

```sh
git clone https://github.com/tc39/test262
git -C test262 checkout d53ebc8b1931d9f1541e43d59650776e4b766248
node test262.js test262
```

It rewrites those two files, their entries in `manifest.json` and `NOTICE-test262.md`, and takes about a minute. A
checkout of a later commit takes in what test262 has added. `exec/test262.jsonl` is written from the same checkout:

```sh
node test262-exec.js test262
```

It rewrites the file, its entry in `manifest.json` (under `exec`) and `NOTICE-test262.md`, in about ten seconds.
Both scripts run test262's tests through `test262-run.js`, and both write the same notice: the copyright lines of
every test file that any of the three files takes from, whichever script runs last. Make `captures.jsonl` and the
overlays again after either.

`ill-formed-utf8.jsonl` is written by `ill-formed-utf8.js`, which rewrites it and its entry in `manifest.json`:

```sh
node ill-formed-utf8.js
```

`fuzz.js` is a fuzzer for an engine's start searches: it builds the start-searches family with a seed and a size of
its own, asks this V8 about it within the same limits, and writes a data directory (`start-searches.jsonl`,
`captures.jsonl` from it, and `manifest.json`) that any runner reads as it reads `data/`. A wrong answer on it is a
fault; the test that keeps it belongs in the engine's own tests.

```sh
node fuzz.js fuzz-out 12345 3000
```

## Licence

MIT, except for the patterns and texts taken from test262, which are in `test262.jsonl` and
`test262-lone-surrogates.jsonl` and are under test262's licence (BSD). See [LICENSE](LICENSE) and
[NOTICE-test262.md](NOTICE-test262.md).
