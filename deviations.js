// Finds the records where V8's answers are known to differ from ECMA-262, or change from run to run, and marks them.
//
// generate.js calls mark() for the families that ask for it. A marked record has "v8_deviation": true and a
// "deviation" that names the class. There are four classes, and README.md has an example of each.
//
//   unstable              V8 does not always give the same answer. Each record is answered again in four ways: in
//                         processes that have compiled little, in a process that has compiled a great deal, with
//                         the optimising regular expression compiler switched off, and with the interpreter in
//                         place of the compiler. A record that any of them answers differently is unstable. It
//                         keeps its verdicts on validity and has no tests.
//   surrogate-pair-start  With the u flag V8 starts a match between the two halves of a surrogate pair, which
//                         ECMA-262 never does. Found by trying each start that ECMA-262 allows, one at a time,
//                         with the y flag.
//   modifier-group        A case-insensitive modifier group that V8 answers differently from ECMA-262. Found with
//                         the matcher of reference.js.
//   full-case-folding     With the i and u flags V8 compares a backreference with the text by full case folding of
//                         the whole string, where ECMA-262 compares character by character through Canonicalize.
//                         Found with the matcher of reference.js.
//   single-character-string-case
//                         With the i and v flags V8 does not canonicalize the text against a string of one
//                         character in \q{...}, where ECMA-262 makes such a string a character of the class.
//                         Found by unicode-sets.js, which writes the string as a character and asks V8 again.
//   ascii-case-folding    With the i and v flags V8 folds \p{ASCII} without the long s and the Kelvin sign, which
//                         fold to s and k, where it folds the same range written out with them. Found by
//                         unicode-sets.js, which writes the property as its range and asks V8 again.
//
// The records of the last three classes keep V8's answers, as the marked records of hand-written.jsonl do. A
// disagreement with reference.js that is none of these stops the run, so that nothing is marked without a reason.
//
// With DATASET_KEEP_UNSTABLE=1 an unstable record keeps its tests, with whatever V8 answered in that run: a data
// directory written so has the texts of the unstable records, from which data/spec/unstable.jsonl is made (README.md,
// "The specification's answers"). The data itself is never written so.
'use strict';

const { spawn } = require("child_process");
const v8 = require("v8");
const { reference } = require("./reference");

if (require.main === module && process.argv[2] === "--answers") {
  answerAgain(process.argv[3]);
}

// V8 compiles a regular expression differently once the process holds about 16 MB of compiled code, and a few
// patterns then get another answer. So one child process is made to hold three times that before it answers
// ("hot"), and others stop well short of it and leave the rest of the records to a new process ("cold").
const megabyte = 1 << 20;
const compiledCode = () => v8.getHeapSpaceStatistics()
  .reduce((n, space) => n + (space.space_name.includes("code") ? space.space_size : 0), 0);

// In a child process, which may have been started with one of V8's flags: the verdicts and answers of each record
// again, as text. A cold process answers only as many records as it can while it holds little compiled code.
function answerAgain(state) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { input += chunk; });
  process.stdin.on("end", () => {
    const out = [];
    // Patterns of no interest, each compiled for itself and kept, and run again now and then so that V8 does not
    // discard their code as unused.
    const kept = [];
    const run = (regex, k) => { regex.test("zz"); regex.test("a" + k); regex.test("\u03b8"); };
    // (A V8 that reports no such growth is given up on after a great many.)
    while (state === "hot" && (kept.length < 8000 || compiledCode() < 48 * megabyte) && kept.length < 200000) {
      const k = kept.length;
      const regex = new RegExp("^(?:a" + k + "|b[c-z]{2,5}x" + k + "(?=q|" + k + ")\\d+)+$", k % 2 ? "u" : "");
      run(regex, k);
      run(regex, k);
      kept.push(regex);
    }
    for (const [pattern, flags, texts, sets] of JSON.parse(input)) {
      if (state === "cold" && compiledCode() > 6 * megabyte) break;
      if (out.length % 256 === 255) kept.forEach(run);
      let u = null, l = null, v = null;
      try { u = new RegExp(pattern, flags + "u"); } catch (e) {}
      try { l = new RegExp(pattern, flags); } catch (e) {}
      if (sets) { try { v = new RegExp(pattern, flags + "v"); } catch (e) {} }
      let s = (u ? "U" : "-") + (l ? "L" : "-") + (sets ? (v ? "V" : "-") : "");
      for (const text of texts) {
        s += (u ? (u.test(text) ? "T" : "F") : "") + (l ? (l.test(text) ? "T" : "F") : "") + (v ? (v.test(text) ? "T" : "F") : "");
      }
      out.push(s);
    }
    process.stdout.write(JSON.stringify(out));
  });
}

