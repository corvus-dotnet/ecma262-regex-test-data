// Writes test262.jsonl and test262-lone-surrogates.jsonl: the patterns and texts of test262, the conformance suite
// of ECMA-262 (https://github.com/tc39/test262), with V8's answers.
//
//   node test262.js <test262 checkout> [output directory, default ./data]
//
// It needs a Node whose V8 has test262's Unicode, 17 (Node 24.22.0 has it; the rest of the data was written with
// 24.11.0, whose Unicode is 16, and gives the same answers under 24.22.0 but on its unstable records), and a checkout of
// test262 at the commit manifest.json names for these files (or another, to take in a later test262). It writes NOTICE-test262.md beside
// this script, with test262's licence and the copyright lines of every test file a record was taken from.
//
// test262 is the source of the patterns and the texts, not of the answers. Each test of its regular expression
// directories is run in a context of its own with RegExp.prototype.exec and the RegExp constructor watched, and every
// pattern it builds, every pattern a negative syntax test holds, and every text it matches a pattern against is kept.
// Then each pattern is answered as the families are (timed.js): compiled with the u flag, with the v flag and with
// neither, within the same limits, and each of its texts matched in each mode that is valid.
//
// Two kinds of test give a text that is the whole of a set of code points, more than a million characters. Those
// of property-escapes/generated assert that /^\p{...}+$/u matches every character of a property, and those of
// CharacterClassEscapes that \d, \s, \w and their complements match, or do not match, every character of a set.
// The sets are written as ranges (buildString in harness/regExpUtils.js), and a record takes from each set the first
// and the last code point of each range and each code point listed alone, as a text of its own.
//
// Where test262's harness states the answer, as the property escape and extended class helpers do, it is compared
// with V8's. The property escape helper asserts that /^\p{...}+$/u matches the whole of a set, so each character of
// it, and the file's other set is the complement. The helper of properties of strings and of the v flag's classes
// asserts that the strings a class has, joined, match, and that the strings it has not, joined, do not. Each string
// the class has is kept, and matches alone, and so is the join of those it has not; a string it has not is a text
// with no answer of test262's, since it may match as several of the class's strings. Any difference stops the run,
// and so does a pattern that a test shows V8 accepting, or a negative syntax test shows it refusing, where V8 answers
// otherwise now. test262 has Unicode 17, so the Node must have it too (Node 24.22.0 has, with V8 13.6.233.17; Node
// 24.11.0 had Unicode 16, and V8 then differed from test262 on 7,216 answers).
//
// The records are then searched for the deviations of the later families (deviations.js), and the matcher of
// reference.js is run beside V8 on each record whose syntax it reads.
'use strict';

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");
const { evaluate, withBudget } = require("./timed");
const { mark } = require("./deviations");
const { reference, Unsupported, OverBudget } = require("./reference");

const root = process.argv[2] && path.resolve(process.argv[2]);
if (!root || !fs.existsSync(path.join(root, "harness", "assert.js"))) {
  console.error("usage: node test262.js <test262 checkout> [output directory]");
  process.exit(2);
}
const out = path.resolve(process.argv[3] || path.join(__dirname, "data"));
const commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

// The directories of test262 that are about regular expressions.
const directories = [
  "test/built-ins/RegExp", "test/annexB/built-ins/RegExp", "test/language/literals/regexp",
  "test/built-ins/String/prototype/match", "test/built-ins/String/prototype/matchAll",
  "test/built-ins/String/prototype/replace", "test/built-ins/String/prototype/replaceAll",
  "test/built-ins/String/prototype/search", "test/built-ins/String/prototype/split",
];

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, files);
    else if (entry.name.endsWith(".js") && !entry.name.includes("_FIXTURE")) files.push(p);
  }
  return files;
}

