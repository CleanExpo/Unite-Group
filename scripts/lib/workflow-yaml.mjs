/**
 * A strict, dependency-free reader for the block-style YAML subset GitHub Actions
 * workflows are written in (UNI-2523).
 *
 * WHY THIS EXISTS. The write-token isolation guard used to be a regex over the
 * workflow's raw text: `/npm ci|npm run |node scripts\/founder-queue/`. Round four
 * of the independent review defeated it in one character — it added `npm  ci`
 * with two spaces to the issues-write job, gave that job a full checkout, and the
 * suite stayed green at 55/55 including the test named THE WRITE TOKEN IS
 * ISOLATED. A lexical assertion about a structured document is a guess about how
 * the document will be spelled, and spelling has infinite variants. Parsing the
 * document and asking it structural questions has one answer.
 *
 * WHY NOT A DEPENDENCY. The repository root declares no dependencies at all, on
 * purpose — these gate scripts run in CI under a token and their supply chain is
 * part of the thing being guarded. The same reasoning produced UNI-2567's local
 * ZIP reader. This parser is small, total, and fails closed.
 *
 * IT FAILS CLOSED. Every construct this parser does not understand throws, so a
 * workflow rewritten into flow mappings, tabs, anchors or multi-document form
 * cannot be silently read as an empty structure and pass every check vacuously.
 * A guard whose parser returns `{}` on unfamiliar input is worse than no guard.
 */

const INDENT_STEP = 2;

class WorkflowParseError extends Error {}

function fail(lineNumber, message) {
  throw new WorkflowParseError(`workflow YAML line ${lineNumber}: ${message}`);
}

/** Splits a document into significant lines, keeping 1-based numbers for errors. */
function significantLines(source) {
  if (source.includes('\t')) {
    const index = source.slice(0, source.indexOf('\t')).split('\n').length;
    fail(index, 'a tab character is not valid YAML indentation');
  }
  if (/^---\s*$/mu.test(source)) {
    fail(1, 'multi-document YAML is not supported by this reader');
  }
  return source.split(/\r?\n/u).map((text, index) => ({ text, number: index + 1 }));
}

function isBlank(line) {
  const trimmed = line.text.trim();
  return trimmed === '' || trimmed.startsWith('#');
}

function indentOf(line) {
  return line.text.length - line.text.trimStart().length;
}

/**
 * Strips a trailing comment from a scalar, honouring quotes.
 * `run: echo '# not a comment'  # this one is` -> `echo '# not a comment'`
 */
function stripComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '#' && (index === 0 || /\s/u.test(value[index - 1]))) {
      return value.slice(0, index);
    }
  }
  return value;
}

function parseScalar(raw, lineNumber) {
  const value = stripComment(raw).trim();
  if (value === '') return null;
  if (value.startsWith('{')) {
    fail(lineNumber, 'flow mappings are not supported by this reader');
  }
  if (value.startsWith('[')) {
    if (!value.endsWith(']')) fail(lineNumber, 'unterminated flow sequence');
    const inner = value.slice(1, -1).trim();
    if (inner === '') return [];
    if (inner.includes('[') || inner.includes('{')) {
      fail(lineNumber, 'nested flow collections are not supported by this reader');
    }
    return inner.split(',').map((item) => parseScalar(item, lineNumber));
  }
  if (value.startsWith('&') || value.startsWith('*') || value.startsWith('<<')) {
    fail(lineNumber, 'anchors, aliases and merge keys are not supported by this reader');
  }
  // A TAG CHANGES WHAT THE VALUE IS. `!!str`, `!!int`, `!<tag>` are all valid
  // for Actions-compatible YAML — actionlint accepts them — and this reader
  // implements none of them, so it must not pretend to read one.
  if (value.startsWith('!')) {
    fail(lineNumber, `tags are not implemented by this reader (${value.slice(0, 20)})`);
  }
  if ((value.startsWith("'") && value.endsWith("'") && value.length > 1)
    || (value.startsWith('"') && value.endsWith('"') && value.length > 1)) {
    const inner = value.slice(1, -1);
    /*
     * AN ESCAPE IS A DIFFERENT STRING. Round eight sent `issues: "write"`,
     * which Ruby's Psych reads as `write` and this reader read as the literal
     * `write` — so the job held issues:write and the guard saw no writer.
     * Same class as the quoted key, one level down in the value.
     *
     * Refused rather than decoded, for the same reason: after `\u` come `\x`,
     * octal, and every other escape form, and closing one per round is the game
     * that has now been lost four times.
     */
    if (inner.includes('\\')) {
      fail(lineNumber, 'escape sequences in quoted scalars are not implemented by this reader');
    }
    return inner;
  }
  return value;
}

