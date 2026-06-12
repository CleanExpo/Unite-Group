---
title: "restoreassist Tech Stack"
source: "https://github.com/CleanExpo/RestoreAssist"
repo: "CleanExpo/RestoreAssist"
file_type: "tech-stack"
captured: "2026-05-09"
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
      "@tootallnate/once": ">=3.0.1"
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
    "@ai-sdk/anthropic": "^3.0.74",
    "@ai-sdk/react": "^3.0.176",
    "@anthropic-ai/sdk": "^0.92.0",
    "@aparajita/capacitor-biometric-auth": "^10.0.0",
    "@auth/prisma-adapter": "^2.11.2",
    "@capacitor-community/bluetooth-le": "^8.1.3",
    "@capacitor/android": "^8.3.1",
    "@capacitor/browser": "^8.0.1",
    "@capacitor/camera": "^8.2.0",
    "@capacitor/cli": "^8.3.1",
    "@capacitor/core": "^8.3.1",
    "@capacitor/filesystem": "^8.1.2",
    "@capacitor/geolocation": "^8.2.0",
    "@capacitor/haptics": "^8.0.2",
    "@capacitor/ios": "^8.3.1",
    "@capacitor/local-notifications": "^8.0.2",
    "@capacitor/network": "^8.0.1",
    "@capacitor/push-notifications": "^8.0.3",
    "@capacitor/share": "^8.0.1",
    "@capacitor/splash-screen": "^8.0.1",
    "@capacitor/status-bar": "^8.0.2",
    "@capgo/capacitor-social-login": "^8.3.20",
    "@google/genai": "^1.51.0",
    "@google/generative-ai": "^0.24.1",
    "@hookform/resolvers": "^5.2.2",
    "@next/bundle-analyzer": "^16.2.4",
    "@prisma/client": "^6.19.3",
    "@radix-ui/react-accordion": "1.2.12",
    "@radix-ui/react-alert-dialog": "1.1.15",
    "@radix-ui/react-aspect-ratio": "1.1.8",
    "@radix-ui/react-avatar": "1.1.11",
    "@radix-ui/react-checkbox": "1.3.3",
    "@radix-ui/react-collapsible": "1.1.12",
```
