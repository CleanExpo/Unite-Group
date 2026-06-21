# syntax=docker/dockerfile:1
# Stage-3 Autopilot Runner — Railway image.
FROM node:20-slim

# git: worktree/clone ops. ca-certificates: HTTPS. The runner authors via Octokit
# (no gh CLI needed) and runs the Claude CLI as the coding worker.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# The headless coding worker.
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
# Kill switch: the runner drains unless CC_LINEAR_LIVE=1 is set on the service.
CMD ["node", "dist/index.js"]
