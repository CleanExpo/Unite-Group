# SPIKE — Docker as the de-risking isolation substrate + local model runtime

> **Ticket:** UNI-2213 (parent epic UNI-2207). **Branch:** `spike/docker-isolation-and-model-runner`.
> **Status:** spike complete — fallback architecture **validated**: the isolation lane (Role 2),
> the local-runtime lane (Role 3), and the **assembled confidential lane** (egress-denied
> container doing local-only inference) all **proven** on plain Docker this session.
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

## Role 2 + 3 assembled — the confidential lane (proven)

The combined architecture — an **egress-denied** agent container that can **still** do local
inference — is the lane for client/proprietary data. Proven this session via
`docker/prove_local_confidential.sh` (exit `0`): `[VERIFIED]`

- **Topology finding (verified):** a plain `--internal` Docker network severs *everything*,
  **including Docker Model Runner** — a container on a bare `--internal` net got an empty
  response from the model. `[VERIFIED]` So the confidential lane is **not** "just use
  `--internal`"; it is **proxy-mediated**: the app sits on `--internal` and is forced through
  a squid sidecar (`docker/squid-confidential.conf`) that allowlists **only**
  `model-runner.docker.internal` over HTTP, nothing else.
- **Proof (exit 0):** `[VERIFIED]`
  - (a) app → proxy → local model: `{"choices":[{"message":{"content":"Confidential local OK."}}], usage{prompt_tokens:44, completion_tokens:6}}` — real local inference.
  - (b) same app → `openrouter.ai` → `000`; → `api.anthropic.com` → `000`. (`000` = curl made no successful HTTP exchange; the proxy denied the connection.) Internet egress is impossible by construction — no internet host is allowlisted.

This closes the assembled path: **a confidential task runs fully local with zero internet
egress and zero Max consumption.** Swapping Ornith-9B for the 361M test model is
`docker model pull <tag>` — no topology change. No founder credential needed.

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
- **All three lanes proven:** Role 2 (isolated container + deny-by-default egress), Role 3
  (Model Runner serving real local inference), and the **assembled confidential lane**
  (egress-denied container doing local inference, internet blocked). `[VERIFIED]`
- The pilot can proceed **now** — public-data gathering on the egress-allowlist proxy,
  confidential work on the local-only proxy. OpenShell (UNI-2209 / UNI-2210) becomes an
  *additive* policy/credential-mediation layer, never a blocker.
- **Wiring done + end-to-end SUCCESS (update 30/06/2026):** the harness was wired to the
  live local lane (PR #581 — `router.local_endpoint`, `_prepare_live` local probe), and a
  confidential `run.py --live` task then produced a **schema-valid SUCCESS artifact** on a
  JSON-capable local model (`ai/qwen2.5` via Docker Model Runner): `exit 0`,
  `anthropic_calls=0`, `secret_leaks=[]`, trace `tier=local-ornith / confidential->local-only
  / zdr=false`. The confidential source was treated as data (injection-safe). `[VERIFIED]`
  Nothing substrate-level remains; production just swaps in the chosen local model via
  `docker model pull` + `LOCAL_MODEL`.

## Sources

- `tools/harness-pilot/` — `docker/prove_egress.sh`, `docker/squid-allowlist.conf`,
  `docker/prove_local_confidential.sh`, `docker/squid-confidential.conf` (added this spike),
  `harness/router.py`, `harness/client.py` (read + run this session).
- `docs/research/spec-agentic-harness-pilot.md` — the graded spec the pilot embodies.
- `docs/research/openshell-agentic-blueprint.md` §5, §10 — original Docker framing + alpha risk.
- External (cited in UNI-2213, not independently re-run this session): Docker "Sandboxes +
  Model Runner" pattern; Docker Model Runner + vLLM/Metal on macOS; `docs.docker.com/ai/model-runner/`.
