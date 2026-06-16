/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  moduleNameMapper: {
    "^@/(.*)$": ["<rootDir>/src/$1", "<rootDir>/$1"],
    // CSS imports in components → empty module. Tests render via
    // react-dom/server which doesn't need stylesheets.
    "\\.(css|less|scss|sass)$": "<rootDir>/tests/__mocks__/style.js",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Relax some strict settings for tests to keep them concise
          strict: true,
          esModuleInterop: true,
          moduleResolution: "node",
          jsx: "react-jsx",
          paths: {
            "@/*": ["./src/*", "./*"],
          },
        },
      },
    ],
  },
  // Default jest discovery picks up every `.ts` file inside `__tests__/`.
  // Leading-underscore files there are helpers (fixtures, shared mocks, etc.)
  // imported by real tests — ignore them as discovered test files.
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "/__tests__/_"],
  // Smoke test failures block CI — no skip mechanisms
  bail: false,
};
