import * as fs from 'fs';
import * as path from 'path';
import {
  buildCandidateApprovalLedger,
  renderCandidateApprovalLedgerMarkdown,
  validateCandidateApprovalLedgerInput,
} from '../src/lib/personal-intelligence/candidate-approval-ledger';

function usage(): never {
  throw new Error(
    'Usage: npx ts-node --transpile-only -O \'{"module":"commonjs","moduleResolution":"node"}\' scripts/personal-intelligence-candidate-approval-ledger.ts <input-json> <output-dir-under-docs/margot/personal-intelligence/approval-ledger>',
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'candidate-approval-ledger';
}

function assertSafeLedgerOutput(absoluteOutputDir: string): void {
  const safeRoot = path.resolve(process.cwd(), 'docs/margot/personal-intelligence/approval-ledger');
  fs.mkdirSync(safeRoot, { recursive: true });
  const relative = path.relative(safeRoot, absoluteOutputDir);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write Candidate Approval Ledger output outside safe root: ${safeRoot}`);
  }

  const existingParent = fs.existsSync(absoluteOutputDir) ? absoluteOutputDir : path.dirname(absoluteOutputDir);
  const realSafeRoot = fs.realpathSync(safeRoot);
  const realParent = fs.realpathSync(existingParent);
  const realRelative = path.relative(realSafeRoot, realParent);

  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error(`Refusing to follow Candidate Approval Ledger output path outside safe root: ${safeRoot}`);
  }
}

function assertSafeLedgerOutputFile(absoluteOutputFile: string): void {
  if (!fs.existsSync(absoluteOutputFile)) return;
  if (fs.lstatSync(absoluteOutputFile).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite Candidate Approval Ledger symlink output file: ${absoluteOutputFile}`);
  }
  throw new Error(`Refusing to overwrite existing Candidate Approval Ledger output file: ${absoluteOutputFile}`);
}

function writeLedgerOutputFile(absoluteOutputFile: string, content: string): void {
  fs.writeFileSync(absoluteOutputFile, content, { encoding: 'utf8', flag: 'wx' });
}

function main(): void {
  const [, , inputPath, outputDir] = process.argv;
  if (!inputPath || !outputDir) usage();

  const absoluteOutputDir = path.resolve(outputDir);
  assertSafeLedgerOutput(absoluteOutputDir);

  const parsed = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8')) as unknown;
  const input = validateCandidateApprovalLedgerInput(parsed);
  const ledgerName = typeof parsed === 'object' && parsed !== null && 'ledgerName' in parsed ? String((parsed as { ledgerName?: unknown }).ledgerName) : input.registerPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'candidate-approval-ledger';
  const baseName = slugify(ledgerName);
  const ledger = buildCandidateApprovalLedger(input);

  fs.mkdirSync(absoluteOutputDir, { recursive: true });

  const jsonPath = path.join(absoluteOutputDir, `${baseName}.json`);
  const markdownPath = path.join(absoluteOutputDir, `${baseName}.md`);

  assertSafeLedgerOutputFile(jsonPath);
  assertSafeLedgerOutputFile(markdownPath);

  writeLedgerOutputFile(jsonPath, `${JSON.stringify(ledger, null, 2)}\n`);
  writeLedgerOutputFile(markdownPath, renderCandidateApprovalLedgerMarkdown(ledger));

  process.stdout.write(`Candidate Approval Ledger JSON written: ${jsonPath}\n`);
  process.stdout.write(`Candidate Approval Ledger Markdown written: ${markdownPath}\n`);
  process.stdout.write(`Current statuses: ${ledger.currentStatuses.length}\n`);
  process.stdout.write(`Audit events: ${ledger.auditTrail.length}\n`);
}

main();
