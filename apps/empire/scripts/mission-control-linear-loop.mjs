#!/usr/bin/env node

// Permanent retirement boundary for the pre-CRM Mission Control loop. This
// file intentionally has no imports and reads no arguments, environment,
// credentials, files, subprocesses, Git state, or network resources.
console.error('[mission-control-loop] permanently retired; CRM OWNEST is authoritative.')
process.exitCode = 2
