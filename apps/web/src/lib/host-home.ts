// The host user's home directory, for modules that read machine-local files.
//
// Deliberately NOT os.homedir(). @vercel/nft folds os.homedir() to a literal
// while tracing the build, and when the resulting path is only partially static
// — the usual shape, `path.join(home, ...)` feeding a readFile — it backtracks
// and emits a glob of the whole resolved directory. On Windows that glob
// enumerates %LOCALAPPDATA%, which holds the self-referential "Application
// Data" compatibility junction, and scandir fails EPERM:
//
//   EPERM: operation not permitted, scandir
//   'C:\Users\<user>\AppData\Local\Application Data'
//
// `next build` then dies before it compiles — on Windows only. Linux has no
// such junction, so CI stays green while every Windows build breaks, which is
// what made this expensive to find the first time.
//
// process.env reads are opaque to the tracer, so paths built on this helper are
// never traced. That opacity is the intent, not a workaround: these callers
// read host-machine files that must never be traced into a deployment bundle.
//
// USERPROFILE is checked before HOME, unlike the command-centre tile readers:
// under Git Bash on Windows HOME is an MSYS path (`/c/Users/...`) that Node's
// fs cannot resolve, while USERPROFILE is always the native one.
//
// Returns '' when neither is set. Callers must treat that as "no home-based
// candidate" rather than joining onto an empty string, which would silently
// produce a relative path.
export function hostHome(): string {
  return process.env.USERPROFILE?.trim() || process.env.HOME?.trim() || ''
}

/**
 * Modules that must never fold a literal home directory into a traced path.
 *
 * Guarded by src/lib/__tests__/host-home.test.ts. Add a module here when it
 * starts reading machine-local files via this helper.
 */
export const HOME_OPAQUE_MODULES = [
  'src/lib/host-home.ts',
  'src/lib/command-centre/tools/catalogue.ts',
  'src/lib/wiki/ingest.ts',
] as const
