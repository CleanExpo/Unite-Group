import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const outputRoot = path.join(repoRoot, 'docs/margot/personal-intelligence');
const scriptPath = path.join(repoRoot, 'scripts/personal-intelligence-report.ts');
const fixturePath = path.join(outputRoot, 'fixtures/phase-1a-example-intake.json');

function runReport(inputPath: string, outputPath: string): string {
  return execFileSync('npx', ['ts-node', '--transpile-only', '-O', '{"module":"commonjs","moduleResolution":"node"}', scriptPath, inputPath, outputPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

describe('personal-intelligence-report script', () => {
  it('refuses symlink and existing report outputs under the safe root', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-report-safety-'));
    const symlinkOutput = path.join(outputRoot, 'symlink-report-regression.md');
    const existingOutput = path.join(outputRoot, 'existing-report-regression.md');
    const outsideTarget = path.join(tempDir, 'outside.md');

    try {
      fs.mkdirSync(outputRoot, { recursive: true });
      fs.writeFileSync(outsideTarget, 'outside-original\n', 'utf8');
      fs.rmSync(symlinkOutput, { force: true });
      fs.symlinkSync(outsideTarget, symlinkOutput);
      fs.writeFileSync(existingOutput, 'existing-original\n', 'utf8');

      expect(() => runReport(fixturePath, symlinkOutput)).toThrow('Refusing to overwrite Personal Intelligence report symlink output file');
      expect(() => runReport(fixturePath, existingOutput)).toThrow('Refusing to overwrite existing Personal Intelligence report output file');
      expect(() => runReport(fixturePath, path.join(tempDir, 'unsafe.md'))).toThrow('Refusing to write Personal Intelligence report outside safe root');
      expect(fs.readFileSync(outsideTarget, 'utf8')).toBe('outside-original\n');
      expect(fs.readFileSync(existingOutput, 'utf8')).toBe('existing-original\n');
    } finally {
      fs.rmSync(symlinkOutput, { force: true });
      fs.rmSync(existingOutput, { force: true });
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
