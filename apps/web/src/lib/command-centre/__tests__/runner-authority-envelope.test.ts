import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { findPosixBash, toPosixPath } from '@/test/posix-shell'
import { DELIVERY_SCOPE } from '@/lib/command-centre/delivery-types'

// A seeded, already-approved mission runs its commands through the runner's
// committed bin/ shims. Every BUILD step in mission-authority.json must reach the
// real tool; every PROTECTED action must be refused with exit 3 before it does.

const BASH = findPosixBash()

function resolveRunnerDir(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 12; i += 1) {
    const candidate = path.join(dir, 'scripts', 'nexus-runner')
    if (existsSync(path.join(candidate, 'mission-authority.json'))) return candidate
    dir = path.dirname(dir)
  }
  throw new Error('could not locate scripts/nexus-runner/mission-authority.json from test')
}

const RUNNER_DIR = resolveRunnerDir()
const AUTHORITY = JSON.parse(readFileSync(path.join(RUNNER_DIR, 'mission-authority.json'), 'utf8')) as {
  scope: string
  build: Record<string, string>
  protected: Record<string, string>
}

type Cmd = [tool: 'git' | 'gh' | 'vercel' | 'supabase', ...args: string[]]

// Build steps with a shell command. The rest are not tool-gated (see below).
const BUILD_COMMANDS: Record<string, Cmd[]> = {
  discover: [
    ['git', 'log', '--oneline', '-5'],
    ['gh', 'pr', 'view', '12'],
    ['gh', 'pr', 'checks', '12'],
    ['gh', 'run', 'view', '123', '--log-failed'],
    ['gh', 'api', 'repos/CleanExpo/Unite-Group/pulls/12'],
    ['gh', 'api', '/repos/{owner}/{repo}/pulls?state=open&per_page=50', '--paginate'],
    ['gh', 'api', '-H', 'Accept: application/vnd.github+json', 'repos/o/r/commits/abc123/check-runs'],
    ['gh', 'api', 'repos/o/r/actions/runs/123/jobs', '--jq', '.jobs[].name'],
    ['gh', '--jq', '.', 'pr', 'view', '12'],
    ['supabase', 'gen', 'types', 'typescript', '--local'],
    ['supabase', '--workdir', '/tmp', 'gen', 'types', 'typescript', '--local'],
    ['supabase', '--network-id', 'projects', 'gen', 'types', 'typescript', '--local'],
    ['git', 'push', '-u', 'origin', 'feature-x:feature-x'],
  ],
  commit: [['git', 'commit', '-m', 'feat: x (UNI-1)']],
  push_scoped_branch: [
    ['git', 'push', '-u', 'origin', 'feature-x'],
    // must not be over-blocked (Cursor review round 4): a branch that shares a tag's name,
    // and a remote that happens to be called main
    ['git', 'push', 'origin', 'feature-y'],
    ['git', 'push', 'main', 'feature-x'],
    // bundled quiet must not hide the destination check nor refuse the push (Cursor review round 7)
    ['git', 'push', '-uq', 'origin', 'feature-x'],
    ['git', 'push', '-qu', 'origin', 'feature-x'],
    ['git', 'push', '--quiet', '-u', 'origin', 'feature-x'],
  ],
  draft_pr: [
    ['gh', 'pr', 'create', '--draft', '--title', 't', '--body', 'b'],
    ['gh', 'pr', 'create', '-d', '--fill'],
    ['gh', '-R', 'CleanExpo/Unite-Group', 'pr', 'create', '--draft', '--fill'],
    // value-taking options must not turn a build step into a refusal (Cursor review round 3)
    ['gh', '--hostname', 'github.com', 'pr', 'create', '--draft', '--title', 't', '--body', 'b'],
    // an option VALUE that equals a protected word is not a command (Cursor review round 4)
    ['gh', 'pr', 'create', '--draft', '--label', 'ready', '--title', 'merge', '--body', 'b'],
    ['gh', 'pr', 'comment', '1', '--body', 'ready'],
    ['gh', 'pr', 'edit', '1', '--title', 't', '--add-label', 'ready'],
  ],
  preview_within_existing_mandate: [
    ['vercel', 'deploy'],
    ['vercel', 'deploy', '--target', 'preview'],
    ['vercel', '--scope', 'unite-group', 'deploy'],
    ['vercel', '--project', 'myapp', 'deploy'],
    ['vercel', '--scope', 'project', 'deploy'],
    ['vercel', 'inspect', 'url'],
  ],
}
const BUILD_NOT_TOOL_GATED = ['edit', 'test', 'repair', 'update_linear']

