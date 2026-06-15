import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'scripts/sandbox-wizard.sh');
const script = fs.readFileSync(scriptPath, 'utf8');

function functionBody(name: string): string {
  const start = script.indexOf(`${name}() {`);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextFunction = script.slice(start + 1).search(/\n[a-zA-Z0-9_]+\(\) \{/);
  if (nextFunction === -1) {
    return script.slice(start);
  }

  return script.slice(start, start + 1 + nextFunction);
}

function commandBody(name: string): string {
  return functionBody(name);
}

function dispatchBody(): string {
  const start = script.indexOf('case "${1:-}" in');
  expect(start).toBeGreaterThanOrEqual(0);
  return script.slice(start);
}

function localCredentialPythonParser(): string {
  const body = functionBody('local_credential_value');
  const marker = "<<'PY'\n";
  const start = body.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const afterMarker = start + marker.length;
  const end = body.indexOf('\nPY', afterMarker);
  expect(end).toBeGreaterThan(afterMarker);
  return body.slice(afterMarker, end);
}

describe('sandbox wizard credential boundary', () => {
  it('keeps sandbox apply/status on sandbox-only credential loading', () => {
    for (const command of ['cmd_apply', 'cmd_status']) {
      const body = commandBody(command);

      expect(body).toContain('load_sandbox_creds');
      expect(body).not.toContain('load_creds');
    }
  });

  it('keeps sandbox apply/status independent from mandatory Supabase Management API tokens', () => {
    const applyBody = commandBody('cmd_apply');
    const statusBody = commandBody('cmd_status');

    expect(applyBody).not.toContain('require_supabase_token');
    expect(applyBody).toContain('Skipping sandbox advisor: SUPABASE_ACCESS_TOKEN not present in environment');
    expect(statusBody).not.toContain('require_supabase_token');
    expect(statusBody).not.toContain('SUPABASE_ACCESS_TOKEN');
    expect(statusBody).not.toContain('api.supabase.com');
  });

  it('keeps sandbox credential loading free of production-labelled credential reads', () => {
    const body = functionBody('load_sandbox_creds');

    expect(body).toContain('UNITE_GROUP_SANDBOX_DB_PASSWORD');
    expect(body).not.toContain('UNITE_GROUP_DB_PASSWORD');
    expect(body).not.toContain('PROD_DB_PASSWORD');
    expect(body).not.toContain('PROD_DB_URL');
    expect(body).not.toContain('PROD_DB_HOST');
  });

  it('reads local overrides by requested key instead of sourcing the whole credential file', () => {
    const body = functionBody('local_credential_value');

    expect(body).toContain('python3 - "$creds_file" "$credential_name"');
    expect(body).toContain('re.escape(name)');
    expect(body).not.toMatch(/\bsource\s+"?\$creds_file"?/);
    expect(body).not.toMatch(/\.\s+"?\$creds_file"?/);
  });

  it('keeps production-capable credential loading explicit and separate', () => {
    const body = functionBody('load_creds');

    expect(body).toContain('UNITE_GROUP_DB_PASSWORD');
    expect(body).toContain('load_sandbox_creds');
    expect(body).toContain('Production and sandbox credentials loaded');
  });

  it('reads quoted local sandbox override values without executing or sourcing the file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-creds-'));
    const credsFile = path.join(tempDir, 'creds.env');
    const quotedPassword = 'sandbox pass # literal ; $(not-executed)';
    fs.writeFileSync(
      credsFile,
      [
        'UNITE_GROUP_DB_PASSWORD=prod-value-must-not-be-selected',
        `export UNITE_GROUP_SANDBOX_DB_PASSWORD="${quotedPassword}"`,
        'UNRELATED_VALUE=ignored',
      ].join('\n'),
    );

    const result = execFileSync('python3', ['-', credsFile, 'UNITE_GROUP_SANDBOX_DB_PASSWORD'], {
      input: localCredentialPythonParser(),
      encoding: 'utf8',
    }).trimEnd();

    expect(result).toBe(quotedPassword);
  });

  it('unescapes safe double-quoted local sandbox override values without sourcing the file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-creds-'));
    const credsFile = path.join(tempDir, 'creds.env');
    const escapedPassword = 'sandbox "quoted" backslash \\ dollar $literal backtick `literal`';
    const shellEscapedPassword = escapedPassword.replace(/(["\\$`])/g, '\\$1');
    fs.writeFileSync(
      credsFile,
      [
        'UNITE_GROUP_DB_PASSWORD=prod-value-must-not-be-selected',
        `export UNITE_GROUP_SANDBOX_DB_PASSWORD="${shellEscapedPassword}"`,
      ].join('\n'),
    );

    const result = execFileSync('python3', ['-', credsFile, 'UNITE_GROUP_SANDBOX_DB_PASSWORD'], {
      input: localCredentialPythonParser(),
      encoding: 'utf8',
    }).trimEnd();

    expect(result).toBe(escapedPassword);
  });

  it('reads single-quoted local sandbox override values as inert literal text', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-creds-'));
    const credsFile = path.join(tempDir, 'creds.env');
    const singleQuotedPassword = 'sandbox single quoted $(not-executed) `not-executed` \\ literal';
    fs.writeFileSync(
      credsFile,
      [
        'UNITE_GROUP_DB_PASSWORD=prod-value-must-not-be-selected',
        `export UNITE_GROUP_SANDBOX_DB_PASSWORD='${singleQuotedPassword}'`,
      ].join('\n'),
    );

    const result = execFileSync('python3', ['-', credsFile, 'UNITE_GROUP_SANDBOX_DB_PASSWORD'], {
      input: localCredentialPythonParser(),
      encoding: 'utf8',
    }).trimEnd();

    expect(result).toBe(singleQuotedPassword);
  });

  it('handles malformed quoted local sandbox overrides as inert literal text', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-creds-'));
    const credsFile = path.join(tempDir, 'creds.env');
    const malformedPassword = '"sandbox malformed $(not-executed) `not-executed`';
    fs.writeFileSync(
      credsFile,
      [
        'UNITE_GROUP_DB_PASSWORD=prod-value-must-not-be-selected',
        `export UNITE_GROUP_SANDBOX_DB_PASSWORD=${malformedPassword}`,
      ].join('\n'),
    );

    const result = execFileSync('python3', ['-', credsFile, 'UNITE_GROUP_SANDBOX_DB_PASSWORD'], {
      input: localCredentialPythonParser(),
      encoding: 'utf8',
    }).trimEnd();

    expect(result).toBe(malformedPassword);
  });

  it('ignores blank lines and commented local sandbox override examples', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-creds-'));
    const credsFile = path.join(tempDir, 'creds.env');
    const activeSandboxPassword = 'active sandbox literal # not a comment';
    fs.writeFileSync(
      credsFile,
      [
        '',
        '   ',
        '# UNITE_GROUP_SANDBOX_DB_PASSWORD=commented-value-must-not-win',
        '  # export UNITE_GROUP_SANDBOX_DB_PASSWORD=also-commented',
        'UNITE_GROUP_DB_PASSWORD=prod-value-must-not-be-selected',
        `export UNITE_GROUP_SANDBOX_DB_PASSWORD="${activeSandboxPassword}"`,
      ].join('\n'),
    );

    const result = execFileSync('python3', ['-', credsFile, 'UNITE_GROUP_SANDBOX_DB_PASSWORD'], {
      input: localCredentialPythonParser(),
      encoding: 'utf8',
    }).trimEnd();

    expect(result).toBe(activeSandboxPassword);
  });

  it('uses the first active local sandbox override when duplicate keys exist', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-creds-'));
    const credsFile = path.join(tempDir, 'creds.env');
    fs.writeFileSync(
      credsFile,
      [
        'export UNITE_GROUP_SANDBOX_DB_PASSWORD=first-active-sandbox-value',
        'UNITE_GROUP_SANDBOX_DB_PASSWORD=second-active-value-must-not-win',
        'UNITE_GROUP_DB_PASSWORD=prod-value-must-not-be-selected',
      ].join('\n'),
    );

    const result = execFileSync('python3', ['-', credsFile, 'UNITE_GROUP_SANDBOX_DB_PASSWORD'], {
      input: localCredentialPythonParser(),
      encoding: 'utf8',
    }).trimEnd();

    expect(result).toBe('first-active-sandbox-value');
  });

  it('accepts export assignments with whitespace around the equals sign', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-creds-'));
    const credsFile = path.join(tempDir, 'creds.env');
    const spacedPassword = 'sandbox spaced assignment value';
    fs.writeFileSync(
      credsFile,
      [
        'UNITE_GROUP_DB_PASSWORD = prod-value-must-not-be-selected',
        `export UNITE_GROUP_SANDBOX_DB_PASSWORD = "${spacedPassword}"`,
      ].join('\n'),
    );

    const result = execFileSync('python3', ['-', credsFile, 'UNITE_GROUP_SANDBOX_DB_PASSWORD'], {
      input: localCredentialPythonParser(),
      encoding: 'utf8',
    }).trimEnd();

    expect(result).toBe(spacedPassword);
  });

  it('ignores trailing comments on unquoted local sandbox overrides without including comment text in the password', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-creds-'));
    const credsFile = path.join(tempDir, 'creds.env');
    fs.writeFileSync(
      credsFile,
      [
        'UNITE_GROUP_DB_PASSWORD=prod-value-must-not-be-selected',
        'export UNITE_GROUP_SANDBOX_DB_PASSWORD=sandbox-inline-comment-value # optional local note',
      ].join('\n'),
    );

    const result = execFileSync('python3', ['-', credsFile, 'UNITE_GROUP_SANDBOX_DB_PASSWORD'], {
      input: localCredentialPythonParser(),
      encoding: 'utf8',
    }).trimEnd();

    expect(result).toBe('sandbox-inline-comment-value');
  });

  it('preserves hash characters inside unquoted local sandbox override values when not preceded by whitespace', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-creds-'));
    const credsFile = path.join(tempDir, 'creds.env');
    fs.writeFileSync(
      credsFile,
      [
        'UNITE_GROUP_DB_PASSWORD=prod-value-must-not-be-selected',
        'export UNITE_GROUP_SANDBOX_DB_PASSWORD=sandbox-value#literal-fragment # optional local note',
      ].join('\n'),
    );

    const result = execFileSync('python3', ['-', credsFile, 'UNITE_GROUP_SANDBOX_DB_PASSWORD'], {
      input: localCredentialPythonParser(),
      encoding: 'utf8',
    }).trimEnd();

    expect(result).toBe('sandbox-value#literal-fragment');
  });

  it('fails closed when the local override path cannot be read by the parser', () => {
    const unreadablePath = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-creds-unreadable-'));

    expect(() =>
      execFileSync('python3', ['-', unreadablePath, 'UNITE_GROUP_SANDBOX_DB_PASSWORD'], {
        input: localCredentialPythonParser(),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }),
    ).toThrow();
  });

  it('keeps command dispatch routed through the audited command functions', () => {
    const dispatch = dispatchBody();

    expect(dispatch).toContain('apply)    shift; cmd_apply    "$@" ;;');
    expect(dispatch).toContain('status)   shift; cmd_status   "$@" ;;');
    expect(dispatch).toContain('promote)  shift; cmd_promote  "$@" ;;');
    expect(dispatch).not.toMatch(/apply\)[^\n]*(load_creds|load_sandbox_creds|psql|op item get)/);
    expect(dispatch).not.toMatch(/status\)[^\n]*(load_creds|load_sandbox_creds|psql|op item get)/);
  });

  it('keeps the credential-boundary review doc aligned with the structural and behavioural contracts', () => {
    const reviewPath = path.join(repoRoot, 'docs/margot/sandbox-wizard-credential-boundary-review.md');
    const review = fs.readFileSync(reviewPath, 'utf8');
    const reviewLower = review.toLowerCase();
    const assertionSection = review.split('## Senior PM verification checkpoint')[0] ?? review;

    // Required phrases (case-insensitive) — any rewrite that drops one of these
    // will fail this test and force the operator to justify the change.
    const requiredPhrases = [
      'load_sandbox_creds',
      'load_creds',
      'cmd_apply',
      'cmd_status',
      'cmd_promote',
      'cmd_diff',
      'cmd_setup',
      'cmd_sync',
      'local_credential_value',
      'unite_group_sandbox_db_password',
      'unite_group_db_password',
      'prod_db_password',
      'sandbox-only credential loading',
      'production-capable credential loading',
      'sandbox advisor opt-in',
      'per-step approval',
      'promote to prod',
      'no github push',
      'no production db write',
      'no secret read',
      'fail-closed',
      'sandbox wizard',
    ];

    for (const phrase of requiredPhrases) {
      expect(reviewLower).toContain(phrase);
    }

    // Required phrases must survive the assertion-section split (i.e. they are
    // not only inside the verification-checkpoint narrative).
    const assertionSectionLower = assertionSection.toLowerCase();
    for (const phrase of requiredPhrases) {
      expect(assertionSectionLower).toContain(phrase);
    }

    // Prohibited phrases (case-insensitive) — these would mean the review doc
    // is overclaiming about the diff and must be tightened. The list is
    // intentionally short: it only contains phrases that would indicate
    // the review is claiming a substantive, verifiable change that the
    // diff does not actually make. The doc is allowed to use the
    // negation forms (e.g. "no nango") as a guard rail.
    const prohibitedPhrases = [
      'sandbox-wizard apply completed',
      'sandbox-wizard status completed',
      'sandbox-wizard diff completed',
      'sandbox-wizard sync completed',
      'sandbox-wizard promote completed',
    ];

    for (const phrase of prohibitedPhrases) {
      expect(assertionSectionLower).not.toContain(phrase);
    }
  });
});