// The front matter of a test: its includes, its flags and whether it is a negative test.
function frontMatter(source) {
  const m = /\/\*---([\s\S]*?)---\*\//.exec(source);
  const yaml = m ? m[1] : "";
  const list = (key) => {
    const inline = new RegExp("^" + key + ":\\s*\\[([^\\]]*)\\]", "m").exec(yaml);
    if (inline) return inline[1].split(",").map((s) => s.trim()).filter(Boolean);
    const block = new RegExp("^" + key + ":\\s*\\n((?:\\s+-.*\\n?)+)", "m").exec(yaml);
    return block ? block[1].split("\n").map((s) => s.replace(/^\s*-\s*/, "").trim()).filter(Boolean) : [];
  };
  const negative = /^negative:\s*\n\s+phase:\s*(\w+)\s*\n\s+type:\s*(\w+)/m.exec(yaml);
  return { includes: list("includes"), flags: list("flags"), negative: negative ? { phase: negative[1], type: negative[2] } : null };
}

const harnessFiles = {};
function harness(name) {
  if (!(name in harnessFiles)) {
    let text = fs.readFileSync(path.join(root, "harness", name), "utf8");
    // An alias declared const could not be pointed at the watcher below.
    if (name === "regExpUtils.js") {
      text = text.replace("const testExtendedCharacterClass = testPropertyOfStrings;",
        "function testExtendedCharacterClass(args) { return testPropertyOfStrings(args); }");
    }
    harnessFiles[name] = text;
  }
  return harnessFiles[name];
}

// Run first in each context. It watches RegExp.prototype.exec, through which test, match, replace, search and split
// all go, and the RegExp constructor, and returns the log. It reads the source and the flags of a regular expression
// through the getters of RegExp.prototype, which read its internal slots, so a test that redefines them sees
// nothing it did not do itself. Only a string text is logged, so that no ToString runs twice.
const watch = `
(function () {
  const g = globalThis, R = g.RegExp, P = R.prototype, exec = P.exec, log = [];
  const get = (n) => Object.getOwnPropertyDescriptor(P, n).get;
  const source = get("source"), flagGetters = {};
  for (const [n, c] of [["hasIndices", "d"], ["global", "g"], ["ignoreCase", "i"], ["multiline", "m"],
    ["dotAll", "s"], ["unicode", "u"], ["unicodeSets", "v"], ["sticky", "y"]]) flagGetters[c] = get(n);
  const built = new Map(), original = new WeakMap();
  const flagsOf = (re) => Object.keys(flagGetters).filter((c) => flagGetters[c].call(re)).join("");
  const isRegExp = (re) => { try { source.call(re); return true; } catch (e) { return false; } };
  const patternOf = (re) => original.has(re) ? original.get(re) : source.call(re);
  P.exec = function exec(s) {
    if (isRegExp(this) && typeof s === "string") {
      const set = built.get(s);
      log.push(set ? { k: "exec", p: patternOf(this), f: flagsOf(this), set } : { k: "exec", p: patternOf(this), f: flagsOf(this), t: s });
    }
    return exec.call(this, s);
  };
  Object.defineProperty(P.exec, "name", { value: "exec" });
  Object.defineProperty(P.exec, "length", { value: 1 });
  const logged = (p, f, make) => {
    const keep = typeof p === "string" && (f === undefined || typeof f === "string");
    try {
      const re = make();
      if (keep && isRegExp(re)) { original.set(re, p); log.push({ k: "new", p, f: f === undefined ? "" : f, ok: true }); }
      return re;
    } catch (e) {
      if (keep) log.push({ k: "new", p, f: f === undefined ? "" : f, ok: false });
      throw e;
    }
  };
  g.RegExp = new Proxy(R, {
    construct: (t, args, nt) => logged(args[0], args[1], () => Reflect.construct(t, args, nt)),
    apply: (t, self, args) => logged(args[0], args[1], () => Reflect.apply(t, self, args)),
  });
  // Called once the harness is loaded: buildString is watched, and the helpers of the generated tests log what
  // they would assert instead of asserting it.
  g.__watchHarness = function () {
    if (typeof g.buildString === "function") {
      const build = g.buildString;
      g.buildString = function buildString(args) {
        const s = build(args);
        const set = { loneCodePoints: Array.from(args.loneCodePoints), ranges: Array.from(args.ranges, (r) => [r[0], r[1]]) };
        built.set(s, set);
        log.push({ k: "set", set });
        return s;
      };
      // The generated property escape tests have their regular expressions given as { __pattern, __flags } (see
      // run), so that a property V8 does not know does not stop the whole file.
      g.testPropertyEscapes = function testPropertyEscapes(re, s) {
        const p = "__pattern" in re ? re.__pattern : patternOf(re), f = "__pattern" in re ? re.__flags : flagsOf(re);
        log.push({ k: "property", p, f, set: built.get(s) });
      };
      g.testPropertyOfStrings = function testPropertyOfStrings(args) {
        log.push({ k: "strings", p: patternOf(args.regExp), f: flagsOf(args.regExp),
          match: Array.from(args.matchStrings || []), nonMatch: Array.from(args.nonMatchStrings || []) });
      };
    }
  };
  return log;
})();
`;

