---
title: "ccw-crm Tech Stack"
source: "https://github.com/CleanExpo/CCW-CRM"
repo: "CleanExpo/CCW-CRM"
file_type: "tech-stack"
captured: "2026-05-17"
tags:
  - clippings
  - github
  - ccw-crm
---

# ccw-crm — Tech Stack

## package.json
```
{
  "name": "ccw-online-erp",
  "version": "1.0.0",
  "private": true,
  "description": "Equipment Supplier ERP System built with Next.js",
  "author": "CCW",
  "license": "MIT",
  "scripts": {
    "setup": "bash scripts/setup.sh",
    "setup:windows": "powershell -ExecutionPolicy Bypass -File scripts/setup.ps1",
    "dev": "prisma generate && next dev --webpack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint src",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:lighthouse": "lhci autorun",
    "check": "npm run type-check && npm run lint",
    "check:all": "npm run type-check && npm run lint && npm run test",
    "clean": "rm -rf node_modules .next",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\"",
    "verify": "bash scripts/verify.sh",
    "deps:check": "npm install --package-lock-only --ignore-scripts --no-audit --no-fund",
    "deps:clean": "npm run clean && npm install",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@composio/core": "^0.6.3",
    "@composio/openai-agents": "^0.6.3",
    "@hookform/resolvers": "^3.9.1",
    "@openai/agents": "^0.4.10",
    "@prisma/adapter-pg": "^7.7.0",
    "@prisma/client": "^7.7.0",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-avatar": "^1.1.2",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.4",
    "@radix-ui/react-tooltip": "^1.1.6",
    "bcryptjs": "^3.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "dotenv": "^17.3.1",
    "framer-motion": "^12.25.0",
    "jose": "^5.10.0",
    "lucide-react": "^0.468.0",
    "mcp-linear": "^0.1.8",
    "next": "16.1.6",
    "next-intl": "^4.8.2",
    "pg": "^8.16.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-error-boundary": "^6.1.1",
    "react-hook-form": "^7.54.1",
    "react-hot-toast": "^2.6.0",
    "react-markdown": "^10.1.0",
    "reactflow": "^11.11.4",
    "recharts": "^3.5.1",
    "sonner": "^2.0.7",
    "tailwind-merge": "^2.6.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
```
