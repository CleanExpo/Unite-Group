/**
 * Regression guard for the locale-hardcoding bug class.
 *
 * Background: PRs #143, #144, #146, #153 fixed every site inside
 * `src/app/[locale]/` that hardcoded the `/en/` prefix in a Link href,
 * router.push, router.replace, or redirect. A `/fr/` founder used to get
 * dropped out of locale on those clicks. This test fails if any new
 * `'/en/...'` literal appears in that tree.
 *
 * Scope: only `src/app/[locale]/**` source files. Excludes:
 *   - test files (which legitimately assert on /en/ as the default-locale case)
 *   - block comments (// or /*) that document the historical pattern
 *
 * If you legitimately need an /en/-prefixed string (e.g. a hardcoded redirect
 * for a deprecated route), add an inline `// allow-locale-literal` directive
 * on the same line — the guard skips lines with that comment.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const LOCALE_LITERAL = /['"`]\/en\//;
const ALLOW_DIRECTIVE = /\/\/\s*allow-locale-literal/;

interface Hit {
  file: string;
  line: number;
  content: string;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip __tests__ entirely — tests assert on /en/ as the canonical default.
      if (entry === '__tests__') continue;
      walk(full, acc);
      continue;
    }
    if (/\.(tsx?|jsx?)$/.test(entry)) acc.push(full);
  }
  return acc;
}

function stripCommentLines(content: string): { line: number; text: string }[] {
  // Strip whole-line `//`, `/* … */`, and ` * …` JSDoc lines. Inline `//`
  // trailing comments stay (so an inline `/en/` inside a string still hits).
  return content.split('\n').map((text, i) => {
    const trimmed = text.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      return { line: i + 1, text: '' };
    }
    return { line: i + 1, text };
  });
}

describe('locale-hardcoding regression guard', () => {
  it('no `/en/...` literal in src/app/[locale]/** outside tests and comments', () => {
    const hits: Hit[] = [];
    for (const file of walk(ROOT)) {
      const raw = readFileSync(file, 'utf8');
      for (const { line, text } of stripCommentLines(raw)) {
        if (!LOCALE_LITERAL.test(text)) continue;
        if (ALLOW_DIRECTIVE.test(text)) continue;
        hits.push({ file: file.replace(ROOT, 'src/app/[locale]'), line, content: text.trim() });
      }
    }
    if (hits.length > 0) {
      // Surface every violation, not just the first — makes the diff readable.
      const report = hits
        .map((h) => `  ${h.file}:${h.line}\n    ${h.content}`)
        .join('\n');
      throw new Error(
        `Found ${hits.length} hardcoded /en/ literal(s) in src/app/[locale]/.\n` +
          'Use the active locale instead (useParams<{ locale }>() in client, ' +
          'await params in server). See memory feedback-locale-hardcoding-class ' +
          'and PRs #143/#144/#146/#153 for the pattern.\n\n' +
          report,
      );
    }
  });
});
