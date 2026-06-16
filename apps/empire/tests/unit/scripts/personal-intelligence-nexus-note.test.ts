import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const outputRoot = path.join(repoRoot, 'docs/margot/personal-intelligence');
const scriptPath = path.join(repoRoot, 'scripts/personal-intelligence-nexus-note.ts');
const fixturePath = path.join(outputRoot, 'fixtures/phase-1c-nexus-mapping-note-example.json');

function runNexusNote(inputPath: string, outputPath: string): string {
  return execFileSync('npx', ['ts-node', '--transpile-only', '-O', '{"module":"commonjs","moduleResolution":"node"}', scriptPath, inputPath, outputPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

describe('personal-intelligence-nexus-note script', () => {
  it('refuses symlink and existing note outputs under the safe root', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-nexus-note-safety-'));
    const symlinkOutput = path.join(outputRoot, 'symlink-nexus-note-regression.md');
    const existingOutput = path.join(outputRoot, 'existing-nexus-note-regression.md');
    const outsideTarget = path.join(tempDir, 'outside.md');

    try {
      fs.mkdirSync(outputRoot, { recursive: true });
      fs.writeFileSync(outsideTarget, 'outside-original\n', 'utf8');
      fs.rmSync(symlinkOutput, { force: true });
      fs.symlinkSync(outsideTarget, symlinkOutput);
      fs.writeFileSync(existingOutput, 'existing-original\n', 'utf8');

      expect(() => runNexusNote(fixturePath, symlinkOutput)).toThrow('Refusing to overwrite Nexus Mapping Note symlink output file');
      expect(() => runNexusNote(fixturePath, existingOutput)).toThrow('Refusing to overwrite existing Nexus Mapping Note output file');
      expect(() => runNexusNote(fixturePath, path.join(tempDir, 'unsafe.md'))).toThrow('Refusing to write Nexus Mapping Note outside safe root');
      expect(fs.readFileSync(outsideTarget, 'utf8')).toBe('outside-original\n');
      expect(fs.readFileSync(existingOutput, 'utf8')).toBe('existing-original\n');
    } finally {
      fs.rmSync(symlinkOutput, { force: true });
      fs.rmSync(existingOutput, { force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
