// src/lib/ssrf-guard.ts — RA-3013.
//
// Block server-side request forgery (SSRF) on routes that accept a
// URL-shaped parameter and call `fetch()` server-side. Rejects:
//   * non-http(s) protocols (file://, gopher://, javascript:, data:)
//   * IPv4 literals in private ranges (RFC1918, loopback, link-local)
//   * AWS / GCP / Azure metadata endpoints (169.254.169.254 etc.)
//   * `localhost` / `*.localhost` / `*.local` / `*.internal`
//   * IPv6 loopback (::1) and unique-local (fc00::/7)
//
// Does NOT resolve DNS — callers can bypass with a public hostname
// that resolves to a private IP. For full protection, layer this with
// an outbound network policy (Vercel doesn't expose one yet) or use
// a request signer that round-trips through a known proxy.
//
// Returns null when safe, or a short error string when blocked.

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "instance-data.ec2.internal",
]);

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
];

function isPrivateIpv4(host: string): boolean {
  // Match 4-octet IPv4 literal.
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [, a, b] = m.map(Number);
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (link-local + cloud metadata)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8
  if (a === 0) return true;
  // 100.64.0.0/10 (carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1") return true; // loopback
  if (h === "::") return true; // unspecified
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7 unique-local
  if (h.startsWith("fe80:")) return true; // link-local
  return false;
}

export function checkUrlForSsrf(rawUrl: string): { ok: true } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `protocol_not_allowed:${url.protocol}` };
  }

  const host = url.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(host)) {
    return { ok: false, reason: `blocked_host:${host}` };
  }
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (host.endsWith(suffix)) {
      return { ok: false, reason: `blocked_suffix:${suffix}` };
    }
  }

  if (isPrivateIpv4(host)) {
    return { ok: false, reason: `private_ipv4:${host}` };
  }
  if (host.includes(":") && isPrivateIpv6(host)) {
    return { ok: false, reason: `private_ipv6:${host}` };
  }

  return { ok: true };
}
