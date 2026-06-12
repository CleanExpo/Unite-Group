import * as fs from 'fs';
import * as path from 'path';
import { buildPersonalIntelligenceReport, validatePersonalIntelligenceIntake, type PersonalIntelligenceIntake } from '../src/lib/personal-intelligence/intake-report';

function usage(): never {
  throw new Error('Usage: npx ts-node --transpile-only -O \'{"module":"commonjs","moduleResolution":"node"}\' scripts/personal-intelligence-report.ts <input-json> <output-md-under-docs/margot/personal-intelligence>');
}

function readIntake(filePath: string): PersonalIntelligenceIntake {
  const raw = fs.readFileSync(filePath, 'utf8');
  return validatePersonalIntelligenceIntake(JSON.parse(raw));
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

  const absoluteInput = path.resolve(inputPath);
  const absoluteOutput = path.resolve(outputPath);
  assertSafeReportOutput(absoluteOutput);

  const intake = readIntake(absoluteInput);
  const report = buildPersonalIntelligenceReport(intake);

  assertSafeReportOutputFile(absoluteOutput);
  fs.writeFileSync(absoluteOutput, report.markdown, { encoding: 'utf8', flag: 'wx' });

  process.stdout.write(`Personal Intelligence report written: ${absoluteOutput}\n`);
  process.stdout.write(`Items: ${report.summary.totalItems}; waste: ${report.summary.wasteItems}; approval-gated: ${report.summary.approvalGatedItems}; tasks: ${report.summary.taskCandidateCount}\n`);
}

main();
