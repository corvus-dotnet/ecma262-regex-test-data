// Asks V8 about a list of patterns in worker threads, within two limits.
//
// V8's matcher backtracks, so a pattern can take longer than anyone will wait. A pattern is dropped, and no record of
// it is written, when it is over either limit on any one of its texts.
//
// The backtrack budget. V8 can build a regular expression that gives up after a number of backtracks, and that count
// is the same on every machine, where a time is not. A pattern is dropped when the search of a text needs the budget
// or more. This limit is the one that decides, so that the same Node writes the same files wherever it runs.
//
// The time limit. A pattern is also dropped when V8 takes longer than the limit on one text, and a worker that is
// still inside one match when the limit passes is terminated and replaced. The budget is set far enough below this
// that it should drop nothing. It is here so that a run always finishes.
//
// The records have the same shape as those generate.js writes for the other files.
'use strict';

const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");

if (isMainThread) {
  module.exports = { evaluate, withBudget: budgeted() !== null };
} else {
  work(workerData);
}

// %NewRegExpWithBacktrackLimit is one of V8's own test functions. Where a later V8 has no such function this is
// null, and only the time limit applies.
function budgeted() {
  try {
    require("v8").setFlagsFromString("--allow-natives-syntax");
    const make = new Function("pattern", "flags", "limit",
      "return %NewRegExpWithBacktrackLimit(pattern, flags, limit)");
    make("a", "", 1);
    return make;
  } catch (e) {
    return null;
  }
}

// In a worker: the patterns at first, first + step, first + 2 * step and so on.
function work({ source, patterns, texts, first, step, backtracks, limitMs, shared, skip }) {
  const progress = new Int32Array(shared);
  const make = budgeted();
  for (let i = first; i < patterns.length; i += step) {
    if (skip.includes(i)) continue;
    const pattern = patterns[i];
    Atomics.store(progress, 0, i);
    let u = null, l = null;
    try { u = new RegExp(pattern, "u"); } catch (e) {}
    try { l = new RegExp(pattern, ""); } catch (e) {}
    const r = { pattern, flags: "", source, valid: { unicode: !!u, legacy: !!l } };
    // With "|$" after it the pattern matches every text: at the end of the text if nowhere sooner, once every earlier
    // start has been tried. So this says no only when it ran out of backtracks.
    const within = "(?:" + pattern + ")|$";
    const bu = make && u ? make(within, "u", backtracks) : null;
    const bl = make && l ? make(within, "", backtracks) : null;
    let slowest = 0, overBudget = false;
    if (u || l) {
      r.tests = [];
      for (const text of texts) {
        Atomics.add(progress, 1, 1);
        if ((bu && !bu.test(text)) || (bl && !bl.test(text))) { overBudget = true; break; }
        Atomics.add(progress, 1, 1);
        const started = process.hrtime.bigint();
        const t = { text };
        if (u) t.unicode = u.test(text);
        if (l) t.legacy = l.test(text);
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        if (ms > slowest) slowest = ms;
        if (ms > limitMs) break;
        r.tests.push(t);
      }
    }
    Atomics.add(progress, 1, 1);
    if (overBudget) parentPort.postMessage({ i, overBudget });
    else if (slowest > limitMs) parentPort.postMessage({ i, ms: slowest });
    else parentPort.postMessage({ i, ms: slowest, record: r });
  }
  parentPort.postMessage({ done: true });
}

// Resolves to { records, overBudget, overTime, slowestKeptMs }: the records of the patterns that V8 answered within
// the limits, in the order of the patterns, and the patterns that were dropped for each limit.
function evaluate(source, patterns, texts, { backtracks, limitMs, threads }) {
  return new Promise((resolve, reject) => {
    const results = new Array(patterns.length);
    const times = new Array(patterns.length).fill(0);
    const budget = new Array(patterns.length).fill(false);
    const killed = [];
    let running = 0;

    const finish = () => {
      const records = [], overBudget = [], overTime = [];
      let slowestKeptMs = 0;
      for (let i = 0; i < patterns.length; i++) {
        if (results[i]) {
          records.push(results[i]);
          if (times[i] > slowestKeptMs) slowestKeptMs = times[i];
        } else {
          (budget[i] ? overBudget : overTime).push(patterns[i]);
        }
      }
      resolve({ records, overBudget, overTime, slowestKeptMs });
    };

    const start = (first, step) => {
      if (first >= patterns.length) return;
      running++;
      const shared = new SharedArrayBuffer(8);
      const progress = new Int32Array(shared);
      const worker = new Worker(__filename, {
        workerData: { source, patterns, texts, first, step, backtracks, limitMs, shared, skip: killed.slice() },
      });
      // What the worker has answered so far. Its replacement starts after that, because an answer that was on its way
      // when the worker was terminated is lost.
      let over = false, tick = 0, since = Date.now(), answered = first - step;
      const end = () => {
        over = true;
        clearInterval(watch);
        if (--running === 0) finish();
      };
      // The worker counts every match it starts. A count that has not moved for the limit is a match that is over it.
      const watch = setInterval(() => {
        const now = Atomics.load(progress, 1);
        if (now !== tick) { tick = now; since = Date.now(); return; }
        if (now === 0 || Date.now() - since <= limitMs) return;
        const stuck = Atomics.load(progress, 0);
        over = true;
        clearInterval(watch);
        worker.terminate().then(() => {
          killed.push(stuck);
          results[stuck] = undefined;
          running--;
          start(answered + step, step);
          if (running === 0) finish();
        }, reject);
      }, 10);
      worker.on("message", (m) => {
        if (over) return;
        if (m.done) { end(); return; }
        answered = m.i;
        if (m.overBudget) budget[m.i] = true;
        else if (m.record) { times[m.i] = m.ms; results[m.i] = m.record; }
      });
      worker.on("error", (e) => { if (!over) { over = true; clearInterval(watch); reject(e); } });
    };

    for (let k = 0; k < threads; k++) start(k, threads);
    if (running === 0) finish();
  });
}
