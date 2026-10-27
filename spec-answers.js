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
// data/spec/unstable.jsonl holds the records V8 answers differently from one run to the next (the "unstable" class),
// which the data keeps without tests: each line a record's place, its pattern and flags, its texts with ECMA-262's
// answer under each grammar the pattern is valid in, and the basis of the answers of each grammar; and, for the test
// of captures.jsonl marked unstable, its place, its text and its answers.
//
// check: every line fits the data. Its file and line exist, the record (or, in captures.jsonl, the test) is marked
// "v8_deviation", the test exists, and the answer differs from the record's (a test V8 gave no answer for has none to
// differ from). The lines are in the order of the data, and manifest.json's spec_answers counts them. A file made for
// other data fails, so that it cannot go stale unnoticed when the data is regenerated. The exit code is 0 when every
// line fits. Each line of unstable.jsonl names a record (or, in captures.jsonl, a test) that the data marks
// "unstable" and keeps without answers, with the same pattern and flags, and gives an answer under each grammar the
// pattern is valid in, with a basis for each; manifest.json's spec_unstable counts its records, texts and answers.

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
  return checkUnstable(dir, lines, manifest) && bad === 0;
}

function checkUnstable(dir, lines, manifest) {
  const file = path.join(dir, "spec", "unstable.jsonl");
  if (!fs.existsSync(file)) return !manifest.spec_unstable;
  const entries = fs.readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
  let bad = 0, records = 0, captureTests = 0, texts = 0, answers = 0;
  entries.forEach((e, k) => {
    const where = `spec/unstable.jsonl:${k + 1}`;
    const fail = (why) => { bad++; if (bad <= 20) console.error(`${where}: ${why}`); };
    if (e.deviation !== "unstable" || !e.basis || typeof e.basis !== "object") return fail("no deviation or no basis");
    if (!fs.existsSync(path.join(dir, e.file))) return fail(`${e.file} is not a file of the data`);
    const text = lines(e.file)[e.line - 1];
    if (!text) return fail(`${e.file} has no line ${e.line}`);
    const r = JSON.parse(text);
    if (r.pattern !== e.pattern || r.flags !== e.flags) return fail("not the record's pattern and flags");
    const grammars = GRAMMARS.filter((g) => r.valid[g]);
    const based = (g) => typeof e.basis[g] === "string" && e.basis[g] !== "";
    if ("test" in e) {
      const t = (r.tests || [])[e.test];
      if (!t || t.deviation !== "unstable" || t.text !== e.text) return fail(`test ${e.test} is not marked unstable with this text`);
      if (GRAMMARS.some((g) => g in t)) return fail(`test ${e.test} has answers of V8's`);
      for (const g of grammars) {
        if (!e[g] || typeof e[g] !== "object" || !based(g)) fail(`no answer or no basis under ${g}`);
        else answers += e.text === "" ? 6 : 7;
      }
      captureTests++;
      texts++;
      return;
    }
    if (r.deviation !== "unstable" || r.tests) return fail("the record is not marked unstable, or has tests");
    for (const g of grammars) if (!based(g)) fail(`no basis under ${g}`);
    for (const t of e.tests || []) {
      if (typeof t.text !== "string") fail("a test with no text");
      for (const g of grammars) {
        if (typeof t[g] !== "boolean") fail(`a test with no answer under ${g}: ${JSON.stringify(t.text)}`);
        else answers++;
      }
    }
    records++;
    texts += (e.tests || []).length;
  });
  const listed = manifest.spec_unstable || {};
  for (const [key, n] of [["records", records], ["capture_tests", captureTests], ["texts", texts], ["answers", answers]]) {
    if (listed[key] !== n) {
      bad++;
      console.error(`manifest.json: spec_unstable.${key} is ${listed[key]}, and the file has ${n}`);
    }
  }
  console.log(`spec/unstable.jsonl: ${records} records and ${captureTests} test of captures.jsonl, ${texts} texts, ${answers} answers`);
  if (bad) console.error(`${bad} lines of spec/unstable.jsonl do not fit the data`);
  return bad === 0;
}


const [command, ...rest] = process.argv.slice(2);
if (command === "check") {
  process.exit(check(rest[0] || "data") ? 0 : 1);
} else {
  console.error("node spec-answers.js check [data]");
  process.exit(2);
}
