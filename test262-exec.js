// Writes data/exec/test262.jsonl: every call of RegExp.prototype.exec that test262's regular expression tests make, with
// V8's result in full.
//
//   node test262-exec.js <test262 checkout> [output directory, default ./data]
//
// test262.js takes from test262 its patterns and texts, and asks of each whether the pattern matches anywhere in the
// text. A test asks more than that: where the match is, what each group captured, what lastIndex is before and after,
// with the g, y and d flags. Every built-in method that matches (test, match, matchAll, replace, search, split) does so
// through exec, so each exec call is a question this file keeps whole, with V8's answer:
//
//   {"pattern": "a(?<x>b)?", "flags": "gu", "test262": ["test/built-ins/..."],
//    "tests": [{"text": "xab", "lastIndex": 0, "answer": {"captures": [[1, 3], [2, 3]], "groups": {"x": [2, 3]},
//               "lastIndex": 3}}]}
//
// "flags" are the flags the test built the RegExp with. "lastIndex" is the value exec reads: 0 without g or y, where
// exec reads none. "answer" is null when exec gives null, and otherwise the positions in UTF-16 code units of the
// match and of each group ("captures", null for a group that took no part), of each named group ("groups"), and,
// with g or y, the lastIndex exec leaves. With g or y a null answer leaves lastIndex 0.
//
// A call is kept when the test passes under V8: test262's assertions then hold of what V8 answered. It is a call on a
// RegExp whose prototype is RegExp.prototype itself (not a subclass) with a lastIndex that is a non-negative integer,
// and not on one of the texts of more than a million characters that the generated property escape tests build (whose
// characters test262.js keeps by the ends of their ranges). Negative tests and modules are not run. A call that a
// test makes twice is kept once.
//
// A test whose answer under the u or v flag has a match that starts between the halves of a surrogate pair is marked
// "v8_deviation": true with "deviation": "surrogate-pair-start", as in captures.jsonl: ECMA-262 never starts a match
// there. It writes the file's entry in manifest.json (under "exec") and NOTICE-test262.md beside this script.
'use strict';

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { directories, walk, frontMatter, runner, writeNotice } = require("./test262-run");

const root = process.argv[2] && path.resolve(process.argv[2]);
if (!root || !fs.existsSync(path.join(root, "harness", "assert.js"))) {
  console.error("usage: node test262-exec.js <test262 checkout> [output directory]");
  process.exit(2);
}
const out = path.resolve(process.argv[3] || path.join(__dirname, "data"));
const commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
// Without the watching of construction, which only test262.js needs: the tests of the constructor's identity then pass.
const run = runner(root, { construction: false });

// One JSON value to a line, in ASCII, as generate.js writes them.
function line(value) {
  return JSON.stringify(value).replace(/[^\x00-\x7e]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
    + "\n";
}

// Whether a position of the text is between the halves of a surrogate pair (as in generate-captures.js).
function insidePair(text, at) {
  return at > 0 && at < text.length && text.charCodeAt(at) >= 0xdc00 && text.charCodeAt(at) <= 0xdfff
    && text.charCodeAt(at - 1) >= 0xd800 && text.charCodeAt(at - 1) <= 0xdbff;
}

const files = directories.flatMap((d) => fs.existsSync(path.join(root, d)) ? walk(path.join(root, d), []) : []);
const records = new Map();   // flags + "/" + pattern -> record
let read = 0, passed = 0, calls = 0;
for (const full of files) {
  const file = path.relative(root, full).split(path.sep).join("/");
  const source = fs.readFileSync(full, "utf8");
  const meta = frontMatter(source);
  if (meta.flags.includes("module") || meta.negative) continue;
  read++;
  const log = run(file, source, meta);
  if (!log.passed) continue;
  passed++;
  for (const c of log.calls) {
    calls++;
    const key = c.f + "/" + c.p;
    let r = records.get(key);
    if (!r) records.set(key, r = { pattern: c.p, flags: c.f, files: new Set(), tests: [], seen: new Map() });
    r.files.add(file);
    const at = c.lastIndex + "/" + c.t;
    const answer = JSON.stringify(c.answer);
    if (r.seen.has(at)) {
      if (r.seen.get(at) !== answer) throw new Error(`V8 gives two answers for /${c.p}/${c.f} on ${JSON.stringify(c.t)}`);
      continue;
    }
    r.seen.set(at, answer);
    const test = { text: c.t, lastIndex: c.lastIndex, answer: c.answer };
    if ((c.f.includes("u") || c.f.includes("v")) && c.answer && insidePair(c.t, c.answer.captures[0][0])) {
      test.v8_deviation = true;
      test.deviation = "surrogate-pair-start";
    }
    r.tests.push(test);
  }
}

const list = [...records.values()].map((r) => ({ pattern: r.pattern, flags: r.flags, test262: [...r.files].sort(), tests: r.tests }));
// In a directory of its own: a runner reads the .jsonl files of the data directory as files of records, and takes
// this file up when it can judge exec calls.
fs.mkdirSync(path.join(out, "exec"), { recursive: true });
fs.writeFileSync(path.join(out, "exec", "test262.jsonl"), list.map(line).join(""));

const deviations = {};
for (const r of list) for (const t of r.tests) if (t.deviation) deviations[t.deviation] = (deviations[t.deviation] || 0) + 1;
const entry = {
  file: "exec/test262.jsonl",
  patterns: list.length,
  tests: list.reduce((n, r) => n + r.tests.length, 0),
  v8_deviations: deviations,
  test262: { repository: "https://github.com/tc39/test262", commit, files_read: read, files_passed: passed, calls },
};
const manifestPath = path.join(out, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
// Its entry is under "exec", not "files": verify.js reads the files of "files" as files of records.
manifest.exec = [...(manifest.exec || []).filter((f) => f.file !== entry.file), entry];
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
writeNotice(root, commit, out, path.join(__dirname, "NOTICE-test262.md"));
console.log(`exec/test262.jsonl: ${entry.patterns} patterns, ${entry.tests} tests from ${calls} calls of ${passed} of ${read} tests, deviations ${JSON.stringify(deviations)}`);
