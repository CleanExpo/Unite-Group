import * as fs from 'fs';
import * as path from 'path';
import { buildNexusMappingNote, validateNexusMappingNoteInput } from '../src/lib/personal-intelligence/nexus-mapping-note';

function usage(): never {
  throw new Error('Usage: npx ts-node --transpile-only -O \'{"module":"commonjs","moduleResolution":"node"}\' scripts/personal-intelligence-nexus-note.ts <input-json> <output-md-under-docs/margot/personal-intelligence>');
}

function assertSafeNoteOutput(absoluteOutput: string): void {
  const safeRoot = path.resolve(process.cwd(), 'docs/margot/personal-intelligence');
  fs.mkdirSync(safeRoot, { recursive: true });
  const relative = path.relative(safeRoot, absoluteOutput);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write Nexus Mapping Note outside safe root: ${safeRoot}`);
  }

  const parent = path.dirname(absoluteOutput);
  fs.mkdirSync(parent, { recursive: true });
  const realSafeRoot = fs.realpathSync(safeRoot);
  const realParent = fs.realpathSync(parent);
  const realRelative = path.relative(realSafeRoot, realParent);

  if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
    throw new Error(`Refusing to follow Nexus Mapping Note output path outside safe root: ${safeRoot}`);
  }
}

function assertSafeNoteOutputFile(absoluteOutput: string): void {
  if (!fs.existsSync(absoluteOutput)) return;
  if (fs.lstatSync(absoluteOutput).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite Nexus Mapping Note symlink output file: ${absoluteOutput}`);
  }
  throw new Error(`Refusing to overwrite existing Nexus Mapping Note output file: ${absoluteOutput}`);
}

function main(): void {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) usage();

  const absoluteOutput = path.resolve(outputPath);
  assertSafeNoteOutput(absoluteOutput);

  const parsed = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8')) as unknown;
  const input = validateNexusMappingNoteInput(parsed);
  const note = buildNexusMappingNote(input);

  assertSafeNoteOutputFile(absoluteOutput);
  fs.writeFileSync(absoluteOutput, note.markdown, { encoding: 'utf8', flag: 'wx' });

  process.stdout.write(`Nexus Mapping Note written: ${absoluteOutput}\n`);
  process.stdout.write(`Destination: ${note.destination}; approval-required: ${note.approvalRequired ? 'yes' : 'no'}; slug: ${note.slug}\n`);
}

main();
