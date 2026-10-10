/**
 * Autonomy-ladder enforcement at the tool-call boundary — UNI-2409.
 *
 * Every tool call a lane makes is classified into a tier before it runs:
 *
 *   L0  read / advise                        → allow, log
 *   L1  reversible, single-domain            → allow, record evidence
 *   L2  outward or cross-domain              → allow only with a verification stamp
 *   L3  merge, deploy, prod DB, secrets,
 *       spend, external publish, destructive → BLOCK pending founder/Board approval
 *
 * ## The one design decision everything rests on
 *
 * This is an ALLOW-LIST, not a deny-list.
 *
 * A deny-list of dangerous commands fails OPEN: every command the author did
 * not think of is permitted. Against an adversary — or just an LLM composing a
 * command nobody anticipated — that is not a control, it is a list of the
 * attacks someone already knew about. `git push` is easy to block; `g push`
 * where `g` is an alias, `bash deploy.sh`, `xargs git`, `eval "$CMD"` and
 * `find . -exec rm {} +` are not.
 *
 * So: a command is L0/L1 only if every executable in it is on a known-safe
 * list AND the command contains no construct that could smuggle another
 * command. Anything else escalates. Unknown does not mean safe; unknown means
 * "cannot classify", and the ticket requires failing closed on exactly that.
 *
 * The cost is false escalations — a harmless unrecognised command needs an
 * approval. That is the correct direction for the error to point.
 *
 * ## What this module does NOT do
 *
 * It classifies and decides. It never approves and never executes. Granting an
 * L3 approval is a founder action that happens elsewhere; this file only checks
 * whether a presented approval actually covers the exact action in hand.
 *
 * ## One authority, not two (UNI-2779)
 *
 * The canonical action policy is `scripts/nexus-runner/mission-authority.json`.
 * Where this gate and that policy describe the same action, the gate reads the
 * policy's class instead of restating it:
 *
 *   BUILD_CONTINUE      → L0 / L1 / L2 (never a founder question)
 *   SAFE_RELEASE        → L3 (release mandate or founder)
 *   PROTECTED_RELEASE   → L3 (founder / Board)
 *   absent from policy  → L3 (the policy's own "missing mapping escalates")
 *
 * The app cannot import a file outside its own build context (the Docker image
 * is built from `apps/workspace` alone), so `./mission-authority.json` is a
 * byte-for-byte copy guarded by a sync test that fails on any drift.
 */
import { createHash } from 'node:crypto'
import missionAuthority from './mission-authority.json' with { type: 'json' }

export type AutonomyTier = 'L0' | 'L1' | 'L2' | 'L3'

export const AUTONOMY_TIERS: readonly AutonomyTier[] = ['L0', 'L1', 'L2', 'L3']

export interface ToolCallRequest {
  /** Tool name as the CLI reports it, e.g. `Bash`, `Edit`, `WebFetch`. */
  tool: string
  /** Structured arguments as the CLI reports them. */
  input?: unknown
  /** Which adapter produced this call. */
  adapter: 'claude-code' | 'codex' | 'hermes'
  /** Identity of the request this call belongs to; scopes any approval. */
  requestId: string
}

export interface GateDecision {
  tier: AutonomyTier
  allowed: boolean
  /** Machine-readable reason. Never a bare boolean, so a block can be explained. */
  reason: string
  /** Safe to render in Mission Control: no secrets, no raw credential-bearing text. */
  safeSummary: string
  /** Set when the decision was reached by failing closed rather than by classification. */
  failedClosed?: boolean
}

// ── Tool classification ──────────────────────────────────────────────────────

/**
 * Tools that only read. `Bash` is deliberately absent: a shell is not a tool,
 * it is an arbitrary-tool factory, and is classified by its command below.
 */
// Not `Grep`: it searches every file under a directory or glob, so the gate
// sees `.` and never the credentials.json it reads (Codex review r16), and
// every mode depends on contents: matching lines disclose them directly,
// counts or matching names one guessed prefix at a time (Codex review r17).
// As an unlisted tool it needs approval. `Glob` reads names only.
const READ_ONLY_TOOLS = new Set([
  'Read',
  'Glob',
  'NotebookRead',
  'TodoRead',
  'ListMcpResources',
])

/**
 * Tools whose writes are reversible and single-domain *provided they land inside
 * the lane's own worktree*. That proviso is enforced by `classifyLaneWrite`
 * below — it used to be asserted in a reason string and checked nowhere.
 */
const LANE_LOCAL_WRITE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'TodoWrite'])

/**
 * Paths a lane write may never touch, worktree root configured or not.
 *
 * The gate re-spawns its hook from a fixed path on every tool call, so a write
 * that replaces the hook script — or the settings the hook reads — switches the
 * gate off for the remainder of the run. A control that can be disabled by the
 * thing it controls is not a control. These are matched before any containment
 * check, because a worktree that happens to contain one of them must not make
 * it writable.
 */
const SELF_PROTECTED_WRITE_PATTERNS: ReadonlyArray<{ pattern: RegExp; what: string }> = [
  // The hook entry itself (`autonomyHookPath()` resolves it from the lanes
  // module directory) and the per-run gate settings the hook reads.
  { pattern: /(^|\/)autonomy-hook\.mjs$/, what: "the gate's own hook entry" },
  // Everything the hook loads on each call: this classifier and the action
  // policy it imports. Guarding the entry file alone left the policy itself
  // writable to a lane rooted at the gate checkout (Codex review r17).
  { pattern: /(^|\/)autonomy-gate\.ts$/, what: "the gate's own classifier" },
  { pattern: /(^|\/)mission-authority\.json$/, what: "the gate's own action policy" },
  { pattern: /(^|\/)lanes\/gate(\/|$)/, what: "the gate's own per-run settings" },
  { pattern: /(^|\/)\.claude(\/|$)/, what: 'agent configuration' },
  // Codex reads hooks and config from a project `.codex/` as well as the
  // account home, so a lane writing there could change what runs before its
  // own tool calls.
  { pattern: /(^|\/)\.codex(\/|$)/, what: 'agent configuration' },
  // All of `.git`, including the `.git` file of a linked worktree. Hooks,
  // `config`, `config.worktree` and `info/` can each name a program git runs
  // on a read-only command (`core.fsmonitor`, diff drivers, textconv), and a
  // lane edits its files, never git's own metadata (Codex review r12). Not
  // `.hermes`: lane worktrees live under `~/.hermes/worktrees/`, and an early
  // draft that blocked it escalated every ordinary write.
  { pattern: /(^|\/)\.git(\/|$)/, what: 'git metadata' },
  // `.gitattributes` selects which configured diff driver or textconv program
  // git runs on a file, so a lane editing it arms a program for the next git
  // command anyone approves (Codex review r16).
  { pattern: /(^|\/)\.gitattributes$/, what: 'git attributes' },
  { pattern: /(^|\/)\.(bashrc|zshrc|profile|bash_profile|zshenv)$/, what: 'a shell startup file' },
  { pattern: /(^|\/)\.ssh(\/|$)/, what: 'SSH material' },
]

