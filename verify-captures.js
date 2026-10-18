// Checks captures.jsonl against V8, independently of its generator: every answer is computed again and compared,
// and the counts are compared with manifest.json.
//
//   node verify-captures.js [data directory, default ./data]
'use strict';

const fs = require("fs");
const path = require("path");
const { answers } = require("./generate-captures.js");

const dir = path.resolve(process.argv[2] || path.join(__dirname, "data"));
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const entry = manifest.files.find((f) => f.file === "captures.jsonl");
const text = fs.readFileSync(path.join(dir, "captures.jsonl"), "latin1");
let problems = 0;
const problem = (m) => { if (++problems <= 20) console.log("  " + m); };
if (/[^\x00-\x7f]/.test(text)) problem("not ASCII");
const lines = text.split("\n");
lines.pop();
let patterns = 0, tests = 0, compared = 0;
const marked = {};
for (const line of lines) {
  const r = JSON.parse(line);
  patterns++;
  for (const t of r.tests) {
    tests++;
    if (t.v8_deviation) {
      if (t.deviation !== "surrogate-pair-start" && t.deviation !== "unstable") problem(`${JSON.stringify(r.pattern)}: a mark of the wrong shape`);
      if (t.deviation === "unstable" && ("unicode" in t || "legacy" in t)) problem(`${JSON.stringify(r.pattern)}: unstable and has answers`);
      marked[t.deviation] = (marked[t.deviation] || 0) + 1;
      if (t.deviation === "unstable") continue;
    }
    for (const [mode, flags, valid] of [["unicode", r.flags + "u", r.valid.unicode], ["legacy", r.flags, r.valid.legacy]]) {
      if (mode in t !== valid) { problem(`${JSON.stringify(r.pattern)}: ${mode} answer`); continue; }
      if (!valid) continue;
      compared++;
      const now = JSON.stringify(answers(r.pattern, flags, t.text));
      if (now !== JSON.stringify(t[mode])) problem(`${JSON.stringify(r.pattern)} ${flags} on ${JSON.stringify(t.text)} differs`);
    }
  }
}
if (!entry) problem("not in manifest.json");
else {
  if (entry.patterns !== patterns) problem(`patterns is ${patterns}, and manifest.json says ${entry.patterns}`);
  if (entry.tests !== tests) problem(`tests is ${tests}, and manifest.json says ${entry.tests}`);
  const sorted = (o) => JSON.stringify(Object.entries(o).sort());
  if (!entry.v8_deviations || sorted(entry.v8_deviations) !== sorted({ "surrogate-pair-start": 0, unstable: 0, ...marked })) problem(`the marks are ${JSON.stringify(marked)}, and manifest.json says ${JSON.stringify(entry.v8_deviations)}`);
  if (entry.node !== process.version) console.log(`captures.jsonl was written with Node ${entry.node} and this is ${process.version}.`);
}
console.log(`captures.jsonl: ${patterns} patterns, ${tests} tests, ${compared} answers compared, ${problems} problems`);
process.exit(problems > 0 ? 1 : 0);