const PROTECTED_COMMANDS: Record<string, Cmd[]> = {
  merge: [
    ['gh', 'pr', 'merge', '12', '--squash'],
    ['gh', 'pr', 'merge', '12', '--auto'],
    ['gh', 'api', '-X', 'PUT', 'repos/CleanExpo/Unite-Group/pulls/12/merge'],
    ['git', 'merge', 'origin/main'],
    // a global flag before the subcommand must not hide it (Cursor review P1)
    ['gh', '-R', 'o/r', 'pr', 'merge', '1'],
    ['gh', '--repo', 'x/y', 'pr', 'merge', '1'],
    ['gh', 'api', '-XPUT', 'repos/o/r/pulls/1/merge'],
    // value-taking options that shift the subcommand (Cursor review round 2)
    ['gh', '--hostname', 'github.com', 'pr', 'merge', '1'],
    ['gh', '--jq', '.', 'pr', 'merge', '1'],
    ['gh', '--template', '{{.}}', 'pr', 'merge', '1'],
    ['gh', '-R', 'o/r', '--jq', '.', 'pr', 'merge', '1'],
    ['gh', '--hostname', 'github.com', 'api', '-XPUT', 'repos/o/r/pulls/1/merge'],
    // an unlisted value-taking option shifts the words so an allowed pair shows first;
    // only the protected-word-anywhere layer sees the merge
    ['gh', '--jq', 'pr', 'view', 'pr', 'merge', '1'],
    ['gh', '--some-unlisted-value-flag', 'pr', 'view', 'pr', 'merge', '1'],
    ['gh', 'config', 'set', 'alias.m', 'pr merge'],
    ['gh', 'm', '1'],
  ],
  mark_pr_ready: [
    ['gh', 'pr', 'ready', '12'],
    ['gh', 'pr', 'create', '--title', 't', '--body', 'b'],
    ['gh', 'pr', 'create', '--draft=false', '--fill'],
    ['gh', 'pr', 'create', '--draft', '--draft=false', '--fill'],
    ['gh', '-R', 'o/r', 'pr', 'ready', '1'],
    ['gh', '--repo', 'o/r', 'pr', 'create', '--title', 't', '--body', 'b'],
  ],
  production_deploy: [
    ['vercel', '--prod'],
    ['vercel', 'deploy', '--prod'],
    ['vercel', 'deploy', '--target=production'],
    ['vercel', 'deploy', '--target', 'production'],
    ['vercel', 'promote', 'url'],
    ['vercel', 'rollback'],
    ['vercel', 'redeploy', 'url'],
    ['git', 'push', 'origin', 'HEAD:main'],
    ['git', 'push', 'origin', 'HEAD:refs/heads/main'],
    ['git', 'push', 'origin', 'refs/heads/main:refs/heads/main'],
    ['git', '-C', '/tmp', 'push', 'origin', 'main'],
    ['vercel', '--cwd', 'x', 'promote', 'https://x.vercel.app'],
    ['vercel', '--foo', 'ls', 'promote', 'https://x.vercel.app'],
  ],
  public_publish: [
    ['gh', 'release', 'create', 'v1.0.0'],
    ['gh', '--hostname', 'github.com', 'release', 'create', 'v1'],
    ['gh', 'gist', 'create', 'notes.md', '--public'],
    ['git', 'push', 'origin', '--tags'],
    ['git', 'push', 'origin', 'tag', 'v1.0.0'],
    ['git', 'push', 'origin', 'refs/tags/v1.0.0'],
    // a tag pushed by its bare name (Cursor review round 3); the stub reports v* as tags
    ['git', 'push', 'origin', 'v1.0.0'],
    ['git', 'push', 'origin', 'v1.0.0:v1.0.0'],
  ],
  spend_expansion: [['vercel', 'domains', 'buy', 'example.com']],
  destructive_action: [
    ['git', 'push', '--force', 'origin', 'feature-x'],
    ['git', 'push', 'origin', '--delete', 'feature-x'],
    ['git', 'push', 'origin', ':feature-x'],
    ['git', 'push', '--mirror', 'origin'],
    ['git', 'reset', '--hard', 'HEAD'],
    ['git', 'branch', '-D', 'feature-x'],
    ['supabase', 'db', 'push'],
    ['supabase', 'db', 'reset', '--linked'],
    ['supabase', 'migration', 'up'],
    ['gh', 'repo', 'delete', 'CleanExpo/Unite-Group'],
    ['git', 'push', 'origin', '+feature-x'],
    ['git', 'push', 'origin', '+main'],
    ['git', 'push', 'origin', '+:refs/heads/feature'],
    ['git', '-C', '/tmp', 'push', '--force'],
    ['git', '--git-dir=.git', 'push', '--force'],
    ['git', '-c', 'push.default=simple', 'push', '--force'],
    ['git', '-c', 'alias.p=push --force', 'p'],
    ['git', 'config', 'alias.p', 'push --force'],
    ['git', 'config', 'include.path', '/tmp/evil.gitconfig'],
    ['git', '-c', 'include.path=/tmp/evil.gitconfig', 'status'],
    // a push that relies on config for its destination (Cursor review round 5): push.default=upstream
    // turned `git push origin feature-x` into a push to main
    ['git', 'push'],
    ['git', 'push', 'origin'],
    ['git', 'push', '-u', 'origin'],
    ['git', 'config', 'push.default', 'upstream'],
    ['git', 'config', '--local', 'remote.origin.push', 'refs/heads/feature-x:refs/heads/main'],
    ['git', 'config', 'remote.origin.mirror', 'true'],
    ['git', '-c', 'push.default=upstream', 'push', 'origin', 'feature-x'],
    ['git', '-c', 'PUSH.default=matching', 'push', 'origin', 'feature-x'],
    // remote-write plumbing that skips `git push` and its checks (Cursor review round 9)
    ['git', 'send-pack', 'origin', 'refs/heads/feature-x:refs/heads/main'],
    ['git', 'http-push', 'https://example.invalid/r.git', 'main'],
    ['git', 'remote-https', 'origin', 'https://github.com/CleanExpo/Unite-Group.git'],
    ['git', '-C', '.', 'send-pack', 'origin', 'main'],
    ['git', 'push', '--all', 'origin'],
    ['git', 'push', 'origin', '--all'],
    ['gh', '--template', 'x', 'repo', 'delete', 'o/r'],
    ['supabase', '--debug', 'db', 'push'],
    ['supabase', '--workdir', 'gen', 'db', 'push'],
    ['supabase', '--some-unlisted-value-flag', 'gen', 'db', 'push'],
  ],
  credential_change: [
    ['gh', 'secret', 'set', 'X'],
    ['vercel', 'env', 'add', 'X'],
    ['vercel', 'pull'],
    ['vercel', '--token', 't', 'env', 'add', 'FOO'],
    ['supabase', 'secrets', 'set', 'X=1'],
    // reading counts: a GET of secret or variable names (Cursor review round 9)
    ['gh', 'api', 'repos/CleanExpo/Unite-Group/actions/secrets'],
    ['gh', 'api', 'repos/CleanExpo/Unite-Group/actions/variables'],
    ['gh', 'api', 'repos/CleanExpo/Unite-Group/environments/Production/secrets'],
    ['gh', 'api', 'repos/CleanExpo/Unite-Group/keys'],
    ['gh', 'api', 'repos/CleanExpo/Unite-Group/hooks'],
    // the endpoint is an allow-list: spellings a deny-list missed (Cursor review round 10)
    ['gh', 'api', 'user/gpg_keys'],
    ['gh', 'api', 'user/ssh_signing_keys'],
    ['gh', 'api', 'repos/o/r/deploy_keys'],
    ['gh', 'api', 'repos/o/r/actions/SECRETS'],
    ['gh', 'api', 'repos/o/r/actions/%73ecrets'],
    ['gh', 'api', 'repos/o/r/pulls/../actions/secrets'],
    ['gh', 'api', 'https://api.github.com/repos/o/r/actions/secrets'],
    ['gh', 'api', 'repos/o/r/actions/organization-secrets'],
    ['gh', 'api', 'graphql'],
    ['gh', 'api', 'orgs/CleanExpo/secrets'],
    ['gh', 'api', 'users/someone/gpg_keys'],
  ],
  authority_change: [
    ['gh', 'api', '--method', 'PATCH', 'repos/CleanExpo/Unite-Group'],
    ['gh', 'api', 'repos/CleanExpo/Unite-Group/branches/main/protection', '-f', 'enforce_admins=false'],
    ['gh', 'repo', 'edit', '--visibility', 'public'],
    ['gh', 'workflow', 'run', 'ci.yml'],
    ['gh', 'auth', 'refresh', '-s', 'admin:org'],
    ['gh', 'alias', 'set', 'm', 'pr merge'],
    ['gh', 'extension', 'install', 'owner/gh-x'],
    // allow-lists: a subcommand nobody has listed is refused by default
    ['vercel', 'some-future-subcommand'],
    ['gh', 'some-future-subcommand'],
    ['gh', 'pr', 'some-future-subcommand'],
    ['gh', '--hostname', 'github.com', 'workflow', 'run', 'ci.yml'],
    ['gh', '--jq', '.', 'secret', 'set', 'X'],
    ['supabase', 'some-future-subcommand'],
    // behind -C the default-branch check cannot see the target repository
    ['git', '-C', '/tmp', 'push', '-u', 'origin', 'feature-x'],
    ['git', '--no-pager', 'push', '--force'],
  ],
}
const PROTECTED_NOT_TOOL_GATED = ['strategic_scope_change']

