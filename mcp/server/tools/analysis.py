"""Data analysis MCP tool backed by an E2B sandbox."""

from __future__ import annotations

import base64
import logging
import os
import json
import textwrap
from typing import Any

from mcp.server.fastmcp import FastMCP

from ..config import settings

logger = logging.getLogger(__name__)

_PNG_MAGIC = b"\x89PNG"


def _extract_and_validate_charts(result: Any) -> list[str]:
    """Extract base64-encoded PNG charts from E2B execution results.

    Validates each chart by checking PNG magic bytes before including it.
    Returns a list of valid base64 PNG strings (without the data URI prefix).
    """
    charts: list[str] = []
    raw_results = getattr(result, "results", None) or []
    for item in raw_results:
        png_b64 = getattr(item, "png", None)
        if not png_b64 or not isinstance(png_b64, str):
            continue
        try:
            decoded = base64.b64decode(png_b64)
            if decoded[:4] == _PNG_MAGIC:
                charts.append(png_b64)
            else:
                logger.warning("E2B chart failed PNG magic-byte check, skipping")
        except Exception as exc:
            logger.warning("E2B chart base64 decode failed: %s", exc)
    return charts


def _result_to_dict(result: Any) -> dict[str, Any]:
    charts = _extract_and_validate_charts(result)

    if hasattr(result, "to_json"):
        raw_json = result.to_json()
        if isinstance(raw_json, str):
            data = json.loads(raw_json)
            if isinstance(data.get("logs"), str):
                data["logs"] = json.loads(data["logs"])
            data["charts"] = charts
            return data
        if isinstance(raw_json, dict):
            raw_json["charts"] = charts
        return raw_json

    data: dict[str, Any] = {"charts": charts}
    for attr in ("text", "stdout", "stderr", "error", "results", "logs"):
        if hasattr(result, attr):
            value = getattr(result, attr)
            if value:
                data[attr] = value
    return data


def register_analysis_tools(mcp: FastMCP) -> None:
    @mcp.tool(name="analyse")
    def analyse(
        question: str,
        python_code: str,
        dataset_csv: str | None = None,
        dataset_filename: str = "dataset.csv",
    ) -> dict[str, Any]:
        """Run pandas-based EDA or analysis code inside an E2B sandbox.

        Pass a concise question, executable Python analysis code, and optionally
        CSV content. The sandbox has no access to the host filesystem.
        """

        if not settings.e2b_api_key and not os.getenv("E2B_API_KEY"):
            return {
                "ok": False,
                "error": "E2B_API_KEY is not set. Add it before running data analysis.",
            }

        try:
            from e2b_code_interpreter import Sandbox
        except ImportError as exc:
            return {
                "ok": False,
                "error": (
                    "e2b-code-interpreter is not installed. Install project "
                    "dependencies before using analyse."
                ),
                "details": str(exc),
            }

        if settings.e2b_api_key:
            os.environ["E2B_API_KEY"] = settings.e2b_api_key

        setup_code = ""
        if dataset_csv is not None:
            setup_code = (
                "from pathlib import Path\n"
                f"Path({dataset_filename!r}).write_text({dataset_csv!r}, encoding='utf-8')\n"
            )

        wrapped_code = "\n".join(
            part
            for part in [
                f"# Question: {question}",
                setup_code.strip(),
                textwrap.dedent(python_code).strip(),
            ]
            if part
        )

        try:
            with Sandbox.create(timeout=settings.e2b_analysis_timeout_seconds) as sandbox:
                result = sandbox.run_code(
                    wrapped_code,
                    timeout=settings.e2b_analysis_timeout_seconds,
                )
        except Exception as exc:
            return {"ok": False, "error": f"E2B analysis failed: {exc}"}

        payload = _result_to_dict(result)
        payload["ok"] = not bool(payload.get("error"))
        return payload
