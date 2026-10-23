// A differential fuzzer for the searches an engine makes for where a match can start: the start-searches family of
// start-searches.js built with a seed and a size of its own, answered by this V8 within the same limits generate.js
// uses, and written as a data directory that any engine's runner reads as it reads data/.
//
//   node fuzz.js <out directory> [seed] [patterns]
//
// It writes <out>/start-searches.jsonl (test answers), <out>/captures.jsonl (where each match is, by
// generate-captures.js, which takes every record of this family) and <out>/manifest.json. With the seed of the data
// (0x57a27001) and 2000 patterns it writes the data's own family; any other seed is new patterns and texts. A runner
// that gives a wrong answer on it has found a fault, which a test then keeps.
'use strict';

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { startSearches } = require("./start-searches");
const { evaluate } = require("./timed");

const out = path.resolve(process.argv[2] || "fuzz-out");
const seed = process.argv[3] ? Number(process.argv[3]) : (Date.now() & 0x7fffffff) | 1;
const count = process.argv[4] ? Number(process.argv[4]) : 2000;
const limits = { backtracks: 250000, limitMs: 250, threads: 4 };

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const family = startSearches(seed, count);
  const { records, overBudget, overTime } = await evaluate(family.source, family.patterns, family.texts, limits,
    family.lists, family.unicodeSets);
  const line = (v) => JSON.stringify(v).replace(/[^\x00-\x7e]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
  fs.writeFileSync(path.join(out, "start-searches.jsonl"), records.map(line).join("\n") + "\n");
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ node: process.version, v8: process.versions.v8,
    fuzz: { seed, patterns: count, dropped_for_backtracks: overBudget.length, dropped_for_time: overTime.length },
    files: [] }, null, 2) + "\n");
  const captures = spawnSync(process.execPath, [path.join(__dirname, "generate-captures.js"), out], { stdio: "inherit" });
  if (captures.status !== 0) process.exit(captures.status ?? 1);
  console.log(`fuzz: seed ${seed}, ${records.length} patterns (${overBudget.length + overTime.length} dropped) -> ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