function run(file, source, meta) {
  // A literal with a property that V8 does not know is an early error, and none of the file would run.
  if (file.includes("/property-escapes/generated/")) {
    source = source.replace(/testPropertyEscapes\(\s*\/((?:\\.|[^\/\\\n])+)\/([a-z]*)\s*,/g,
      (m, p, f) => `testPropertyEscapes({ __pattern: ${JSON.stringify(p)}, __flags: ${JSON.stringify(f)} },`);
  }
  const strict = meta.flags.includes("onlyStrict") ? '"use strict";\n' : "";
  const context = vm.createContext({ print() {} });
  const log = vm.runInContext(watch, context);
  try {
    if (!meta.flags.includes("raw")) {
      let code = harness("assert.js") + "\n" + harness("sta.js") + "\n";
      if (meta.flags.includes("async")) code += harness("doneprintHandle.js") + "\n";
      for (const name of meta.includes) code += harness(name) + "\n";
      vm.runInContext(strict + code, context);
      vm.runInContext("__watchHarness()", context);
    }
    vm.runInContext(strict + source, context, { filename: file, timeout: 60000 });
  } catch (e) {
    // A test that fails, or a negative test, still leaves its log. Whether V8 passes test262 is not this data's
    // question: the answers are checked below.
  }
  // The log lives in the test's context, whose Array.prototype the test may have changed.
  const entries = [];
  for (let i = 0; i < log.length; i++) entries.push(JSON.parse(JSON.stringify(log[i])));
  return entries;
}

// The pattern of a negative syntax test: the regular expression literal after $DONOTEVALUATE(). A line terminator
// ends a literal before its closing slash, which is an error of the grammar of literals and not of patterns.
function negativeLiteral(source) {
  const body = source.replace(/\/\*---[\s\S]*?---\*\//, "").split(/\$DONOTEVALUATE\(\);?/)[1];
  if (body === undefined) return null;
  const text = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/mg, "").trim();
  const m = /^\/((?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^\/\\\n\[])+)\/([a-zA-Z]*)\s*;?$/s.exec(text);
  if (!m || /[\n\r\u2028\u2029]/.test(m[1])) return null;
  return { p: m[1], f: m[2] };
}

const knownFlags = /^[dgimsuvy]*$/;
const flagsValid = (f) => knownFlags.test(f) && new Set(f).size === f.length && !(f.includes("u") && f.includes("v"));
const modeOf = (f) => f.includes("v") ? "unicode_sets" : f.includes("u") ? "unicode" : "legacy";
const ims = (f) => [..."ims"].filter((c) => f.includes(c)).join("");

// The texts a set of code points gives: each code point listed alone, and the two ends of each range.
function edges(set) {
  const points = [...set.loneCodePoints];
  for (const [first, last] of set.ranges) points.push(first, last);
  return [...new Set(points)].map((cp) => String.fromCodePoint(cp));
}
const inSet = (set, cp) => set.loneCodePoints.includes(cp) || set.ranges.some(([a, b]) => a <= cp && cp <= b);
// Whether the sets of one file are each other's complements: then a character of one is not in the other.
function complementary(sets) {
  const ranges = sets.flatMap((s) => [...s.loneCodePoints.map((cp) => [cp, cp]), ...s.ranges]).sort((a, b) => a[0] - b[0]);
  let next = 0;
  for (const [a, b] of ranges) {
    if (a !== next) return false;
    next = b + 1;
  }
  return next === 0x110000;
}

function harvest() {
  const files = directories.flatMap((d) => fs.existsSync(path.join(root, d)) ? walk(path.join(root, d), []) : []);
  const candidates = new Map();   // flags + "/" + pattern -> candidate
  const claims = [];              // what a test shows of validity, checked against V8 later
  const used = new Set();
  const candidate = (p, f, file) => {
    const flags = ims(f), key = flags + "/" + p;
    let c = candidates.get(key);
    if (!c) {
      c = { pattern: p, flags, files: new Set(), texts: [], seen: new Set(), answers: new Map() };
      candidates.set(key, c);
    }
    c.files.add(file);
    used.add(file);
    return c;
  };
  const addText = (c, text) => {
    if (!c.seen.has(text)) { c.seen.add(text); c.texts.push(text); }
  };
  // What test262's harness asserts of a text in one mode.
  const answer = (c, text, mode, value) => {
    addText(c, text);
    const a = c.answers.get(text) || {};
    if (mode in a && a[mode] !== value) throw new Error(`test262 gives two answers for ${c.pattern} on ${JSON.stringify(text)}`);
    a[mode] = value;
    c.answers.set(text, a);
  };

  for (const full of files) {
    const file = path.relative(root, full).split(path.sep).join("/");
    const source = fs.readFileSync(full, "utf8");
    const meta = frontMatter(source);
    if (meta.flags.includes("module")) continue;
    if (meta.negative && meta.negative.phase === "parse" && meta.negative.type === "SyntaxError") {
      const literal = negativeLiteral(source);
      if (literal && flagsValid(literal.f)) {
        candidate(literal.p, literal.f, file);
        claims.push({ p: literal.p, f: literal.f, valid: false, file });
      }
      continue;
    }
    const log = run(file, source, meta);
    const sets = log.filter((e) => e.k === "set").map((e) => e.set);
    const whole = sets.length > 0 && complementary(sets);
    for (const e of log) {
      if (e.k === "set" || !flagsValid(e.f)) continue;
      const c = candidate(e.p, e.f, file);
      if (e.k === "new") { claims.push({ p: e.p, f: e.f, valid: e.ok, file }); continue; }
      claims.push({ p: e.p, f: e.f, valid: true, file, property: e.k === "property" });
      const mode = modeOf(e.f);
      if (e.k === "exec") {
        if (e.set) edges(e.set).forEach((t) => addText(c, t));
        else addText(c, e.t);
      } else if (e.k === "property" && e.set) {
        // The pattern matches each character of its set, and, where the file's sets are complements, none of the
        // others.
        for (const s of sets) {
          for (const t of edges(s)) {
            const own = inSet(e.set, t.codePointAt(0));
            if (own || whole) answer(c, t, mode, own);
            else addText(c, t);
          }
        }
      } else if (e.k === "strings") {
        // The helper asserts that the strings it should match, joined, match, and that those it should not, joined,
        // do not; it asks of each string alone only when that fails. Each string it should match is one of the
        // property's or the class's, so it matches alone too, and their join says nothing more. A string it should
        // not match may still match alone or with others (^\p{RGI_Emoji}+$ matches an emoji followed by a skin
        // tone, which is two of RGI_Emoji), so those are texts with no answer of test262's.
        e.match.forEach((t) => answer(c, t, mode, true));
        e.nonMatch.forEach((t) => addText(c, t));
        if (e.nonMatch.length > 0) answer(c, e.nonMatch.join(""), mode, false);
      }
    }
  }
  return { files, candidates: [...candidates.values()], claims, used };
}

// One JSON value to a line, in ASCII, as generate.js writes them.
function line(value) {
  return JSON.stringify(value).replace(/[^\x00-\x7e]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
    + "\n";
}

const lone = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function entry(name, records) {
  const e = {
    file: name,
    patterns: records.length,
    valid_unicode: records.filter((r) => r.valid.unicode).length,
    valid_legacy_only: records.filter((r) => !r.valid.unicode && r.valid.legacy).length,
    not_valid: records.filter((r) => !r.valid.unicode && !r.valid.legacy && !r.valid.unicode_sets).length,
    tests: records.reduce((n, r) => n + (r.tests ? r.tests.length : 0), 0),
    valid_unicode_sets: records.filter((r) => r.valid.unicode_sets).length,
    valid_unicode_sets_only: records.filter((r) => r.valid.unicode_sets && !r.valid.unicode && !r.valid.legacy).length,
  };
  const deviations = {};
  for (const r of records) {
    if (r.deviation) deviations[r.deviation] = (deviations[r.deviation] || 0) + 1;
    for (const t of r.tests || []) if (t.deviation) deviations[t.deviation] = (deviations[t.deviation] || 0) + 1;
  }
  e.v8_deviations = deviations;
  return e;
}

// The copyright lines of the test files the records were taken from, for NOTICE-test262.md.
function notice(used) {
  const holders = new Set();
  for (const file of used) {
    const head = fs.readFileSync(path.join(root, file), "utf8").split("\n").slice(0, 5);
    for (const l of head) {
      const m = /^\/\/\s*(Copyright.*?)\s*$/i.exec(l);
      if (m) holders.add(m[1].replace(/\s*All rights reserved\.?$/i, ""));
    }
  }
  const licence = fs.readFileSync(path.join(root, "LICENSE"), "utf8").replace(/\s+$/, "");
  return `# test262

\`data/test262.jsonl\` and \`data/test262-lone-surrogates.jsonl\` hold patterns and texts taken from test262, the
ECMAScript conformance test suite (https://github.com/tc39/test262), at commit
${commit}. Each record names, in its \`test262\` field, the test files it was taken
from. The answers are V8's, and not part of test262.

Those patterns and texts are used under test262's licence, which is below, as it is in test262's \`LICENSE\` file.
The rest of this repository is under the MIT licence in [LICENSE](LICENSE).

\`test262.js\` writes this file. Each test file of test262 carries a copyright line of its own and says that it is
governed by the licence below. These are the lines of the ${used.size} files the records were taken from:

${[...holders].sort().map((h) => "- " + h).join("\n")}

## test262's licence

\`\`\`text
${licence}
\`\`\`
`;
}

const limits = { backtracks: 250000, limitMs: 250, threads: 4 };

(async () => {
  if (!withBudget) console.error("This V8 has no backtrack limit: only the time limit applies, and it varies.");
  const { files, candidates, claims, used } = harvest();
  console.error(`${files.length} test files read, ${candidates.length} patterns`);

  const lists = candidates.map((c) => c.texts);
  const items = candidates.map((c, i) => ({ pattern: c.pattern, flags: c.flags, texts: i }));
  const { records, overBudget, overTime } = await evaluate("test262", items, [], limits, lists, true);
  const byKey = new Map(candidates.map((c) => [c.flags + "/" + c.pattern, c]));
  for (const r of records) {
    const c = byKey.get(r.flags + "/" + r.pattern);
    r.test262 = [...c.files].sort();
    if (r.tests && r.tests.length === 0) delete r.tests;
  }

  // What the tests show of validity is what V8 says.
  const recordOf = new Map(records.map((r) => [r.flags + "/" + r.pattern, r]));
  for (const claim of claims) {
    const r = recordOf.get(ims(claim.f) + "/" + claim.p);
    const mode = modeOf(claim.f);
    if (!r || r.valid[mode] === claim.valid) continue;
    throw new Error(`${claim.file}: ${JSON.stringify(claim.p)} with ${claim.f || "no flags"} is ${claim.valid ? "" : "not "}valid there, and V8 says otherwise`);
  }

  await mark({}, records);

  // The matcher written from ECMA-262, beside V8, where it reads the syntax.
  const caseModifier = /\(\?[ms]*i[ims]*(?:-[ims]*)?:|\(\?[ims]*-[ms]*i[ims]*:/;
  const backreference = /\\[1-9]|\\k</;
  let asked = 0, unread = 0, overSteps = 0;
  for (const r of records) {
    if (!r.tests) continue;
    for (const [mode, unicode] of [["unicode", true], ["legacy", false]]) {
      if (!r.valid[mode] || r.v8_deviation) continue;
      let matcher;
      try { matcher = reference(r.pattern, r.flags, unicode); } catch (e) {
        if (e instanceof Unsupported) { unread++; continue; }
        throw e;
      }
      for (const t of r.tests) {
        let got;
        try { got = matcher.test(t.text); } catch (e) {
          if (e instanceof OverBudget) { overSteps++; break; }
          if (e instanceof Unsupported) { unread++; break; }
          throw e;
        }
        asked++;
        if (got === t[mode]) continue;
        let deviation;
        if (caseModifier.test(r.pattern)) deviation = "modifier-group";
        else if (unicode && r.flags.includes("i") && backreference.test(r.pattern)) deviation = "full-case-folding";
        else {
          throw new Error(`${r.pattern} with ${r.flags || "no flags"} (${mode}) on ${JSON.stringify(t.text)}: `
            + `V8 says ${t[mode]}, reference.js says ${got}, and that is no known deviation`);
        }
        r.v8_deviation = true;
        r.deviation = deviation;
        break;
      }
    }
  }
  console.error(`reference.js: ${asked} answers, ${unread} not read, ${overSteps} over its steps`);

  // Where test262's harness states the answer, V8 gives it.
  for (const r of records) {
    if (!r.tests) continue;
    const c = byKey.get(r.flags + "/" + r.pattern);
    for (const t of r.tests) {
      const stated = c.answers.get(t.text);
      if (!stated) continue;
      const differs = Object.keys(stated).filter((mode) => mode in t && t[mode] !== stated[mode]);
      if (differs.length === 0) continue;
      throw new Error(`${r.pattern} on ${JSON.stringify(t.text)}: test262 says ${JSON.stringify(stated)} and V8 does not (${r.test262[0]})`);
    }
  }

  // Texts and patterns that hold half of a surrogate pair go in a file of their own, as in the families.
  const main = [], halves = [];
  for (const r of records) {
    if (lone.test(r.pattern)) { r.source = "test262-lone-surrogates"; halves.push(r); continue; }
    const tests = r.tests || [];
    const whole = tests.filter((t) => !lone.test(t.text)), half = tests.filter((t) => lone.test(t.text));
    if (half.length > 0) {
      const copy = { ...r, source: "test262-lone-surrogates", tests: half };
      halves.push(copy);
    }
    if (whole.length > 0) r.tests = whole; else delete r.tests;
    main.push(r);
  }

  const order = (r) => ["pattern", "flags", "source", "valid", "v8_deviation", "deviation", "test262", "tests"]
    .filter((k) => k in r).reduce((o, k) => (o[k] = r[k], o), {});
  const written = [];
  for (const [name, list] of [["test262.jsonl", main], ["test262-lone-surrogates.jsonl", halves]]) {
    fs.writeFileSync(path.join(out, name), list.map((r) => line(order(r))).join(""));
    written.push(entry(name, list));
  }
  // The patterns dropped for the limits are counted with the main file, which has every pattern but those that hold
  // half of a surrogate pair.
  Object.assign(written[0], {
    candidates: written[0].patterns + overBudget.length + overTime.length,
    dropped_for_backtracks: overBudget.length, dropped_for_time: overTime.length,
  });
  for (const e of written) {
    // The Node that answered: test262 has Unicode 17, and so must V8 (Node 24.22.0 has it; 24.11.0 had Unicode 16).
    e.node = process.version;
    e.v8 = process.versions.v8;
    e.unicode = process.versions.unicode;
    e.test262 = { repository: "https://github.com/tc39/test262", commit, files_read: files.length };
  }

  const manifestPath = path.join(out, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.files = manifest.files.filter((f) => !written.some((w) => w.file === f.file)).concat(written);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(path.join(__dirname, "NOTICE-test262.md"), notice(used));
  for (const e of written) console.log(`${e.file}: ${e.patterns} patterns, ${e.tests} tests, deviations ${JSON.stringify(e.v8_deviations)}`);
})().catch((e) => { console.error(e); process.exit(1); });
