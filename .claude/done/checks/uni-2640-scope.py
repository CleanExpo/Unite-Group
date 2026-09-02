"""UNI-2640 scope oracle: the diff against origin/main IS the fast-uri bump, byte for byte, hunk
headers included.

For each of the eight files, the complete output of `git diff -U0 origin/main -- <file>` (every
line except the blob-hash `index` line) must equal the expected text below, in order. The `@@`
hunk headers carry line numbers and context, so a required line that moves to a different place
in the file — the round-4 attack: fast-uri's version/resolved/integrity relocated into another
package's object — changes the header and fails, even though the +/- lines are identical.

History, each shape beaten by an independent reviewer or the builder before the next:
  round 1 (001b24b5e)  substring "fast-uri" in a changed line       -> hostile tarball URL passed
  round 2 (72433b7a4)  allow-list of stripped changed lines         -> omitted line invisible; trailing spaces passed
  builder (f30e628d9)  byte-exact via text-mode subprocess          -> CRLF translated away
  round 3 (0098c71b0)  per-file multiset equality                   -> reordered npm fields passed
  round 4 (2aaee2b2e)  per-file ordered equality of +/- lines only  -> same lines relocated to another object passed
  now                  per-file ordered equality of the whole diff, hunk headers included

The expected text was captured from the verified head and reviewed by the same rounds that
confirmed the product diff; regenerating it is a change of scope and must be reviewed as one.
"""
import subprocess
import sys

