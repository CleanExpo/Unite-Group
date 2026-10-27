/**
 * Canonical paths for monorepo governance registers (not product code).
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const REPOSITORY_ROOT = repositoryRoot;

export const GOVERNANCE = {
  sourceOfTruth: 'docs/governance/SOURCE-OF-TRUTH.md',
  northStar: 'docs/governance/NORTH-STAR.md',
  founderQueue: 'docs/governance/FOUNDER-QUEUE.md',
};

export function governancePath(relativePath) {
  return join(repositoryRoot, relativePath);
}

export const SOURCE_OF_TRUTH_PATH = governancePath(GOVERNANCE.sourceOfTruth);
export const NORTH_STAR_PATH = governancePath(GOVERNANCE.northStar);
export const FOUNDER_QUEUE_PATH = governancePath(GOVERNANCE.founderQueue);
