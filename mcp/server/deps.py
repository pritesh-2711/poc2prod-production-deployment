"""Lazy dependency helpers for MCP tools.

This mirrors the app-level deps pattern, but keeps expensive or optional
dependencies out of process startup until a tool actually needs them.
"""

from __future__ import annotations

from functools import lru_cache

from .config import settings


@lru_cache(maxsize=1)
def get_rav_idp_pipeline_class():
    """Return the vendored RaVIDPPipeline implementation."""

    try:
        from rav_idp.pipeline import RaVIDPPipeline
    except ImportError as exc:
        raise RuntimeError(
            "RaV-IDP is not importable from this MCP package. Install the "
            f"RaV-IDP optional/runtime dependencies. Import error: {exc}"
        ) from exc

    return RaVIDPPipeline


def build_rav_idp_pipeline():
    pipeline_cls = get_rav_idp_pipeline_class()
    return pipeline_cls(mode=settings.rav_idp_mode)
