"""Local red controls; restore exact source even when a command fails."""
import json
import os
from pathlib import Path
import subprocess

root = Path.cwd()
out = root / '.claude/done/spm/2026-10-24-enquiry-alerts'
env = dict(os.environ)
env['PATH'] = '/Users/phill-mac/.nvm/versions/node/v24.14.1/bin:/opt/homebrew/bin:/usr/bin:/bin'
records = []

def run(command, name):
    result = subprocess.run(command, cwd=root / 'apps/web', env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=180)
    (out / (name + '.log')).write_text(result.stdout)
    return result.returncode

def mutate(label, ac, file, change, commands):
    target = root / file
    original = target.read_bytes()
    backup = out / (label + '.original')
    backup.write_bytes(original)
    planted = change(original.decode())
    assert planted.encode() != original
    try:
        target.write_text(planted)
        reds = [run(command, label + '-red-' + str(index)) for index, command in enumerate(commands)]
    finally:
        target.write_bytes(original)
    cmp_exit = subprocess.run(['cmp', str(backup), str(target)]).returncode
    greens = [run(command, label + '-restored-' + str(index)) for index, command in enumerate(commands)]
    for command, red, green in zip(commands, reds, greens):
        records.append(dict(AC=ac, file=file, planted=label, command=' '.join(command), exit_under_mutant=red, exit_restored=green, cmp_exit=cmp_exit))
    (out / 'mutations-static.json').write_text(json.dumps(records, indent=2))
    assert all(code != 0 for code in reds) and all(code == 0 for code in greens) and cmp_exit == 0

types = [['pnpm', 'run', 'type-check:tests'], ['pnpm', 'exec', 'vitest', 'run', '--typecheck.only']]
mutate('legacy-return-type', 'AC-9', 'apps/web/src/lib/notifications/index.ts', lambda s: s.replace('notify(payload: NotificationPayload): Promise<void>', 'notify(payload: NotificationPayload): Promise<NotifyResult>'), types)
for field in ['email', 'surname']:
    mutate('payload-' + field, 'AC-3', 'apps/web/src/lib/notifications/lead-alert.ts', lambda s, field=field: s.replace("type: 'new_lead'\n", "type: 'new_lead'\n  " + field + '?: string\n', 1), types)

def required(s):
    line = next(line for line in s.splitlines(True) if "name: 'LEAD_ALERT_EMAIL_TO'" in line)
    return s.replace(line, '').replace('const REQUIRED = [', 'const REQUIRED = [\n' + line.rstrip())

mutate('alert-env-required', 'AC-9', 'apps/web/scripts/validate-env.mjs', required, [['pnpm', 'exec', 'vitest', 'run', 'src/lib/notifications/__tests__/alert-env.test.ts']])
