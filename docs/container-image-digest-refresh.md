# Container image digest refresh

External container images are recorded as a human-readable tag plus an
immutable multi-platform manifest digest. The tag explains the intended release
line; the digest is the execution boundary. Never replace a digest from memory,
a search result, or an architecture-specific child manifest.

## Reviewed registry state

Resolved directly from the registries on 2026-07-12 with Docker Buildx:

| Tag | Multi-platform manifest digest |
|---|---|
| `docker/dockerfile:1` | `sha256:87999aa3d42bdc6bea60565083ee17e86d1f3339802f543c0d03998580f9cb89` |
| `docker/dockerfile:1.6` | `sha256:ac85f380a63b13dfcefa89046420e1781752bab202122f8f50032edf31be0021` |
| `node:24.14.1-slim` | `sha256:b506e7321f176aae77317f99d67a24b272c1f09f1d10f1761f2773447d8da26c` |
| `pgvector/pgvector:pg15` | `sha256:18d16372b8406bb38a9f94cbff15d125c463d71fde2770aa8b5c64bfcc1578ee` |
| `redis:7-alpine` | `sha256:6ab0b6e7381779332f97b8ca76193e45b0756f38d4c0dcda72dbb3c32061ab99` |
| `postgres:16-alpine` | `sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777` |
| `nousresearch/hermes-agent:latest` | `sha256:4f0cf12465c50a12e6a747e319794640ab87ec1ce260b1ce9070c3c8950506c8` |
| `ghcr.io/outsourc-e/hermes-workspace:latest` | `sha256:bf0fd5e65c4ec45b7f772630946b60b1b4424b586eeba08ba3afa54da43990fa` |

## Refresh procedure

1. Resolve the candidate tag from registry metadata without pulling or running
   the image:

   ```bash
   image='node:24.14.1-slim'
   digest="$(docker buildx imagetools inspect "$image" \
     --format '{{json .Manifest}}' | jq -er '.digest')"
   printf '%s@%s\n' "$image" "$digest"
   ```

2. Verify the immutable reference can still be resolved and inspect its
   platforms and source annotations:

   ```bash
   docker buildx imagetools inspect "$image@$digest"
   ```

3. Review the upstream release and base-image change. Update every occurrence
   of that tag as one change, retaining the `tag@sha256:...` form. Do not refresh
   only one of two build stages.

4. Run the static and Compose gates from the repository root:

   ```bash
   node scripts/nexus-project-readiness.mjs --root . --json
   docker compose -f apps/web/docker-compose.yml config --quiet
   docker compose -f apps/workspace/docker-compose.yml config --quiet
   docker compose -f infra/sandbox/docker-compose.yml config --quiet
   API_SERVER_KEY=test HERMES_PASSWORD=test VAULT_DIR="$PWD" \
     docker compose -f deploy/nexus-host/docker-compose.yml config --quiet
   ```

5. Build the affected Dockerfile or Compose service on the supported Node 24
   toolchain before review. Registry resolution proves identity, not application
   compatibility.

Rollback uses the previously reviewed `tag@digest` pair. Never roll back to a
floating tag.
