#!/usr/bin/env python3
"""Pilot Agentic Harness CLI (Slice A).

    python3 run.py --task tasks/summarise-urls.json [--live]

Default (no --live) runs against an offline deterministic caller so the pilot is
demonstrable without credentials. --live performs the §16.1 liveness prerequisites
(fail-fast) and routes to real endpoints; that path needs OPENROUTER_API_KEY /
MINIMAX_API_KEY in the env (via --env-file, never -e). Emits a per-run report,
out/<run-id>/trace.jsonl, and runs a post-run secret scan.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from harness import exits  # noqa: E402
from harness.router import DataClass, ModelRouter, Provider, PUBLIC_LADDER  # noqa: E402
from harness.runner import Runner  # noqa: E402
from harness.ratelimit import RateLimiter  # noqa: E402
from harness import secrets_scan  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def _offline_caller(decision, prompt, max_tokens):
    """Deterministic stand-in: returns a schema-valid result derived from the task's
    untrusted data, WITHOUT executing any instruction inside it (injection-safe)."""
    return json.dumps({
        "topic": "offline-demo",
        "summary": "Deterministic offline summary (no live model called).",
        "key_points": ["routed via tier=%s" % decision.tier.name],
        "sources": [{"url": "https://example.com/a", "takeaway": "data treated as data"}],
    })


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--task", required=True)
    ap.add_argument("--live", action="store_true")
    ap.add_argument("--run-id", default="run-local")
    args = ap.parse_args(argv)

    with open(args.task, encoding="utf-8") as fh:
        task = json.load(fh)
    with open(os.path.join(HERE, "schema", "result.schema.json"), encoding="utf-8") as fh:
        schema = json.load(fh)

    if args.live:
        caller, local_available, available = _prepare_live()
    else:
        caller = _offline_caller
        local_available = False
        available = set()  # all public tiers assumed available offline

    router = ModelRouter(local_available=local_available, available=available)
    runner = Runner(router=router, caller=caller, schema=schema,
                    out_dir=os.path.join(HERE, "out"),
                    rate_limiter=RateLimiter())
    result = runner.run(args.run_id, task)
    trace_path = runner.write_trace(args.run_id)

    # post-run secret scan over trace + artifact
    scan_targets = [trace_path]
    if result.artifact_path:
        scan_targets.append(result.artifact_path)
    leaks = secrets_scan.scan_paths(scan_targets)

    report = {
        "run_id": args.run_id,
        "exit_code": result.exit_code,
        "exit_name": exits.NAMES.get(result.exit_code, "?"),
        "model_used": result.model_used,
        "artifact": result.artifact_path,
        "trace": trace_path,
        "anthropic_calls": 0,  # structural: Anthropic is never a routing target
        "secret_leaks": leaks,
        "rpm_budget_used": runner.rate_limiter.day_count,
    }
    print(json.dumps(report, indent=2))
    if leaks:
        return exits.SECRET_TRIPWIRE
    return result.exit_code


def _prepare_live():
    """§16.1 fail-fast liveness prerequisites. Returns (caller, local_available,
    available_tier_names)."""
    from harness.client import make_live_caller
    import urllib.request

    def slug_live(slug: str) -> bool:
        # presence check against the OpenRouter catalog
        try:
            with urllib.request.urlopen("https://openrouter.ai/api/v1/models", timeout=20) as r:
                cat = json.loads(r.read().decode("utf-8"))
            ids = {m.get("id") for m in cat.get("data", [])}
            return slug in ids
        except Exception:
            return False

    available = set()
    for tier in PUBLIC_LADDER:
        if tier.provider is Provider.OPENROUTER:
            if slug_live(tier.model):
                available.add(tier.name)
        elif tier.provider is Provider.MINIMAX_DIRECT:
            if os.environ.get("MINIMAX_API_KEY"):
                available.add(tier.name)  # plan key present; context-shim smoke at call time
    if not available:
        print(json.dumps({"error": "no live tier — §16.1 prerequisites failed",
                          "hint": "set OPENROUTER_API_KEY / MINIMAX_API_KEY via --env-file"}))
        sys.exit(exits.SLUG_UNAVAILABLE)
    return make_live_caller(), False, available


if __name__ == "__main__":
    sys.exit(main())
