"""UNI-2640 scope oracle: the diff against origin/main IS the fast-uri bump, byte for byte.

For each of the eight files this oracle holds the exact signed diff lines the bump produces
(leading whitespace and trailing punctuation included) and requires the observed `git diff
-U0 origin/main -- <file>` to equal that multiset: no extra line, no missing line, no
whitespace variation. Any file outside the eight, or any deviation inside them, fails and
is printed.

Why exact and why presence: review round 1 (codex, 001b24b5e) planted a hostile tarball URL
and a substring rule accepted it. Round 2 (codex, 72433b7a4) reverted the pnpm 4.1.4
integrity to the 4.1.2 hash — the line then equalled base, vanished from the diff, and a
membership-only check never noticed it was missing — and added trailing spaces, which
`.strip()` erased. A control that only asks "is every changed line allowed?" cannot see an
omitted change or a whitespace change; this one asks "is the diff exactly this?".
"""
import subprocess
import sys
from collections import Counter

OLD, NEW = '4.1.2', '4.1.4'
OLD_HASH = 'sha512-TyGmBcbDTZXcb2cj5MV89DrF42DKvb3y5DDUNh95iO+IMeAzMkVSxK1PZRrRIpc9yg8U2GhGdbofNa0LS/a4Bw=='
NEW_HASH = 'sha512-dODXrIxlS9JSdgAnhIUKOosKV1oMtU2VtVw87QRaHzyl5jxO290Ii5tEZfCfzfWNHi3jKWwBSdQj0qIyshdZdQ=='


def override(indent, comma):
    c = ',' if comma else ''
    return [f'-{indent}"fast-uri": "{OLD}"{c}', f'+{indent}"fast-uri": "{NEW}"{c}']


def pnpm_lock():
    return [
        f'-  fast-uri: {OLD}', f'+  fast-uri: {NEW}',                       # overrides header
        f'-  fast-uri@{OLD}:', f'-    resolution: {{integrity: {OLD_HASH}}}',  # package block
        f'+  fast-uri@{NEW}:', f'+    resolution: {{integrity: {NEW_HASH}}}',
        f'-      fast-uri: {OLD}', f'+      fast-uri: {NEW}',               # ajv snapshot edge
        f'-  fast-uri@{OLD}: {{}}', f'+  fast-uri@{NEW}: {{}}',             # snapshot block
    ]


def npm_lock():
    return [
        f'-      "version": "{OLD}",',
        f'-      "resolved": "https://registry.npmjs.org/fast-uri/-/fast-uri-{OLD}.tgz",',
        f'-      "integrity": "{OLD_HASH}",',
        f'+      "version": "{NEW}",',
        f'+      "resolved": "https://registry.npmjs.org/fast-uri/-/fast-uri-{NEW}.tgz",',
        f'+      "integrity": "{NEW_HASH}",',
    ]


EXPECTED = {
    'apps/web/package.json': override('      ', True),
    'apps/workspace/package.json': override('      ', True),
    'packages/pi-ceo-operator-mcp/package.json': override('    ', True),
    'apps/web/.portfolio/package.json': override('    ', False),   # last entry, no comma
    'apps/web/pnpm-lock.yaml': pnpm_lock(),
    'apps/workspace/pnpm-lock.yaml': pnpm_lock(),
    'packages/pi-ceo-operator-mcp/package-lock.json': npm_lock(),
    'apps/web/.portfolio/package-lock.json': npm_lock(),
}


def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True, check=True).stdout


# The Done harness's own evidence (contract, lock, state, this oracle) lives under
# .claude/done and is committed alongside; it is not product scope.
files = sorted(f for f in git('diff', '--name-only', 'origin/main').splitlines()
               if f and not f.startswith('.claude/done/'))
if files != sorted(EXPECTED):
    print('FAIL: changed files differ from the expected eight')
    print('  extra  :', sorted(set(files) - set(EXPECTED)))
    print('  missing:', sorted(set(EXPECTED) - set(files)))
    sys.exit(1)

failed = False
total = 0
for f in files:
    observed = [line for line in git('diff', '-U0', 'origin/main', '--', f).split('\n')
                if line and line[0] in '+-' and not line.startswith(('+++', '---'))]
    total += len(observed)
    want, got = Counter(EXPECTED[f]), Counter(observed)
    if want != got:
        failed = True
        print(f'FAIL: {f} is not exactly the fast-uri {OLD} -> {NEW} bump')
        for line in sorted((got - want).elements()):
            print(f'  unexpected: {line[:160]!r}')
        for line in sorted((want - got).elements()):
            print(f'  missing   : {line[:160]!r}')

if failed:
    sys.exit(1)
if total != sum(len(v) for v in EXPECTED.values()):
    print(f'FAIL: counted {total} changed lines, expected {sum(len(v) for v in EXPECTED.values())}')
    sys.exit(1)

print(f'OK: {len(files)} files, {total} changed lines, the diff is exactly the fast-uri {OLD} -> {NEW} bump')
