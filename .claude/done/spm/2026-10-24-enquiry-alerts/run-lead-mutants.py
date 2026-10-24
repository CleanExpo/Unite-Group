from pathlib import Path
import json, os, subprocess

root = Path.cwd()
evidence = root / '.claude/done/spm/2026-10-24-enquiry-alerts'
route = 'apps/web/src/app/api/leads/route.ts'
alert = 'apps/web/src/lib/notifications/lead-alert.ts'
route_test = 'src/app/api/leads/__tests__/route.test.ts'
alert_test = 'src/lib/notifications/__tests__/lead-alert.test.ts'
records = []
env = dict(os.environ)
env['PATH'] = '/Users/phill-mac/.nvm/versions/node/v24.14.1/bin:/opt/homebrew/bin:/usr/bin:/bin'

def run_mutant(ac, file, description, transform, test, title):
    path = root / file
    original = path.read_bytes()
    backup = evidence / ('mutation-backup-' + path.name)
    backup.write_bytes(original)
    changed = transform(original.decode()).encode()
    assert changed != original, description
    command = ['pnpm', 'exec', 'vitest', 'run', test, '-t', title]
    try:
        path.write_bytes(changed)
        with (evidence / f'mutant-leads-{len(records)+1}.log').open('w') as output:
            red = subprocess.run(command, cwd=root / 'apps/web', env=env, stdout=output, stderr=subprocess.STDOUT, timeout=60).returncode
    finally:
        path.write_bytes(original)
    cmp_exit = subprocess.run(['cmp', '-s', str(path), str(backup)]).returncode
    with (evidence / f'restored-leads-{len(records)+1}.log').open('w') as output:
        green = subprocess.run(command, cwd=root / 'apps/web', env=env, stdout=output, stderr=subprocess.STDOUT, timeout=60).returncode
    record = dict(AC=ac, file=file, planted=description, command='cd apps/web && ' + ' '.join(command[:-1]) + ' ' + repr(command[-1]), exit_under_mutant=red, exit_restored=green, cmp_exit=cmp_exit)
    records.append(record)
    (evidence / 'mutations-leads.json').write_text(json.dumps(records, indent=2) + '\n')
    print(json.dumps(record), flush=True)
    assert red != 0 and green == 0 and cmp_exit == 0, record

def remove_notify(source):
    start = source.index('      notify({')
    end = source.index('\n      }),', start) + len('\n      })')
    return source[:start] + "      Promise.resolve({ email: 'sent' as const })" + source[end:]

def remove_catch(source):
    start = source.index('  let alertTimer:')
    end = source.index('  const subjectLabel', start)
    block = source[start:end]
    block = block.replace('  try {\n', '', 1)
    block = block.replace("  } catch (error) {\n    console.error('[leads] alert failed:', error instanceof Error ? error.name : 'Error')\n  } finally {\n    if (alertTimer) clearTimeout(alertTimer)\n  }", '  if (alertTimer) clearTimeout(alertTimer)')
    return source[:start] + block + source[end:]

def return_500(source):
    source = source.replace('    await Promise.race([', '    const result = await Promise.race([', 1)
    return source.replace('    ])\n  } catch (error)', "    ])\n    if (result.email !== 'sent') return NextResponse.json({ error: 'Alert failed' }, { status: 500 })\n  } catch (error)", 1)

def remove_cap(source):
    start = source.index('    await Promise.race([')
    first = source.index('      notify({', start)
    last = source.index('\n      }),', first) + len('\n      })')
    end = source.index('\n    ])', last) + len('\n    ])')
    return source[:start] + '    await ' + source[first:last].strip() + source[end:]

if __name__ == '__main__':
    run_mutant('AC-1', route, 'Delete notify call', remove_notify, route_test, 'alerts once only after')
    run_mutant('AC-2', route, 'Remove alert try/catch', remove_catch, route_test, 'alerts are rejected')
    run_mutant('AC-2', route, 'Return 500 for a non-sent outcome', return_500, route_test, 'alerts are failed')
    run_mutant('AC-2', route, 'Remove the six-second route cap', remove_cap, route_test, 'alerts are never')
    run_mutant('AC-3', alert, 'Put first name into audit title', lambda source: source.replace('title="New enquiry" metadata=', 'title="${payload.firstName}" metadata=', 1), alert_test, 'sends only first name')
    run_mutant('AC-5', alert, 'Log provider error.message', lambda source: source.replace('error instanceof Error ? error.name', 'error instanceof Error ? error.message', 1), alert_test, 'provider failure is safe')
    run_mutant('AC-6', route, 'Delete notify call before reconciliation', remove_notify, alert_test, 'reconciles the real POST')
    run_mutant('AC-7', alert, 'Widen dedup window from 60 to 1440 minutes', lambda source: source.replace('p_window_minutes: 60', 'p_window_minutes: 1440', 1), alert_test, '90 minutes')
