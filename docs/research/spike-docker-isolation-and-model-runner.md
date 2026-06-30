# SPIKE — Docker as the de-risking isolation substrate + local model runtime

> **Ticket:** UNI-2213 (parent epic UNI-2207). **Branch:** `spike/docker-isolation-and-model-runner`.
> **Status:** spike complete — fallback architecture **validated** for the isolation lane;
> local-runtime lane **available, one bounded step from proven**.
> **Locale:** en-AU. All claims carry an Evidence Standard tag; verification was run
> 30/06/2026 on the M4 Mac mini.

## Why this spike exists

The blueprint (`openshell-agentic-blueprint.md` §5) named Docker only as OpenShell's
compute driver. OpenShell is alpha — the #1 risk in the blueprint (§10). This spike asks:
**can plain Docker (which we already own and run) de-risk the pilot so it does not depend
on alpha software?** If yes, the agent pilot can start *today* and adopt OpenShell's
policy/credential-mediation layer on top only once it matures.

Docker actually plays **three** roles:

| # | Role | Owner ticket | This spike's finding |
|---|---|---|---|
| 1 | OpenShell compute driver | UNI-2210 | Out of scope here; cross-ref only. |
| 2 | **Standalone per-agent isolation, no OpenShell** | **this ticket** | **`[VERIFIED]` — proven green.** |
| 3 | **Local model runtime (Docker Model Runner)** | **this ticket** | `[VERIFIED present]`, runtime call = one bounded step. |

## Environment (verified 30/06/2026)

- Docker Engine **29.5.3**; Docker Model Runner client **v1.2.1**. `[VERIFIED]` (`docker version`, `docker model version`)
- `docker info` → `Docker Desktop | kernel=6.12.76-linuxkit | linux/aarch64`. `[VERIFIED]`

## Role 2 — standalone isolation TODAY (no OpenShell)

The harness pilot (`tools/harness-pilot/`, built from the 100/100-graded
`spec-agentic-harness-pilot.md`) already enforces the agent's network guarantees at the
**proxy layer**, in plain Docker, with no OpenShell:

- A squid forward-proxy sidecar (`docker/squid-allowlist.conf`) is **deny-by-default**:
  only `.openrouter.ai` and `.api.minimax.io` may egress; `api.anthropic.com` is never
  allowlisted, so **"$0 Max" is a network fact, not a promise**. `[VERIFIED]` (read the conf)
- The app container runs on a Docker **`--internal`** network with no route off-box except
  through the proxy; credentials are passed via `--env-file`, never `-e` (no secrets in
  `docker inspect`/process args). `[VERIFIED]` (read `prove_egress.sh`)

**Proof run this session** (`bash docker/prove_egress.sh`, exit `0`): `[VERIFIED]`

```
PASS: anthropic blocked
PASS: non-allowlisted blocked
PASS: no allowed anthropic CONNECT in proxy log
```

i.e. an allowlisted host is reachable through the proxy while `api.anthropic.com` and a
random non-allowlisted host are both denied, and the proxy access log
(`tools/harness-pilot/out/proxy.log`) carries no allowed Anthropic CONNECT. **A router
bug cannot leak — the network denies it.** This is the de-risking result: the isolation
lane the blueprint attributed to OpenShell already holds on plain Docker.

`[INFERENCE]` Docker's own May-2026 "Docker Sandboxes + Model Runner" pattern (source link
in UNI-2213) validates this same shape; we did not independently re-run Docker's reference,
so the corroboration is `[UNCONFIRMED]` beyond our own passing proof above.

## Role 3 — local model runtime (Docker Model Runner)

Docker Model Runner is the third local-inference option alongside LM Studio / Ollama, and
it can host the model **inside the same container substrate** that isolates the agent —
collapsing the local-model lane and the isolation lane into one tool we already own.

- Client **v1.2.1 is installed**. `[VERIFIED]`
- It is **not yet enabled**: `docker model status` → "Docker Model Runner is not running";
  `docker model ls` refuses until enabled. `[VERIFIED]`
- Enabling it (`docker desktop enable model-runner`) exposes an **OpenAI-compatible**
  endpoint (default `http://localhost:12434/engines/v1`) that the harness `client.py`
  local lane can target with no code change. `[INFERENCE]` from Docker's Model Runner docs
  (link in UNI-2213); endpoint not reachable this session because the runner is disabled. `[VERIFIED]` (curl returned empty)

**Why not enabled in this spike:** turning on Model Runner mutates the shared dev machine's
Docker Desktop global configuration and pulls multi-GB model weights — outside the bounded,
reversible scope of a read-only worktree spike. It is **one command + one pull** from a live
local-inference proof:

```bash
docker desktop enable model-runner
docker model pull ai/<ornith-9b-or-equivalent-gguf>
curl http://localhost:12434/engines/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"ai/<…>","messages":[{"role":"user","content":"ping"}]}'
```

`[INFERENCE]` Per Docker's docs (link in UNI-2213) Model Runner runs llama.cpp and, on
Apple Silicon with Desktop 4.62+, vLLM/MLX — so Ornith-9B-class local inference on this M4
is expected to work; **left `[UNCONFIRMED]` until the pull+call above is run.**

## The real isolation boundary (recorded, per ticket bench note)

Docker Desktop on macOS runs a **Linux VM** (this machine: `kernel=6.12.76-linuxkit`,
`linux/aarch64`). `[VERIFIED]` Therefore:

- Namespaces, seccomp, Landlock and the `--internal` network operate **inside that VM**.
  The hard security boundary to the macOS host is the **VM**, not the individual container.
- This is the **same kernel-isolation caveat as UNI-2210** (OpenShell on the same Docker).
  Plain Docker does not give a *weaker* host boundary than the OpenShell-on-Docker path —
  both inherit the linuxkit VM. So choosing plain Docker for the pilot trades **nothing** on
  host isolation; it only defers OpenShell's *policy/credential-mediation* layer. `[INFERENCE]`

## Verdict

- **GO** for plain Docker as the pilot's isolation substrate. The egress-containment
  guarantee the blueprint needed is proven on tooling we already run, with no dependency on
  OpenShell alpha. `[VERIFIED]`
- The pilot can proceed **now** on Role 2; OpenShell (UNI-2209 / UNI-2210) becomes an
  *additive* hardening layer rather than a blocker.
- **Single bounded follow-up:** enable Docker Model Runner and run the chat-completions call
  above to close Role 3 from `available` to `proven` (no founder credential needed — local).

## Sources

- `tools/harness-pilot/` — `docker/prove_egress.sh`, `docker/squid-allowlist.conf`,
  `harness/router.py`, `harness/client.py` (read + run this session).
- `docs/research/spec-agentic-harness-pilot.md` — the graded spec the pilot embodies.
- `docs/research/openshell-agentic-blueprint.md` §5, §10 — original Docker framing + alpha risk.
- External (cited in UNI-2213, not independently re-run this session): Docker "Sandboxes +
  Model Runner" pattern; Docker Model Runner + vLLM/Metal on macOS; `docs.docker.com/ai/model-runner/`.
