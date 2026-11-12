#!/usr/bin/env node
// Checks the Markdown docs in this repo. Plain Node, no dependencies.
//
//   node docs/check-docs.mjs            (from anywhere; the repo root is found from this file)
//
// It fails (exit 1) with one `file:line: message` per problem when:
//   1. a relative link in any .md file points at a file or folder that does not exist
//      (the link target must also match the on-disk case, because Linux is case-sensitive);
//   2. an `npm run <script>` or `npm test` in a README.md names a script that is not in the
//      package.json of the folder the code block is in (tracked through `cd` lines and --prefix);
//   3. a file path inside a README.md code block does not exist, relative to the folder the
//      code block is in at that line.
//
// Rules the checker follows when reading code blocks:
//   - Each fenced block starts in the README's folder. A `cd X` line moves it; several commands
//     on one line may be separated by `;`. Everything after ` #` on a line is a comment.
//   - After `git clone <url>`, `cd <repo name>` means the repo root.
//   - Tokens under .venv/, node_modules/ or dist/ are install outputs and are not checked.
//   - URLs (anything with `://`), flags (`-x`), variables (`$x`) and module paths (`app.main:app`)
//     are not paths.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.venv', 'dist', '.vite']);
const GENERATED_DIRS = new Set(['.venv', 'node_modules', 'dist']);
const PATH_EXTENSIONS = new Set([
  'py', 'ts', 'tsx', 'js', 'mjs', 'cjs', 'json', 'md', 'txt', 'css', 'html',
  'toml', 'yml', 'yaml', 'ps1', 'cfg', 'ini', 'lock',
]);

const problems = [];
const stats = { files: 0, links: 0, scripts: 0, paths: 0 };

function report(file, line, message) {
  problems.push(`${path.relative(ROOT, file).replace(/\\/g, '/')}:${line}: ${message}`);
}

// ---------------------------------------------------------------- filesystem helpers

const dirCache = new Map();
function entriesOf(dir) {
  if (!dirCache.has(dir)) {
    let names = null;
    try { names = fs.readdirSync(dir); } catch { /* not a directory */ }
    dirCache.set(dir, names);
  }
  return dirCache.get(dir);
}

/** true when `abs` exists AND every path segment inside the repo matches the on-disk case. */
function existsExact(abs) {
  if (!fs.existsSync(abs)) return false;
  const rel = path.relative(ROOT, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return true; // outside the repo: plain existence
  let dir = ROOT;
  for (const segment of rel.split(path.sep).filter(Boolean)) {
    const names = entriesOf(dir);
    if (!names || !names.includes(segment)) return false;
    dir = path.join(dir, segment);
  }
  return true;
}

function* walkMarkdown(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(name)) yield* walkMarkdown(full);
    } else if (name.toLowerCase().endsWith('.md')) {
      yield full;
    }
  }
}

function readScripts(dir) {
  const pkg = path.join(dir, 'package.json');
  if (!fs.existsSync(pkg)) return null;
  try {
    return JSON.parse(fs.readFileSync(pkg, 'utf8')).scripts ?? {};
  } catch (err) {
    return { __error: `cannot parse ${path.relative(ROOT, pkg)}: ${err.message}` };
  }
}

// ---------------------------------------------------------------- markdown parsing

/** Splits a file into prose lines and fenced code blocks, each tagged with its 1-based line number. */
function parseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const prose = [];
  const blocks = [];
  let fence = null; // { marker, startLine, lines }
  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const open = line.match(/^\s*(`{3,}|~{3,})\s*(\S*)/);
    if (fence) {
      if (open && open[1][0] === fence.marker[0] && open[1].length >= fence.marker.length && !open[2]) {
        blocks.push(fence);
        fence = null;
      } else {
        fence.lines.push({ lineNo, text: line });
      }
    } else if (open) {
      fence = { marker: open[1], lang: open[2].toLowerCase(), startLine: lineNo, lines: [] };
    } else {
      prose.push({ lineNo, text: line });
    }
  });
  if (fence) blocks.push(fence); // unterminated fence: still check what is inside
  return { prose, blocks };
}

const INLINE_LINK = /!?\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
const REF_LINK = /^\s*\[[^\]]+\]:\s*(<[^>]*>|\S+)/;
const AUTOLINK = /<((?:https?|mailto):[^>]*)>/g;

function isExternal(target) {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//');
}

function checkLinks(file, prose) {
  const dir = path.dirname(file);
  for (const { lineNo, text } of prose) {
    const targets = [];
    const withoutAutolinks = text.replace(AUTOLINK, ' ');
    const withoutCode = withoutAutolinks.replace(/`[^`]*`/g, ' ');
    for (const m of withoutCode.matchAll(INLINE_LINK)) targets.push(m[1]);
    const ref = withoutCode.match(REF_LINK);
    if (ref) targets.push(ref[1]);
    for (let target of targets) {
      target = target.replace(/^<|>$/g, '').trim();
      if (!target || target.startsWith('#') || isExternal(target)) continue;
      stats.links++;
      const clean = decodeURIComponent(target.split('#')[0].split('?')[0]);
      if (!clean) continue;
      const abs = path.resolve(dir, clean);
      if (!existsExact(abs)) {
        report(file, lineNo, `broken link: ${target} (resolved to ${path.relative(ROOT, abs).replace(/\\/g, '/')})`);
      }
    }
  }
}

