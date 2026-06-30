# SPIKE — Docker as the de-risking isolation substrate + local model runtime

> **Ticket:** UNI-2213 (parent epic UNI-2207). **Branch:** `spike/docker-isolation-and-model-runner`.
> **Status:** spike complete — fallback architecture **validated**: both the isolation lane
> (Role 2) and the local-runtime lane (Role 3) **proven** on plain Docker this session.
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
| 3 | **Local model runtime (Docker Model Runner)** | **this ticket** | **`[VERIFIED]` — live inference proven.** |

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
- **Enabled and proven this session** (with founder authorisation to mutate the shared Docker
  Desktop config): `docker desktop enable model-runner` → `docker model status` = "Docker
  Model Runner is running". `[VERIFIED]`

**Live local-inference proof** (no credentials, zero Max consumption): `[VERIFIED]`

```bash
docker model pull ai/smollm2                      # 361M llama, 256 MiB, pulled OK
curl http://localhost:12434/engines/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"ai/smollm2","messages":[{"role":"user","content":"Reply with exactly: ROLE3_OK"}],"max_tokens":20,"temperature":0}'
```

Result: `choices[0].message.content == "ROLE3_OK"`, `usage = {prompt_tokens:40, completion_tokens:6}`,
and `GET /engines/v1/models` lists `docker.io/ai/smollm2:latest`. The **OpenAI-compatible
endpoint at `http://localhost:12434/engines/v1` serves real local inference** — the harness
`client.py` local lane can target it with no code change (point `base_url` there). `[VERIFIED]`

A 361M model was used purely to prove the **runtime + endpoint contract** quickly; swapping in
Ornith-9B (or any GGUF) is `docker model pull <tag>` with no other change. `[INFERENCE]` Per
Docker's docs (link in UNI-2213) the same runner does vLLM/MLX on Apple-Silicon Desktop 4.62+,
so 9B-class local inference on this M4 follows the same path. The runner is left enabled (a
usable local lane for the pilot); `docker desktop disable model-runner` reverses it cleanly.

**Still `[UNCONFIRMED]` — the assembled path:** wiring the *isolated* app container to reach this
endpoint via `host.docker.internal:12434` (the squid conf already reserves a single
`host.docker.internal` CONNECT rule for confidential runs). Both halves are proven
independently; joining them is the one remaining integration step, owned by the pilot build.

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
- **Both local lanes proven independently:** Role 2 (isolated container + deny-by-default
  egress) and Role 3 (Docker Model Runner serving real local inference via the
  OpenAI-compatible endpoint). `[VERIFIED]`
- The pilot can proceed **now** on Role 2; OpenShell (UNI-2209 / UNI-2210) becomes an
  *additive* hardening layer rather than a blocker.
- **Single remaining integration step (owned by the pilot build):** join the two proven
  halves — isolated app container → `host.docker.internal:12434` → Model Runner — so a
  confidential task runs fully local with no egress. No founder credential needed.

## Sources

- `tools/harness-pilot/` — `docker/prove_egress.sh`, `docker/squid-allowlist.conf`,
  `harness/router.py`, `harness/client.py` (read + run this session).
- `docs/research/spec-agentic-harness-pilot.md` — the graded spec the pilot embodies.
- `docs/research/openshell-agentic-blueprint.md` §5, §10 — original Docker framing + alpha risk.
- External (cited in UNI-2213, not independently re-run this session): Docker "Sandboxes +
  Model Runner" pattern; Docker Model Runner + vLLM/Metal on macOS; `docs.docker.com/ai/model-runner/`.
