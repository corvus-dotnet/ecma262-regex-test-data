// Checks data/exec/test262.jsonl against V8, independently of its generator: every exec call is made again, its answer
// computed again in the file's form and compared, the marks of the deviations checked, and the counts compared with
// manifest.json.
//
//   node verify-test262-exec.js [data directory, default ./data]
'use strict';

const fs = require("fs");
const path = require("path");

const dir = path.resolve(process.argv[2] || path.join(__dirname, "data"));
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const entry = (manifest.exec || []).find((f) => f.file === "exec/test262.jsonl");
const text = fs.readFileSync(path.join(dir, "exec", "test262.jsonl"), "latin1");
let problems = 0;
const problem = (m) => { if (++problems <= 20) console.log("  " + m); };
if (/[^\x00-\x7f]/.test(text)) problem("not ASCII");

const span = (x) => x === undefined ? null : [x[0], x[1]];
const inside = (s, at) => at > 0 && at < s.length && s.charCodeAt(at) >= 0xdc00 && s.charCodeAt(at) <= 0xdfff
  && s.charCodeAt(at - 1) >= 0xd800 && s.charCodeAt(at - 1) <= 0xdbff;

// exec as the file asks it: the flags of the record with d, lastIndex as recorded.
function answer(pattern, flags, s, lastIndex) {
  const carries = flags.includes("g") || flags.includes("y");
  const re = new RegExp(pattern, flags.includes("d") ? flags : flags + "d");
  re.lastIndex = lastIndex;
  const m = re.exec(s);
  if (m === null) return null;
  const a = { captures: Array.from(m.indices, span) };
  if (m.indices.groups) {
    // By definition, not assignment: a group may be called __proto__ (named-groups/groups-properties.js).
    a.groups = Object.fromEntries(Object.keys(m.indices.groups).map((name) => [name, span(m.indices.groups[name])]));
  }
  if (carries) a.lastIndex = re.lastIndex;
  return a;
}

const lines = text.split("\n");
lines.pop();
let patterns = 0, tests = 0;
const marked = {};
for (const line of lines) {
  const r = JSON.parse(line);
  patterns++;
  if (!Array.isArray(r.test262) || r.test262.length === 0) problem(`${JSON.stringify(r.pattern)}: no test262 files`);
  const carries = r.flags.includes("g") || r.flags.includes("y");
  for (const t of r.tests) {
    tests++;
    if (!carries && t.lastIndex !== 0) problem(`${JSON.stringify(r.pattern)}: lastIndex ${t.lastIndex} without g or y`);
    const now = answer(r.pattern, r.flags, t.text, t.lastIndex);
    if (JSON.stringify(now) !== JSON.stringify(t.answer)) {
      problem(`/${r.pattern}/${r.flags} on ${JSON.stringify(t.text)} at ${t.lastIndex}: ${JSON.stringify(now)}, recorded ${JSON.stringify(t.answer)}`);
    }
    const starts = (r.flags.includes("u") || r.flags.includes("v")) && t.answer && inside(t.text, t.answer.captures[0][0]);
    if (!!t.v8_deviation !== !!starts || (t.v8_deviation && t.deviation !== "surrogate-pair-start")) {
      problem(`/${r.pattern}/${r.flags} on ${JSON.stringify(t.text)}: the mark of a match inside a surrogate pair`);
    }
    if (t.deviation) marked[t.deviation] = (marked[t.deviation] || 0) + 1;
  }
}
if (!entry) problem("not in manifest.json");
else {
  if (entry.patterns !== patterns) problem(`manifest.json: ${entry.patterns} patterns, the file ${patterns}`);
  if (entry.tests !== tests) problem(`manifest.json: ${entry.tests} tests, the file ${tests}`);
  if (JSON.stringify(entry.v8_deviations || {}) !== JSON.stringify(marked)) problem("manifest.json: the deviations differ");
}
console.log(`exec/test262.jsonl: ${patterns} patterns, ${tests} calls made again, ${problems} problems`);
process.exit(problems > 0 ? 1 : 0);
