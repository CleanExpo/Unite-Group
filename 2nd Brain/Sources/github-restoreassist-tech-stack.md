---
title: "restoreassist Tech Stack"
source: "https://github.com/CleanExpo/RestoreAssist"
repo: "CleanExpo/RestoreAssist"
file_type: "tech-stack"
captured: "2026-05-15"
tags:
  - clippings
  - github
  - restoreassist
---

# restoreassist — Tech Stack

## package.json
```
{
  "name": "restoreassist",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": "20.x",
    "npm": ">=10.0.0"
  },
  "type": "module",
  "pnpm": {
    "overrides": {
      "dompurify": "^3.4.2",
      "loader-utils": "^2.0.4",
      "tar": "^7.5.13",
      "effect": ">=3.20.0",
      "defu": ">=6.1.5",
      "nodemailer": ">=8.0.5",
      "postcss": ">=8.5.10",
      "uuid": ">=11.1.1",
      "ip-address": ">=10.1.1",
      "brace-expansion": ">=2.0.3",
      "@tootallnate/once": ">=3.0.1",
      "fast-xml-builder": ">=1.1.7",
      "fast-uri": ">=3.1.2",
      "basic-ftp": ">=5.3.1",
      "esbuild": ">=0.25.0",
      "vite": ">=6.4.2"
    },
    "auditConfig": {
      "ignoreGhsas": [
        "GHSA-hfvx-25r5-qc3w"
      ]
    }
  },
  "scripts": {
    "postinstall": "prisma generate",
    "build": "sh scripts/build.sh",
    "dev": "next dev",
    "start": "next start",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed:ceo": "npx tsx prisma/seed-ceo.ts",
    "script:grant-trial-credits": "npx tsx scripts/grant-trial-credits.ts",
    "test:smoke": "playwright test --grep @smoke",
    "test:smoke:ci": "playwright test --grep @smoke --reporter=line",
    "test:smoke:prod": "CI=true PLAYWRIGHT_BASE_URL=https://restoreassist.app playwright test --grep @smoke --reporter=line",
    "test:smoke:sandbox": "CI=true PLAYWRIGHT_BASE_URL=https://restoreassist-sandbox.vercel.app playwright test --grep @smoke --reporter=line"
  },
  "dependencies": {
    "@ai-sdk/anthropic": "^3.0.77",
    "@ai-sdk/react": "^3.0.180",
    "@anthropic-ai/sdk": "^0.95.2",
    "@aparajita/capacitor-biometric-auth": "^10.0.0",
    "@auth/prisma-adapter": "^2.11.2",
    "@capacitor-community/bluetooth-le": "^8.1.3",
    "@capacitor/android": "^8.3.3",
    "@capacitor/browser": "^8.0.1",
    "@capacitor/camera": "^8.2.0",
    "@capacitor/cli": "^8.3.3",
    "@capacitor/core": "^8.3.3",
    "@capacitor/filesystem": "^8.1.2",
    "@capacitor/geolocation": "^8.2.0",
    "@capacitor/haptics": "^8.0.2",
    "@capacitor/ios": "^8.3.3",
    "@capacitor/local-notifications": "^8.1.0",
    "@capacitor/network": "^8.0.1",
    "@capacitor/push-notifications": "^8.0.4",
    "@capacitor/share": "^8.0.1",
    "@capacitor/splash-screen": "^8.0.1",
    "@capacitor/status-bar": "^8.0.2",
    "@capgo/capacitor-social-login": "^8.3.22",
    "@google/genai": "^2.2.0",
    "@google/generative-ai": "^0.24.1",
    "@hookform/resolvers": "^5.2.2",
    "@next/bundle-analyzer": "^16.2.6",
    "@prisma/client": "^6.19.3",
    "@radix-ui/react-accordion": "1.2.12",
```
