// Writes captures.jsonl: what V8 says a pattern captures, and what the members built on captures give, for the
// patterns and texts of the other files.
//
//   node generate-captures.js [data directory, default ./data]
//
// The other files hold RegExp.prototype.test, which is all a JSON Schema implementation needs. A regular expression
// library needs the rest of RegExp: where the match is and what each group captured (exec), the sequence of
// matches of a global search (matchAll), the sticky flag, String.prototype.replace with every form of $ in the
// replacement, and String.prototype.split. This file holds V8's answers for those, over every pattern of
// hand-written.jsonl and flags.jsonl and one record in ten of each family, with up to 40 of the record's texts.
//
// A record has the shape of the other files' records, and each test holds, under "unicode" and under "legacy" (for
// each grammar the pattern is valid in), an object:
//
//   exec     null, or one [start, end] for the match then one [start, end] or null for each group, in UTF-16 code
//            units, as exec gives with lastIndex 0.
//   all      the exec results of a global search (the g flag, matchAll), at most 20 of them.
//   sticky   exec with the y flag and lastIndex 1 (null when the text is shorter than 1).
//   replace  text.replace(pattern, "<$&|$1|$2|$10|$<a>|$$|$`|$'>") with no g flag, and
//   replaceAll  the same with the g flag.
//   split    text.split(pattern): a group that did not take part is null.
//   split3   text.split(pattern, 3).
//
// The replacement names group 1, group 2, group 10 and a group "a", so a pattern with fewer groups or no such name
// shows what GetSubstitution does then. Records marked v8_deviation in their own file are left out. A test whose
// answers under the u flag have a match that starts between the halves of a surrogate pair is marked
// "v8_deviation": true with "deviation": "surrogate-pair-start" (see the README): its answers are V8's, and
// ECMA-262's differ. A test on which V8 in this process disagrees with the source file's answer is marked
// "unstable" and has no answers.
'use strict';

const fs = require("fs");
const path = require("path");

const dir = path.resolve(process.argv[2] || path.join(__dirname, "data"));
const REPLACEMENT = "<$&|$1|$2|$10|$<a>|$$|$`|$'>";
const MAX_TEXTS = 40;
const MAX_MATCHES = 20;

function line(value) {
  return JSON.stringify(value).replace(/[^\x00-\x7e]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
    + "\n";
}

function captures(m) {
  if (m === null) return null;
  const out = [[m.index, m.index + m[0].length]];
  if (m.indices) {
    for (let g = 1; g < m.length; g++) out.push(m.indices[g] === undefined ? null : [m.indices[g][0], m.indices[g][1]]);
  }
  return out;
}

// Whether a position of the text is between the halves of a surrogate pair. With the u flag ECMA-262 never starts a
// match there (it moves from one start to the next a code point at a time), and V8 13.6 sometimes does: the
// surrogate-pair-start deviation of the other files. A test whose answers have such a match is marked, and its
// answers are V8's, not the specification's.
function insidePair(text, at) {
  return at > 0 && at < text.length && text.charCodeAt(at) >= 0xdc00 && text.charCodeAt(at) <= 0xdfff
    && text.charCodeAt(at - 1) >= 0xd800 && text.charCodeAt(at - 1) <= 0xdbff;
}

function startsInsidePair(text, flags, a) {
  if (!flags.includes("u")) return false;
  const all = [a.exec, a.sticky, ...a.all].filter((m) => m !== null);
  return all.some((m) => insidePair(text, m[0][0]));
}

function answers(pattern, flags, text) {
  const re = new RegExp(pattern, flags + "d");
  const g = new RegExp(pattern, flags + "dg");
  const y = new RegExp(pattern, flags + "dy");
  const a = {};
  re.lastIndex = 0;
  a.exec = captures(re.exec(text));
  a.all = [];
  g.lastIndex = 0;
  for (const m of text.matchAll(g)) {
    a.all.push(captures(m));
    if (a.all.length >= MAX_MATCHES) break;
  }
  if (text.length >= 1) {
    y.lastIndex = 1;
    a.sticky = captures(y.exec(text));
  } else {
    a.sticky = null;
  }
  a.replace = text.replace(new RegExp(pattern, flags), REPLACEMENT);
  a.replaceAll = text.replace(new RegExp(pattern, flags + "g"), REPLACEMENT);
  a.split = text.split(new RegExp(pattern, flags)).map((s) => (s === undefined ? null : s));
  a.split3 = text.split(new RegExp(pattern, flags), 3).map((s) => (s === undefined ? null : s));
  return a;
}

module.exports = { answers, REPLACEMENT, MAX_TEXTS, MAX_MATCHES };
if (require.main !== module) return;

const files = fs.readdirSync(dir).filter((n) => n.endsWith(".jsonl") && n !== "captures.jsonl").sort();
const records = [];
let tests = 0, deviations = 0, unstableCount = 0;
for (const name of files) {
  const every = name === "hand-written.jsonl" || name === "flags.jsonl" ? 1 : 10;
  const lines = fs.readFileSync(path.join(dir, name), "utf8").split("\n").filter((l) => l.length > 0);
  let k = 0;
  for (const l of lines) {
    const r = JSON.parse(l);
    if (r.v8_deviation || !r.tests || (!r.valid.unicode && !r.valid.legacy)) continue;
    if (k++ % every !== 0) continue;
    const out = { pattern: r.pattern, flags: r.flags, source: "captures", from: name, valid: r.valid, tests: [] };
    const step = Math.max(1, Math.floor(r.tests.length / MAX_TEXTS));
    for (let i = 0; i < r.tests.length && out.tests.length < MAX_TEXTS; i += step) {
      const text = r.tests[i].text;
      const t = { text };
      // The source record's answer came from a worker that had compiled little. V8 compiles differently once a
      // process holds much compiled code, and answers a few patterns with a case-insensitive modifier group
      // differently then (the "unstable" class of the README). A test whose exec disagrees with its source's
      // test is marked unstable and keeps no answers.
      let unstable = false;
      for (const [mode, flags] of [["unicode", r.flags + "u"], ["legacy", r.flags]]) {
        if (!r.valid[mode]) continue;
        const a = answers(r.pattern, flags, text);
        if ((a.exec !== null) !== r.tests[i][mode]) unstable = true;
        t[mode] = a;
      }
      if (unstable) {
        delete t.unicode;
        delete t.legacy;
        t.v8_deviation = true;
        t.deviation = "unstable";
        unstableCount++;
      } else if (r.valid.unicode && startsInsidePair(text, r.flags + "u", t.unicode)) {
        t.v8_deviation = true;
        t.deviation = "surrogate-pair-start";
        deviations++;
      }
      out.tests.push(t);
      tests++;
    }
    records.push(out);
  }
}

fs.writeFileSync(path.join(dir, "captures.jsonl"), records.map(line).join(""));

// The manifest's entry for the file: the counts, and the Node that wrote it (the other files' Node is the
// manifest's own).
const manifestPath = path.join(dir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entry = { file: "captures.jsonl", patterns: records.length, tests, v8_deviations: { "surrogate-pair-start": deviations, unstable: unstableCount }, node: process.version, v8: process.versions.v8 };
const at = manifest.files.findIndex((f) => f.file === "captures.jsonl");
if (at < 0) manifest.files.push(entry); else manifest.files[at] = entry;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`captures.jsonl: ${records.length} patterns, ${tests} texts, ${deviations} marked surrogate-pair-start, ${unstableCount} unstable, node ${process.version}, v8 ${process.versions.v8}`);
