import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

const typecheckOnly = process.argv.includes('--typecheck.only');

/**
 * Vitest Configuration — Unite-Group Nexus 2.0
 *
 * Unit + integration tests for all Nexus 2.0 source files.
 * E2E tests use Playwright (playwright.config.ts).
 */

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    typecheck: { include: ['**/*.test-d.ts'], tsconfig: './tsconfig.typetest.json' },
    environment: 'node',
    // Vitest 3 does not pass the CLI typecheck flags into inline projects.
    projects: typecheckOnly ? undefined : [
      {
        extends: true,
        test: {
          name: 'node',
          typecheck: { include: ['**/*.test-d.ts'], tsconfig: './tsconfig.typetest.json' },
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/components/**/*.test.ts', 'src/**/*.test.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx', 'src/components/**/*.test.ts'],
        },
      },
    ],
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      'external/**',
      '**/tests/**',                          // v1 legacy test suite — references deleted modules
      '**/*.spec.ts',                         // Playwright E2E — use `pnpm playwright test` instead
      '**/e2e/**',
      'apps/web/**',                          // apps/web has its own @/ alias (apps/web root), incompatible with root config
      'packages/veritas-kanban-mcp/web/**',   // separate package with own vitest.config.ts
      'NodeJS-Starter-V1/**',                 // separate project — has its own test setup
      '.claude/worktrees/**',                 // git worktrees — each runs tests against its own src/
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      include: [
        'src/lib/**/*.ts',
        'src/app/api/**/*.ts',
        'src/components/ui/**/*.tsx',
        'src/hooks/**/*.ts',
      ],
      exclude: [
        'node_modules/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/types.ts',
        '**/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    // More specific than `@` → `src/` (otherwise `@/public/*` resolves to `src/public/*`).
    alias: [
      { find: '@/public', replacement: path.resolve(__dirname, 'src/components/public') },
      { find: '@/founder', replacement: path.resolve(__dirname, 'src/components/founder') },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
      { find: '@config', replacement: path.resolve(__dirname, 'config') },
    ],
  },
});
