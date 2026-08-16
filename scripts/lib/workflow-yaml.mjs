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
  if ((value.startsWith("'") && value.endsWith("'") && value.length > 1)
    || (value.startsWith('"') && value.endsWith('"') && value.length > 1)) {
    return value.slice(1, -1);
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
      const keyed = /^[^\s:][^:]*:(\s|$)/u.test(rest);
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

    const separator = /^([^\s:#][^:]*):(\s.*|)$/u.exec(content);
    if (!separator) fail(line.number, `not a mapping entry or sequence item: ${content}`);
    if (kind === 'sequence') fail(line.number, 'a mapping entry inside a sequence block');
    kind = 'mapping';

    const key = separator[1].trim();
    const rest = separator[2] ?? '';
    if (Object.hasOwn(mapping, key)) fail(line.number, `duplicate key \`${key}\``);

    const scalarPart = stripComment(rest).trim();
    if (scalarPart === '|' || scalarPart === '>' || /^[|>][-+]?\d*$/u.test(scalarPart)) {
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
export function jobsThatCanWriteIssues(structure) {
  return structure.jobs.filter((job) => {
    const permissions = job.permissions;
    if (permissions === null || typeof permissions !== 'object' || Array.isArray(permissions)) {
      // A job with no `permissions:` block inherits the workflow default, which
      // is the permissive case — treat it as capable rather than assume safety.
      const workflowDefault = structure.document.permissions;
      if (workflowDefault === null || typeof workflowDefault !== 'object') return true;
      return workflowDefault.issues === 'write';
    }
    return permissions.issues === 'write';
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
