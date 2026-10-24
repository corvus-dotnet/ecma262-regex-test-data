// The specification's answers where V8 departs from ECMA-262 (data/spec/answers.jsonl).
//
//   node spec-answers.js check [data directory, default ./data]
//
// The data's answers are V8's, and on the records marked "v8_deviation" V8 is known to be wrong. data/spec/answers.jsonl
// holds ECMA-262's answer for the tests of those records where it differs from V8's, one JSON line each, in the form
// of the overlays for other versions of Unicode (unicode.js):
//
//   {"file": "unicode-sets.jsonl", "line": 5194, "grammar": "unicode_sets", "test": 0, "answer": false,
//    "deviation": "single-character-string-case", "basis": "engines and engine262"}
//
// "line" counts the lines of the file from 1 and "test" the record's tests from 0; "answer" has the shape the file's
// answers have (a boolean, or captures.jsonl's object); "deviation" is the class of the record (or of the test, in
// captures.jsonl); "basis" says how the answer was established. README.md ("The specification's answers") says how.
//
// check: every line fits the data. Its file and line exist, the record (or, in captures.jsonl, the test) is marked
// "v8_deviation", the test exists, and the answer differs from the record's (a test V8 gave no answer for has none to
// differ from). The lines are in the order of the data, and manifest.json's spec_answers counts them. A file made for
// other data fails, so that it cannot go stale unnoticed when the data is regenerated. The exit code is 0 when every
// line fits.

const fs = require("fs");
const path = require("path");

const GRAMMARS = ["unicode", "legacy", "unicode_sets"];

function check(dir) {
  const file = path.join(dir, "spec", "answers.jsonl");
  const entries = fs.readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  const cache = new Map();
  const lines = (name) => {
    if (!cache.has(name)) cache.set(name, fs.readFileSync(path.join(dir, name), "utf8").split("\n"));
    return cache.get(name);
  };
  let bad = 0;
  let previous = null;
  entries.forEach((e, k) => {
    const where = `spec/answers.jsonl:${k + 1}`;
    const fail = (why) => { bad++; if (bad <= 20) console.error(`${where}: ${why}`); };
    const key = [e.file, e.line, e.test, GRAMMARS.indexOf(e.grammar)];
    if (previous && (key[0] < previous[0] || (key[0] === previous[0] && (key[1] < previous[1]
        || (key[1] === previous[1] && (key[2] < previous[2] || (key[2] === previous[2] && key[3] <= previous[3]))))))) {
      fail("out of the order of the data, or a repeat");
    }
    previous = key;
    if (!GRAMMARS.includes(e.grammar)) return fail(`"${e.grammar}" is not a grammar`);
    if (!e.deviation || !e.basis) return fail("no deviation or no basis");
    if (!fs.existsSync(path.join(dir, e.file))) return fail(`${e.file} is not a file of the data`);
    const text = lines(e.file)[e.line - 1];
    if (!text) return fail(`${e.file} has no line ${e.line}`);
    const r = JSON.parse(text);
    const t = (r.tests || [])[e.test];
    if (!t) return fail(`the record has no test ${e.test}`);
    if (!r.v8_deviation && !t.v8_deviation) return fail("neither the record nor the test is marked v8_deviation");
    if (!(e.grammar in r.valid) || !r.valid[e.grammar]) return fail(`the pattern is not valid under ${e.grammar}`);
    if (e.grammar in t && JSON.stringify(t[e.grammar]) === JSON.stringify(e.answer)) {
      fail(`test ${e.test} already answers ${JSON.stringify(e.answer)} under ${e.grammar}: V8 is not wrong there`);
    }
  });
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const listed = manifest.spec_answers || {};
  if (listed.answers !== entries.length) {
    bad++;
    console.error(`manifest.json: spec_answers.answers is ${listed.answers}, and the file has ${entries.length} lines`);
  }
  console.log(`spec/answers.jsonl: ${entries.length} answers`);
  if (bad) console.error(`${bad} lines do not fit the data`);
  return bad === 0;
}

const [command, ...rest] = process.argv.slice(2);
if (command === "check") {
  process.exit(check(rest[0] || "data") ? 0 : 1);
} else {
  console.error("node spec-answers.js check [data]");
  process.exit(2);
}
