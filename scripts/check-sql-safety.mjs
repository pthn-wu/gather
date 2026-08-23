#!/usr/bin/env node
/**
 * Parameterized-query guard.
 *
 * Prisma's query builder parameterizes everything it sends, so the only way to
 * introduce SQL injection into this codebase is to reach past it — via the
 * `Unsafe` raw helpers, or by interpolating a value into a raw template. This
 * script fails CI when that happens, so the property holds as the code grows
 * rather than only on the day someone last audited it.
 *
 * Allowed:   prisma.$queryRaw`SELECT ... WHERE id = ${id}`   (tagged template → parameterized)
 * Rejected:  prisma.$queryRawUnsafe(`SELECT ... WHERE id = '${id}'`)
 * Rejected:  prisma.$executeRawUnsafe(...)
 * Rejected:  any string-concatenated SQL statement
 *
 * Run: node scripts/check-sql-safety.mjs [dir ...]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = process.argv.slice(2).length ? process.argv.slice(2) : ['server/src', 'server/prisma'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'build', '.expo', 'coverage']);
const EXTS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

/** Each rule: why it matters, and how to spot it. */
const RULES = [
  {
    id: 'raw-unsafe-helper',
    re: /\$(?:query|execute)RawUnsafe\s*\(/,
    message:
      '$queryRawUnsafe / $executeRawUnsafe take a plain string and do NOT parameterize. ' +
      'Use the tagged-template form ($queryRaw`... ${value}`) or the Prisma query builder.',
  },
  {
    id: 'concatenated-sql',
    // A SQL verb followed by a string concatenation on the same statement.
    re: /["'`](?:\s*)(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|DROP|ALTER|CREATE)\b[^"'`]*["'`]\s*\+/i,
    message:
      'SQL built by string concatenation. Interpolated values are not escaped — ' +
      'use the Prisma query builder, or $queryRaw with ${} placeholders.',
  },
  {
    id: 'template-sql-outside-tag',
    // A template literal containing SQL + ${} that is NOT attached to a $queryRaw tag.
    re: /(?<!\$(?:query|execute)Raw)\s`[^`]*\b(?:SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b[^`]*\$\{/i,
    message:
      'SQL template literal with ${} interpolation that is not a $queryRaw tagged template. ' +
      'Only the tagged form parameterizes.',
  },
];

/** Lines carrying this marker are exempt, with the reason recorded inline. */
const ALLOW = /sql-safety-ignore/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (EXTS.test(entry)) yield full;
  }
}

const findings = [];
let scanned = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    scanned += 1;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (ALLOW.test(line)) return;
      // Ignore comment-only lines so this file's own documentation doesn't trip it.
      const code = line.replace(/^\s*(\/\/|\*|\/\*).*$/, '');
      for (const rule of RULES) {
        if (rule.re.test(code)) {
          findings.push({ file: relative(process.cwd(), file), line: i + 1, rule, text: line.trim() });
        }
      }
    });
  }
}

if (findings.length === 0) {
  console.log(`✓ SQL safety: ${scanned} files scanned, no unparameterized query patterns found.`);
  process.exit(0);
}

console.error(`✗ SQL safety: ${findings.length} problem(s) found.\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  [${f.rule.id}]`);
  console.error(`    ${f.text.slice(0, 160)}`);
  console.error(`    → ${f.rule.message}\n`);
}
console.error('If a match is genuinely safe, append a `sql-safety-ignore` comment on that line explaining why.');
process.exit(1);
