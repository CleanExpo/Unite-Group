# One-file compatibility tombstone for any surviving hosted Linear-runner
# deployment. OWNEST and heartbeat have no runtime surface and are absent here.
FROM node:24.14.1-slim@sha256:b506e7321f176aae77317f99d67a24b272c1f09f1d10f1761f2773447d8da26c AS build

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

COPY tsconfig.json tsconfig.container.json ./
COPY src/index.ts ./src/index.ts
RUN node node_modules/typescript/bin/tsc -p tsconfig.container.json

FROM node:24.14.1-slim@sha256:b506e7321f176aae77317f99d67a24b272c1f09f1d10f1761f2773447d8da26c AS runtime

LABEL org.opencontainers.image.title="Unite-Group retired Linear runner tombstone" \
      org.opencontainers.image.description="Permanently retired; OWNEST and heartbeat have no runtime surface and are absent."

ENV NODE_ENV=production \
    HOME=/home/node

WORKDIR /app
COPY --from=build --chown=node:node /build/dist/container/index.js ./index.js

USER node
ENTRYPOINT ["node", "/app/index.js"]
