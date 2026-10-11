// A matcher written from the text of ECMA-262, for finding where V8 departs from it.
//
// It is not the oracle. The answers in the data are V8's. deviations.js runs this beside V8 for the families where
// V8 is known to go wrong (case-insensitive matching), and a record on which the two disagree is marked.
//
// It follows the specification's own shape: a pattern is compiled to a matcher that takes a position, the captures
// and a continuation (22.2.2, Pattern Semantics). A repetition refuses an empty iteration once its minimum is met
// and clears the captures of its body when an iteration starts (RepeatMatcher). A lookbehind matches backwards. A
// lookaround keeps its captures and is not entered again. Without the u flag the text is a list of UTF-16 code
// units, and with it a list of code points, so a match never starts between the two halves of a surrogate pair.
//
// What one character matches is not decided here. Each atom (a literal, an escape, a class, the dot) is asked of V8
// as a pattern of its own, ^(?:atom)$ with the i flag when case is ignored, against a single character. V8 is right
// about those, and flags.jsonl records them. So Canonicalize, \w and the Unicode properties are V8's, and what is
// written from the specification is everything between the characters: the order of the search, the repetitions,
// the groups, the backreferences (compared one character at a time through Canonicalize) and the assertions.
//
// It reads the syntax the families use, and throws Unsupported for anything else (octal escapes, \c with no letter
// and the other corners of Annex B).
'use strict';

class Unsupported extends Error {}
class OverBudget extends Error {}

const lineTerminator = (c) => c === "\n" || c === "\r" || c === " " || c === " ";

