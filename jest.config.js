/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  moduleNameMapper: {
    "^@/(.*)$": ["<rootDir>/src/$1", "<rootDir>/$1"],
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
