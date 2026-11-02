// Last line of defence. fleet.ts copies named fields only; this scrubs whatever
// free text those fields carry before it leaves the server.
const RULES: readonly [RegExp, string][] = [
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip]'],
  [/\b(?:[0-9a-f]{1,4}:){3,7}[0-9a-f]{1,4}\b/gi, '[ip]'],
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[email]'],
  [/\bBearer\s+\S+/gi, '[secret]'],
  [/\b(?:sk|pk|rk|ghp|gho|ghs|ghu|github_pat|xox[abprs]|lin_api|AKIA)[-_A-Za-z0-9]{8,}/g, '[secret]'],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[secret]'],
  [/\b([\w-]*(?:key|token|secret|password|passcode)[\w-]*)\s*[=:]\s*\S+/gi, '$1=[secret]'],
  [/(?:\/(?:Users|home)\/|[A-Za-z]:\\Users\\)[^\s"']*/g, '[path]'],
];

export function redactText(text: string): string {
  return RULES.reduce((out, [pattern, swap]) => out.replace(pattern, swap), text);
}

export function redactDeep<T>(value: T): T {
  if (typeof value === 'string') return redactText(value) as T;
  if (Array.isArray(value)) return value.map(redactDeep) as T;
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [redactText(k), redactDeep(v)]),
    ) as T;
  }
  return value;
}
