import next from "eslint-config-next";
import typescriptEslint from "@typescript-eslint/eslint-plugin";

const eslintConfig = [
  ...next,
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      // React 19/Next 16 enables additional React Compiler diagnostics by default.
      // Keep the migration lint gate informative while existing app surfaces are fixed incrementally.
      // TODO(margot-react19): re-elevate these to errors after the migration PR lands and the
      // tracked warning surfaces are repaired in follow-up React Compiler hardening slices.
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "lib/**",
      "src/lib/innovation/**",
    ],
  },
];

export default eslintConfig;
