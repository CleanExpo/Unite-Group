---
title: "carsi Tech Stack"
source: "https://github.com/CleanExpo/carsi"
repo: "CleanExpo/carsi"
file_type: "tech-stack"
captured: "2026-05-19"
tags:
  - clippings
  - github
  - carsi
---

# carsi — Tech Stack

## package.json
```
{
  "name": "CARSI",
  "version": "1.0.0",
  "description": "CARSI — learning platform for courses, enrollments, and progress. Next.js, Prisma, PostgreSQL, and Stripe.",
  "author": "Philip McGurk",
  "contributors": [
    "Rana Muzamil (Technical Lead & Manager)"
  ],
  "license": "MIT",
  "private": true,
  "engines": {
    "node": "22.x",
    "npm": ">=10.0.0"
  },
  "type": "module",
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build",
    "dev": "next dev",
    "start": "prisma migrate deploy && next start",
    "start:with-course-seed": "prisma migrate deploy && npm run db:seed-courses && next start",
    "db:export-courses": "npx tsx scripts/export-courses-catalog.ts",
    "db:seed-courses": "npx tsx scripts/seed-courses-catalog.ts",
    "db:seed-wp-export": "npx tsx scripts/seed-wordpress-export-courses.ts",
    "db:seed-wp-lessons": "npx tsx scripts/seed-wordpress-lessons-wxr.ts",
    "db:set-wp-export-draft": "npx tsx scripts/set-wp-export-courses-draft.ts",
    "db:export-draft-courses-wp": "npx tsx scripts/export-draft-courses-wp-dump.ts",
    "db:seed-air-quality-docx": "npx tsx scripts/seed-air-quality-docx.ts",
    "db:seed-safety-ppe-docx": "npx tsx scripts/seed-safety-ppe-docx.ts",
    "db:seed-whs-compliance-docx": "npx tsx scripts/seed-whs-compliance-docx.ts",
    "db:seed-marketing-business-docx": "npx tsx scripts/seed-marketing-business-docx.ts",
    "db:seed-microbial-docx": "npx tsx scripts/seed-microbial-docx.ts",
    "db:seed-water-damage-txt": "npx tsx scripts/seed-water-damage-txt.ts",
    "db:seed-specialty-drying-txt": "npx tsx scripts/seed-specialty-drying-txt.ts",
    "db:seed-contents-specialty-drying-courses-txt": "npx tsx scripts/seed-contents-specialty-drying-courses-txt.ts",
    "db:seed-specialty-courses-resources-txt": "npx tsx scripts/seed-specialty-courses-resources-txt.ts",
    "db:seed-technology-inspection-tools-txt": "npx tsx scripts/seed-technology-inspection-tools-txt.ts",
    "db:seed-odour-smoke-psychro-drying-docx": "npx tsx scripts/seed-odour-smoke-psychro-drying-docx.ts",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "db:seed-phase2": "npx tsx scripts/seed-phase2-pathways-quizzes.ts",
    "test:a11y": "playwright test tests/accessibility",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:set-user-password": "npx tsx --tsconfig tsconfig.json scripts/ensure-lms-user-password.ts"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.11.3",
    "@eslint/eslintrc": "^3.3.3",
    "@playwright/test": "^1.49.1",
    "@surma/rollup-plugin-off-main-thread": "^2.2.3",
    "@tailwindcss/postcss": "^4.1.18",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "@typescript-eslint/eslint-plugin": "^8.18.0",
    "@typescript-eslint/parser": "^8.18.0",
    "autoprefixer": "^10.4.20",
    "concurrently": "^9.1.2",
    "eslint": "^9.17.0",
    "eslint-config-next": "16.1.1",
    "lint-staged": "^15.2.10",
    "postcss": "^8.4.49",
    "prettier": "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.7.2",
    "prisma": "7.6.0",
    "tailwindcss": "^4.1.18",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.2"
  },
  "overrides": {
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
```
