import { readRuntimeControlPlane } from '../src/server/runtime-control-plane'

// Read-only operator receipt. It does not dispatch work or mutate a runtime.
console.log(JSON.stringify(readRuntimeControlPlane(), null, 2))
