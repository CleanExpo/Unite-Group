"""UNI-2640 scope oracle: the diff against origin/main is the fast-uri bump and nothing else.

Exit 0 only when (a) exactly the eight expected files differ, and (b) every changed line, in
every one of them, is one of the sixteen exact lines the bump produces (the four override
lines, and in each lock the version, the official registry tarball URL and the integrity
hash, 4.1.2 leaving and 4.1.4 arriving). Any other line fails, printed with its file.

Exact-match on purpose: review round 1 (codex, 001b24b5e) planted
https://evil.invalid/fast-uri-4.1.4.tgz as the resolved URL and the earlier substring rule
("the line mentions fast-uri") accepted it. A supply-chain change hides inside the package's
own name; only an allow-list of whole lines catches it.
"""
import subprocess
import sys

EXPECTED = sorted([
    'apps/web/.portfolio/package-lock.json',
    'apps/web/.portfolio/package.json',
    'apps/web/package.json',
    'apps/web/pnpm-lock.yaml',
    'apps/workspace/package.json',
    'apps/workspace/pnpm-lock.yaml',
    'packages/pi-ceo-operator-mcp/package-lock.json',
    'packages/pi-ceo-operator-mcp/package.json',
])
OLD, NEW = '4.1.2', '4.1.4'
OLD_HASH = 'sha512-TyGmBcbDTZXcb2cj5MV89DrF42DKvb3y5DDUNh95iO+IMeAzMkVSxK1PZRrRIpc9yg8U2GhGdbofNa0LS/a4Bw=='
NEW_HASH = 'sha512-dODXrIxlS9JSdgAnhIUKOosKV1oMtU2VtVw87QRaHzyl5jxO290Ii5tEZfCfzfWNHi3jKWwBSdQj0qIyshdZdQ=='
REGISTRY = 'https://registry.npmjs.org/fast-uri/-/fast-uri-{v}.tgz'


def allowed_lines(sign, version, digest):
    """Every whole line (whitespace-stripped) the bump may add (+) or remove (-)."""
    return {
        # package.json override pin (the last entry in a block carries no trailing comma)
        f'"fast-uri": "{version}",',
        f'"fast-uri": "{version}"',
        # pnpm-lock.yaml: overrides header, package block, importer/snapshot edges
        f'fast-uri: {version}',
        f'fast-uri@{version}:',
        f'fast-uri@{version}: {{}}',
        f'resolution: {{integrity: {digest}}}',
        # package-lock.json: the fast-uri node
        f'"version": "{version}",',
        f'"resolved": "{REGISTRY.format(v=version)}",',
        f'"integrity": "{digest}",',
    }


ALLOWED = {
    '-': allowed_lines('-', OLD, OLD_HASH),
    '+': allowed_lines('+', NEW, NEW_HASH),
}


def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True, check=True).stdout


# The Done harness's own evidence (contract, lock, state, this oracle) lives under
# .claude/done and is committed alongside; it is not product scope.
files = sorted(f for f in git('diff', '--name-only', 'origin/main').splitlines()
               if f and not f.startswith('.claude/done/'))
if files != EXPECTED:
    print('FAIL: changed files differ from the expected eight')
    print('  extra  :', sorted(set(files) - set(EXPECTED)))
    print('  missing:', sorted(set(EXPECTED) - set(files)))
    sys.exit(1)

bad = []
seen = 0
for f in files:
    for line in git('diff', '-U0', 'origin/main', '--', f).splitlines():
        if not line or line[0] not in '+-' or line.startswith(('+++', '---')):
            continue
        seen += 1
        if line[1:].strip() not in ALLOWED[line[0]]:
            bad.append(f'{f}: {line[:160]}')

if bad:
    print('FAIL: hunks outside the fast-uri bump:')
    print('\n'.join(bad))
    sys.exit(1)
if seen == 0:
    print('FAIL: no changed lines seen; the diff command returned nothing to measure')
    sys.exit(1)

print(f'OK: {len(files)} files, {seen} changed lines, every one an exact line of the fast-uri {OLD} -> {NEW} bump')
