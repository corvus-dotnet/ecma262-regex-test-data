// The data for an engine of the ECMAScript 2020 grammar (ECMA-262, 11th edition), which JSON Schema 2020-12 names.
//
//   node edition.js make [data directory, default ./data]
//   node edition.js check [data directory, default ./data]
//   node edition.js apply <out directory> [unicode version] [data directory, default ./data]
//
// The data's answers are V8's, from today's grammar. The 2020 grammar refuses what ECMAScript added to regular
// expressions after its 11th edition, and nothing else: the d flag (2022) and the v flag (2024), modifier groups such
// as (?i:...) (2025), a group name used by two groups (2025), and, under the u flag, a property name or value that is
// not in that edition's tables (a later script, such as Script=Yezidi, or a later binary property). Every answer to a
// pattern it accepts is today's. So data/edition/es2020.jsonl holds validities only, one JSON line each:
//
//   {"file": "test262.jsonl", "line": 1234, "grammar": "unicode", "valid": false}
//   {"file": "exec/test262.jsonl", "line": 56, "refused": true}
//
// "line" counts the lines of the file from 1 and "grammar" is unicode or legacy; the v flag's grammar (unicode_sets)
// is refused as a whole, so it has no lines. A line of exec/test262.jsonl is a call whose pattern or flags the 2020
// grammar refuses.
//
// make writes the overlay. It asks V8 about modifier groups and duplicate group names with both turned off
// (--no-js-regexp-modifiers --no-js-regexp-duplicate-named-groups, which make starts itself with), and reads the
// property names of a pattern under the u flag against es2020-properties.json, the edition's tables.
//
// check makes the overlay again and fails unless it is the file's, line for line, so that it cannot go stale when the
// data is regenerated.
//
// apply writes the data as an engine of the 2020 grammar is judged by it, to <out directory>, every file the same but:
// the unicode_sets grammar of every record refused (its answers dropped), the overlay's validities applied (a refused
// grammar's answers dropped), and the overlay's calls of exec/test262.jsonl left out. With a Unicode version, the
// overlay of that version (unicode.js apply) is applied first, for an engine of the 2020 grammar with that version's
// character database.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const FLAGS = ["--no-js-regexp-modifiers", "--no-js-regexp-duplicate-named-groups"];
const OVERLAY = "edition/es2020.jsonl";
const EXEC = "exec/test262.jsonl";

// One JSON value to a line, in ASCII, as generate.js writes the data.
function line(value) {
  return JSON.stringify(value).replace(/[^\x00-\x7e]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
    + "\n";
}

// The files of records at the top of the data directory, as manifest.json lists them.
function recordFiles(dir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  return manifest.files.map((f) => f.file);
}

const TABLES = JSON.parse(fs.readFileSync(path.join(__dirname, "es2020-properties.json"), "utf8"));
const NAMES = Object.fromEntries(["nonbinary", "binary", "general_category", "script"].map((k) => [k, new Set(TABLES[k])]));

// The contents of every \p{...} and \P{...} of a pattern (the u flag's grammar), each escape read whole.
function propertyEscapes(pattern) {
  const out = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== "\\") continue;
    const c = pattern[i + 1];
    if ((c === "p" || c === "P") && pattern[i + 2] === "{") {
      const end = pattern.indexOf("}", i + 3);
      if (end < 0) break;
      out.push(pattern.slice(i + 3, end));
      i = end;
    } else {
      i++;
    }
  }
  return out;
}

// Whether a property escape's contents name a property, and a value of it, of the 2020 tables.
function inTables(contents) {
  const eq = contents.indexOf("=");
  if (eq < 0) return NAMES.general_category.has(contents) || NAMES.binary.has(contents);
  const name = contents.slice(0, eq), value = contents.slice(eq + 1);
  if (!NAMES.nonbinary.has(name)) return false;
  return name === "General_Category" || name === "gc" ? NAMES.general_category.has(value) : NAMES.script.has(value);
}

// Whether the 2020 grammar accepts a pattern that today's accepts, with flags (u for the unicode grammar).
function accepts(pattern, flags) {
  if (/[dv]/.test(flags)) return false;
  try {
    new RegExp(pattern, flags);
  } catch {
    return false;
  }
  return !flags.includes("u") || propertyEscapes(pattern).every(inTables);
}

// The overlay's lines, in the order of the files and their lines.
function make(dir) {
  const lines = [];
  for (const file of recordFiles(dir)) {
    const records = fs.readFileSync(path.join(dir, file), "utf8").split("\n");
    records.forEach((text, i) => {
      if (!text) return;
      const r = JSON.parse(text);
      for (const grammar of ["legacy", "unicode"]) {
        if (r.valid[grammar] !== true) continue;
        if (!accepts(r.pattern, r.flags + (grammar === "unicode" ? "u" : ""))) {
          lines.push(line({ file, line: i + 1, grammar, valid: false }));
        }
      }
    });
  }
  const calls = fs.readFileSync(path.join(dir, EXEC), "utf8").split("\n");
  calls.forEach((text, i) => {
    if (!text) return;
    const r = JSON.parse(text);
    if (!accepts(r.pattern, r.flags)) lines.push(line({ file: EXEC, line: i + 1, refused: true }));
  });
  return lines;
}

