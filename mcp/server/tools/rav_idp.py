"""RaV-IDP MCP tools."""

from __future__ import annotations

import json
from base64 import b64encode
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

from ..config import ROOT_DIR, settings
from ..deps import build_rav_idp_pipeline


def _as_jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return _as_jsonable(value.model_dump(mode="python"))
    if isinstance(value, bytes):
        return {
            "type": "bytes",
            "size": len(value),
            "base64_preview": b64encode(value[:128]).decode("ascii"),
            "truncated": len(value) > 128,
        }
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, list):
        return [_as_jsonable(item) for item in value]
    if isinstance(value, tuple):
        return [_as_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _as_jsonable(item) for key, item in value.items()}
    if hasattr(value, "value"):
        return value.value
    return value


def _resolve_output_dir() -> Path:
    output_dir = settings.rav_idp_output_dir
    if not output_dir.is_absolute():
        output_dir = ROOT_DIR / output_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def _summarize_fidelity(records: list[Any]) -> dict[str, Any]:
    scores: list[float] = []
    low_confidence = 0
    by_type: dict[str, dict[str, Any]] = {}

    for record in records:
        data = _as_jsonable(record)
        score = data.get("fidelity_score")
        entity_type = str(data.get("entity_type", "unknown"))
        if isinstance(score, int | float):
            scores.append(float(score))
            bucket = by_type.setdefault(entity_type, {"count": 0, "avg_fidelity": 0.0})
            bucket["count"] += 1
            bucket["avg_fidelity"] += float(score)
        if data.get("low_confidence_flag"):
            low_confidence += 1

    for bucket in by_type.values():
        if bucket["count"]:
            bucket["avg_fidelity"] = round(bucket["avg_fidelity"] / bucket["count"], 4)

    avg = round(sum(scores) / len(scores), 4) if scores else None
    return {
        "entity_count": len(records),
        "average_fidelity": avg,
        "low_confidence_count": low_confidence,
        "by_type": by_type,
    }


def register_rav_idp_tools(mcp: FastMCP) -> None:
    @mcp.tool(name="rav_idp_process_and_ingest")
    def process_and_ingest(document_path: str, output_name: str | None = None) -> dict[str, Any]:
        """Run RaV-IDP on a local document and write entity records to JSON."""

        path = Path(document_path).expanduser().resolve()
        if not path.exists():
            return {"ok": False, "error": f"Document not found: {path}"}

        try:
            pipeline = build_rav_idp_pipeline()
            records = pipeline.run(path)
        except Exception as exc:
            return {"ok": False, "error": f"RaV-IDP processing failed: {exc}"}

        output_dir = _resolve_output_dir()
        safe_stem = output_name or path.stem
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        output_path = output_dir / f"{safe_stem}-{timestamp}.json"
        payload = {
            "source_document": str(path),
            "rav_idp_mode": settings.rav_idp_mode,
            "summary": _summarize_fidelity(records),
            "records": _as_jsonable(records),
        }
        output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

        return {
            "ok": True,
            "output_path": str(output_path),
            "summary": payload["summary"],
        }

    @mcp.tool(name="rav_idp_get_document_fidelity")
    def get_document_fidelity(document_path: str) -> dict[str, Any]:
        """Run RaV-IDP and return document-level fidelity metrics."""

        path = Path(document_path).expanduser().resolve()
        if not path.exists():
            return {"ok": False, "error": f"Document not found: {path}"}

        try:
            pipeline = build_rav_idp_pipeline()
            records = pipeline.run(path)
        except Exception as exc:
            return {"ok": False, "error": f"RaV-IDP fidelity check failed: {exc}"}

        return {
            "ok": True,
            "source_document": str(path),
            "rav_idp_mode": settings.rav_idp_mode,
            "summary": _summarize_fidelity(records),
        }
