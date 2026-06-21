# syntax=docker/dockerfile:1
# Stage-3 Autopilot Runner — Railway image.
FROM node:20-slim

# git: required for worktree operations. ca-certificates: HTTPS to the handoff endpoint.
# (claude CLI + gh are added with the authoring / GitHub-App slices.)
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
# Kill switch: the runner drains unless CC_LINEAR_LIVE=1 is set on the service.
CMD ["node", "dist/index.js"]