// Runs this script again under the flags that turn off what V8 added after 2020, unless they are on.
function underFlags(args) {
  let on = true;
  try {
    new RegExp("(?i:a)");
    on = false;
  } catch {}
  if (on) return false;
  execFileSync(process.execPath, [...FLAGS, __filename, ...args], { stdio: "inherit" });
  return true;
}

function apply(out, version, dir) {
  let from = dir;
  let temp = null;
  if (version) {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "edition-"));
    execFileSync(process.execPath, [path.join(__dirname, "unicode.js"), "apply", version, temp, dir], { stdio: "inherit" });
    from = temp;
  }
  const overlay = fs.readFileSync(path.join(dir, OVERLAY), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const refused = new Map();
  const dropped = new Set();
  for (const e of overlay) {
    if (e.file === EXEC) dropped.add(e.line);
    else refused.set(`${e.file}:${e.line}:${e.grammar}`, true);
  }
  fs.mkdirSync(path.join(out, "exec"), { recursive: true });
  for (const file of recordFiles(dir)) {
    const records = fs.readFileSync(path.join(from, file), "utf8").split("\n");
    const written = records.map((text, i) => {
      if (!text) return text;
      const r = JSON.parse(text);
      for (const grammar of Object.keys(r.valid)) {
        if (grammar === "unicode_sets" || refused.has(`${file}:${i + 1}:${grammar}`)) {
          r.valid[grammar] = false;
          for (const t of r.tests || []) delete t[grammar];
        }
      }
      return line(r).trimEnd();
    });
    fs.writeFileSync(path.join(out, file), written.join("\n"));
  }
  const calls = fs.readFileSync(path.join(from, EXEC), "utf8").split("\n");
  fs.writeFileSync(path.join(out, EXEC), calls.filter((t, i) => !t || !dropped.has(i + 1)).join("\n"));
  const manifest = JSON.parse(fs.readFileSync(path.join(from, "manifest.json"), "utf8"));
  manifest.edition = "es2020";
  if (version) manifest.unicode_applied = version;
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
  console.log(`ECMAScript 2020${version ? `, Unicode ${version}` : ""}: ${refused.size} validities, ${dropped.size} calls left out -> ${out}`);
}

const [command, ...rest] = process.argv.slice(2);
if (command === "make") {
  const dir = rest[0] || path.join(__dirname, "data");
  if (!underFlags(["make", dir])) {
    const lines = make(dir);
    fs.mkdirSync(path.join(dir, "edition"), { recursive: true });
    fs.writeFileSync(path.join(dir, OVERLAY), lines.join(""));
    // Its entry in manifest.json, which generate.js keeps.
    const manifestPath = path.join(dir, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const calls = lines.filter((l) => l.includes('"refused"')).length;
    const entry = {
      edition: "es2020",
      file: OVERLAY,
      validities: lines.length - calls,
      exec_refused: calls,
      made_with: `edition.js make, with V8 ${process.versions.v8} in Node ${process.version} under ${FLAGS.join(" ")}, and es2020-properties.json (the edition's tables of Unicode property names and values)`,
    };
    const editions = [entry, ...(manifest.edition_overlays || []).filter((e) => e.edition !== "es2020")];
    // In the place generate.js writes it: after the overlays for other versions of Unicode.
    const ordered = {};
    for (const [k, v] of Object.entries(manifest)) {
      if (k === "edition_overlays") continue;
      ordered[k] = v;
      if (k === "unicode_overlays") ordered.edition_overlays = editions;
    }
    if (!ordered.edition_overlays) ordered.edition_overlays = editions;
    fs.writeFileSync(manifestPath, JSON.stringify(ordered, null, 2) + "\n");
    console.log(`${OVERLAY}: ${lines.length} lines`);
  }
} else if (command === "check") {
  const dir = rest[0] || path.join(__dirname, "data");
  if (!underFlags(["check", dir])) {
    const want = make(dir).join("");
    const have = fs.readFileSync(path.join(dir, OVERLAY), "utf8");
    if (want !== have) {
      console.log(`${OVERLAY} is not what make writes for this data: make it again`);
      process.exit(1);
    }
    console.log(`${OVERLAY}: ${want.split("\n").length - 1} lines, as make writes them`);
  }
} else if (command === "apply") {
  const [out, version, dir] = rest;
  if (!out) {
    console.log("usage: node edition.js apply <out directory> [unicode version] [data directory]");
    process.exit(2);
  }
  apply(out, version, dir || path.join(__dirname, "data"));
} else {
  console.log("usage: node edition.js make|check|apply ...");
  process.exit(2);
}
