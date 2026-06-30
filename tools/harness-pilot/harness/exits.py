"""Failure-taxonomy -> exit-code map (spec §10). Single source of truth."""
from __future__ import annotations

SUCCESS = 0
RATE_LIMITED = 10        # free-tier 429 after fallback exhausted
SLUG_UNAVAILABLE = 11    # model 404 / not available
UPSTREAM_5XX = 12        # provider error
NETWORK = 13             # connection timeout / network
STEP_TIMEOUT = 20        # per-step wall-clock timeout
RUN_TIMEOUT = 21         # overall run timeout
MAX_ITERS = 22           # max-iteration bound hit
LOCAL_DOWN_REFUSE = 30   # confidential task, no local model -> REFUSE
SCHEMA_INVALID = 40      # output failed schema validation
PARTIAL_WRITE = 41       # partial/corrupt write detected
EGRESS_DENIED = 50       # proxy blocked a non-allowlisted host
SECRET_TRIPWIRE = 60     # key prefix found in logs/artifact

NAMES = {
    SUCCESS: "success",
    RATE_LIMITED: "rate_limited",
    SLUG_UNAVAILABLE: "slug_unavailable",
    UPSTREAM_5XX: "upstream_5xx",
    NETWORK: "network",
    STEP_TIMEOUT: "step_timeout",
    RUN_TIMEOUT: "run_timeout",
    MAX_ITERS: "max_iterations",
    LOCAL_DOWN_REFUSE: "local_down_refuse",
    SCHEMA_INVALID: "schema_invalid",
    PARTIAL_WRITE: "partial_write",
    EGRESS_DENIED: "egress_denied",
    SECRET_TRIPWIRE: "secret_tripwire",
}


class HarnessError(Exception):
    def __init__(self, code: int, message: str = ""):
        self.code = code
        super().__init__(f"[{code}:{NAMES.get(code, '?')}] {message}")