function parse(source, flags, unicode) {
  let pos = 0, groups = 0;
  const names = new Map();
  const references = [];
  const named = /\(\?<[^=!]/.test(source);
  const eof = () => pos >= source.length;
  const peek = (s) => source.startsWith(s, pos);
  const fail = (why) => { throw new Unsupported(why + " at " + pos + " in " + source); };
  const close = () => { if (!peek(")")) fail("no closing parenthesis"); pos++; };
  const hex = (from, length) => {
    const digits = source.substr(from, length);
    return digits.length === length && /^[0-9a-fA-F]+$/.test(digits) ? parseInt(digits, 16) : -1;
  };

  function disjunction(mod) {
    const alts = [alternative(mod)];
    while (peek("|")) { pos++; alts.push(alternative(mod)); }
    return alts.length === 1 ? alts[0] : { t: "alt", alts };
  }

  function alternative(mod) {
    const items = [];
    while (!eof() && !peek("|") && !peek(")")) items.push(term(mod));
    return { t: "seq", items };
  }

  function term(mod) {
    const before = groups;
    const node = atom(mod);
    const q = /^(?:([*+?])|\{(\d+)(?:(,)(\d*))?\})(\??)/.exec(source.slice(pos, pos + 40));
    if (!q) return node;
    pos += q[0].length;
    let min, max;
    if (q[1]) {
      min = q[1] === "+" ? 1 : 0;
      max = q[1] === "?" ? 1 : Infinity;
    } else {
      min = Number(q[2]);
      max = !q[3] ? min : q[4] === "" ? Infinity : Number(q[4]);
    }
    return { t: "rep", min, max, greedy: q[5] === "", node, first: before, count: groups - before };
  }

  function group(mod, name) {
    const index = ++groups;
    if (name !== null) names.set(name, [...(names.get(name) || []), index]);
    const node = disjunction(mod);
    close();
    return { t: "group", index, node };
  }

  function atom(mod) {
    const c = source[pos];
    if (c === "^" || c === "$") { pos++; return { t: "assert", kind: c, mod }; }
    if (c === "(") {
      if (peek("(?:")) { pos += 3; const node = disjunction(mod); close(); return node; }
      if (peek("(?=") || peek("(?!")) {
        const neg = source[pos + 2] === "!";
        pos += 3;
        const node = disjunction(mod);
        close();
        return { t: "look", ahead: true, neg, node };
      }
      if (peek("(?<=") || peek("(?<!")) {
        const neg = source[pos + 3] === "!";
        pos += 4;
        const node = disjunction(mod);
        close();
        return { t: "look", ahead: false, neg, node };
      }
      if (peek("(?<")) {
        const end = source.indexOf(">", pos);
        const name = source.slice(pos + 3, end);
        if (end < 0 || !/^[A-Za-z_$][\w$]*$/.test(name)) fail("a group name");
        pos = end + 1;
        return group(mod, name);
      }
      const m = /^\(\?([ims]*)(?:-([ims]*))?:/.exec(source.slice(pos, pos + 12));
      if (m) {
        pos += m[0].length;
        const inner = { ...mod };
        for (const f of m[1]) inner[f] = true;
        for (const f of m[2] || "") inner[f] = false;
        const node = disjunction(inner);
        close();
        return node;
      }
      if (peek("(?")) fail("a group");
      pos++;
      return group(mod, null);
    }
    if (c === ".") { pos++; return { t: "char", src: ".", mod }; }
    if (c === "[") {
      const start = pos++;
      while (!eof() && source[pos] !== "]") pos += source[pos] === "\\" ? 2 : 1;
      if (eof()) fail("a class");
      pos++;
      return { t: "char", src: source.slice(start, pos), mod };
    }
    if (c === "\\") return escape(mod);
    if (c === ")" || c === "*" || c === "+" || c === "?" || c === "|") fail("syntax");
    if (unicode) {
      const point = String.fromCodePoint(source.codePointAt(pos));
      pos += point.length;
      return { t: "char", lit: point, mod };
    }
    pos++;
    return { t: "char", lit: c, mod };
  }

  function escape(mod) {
    const c = source[pos + 1];
    if (c === undefined) fail("an escape");
    const lit = (text, length) => { pos += length; return { t: "char", lit: text, mod }; };
    if (c === "b" || c === "B") { pos += 2; return { t: "assert", kind: c, mod }; }
    if (c >= "1" && c <= "9") {
      const digits = /^\d+/.exec(source.slice(pos + 1, pos + 12))[0];
      pos += 1 + digits.length;
      const node = { t: "ref", number: Number(digits), mod };
      references.push(node);
      return node;
    }
    if (c === "0") {
      if (/\d/.test(source[pos + 2] || "")) fail("an octal escape");
      return lit("\0", 2);
    }
    if (c === "k") {
      if (!unicode && !named) fail("\\k with no named group");
      const end = source.indexOf(">", pos);
      if (source[pos + 2] !== "<" || end < 0) fail("a named reference");
      const node = { t: "ref", name: source.slice(pos + 3, end), mod };
      pos = end + 1;
      references.push(node);
      return node;
    }
    if ("dDwWsS".includes(c)) { pos += 2; return { t: "char", src: "\\" + c, mod }; }
    if ((c === "p" || c === "P") && unicode) {
      const end = source.indexOf("}", pos);
      if (source[pos + 2] !== "{" || end < 0) fail("a property");
      const src = source.slice(pos, end + 1);
      pos = end + 1;
      return { t: "char", src, mod };
    }
    if (c === "u") {
      if (unicode && source[pos + 2] === "{") {
        const end = source.indexOf("}", pos);
        const point = parseInt(source.slice(pos + 3, end), 16);
        if (end < 0 || !(point <= 0x10FFFF)) fail("a code point escape");
        return lit(String.fromCodePoint(point), end + 1 - pos);
      }
      const unit = hex(pos + 2, 4);
      if (unit < 0) return unicode ? fail("a \\u escape") : lit("u", 2);
      if (unicode && unit >= 0xD800 && unit <= 0xDBFF && source.substr(pos + 6, 2) === "\\u") {
        const low = hex(pos + 8, 4);
        if (low >= 0xDC00 && low <= 0xDFFF) return lit(String.fromCharCode(unit, low), 12);
      }
      return lit(String.fromCharCode(unit), 6);
    }
    if (c === "x") {
      const unit = hex(pos + 2, 2);
      if (unit < 0) return unicode ? fail("a \\x escape") : lit("x", 2);
      return lit(String.fromCharCode(unit), 4);
    }
    if (c === "c") {
      if (!/[A-Za-z]/.test(source[pos + 2] || "")) fail("\\c with no letter");
      return lit(String.fromCharCode(source.charCodeAt(pos + 2) % 32), 3);
    }
    const control = { t: "\t", n: "\n", v: "\v", f: "\f", r: "\r" }[c];
    if (control) return lit(control, 2);
    if (unicode) {
      const point = String.fromCodePoint(source.codePointAt(pos + 1));
      return lit(point, 1 + point.length);
    }
    return lit(c, 2);
  }

  const root = disjunction({ i: flags.includes("i"), m: flags.includes("m"), s: flags.includes("s") });
  if (!eof()) fail("syntax");
  for (const r of references) {
    if (r.name !== undefined) r.indexes = names.get(r.name) || fail("no group named " + r.name);
    else if (r.number > groups) fail("a reference to no group");
    else r.indexes = [r.number];
  }
  return { root, groups };
}

// The matcher of a pattern as V8 would be given it: reference(pattern, flags, unicode).test(text) is the answer of
// RegExp.prototype.test under ECMA-262. It throws OverBudget when one text takes more than a set number of steps.
function reference(source, flags, unicode) {
  const { root, groups } = parse(source, flags, unicode);
  let inp = [], n = 0, steps = 0;
  const limit = 4000000;
  const tick = () => { if (++steps > limit) throw new OverBudget(source); };

  const testers = new Map();
  const tester = (src, i, s) => {
    const f = (i ? "i" : "") + (s ? "s" : "") + (unicode ? "u" : "");
    const key = f + "/" + src;
    let t = testers.get(key);
    if (!t) testers.set(key, t = { regex: new RegExp("^(?:" + src + ")$", f), seen: new Map() });
    return t;
  };
  const test = (t, c) => {
    let v = t.seen.get(c);
    if (v === undefined) t.seen.set(c, v = t.regex.test(c));
    return v;
  };
  const escaped = (c) => unicode ? "\\u{" + c.codePointAt(0).toString(16) + "}"
    : "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
  // Whether two characters have the same Canonicalize, asked of V8 as a literal with the i flag.
  const same = (a, b, i) => a === b || (i && test(tester(escaped(a), true, false), b));

  function compile(node, dir) {
    switch (node.t) {
      case "seq": {
        const ms = node.items.map((x) => compile(x, dir));
        if (dir < 0) ms.reverse();
        let all = null;
        for (let k = ms.length - 1; k >= 0; k--) {
          const m = ms[k], next = all;
          all = next === null ? m : (e, caps, c) => m(e, caps, (e2, caps2) => next(e2, caps2, c));
        }
        return all || ((e, caps, c) => c(e, caps));
      }
      case "alt": {
        const ms = node.alts.map((x) => compile(x, dir));
        return (e, caps, c) => { for (const m of ms) if (m(e, caps, c)) return true; return false; };
      }
      case "char": {
        const t = tester(node.src !== undefined ? node.src : escaped(node.lit), node.mod.i, node.mod.s);
        if (dir > 0) return (e, caps, c) => { tick(); return e < n && test(t, inp[e]) && c(e + 1, caps); };
        return (e, caps, c) => { tick(); return e > 0 && test(t, inp[e - 1]) && c(e - 1, caps); };
      }
      case "group": {
        const m = compile(node.node, dir), index = node.index;
        return (e, caps, c) => m(e, caps, (e2, caps2) => {
          const with_ = caps2.slice();
          with_[index] = dir > 0 ? [e, e2] : [e2, e];
          return c(e2, with_);
        });
      }
      case "ref": {
        const indexes = node.indexes, i = node.mod.i;
        return (e, caps, c) => {
          tick();
          let s = null;
          for (const k of indexes) if (caps[k]) s = caps[k];
          if (s === null) return c(e, caps);
          const length = s[1] - s[0], f = dir > 0 ? e + length : e - length;
          if (f < 0 || f > n) return false;
          const from = Math.min(e, f);
          for (let k = 0; k < length; k++) if (!same(inp[s[0] + k], inp[from + k], i)) return false;
          return c(f, caps);
        };
      }
      case "look": {
        const m = compile(node.node, node.ahead ? 1 : -1), neg = node.neg;
        return (e, caps, c) => {
          let got = null;
          const matched = m(e, caps, (e2, caps2) => { got = caps2; return true; });
          return neg ? !matched && c(e, caps) : matched && c(e, got);
        };
      }
      case "assert": {
        const multiline = node.mod.m, word = tester("\\w", node.mod.i, false);
        const isWord = (k) => k >= 0 && k < n && test(word, inp[k]);
        switch (node.kind) {
          case "^": return (e, caps, c) => (e === 0 || (multiline && lineTerminator(inp[e - 1]))) && c(e, caps);
          case "$": return (e, caps, c) => (e === n || (multiline && lineTerminator(inp[e]))) && c(e, caps);
          case "b": return (e, caps, c) => isWord(e - 1) !== isWord(e) && c(e, caps);
          default: return (e, caps, c) => isWord(e - 1) === isWord(e) && c(e, caps);
        }
      }
      case "rep": {
        const m = compile(node.node, dir), { greedy, first, count } = node;
        const run = (min, max, e, caps, c) => {
          tick();
          if (max === 0) return c(e, caps);
          const d = (e2, caps2) => {
            if (min === 0 && e2 === e) return false;
            return run(min === 0 ? 0 : min - 1, max === Infinity ? Infinity : max - 1, e2, caps2, c);
          };
          let cleared = caps;
          if (count > 0) {
            cleared = caps.slice();
            for (let k = first + 1; k <= first + count; k++) cleared[k] = undefined;
          }
          if (min !== 0) return m(e, cleared, d);
          if (!greedy) return c(e, caps) || m(e, cleared, d);
          return m(e, cleared, d) || c(e, caps);
        };
        return (e, caps, c) => run(node.min, node.max, e, caps, c);
      }
      default: throw new Error("no such node: " + node.t);
    }
  }

  const matcher = compile(root, 1);
  const none = new Array(groups + 1).fill(undefined);
  const done = () => true;
  return {
    test(text) {
      inp = unicode ? Array.from(text) : text.split("");
      n = inp.length;
      try {
        for (let start = 0; start <= n; start++) {
          steps = 0;
          if (matcher(start, none, done)) return true;
        }
      } catch (e) {
        if (e instanceof RangeError) throw new OverBudget(source);
        throw e;
      }
      return false;
    },
  };
}

module.exports = { reference, Unsupported, OverBudget };
