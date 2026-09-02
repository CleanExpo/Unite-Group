"""UNI-2640 scope oracle: the diff against origin/main is the fast-uri bump and nothing else.

Exit 0 only when (a) exactly the eight expected files differ, (b) every package.json hunk is the
fast-uri override line, and (c) every lockfile hunk names fast-uri or one of its two integrity
hashes (the 4.1.2 one going, the 4.1.4 one arriving). Any other changed line fails, printed.
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
OLD_HASH = 'TyGmBcbDTZXcb2cj5MV89DrF42DKvb3y5DDUNh95iO+IMeAzMkVSxK1PZRrRIpc9yg8U2GhGdbofNa0LS/a4Bw=='
NEW_HASH = 'dODXrIxlS9JSdgAnhIUKOosKV1oMtU2VtVw87QRaHzyl5jxO290Ii5tEZfCfzfWNHi3jKWwBSdQj0qIyshdZdQ=='


def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True, check=True).stdout


files = sorted(f for f in git('diff', '--name-only', 'origin/main').splitlines() if f)
if files != EXPECTED:
    print('FAIL: changed files differ from the expected eight')
    print('  extra  :', sorted(set(files) - set(EXPECTED)))
    print('  missing:', sorted(set(EXPECTED) - set(files)))
    sys.exit(1)

bad = []
for f in files:
    for line in git('diff', '-U0', 'origin/main', '--', f).splitlines():
        if not line or line[0] not in '+-' or line.startswith(('+++', '---')):
            continue
        body = line[1:]
        if f.endswith('package.json'):
            ok = '"fast-uri":' in body and ('"4.1.2"' in body or '"4.1.4"' in body)
        else:
            # npm locks put the package name in the block header, so the version hunk is bare.
            ok = ('fast-uri' in body or OLD_HASH in body or NEW_HASH in body
                  or body.strip() in ('"version": "4.1.2",', '"version": "4.1.4",'))
        if not ok:
            bad.append(f'{f}: {line[:160]}')

if bad:
    print('FAIL: hunks outside the fast-uri bump:')
    print('\n'.join(bad))
    sys.exit(1)

print(f'OK: {len(files)} files, every hunk is the fast-uri 4.1.2 -> 4.1.4 bump')
