//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default [
  ...tanstackConfig,
  {
    // Flat config does not read .eslintignore. Keep generated/config files here.
    ignores: ['eslint.config.js', 'prettier.config.js', 'vite.config.ts'],
  },
  {
    ...tseslint.configs.disableTypeChecked,
    // JavaScript entry points are intentionally outside the TypeScript project.
    // Retain ordinary JS linting without asking the TS parser for project types.
    files: ['**/*.js'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // This opinionated rule arrived with the inherited TanStack preset while
      // 392 existing findings were unbaselined. Keep them visible without
      // allowing legacy debt to make every unrelated release impossible.
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Block client-side imports of server-only MCP input types.
    // `src/types/mcp-input.ts` may carry secret-bearing fields and must
    // never be referenced from screens or shared components.
    files: ['src/screens/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/types/mcp-input',
              message:
                'mcp-input.ts is server-only (carries unmasked secrets). Import McpClientInput from @/types/mcp instead.',
            },
          ],
          patterns: [
            {
              group: ['**/types/mcp-input', '**/types/mcp-input.ts'],
              message:
                'mcp-input.ts is server-only (carries unmasked secrets). Import McpClientInput from @/types/mcp instead.',
            },
          ],
        },
      ],
    },
  },
]