function answersOf(r) {
  const sets = "unicode_sets" in r.valid;
  let s = (r.valid.unicode ? "U" : "-") + (r.valid.legacy ? "L" : "-") + (sets ? (r.valid.unicode_sets ? "V" : "-") : "");
  for (const t of r.tests || []) {
    s += (r.valid.unicode ? (t.unicode ? "T" : "F") : "") + (r.valid.legacy ? (t.legacy ? "T" : "F") : "")
      + (r.valid.unicode_sets ? (t.unicode_sets ? "T" : "F") : "");
  }
  return s;
}

function under(v8Flags, state, records) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...v8Flags, __filename, "--answers", state],
      { stdio: ["pipe", "pipe", "inherit"] });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`node ${v8Flags.join(" ")} (${state}) ended with ${code}`));
      else resolve(JSON.parse(output));
    });
    child.stdin.end(JSON.stringify(records.map((r) => [r.pattern, r.flags, (r.tests || []).map((t) => t.text), "unicode_sets" in r.valid])));
  });
}

// One process after another, each of which answers the records it can before it holds much compiled code.
async function cold(records) {
  const all = [];
  while (all.length < records.length) {
    const some = await under([], "cold", records.slice(all.length));
    if (some.length === 0) throw new Error("a process that has compiled nothing holds too much compiled code");
    all.push(...some);
  }
  return all;
}

const pair = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;
const caseModifier = /\(\?[ms]*i[ims]*(?:-[ims]*)?:|\(\?[ims]*-[ms]*i[ims]*:/;
const backreference = /\\[1-9]|\\k</;

// RegExp.prototype.test with the u flag as ECMA-262 has it: each start in turn, a code point at a time.
function fromEachStart(sticky, text) {
  for (let i = 0; ; i += text.codePointAt(i) > 0xFFFF ? 2 : 1) {
    sticky.lastIndex = i;
    if (sticky.test(text)) return true;
    if (i >= text.length) return false;
  }
}

// Marks the records in place and returns how many there are of each class.
async function mark(family, records) {
  const counts = {};
  const set = (r, deviation) => {
    counts[deviation] = (counts[deviation] || 0) + 1;
    const tests = r.tests;
    delete r.tests;
    r.v8_deviation = true;
    r.deviation = deviation;
    if (tests && (deviation !== "unstable" || process.env.DATASET_KEEP_UNSTABLE === "1")) r.tests = tests;
  };

  const again = await Promise.all([cold(records), under([], "hot", records),
    under(["--no-regexp-optimization"], "all", records), under(["--regexp-interpret-all"], "all", records)]);
  records.forEach((r, k) => {
    const mine = answersOf(r);
    if (again.some((answers) => answers[k] !== mine)) set(r, "unstable");
  });

  for (const [mode, flag] of [["unicode", "u"], ["unicode_sets", "v"]]) {
    for (const r of records) {
      if (r.v8_deviation || !r.valid[mode] || !r.tests) continue;
      let sticky = null;
      for (const t of r.tests) {
        if (!pair.test(t.text)) continue;
        sticky = sticky || new RegExp(r.pattern, r.flags + flag + "y");
        if (fromEachStart(sticky, t.text) === t[mode]) continue;
        if (!t[mode]) throw new Error(`no match of ${r.pattern} in ${JSON.stringify(t.text)}, and one from a start`);
        set(r, "surrogate-pair-start");
        break;
      }
    }
  }

  // A family may know a fault of V8's own and find the records it changes: check(record) names the class, or null.
  if (family.check) {
    for (const r of records) {
      if (r.v8_deviation || !r.tests) continue;
      const deviation = family.check(r);
      if (deviation) set(r, deviation);
    }
  }

  if (family.reference) {
    for (const r of records) {
      if (r.v8_deviation || !r.tests) continue;
      for (const [mode, unicode] of [["unicode", true], ["legacy", false]]) {
        if (!r.valid[mode] || r.v8_deviation) continue;
        const matcher = reference(r.pattern, r.flags, unicode);
        const differs = r.tests.find((t) => matcher.test(t.text) !== t[mode]);
        if (!differs) continue;
        if (caseModifier.test(r.pattern)) set(r, "modifier-group");
        else if (unicode && r.flags.includes("i") && backreference.test(r.pattern)) set(r, "full-case-folding");
        else {
          throw new Error(`${r.pattern} with ${r.flags || "no flags"} (${mode}) on ${JSON.stringify(differs.text)}: `
            + `V8 says ${differs[mode]}, and that is no known deviation`);
        }
      }
    }
  }
  return counts;
}

module.exports = { mark };
