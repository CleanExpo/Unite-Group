import * as fs from 'fs';
import * as path from 'path';
import { buildYouTubeManualIntakeReport, type YouTubeManualIntakeInput } from '../src/lib/personal-intelligence/youtube-intake';

function usage(): never {
  throw new Error('Usage: npx ts-node --transpile-only -O \'{"module":"commonjs","moduleResolution":"node"}\' scripts/personal-intelligence-youtube-report.ts <input-json> <output-md-under-docs/margot/personal-intelligence>');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readInput(filePath: string): YouTubeManualIntakeInput {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  if (!isPlainObject(parsed)) throw new Error('Invalid YouTube manual intake: expected object');

  for (const field of ['intakeName', 'generatedAt', 'url', 'title', 'distilledSummary'] as const) {
    if (typeof parsed[field] !== 'string' || parsed[field].trim().length === 0) {
      throw new Error(`Invalid YouTube manual intake: ${field} is required`);
    }
  }

  for (const field of ['channel', 'transcript', 'operatorNote', 'operatorNotePrivacyClass'] as const) {
    if (parsed[field] !== undefined && typeof parsed[field] !== 'string') {
      throw new Error(`Invalid YouTube manual intake: ${field} must be a string when supplied`);
    }
  }

  for (const field of ['consumedForDowntime', 'alreadyKnown'] as const) {
    if (parsed[field] !== undefined && typeof parsed[field] !== 'boolean') {
      throw new Error(`Invalid YouTube manual intake: ${field} must be a boolean when supplied`);
    }
  }

  if (
    parsed.operatorNotePrivacyClass !== undefined &&
    !['public', 'personal', 'client', 'sensitive'].includes(parsed.operatorNotePrivacyClass as string)
  ) {
    throw new Error('Invalid YouTube manual intake: operatorNotePrivacyClass must be supported');
  }

  return parsed as unknown as YouTubeManualIntakeInput;
}

function assertSafeReportOutput(absoluteOutput: string): void {
  const safeRoot = path.resolve(process.cwd(), 'docs/margot/personal-intelligence');
  fs.mkdirSync(safeRoot, { recursive: true });
  const relative = path.relative(safeRoot, absoluteOutput);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write Personal Intelligence report outside safe root: ${safeRoot}`);
  }

  const parent = path.dirname(absoluteOutput);
  fs.mkdirSync(parent, { recursive: true });
  const realSafeRoot = fs.realpathSync(safeRoot);
  const realParent = fs.realpathSync(parent);
  const realRelative = path.relative(realSafeRoot, realParent);

  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error(`Refusing to follow Personal Intelligence report output path outside safe root: ${safeRoot}`);
  }
}

function assertSafeReportOutputFile(absoluteOutput: string): void {
  if (!fs.existsSync(absoluteOutput)) return;
  if (fs.lstatSync(absoluteOutput).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite Personal Intelligence report symlink output file: ${absoluteOutput}`);
  }
  throw new Error(`Refusing to overwrite existing Personal Intelligence report output file: ${absoluteOutput}`);
}

function main(): void {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) usage();

  const absoluteOutput = path.resolve(outputPath);
  assertSafeReportOutput(absoluteOutput);

  const report = buildYouTubeManualIntakeReport(readInput(path.resolve(inputPath)));
  assertSafeReportOutputFile(absoluteOutput);
  fs.writeFileSync(absoluteOutput, report.markdown, { encoding: 'utf8', flag: 'wx' });

  process.stdout.write(`Manual YouTube Personal Intelligence report written: ${absoluteOutput}\n`);
  process.stdout.write(`Items: ${report.summary.totalItems}; waste: ${report.summary.wasteItems}; approval-gated: ${report.summary.approvalGatedItems}; tasks: ${report.summary.taskCandidateCount}\n`);
}

main();
