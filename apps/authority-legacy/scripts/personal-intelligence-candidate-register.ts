import * as fs from 'fs';
import * as path from 'path';
import {
  buildCandidateRegisterBatch,
  candidateRegisterOutputBaseName,
  renderCandidateRegisterMarkdown,
  validateCandidateRegisterPromotionInput,
} from '../src/lib/personal-intelligence/candidate-register';

function usage(): never {
  throw new Error(
    'Usage: npx ts-node --transpile-only -O \'{"module":"commonjs","moduleResolution":"node"}\' scripts/personal-intelligence-candidate-register.ts <input-json> <output-dir-under-docs/margot/personal-intelligence/candidate-register>',
  );
}

function assertSafeRegisterOutput(absoluteOutputDir: string): void {
  const safeRoot = path.resolve(process.cwd(), 'docs/margot/personal-intelligence/candidate-register');
  fs.mkdirSync(safeRoot, { recursive: true });
  const relative = path.relative(safeRoot, absoluteOutputDir);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write Candidate Register output outside safe root: ${safeRoot}`);
  }

  const existingParent = fs.existsSync(absoluteOutputDir) ? absoluteOutputDir : path.dirname(absoluteOutputDir);
  const realSafeRoot = fs.realpathSync(safeRoot);
  const realParent = fs.realpathSync(existingParent);
  const realRelative = path.relative(realSafeRoot, realParent);

  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error(`Refusing to follow Candidate Register output path outside safe root: ${safeRoot}`);
  }
}

function assertSafeRegisterOutputFile(absoluteOutputFile: string): void {
  if (fs.existsSync(absoluteOutputFile) && fs.lstatSync(absoluteOutputFile).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite Candidate Register symlink output file: ${absoluteOutputFile}`);
  }
}

function main(): void {
  const [, , inputPath, outputDir] = process.argv;
  if (!inputPath || !outputDir) usage();

  const absoluteOutputDir = path.resolve(outputDir);
  assertSafeRegisterOutput(absoluteOutputDir);

  const parsed = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8')) as unknown;
  const input = validateCandidateRegisterPromotionInput(parsed);
  const batch = buildCandidateRegisterBatch(input);
  const baseName = candidateRegisterOutputBaseName(input.sourceNotePath);

  fs.mkdirSync(absoluteOutputDir, { recursive: true });

  const jsonPath = path.join(absoluteOutputDir, `${baseName}.json`);
  const markdownPath = path.join(absoluteOutputDir, `${baseName}.md`);

  assertSafeRegisterOutputFile(jsonPath);
  assertSafeRegisterOutputFile(markdownPath);

  fs.writeFileSync(jsonPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, renderCandidateRegisterMarkdown(batch), 'utf8');

  process.stdout.write(`Candidate Register JSON written: ${jsonPath}\n`);
  process.stdout.write(`Candidate Register Markdown written: ${markdownPath}\n`);
  process.stdout.write(`Candidates: ${batch.entries.length}\n`);
}

main();
