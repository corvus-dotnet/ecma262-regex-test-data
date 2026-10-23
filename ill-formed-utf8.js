// Writes ill-formed-utf8.jsonl: texts of bytes that are not UTF-8, for an engine that takes UTF-8. JavaScript has no
// such text (a string is UTF-16 code units, any of them), so V8 has nothing to say about them, and the answer is the
// one the rule of the README gives: the engine refuses each with an error of its own, as invalid input, and neither
// matches it, nor reads part of it, nor crashes or hangs.
//
//   node ill-formed-utf8.js [data directory, default ./data]
//
// Each record is a pattern V8 finds valid, and its tests are the ill-formed sequences of Unicode's Table 3-7 (lone
// continuation bytes, bytes never used, overlong forms, encoded surrogates, values beyond U+10FFFF, the old five- and
// six-byte forms, and sequences cut short), each alone and in five places in a text: after a match, between two, after
// a character of two bytes, after 300 bytes that match, and before a match. A pattern that matches the first byte of
// a text (a, or the empty pattern) tells an engine that checks a text as far as it reads it from one that checks it
// all; \u{FFFD} tells one that reads an ill-formed sequence as U+FFFD; [\x80-\xFF] one that reads a byte as a Latin-1
// character. A test is its bytes in hexadecimal, and what the sequence is.
//
// The validity of each pattern is V8's, as in the other files, and a record has a test's answer under no grammar: an
// engine reads the file by the rule, and a runner that knows only the other files asks it nothing.
'use strict';

const fs = require("fs");
const path = require("path");

const dir = path.resolve(process.argv[2] || path.join(__dirname, "data"));

const PATTERNS = [
  ["a", ""],
  ["", ""],
  ["$", ""],
  ["^.*$", "s"],
  ["\\u{FFFD}", ""],
  ["[\\x80-\\xFF]", ""],
  ["\\p{Cs}", ""],
  ["(?<=a)[^]", "i"],
];

// The sequences, from Table 3-7 of the Unicode Standard (the well-formed UTF-8 byte sequences), each with what it is.
const SEQUENCES = [
  ["80", "a continuation byte (80)"],
  ["bf", "a continuation byte (BF)"],
  ["8080", "two continuation bytes"],
  ["c0", "a byte never used (C0)"],
  ["c1", "a byte never used (C1)"],
  ["f5", "a byte never used (F5)"],
  ["f8", "a byte never used (F8)"],
  ["fc", "a byte never used (FC)"],
  ["fe", "a byte never used (FE)"],
  ["ff", "a byte never used (FF)"],
  ["c080", "an overlong form of U+0000"],
  ["c1bf", "an overlong form of U+007F"],
  ["e08080", "an overlong form of U+0000 in three bytes"],
  ["e09fbf", "an overlong form of U+07FF"],
  ["f0808080", "an overlong form of U+0000 in four bytes"],
  ["f08fbfbf", "an overlong form of U+FFFF"],
  ["eda080", "U+D800 encoded (a high surrogate)"],
  ["edbfbf", "U+DFFF encoded (a low surrogate)"],
  ["eda0bdedb880", "a surrogate pair encoded as two surrogates (CESU-8)"],
  ["f4908080", "a value beyond U+10FFFF (U+110000)"],
  ["f7bfbfbf", "a value beyond U+10FFFF (U+1FFFFF)"],
  ["f888808080", "a five-byte form"],
  ["fc8480808080", "a six-byte form"],
  ["c3", "a two-byte sequence cut short"],
  ["e282", "a three-byte sequence cut short"],
  ["f09f98", "a four-byte sequence cut short"],
  ["c341", "a two-byte sequence cut short by a letter"],
  ["e28241", "a three-byte sequence cut short by a letter"],
  ["f09f9841", "a four-byte sequence cut short by a letter"],
  ["c3c3a9", "a lead byte followed by a lead byte"],
];

const PLACES = [
  ["", "", "the whole text"],
  ["61", "", "after a"],
  ["6162", "6364", "between ab and cd"],
  ["c3a9", "", "after é"],
  ["61".repeat(300), "", "after 300 a"],
  ["", "61", "before a"],
];

// Whether bytes are UTF-8.
function wellFormed(hex) {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(hex, "hex"));
    return true;
  } catch {
    return false;
  }
}

const compile = (pattern, flags) => { try { return new RegExp(pattern, flags); } catch { return null; } };

const tests = [];
for (const [hex, what] of SEQUENCES) {
  if (wellFormed(hex)) throw new Error(`${hex} (${what}) is UTF-8`);
  for (const [before, after, where] of PLACES) {
    const bytes = before + hex + after;
    if (wellFormed(bytes)) throw new Error(`${bytes} is UTF-8`);
    tests.push({ bytes, case: `${what}, ${where}` });
  }
}

const lines = [];
const count = { patterns: 0, valid_unicode: 0, valid_legacy_only: 0, not_valid: 0, tests: 0 };
for (const [pattern, flags] of PATTERNS) {
  const valid = { unicode: !!compile(pattern, flags + "u"), legacy: !!compile(pattern, flags) };
  if (!valid.unicode || !valid.legacy) throw new Error(`/${pattern}/${flags} is not valid in both grammars`);
  lines.push(JSON.stringify({ pattern, flags, source: "ill-formed-utf8", valid, tests }).replace(
    /[\u007f-￿]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")));
  count.patterns++;
  count.valid_unicode++;
  count.tests += tests.length;
}
fs.writeFileSync(path.join(dir, "ill-formed-utf8.jsonl"), lines.join("\n") + "\n");

// The manifest's entry for the file.
const manifestPath = path.join(dir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entry = { file: "ill-formed-utf8.jsonl", ...count };
const at = manifest.files.findIndex((f) => f.file === entry.file);
if (at < 0) manifest.files.push(entry); else manifest.files[at] = entry;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`ill-formed-utf8.jsonl: ${count.patterns} patterns, ${count.tests} tests`);