EXPECTED = {
    "apps/web/package.json": [
        "diff --git a/apps/web/package.json b/apps/web/package.json",
        "--- a/apps/web/package.json",
        "+++ b/apps/web/package.json",
        "@@ -188 +188 @@",
        "-      \"fast-uri\": \"4.1.2\",",
        "+      \"fast-uri\": \"4.1.4\","
    ],
    "apps/workspace/package.json": [
        "diff --git a/apps/workspace/package.json b/apps/workspace/package.json",
        "--- a/apps/workspace/package.json",
        "+++ b/apps/workspace/package.json",
        "@@ -110 +110 @@",
        "-      \"fast-uri\": \"4.1.2\",",
        "+      \"fast-uri\": \"4.1.4\","
    ],
    "packages/pi-ceo-operator-mcp/package.json": [
        "diff --git a/packages/pi-ceo-operator-mcp/package.json b/packages/pi-ceo-operator-mcp/package.json",
        "--- a/packages/pi-ceo-operator-mcp/package.json",
        "+++ b/packages/pi-ceo-operator-mcp/package.json",
        "@@ -42 +42 @@",
        "-    \"fast-uri\": \"4.1.2\",",
        "+    \"fast-uri\": \"4.1.4\","
    ],
    "apps/web/.portfolio/package.json": [
        "diff --git a/apps/web/.portfolio/package.json b/apps/web/.portfolio/package.json",
        "--- a/apps/web/.portfolio/package.json",
        "+++ b/apps/web/.portfolio/package.json",
        "@@ -18 +18 @@",
        "-    \"fast-uri\": \"4.1.2\"",
        "+    \"fast-uri\": \"4.1.4\""
    ],
    "apps/web/pnpm-lock.yaml": [
        "diff --git a/apps/web/pnpm-lock.yaml b/apps/web/pnpm-lock.yaml",
        "--- a/apps/web/pnpm-lock.yaml",
        "+++ b/apps/web/pnpm-lock.yaml",
        "@@ -18 +18 @@ overrides:",
        "-  fast-uri: 4.1.2",
        "+  fast-uri: 4.1.4",
        "@@ -4314,2 +4314,2 @@ packages:",
        "-  fast-uri@4.1.2:",
        "-    resolution: {integrity: sha512-TyGmBcbDTZXcb2cj5MV89DrF42DKvb3y5DDUNh95iO+IMeAzMkVSxK1PZRrRIpc9yg8U2GhGdbofNa0LS/a4Bw==}",
        "+  fast-uri@4.1.4:",
        "+    resolution: {integrity: sha512-dODXrIxlS9JSdgAnhIUKOosKV1oMtU2VtVw87QRaHzyl5jxO290Ii5tEZfCfzfWNHi3jKWwBSdQj0qIyshdZdQ==}",
        "@@ -9964 +9964 @@ snapshots:",
        "-      fast-uri: 4.1.2",
        "+      fast-uri: 4.1.4",
        "@@ -11276 +11276 @@ snapshots:",
        "-  fast-uri@4.1.2: {}",
        "+  fast-uri@4.1.4: {}"
    ],
    "apps/workspace/pnpm-lock.yaml": [
        "diff --git a/apps/workspace/pnpm-lock.yaml b/apps/workspace/pnpm-lock.yaml",
        "--- a/apps/workspace/pnpm-lock.yaml",
        "+++ b/apps/workspace/pnpm-lock.yaml",
        "@@ -10 +10 @@ overrides:",
        "-  fast-uri: 4.1.2",
        "+  fast-uri: 4.1.4",
        "@@ -3460,2 +3460,2 @@ packages:",
        "-  fast-uri@4.1.2:",
        "-    resolution: {integrity: sha512-TyGmBcbDTZXcb2cj5MV89DrF42DKvb3y5DDUNh95iO+IMeAzMkVSxK1PZRrRIpc9yg8U2GhGdbofNa0LS/a4Bw==}",
        "+  fast-uri@4.1.4:",
        "+    resolution: {integrity: sha512-dODXrIxlS9JSdgAnhIUKOosKV1oMtU2VtVw87QRaHzyl5jxO290Ii5tEZfCfzfWNHi3jKWwBSdQj0qIyshdZdQ==}",
        "@@ -8655 +8655 @@ snapshots:",
        "-      fast-uri: 4.1.2",
        "+      fast-uri: 4.1.4",
        "@@ -9740 +9740 @@ snapshots:",
        "-  fast-uri@4.1.2: {}",
        "+  fast-uri@4.1.4: {}"
    ],
    "packages/pi-ceo-operator-mcp/package-lock.json": [
        "diff --git a/packages/pi-ceo-operator-mcp/package-lock.json b/packages/pi-ceo-operator-mcp/package-lock.json",
        "--- a/packages/pi-ceo-operator-mcp/package-lock.json",
        "+++ b/packages/pi-ceo-operator-mcp/package-lock.json",
        "@@ -3471,3 +3471,3 @@",
        "-      \"version\": \"4.1.2\",",
        "-      \"resolved\": \"https://registry.npmjs.org/fast-uri/-/fast-uri-4.1.2.tgz\",",
        "-      \"integrity\": \"sha512-TyGmBcbDTZXcb2cj5MV89DrF42DKvb3y5DDUNh95iO+IMeAzMkVSxK1PZRrRIpc9yg8U2GhGdbofNa0LS/a4Bw==\",",
        "+      \"version\": \"4.1.4\",",
        "+      \"resolved\": \"https://registry.npmjs.org/fast-uri/-/fast-uri-4.1.4.tgz\",",
        "+      \"integrity\": \"sha512-dODXrIxlS9JSdgAnhIUKOosKV1oMtU2VtVw87QRaHzyl5jxO290Ii5tEZfCfzfWNHi3jKWwBSdQj0qIyshdZdQ==\","
    ],
    "apps/web/.portfolio/package-lock.json": [
        "diff --git a/apps/web/.portfolio/package-lock.json b/apps/web/.portfolio/package-lock.json",
        "--- a/apps/web/.portfolio/package-lock.json",
        "+++ b/apps/web/.portfolio/package-lock.json",
        "@@ -39,3 +39,3 @@",
        "-      \"version\": \"4.1.2\",",
        "-      \"resolved\": \"https://registry.npmjs.org/fast-uri/-/fast-uri-4.1.2.tgz\",",
        "-      \"integrity\": \"sha512-TyGmBcbDTZXcb2cj5MV89DrF42DKvb3y5DDUNh95iO+IMeAzMkVSxK1PZRrRIpc9yg8U2GhGdbofNa0LS/a4Bw==\",",
        "+      \"version\": \"4.1.4\",",
        "+      \"resolved\": \"https://registry.npmjs.org/fast-uri/-/fast-uri-4.1.4.tgz\",",
        "+      \"integrity\": \"sha512-dODXrIxlS9JSdgAnhIUKOosKV1oMtU2VtVw87QRaHzyl5jxO290Ii5tEZfCfzfWNHi3jKWwBSdQj0qIyshdZdQ==\","
    ]
}


def git(*args):
    # Bytes, decoded without newline translation, so a CRLF stays visible as "\\r".
    return subprocess.run(['git', *args], capture_output=True, check=True).stdout.decode('utf-8')


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
                if line and not line.startswith('index ')]
    expected = EXPECTED[f]
    total += sum(1 for line in observed if line[0] in '+-' and not line.startswith(('+++', '---')))
    if observed != expected:
        failed = True
        print(f'FAIL: {f}: the diff against origin/main is not exactly the expected fast-uri bump')
        for i, (a, b) in enumerate(zip(observed, expected)):
            if a != b:
                print(f'  first difference at diff line {i + 1}:')
                print(f'    observed: {a[:160]!r}')
                print(f'    expected: {b[:160]!r}')
                break
        else:
            print(f'  observed has {len(observed)} diff lines, expected {len(expected)}')
        if len(observed) != len(expected):
            print(f'  line count: observed {len(observed)}, expected {len(expected)}')

if failed:
    sys.exit(1)
if total != 40:
    print(f'FAIL: counted {total} changed lines, expected 40')
    sys.exit(1)

print(f'OK: {len(files)} files, {total} changed lines, every diff equals the expected fast-uri 4.1.2 -> 4.1.4 bump, hunk headers included')
