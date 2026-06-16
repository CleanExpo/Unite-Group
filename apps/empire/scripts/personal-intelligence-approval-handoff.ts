import * as fs from 'fs';
import * as path from 'path';
import {
  buildApprovalHandoff,
  renderApprovalHandoffMarkdown,
  validateApprovalHandoffInput,
} from '../src/lib/personal-intelligence/approval-handoff';

function usage(): never {
  throw new Error(
    'Usage: npx ts-node --transpile-only -O \'{"module":"commonjs","moduleResolution":"node"}\' scripts/personal-intelligence-approval-handoff.ts <input-json> <output-dir-under-docs/margot/personal-intelligence/approval-handoff>',
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'approval-handoff';
}

function assertSafeHandoffOutput(absoluteOutputDir: string): void {
  const safeRoot = path.resolve(process.cwd(), 'docs/margot/personal-intelligence/approval-handoff');
  fs.mkdirSync(safeRoot, { recursive: true });
  const relative = path.relative(safeRoot, absoluteOutputDir);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write Approval Handoff output outside safe root: ${safeRoot}`);
  }

  const existingParent = fs.existsSync(absoluteOutputDir) ? absoluteOutputDir : path.dirname(absoluteOutputDir);
  const realSafeRoot = fs.realpathSync(safeRoot);
  const realParent = fs.realpathSync(existingParent);
  const realRelative = path.relative(realSafeRoot, realParent);

  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error(`Refusing to follow Approval Handoff output path outside safe root: ${safeRoot}`);
  }
}

function assertSafeHandoffOutputFile(absoluteOutputFile: string): void {
  if (!fs.existsSync(absoluteOutputFile)) return;
  if (fs.lstatSync(absoluteOutputFile).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite Approval Handoff symlink output file: ${absoluteOutputFile}`);
  }
  throw new Error(`Refusing to overwrite existing Approval Handoff output file: ${absoluteOutputFile}`);
}

function writeHandoffOutputFile(absoluteOutputFile: string, content: string): void {
  fs.writeFileSync(absoluteOutputFile, content, { encoding: 'utf8', flag: 'wx' });
}

function main(): void {
  const [, , inputPath, outputDir] = process.argv;
  if (!inputPath || !outputDir) usage();

  const absoluteOutputDir = path.resolve(outputDir);
  assertSafeHandoffOutput(absoluteOutputDir);

  const parsed = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8')) as unknown;
  const input = validateApprovalHandoffInput(parsed);
  const handoffName = typeof parsed === 'object' && parsed !== null && 'handoffName' in parsed ? String((parsed as { handoffName?: unknown }).handoffName) : input.approvalLedgerPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'approval-handoff';
  const baseName = slugify(handoffName);
  const handoff = buildApprovalHandoff(input);

  fs.mkdirSync(absoluteOutputDir, { recursive: true });

  const jsonPath = path.join(absoluteOutputDir, `${baseName}.json`);
  const markdownPath = path.join(absoluteOutputDir, `${baseName}.md`);

  assertSafeHandoffOutputFile(jsonPath);
  assertSafeHandoffOutputFile(markdownPath);

  writeHandoffOutputFile(jsonPath, `${JSON.stringify(handoff, null, 2)}\n`);
  writeHandoffOutputFile(markdownPath, renderApprovalHandoffMarkdown(handoff));

  process.stdout.write(`Approval Handoff JSON written: ${jsonPath}\n`);
  process.stdout.write(`Approval Handoff Markdown written: ${markdownPath}\n`);
  process.stdout.write(`Action packs: ${handoff.actionPacks.length}\n`);
}

main();