let stubDir: string
let stub: string

beforeAll(() => {
  stubDir = mkdtempSync(path.join(tmpdir(), 'runner-authority-'))
  stub = path.join(stubDir, 'stub.sh')
  writeFileSync(
    stub,
    [
      '#!/bin/sh',
      'if [ "$1" = "rev-parse" ]; then echo feature-x; exit 0; fi',
      // `show-ref --verify --quiet <ref>`: v* names are tags; feature-y is both a tag and a branch
      'if [ "$1" = "show-ref" ]; then case "$4" in refs/tags/v*|refs/tags/feature-y|refs/heads/feature-y) exit 0 ;; esac; exit 1; fi',
      // `push ... --dry-run --porcelain`: report where git would push. STUB_PUSH_DST seeds a
      // config redirect; STUB_DRY=quiet|fail seeds a dry run that shows nothing or fails.
      'for a in "$@"; do if [ "$a" = "--porcelain" ]; then',
      // like real git: quiet (--quiet, or q in a short cluster such as -uq) hides the ref lines
      '  for b in "$@"; do case "$b" in --quiet) STUB_DRY=quiet ;; --*) : ;; -*q*) STUB_DRY=quiet ;; esac; done',
      // the dry run must switch hooks off, or a pre-push hook could print a fake destination
      '  [ "${GIT_CONFIG_KEY_1:-}=${GIT_CONFIG_VALUE_1:-}" = "core.hooksPath=/dev/null" ] || { echo "HOOKS LIVE IN DRY RUN"; exit 1; }',
      '  echo "To stub-remote"',
      // a rejected dry run still prints its ref line, then exits non-zero
      '  [ "${STUB_DRY:-}" = fail ] && { printf "!\\trefs/heads/feature-x:refs/heads/feature-x\\t[rejected]\\nDone\\n"; exit 1; }',
      '  [ "${STUB_DRY:-}" = quiet ] || printf "*\\trefs/heads/feature-x:%s\\t[new branch]\\n" "${STUB_PUSH_DST:-refs/heads/feature-x}"',
      '  echo "Done"; exit 0',
      'fi; done',
      'echo "STUB_CALLED: $*"',
      'echo "PIN: ${GIT_CONFIG_KEY_0:-none}=${GIT_CONFIG_VALUE_0:-none}"',
      'exit 0',
      '',
    ].join('\n'),
  )
  chmodSync(stub, 0o755)
})

