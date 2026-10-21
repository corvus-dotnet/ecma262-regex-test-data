# ECMA-262 regular expression test data

What the V8 JavaScript engine says about 112,701 regular expression patterns. It says which ones are valid, and for
52,811 of them, whether they match each of a set of texts. There are 5,675,685 texts in all, each with its answers,
as plain JSON Lines. Most of the patterns are written for this data. 8,342 of them, and their texts, are taken from
test262, the conformance suite of ECMA-262 (see [the files from test262](#the-files-from-test262)).

It is for testing a regular expression engine, or a translation from ECMAScript syntax to another engine's, against a
real implementation of ECMA-262. JSON Schema is one reason to need that: its `pattern` and `patternProperties`
keywords and its `regex` format are defined as ECMA-262 regular expressions, and most languages' own regex libraries
differ from it in many small ways (what `\d`, `\w`, `\s` and `.` mean, case folding, Unicode properties, lookbehind,
what is a syntax error).

The data is the oracle that the [Corvus JSON Schema](https://github.com/corvus-dotnet/Corvus.JsonSchema) evaluators
for Rust, Java, Go, Julia and Object Pascal are tested against, written out in full.

## The files

Everything is in `data/`. Each `.jsonl` file has one JSON object to a line. The files are ASCII: every other
character is a `\uXXXX` escape, so no tool has to agree about an encoding.

| File | Patterns | Tests | What is in it |
|---|---|---|---|
| `hand-written.jsonl` | 783 | 194,649 | Patterns written by hand to cover the grammar and the semantics: escapes, classes, quantifiers, groups, lookaround, backreferences, named groups, Unicode properties, case folding, the ECMAScript 2025 additions, and patterns found in real JSON schemas. Each is matched against 273 texts. |
| `flags.jsonl` | 600 | 163,800 | 150 patterns, each with the flags `i`, `m`, `s` and `ims`, matched against the same 273 texts. They cover case-insensitive matching, multiline anchors and the dot. |
| `generated.jsonl` | 60,000 | 182,000 | Patterns of 1 to 8 characters drawn at random from an alphabet of regular expression syntax. Most are not valid, which is the point: they test what a parser accepts and what it refuses. The first 4,000 are also matched against 80 short texts. |
| `anchored-lists.jsonl` | 6,000 | 342,200 | Anchors and assertions inside lists, prefixes, suffixes, alternations and class sequences. Each is matched against 58 texts. See [the families](#the-families). |
| `empty-loops.jsonl` | 6,838 | 341,900 | Counted groups whose body can match the empty string. Each is matched against 50 texts. |
| `line-terminators.jsonl` | 3,000 | 300,000 | Anchors, the dot and classes against texts that begin, end or are broken by a line terminator. Each is matched against 100 texts. |
| `word-boundaries.jsonl` | 2,000 | 542,000 | `\b` and `\B` at every place in short patterns. Each is matched against 271 texts, which include every text of up to three characters over a six-character alphabet. |
| `backreferences.jsonl` | 3,871 | 514,843 | Backreferences to groups of repetitions, of alternatives and of optional groups, to groups that are never set, and from inside the group. Each is matched against 133 texts. |
| `lookarounds.jsonl` | 4,499 | 590,167 | Groups that a lookahead or a lookbehind sets, read outside it or in the same repetition. Each is matched against about 130 texts, which include every text of up to four characters over its alphabet. |
| `case-folding.jsonl` | 2,863 | 407,080 | Case-insensitive literals, classes and backreferences, with the `i` flag and in `(?i:` groups, against the characters whose case pairs host engines get wrong. The number of texts depends on the pattern. |
| `code-units.jsonl` | 3,000 | 296,940 | Patterns that are valid only without the `u` flag, and so are matched by UTF-16 code unit, against texts with characters beyond the Basic Multilingual Plane. Each is matched against 105 texts. |
| `lone-surrogates.jsonl` | 1,500 | 69,000 | The same kind of pattern against 46 texts that hold half of a surrogate pair. The texts are not valid Unicode, which is why they have a file of their own. |
| `engine-faults.jsonl` | 3,885 | 377,812 | Patterns on which a host engine itself goes wrong, and syntax that host engines have and ECMA-262 has not. 628 of them are not valid. The others are matched against 116 texts. |
| `unicode-sets.jsonl` | 5,520 | 795,150 | The `v` flag: nested classes, the difference and the intersection of classes, strings in classes and the properties of strings, with the `i` flag and without. Every record is answered with the `v` flag as well as with `u` and with neither, because the three grammars read a class differently. Each is matched against 150 texts. See [the families](#the-families). |
| `test262.jsonl` | 4,907 | 547,818 | The patterns and texts of test262's regular expression tests, at the commit `manifest.json` names: every pattern a test builds or a syntax test refuses, and every text a test matches one against. A property escape test's text is the whole of a property, and is taken as the two ends of each of its ranges. See [the files from test262](#the-files-from-test262). |
| `test262-lone-surrogates.jsonl` | 3,435 | 10,326 | The texts and patterns of `test262.jsonl` that hold half of a surrogate pair, as `lone-surrogates.jsonl` holds those of the families. |
| `captures.jsonl` | 3,100 or so | 90,000 or so | Not `test` but the rest of `RegExp`: where the match is and what each group captured (`exec`), the matches of a global search, the sticky flag, `replace` with every form of `$`, and `split`, for every pattern of `hand-written.jsonl` and `flags.jsonl` and one record in ten of each family. See [captures](#capturesjsonl). |
| `manifest.json` | | | The versions of Node, V8 and Unicode the data was generated with, the counts of each file, and for the families the limits and how many patterns they dropped. |

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
| `v8_deviation` | Present and true on 191 records, and on 7,152 tests of `test262.jsonl`, where V8's answers are known to differ from the specification, or to change from run to run. See [where V8 departs from ECMA-262](#where-v8-departs-from-ecma-262). |
| `deviation` | On a marked record of the later families and of the files from test262, and on a marked test, the class of the deviation: `unstable`, `surrogate-pair-start`, `modifier-group`, `full-case-folding`, `single-character-string-case`, `ascii-case-folding` or `unicode-version`. An `unstable` record has no `tests`. |
| `test262` | Only in the files from test262: the test files of test262 the pattern and its texts were taken from, as paths in that repository. |
| `test262_valid` | Only on a record marked `unicode-version`: test262's verdict where V8's differs, as `{"unicode": true}`. |
| `tests[].test262_answer` | Only in the files from test262, on a test marked `unicode-version` and on every test of a record so marked: test262's answer where V8 has none or differs, by mode. |

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

`captures.jsonl` was written before this family and has none of its records.

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
not), `test262.js` compares it with V8's. A pattern a test builds is valid to V8, and the pattern of a negative syntax test is not. They differ in one
way only. test262 has Unicode 17, and V8 13.6 has Unicode 16:

- A test whose character or string has another property in Unicode 17 is marked `"v8_deviation": true`,
  `"deviation": "unicode-version"`, on the test itself. It keeps V8's answers and holds test262's in
  `test262_answer`. There are 7,152, for 562 patterns: those of 71 property escape tests and of the properties of
  strings `Basic_Emoji`, `RGI_Emoji`, `RGI_Emoji_Modifier_Sequence` and `RGI_Emoji_ZWJ_Sequence`.
- A pattern of a script that Unicode 17 added (`Beria_Erfe`, `Sidetic`, `Tai_Yo`, `Tolong_Siki`) is not valid to
  V8 with the `u` flag. The eight tests of those scripts are read without compiling their patterns. Its record is marked the same way, and holds test262's verdict in `test262_valid` and
  test262's answer in each test's `test262_answer`. There are 64, and they have copies in
  `test262-lone-surrogates.jsonl`.

An engine with Unicode 16 skips the marked tests and records, as with every deviation. An engine with Unicode 17 is
judged on them by `test262_answer` and `test262_valid` instead (see [how a runner judges an
engine](#how-a-runner-judges-an-engine)).

The later families' search for deviations (`deviations.js`) was run on these records too. It found one record whose
answers change from run to run, `a|(?-i:b|(?i:c)|d|(?-i:e)|f)|g|(?i:h)|k` with the `i` flag, which is marked
`unstable` and has no tests. The matcher of `reference.js` gave V8's answer for all 1,104,410 answers it was asked
for. It did not read the syntax 6 times, counting a pattern once for each grammar.

What it does not take. A test that is a JavaScript module (none of these directories has one). A test's pattern
with a flag that is not valid, or a negative test whose error is in the grammar of literals and not of patterns,
such as a line terminator before the closing `/`. A text that is not a string. And, of the property and class
escape sets, the code points inside a range, which are of the same property as its ends.

The patterns and texts are test262's and are used under its licence. See [NOTICE-test262.md](NOTICE-test262.md).

### `captures.jsonl`

For a regular expression library rather than a JSON Schema implementation: what the members built on captures
give. Each record has the pattern, flags and validity of a record of another file (its `from` says which), with up
to 40 of that record's texts. Each test holds, under `unicode` and under `legacy` for each grammar the pattern is
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
  V8 departs from ECMA-262"). Nothing else, but for the Unicode version below.
- **The Unicode version.** A record or a test marked `unicode-version` (in the files from test262) is where V8 has
  the Unicode of 16 and test262 that of 17. A runner whose engine has Unicode 17 judges it by test262: a marked
  record in each grammar its `test262_valid` names, by that verdict, and its tests by their `test262_answer` in that
  grammar; a marked test, or a test of a marked record, in each grammar its `test262_answer` names, by that answer.
  A grammar test262 gives nothing for is skipped. A runner whose engine has another Unicode skips them, as it skips
  every other deviation, and says so beside its figures.
- **The grammars.** Each record is asked about under every grammar V8 judged it in: `unicode` (the record's flags
  with `u`), `legacy` (its flags alone) and, where the record has it, `unicode_sets` (with `v`).
- **Validity.** Under a grammar V8 found valid, an engine that refuses the pattern scores one *refused*; under a
  grammar V8 found invalid, one that accepts it scores one *accepted invalid*. A correct verdict is not counted on
  its own; it opens the tests.
- **The tests.** Each test's answer under each valid grammar is one answer over UTF-16 and, when the text holds no
  lone surrogate, one more over UTF-8. An engine with one encoding answers in that one only, and says which.
- **`captures.jsonl`.** For each test and each valid grammar: `exec`, `all` (the global search), `sticky`,
  `replace`, `replaceAll`, `split` and `split3` over UTF-16, and `exec`, `all`, `sticky`, `replace` and `replaceAll`
  over UTF-8 when the text holds no lone surrogate. Each is one answer, right or wrong. Over UTF-8, positions are
  byte offsets and a text answer is compared with V8's answer converted to UTF-8: where a match falls between the
  halves of a supplementary character (possible without `u` or `v`), V8's answer holds a lone half, which UTF-8
  cannot carry, so each lone half is U+FFFD.
- **No answer is a wrong answer.** A match that reaches the engine's time or memory limit, a crash or a hang scores
  one *unanswered* (the runner's `limit` column) for that answer, and every answer the record would have had.
- **The figure.** Right over everything judged: right, wrong, refused, accepted invalid and unanswered. An engine
  that answers everything as V8 does is 100%; a runner's summary line gives all five counts, as the Corvus runners
  print them (`right N  wrong N  refused-valid N  accepted-invalid N  limit N`).

## What to know before relying on it

- **It records one implementation.** The answers are V8's (13.6, in Node 24.11.0), not the specification's. For the
  great majority of patterns they are the same thing.
- **Known deviations.** V8 13.6 departs from ECMA-262 in seven known ways, on 191 records and 7,152 tests. Those
  records and tests have `"v8_deviation": true`. See the next section.
- **Unicode 16.** V8 13.6 has the Unicode 16.0 character database. An engine with a later version will differ on
  characters assigned since, in `\p{...}` and in case folding. The files from test262 mark those of their tests,
  with test262's answers, which are Unicode 17's.
- **No `v` flag in the first files.** Set notation and properties of strings are covered by `unicode-sets.jsonl`
  and the files from test262 only.
- **Whole-text answers only.** A test says whether the pattern matches anywhere in the text. It does not record
  where, or what the groups captured.

## Where V8 departs from ECMA-262

The answers are V8's, and in seven known classes of pattern V8 13.6 is wrong, or does not always say the same. A
record of one of them is marked with `"v8_deviation": true`, and in the later families with a `deviation` that
names the class. In the files from test262 a test may be marked on its own, the same way. The answers of a marked
record or test are still V8's. They should not be taken as the specification's.

| Class | Records | What V8 does | Smallest example |
|---|---|---|---|
| `modifier-group` | 6 in `hand-written.jsonl`, 20 in `case-folding.jsonl` | A case-insensitive modifier group is answered differently from the same pattern with the `i` flag, which ECMA-262 does not allow. | `^(?i:\u212a)$` with the `u` flag does not match `k`. `^\u212a$` with `iu` does. |
| `unstable` | 25 in `case-folding.jsonl`, 14 in `unicode-sets.jsonl` | The answer depends on how V8 compiled the pattern, and so changes from one run to the next. All 39 have a case-insensitive modifier group, and the 14 a class with strings in it. The records have no `tests`. | `(?i:\Bs)` with the `u` flag on `s` and a long s (U+017F). False at first, true once V8 has switched its optimising compiler off. |
| `surrogate-pair-start` | 2 in `code-units.jsonl`, 2 in `lone-surrogates.jsonl`, 1 in `case-folding.jsonl` | With the `u` flag a match starts between the two halves of a surrogate pair. ECMA-262 moves from one start to the next a code point at a time. | `/(?<!^.*)/u.exec("\u{10428}")` has index 1. So has `/\B/u.exec("a\u{10428}a")`, at index 2. Both should be null. |
| `full-case-folding` | 6 in `case-folding.jsonl` | With the `i` and `u` flags a backreference is compared with the text by full case folding of the whole string. ECMA-262 compares one character at a time through Canonicalize, which is simple case folding. | `^(..)\1$` with `iu` matches the four characters sharp s, `S`, `s`, capital sharp s. `^(.)(.)\1\2$` does not. |
| `single-character-string-case` | 136 in `unicode-sets.jsonl` | With the `i` and `v` flags a string of one character in `\q{...}` is not canonicalized against the text: `[\q{k}]` does not match `K`, where `[k]` does. ECMA-262 makes such a string a character of the class. | `^(?i:[\q{k}])$` |
| `ascii-case-folding` | 24 in `unicode-sets.jsonl` | With the `i` and `v` flags `\p{ASCII}` is folded without the long s and the Kelvin sign, which fold to `s` and `k`, where the same range written out, `[\u0000-\u007f]`, is folded with them. ECMA-262 folds the two alike. | `[\p{ASCII}]` with `i` on the long s |
| `unicode-version` | 64 records and 7,152 tests in `test262.jsonl`, 64 records in `test262-lone-surrogates.jsonl` | V8 13.6 has the character database of Unicode 16, and test262 that of Unicode 17. A property is answered for a character as Unicode 16 has it, and a script that Unicode 17 added is not a property name. The marked tests hold test262's answer in `test262_answer`, and the marked records test262's verdict in `test262_valid`. | `^\p{Cased}+$` with the `u` flag on U+0295, which Unicode 17 makes cased. V8 says no, test262 yes. |

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

## Checking it

```sh
node verify.js
```

`verify.js` does not use the generator. It reads every record of every file, compiles the pattern again, matches
every text again, and compares V8's answers with the recorded ones. It prints the patterns, tests and answers of
each file, and checks the counts in `manifest.json` and the marks of the deviations. With Node 24.11.0 it reports no
disagreements in 9,665,147 answers. With another Node, a disagreement is a place where its V8 differs. It checks
each file in a process of its own, because V8's answers for two of the hand-written patterns that it gets wrong
(`(?i:\Bs)` and `(?i:\bk\b)`) change in a process that has compiled a great many patterns.

The matcher of `reference.js` was also run once over the twelve files that it has no part in generating. It was
asked for 7.3 million of their answers, and gave V8's for all but those of ten records, which are the six marked
ones of `hand-written.jsonl` and the four marked `surrogate-pair-start`. It was not asked where it does not read
the syntax (552 times, counting a pattern once for each grammar it is valid in), and it gave up 66 times on a
pattern that took it too long.

## Regenerating it

```sh
node generate.js
```

This needs Node 24 or later (for the ECMAScript 2025 syntax) and rewrites `data/`, all but the files that the two
scripts below write, whose entries in `manifest.json` it keeps. The patterns and texts come from
fixed lists and generators with fixed seeds, in `generate.js` for the first three files and in `families.js`,
`more-families.js` and `unicode-sets.js` for the families. Each family has a seed of its own. A run with the same Node gives the same
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
checkout of a later commit takes in what test262 has added.

## Licence

MIT, except for the patterns and texts taken from test262, which are in `test262.jsonl` and
`test262-lone-surrogates.jsonl` and are under test262's licence (BSD). See [LICENSE](LICENSE) and
[NOTICE-test262.md](NOTICE-test262.md).
