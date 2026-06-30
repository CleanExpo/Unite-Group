"""Model router for the Pilot Agentic Harness (Slice A).

Implements the cost-ordered tier ladder from the 100/100 spec
(docs/research/spec-agentic-harness-pilot.md) and the model-stack doctrine:

    owned (MiniMax plan) -> free (OpenRouter) -> cheap-paid (OpenRouter) -> local

Hard guarantees enforced HERE in code (and re-enforced at the network layer by the
proxy sidecar, see docker/):
  * api.anthropic.com is NEVER a routing target — workhorses gather, SOTA ships.
  * data_class gate is FAIL-CLOSED: anything not explicitly "public" is local-only.
  * every OpenRouter-routed call carries zdr=true; the owned MiniMax-direct tier has
    no zdr param and is therefore public-data-only.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class DataClass(str, Enum):
    PUBLIC = "public"
    CONFIDENTIAL = "confidential"


class Provider(str, Enum):
    MINIMAX_DIRECT = "minimax_direct"   # owned plan, anthropic-compatible shim
    OPENROUTER = "openrouter"           # free + cheap-paid
    LOCAL = "local"                     # Ornith-9B / Qwen via LM Studio / DMR


@dataclass(frozen=True)
class ModelTier:
    name: str            # tier label
    provider: Provider
    model: str           # slug / id
    base_url: str
    public_only: bool    # provider trains-on / no verified ZDR -> public data only


# The ladder. Order matters: cheapest-capable first (owned plan is flat-rate sunk cost).
# Prices are intentionally NOT encoded here — they are UNSUPPORTED-until-reconfirmed
# per the spec and live-probed at build start, not hard-coded.
PUBLIC_LADDER: tuple[ModelTier, ...] = (
    ModelTier("owned-minimax", Provider.MINIMAX_DIRECT, "MiniMax-M3",
              "https://api.minimax.io/anthropic", public_only=True),
    ModelTier("free-gptoss", Provider.OPENROUTER, "openai/gpt-oss-120b:free",
              "https://openrouter.ai/api/v1", public_only=True),
    ModelTier("cheap-deepseek", Provider.OPENROUTER, "deepseek/deepseek-v4-flash",
              "https://openrouter.ai/api/v1", public_only=True),
)

# Local lane = Docker Model Runner's in-container endpoint, PROVEN reachable from an
# egress-denied container this spike (UNI-2213); the model is pulled with
# `docker model pull <slug>`. (LM Studio at http://host.docker.internal:1234/v1 is the
# documented alternative runtime.)
LOCAL_TIER = ModelTier("local-ornith", Provider.LOCAL, "ornith-1.0-9b",
                       "http://model-runner.docker.internal/engines/v1", public_only=False)

# Never a routing target. Asserted by tests; the proxy also never allowlists it.
FORBIDDEN_HOSTS = ("api.anthropic.com", "anthropic.com")


class RouterError(Exception):
    pass


class NoLocalModelError(RouterError):
    """Confidential task but no local model available -> REFUSE (exit 30)."""


@dataclass
class RouteDecision:
    tier: ModelTier
    zdr: bool                  # True only for OpenRouter-routed calls
    reason: str
    data_class: DataClass

    def assert_safe(self) -> None:
        host = self.tier.base_url
        for bad in FORBIDDEN_HOSTS:
            if bad in host:
                raise RouterError(f"refusing route to forbidden host: {host}")
        if self.data_class is DataClass.CONFIDENTIAL and self.tier.provider is not Provider.LOCAL:
            raise RouterError("confidential data may only route to the local tier")
        # zdr must be set for OpenRouter, must be absent for non-OpenRouter
        if self.tier.provider is Provider.OPENROUTER and not self.zdr:
            raise RouterError("OpenRouter-routed call must carry zdr=true")
        if self.tier.provider is not Provider.OPENROUTER and self.zdr:
            raise RouterError("zdr only applies to OpenRouter-routed calls")


@dataclass
class ModelRouter:
    """Selects the tier for a job and yields an ordered fallback chain.

    `available` lets tests/runtime declare which tiers are live (from the §16.1
    liveness probes). A tier not in `available` is skipped in the fallback chain.
    """
    local_available: bool = False
    available: set[str] = field(default_factory=set)  # tier.name set; empty -> all public tiers assumed available

    def _is_available(self, tier: ModelTier) -> bool:
        if not self.available:
            return True
        return tier.name in self.available

    def select(self, data_class: DataClass) -> RouteDecision:
        if data_class is DataClass.CONFIDENTIAL:
            if not self.local_available:
                raise NoLocalModelError("confidential task and no local model available")
            d = RouteDecision(LOCAL_TIER, zdr=False, reason="confidential->local-only", data_class=data_class)
            d.assert_safe()
            return d
        # public: first available tier on the ladder
        for tier in PUBLIC_LADDER:
            if self._is_available(tier):
                d = RouteDecision(
                    tier,
                    zdr=(tier.provider is Provider.OPENROUTER),
                    reason=f"public->{tier.name}",
                    data_class=data_class,
                )
                d.assert_safe()
                return d
        # public fallback to local if nothing else available
        if self.local_available:
            d = RouteDecision(LOCAL_TIER, zdr=False, reason="public->local(overflow)", data_class=data_class)
            d.assert_safe()
            return d
        raise RouterError("no available tier for public task")

    def fallback_chain(self, data_class: DataClass) -> list[RouteDecision]:
        """Ordered decisions to try; each .assert_safe()-checked."""
        if data_class is DataClass.CONFIDENTIAL:
            return [self.select(data_class)]
        chain: list[RouteDecision] = []
        for tier in PUBLIC_LADDER:
            if self._is_available(tier):
                d = RouteDecision(tier, zdr=(tier.provider is Provider.OPENROUTER),
                                  reason=f"public->{tier.name}", data_class=data_class)
                d.assert_safe()
                chain.append(d)
        if self.local_available:
            d = RouteDecision(LOCAL_TIER, zdr=False, reason="public->local(overflow)", data_class=data_class)
            d.assert_safe()
            chain.append(d)
        if not chain:
            raise RouterError("no available tier for public task")
        return chain