afterAll(() => {
  rmSync(stubDir, { recursive: true, force: true })
})

function run([tool, ...args]: Cmd, extraEnv: Record<string, string> = {}) {
  const shim = path.join(RUNNER_DIR, 'bin', tool)
  const real = toPosixPath(stub)
  const options = {
    encoding: 'utf8' as const,
    env: {
      ...process.env,
      ...extraEnv,
      NEXUS_RUNNER_REAL_GIT: real,
      NEXUS_RUNNER_REAL_GH: real,
      NEXUS_RUNNER_REAL_VERCEL: real,
      NEXUS_RUNNER_REAL_SUPABASE: real,
    },
  }
  return process.platform === 'win32'
    ? spawnSync(BASH as string, [toPosixPath(shim), ...args], options)
    : spawnSync(shim, args, options)
}

describe('mission-authority.json', () => {
  it('is bound to the approved delivery scope', () => {
    expect(AUTHORITY.scope).toBe(DELIVERY_SCOPE)
  })

  it('gives every build step and every protected action a decided test mapping', () => {
    expect([...Object.keys(BUILD_COMMANDS), ...BUILD_NOT_TOOL_GATED].sort()).toEqual(Object.keys(AUTHORITY.build).sort())
    expect([...Object.keys(PROTECTED_COMMANDS), ...PROTECTED_NOT_TOOL_GATED].sort()).toEqual(
      Object.keys(AUTHORITY.protected).sort(),
    )
  })
})