/**
 * Is `target` inside `root`?
 *
 * Lexical containment after normalisation, which resolves `..` traversal. It
 * does NOT resolve symlinks: the target of a write frequently does not exist
 * yet, so there is nothing to `realpath`, and a check that silently degrades on
 * missing files would be worse than one whose limit is stated. A symlink
 * already inside the worktree pointing out of it is therefore not caught here —
 * recorded honestly rather than implied away, and the reason this returns a
 * qualified reason string rather than claiming full containment.
 */
function isInsideRoot(target: string, root: string): boolean {
  const normalise = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '')
  const segments = (p: string): string[] => {
    const out: string[] = []
    for (const part of normalise(p).split('/')) {
      if (part === '' || part === '.') continue
      if (part === '..') out.pop()
      else out.push(part)
    }
    return out
  }
  const rootParts = segments(root)
  const targetParts = segments(target)
  if (targetParts.length < rootParts.length) return false
  return rootParts.every((part, i) => targetParts[i] === part)
}

/**
 * Maps a path to the real file it names, following symlinks. Supplied by the
 * hook, which runs on the lane's machine; the classifier itself stays pure.
 */
export type PathResolver = (target: string) => string

/**
 * True when the program the shell will start for this command word is a
 * trusted system binary. Supplied by the hook, which can see PATH and disk.
 */
export type ExecutableTrust = (word: string) => boolean

/**
 * True when `target` names an existing regular file with more than one hard
 * link. Another name for the same file can be `.env` or a file outside the
 * lane, and neither the name nor `realpath` reveals it (Codex review r21).
 * Supplied by the hook, which can stat the file.
 */
export type SharedFileCheck = (target: string) => boolean

const SHARED_FILE_REASON = 'a file with another hard-linked name the gate cannot see'

/** `target` as an absolute path, relative ones taken from `root`. */
function absoluteFrom(root: string, target: string): string {
  // Rooted, not lane-relative: `/x`, and every Windows form that names its own
  // root: `\x` (current drive), `\\server\share` (UNC), `\\?\C:\x` (device)
  // and `C:x` (drive-relative). Prefixing the lane root to any of them judged
  // a fabricated path (Codex review r19). Left as written, each fails the
  // containment check unless it really is under the root.
  if (/^[\\/]/.test(target) || /^[A-Za-z]:/.test(target)) return target
  return `${root.replace(/[\\/]+$/, '')}/${target}`
}

/**
 * The spellings a filesystem may treat as one path: as written; with Windows
 * `\\` separators as `/`; and that form lowercased, with each component's
 * trailing dots and spaces and any `:stream` suffix removed, all of which
 * Windows ignores (Codex review r13). Every guard pattern is written for `/`,
 * so a guard that saw only the raw text missed `C:\\lane\\.codex`. Matching a
 * spelling the filesystem would not alias only escalates.
 */
function pathSpellings(p: string): string[] {
  const slashed = p.replace(/\\/g, '/')
  const folded = slashed
    .toLowerCase()
    .split('/')
    .map((part, i) => {
      if (part === '.' || part === '..') return part
      const unstreamed = i === 0 && /^[a-z]:$/.test(part) ? part : part.replace(/:.*$/, '')
      return unstreamed.replace(/[. ]+$/, '')
    })
    .join('/')
  return [p, slashed, folded]
}

/** True when any spelling of `target` names credential material. */
function namesSecret(target: string): boolean {
  return pathSpellings(target).some((view) => SECRET_MARKERS.some((marker) => marker.test(view)))
}

/** True when the resolved form of `target` names credential material. */
function resolvesToSecret(target: string, resolvePath: PathResolver | undefined): boolean {
  if (!resolvePath) return false
  return namesSecret(resolvePath(target))
}

/**
 * Classify a write by WHERE it lands, not merely by which tool asked.
 *
 * Absent a configured root the tier is unchanged (L1) but the reason says so,
 * because the alternative — escalating every write on every lane that has not
 * been wired yet — is how a gate gets switched off wholesale.
 */
function classifyLaneWrite(
  tool: string,
  targets: readonly string[],
  worktreeRoot: string | undefined,
  resolvePath?: PathResolver,
): CommandClassification {
  const hasRoot = typeof worktreeRoot === 'string' && worktreeRoot.trim() !== ''
  // Every spelling of each target: as given, made absolute against the root,
  // and with symlinks followed. A link inside the worktree that points at the
  // hook, at `.codex`, or at a sibling lane is judged by where it lands.
  const views = (target: string): string[] => {
    const absolute = hasRoot ? absoluteFrom(worktreeRoot as string, target) : target
    const out = [target, absolute]
    if (resolvePath) out.push(resolvePath(absolute))
    return out.flatMap(pathSpellings)
  }
  for (const target of targets) {
    for (const guard of SELF_PROTECTED_WRITE_PATTERNS) {
      if (views(target).some((view) => guard.pattern.test(view))) {
        return {
          tier: 'L3',
          reason: `'${tool}' would write to ${guard.what}; a lane may not rewrite the controls it runs under`,
        }
      }
    }
  }
  if (!hasRoot) {
    return {
      tier: 'L1',
      reason: `'${tool}' writes a file; worktree containment NOT enforced (no lane worktree root configured)`,
    }
  }
  // A root is configured but no target was recognisable. `TodoWrite` writes a
  // task list rather than a path and legitimately has none; every other write
  // tool having none means the path sits in a field TARGET_FIELDS does not know,
  // so containment would pass by finding nothing to check — a vacuous green in
  // the one place that must not have one.
  if (targets.length === 0 && tool !== 'TodoWrite') {
    return {
      tier: 'L3',
      reason: `'${tool}' has no recognisable target path, so worktree containment cannot be checked`,
    }
  }
  const root = worktreeRoot as string
  const realRoot = resolvePath ? resolvePath(root) : root
  for (const target of targets) {
    const absolute = absoluteFrom(root, target)
    const outside =
      !isInsideRoot(absolute, root) ||
      (resolvePath !== undefined && !isInsideRoot(resolvePath(absolute), realRoot))
    if (outside) {
      return {
        tier: 'L3',
        reason: `'${tool}' targets a path outside the lane worktree; a lane-local write is only lane-local inside its own root`,
      }
    }
  }
  return {
    tier: 'L1',
    reason: resolvePath
      ? `'${tool}' writes inside the lane worktree (path containment checked; symlinks resolved)`
      : `'${tool}' writes inside the lane worktree (path containment checked; symlinks not resolved)`,
  }
}

