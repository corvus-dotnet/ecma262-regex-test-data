# ECMA-262 regular expression test data

What the V8 JavaScript engine says about 61,383 regular expression patterns: which ones are valid, and for 3,588 of
them, whether they match each of a set of texts: 540,449 texts in all, each with its answers, as plain JSON Lines.

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
| `manifest.json` | | | The versions of Node, V8 and Unicode the data was generated with, and the counts of each file. |

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
| `source` | `hand-written`, `flags` or `generated`: the file's kind. |
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

## Regenerating it

```sh
node generate.js
```

This needs Node 24 or later (for the ECMAScript 2025 syntax) and rewrites `data/`. The patterns and texts come from
fixed lists and a generator with a fixed seed in `generate.js`, so a run with the same Node gives the same files, and
a run with a newer one shows what changed in V8.

## Licence

MIT. See [LICENSE](LICENSE).
