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
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  // Smoke test failures block CI — no skip mechanisms
  bail: false,
};
