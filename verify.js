// Checks the data against V8, independently of the generator.
//
//   node verify.js [data directory, default ./data]
//
// It reads every record of every .jsonl file, compiles the pattern again with the u flag and without it, matches
// every text again, and compares what V8 says now with what the record says. It also checks that each file is ASCII
// and that the counts in manifest.json are the counts of the files.
//
// With the Node that wrote the data (see manifest.json) there are no disagreements. With another Node, a disagreement
// is a place where its V8 differs. The exit code is 0 when there are none and nothing else is wrong.
//
// Each file is checked in a process of its own. In one long process, V8's answers for two hand-written patterns with
// a word boundary in a case-insensitive modifier group, (?i:\Bs) and (?i:\bk\b), were seen to change from run to run.
// V8 compiles a regular expression differently once a process has compiled a great many, and it gets these two
// wrong in one of the two ways. A process with one file to read answers as the generator did. No record of the
// families changes with V8's optimisation switched off, or with its interpreter in place of its compiler.
'use strict';

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

if (process.argv[2] === "--file") {
  console.log(JSON.stringify(check(process.argv[3], process.argv[4])));
  return;
}

const dir = path.resolve(process.argv[2] || path.join(__dirname, "data"));
const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
const found = fs.readdirSync(dir).filter((n) => n.endsWith(".jsonl")).sort();
const listed = manifest.files.map((f) => f.file);

let problems = 0;
function problem(message) {
  if (++problems <= 20) console.log("  " + message);
}

if (manifest.node !== process.version) {
  console.log(`The data was written with Node ${manifest.node} and this is ${process.version}.`);
}

const totals = { patterns: 0, tests: 0, answers: 0, disagreements: 0 };
for (const name of [...listed, ...found.filter((n) => !listed.includes(n))]) {
  if (!found.includes(name)) { problem(`${name}: in manifest.json, and not there`); continue; }
  const child = spawnSync(process.execPath, [...process.execArgv, __filename, "--file", dir, name],
    { encoding: "utf8", maxBuffer: 1 << 26 });
  if (child.status !== 0) { problem(`${name}: could not be checked: ${child.stderr}`); continue; }
  const { count, answers, disagreements, messages } = JSON.parse(child.stdout);
  for (const m of messages) problem(`${name}: ${m}`);
  problems += Math.max(0, disagreements - messages.length);

  const entry = manifest.files.find((f) => f.file === name);
  if (!entry) {
    problem(`${name}: not in manifest.json`);
  } else {
    for (const k of Object.keys(count)) {
      if (entry[k] !== count[k]) problem(`${name}: ${k} is ${count[k]}, and manifest.json says ${entry[k]}`);
    }
    if ("candidates" in entry
      && entry.candidates !== count.patterns + entry.dropped_for_backtracks + entry.dropped_for_time) {
      problem(`${name}: the candidates in manifest.json are not the patterns and the dropped`);
    }
  }
  console.log(`${name}: ${count.patterns} patterns, ${count.tests} tests, ${answers} answers, `
    + `${disagreements} disagreements`);
  totals.patterns += count.patterns;
  totals.tests += count.tests;
  totals.answers += answers;
  totals.disagreements += disagreements;
}

console.log(`total: ${totals.patterns} patterns, ${totals.tests} tests, ${totals.answers} answers, `
  + `${totals.disagreements} disagreements`);
if (problems > 0) {
  console.log(`${problems} problems`);
  process.exit(1);
}

// One file: its counts, the number of answers compared, and what is wrong with it.
function check(dir, name) {
  const messages = [];
  const say = (message) => { if (messages.length < 20) messages.push(message); };
  const compile = (pattern, flags) => { try { return new RegExp(pattern, flags); } catch (e) { return null; } };

  const text = fs.readFileSync(path.join(dir, name), "latin1");
  if (/[^\x00-\x7f]/.test(text)) say("not ASCII");
  if (!text.endsWith("\n")) say("no final line feed");
  const lines = text.split("\n");
  lines.pop();

  const count = { patterns: 0, valid_unicode: 0, valid_legacy_only: 0, not_valid: 0, tests: 0 };
  let answers = 0, disagreements = 0;
  const disagree = (message) => { disagreements++; say(message); };

  for (const line of lines) {
    const r = JSON.parse(line);
    const what = JSON.stringify(r.pattern) + (r.flags ? " with " + r.flags : "");
    if (typeof r.pattern !== "string" || typeof r.flags !== "string" || !/^[ims]*$/.test(r.flags)
      || name !== r.source + ".jsonl" || typeof r.valid.unicode !== "boolean" || typeof r.valid.legacy !== "boolean") {
      disagree(`a record of the wrong shape: ${what}`);
      continue;
    }

    const unicode = compile(r.pattern, r.flags + "u"), legacy = compile(r.pattern, r.flags);
    if (!!unicode !== r.valid.unicode) disagree(`${what} valid with the u flag: ${!!unicode}`);
    if (!!legacy !== r.valid.legacy) disagree(`${what} valid without the u flag: ${!!legacy}`);

    count.patterns++;
    if (r.valid.unicode) count.valid_unicode++;
    else if (r.valid.legacy) count.valid_legacy_only++;
    else count.not_valid++;

    if (!r.tests) continue;
    if (!r.valid.unicode && !r.valid.legacy) disagree(`${what} is not valid and has tests`);
    for (const t of r.tests) {
      count.tests++;
      if (typeof t.text !== "string") { disagree(`${what} has a test with no text`); continue; }
      for (const [mode, regex, valid] of [["unicode", unicode, r.valid.unicode], ["legacy", legacy, r.valid.legacy]]) {
        if (mode in t !== valid) { disagree(`${what} on ${JSON.stringify(t.text)}: ${mode} answer`); continue; }
        if (!valid || !regex) continue;
        answers++;
        const now = regex.test(t.text);
        if (now !== t[mode]) disagree(`${what} on ${JSON.stringify(t.text)}: ${mode} is ${now}, recorded ${t[mode]}`);
      }
    }
  }
  return { count, answers, disagreements, messages };
}
