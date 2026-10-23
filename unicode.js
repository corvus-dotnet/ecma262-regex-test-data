// The data for other versions of Unicode than the one V8 answered with (manifest.json, "unicode").
//
//   node unicode.js check [data directory, default ./data]
//   node unicode.js apply <version> <out directory> [data directory, default ./data]
//
// An answer can depend on the version of the Unicode Character Database an engine has: \p{...} and \P{...} name
// sets of characters, and case-insensitive matching folds by the database's case mappings. The data's answers are
// V8's, from its version of Unicode; data/unicode/<version>.jsonl holds every answer and every validity that differs
// under another version, one JSON line each:
//
//   {"file": "test262.jsonl", "line": 1234, "grammar": "unicode", "valid": true}
//   {"file": "test262.jsonl", "line": 1234, "grammar": "unicode", "test": 5, "answer": true}
//
// "line" counts the lines of the file from 1 and "test" the record's tests from 0; "grammar" is unicode, legacy or
// unicode_sets; an answer has the shape the file's answers have (a boolean, or captures.jsonl's object). README.md
// ("Other versions of Unicode") says how the files are made and checked.
//
// check: every line of every overlay fits the data: its file and line exist, its test exists, and the answer or the
// validity it gives differs from the record's. An overlay made for other data fails, so that one cannot go stale
// unnoticed when the data is regenerated. The exit code is 0 when every line fits.
//
// apply: writes the data with the overlay of a version applied to <out directory>, every file the same but the
// records the overlay changes, so that a runner judges an engine of that version by reading that directory in place
// of data/. A validity made false drops the record's answers in that grammar.

const fs = require("fs");
const path = require("path");

// One JSON value to a line, in ASCII, as generate.js writes the data.
function line(value) {
  return JSON.stringify(value).replace(/[^\x00-\x7e]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
    + "\n";
}

function overlays(dir) {
  const at = path.join(dir, "unicode");
  return fs.existsSync(at) ? fs.readdirSync(at).filter((f) => f.endsWith(".jsonl")).sort() : [];
}

function read(dir, version) {
  const file = path.join(dir, "unicode", `${version}.jsonl`);
  if (!fs.existsSync(file)) throw new Error(`there is no overlay for Unicode ${version} (${file})`);
  return fs.readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}

// The lines of a data file, read once.
function lines(dir, cache, file) {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(path.join(dir, file), "utf8").split("\n"));
  return cache.get(file);
}

function check(dir) {
  const cache = new Map();
  let bad = 0;
  for (const name of overlays(dir)) {
    const version = name.replace(/\.jsonl$/, "");
    const entries = read(dir, version);
    entries.forEach((e, k) => {
      const where = `unicode/${name}:${k + 1}`;
      const fail = (why) => { bad++; if (bad <= 20) console.error(`${where}: ${why}`); };
      if (!fs.existsSync(path.join(dir, e.file))) return fail(`${e.file} is not a file of the data`);
      const text = lines(dir, cache, e.file)[e.line - 1];
      if (!text) return fail(`${e.file} has no line ${e.line}`);
      const r = JSON.parse(text);
      if (!(e.grammar in r.valid)) return fail(`the record has no ${e.grammar} grammar`);
      if ("valid" in e) {
        if (r.valid[e.grammar] === e.valid) fail(`the record's validity under ${e.grammar} is already ${e.valid}`);
        return;
      }
      const t = (r.tests || [])[e.test];
      if (!t) return fail(`the record has no test ${e.test}`);
      if (e.grammar in t && JSON.stringify(t[e.grammar]) === JSON.stringify(e.answer)) {
        fail(`test ${e.test} already answers ${JSON.stringify(e.answer)} under ${e.grammar}`);
      }
    });
    console.log(`unicode/${name}: ${entries.length} lines`);
  }
  if (bad) console.error(`${bad} lines do not fit the data`);
  return bad === 0;
}

function apply(dir, version, out) {
  const byFile = new Map();
  for (const e of read(dir, version)) {
    if (!byFile.has(e.file)) byFile.set(e.file, []);
    byFile.get(e.file).push(e);
  }
  fs.mkdirSync(out, { recursive: true });
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl") || f === "manifest.json")) {
    const entries = byFile.get(file);
    if (!entries) {
      fs.copyFileSync(path.join(dir, file), path.join(out, file));
      continue;
    }
    const all = fs.readFileSync(path.join(dir, file), "utf8").split("\n");
    const records = new Map();
    for (const e of entries) {
      if (!records.has(e.line)) records.set(e.line, JSON.parse(all[e.line - 1]));
      const r = records.get(e.line);
      if ("valid" in e) {
        r.valid[e.grammar] = e.valid;
        if (!e.valid) for (const t of r.tests || []) delete t[e.grammar];
      } else {
        r.tests[e.test][e.grammar] = e.answer;
      }
    }
    for (const [n, r] of records) all[n - 1] = line(r).replace(/\n$/, "");
    fs.writeFileSync(path.join(out, file), all.join("\n"));
  }
  console.log(`Unicode ${version}: ${[...byFile.values()].reduce((n, es) => n + es.length, 0)} lines over `
    + `${byFile.size} files -> ${out}`);
}

const [command, ...rest] = process.argv.slice(2);
if (command === "check") {
  process.exit(check(rest[0] || "data") ? 0 : 1);
} else if (command === "apply" && rest.length >= 2) {
  apply(rest[2] || "data", rest[0], rest[1]);
} else {
  console.error("node unicode.js check [data] | node unicode.js apply <version> <out> [data]");
  process.exit(2);
}
