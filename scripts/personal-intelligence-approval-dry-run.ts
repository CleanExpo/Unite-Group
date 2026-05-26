import * as fs from 'fs';
import * as path from 'path';
import {
  buildApprovalDryRun,
  renderApprovalDryRunMarkdown,
  validateApprovalDryRunInput,
} from '../src/lib/personal-intelligence/approval-dry-run';

function usage(): never {
  throw new Error(
    'Usage: npx ts-node --transpile-only -O \'{"module":"commonjs","moduleResolution":"node"}\' scripts/personal-intelligence-approval-dry-run.ts <input-json> <output-dir-under-docs/margot/personal-intelligence/approval-dry-run>',
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'approval-dry-run';
}

function assertSafeDryRunOutput(absoluteOutputDir: string): void {
  const safeRoot = path.resolve(process.cwd(), 'docs/margot/personal-intelligence/approval-dry-run');
  fs.mkdirSync(safeRoot, { recursive: true });
  const relative = path.relative(safeRoot, absoluteOutputDir);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write Approval Dry-Run output outside safe root: ${safeRoot}`);
  }

  const existingParent = fs.existsSync(absoluteOutputDir) ? absoluteOutputDir : path.dirname(absoluteOutputDir);
  const realSafeRoot = fs.realpathSync(safeRoot);
  const realParent = fs.realpathSync(existingParent);
  const realRelative = path.relative(realSafeRoot, realParent);

  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error(`Refusing to follow Approval Dry-Run output path outside safe root: ${safeRoot}`);
  }
}

function assertSafeDryRunOutputFile(absoluteOutputFile: string): void {
  if (!fs.existsSync(absoluteOutputFile)) return;
  if (fs.lstatSync(absoluteOutputFile).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite Approval Dry-Run symlink output file: ${absoluteOutputFile}`);
  }
  throw new Error(`Refusing to overwrite existing Approval Dry-Run output file: ${absoluteOutputFile}`);
}

function writeDryRunOutputFile(absoluteOutputFile: string, content: string): void {
  fs.writeFileSync(absoluteOutputFile, content, { encoding: 'utf8', flag: 'wx' });
}

function main(): void {
  const [, , inputPath, outputDir] = process.argv;
  if (!inputPath || !outputDir) usage();

  const absoluteOutputDir = path.resolve(outputDir);
  assertSafeDryRunOutput(absoluteOutputDir);

  const parsed = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8')) as unknown;
  const input = validateApprovalDryRunInput(parsed);
  const dryRunName = input.dryRunName ?? input.approvalHandoffPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'approval-dry-run';
  const baseName = slugify(dryRunName);
  const dryRun = buildApprovalDryRun(input);

  fs.mkdirSync(absoluteOutputDir, { recursive: true });

  const jsonPath = path.join(absoluteOutputDir, `${baseName}.json`);
  const markdownPath = path.join(absoluteOutputDir, `${baseName}.md`);

  assertSafeDryRunOutputFile(jsonPath);
  assertSafeDryRunOutputFile(markdownPath);

  writeDryRunOutputFile(jsonPath, `${JSON.stringify(dryRun, null, 2)}\n`);
  writeDryRunOutputFile(markdownPath, renderApprovalDryRunMarkdown(dryRun));

  process.stdout.write(`Approval Dry-Run JSON written: ${jsonPath}\n`);
  process.stdout.write(`Approval Dry-Run Markdown written: ${markdownPath}\n`);
  process.stdout.write(`Dry-run items: ${dryRun.dryRunItems.length}\n`);
}

main();