/** Tools that reach outside the machine but commit to nothing. */
const OUTWARD_READ_TOOLS = new Set(['WebFetch', 'WebSearch'])

/** Tools whose entire purpose is an irreversible or outward commitment. */
const ALWAYS_L3_TOOLS = new Set([
  'Bash(git push)',
  'SlackPostMessage',
  'SendEmail',
  'CreatePullRequest',
  'MergePullRequest',
])

// ── Shell command classification ─────────────────────────────────────────────

/**
 * Executables that cannot change state outside the working tree.
 *
 * Kept short on purpose. Every addition widens what runs unreviewed, so a name
 * belongs here only if it is read-only in EVERY invocation — which is why
 * `git` is absent (`git push`), `npm` is absent (`npm publish`, lifecycle
 * scripts) and `find` is absent (`-exec`, `-delete`).
 */
const SAFE_EXECUTABLES = new Set([
  'ls', 'pwd', 'cat', 'head', 'tail', 'wc', 'echo', 'whoami',
  'grep', 'egrep', 'fgrep', 'stat', 'basename', 'dirname',
  'cut', 'tr', 'nl', 'seq', 'true', 'false', 'test', 'realpath',
])
// Removed by the Codex review of UNI-2409, by the rule above rather than by
// patching options: `sort` writes (-o, and temp files via -T or $TMPDIR even
// without it), `uniq IN OUT` writes, `file -C` writes, `date -s` and
// `hostname NAME` change the system, and `diff DIR DIR` prints every file the
// two directories share, `.env` included, while the gate sees two directory
// names. None is read-only in every invocation.

/**
 * Read-only subcommands of executables that are otherwise dangerous. The pair
 * must match exactly: `node --version` is safe, `node` alone is not.
 */
const SAFE_SUBCOMMANDS = new Map<string, Set<string>>([
  // No git subcommand is here. Each was removed for a side path the Codex
  // review of UNI-2409 demonstrated: `status` rewrites the index outside a
  // linked lane (r12); `remote` prints token-bearing URLs (r14); `log`, `diff`,
  // `show` and `blame` run diff drivers and textconv programs (r16); and
  // `ls-files` runs `core.fsmonitor`, whose script a lane can edit (r20).
  // Any git command can run a program named in repository config, so none is
  // read-only in every invocation. Glob, Read and `cat` still list and read.
  // npm is absent: every npm command writes its log and cache (`--cache DIR`
  // puts them anywhere), so none is read-only in every invocation (Codex
  // review r6 of UNI-2409).
  ['node', new Set(['--version', '-v'])],
])

/**
 * Read-only subcommands whose OTHER arguments can mutate. For these the whole
 * argument list must be on the allow-list: `git branch -D x` deletes a branch
 * (a mission-authority.json `destructive_action`) and used to classify L0
 * because only the subcommand word was checked. UNI-2779.
 */
const SAFE_SUBCOMMAND_ARGS = new Map<string, Set<string>>([
  [
    'git branch',
    new Set(['-a', '--all', '-r', '--remotes', '-v', '-vv', '--verbose', '-l', '--list', '--show-current', '--no-color']),
  ],
])

/**
 * Constructs that let one command become another.
 *
 * This is the heart of the control. Without it, `ls; rm -rf /` classifies on
 * `ls` and is allowed — the classic chaining bypass. Presence of any of these
 * means the command cannot be reasoned about executable-by-executable, so it
 * escalates regardless of how safe the first word looks.
 */