/** Reads a `|` / `>` block scalar's body: every line indented past the key. */
function readBlockScalar(lines, cursor, parentIndent) {
  const collected = [];
  let index = cursor;
  while (index < lines.length) {
    const line = lines[index];
    if (line.text.trim() === '') { collected.push(''); index += 1; continue; }
    if (indentOf(line) <= parentIndent) break;
    collected.push(line.text.slice(parentIndent + INDENT_STEP));
    index += 1;
  }
  while (collected.length > 0 && collected[collected.length - 1] === '') collected.pop();
  return { value: collected.join('\n'), next: index };
}

/**
 * Parses the block starting at `cursor` whose members sit at exactly `indent`.
 * Returns `{ value, next }`. A block is a mapping or a sequence, never both —
 * mixing them is a YAML error and is refused rather than guessed at.
 */
function parseBlock(lines, cursor, indent) {
  const sequence = [];
  const mapping = {};
  let kind = null;
  let index = cursor;

  while (index < lines.length) {
    const line = lines[index];
    if (isBlank(line)) { index += 1; continue; }

    const lineIndent = indentOf(line);
    if (lineIndent < indent) break;
    if (lineIndent > indent) {
      fail(line.number, `unexpected indentation ${lineIndent}, expected ${indent}`);
    }

    const content = line.text.trim();

    if (content.startsWith('- ') || content === '-') {
      if (kind === 'mapping') fail(line.number, 'a sequence item inside a mapping block');
      kind = 'sequence';
      const rest = content === '-' ? '' : content.slice(2);
      if (rest.trim() === '') {
        const nested = parseBlock(lines, index + 1, indent + INDENT_STEP);
        sequence.push(nested.value);
        index = nested.next;
        continue;
      }
      /*
       * `- key: value` opens a mapping whose first key sits on the dash line, so
       * its members are indented by the dash's own width. Re-parsing from this
       * line with that indent keeps one code path for every mapping.
       */
      // THE SAME KEY RULE AS THE MAPPING BRANCH. Two places in this file decide
      // "is this line a key", and they must agree — otherwise `- "uses": x`
      // reads as a scalar here while the mapping branch refuses it, which is
      // two different wrong answers to one question. A quoted sequence key
      // reaches the mapping branch below and is refused there.
      // The quoted alternative must run to the CLOSING QUOTE, not to the first
      // colon — `"run:step":` has a colon inside the quotes, and a pattern that
      // stops there leaves the line looking like a scalar. That was the whole
      // construct this alternative exists for, and getting it wrong made the
      // alternative dead code that a mutant could delete unnoticed.
      const keyed = /^(["'][^"']*["']\s*:|[^\s:][^:]*:)(\s|$)/u.test(rest);
      if (keyed) {
        const rewritten = lines.slice();
        rewritten[index] = {
          number: line.number,
          text: ' '.repeat(indent + INDENT_STEP) + rest,
        };
        const nested = parseBlock(rewritten, index, indent + INDENT_STEP);
        sequence.push(nested.value);
        index = nested.next;
        continue;
      }
      sequence.push(parseScalar(rest, line.number));
      index += 1;
      continue;
    }

    /*
     * A QUOTED KEY IS REFUSED, NOT DECODED. This is the third round on one
     * class, and the third round is where the approach changes rather than the
     * instance.
     *
     * Round six: `"uses":` kept its quote marks, `step.uses` came back null,
     * and both isolation tests passed while the issues-write job invoked an
     * unallowlisted action. That was fixed by stripping the quotes. Round seven
     * then sent `"uses":` — a double-quoted key whose escape real YAML
     * decodes to `uses` — and walked straight through the stripping.
     *
     * Decoding is an arms race this reader cannot win: after `\u` come `\x`,
     * octal, single-quote `''` doubling, explicit `? :` keys, flow mappings,
     * block-scalar keys. Every round would close one spelling and leave the
     * rest, which is the detect-the-bad-thing shape that always loses.
     *
     * So the guard stops trying to be a correct YAML implementation and becomes
     * what it should always have been: a reader that refuses to grade a document
     * containing any construct it does not fully implement. The workflow this
     * repository controls uses plain unquoted keys exclusively — verified, zero
     * quoted keys — so refusing them costs nothing real and ends the class.
     * Anyone who adds one gets a hard parse failure in the diff, which is the
     * outcome the isolation guard wanted all along.
     */
    const separator = /^([^\s:#][^:]*):(\s.*|)$/u.exec(content);
    if (!separator) {
      if (/^["']/u.test(content)) {
        fail(
          line.number,
          'quoted keys are not implemented by this reader, so this workflow cannot be graded. '
          + 'Use a plain key, or extend the reader deliberately.',
        );
      }
      fail(line.number, `not a mapping entry or sequence item: ${content}`);
    }
    if (kind === 'sequence') fail(line.number, 'a mapping entry inside a sequence block');
    kind = 'mapping';

    const key = separator[1].trim();
    // A TAGGED KEY IS A KEY THIS READER CANNOT NAME. `!!str uses: x` is valid
    // for Actions (actionlint 1.7.12 accepts it) and arrived here as the raw
    // key `!!str uses`, so `step.uses` came back null and both isolation guards
    // passed over a step invoking an unallowlisted action.
    if (key.startsWith('!')) {
      fail(line.number, `tagged keys are not implemented by this reader (${key})`);
    }
    if (/^["']/u.test(key) || /["']$/u.test(key)) {
      fail(
        line.number,
        `quoted keys are not implemented by this reader (${key}), so this workflow cannot be `
        + 'graded.',
      );
    }
    // A key that arrives via the prototype chain is not a key this document
    // declared. `__proto__` in particular would mutate every mapping at once.
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      fail(line.number, `refusing the reserved key \`${key}\``);
    }
    const rest = separator[2] ?? '';
    if (Object.hasOwn(mapping, key)) fail(line.number, `duplicate key \`${key}\``);

    const scalarPart = stripComment(rest).trim();
    /*
     * A FOLDED SCALAR IS NOT A LITERAL ONE, AND READING IT AS ONE IS THE SAME
     * HALF-HONOURING THIS READER HAS ALREADY BEEN BURNED BY.
     *
     * `>` folds line breaks into spaces; `|` keeps them. Both were routed to the
     * literal reader, so a folded `run: >` step produced a command with newlines
     * this reader believes are there and the runner does not — the same
     * two-readers-one-document defect as the quoted keys, tags and escapes this
     * file already refuses.
     *
     * Refused rather than implemented, for the reason established four rounds
     * ago: implementing YAML piecemeal is how this reader lost four consecutive
     * rounds, and the controlled workflow uses no folded scalar. A legitimate
     * edit that needs one rewrites it as `|` or changes this reader deliberately.
     */
    if (scalarPart === '>' || /^>[-+]?\d*$/u.test(scalarPart)) {
      fail(line.number,
        `key \`${key}\` uses a folded block scalar (\`>\`), which folds line breaks into `
        + 'spaces. This reader implements only the literal form (`|`) and will not guess');
    }
    if (scalarPart === '|' || /^\|[-+]?\d*$/u.test(scalarPart)) {
      const block = readBlockScalar(lines, index + 1, lineIndent);
      mapping[key] = block.value;
      index = block.next;
      continue;
    }
    if (scalarPart === '') {
      const nested = parseBlock(lines, index + 1, lineIndent + INDENT_STEP);
      mapping[key] = nested.value;
      index = nested.next;
      continue;
    }
    mapping[key] = parseScalar(rest, line.number);
    index += 1;
  }

  if (kind === null) return { value: null, next: index };
  return { value: kind === 'sequence' ? sequence : mapping, next: index };
}

/** Parses a workflow document into plain JS values, or throws. */
export function parseWorkflowYaml(source) {
  const lines = significantLines(source);
  const { value } = parseBlock(lines, 0, 0);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new WorkflowParseError('the workflow document is not a mapping');
  }
  return value;
}

/**
 * The structural view the guards ask questions of.
 *
 * Every field is REQUIRED to be present in a recognisable shape. A workflow whose
 * jobs cannot be read as jobs throws rather than yielding an empty list that
 * every `for` loop below would pass over in silence.
 */
export function readWorkflowStructure(source) {
  const document = parseWorkflowYaml(source);

  // `on` is the YAML 1.1 boolean `true` in some readers; this one keeps strings,
  // but assert it explicitly so a future change cannot quietly lose the triggers.
  const triggers = document.on ?? document.true;
  if (triggers === undefined) throw new WorkflowParseError('the workflow declares no triggers');

  const jobsBlock = document.jobs;
  if (jobsBlock === null || typeof jobsBlock !== 'object' || Array.isArray(jobsBlock)) {
    throw new WorkflowParseError('the workflow declares no jobs mapping');
  }

  const jobs = Object.entries(jobsBlock).map(([name, job]) => {
    if (job === null || typeof job !== 'object' || Array.isArray(job)) {
      throw new WorkflowParseError(`job \`${name}\` is not a mapping`);
    }
    const steps = job.steps ?? [];
    if (!Array.isArray(steps)) throw new WorkflowParseError(`job \`${name}\` has no steps list`);
    for (const step of steps) {
      if (step === null || typeof step !== 'object' || Array.isArray(step)) {
        throw new WorkflowParseError(`job \`${name}\` has a step that is not a mapping`);
      }
    }
    return {
      name,
      raw: job,
      permissions: job.permissions ?? null,
      steps: steps.map((step) => ({
        name: typeof step.name === 'string' ? step.name : null,
        uses: typeof step.uses === 'string' ? step.uses : null,
        run: typeof step.run === 'string' ? step.run : null,
        with: (step.with !== null && typeof step.with === 'object' && !Array.isArray(step.with))
          ? step.with
          : null,
        if: typeof step.if === 'string' ? step.if : null,
      })),
    };
  });

  return { document, triggers, jobs };
}

/** Jobs whose granted permissions include `issues: write`. */
/**
 * Does this permissions value grant issues:write?
 *
 * GitHub allows the whole block to be the shorthand string `write-all` or
 * `read-all` as well as a mapping. Round six pointed out that a shorthand
 * arrived here as a plain string and fell into the "not an object" arm, which
 * then consulted the workflow default and could conclude "safe" about a job
 * holding every permission there is. A shape this function does not recognise
 * is treated as capable, never as safe.
 */
function grantsIssuesWrite(permissions) {
  if (typeof permissions === 'string') {
    if (permissions === 'write-all') return true;
    if (permissions === 'read-all') return false;
    return true; // an unrecognised shorthand is not a proven-safe one
  }
  if (permissions === null || typeof permissions !== 'object' || Array.isArray(permissions)) {
    return null; // "not declared here" — the caller falls back to the default
  }
  return permissions.issues === 'write';
}

export function jobsThatCanWriteIssues(structure) {
  return structure.jobs.filter((job) => {
    const own = grantsIssuesWrite(job.permissions);
    if (own !== null) return own;
    // A job with no `permissions:` block inherits the workflow default, which
    // is the permissive case — treat it as capable rather than assume safety.
    const inherited = grantsIssuesWrite(structure.document.permissions);
    return inherited === null ? true : inherited;
  });
}

/**
 * Every command a job actually executes: `run:` bodies, plus the identity of any
 * action it invokes. This is the surface that "runs repository code" is decided
 * from — no regex over the document's text is involved.
 */
export function executedCommands(job) {
  return job.steps.flatMap((step) => (step.run === null ? [] : step.run.split('\n')))
    .map((command) => command.trim())
    .filter((command) => command !== '' && !command.startsWith('#'));
}
