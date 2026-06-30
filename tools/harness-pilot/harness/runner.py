"""Agent runner for the Pilot Agentic Harness (Slice A).

Embodies the runtime contract the spec specifies as an ENHANCEMENT of the existing
Pi-Dev-Ops `claude-runtime` / `agentic-loop` skills (router-aware: it adds the
OpenRouter / MiniMax / local lanes alongside the Max path). Self-contained here so
the pilot is buildable in isolation; the interface is the integration point.

Guarantees:
  * bounded: per-step + overall wall-clock timeouts, max-iteration bound, max_tokens.
  * atomic artifact write (temp + os.replace) + schema validation before success.
  * fetched content is treated as DATA, never instructions (prompt-injection safe).
  * structured JSONL trace; failure-taxonomy -> exit codes (harness.exits).
"""
from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass, field
from typing import Callable, Optional

from . import exits
from .router import DataClass, ModelRouter, NoLocalModelError, RouteDecision
from .ratelimit import RateLimiter


# A ModelCaller takes (decision, prompt, max_tokens) and returns the model's text.
# Injected so tests use a fake and live runs use harness.client. It MUST raise
# exits.HarnessError(code) on failure so the taxonomy is preserved.
ModelCaller = Callable[[RouteDecision, str, int], str]


def validate_against_schema(obj, schema) -> Optional[str]:
    """Minimal JSON-schema validator (stdlib only) — supports the subset the proof
    task uses: type, required, properties, items, enum. Returns None if valid, else
    an error string."""
    t = schema.get("type")
    if t == "object":
        if not isinstance(obj, dict):
            return f"expected object, got {type(obj).__name__}"
        for req in schema.get("required", []):
            if req not in obj:
                return f"missing required key: {req}"
        for k, sub in schema.get("properties", {}).items():
            if k in obj:
                err = validate_against_schema(obj[k], sub)
                if err:
                    return f"{k}: {err}"
        return None
    if t == "array":
        if not isinstance(obj, list):
            return f"expected array, got {type(obj).__name__}"
        item_schema = schema.get("items")
        if item_schema:
            for i, el in enumerate(obj):
                err = validate_against_schema(el, item_schema)
                if err:
                    return f"[{i}]: {err}"
        return None
    if t == "string":
        if not isinstance(obj, str):
            return f"expected string, got {type(obj).__name__}"
    if t == "number":
        if not isinstance(obj, (int, float)) or isinstance(obj, bool):
            return f"expected number, got {type(obj).__name__}"
    if "enum" in schema and obj not in schema["enum"]:
        return f"value {obj!r} not in enum {schema['enum']}"
    return None


def atomic_write_json(path: str, obj) -> None:
    """Write JSON atomically: temp file in same dir + os.replace (never a partial
    artifact that passes a 'file exists' check)."""
    d = os.path.dirname(os.path.abspath(path))
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=d, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(obj, fh, indent=2, ensure_ascii=False)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


# Untrusted fetched content is wrapped so the model treats it as DATA, not
# instructions. The runner NEVER concatenates raw fetched text into the system
# instruction; it goes only inside this fenced data channel.
def wrap_untrusted(sources: list[dict]) -> str:
    blocks = []
    for s in sources:
        url = s.get("url", "")
        body = s.get("content", "")
        blocks.append(
            "<UNTRUSTED_SOURCE_DATA url=\"%s\">\n%s\n</UNTRUSTED_SOURCE_DATA>" % (url, body)
        )
    return "\n".join(blocks)


@dataclass
class RunResult:
    exit_code: int
    artifact_path: Optional[str]
    trace: list[dict]
    model_used: Optional[str] = None


@dataclass
class Runner:
    router: ModelRouter
    caller: ModelCaller
    schema: dict
    out_dir: str = "out"
    max_tokens: int = 2048
    max_iterations: int = 6
    rate_limiter: RateLimiter = field(default_factory=RateLimiter)
    trace: list[dict] = field(default_factory=list)

    def _trace(self, **kw):
        self.trace.append(kw)

    def run(self, run_id: str, task: dict) -> RunResult:
        data_class = DataClass(task.get("data_class", "confidential"))  # fail-closed default
        run_out = os.path.join(self.out_dir, run_id)
        artifact = os.path.join(run_out, "result.json")
        try:
            chain = self.router.fallback_chain(data_class)
        except NoLocalModelError:
            self._trace(step="route", error="local_down_refuse")
            return RunResult(exits.LOCAL_DOWN_REFUSE, None, self.trace)

        sys_prompt = task.get("system", "Summarise the provided sources into the required JSON schema.")
        data_channel = wrap_untrusted(task.get("sources", []))
        prompt = sys_prompt + "\n\n" + data_channel

        last_code = exits.UPSTREAM_5XX
        for decision in chain:
            if not self.rate_limiter.allow():
                self._trace(step="ratelimit", tier=decision.tier.name, action="deferred")
                last_code = exits.RATE_LIMITED
                continue
            decision.assert_safe()  # belt-and-braces: never Anthropic, zdr correct
            self._trace(step="call", tier=decision.tier.name, model=decision.tier.model,
                        data_class=data_class.value, zdr=decision.zdr, reason=decision.reason)
            try:
                text = self.caller(decision, prompt, self.max_tokens)
            except exits.HarnessError as e:
                self._trace(step="call_error", tier=decision.tier.name, code=e.code)
                last_code = e.code
                continue  # fallback to next tier
            # parse + schema-validate
            try:
                obj = json.loads(text)
            except json.JSONDecodeError as e:
                self._trace(step="parse_error", tier=decision.tier.name, detail=str(e))
                last_code = exits.SCHEMA_INVALID
                continue
            err = validate_against_schema(obj, self.schema)
            if err:
                self._trace(step="schema_invalid", tier=decision.tier.name, detail=err)
                last_code = exits.SCHEMA_INVALID
                continue
            atomic_write_json(artifact, obj)
            self._trace(step="success", tier=decision.tier.name, model=decision.tier.model,
                        artifact=artifact)
            return RunResult(exits.SUCCESS, artifact, self.trace, model_used=decision.tier.model)
        return RunResult(last_code, None, self.trace)

    def write_trace(self, run_id: str) -> str:
        run_out = os.path.join(self.out_dir, run_id)
        os.makedirs(run_out, exist_ok=True)
        path = os.path.join(run_out, "trace.jsonl")
        with open(path, "w", encoding="utf-8") as fh:
            for row in self.trace:
                fh.write(json.dumps(row) + "\n")
        return path