const SHELL_METACHARACTERS: ReadonlyArray<{ pattern: RegExp; name: string }> = [
  { pattern: /;/, name: 'command separator' },
  { pattern: /&&|\|\|/, name: 'conditional chaining' },
  { pattern: /\|/, name: 'pipe' },
  { pattern: /&(?!&)/, name: 'background execution' },
  { pattern: /\$\(|`/, name: 'command substitution' },
  // ANY dollar, not just `${...}`. The braced form was covered and the bare
  // form was not, so `echo $ANTHROPIC_API_KEY` classified L0 and ran
  // unreviewed while `echo ${ANTHROPIC_API_KEY}` escalated — the same
  // disclosure through the cheaper spelling. Positional (`$1`), special
  // (`$@`, `$*`, `$?`) and ANSI-C (`$'...'`) forms expand too, so the control
  // is "a dollar means expansion" rather than a list of expansion shapes that
  // must stay ahead of the shell. A literal dollar in a message escalates as
  // collateral; escalation asks for approval, it does not block, and that is
  // the correct direction for a gate whose stated job is stopping disclosure.
  { pattern: /\$/, name: 'parameter expansion' },
  { pattern: />|</, name: 'redirection' },
  { pattern: /\n|\r/, name: 'newline' },
  { pattern: /\\\s*$/, name: 'line continuation' },
]

/**
 * Executables that run something else, so classifying them classifies nothing.
 * `xargs git` looks like `xargs`; `eval "$CMD"` looks like `eval`.
 */
const INDIRECTION_EXECUTABLES = new Set([
  'eval', 'exec', 'source', '.', 'sh', 'bash', 'zsh', 'dash', 'ksh', 'fish',
  'env', 'xargs', 'nohup', 'nice', 'time', 'timeout', 'watch', 'sudo', 'doas',
  'su', 'ssh', 'scp', 'rsync', 'find', 'make', 'npx', 'pnpx', 'bunx', 'python',
  'python3', 'perl', 'ruby', 'node', 'deno', 'bun',
])

/**
 * Words that mark an outright irreversible or outward action.
 *
 * A marker with an `id` can be superseded by a policy mapping below — and only
 * by the exact mapping that names it. Every other marker still fires on a
 * policy-mapped command.
 */
const L3_MARKERS: ReadonlyArray<{ pattern: RegExp; reason: string; id?: string }> = [
  { pattern: /\bgit\s+push\b/, reason: 'pushes to a remote' },
  { pattern: /\bgit\s+merge\b/, reason: 'merges a branch' },
  { pattern: /\bgh\s+pr\s+(merge|create|ready)\b/, reason: 'acts on a pull request', id: 'gh-pr' },
  { pattern: /\b(vercel|railway|fly|netlify|heroku)\b/, reason: 'deploys', id: 'deploy' },
  { pattern: /\bterraform\s+(apply|destroy)\b/, reason: 'mutates infrastructure' },
  { pattern: /\bkubectl\s+(apply|delete)\b/, reason: 'mutates a cluster' },
  { pattern: /\bnpm\s+publish\b/, reason: 'publishes a package' },
  { pattern: /\brm\s+-[a-z]*[rf]/, reason: 'recursive or forced delete' },
  { pattern: /\b(drop|truncate)\s+(table|database)\b/i, reason: 'destroys data' },
  { pattern: /\bpsql\b|\bmysql\b|\bmongosh\b/, reason: 'reaches a database directly' },
  { pattern: /\b(aws|gcloud|az)\b/, reason: 'reaches a cloud control plane' },
  { pattern: /\bcurl\b|\bwget\b/, reason: 'transfers data over the network' },
  { pattern: /\bchmod\s+[0-7]*7[0-7]{2}\b/, reason: 'grants world-writable permissions' },
  { pattern: /\b(shutdown|reboot|halt|mkfs|dd)\b/, reason: 'destructive system operation' },
]

/** Paths and names that mean a secret is being read. */
const SECRET_MARKERS: ReadonlyArray<RegExp> = [
  /\.env(\.[a-z0-9_-]+)?\b/i,
  /\bid_(rsa|ed25519|ecdsa|dsa)\b/,
  /\.ssh\//,
  /\.aws\/credentials\b/,
  /\.npmrc\b/,
  /\bcredentials?\.json\b/i,
  // The CLI logins a lane runs under: Codex keeps its OAuth token in
  // `$CODEX_HOME/auth.json`, the GitHub CLI in `gh/hosts.yml`.
  /\bauth\.json\b/i,
  /\bgh\/hosts\.ya?ml\b/,
  // Standard credential stores whose names carry no secret-shaped word
  // (Codex review r17): git's credential store, netrc (`_netrc` on Windows),
  // PostgreSQL, PyPI, Docker, Kubernetes, gcloud and GnuPG.
  /(^|\/)\.git-credentials$/,
  /(^|\/)[._]netrc$/,
  /(^|\/)\.pgpass$/,
  /(^|\/)\.pypirc$/,
  /\.docker\/config\.json$/,
  /\.kube\/config$/,
  /\.config\/gcloud(\/|$)/,
  /\.gnupg(\/|$)/,
  // Git config holds remote URLs, and a URL can carry a token, the reason
  // `git remote` is blocked; a linked worktree keeps its own config.worktree
  // in the parent's .git/worktrees/<name>/ (Codex review r22). Writes to all
  // of .git were already protected; this blocks the reads.
  /(^|\/)\.git\/(worktrees\/[^/\s]+\/)?config(\.worktree)?(?=$|[\s'"])/,
  // The user and system git config can carry the same token, in a remote URL
  // or an `http.extraheader` (Codex review r23): ~/.gitconfig, /etc/gitconfig,
  // the XDG ~/.config/git/{config,credentials}, and Git for Windows' system
  // config in ProgramData.
  /(^|[\/\s'"=])\.?gitconfig(?=$|[\s'"])/,
  /(^|[\/\s'"=])\.config\/git\/(config|credentials)(?=$|[\s'"])/,
  /(^|\/)programdata\/git\/config(?=$|[\s'"])/i,
  // All of ~/.aws, not only `credentials`: `config` can hold access keys, and
  // the SSO and CLI caches hold session tokens under ordinary .json names
  // (Codex review r22).
  /(^|\/)\.aws(\/|$)/,
  // Every per-process file, not one spelling: environ holds the tokens a
  // process was started with and has aliases (`task/<tid>/environ`, Codex
  // review r10); cmdline, mem and fd/ can carry the same. The resolver turns
  // `/proc/self` into `/proc/<pid>`, so both spellings meet this rule.
  /\/proc\/(self|thread-self|\d+)(\/|$)/,
  // `\b` does NOT fire between `_` and a letter — both are word characters — so
  // the previous `\b(...)\b` form never matched the names secrets actually have:
  // ANTHROPIC_API_KEY, GITHUB_TOKEN, SUPABASE_SERVICE_ROLE_KEY. It matched only
  // a bare `token` or `api_key` standing alone, which is the spelling nobody
  // uses. Underscore and hyphen are treated as separators here, so the marker
  // fires on the real names while `tokenizer` and `passwordless` still do not
  // (the trailing class requires a non-alphanumeric or end-of-string).
  /(^|[^A-Za-z0-9])(secret|token|apikey|api[_-]?key|password)s?([^A-Za-z0-9]|$)/i,
]

export interface CommandClassification {
  tier: AutonomyTier
  reason: string
}

// ── Canonical policy (mission-authority.json) ────────────────────────────────

/** `action_classes` from the canonical policy, read — never restated here. */
export const MISSION_AUTHORITY_ACTION_CLASSES: Readonly<Record<string, string>> =
  missionAuthority.action_classes

/**
 * The tier a policy action resolves to.
 *
 * BUILD_CONTINUE is L1: the policy says no founder question, and both mapped
 * build actions are reversible (a draft PR can be closed, a preview is not
 * production). L2 is not used for them because the enforcement hook never
 * presents a verification stamp, so L2 would still block — the same false
 * interruption under a different name. Anything else, including an action the
 * policy does not know, is L3.
 */
export function tierForPolicyAction(
  action: string,
  classes: Readonly<Record<string, string>> = MISSION_AUTHORITY_ACTION_CLASSES,
): AutonomyTier {
  return Object.hasOwn(classes, action) && classes[action] === 'BUILD_CONTINUE' ? 'L1' : 'L3'
}

/**
 * Options that turn a read-only executable into a writer, a launcher, or a
 * reader of whole directory trees. An executable is on SAFE_EXECUTABLES because
 * its ordinary use only reads; these are the uses that do not. Codex review
 * r2 (UNI-2409) found `sort -o` writing `.codex/config.toml` and `grep -R`
 * reading a `.env` through a linked directory; the rest is the same audit run
 * over the whole list.
 */
function unsafeOption(executable: string, args: ReadonlyArray<string>): string | null {
  // GNU getopt and git accept any unambiguous prefix of a long option, so
  // `--out=x` is `--output=x` and `--no-ind` is `--no-index` (Codex review
  // r11). A prefix of a blocked name counts as that name; an ambiguous one
  // escalating too is the correct direction.
  const long = (...names: string[]) =>
    args.some((arg) => {
      if (!arg.startsWith('--') || arg === '--') return false
      const option = arg.split('=')[0]
      return names.some((name) => option === name || (option.length > 3 && name.startsWith(option)))
    })
  // `--files0-from`, `--files-from`, `--pathspec-from-file`: the paths come
  // out of a file, so the gate never sees them (Codex review r4, sort).
  if (
    args.some((arg) => /^--[a-z0-9-]*-from(-file)?(=|$)/.test(arg)) ||
    long('--files0-from', '--files-from', '--pathspec-from-file')
  ) {
    return 'reads a list of paths from a file the gate cannot see into'
  }
  switch (executable) {
    case 'grep':
    case 'egrep':
    case 'fgrep': {
      // An allow-list of options, not a list of the recursive ones: -r, -R,
      // -d/--directories recurse (in either spelling, Codex review r11),
      // -D, -f and every abbreviation fall outside it and escalate.
      const shortOk = new Set([...'nivclLwxFEGPHhoqsabzmABCeTUZ0123456789'])
      const longOk = new Set([
        '--color', '--colour', '--line-number', '--ignore-case', '--no-ignore-case', '--invert-match',
        '--count', '--files-with-matches', '--files-without-match', '--word-regexp', '--line-regexp',
        '--fixed-strings', '--extended-regexp', '--basic-regexp', '--perl-regexp', '--with-filename',
        '--no-filename', '--only-matching', '--quiet', '--silent', '--no-messages', '--byte-offset',
        '--max-count', '--after-context', '--before-context', '--context', '--regexp', '--text',
        '--null-data', '--initial-tab', '--null',
      ])
      for (const arg of args) {
        if (arg === '--' || !arg.startsWith('-') || arg === '-') continue
        const known = arg.startsWith('--')
          ? longOk.has(arg.split('=')[0])
          : [...arg.slice(1)].every((ch) => shortOk.has(ch))
        if (!known) return `option '${arg.split('=')[0]}' is not a known read-only grep option`
      }
      return null
    }
    default:
      return null
  }
}

/**
 * True when the command has an unquoted glob, brace or tilde expansion
 * the shell will turn into paths the gate never sees: `cat .e*` reads `.env`
 * while the text says `.e*`. Quoted patterns reach the program literally and
 * are fine (`grep 'a.*b' x`).
 */
function hasUnquotedExpansion(command: string): boolean {
  let quote: string | null = null
  // A tilde is expanded at the start of a word and, in bash, after an
  // unquoted `=` or `:`. The resolver models only `~` and `~/` (the user's
  // own home); `~name`, `~+` and `~-` name other places (Codex review r7).
  let wordStart = true
  const chars = [...command]
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]
    if (quote !== null) {
      if (ch === quote) quote = null
      wordStart = false
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      wordStart = false
      continue
    }
    // `(` covers extglob patterns such as `@(...)` and subshells.
    if ('*?[{()'.includes(ch)) return true
    if (ch === '~' && wordStart) {
      const next = chars[i + 1]
      if (next !== undefined && next !== '/' && !/\s/.test(next)) return true
    }
    wordStart = /\s/.test(ch) || ch === '=' || ch === ':'
  }
  return false
}

/**
 * Split a command into shell words, removing quotes the way the shell would.
 * Returns null on anything this does not model (backslash escapes, unterminated
 * quotes), so the caller falls back to the ordinary fail-closed path. Expansion
 * and chaining never reach here as a live construct: the metacharacter check
 * rejects them before a policy tier is returned.
 */
function shellWords(command: string): Array<string> | null {
  if (command.includes('\\')) return null
  const words: Array<string> = []
  let current = ''
  let inWord = false
  let quote: string | null = null
  for (const ch of command) {
    if (quote !== null) {
      if (ch === quote) quote = null
      else current += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      inWord = true
      continue
    }
    if (/\s/.test(ch)) {
      if (inWord) words.push(current)
      current = ''
      inWord = false
      continue
    }
    current += ch
    inWord = true
  }
  if (quote !== null) return null
  if (inWord) words.push(current)
  return words
}

/** `gh pr create` options a draft may carry. Anything else stays L3. */
const GH_PR_CREATE_VALUE_FLAGS = new Set(['--title', '-t', '--body', '-b', '--base', '-B', '--head', '-H', '--label', '-l'])
const GH_PR_CREATE_BOOLEAN_FLAGS = new Set(['--fill', '-f', '--fill-first', '--fill-verbose'])

/**
 * Exactly `gh pr create` with `--draft`/`-d` present AS A FLAG. A value flag
 * consumes the next word, so `--title --draft` is a non-draft PR titled
 * "--draft" and does not match. `--draft=false`, `--body-file`, `--repo`,
 * `--reviewer`, global options and anything unlisted do not match.
 *
 * The base must be given, and must be `main`: this repository forbids stacked
 * PRs, which merge into their feature-branch base and strand the work off
 * `main` (Codex review r24). An absent base is not safe either: gh takes a
 * per-branch `branch.<name>.gh-merge-base` before the repository default, and
 * the lane can set that (Codex review r25).
 */
function isDraftPrCreate(words: ReadonlyArray<string>): boolean {
  if (words[0] !== 'gh' || words[1] !== 'pr' || words[2] !== 'create') return false
  const isBase = (flag: string) => flag === '--base' || flag === '-B'
  let draft = false
  let mainBase = false
  for (let i = 3; i < words.length; i += 1) {
    const word = words[i]
    if (word === '--draft' || word === '-d') {
      draft = true
      continue
    }
    if (GH_PR_CREATE_BOOLEAN_FLAGS.has(word)) continue
    if (GH_PR_CREATE_VALUE_FLAGS.has(word)) {
      if (i + 1 >= words.length) return false
      if (isBase(word) && words[i + 1] !== 'main') return false
      if (isBase(word)) mainBase = true
      i += 1
      continue
    }
    const eq = word.indexOf('=')
    if (word.startsWith('--') && eq > 0 && GH_PR_CREATE_VALUE_FLAGS.has(word.slice(0, eq))) {
      if (isBase(word.slice(0, eq)) && word.slice(eq + 1) !== 'main') return false
      if (isBase(word.slice(0, eq))) mainBase = true
      continue
    }
    return false
  }
  return draft && mainBase
}

/**
 * Exactly `vercel` or `vercel deploy`, optionally `--target preview` /
 * `--target=preview` / `--prebuilt`. No `--prod`, no production target, no
 * other subcommand (promote, rollback, redeploy, alias, env, domains, pull …),
 * no `--yes` (which can create and link a new project), no scope/token/cwd.
 */
function isVercelPreviewDeploy(words: ReadonlyArray<string>): boolean {
  if (words[0] !== 'vercel') return false
  let i = words[1] === 'deploy' ? 2 : 1
  for (; i < words.length; i += 1) {
    const word = words[i]
    if (word === '--target=preview' || word === '--prebuilt') continue
    if (word === '--target' && words[i + 1] === 'preview') {
      i += 1
      continue
    }
    return false
  }
  return true
}

/**
 * Shell commands that ARE a named policy action. `supersedes` is the one L3
 * marker id the mapping replaces; the tier comes from the policy, not from here.
 */
const POLICY_COMMAND_MAPPINGS: ReadonlyArray<{
  action: string
  supersedes: string
  matches: (words: ReadonlyArray<string>) => boolean
}> = [
  { action: 'draft_pr', supersedes: 'gh-pr', matches: isDraftPrCreate },
  { action: 'preview_within_existing_mandate', supersedes: 'deploy', matches: isVercelPreviewDeploy },
]

/** Policy action names this gate maps shell commands to. */
export const POLICY_MAPPED_ACTIONS: ReadonlyArray<string> = POLICY_COMMAND_MAPPINGS.map((m) => m.action)

function matchPolicyCommand(command: string): (typeof POLICY_COMMAND_MAPPINGS)[number] | null {
  const words = shellWords(command)
  if (words === null) return null
  return POLICY_COMMAND_MAPPINGS.find((mapping) => mapping.matches(words)) ?? null
}

/**
 * Classify a shell command string.
 *
 * Order matters: an explicit L3 marker wins over everything, because
 * `ls && git push` must not be rescued by looking safe at the front. Then
 * anything that could smuggle a second command escalates. Only a single,
 * fully-recognised, metacharacter-free command can reach L0/L1.
 */
export function classifyShellCommand(
  command: unknown,
  resolvePath?: PathResolver,
  trustExecutable?: ExecutableTrust,
  isSharedFile?: SharedFileCheck,
): CommandClassification {
  if (typeof command !== 'string' || command.trim() === '') {
    return { tier: 'L3', reason: 'command is missing or not a string; cannot classify' }
  }
  const trimmed = command.trim()
  const policyMatch = matchPolicyCommand(trimmed)

  for (const marker of L3_MARKERS) {
    if (policyMatch !== null && marker.id === policyMatch.supersedes) continue
    if (marker.pattern.test(trimmed)) {
      return { tier: 'L3', reason: `command ${marker.reason}` }
    }
  }
  for (const marker of SECRET_MARKERS) {
    if (marker.test(trimmed)) {
      return { tier: 'L3', reason: 'command references credential material' }
    }
  }
  for (const meta of SHELL_METACHARACTERS) {
    if (meta.pattern.test(trimmed)) {
      return {
        tier: 'L3',
        reason: `command contains a ${meta.name}; a chained command cannot be classified from its first word`,
      }
    }
  }

  const words = trimmed.split(/\s+/)
  // `FOO=bar cmd` — an assignment prefix hides the real executable, and can set
  // PATH or LD_PRELOAD to redirect a name that looks safe.
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0] ?? '')) {
    return { tier: 'L3', reason: 'command is prefixed with an environment assignment' }
  }

  // The name is only a name: `lane/cat` is whatever script the lane wrote
  // there (Codex review r8). With the hook's check, the program PATH or the
  // path resolves to must be a system binary; without it, an explicit path is
  // not trusted at all. Checked before the policy mappings too, or a lane's
  // own `gh` script runs as the draft-PR action (Codex review r9).
  const firstWord = words[0] ?? ''
  const trusted = trustExecutable ? trustExecutable(firstWord) : !firstWord.includes('/')
  if (!trusted) {
    return { tier: 'L3', reason: `'${firstWord}' does not resolve to a trusted system program` }
  }

  // Reached only after every credential, chaining, env-prefix and executable
  // check passed.
  if (policyMatch !== null) {
    const policyClass = MISSION_AUTHORITY_ACTION_CLASSES[policyMatch.action] ?? '(absent)'
    return {
      tier: tierForPolicyAction(policyMatch.action),
      reason: `mission-authority.json classes '${policyMatch.action}' as ${policyClass}`,
    }
  }

  const executable = (words[0] ?? '').split('/').pop() ?? ''
  if (executable === '') {
    return { tier: 'L3', reason: 'command has no resolvable executable' }
  }
  if (INDIRECTION_EXECUTABLES.has(executable)) {
    return {
      tier: 'L3',
      reason: `'${executable}' runs another command, so classifying it classifies nothing`,
    }
  }
  if (hasUnquotedExpansion(trimmed)) {
    return { tier: 'L3', reason: 'command has an unquoted glob or brace expansion; the paths it reads cannot be checked' }
  }
  // Operands as the program receives them, quotes removed: `cat 'readme.txt'`
  // must be checked as `readme.txt` (Codex review r2).
  const argv = shellWords(trimmed)
  if (argv === null) {
    return { tier: 'L3', reason: 'command uses quoting the gate does not model; its operands cannot be checked' }
  }
  const unsafe = unsafeOption(executable, argv.slice(1))
  if (unsafe !== null) {
    return { tier: 'L3', reason: `'${executable}' with these options ${unsafe}` }
  }
  // A read-only command still discloses whatever file it is pointed at. The
  // text check above sees `readme.txt`; the resolver sees the `.env` it links
  // to. Every word is checked whole, dash-prefixed ones too: after `--` a
  // program reads `-notes.txt` as a file, and the gate does not model where
  // each program's options end (Codex review r18). A `--opt=value` is also
  // checked by its value.
  const operandPaths = argv.slice(1).flatMap((word) => {
    const eq = word.startsWith('-') ? word.indexOf('=') : -1
    return eq > 0 ? [word, word.slice(eq + 1)] : [word]
  })
  if (operandPaths.some((word) => word !== '' && resolvesToSecret(word, resolvePath))) {
    return { tier: 'L3', reason: 'command reads a path that resolves to credential material' }
  }
  if (isSharedFile && operandPaths.some((word) => word !== '' && isSharedFile(word))) {
    return { tier: 'L3', reason: `command reads ${SHARED_FILE_REASON}` }
  }
  if (SAFE_EXECUTABLES.has(executable)) {
    return { tier: 'L0', reason: `'${executable}' is a known read-only command` }
  }
  const subcommands = SAFE_SUBCOMMANDS.get(executable)
  if (subcommands) {
    const subcommand = words[1] ?? ''
    const allowedArgs = SAFE_SUBCOMMAND_ARGS.get(`${executable} ${subcommand}`)
    if (allowedArgs && !words.slice(2).every((arg) => allowedArgs.has(arg))) {
      return {
        tier: 'L3',
        reason: `'${executable} ${subcommand}' with these arguments can mutate; only listed read-only arguments are allowed`,
      }
    }
    if (subcommands.has(subcommand)) {
      return { tier: 'L0', reason: `'${executable} ${subcommand}' is a known read-only command` }
    }
    return {
      tier: 'L3',
      reason: `'${executable} ${subcommand || '(no subcommand)'}' is not a known read-only subcommand`,
    }
  }
  // The whole point: unrecognised is not safe.
  return {
    tier: 'L3',
    reason: `'${executable}' is not on the known-safe list; unrecognised commands are not assumed safe`,
  }
}

// ── Tool-call classification ─────────────────────────────────────────────────

function readCommand(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return undefined
  return (input as Record<string, unknown>).command
}

/**
 * Every field of a tool input that can name a file the tool will READ.
 *
 * `glob` and `pattern` are here because a content-returning tool takes its
 * target as a pattern, not a path: `Grep {glob: '**‍/.env'}` reads exactly the
 * files a path check would have caught, and returns their matching lines. A
 * live probe found that hole — the model, once blocked from `Read`, proposed a
 * grep of the same file as its first workaround.
 */
const TARGET_FIELDS = [
  'file_path',
  'path',
  'notebook_path',
  'filePath',
  'glob',
  'pattern',
  'paths',
] as const

function readTargets(input: unknown): string[] {
  if (typeof input !== 'object' || input === null) return []
  const record = input as Record<string, unknown>
  const targets: string[] = []
  for (const key of TARGET_FIELDS) {
    const value = record[key]
    if (typeof value === 'string') targets.push(value)
    else if (Array.isArray(value)) {
      for (const entry of value) if (typeof entry === 'string') targets.push(entry)
    }
  }
  return targets
}

/**
 * Tools that return file CONTENT rather than merely file names.
 *
 * The distinction matters: `Glob` pointed at a secret pattern discloses that a
 * file exists, which is reconnaissance; `Grep` pointed at the same pattern
 * discloses the lines inside it, which is the disclosure the gate exists to
 * stop. Only the second is escalated on a secret-shaped target.
 */
const CONTENT_RETURNING_TOOLS = new Set([
  'Read',
  'Grep',
  'NotebookRead',
  'Edit',
  'Write',
  'NotebookEdit',
])

/**
 * The paths a Codex `apply_patch` touches, read from its patch headers.
 *
 * Codex sends the whole patch as `tool_input.command`; every file it adds,
 * updates, deletes or moves to is named on its own header line. Returns null
 * when the input is not a patch or names no file: a write whose targets cannot
 * be read must not pass containment by having nothing to check.
 */
// Leading whitespace is accepted: matching more header lines can only add
// targets to check, never remove one.
const PATCH_TARGET = /^\s*\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+)$/

function readPatchTargets(input: unknown): string[] | null {
  const patch = readCommand(input)
  if (typeof patch !== 'string' || !patch.includes('*** Begin Patch')) return null
  const targets: string[] = []
  for (const line of patch.split(/\r?\n/)) {
    const match = PATCH_TARGET.exec(line)
    if (match) targets.push(match[1].trim())
  }
  return targets.length > 0 ? targets : null
}

/** Classify any tool call. Unknown tools fail closed to L3. */
export function classifyToolCall(
  request: ToolCallRequest,
  options: Pick<GateOptions, 'worktreeRoot' | 'resolvePath' | 'trustExecutable' | 'isSharedFile'> = {},
): CommandClassification {
  const tool = typeof request.tool === 'string' ? request.tool.trim() : ''
  if (tool === '') {
    return { tier: 'L3', reason: 'tool name is missing; cannot classify' }
  }
  if (ALWAYS_L3_TOOLS.has(tool)) {
    return { tier: 'L3', reason: `'${tool}' is an irreversible or outward action` }
  }
  if (tool === 'Bash' || tool === 'Shell' || tool === 'Terminal') {
    return classifyShellCommand(
      readCommand(request.input),
      options.resolvePath,
      options.trustExecutable,
      options.isSharedFile,
    )
  }
  if (tool === 'apply_patch') {
    const targets = readPatchTargets(request.input)
    if (targets === null) {
      return { tier: 'L3', reason: "'apply_patch' names no file it could be checked against" }
    }
    for (const target of targets) {
      if (namesSecret(target)) {
        return { tier: 'L3', reason: 'tool targets credential material' }
      }
      if (resolvesToSecret(target, options.resolvePath)) {
        return { tier: 'L3', reason: 'tool targets a path that resolves to credential material' }
      }
      if (options.isSharedFile?.(target)) {
        return { tier: 'L3', reason: `tool targets ${SHARED_FILE_REASON}` }
      }
    }
    return classifyLaneWrite(tool, targets, options.worktreeRoot, options.resolvePath)
  }

  if (CONTENT_RETURNING_TOOLS.has(tool)) {
    for (const target of readTargets(request.input)) {
      if (namesSecret(target)) {
        return { tier: 'L3', reason: 'tool targets credential material' }
      }
      if (resolvesToSecret(target, options.resolvePath)) {
        return { tier: 'L3', reason: 'tool targets a path that resolves to credential material' }
      }
      if (options.isSharedFile?.(target)) {
        return { tier: 'L3', reason: `tool targets ${SHARED_FILE_REASON}` }
      }
    }
  }

  if (READ_ONLY_TOOLS.has(tool)) return { tier: 'L0', reason: `'${tool}' only reads` }
  if (LANE_LOCAL_WRITE_TOOLS.has(tool)) {
    return classifyLaneWrite(tool, readTargets(request.input), options.worktreeRoot, options.resolvePath)
  }
  if (OUTWARD_READ_TOOLS.has(tool)) {
    return { tier: 'L2', reason: `'${tool}' reaches outside the machine` }
  }
  // An MCP tool, a plugin, a tool added in a CLI upgrade: all unknown, all
  // escalated. A gate that permits what it has never seen is not a gate.
  return {
    tier: 'L3',
    reason: `'${tool}' is not a classified tool; unrecognised tools are not assumed safe`,
  }
}

// ── Approvals ────────────────────────────────────────────────────────────────

export interface ApprovalGrant {
  /** The request this approval was granted for. */
  requestId: string
  /** Hash of the exact action approved. */
  actionHash: string
  /** Who granted it. */
  grantedBy: string
  /** Epoch ms after which the grant is no longer valid. */
  expiresAt: number
}

/**
 * Fingerprint the exact action.
 *
 * Includes the tool, the adapter and the full argument payload, so an approval
 * for `Bash{command:"git push origin feature"}` cannot be replayed for
 * `Bash{command:"git push origin main --force"}`. Approving a *class* of action
 * is precisely the hole this closes.
 */
export function actionHash(request: ToolCallRequest): string {
  const canonical = JSON.stringify({
    tool: request.tool,
    adapter: request.adapter,
    input: stableSort(request.input),
  })
  return createHash('sha256').update(canonical).digest('hex')
}

/** Stable key ordering, so argument order cannot change the fingerprint. */
function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSort)
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) out[key] = stableSort(record[key])
    return out
  }
  return value
}

export interface GateOptions {
  /** Approvals presented for this call. Absent means none. */
  approvals?: readonly ApprovalGrant[]
  /** True when an L2 verification stamp is present for this action. */
  verificationStamp?: boolean
  /**
   * Absolute path of the lane's worktree. When present, a lane-local write
   * outside it escalates to L3. When absent, containment is not enforced and
   * the decision reason says so rather than asserting a check that did not run.
   */
  worktreeRoot?: string
  /**
   * Follows symlinks to the real file. When present, secret and containment
   * checks also run on the resolved path, so a link with an innocent name
   * cannot carry a read or a write past them.
   */
  resolvePath?: PathResolver
  /** Decides whether a command word starts a trusted system program. */
  trustExecutable?: ExecutableTrust
  /** Says whether a target is an existing file with more than one hard link. */
  isSharedFile?: SharedFileCheck
  now?: () => number
}

/**
 * Decide whether a tool call may execute.
 *
 * Never throws: a gate that can throw is a gate that can be crashed open. Any
 * internal failure resolves to a blocked L3 decision marked `failedClosed`.
 */
export function evaluateToolCall(
  request: ToolCallRequest,
  options: GateOptions = {},
): GateDecision {
  const now = options.now ?? (() => Date.now())
  try {
    if (!request || typeof request.requestId !== 'string' || request.requestId.trim() === '') {
      return {
        tier: 'L3',
        allowed: false,
        reason: 'request identity is missing; an action with no request cannot be approved or audited',
        safeSummary: 'blocked: unidentified request',
        failedClosed: true,
      }
    }

    const { tier, reason } = classifyToolCall(request, {
      worktreeRoot: options.worktreeRoot,
      resolvePath: options.resolvePath,
      trustExecutable: options.trustExecutable,
      isSharedFile: options.isSharedFile,
    })
    const summary = safeSummary(request, tier)

    if (tier === 'L0' || tier === 'L1') {
      return { tier, allowed: true, reason, safeSummary: summary }
    }

    if (tier === 'L2') {
      if (options.verificationStamp === true) {
        return { tier, allowed: true, reason: `${reason}; verification stamp present`, safeSummary: summary }
      }
      return {
        tier,
        allowed: false,
        reason: `${reason}; L2 requires a verification stamp`,
        safeSummary: summary,
      }
    }

    const hash = actionHash(request)
    const grant = (options.approvals ?? []).find(
      (candidate) =>
        candidate.requestId === request.requestId &&
        candidate.actionHash === hash &&
        candidate.expiresAt > now(),
    )
    if (grant) {
      return {
        tier,
        allowed: true,
        reason: `${reason}; approved by ${grant.grantedBy} for this exact action`,
        safeSummary: summary,
      }
    }
    return {
      tier,
      allowed: false,
      reason: `${reason}; L3 requires founder or Board approval scoped to this exact action`,
      safeSummary: summary,
    }
  } catch (error) {
    return {
      tier: 'L3',
      allowed: false,
      reason: `classification failed (${error instanceof Error ? error.name : 'unknown'}); failing closed`,
      safeSummary: 'blocked: classification unavailable',
      failedClosed: true,
    }
  }
}

/**
 * A one-line description safe to render in Mission Control.
 *
 * Deliberately does NOT include the argument payload: a blocked call is often
 * blocked precisely because it touches credential material, and echoing the
 * command into the dashboard would leak the thing the block was protecting.
 */
export function safeSummary(request: ToolCallRequest, tier: AutonomyTier): string {
  const tool = typeof request?.tool === 'string' && request.tool.trim() !== '' ? request.tool : 'unknown tool'
  return `${tier} · ${tool} · ${request?.adapter ?? 'unknown adapter'}`
}
