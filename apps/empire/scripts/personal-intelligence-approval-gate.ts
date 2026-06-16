import * as fs from 'fs';
import * as path from 'path';
import {
  buildApprovalGate,
  renderApprovalGateMarkdown,
  validateApprovalGateInput,
} from '../src/lib/personal-intelligence/approval-gate';

function usage(): never {
  throw new Error(
    'Usage: npx ts-node --transpile-only -O \'{"module":"commonjs","moduleResolution":"node"}\' scripts/personal-intelligence-approval-gate.ts <input-json> <output-dir-under-docs/margot/personal-intelligence/approval-gate>',
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'approval-gate';
}

function assertSafeGateOutput(absoluteOutputDir: string): void {
  const safeRoot = path.resolve(process.cwd(), 'docs/margot/personal-intelligence/approval-gate');
  fs.mkdirSync(safeRoot, { recursive: true });
  const relative = path.relative(safeRoot, absoluteOutputDir);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write Approval Gate output outside safe root: ${safeRoot}`);
  }

  const existingParent = fs.existsSync(absoluteOutputDir) ? absoluteOutputDir : path.dirname(absoluteOutputDir);
  const realSafeRoot = fs.realpathSync(safeRoot);
  const realParent = fs.realpathSync(existingParent);
  const realRelative = path.relative(realSafeRoot, realParent);

  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error(`Refusing to follow Approval Gate output path outside safe root: ${safeRoot}`);
  }
}

function assertSafeGateOutputFile(absoluteOutputFile: string): void {
  if (!fs.existsSync(absoluteOutputFile)) return;
  if (fs.lstatSync(absoluteOutputFile).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite Approval Gate symlink output file: ${absoluteOutputFile}`);
  }
  throw new Error(`Refusing to overwrite existing Approval Gate output file: ${absoluteOutputFile}`);
}

function writeGateOutputFile(absoluteOutputFile: string, content: string): void {
  fs.writeFileSync(absoluteOutputFile, content, { encoding: 'utf8', flag: 'wx' });
}

function main(): void {
  const [, , inputPath, outputDir] = process.argv;
  if (!inputPath || !outputDir) usage();

  const absoluteOutputDir = path.resolve(outputDir);
  assertSafeGateOutput(absoluteOutputDir);

  const parsed = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8')) as unknown;
  const input = validateApprovalGateInput(parsed);
  const gateName = input.gateName ?? input.approvalDryRunPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'approval-gate';
  const baseName = slugify(gateName);
  const gate = buildApprovalGate(input);

  fs.mkdirSync(absoluteOutputDir, { recursive: true });

  const jsonPath = path.join(absoluteOutputDir, `${baseName}.json`);
  const markdownPath = path.join(absoluteOutputDir, `${baseName}.md`);

  assertSafeGateOutputFile(jsonPath);
  assertSafeGateOutputFile(markdownPath);

  writeGateOutputFile(jsonPath, `${JSON.stringify(gate, null, 2)}\n`);
  writeGateOutputFile(markdownPath, renderApprovalGateMarkdown(gate));

  process.stdout.write(`Approval Gate JSON written: ${jsonPath}\n`);
  process.stdout.write(`Approval Gate Markdown written: ${markdownPath}\n`);
  process.stdout.write(`Apply requests: ${gate.applyRequests.length}\n`);
}

main();
