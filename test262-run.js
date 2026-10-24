// What test262.js and test262-exec.js share: the directories of test262 that are about regular expressions, how a
// test's front matter and harness are read, and how a test is run with RegExp watched.
//
//   const { directories, walk, frontMatter, runner } = require("./test262-run");
//   const run = runner(<test262 checkout>);   // run(file, source, meta) -> the log, with .calls and .passed
'use strict';

const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

function runner(root, { construction = true } = {}) {
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
    const g = globalThis, R = g.RegExp, P = R.prototype, nativeExec = P.exec, log = [];
    // Taken before the test runs, which may delete or poison them (poisoned-stdlib.js deletes Array.prototype.push
    // and puts throwing accessors on the indices of Array.prototype; groups-properties.js puts a setter on
    // Object.prototype). Entries are added and objects built by definition, never by assignment or push.
    const { getPrototypeOf, getOwnPropertyDescriptor, defineProperty, keys } = Object;
    const isInteger = Number.isInteger, arrayFrom = Array.from, apply = Reflect.apply;
    const define = (o, k, value) => defineProperty(o, k, { value, writable: true, enumerable: true, configurable: true });
    const put = (list, value) => define(list, list.length, value);
    const get = (n) => getOwnPropertyDescriptor(P, n).get;
    const source = get("source"), flagGetters = {};
    for (const [n, c] of [["hasIndices", "d"], ["global", "g"], ["ignoreCase", "i"], ["multiline", "m"],
      ["dotAll", "s"], ["unicode", "u"], ["unicodeSets", "v"], ["sticky", "y"]]) flagGetters[c] = get(n);
    const built = new Map(), original = new WeakMap();
    const flagsOf = (re) => { let f = ""; for (const c of "dgimsuvy") if (apply(flagGetters[c], re, [])) f += c; return f; };
    const isRegExp = (re) => { try { apply(source, re, []); return true; } catch (e) { return false; } };
    const patternOf = (re) => original.has(re) ? original.get(re) : apply(source, re, []);
    // The whole of each call, for test262-exec.js (test262.js reads only the log): on a RegExp of RegExp.prototype
    // itself, not of a subclass, whose lastIndex is a non-negative integer, and not on a text buildString made (a whole
    // set of code points, which the log keeps by its ranges). The positions are those of exec with the d flag, run
    // again on a RegExp of the same source and flags; lastIndex is the one exec reads (0 without g or y) and, with g or
    // y, the one it leaves.
    const calls = [];
    log.calls = calls;
    // A method, not a function, so that the wrapper has the built-in's shape: no prototype, not a constructor, the
    // name exec and the length 1 (exec/name.js, not-a-constructor.js and S15.10.6.2_A6.js test them).
    P.exec = ({ exec(s) {
      const regexp = isRegExp(this), text = typeof s === "string";
      if (regexp && text) {
        const set = built.get(s);
        put(log, set ? { k: "exec", p: patternOf(this), f: flagsOf(this), set } : { k: "exec", p: patternOf(this), f: flagsOf(this), t: s });
      }
      let before;
      if (regexp && text && getPrototypeOf(this) === P && !built.has(s)) {
        const d = getOwnPropertyDescriptor(this, "lastIndex");
        if (d && isInteger(d.value) && d.value >= 0) before = d.value;
      }
      const result = apply(nativeExec, this, [s]);
      if (before !== undefined) {
        const f = flagsOf(this), carries = f.includes("g") || f.includes("y");
        let answer = null, ok = true;
        if (result !== null) {
          const again = new R(apply(source, this, []), f.includes("d") ? f : f + "d");
          again.lastIndex = carries ? before : 0;
          const m = apply(nativeExec, again, [s]);
          ok = m !== null && m.index === result.index && m[0] === result[0];
          if (ok) {
            const span = (x) => x === undefined ? null : [x[0], x[1]];
            const captures = arrayFrom(m.indices, span);
            let groups;
            if (m.indices.groups) {
              groups = {};
              const names = keys(m.indices.groups);
              for (let i = 0; i < names.length; i++) define(groups, names[i], span(m.indices.groups[names[i]]));
            }
            answer = groups ? { captures, groups } : { captures };
            if (carries) define(answer, "lastIndex", this.lastIndex);
          }
        }
        if (ok) put(calls, { p: patternOf(this), f, t: s, lastIndex: carries ? before : 0, answer });
      }
      return result;
    } }).exec;
    const logged = (p, f, make) => {
      const keep = typeof p === "string" && (f === undefined || typeof f === "string");
      try {
        const re = make();
        if (keep && isRegExp(re)) { original.set(re, p); put(log, { k: "new", p, f: f === undefined ? "" : f, ok: true }); }
        return re;
      } catch (e) {
        if (keep) put(log, { k: "new", p, f: f === undefined ? "" : f, ok: false });
        throw e;
      }
    };
    // Construction is watched for test262.js, which keeps the patterns a test builds and never runs; it replaces RegExp
    // with a proxy, which the tests of the constructor's identity fail. test262-exec.js runs without it.
    if (${construction}) g.RegExp = new Proxy(R, {
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
          put(log, { k: "set", set });
          return s;
        };
        // The generated property escape tests have their regular expressions given as { __pattern, __flags } (see
        // run), so that a property V8 does not know does not stop the whole file.
        g.testPropertyEscapes = function testPropertyEscapes(re, s) {
          const p = "__pattern" in re ? re.__pattern : patternOf(re), f = "__pattern" in re ? re.__flags : flagsOf(re);
          put(log, { k: "property", p, f, set: built.get(s) });
        };
        g.testPropertyOfStrings = function testPropertyOfStrings(args) {
          put(log, { k: "strings", p: patternOf(args.regExp), f: flagsOf(args.regExp),
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
    let threw = false;
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
      // A test that fails, or a negative test, still leaves its log. Whether V8 passes test262 is not test262.js's
      // question (it checks the answers itself); test262-exec.js keeps the calls of a test that passed.
      threw = true;
    if (process.env.T262_DEBUG) console.error("test threw:", e && e.stack || e);
    }
    // The log lives in the test's context, whose Array.prototype the test may have changed.
    const entries = [];
    for (let i = 0; i < log.length; i++) entries.push(JSON.parse(JSON.stringify(log[i])));
    entries.calls = [];
    for (let i = 0; i < log.calls.length; i++) entries.calls.push(JSON.parse(JSON.stringify(log.calls[i])));
    entries.passed = !threw;
    return entries;
  }
  return run;
}

// NOTICE-test262.md: test262's licence and the copyright lines of every test file a record of the files from test262
// was taken from. It reads the test files named in the test262 field of each of those files in the output directory,
// so test262.js and test262-exec.js, which each write it, write the same notice whichever runs last.
const fromTest262 = ["test262.jsonl", "test262-lone-surrogates.jsonl", "exec/test262.jsonl"];

function writeNotice(root, commit, out, target) {
  const used = new Set(), present = [];
  for (const name of fromTest262) {
    const file = path.join(out, name);
    if (!fs.existsSync(file)) continue;
    present.push(name);
    for (const l of fs.readFileSync(file, "utf8").split("\n")) {
      if (l) for (const f of JSON.parse(l).test262 || []) used.add(f);
    }
  }
  const holders = new Set();
  for (const file of used) {
    const head = fs.readFileSync(path.join(root, file), "utf8").split("\n").slice(0, 5);
    for (const l of head) {
      const m = /^\/\/\s*(Copyright.*?)\s*$/i.exec(l);
      if (m) holders.add(m[1].replace(/\s*All rights reserved\.?$/i, ""));
    }
  }
  const licence = fs.readFileSync(path.join(root, "LICENSE"), "utf8").replace(/\s+$/, "");
  const names = present.map((n) => `\`data/${n}\``);
  const list = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
  // Paragraphs wrapped at 118 characters, as the README is.
  const wrap = (text) => text.split(" ").reduce((lines, word) => {
    const last = lines[lines.length - 1];
    if (last && (last + " " + word).length <= 118) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
    return lines;
  }, []).join("\n");
  fs.writeFileSync(target, `# test262

${wrap(`${list} hold patterns and texts taken from test262, the ECMAScript conformance test suite (https://github.com/tc39/test262), at commit ${commit}. Each record names, in its \`test262\` field, the test files it was taken from. The answers are V8's, and not part of test262.`)}

${wrap("Those patterns and texts are used under test262's licence, which is below, as it is in test262's `LICENSE` file. The rest of this repository is under the MIT licence in [LICENSE](LICENSE).")}

${wrap(`\`test262.js\` and \`test262-exec.js\` write this file. Each test file of test262 carries a copyright line of its own and says that it is governed by the licence below. These are the lines of the ${used.size} files the records were taken from:`)}

${[...holders].sort().map((h) => "- " + h).join("\n")}

## test262's licence

\`\`\`text
${licence}
\`\`\`
`);
}

module.exports = { directories, walk, frontMatter, runner, writeNotice };