// ---------------------------------------------------------------- README code blocks

function splitCommands(line) {
  const noComment = line.replace(/(^|\s)#.*$/, '').replace(/^\s*(PS[^>]*>|\$|>)\s+/, '');
  return noComment.split(/\s*(?:;|&&|\|\|)\s*/).map((c) => c.trim()).filter(Boolean);
}

function tokenise(command) {
  // Strip quotes but keep the content; good enough for the shell lines READMEs contain.
  return command.replace(/["']/g, '').split(/\s+/).filter(Boolean);
}

function looksLikePath(token) {
  if (token.includes('://') || token.startsWith('-') || token.includes('$') || token.includes('*')) return false;
  if (token.includes(':') && !/^[A-Za-z]:[\\/]/.test(token)) return false; // app.main:app, localhost:8000
  if (/[\\/]/.test(token)) return token !== '/' && token !== '\\';
  const ext = token.match(/\.([A-Za-z0-9]+)$/);
  return Boolean(ext && PATH_EXTENSIONS.has(ext[1].toLowerCase()));
}

function firstSegment(token) {
  return token.replace(/^(\.[\\/])+/, '').split(/[\\/]/)[0];
}

function checkReadmeBlocks(file, blocks) {
  const readmeDir = path.dirname(file);
  for (const block of blocks) {
    let cwd = readmeDir;
    let cloneDir = null;
    for (const { lineNo, text } of block.lines) {
      for (const command of splitCommands(text)) {
        const tokens = tokenise(command);
        if (tokens.length === 0) continue;
        const [cmd, ...args] = tokens;

        if (cmd === 'git' && args[0] === 'clone') {
          const url = args.find((a) => a.includes('://') || a.endsWith('.git')) ?? '';
          const explicit = args.filter((a) => !a.startsWith('-') && a !== url && a !== 'clone');
          cloneDir = explicit[0] ?? path.basename(url).replace(/\.git$/, '');
          continue;
        }

        if (cmd === 'cd') {
          const target = args[0] ?? '';
          if (!target || target.includes('$') || target === '~') { cwd = readmeDir; continue; }
          if (cloneDir && target === cloneDir) { cwd = ROOT; continue; }
          const next = path.resolve(cwd, target);
          stats.paths++;
          if (!existsExact(next) || !fs.statSync(next).isDirectory()) {
            report(file, lineNo, `cd target does not exist: ${target} (from ${path.relative(ROOT, cwd) || '.'})`);
          } else {
            cwd = next;
          }
          continue;
        }

        if (cmd === 'npm') {
          let pkgDir = cwd;
          const prefixAt = args.findIndex((a) => a === '--prefix');
          if (prefixAt >= 0 && args[prefixAt + 1]) pkgDir = path.resolve(cwd, args[prefixAt + 1]);
          const prefixEq = args.find((a) => a.startsWith('--prefix='));
          if (prefixEq) pkgDir = path.resolve(cwd, prefixEq.slice('--prefix='.length));
          const rest = args.filter((a, i) => !a.startsWith('-') && args[i - 1] !== '--prefix');
          let script = null;
          if (rest[0] === 'run' || rest[0] === 'run-script') script = rest[1] ?? null;
          else if (['test', 'start', 'stop', 'restart'].includes(rest[0])) script = rest[0];
          if (script) {
            stats.scripts++;
            const scripts = readScripts(pkgDir);
            const where = path.relative(ROOT, pkgDir).replace(/\\/g, '/') || '.';
            if (scripts === null) {
              report(file, lineNo, `npm script "${script}" used but ${where}/package.json does not exist`);
            } else if (scripts.__error) {
              report(file, lineNo, scripts.__error);
            } else if (!(script in scripts)) {
              report(file, lineNo, `npm script "${script}" is not in ${where}/package.json (has: ${Object.keys(scripts).join(', ') || 'none'})`);
            }
          }
          continue;
        }

        for (const token of tokens) {
          if (!looksLikePath(token)) continue;
          if (GENERATED_DIRS.has(firstSegment(token))) continue;
          const bare = token.split('::')[0]; // pytest node ids: tests/x.py::test_name
          stats.paths++;
          if (!existsExact(path.resolve(cwd, bare))) {
            report(file, lineNo, `path does not exist: ${bare} (from ${path.relative(ROOT, cwd).replace(/\\/g, '/') || '.'})`);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------- main

for (const file of walkMarkdown(ROOT)) {
  stats.files++;
  const { prose, blocks } = parseMarkdown(fs.readFileSync(file, 'utf8'));
  checkLinks(file, prose);
  if (path.basename(file).toLowerCase() === 'readme.md') checkReadmeBlocks(file, blocks);
}

if (problems.length > 0) {
  console.error(`docs check FAILED: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nFix the lines above (paths are relative to the repo root).');
  process.exit(1);
}
console.log(
  `docs OK: ${stats.files} markdown files, ${stats.links} relative links, ` +
  `${stats.scripts} npm scripts, ${stats.paths} code-block paths checked.`,
);
