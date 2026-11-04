"""IAQ board contacts check. Never prints an address.
  drafts: each of the five drafts has a To: line equal to that person's first address in the contacts file,
          names Phill McGurk, keeps the [SIGN-IN LINK] placeholder, and no draft mentions Melissa.
  repo:   no address from the contacts file appears in any file of this worktree (tracked or untracked, .git excluded).
Exit 0 = pass."""
import os
import re
import sys

CONTACTS = '/tmp/iaq-tools/board-contacts.txt'
DRAFTS = '/Users/phillmcgurk/session-handoffs/20261104-iaq-portal/drafts'
PEOPLE = {
    'shelby-berg': 'Shelby Berg', 'ivi-simms': 'Ivi Simms', 'phill-mcgurk': 'Phill McGurk',
    'muthukumar-maragathamayil': 'Muthukumar Maragathamayil', 'philipp-schluter': 'Philipp Schluter',
}
EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')


def contacts():
    text = open(CONTACTS).read()
    out = {}
    for slug, name in PEOPLE.items():
        line = next((l for l in text.splitlines() if l.startswith(name)), None)
        if line is None:
            sys.exit(f'FAIL: {name} not in contacts file')
        out[slug] = [a.lower() for a in EMAIL.findall(line)]
    return out, {a.lower() for a in EMAIL.findall(text)}


def drafts():
    want, _ = contacts()
    files = sorted(f for f in os.listdir(DRAFTS) if f.endswith('.txt'))
    if files != sorted(s + '.txt' for s in PEOPLE):
        sys.exit(f'FAIL: draft files are {files}')
    for slug, addrs in want.items():
        s = open(os.path.join(DRAFTS, slug + '.txt')).read()
        to = [l for l in s.splitlines() if l.startswith('To: ')]
        if len(to) != 1 or to[0][4:].strip() != addrs[0]:
            sys.exit(f'FAIL: {slug} To: line does not match the supplied primary address')
        if 'Phill McGurk' not in s or '[SIGN-IN LINK]' not in s or re.search('melissa|marot', s, re.I):
            sys.exit(f'FAIL: {slug} content')
    print('PASS drafts: 5 drafts, each addressed to the supplied primary address')


BASE = 'aec2c3f6edf49f1fc5a07b3e5e5cdb58e4c4c171'  # main when this branch started


def repo():
    # Scope: every file this branch adds or changes (committed, staged, unstaged or untracked) relative to BASE.
    # Phill's own address was already in 46 files at BASE; this check is about what THIS branch introduces.
    import subprocess
    _, all_addrs = contacts()
    git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True, check=True).stdout.split('\n')
    changed = {p for p in git('diff', '--name-only', BASE) + git('ls-files', '--others', '--exclude-standard') if p}
    hits = 0
    for p in sorted(changed):
        if not os.path.isfile(p):
            continue
        before = b''
        r = subprocess.run(['git', 'show', f'{BASE}:{p}'], capture_output=True)
        if r.returncode == 0:
            before = r.stdout.lower()
        data = open(p, 'rb').read().lower()
        for a in all_addrs:
            if data.count(a.encode()) > before.count(a.encode()):
                hits += 1
                print('FAIL: this branch adds an address from the contacts file to', p)
    if hits:
        sys.exit(1)
    print(f'PASS repo: {len(changed)} branch files checked, none adds any of {len(all_addrs)} supplied addresses')


{'drafts': drafts, 'repo': repo}[sys.argv[1]]()
