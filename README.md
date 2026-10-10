# ECMA-262 regular expression test data

What the V8 JavaScript engine says about 79,221 regular expression patterns. It says which ones are valid, and for
21,326 of them, whether they match each of a set of texts. There are 2,066,549 texts in all, each with its answers,
as plain JSON Lines.

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
| `v8_deviation` | Present and true on six records where V8's answers are known to differ from the specification. See below. |

The two modes can give different answers for one text. Without the `u` flag V8 matches UTF-16 code units, so a
character beyond the Basic Multilingual Plane is two units to `.`, a class or a quantifier. With it, V8 matches code
points.

## The families

The first three files test a regular expression engine broadly. The four families are narrower. Each was built
around a class of fault that the first three did not reach, found by testing JSON Schema implementations against V8.
A family starts from the patterns that found the fault, which are written by hand in `families.js`, and a small
grammar builds the rest around them. All their records have empty `flags`.

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

### The sizes

Each family is sized to keep its file near the size of the first three, and a family with more texts has fewer
patterns. `word-boundaries.jsonl` needs all 259 short texts for every pattern, so it has 2,000 patterns and is the
largest file at 26 MB. The others are 15 to 16 MB.

### What was left out

A pattern is left out, and has no record, when V8 cannot answer it cheaply for every one of its texts. There are two
limits, and `manifest.json` records both and how many patterns each one dropped.

- **A budget of 250,000 backtracks for the search of one text.** V8 can count its backtracks, and the count is the
  same on every machine. This is the limit that decides. It dropped 162 of the 7,000 candidates for
  `empty-loops.jsonl`, and none from the other families.
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

## What to know before relying on it

- **It records one implementation.** The answers are V8's (13.6, in Node 24.11.0), not the specification's. For the
  great majority of patterns they are the same thing.
- **Six known deviations.** V8 13.6 answers six patterns with a case-insensitive modifier group, such as
  `^(?i:\u212a)$`, differently from the same pattern with the `i` flag, which ECMA-262 does not allow. Those records
  have `"v8_deviation": true`. `flags.jsonl` covers the same behaviour through the flags, where V8 is right.
- **Unicode 16.** V8 13.6 has the Unicode 16.0 character database. An engine with a later version will differ on
  characters assigned since, in `\p{...}` and in case folding.
- **No `v` flag.** Set notation and properties of strings are not covered.
- **Whole-text answers only.** A test says whether the pattern matches anywhere in the text. It does not record
  where, or what the groups captured.

## Checking it

```sh
node verify.js
```

`verify.js` does not use the generator. It reads every record of every file, compiles the pattern again, matches
every text again, and compares V8's answers with the recorded ones. It prints the patterns, tests and answers of
each file, and checks the counts in `manifest.json`. With Node 24.11.0 it reports no disagreements in 3,958,989
answers. With another Node, a disagreement is a place where its V8 differs. It checks each file in a process of its
own, because V8's answers for two of the hand-written patterns that it gets wrong (`(?i:\Bs)` and `(?i:\bk\b)`)
change in a process that has compiled a great many patterns.

## Regenerating it

```sh
node generate.js
```

This needs Node 24 or later (for the ECMAScript 2025 syntax) and rewrites `data/`. The patterns and texts come from
fixed lists and generators with fixed seeds, in `generate.js` for the first three files and in `families.js` for the
families. Each family has a seed of its own. A run with the same Node gives the same files, and a run with a newer
one shows what changed in V8. `timed.js` asks V8 about the families within the two limits. It uses four worker
threads.

## Licence

MIT. See [LICENSE](LICENSE).
