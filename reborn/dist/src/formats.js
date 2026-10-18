// Text formats and a restricted expression evaluator. No eval or dynamic code.
export class FormatError extends Error {
  constructor(message, file = '', line = 0) { super(`${file}${line ? ':' + line : ''}: ${message}`); this.file = file; this.line = line; }
}
function clean(line) {
  let quoted = false;
  for (let i = 0; i < line.length; i++) { if (line[i] === '"') quoted = !quoted; if (line[i] === ';' && !quoted) return line.slice(0, i).trim(); }
  return line.trim();
}
export const unquote = s => String(s ?? '').replace(/^"|"$/g, '');
export function parseINI(text, file = '') {
  const sections = []; let current;
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, i) => {
    const line = clean(raw); if (!line) return;
    const header = line.match(/^\[(.+)\]$/);
    if (header) { current = { name: header[1].trim().toLowerCase(), entries: [], line: i + 1, file }; sections.push(current); return; }
    if (!current) throw new FormatError('Data before section', file, i + 1);
    const colonCount = line.match(/^(clsn[12](?:default)?)\s*:\s*(\d+)$/i);
    if (colonCount) { current.entries.push({key:colonCount[1].toLowerCase(),value:colonCount[2],line:i+1}); return; }
    const eq = line.indexOf('=');
    if (eq >= 0) current.entries.push({ key: line.slice(0, eq).trim().toLowerCase(), value: line.slice(eq + 1).trim(), line: i + 1 });
    else current.entries.push({ key: '', value: line, line: i + 1 });
  });
  for (const s of sections) s.values = Object.fromEntries(s.entries.filter(e => e.key).map(e => [e.key, e.value]));
  return sections;
}
export function parseAIR(text, file = '') {
  const actions = new Map();
  for (const s of parseINI(text, file)) {
    const match = s.name.match(/^begin action\s+(-?\d+)$/); if (!match) continue;
    const action = { id: +match[1], frames: [], loop: 0 }; let defaults = { 1: [], 2: [] }, next = { 1: null, 2: null }, kind = 2, isDefault = false;
    for (const e of s.entries) {
      const count = e.key.match(/^clsn([12])(default)?$/);
      if (count) { kind = +count[1]; isDefault = !!count[2]; (isDefault ? defaults : next)[kind] = []; continue; }
      if (/^clsn[12]\[\d+\]$/.test(e.key)) {
        const nums = e.value.split(',').map(Number); if (nums.length !== 4 || nums.some(n => !Number.isFinite(n))) throw new FormatError('Invalid collision box', file, e.line);
        (isDefault ? defaults : next)[kind].push(nums); continue;
      }
      if (e.value.toLowerCase() === 'loopstart') { action.loop = action.frames.length; continue; }
      if (e.key) throw new FormatError(`Unsupported AIR entry ${e.key}`, file, e.line);
      const p = e.value.split(',').map(x => x.trim());
      if (p.length < 5 || p.slice(0, 5).some(x => !Number.isFinite(+x))) throw new FormatError('Invalid or unsupported AIR element', file, e.line);
      if (+p[4] < -1) throw new FormatError('Invalid frame duration', file, e.line);
      action.frames.push({ group: +p[0], image: +p[1], x: +p[2], y: +p[3], duration: +p[4], flip: p[5] || '', boxes1: next[1] ?? defaults[1], boxes2: next[2] ?? defaults[2] });
      next = { 1: null, 2: null };
    }
    if (!action.frames.length) throw new FormatError('Empty AIR action', file, s.line);
    actions.set(action.id, action);
  }
  return actions;
}
const precedence = { '||': 1, '&&': 2, '=': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };
export function compileExpression(source) {
  const tokens = []; let rest = source.trim();
  while (rest) {
    const m = rest.match(/^(\s+|"[^"]*"|(?:\d+(?:\.\d*)?|\.\d+)|[a-zA-Z_][a-zA-Z_0-9.]*|&&|\|\||!=|<=|>=|[()!+\-*/%=<>])/);
    if (!m) throw new Error(`Unsupported expression near ${rest.slice(0, 30)}`);
    if (!/^\s+$/.test(m[0])) tokens.push(m[0]); rest = rest.slice(m[0].length);
    if (tokens.length > 4096) throw new Error('Expression token budget exceeded');
  }
  let pos = 0, depth = 0;
  function primary() {
    const t = tokens[pos++]; if (!t) throw new Error('Unexpected end of expression');
    if (t === '(') { if (++depth>64) throw new Error('Expression nesting budget exceeded'); const n = expr(0); depth--; if (tokens[pos++] !== ')') throw new Error('Expected closing parenthesis'); return n; }
    if (['!', '-', '+'].includes(t)) { if (++depth>64) throw new Error('Expression nesting budget exceeded'); const arg = primary(); depth--; return { unary: t, arg }; }
    if (/^[\d.]/.test(t)) return { literal: +t };
    if (t.startsWith('"')) return { literal: unquote(t) };
    if (/^[a-zA-Z_]/.test(t)) return { variable: t.toLowerCase() };
    throw new Error(`Unexpected token ${t}`);
  }
  function expr(min) {
    let left = primary();
    while (pos < tokens.length && precedence[tokens[pos]] >= min) { const op = tokens[pos++]; left = { op, left, right: expr(precedence[op] + 1) }; }
    return left;
  }
  const ast = expr(0); if (pos !== tokens.length) throw new Error(`Unexpected token ${tokens[pos]}`);
  return ast;
}
export function evaluate(ast, context) {
  if ('literal' in ast) return ast.literal;
  if (ast.variable) { if (!(ast.variable in context)) throw new Error(`Unsupported trigger ${ast.variable}`); return context[ast.variable]; }
  if (ast.unary) { const x = evaluate(ast.arg, context); return ast.unary === '!' ? +!x : ast.unary === '-' ? -x : +x; }
  const l = evaluate(ast.left, context);
  if (ast.op === '&&') return l ? +!!evaluate(ast.right, context) : 0;
  if (ast.op === '||') return l ? 1 : +!!evaluate(ast.right, context);
  const r = evaluate(ast.right, context);
  switch (ast.op) { case '=': return +(l === r); case '!=': return +(l !== r); case '<': return +(l < r); case '>': return +(l > r); case '<=': return +(l <= r); case '>=': return +(l >= r); case '+': return l + r; case '-': return l - r; case '*': return l * r; case '/': return r ? l / r : 0; case '%': return r ? l % r : 0; default: throw new Error('Unknown operator'); }
}
export const CONTROLLERS = new Set(['changestate', 'ctrlset', 'velset', 'veladd', 'posadd', 'hitdef', 'poweradd', 'lifeadd', 'changeanim']);
export function parseCNS(text, file = '') {
  const sections = parseINI(text, file), states = new Map(); let current;
  for (const s of sections) {
    const m = s.name.match(/^statedef\s+(-?\d+)$/);
    if (m) { current = { id: +m[1], values: s.values, controllers: [] }; states.set(current.id, current); }
    else if (/^state\s/.test(s.name)) {
      if (!current) throw new FormatError('Controller without StateDef', file, s.line);
      const type = (s.values.type || '').toLowerCase(); if (!CONTROLLERS.has(type)) throw new FormatError(`Unsupported controller: ${type}`, file, s.line);
      const groups = new Map(), all = [];
      for (const e of s.entries) {
        if (e.key === 'triggerall') all.push(compileExpression(e.value));
        else if (/^trigger\d+$/.test(e.key)) { if (!groups.has(e.key)) groups.set(e.key, []); groups.get(e.key).push(compileExpression(e.value)); }
      }
      current.controllers.push({ type, values: s.values, all, groups, file, line: s.line });
    }
  }
  return { states, sections };
}
export function parseCMD(text, file = '') {
  return parseINI(text, file).filter(s => s.name === 'command').map(s => ({ name: unquote(s.values.name), sequence: (s.values.command || '').split(',').map(x => x.trim()), time: +(s.values.time || 15), buffer: +(s.values['buffer.time'] || 1) }));
}
export function safePath(path) {
  const p = path.replace(/\\/g, '/');
  if (p.startsWith('/') || p.includes(':') || p.split('/').includes('..') || p.includes('\0')) throw new Error('Unsafe package path');
  return p.replace(/^\.\//, '').toLowerCase();
}
export function inspectPackage(files) {
  const diagnostics = []; const names = new Set();
  let total = 0;
  for (const f of files) { names.add(safePath(f.path)); total += f.size ?? f.text?.length ?? 0; }
  if (files.length > 2500 || total > 128 * 1024 * 1024) throw new Error('Package exceeds 2,500 files or 128 MB');
  const defs = files.filter(f => /\.def$/i.test(f.path));
  for (const f of files) {
    try {
      if (/\.(cns|st|cmd)$/i.test(f.path)) parseCNS(f.text, f.path);
      if (/\.cmd$/i.test(f.path)) for (const c of parseCMD(f.text, f.path)) {
        if (c.sequence.length!==1 || c.sequence.some(s=>s.split('+').some(t=>!/^\/?[abcxyz]$/.test(t)))) diagnostics.push({file:f.path,line:0,message:`Unsupported command pattern: ${c.name}`});
      }
      if (/\.air$/i.test(f.path)) parseAIR(f.text, f.path);
      if (/\.def$/i.test(f.path)) {
        const base = safePath(f.path).split('/').slice(0, -1).join('/');
        const refs = parseINI(f.text, f.path).find(s => s.name === 'files');
        for (const e of refs?.entries || []) {
          if (!e.value || e.key === 'pal.defaults') continue;
          const value = unquote(e.value); const relative = safePath((base ? base + '/' : '') + value);
          if (!names.has(relative)) diagnostics.push({ file: f.path, line: e.line, message: `Missing referenced file: ${value}` });
        }
      }
      if (/\.(sff|snd|fnt)$/i.test(f.path)) diagnostics.push({ file: f.path, line: 0, message: 'Binary decoding is not implemented in this milestone' });
    } catch (e) { diagnostics.push({ file: f.path, line: e.line || 0, message: e.message }); }
  }
  if (!defs.length) diagnostics.push({ file: '', line: 0, message: 'No DEF file found' });
  return { files: files.length, bytes: total, diagnostics, playable: false, status: 'Inspection only — external characters are not playable yet.' };
}
