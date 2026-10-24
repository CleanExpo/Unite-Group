import json
import os
from pathlib import Path
import subprocess

root = Path.cwd()
out = root / '.claude/done/spm/2026-10-24-enquiry-alerts'
health = 'apps/web/src/app/api/health/alerts/route.ts'
sql = 'apps/web/supabase/migrations/20261024090000_alert_delivery_log.sql'
route_suite = 'src/app/api/health/alerts/__tests__/route.test.ts'
sql_suite = 'src/app/api/health/alerts/__tests__/migration.test.ts'
mutants = [
    ('AC-6', health, 'unconfigured-not-failed', "row.outcome === 'failed' || row.outcome === 'unconfigured' ||", "row.outcome === 'failed' ||", route_suite),
    ('AC-6', health, 'window-24-hours', 'const WINDOW_HOURS = 72', 'const WINDOW_HOURS = 24', route_suite),
    ('AC-7', sql, 'no-advisory-lock', '    perform pg_advisory_xact_lock(hashtextextended(p_dedup_key, 0));\n', '', sql_suite),
    ('AC-7', sql, 'no-conflict-handling', 'on conflict on constraint alert_delivery_log_source_kind_source_id_channel_key do nothing', '', sql_suite),
    ('AC-15', health, 'checkout-reconciliation-early', '    let lastFailureAt: string | null = null', "    const { data: checkout } = await supabase.from('stripe_events').select('stripe_event_id').eq('event_type', 'checkout.session.completed').range(0, 499)\n    for (const event of checkout ?? []) unalertedIds.add(event.stripe_event_id)\n    let lastFailureAt: string | null = null", route_suite),
]
env = os.environ.copy()
env['PATH'] = '/Users/phill-mac/.nvm/versions/node/v24.14.1/bin:/opt/homebrew/bin:/usr/bin:/bin'
records = []
for ac, filename, name, before, after, suite in mutants:
    path = root / filename
    original = path.read_bytes()
    backup = out / f'{name}.backup'
    backup.write_bytes(original)
    assert before.encode() in original, name
    command = ['pnpm', 'exec', 'vitest', 'run', suite]
    try:
        path.write_bytes(original.replace(before.encode(), after.encode()))
        run = subprocess.run(command, cwd=root / 'apps/web', env=env, capture_output=True, timeout=60)
        (out / f'{name}.red.log').write_bytes(run.stdout + run.stderr)
    finally:
        path.write_bytes(original)
    cmp_result = subprocess.run(['cmp', str(path), str(backup)], capture_output=True)
    restored = subprocess.run(command, cwd=root / 'apps/web', env=env, capture_output=True, timeout=60)
    (out / f'{name}.restored.log').write_bytes(restored.stdout + restored.stderr)
    record = dict(AC=ac, file=filename, planted=name, command='cd apps/web && ' + ' '.join(command),
                  exit_under_mutant=run.returncode, exit_restored=restored.returncode, cmp_exit=cmp_result.returncode,
                  limitation='SQL structure only, not real database execution' if filename == sql else None)
    records.append(record)
    (out / 'mutations-health.json').write_text(json.dumps(records, indent=2) + '\n')
    print(json.dumps(record), flush=True)
    assert run.returncode != 0 and restored.returncode == 0 and cmp_result.returncode == 0, name
