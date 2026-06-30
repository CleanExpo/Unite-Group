"""OpenAI/Anthropic-compatible HTTP client (stdlib urllib — no third-party deps).

Used for LIVE runs only. Tests inject a fake caller and never import this against a
real network. Enforces spec §12 secret hygiene at the client boundary:
  * Authorization header is redacted in any error surfaced.
  * zdr=true is set on OpenRouter-routed request bodies (passed in by the runner via
    the RouteDecision); the owned MiniMax-direct tier never receives a zdr param.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from . import exits
from .router import Provider, RouteDecision


def _redact(s: str) -> str:
    import re
    return re.sub(r"(Bearer\s+|sk-[A-Za-z0-9\-]{2,}|sk-or-v1-)[A-Za-z0-9_\-]+",
                  r"\1[REDACTED]", s or "")


def make_live_caller(env: dict | None = None):
    """Returns a ModelCaller bound to live endpoints. Reads keys from env (injected
    via --env-file in the container; never -e). Missing key for a needed tier raises
    a clear HarnessError rather than leaking anything."""
    env = env or os.environ

    def caller(decision: RouteDecision, prompt: str, max_tokens: int) -> str:
        tier = decision.tier
        if tier.provider is Provider.OPENROUTER:
            key = env.get("OPENROUTER_API_KEY", "")
            url = tier.base_url + "/chat/completions"
            body = {
                "model": tier.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "zdr": True,  # enforced no-retention on the OpenRouter lane
            }
            headers = {"Authorization": "Bearer " + key, "Content-Type": "application/json"}
        elif tier.provider is Provider.MINIMAX_DIRECT:
            key = env.get("MINIMAX_API_KEY", "")
            url = tier.base_url + "/v1/messages"
            body = {
                "model": tier.model,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            }  # NOTE: no zdr param on the owned-direct lane (public-data-only)
            headers = {"x-api-key": key, "anthropic-version": "2023-06-01",
                       "Content-Type": "application/json"}
        else:  # LOCAL
            key = env.get("LOCAL_API_KEY", "not-needed")
            url = tier.base_url + "/chat/completions"
            body = {"model": tier.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens}
            headers = {"Authorization": "Bearer " + key, "Content-Type": "application/json"}

        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            code = e.code
            if code == 429:
                raise exits.HarnessError(exits.RATE_LIMITED, _redact(str(e)))
            if code == 404:
                raise exits.HarnessError(exits.SLUG_UNAVAILABLE, _redact(str(e)))
            if 500 <= code < 600:
                raise exits.HarnessError(exits.UPSTREAM_5XX, _redact(str(e)))
            raise exits.HarnessError(exits.NETWORK, _redact(str(e)))
        except (urllib.error.URLError, TimeoutError) as e:
            raise exits.HarnessError(exits.NETWORK, _redact(str(e)))

        # OpenAI-style and Anthropic-style extraction
        if "choices" in payload:
            return payload["choices"][0]["message"]["content"]
        if "content" in payload and isinstance(payload["content"], list):
            return "".join(part.get("text", "") for part in payload["content"])
        return json.dumps(payload)

    return caller