describe.skipIf(!BASH)('seeded accepted mission — runner shims', () => {
  it('pins push.default=current on every push, above repository config', () => {
    const r = run(['git', 'push', '-u', 'origin', 'feature-x'])
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('PIN: push.default=current')
    expect(run(['git', 'status']).stdout).toContain('PIN: none=none')
  })

  // Config can map a named branch elsewhere (a preset remote.*.push, or one pulled in by
  // include.path: Cursor review round 6). The shim asks git where the push lands.
  it.each([
    ['a config redirect to main', { STUB_PUSH_DST: 'refs/heads/main' }],
    ['a config redirect to master', { STUB_PUSH_DST: 'refs/heads/master' }],
    ['a config redirect to a tag', { STUB_PUSH_DST: 'refs/tags/v9' }],
    ['a dry run that shows no destination', { STUB_DRY: 'quiet' }],
    ['a dry run that fails', { STUB_DRY: 'fail' }],
  ])('PROTECTED: a named-branch push stops on %s', (_label, env) => {
    for (const flags of [['-u'], ['-uq'], ['-q', '-u'], ['--quiet']]) {
      const r = run(['git', 'push', ...flags, 'origin', 'feature-x'], env)
      expect(r.status).toBe(3)
      expect(r.stderr).toContain('nexus-runner: BLOCKED')
      expect(r.stdout).not.toContain('STUB_CALLED')
    }
  })

  for (const [step, cmds] of Object.entries(BUILD_COMMANDS)) {
    for (const cmd of cmds) {
      it(`BUILD ${step}: '${cmd.join(' ')}' proceeds with no stop`, () => {
        const r = run(cmd)
        expect(r.status).toBe(0)
        expect(r.stdout).toContain(`STUB_CALLED: ${cmd.slice(1).join(' ')}`)
      })
    }
  }

  for (const [action, cmds] of Object.entries(PROTECTED_COMMANDS)) {
    for (const cmd of cmds) {
      it(`PROTECTED ${action}: '${cmd.join(' ')}' stops at the boundary`, () => {
        const r = run(cmd)
        expect(r.status).toBe(3)
        expect(r.stderr).toContain('nexus-runner: BLOCKED')
        expect(r.stdout).not.toContain('STUB_CALLED')
      })
    }
  }
})
