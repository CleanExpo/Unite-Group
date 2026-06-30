# Pilot Agentic Harness — Slice A

Built from `docs/research/spec-agentic-harness-pilot.md` (independently graded **100/100**).
One isolated gathering agent that routes inference on the cost-ordered tier ladder
**owned (MiniMax plan) → free (OpenRouter) → cheap-paid (OpenRouter) → local (Ornith-9B)**,
with guarantees enforced at the **network layer** (a router bug cannot leak — the proxy denies it).

## Run

```bash
cd tools/harness-pilot
python3 run.py --task tasks/summarise-urls.json --run-id demo      # offline, deterministic, no creds
python3 -m unittest discover -s tests -v                            # 25 tests
bash docker/prove_egress.sh                                         # public-lane egress-containment proof
bash docker/prove_local_confidential.sh                            # confidential lane: local inference yes, internet no
```

The confidential proof needs Docker Model Runner enabled with a small model:
`docker desktop enable model-runner && docker model pull ai/smollm2`. See
`docs/research/spike-docker-isolation-and-model-runner.md` (UNI-2213) for the full finding.

`--live` performs the §16.1 liveness prerequisites and routes to real endpoints; it
needs `OPENROUTER_API_KEY` / `MINIMAX_API_KEY` in the env (via `--env-file`, never `-e`).
That path is the **only** part gated on the founder credential grant.

## Guarantees (and how they're proven)

| Guarantee | Mechanism | Proof |
|---|---|---|
| **$0 Max** | `api.anthropic.com` is never a routing target (code) AND never allowlisted (proxy) | `prove_egress.sh` → Anthropic blocked; unit `test_no_branch_ever_returns_anthropic` |
| **Confidential → local only** | fail-closed data-class gate; unknown class ⇒ confidential ⇒ local-or-REFUSE | `test_confidential_*` |
| **No-retention on the OpenRouter lane** | `zdr=true` on every OpenRouter-routed call; MiniMax-direct = public-data-only (no zdr param) | `test_openrouter_calls_carry_zdr`, `test_minimax_direct_has_no_zdr` |
| **Cost order owned→free→cheap** | router ladder | `test_public_cost_order_owned_first` |
| **Prompt-injection safe** | fetched content lives only in a fenced `<UNTRUSTED_SOURCE_DATA>` channel, never the system prompt | `test_injection_safe_payload_is_data` |
| **Bounded + atomic** | rate limiter (≤20 RPM / RPD), atomic temp+replace write, schema-validate before success | `test_atomic_write_roundtrip`, `test_schema_invalid_exit40`, `TestRateLimiter` |
| **Secret hygiene** | `--env-file` only, Authorization redaction, post-run secret scan | `test_detects_key_prefix` + run report `secret_leaks` |

## Layout
`harness/router.py` (tier ladder + data-class gate) · `harness/runner.py` (loop, atomic write,
schema, trace, taxonomy) · `harness/client.py` (live HTTP, redaction, zdr) · `harness/ratelimit.py`
· `harness/secrets_scan.py` · `harness/exits.py` (failure→exit-code map) · `docker/` (squid sidecar
allowlist + egress proof) · `tests/` (25 tests) · `run.py` (CLI).

## Relationship to the existing skills (enhance, not rebuild)
This runner is the buildable, isolated embodiment of the contract the spec specifies as an
**enhancement of the Pi-Dev-Ops `claude-runtime` / `agentic-loop` skills** — router-aware (adds
the OpenRouter / MiniMax / local lanes alongside the Max path). `dispatcher-core` /
`kill-switch-binding` are reserved for the fleet slice (UNI-2214).
