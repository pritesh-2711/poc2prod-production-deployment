"""MCP tool tests.

All external services (Tavily, E2B, rav_idp pipeline) are mocked so these
tests are fast and require no API keys. The CaptureMCP helper extracts tool
functions from register_*_tools() without depending on FastMCP internals.
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# CaptureMCP — minimal stand-in for FastMCP that collects tool functions
# ---------------------------------------------------------------------------

class _CaptureMCP:
    """Records @mcp.tool() decorated functions by name."""

    def __init__(self):
        self._tools: dict = {}

    def tool(self, name=None, **kwargs):
        def decorator(fn):
            key = name if name else fn.__name__
            self._tools[key] = fn
            return fn
        return decorator


# ---------------------------------------------------------------------------
# Utility tools: calculate and web_search
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def utility_tools() -> dict:
    from server.tools.utility import register_utility_tools
    mcp = _CaptureMCP()
    register_utility_tools(mcp)
    return mcp._tools


class TestCalculate:
    def test_simple_addition(self, utility_tools) -> None:
        assert utility_tools["calculate"]("2 + 2") == "4"

    def test_float_result(self, utility_tools) -> None:
        result = utility_tools["calculate"]("1 / 3")
        assert result.startswith("0.333")

    def test_math_function(self, utility_tools) -> None:
        result = utility_tools["calculate"]("sqrt(16)")
        assert result == "4"

    def test_division_by_zero(self, utility_tools) -> None:
        result = utility_tools["calculate"]("1 / 0")
        assert "division by zero" in result.lower()

    def test_invalid_expression(self, utility_tools) -> None:
        result = utility_tools["calculate"]("not_a_number + 5")
        assert "Could not evaluate" in result or "error" in result.lower()

    def test_rejected_when_import_present(self, utility_tools) -> None:
        result = utility_tools["calculate"]("import os")
        assert "rejected" in result.lower()

    def test_rejected_when_exec_present(self, utility_tools) -> None:
        result = utility_tools["calculate"]("exec('print(1)')")
        assert "rejected" in result.lower()

    def test_rejected_when_semicolon_present(self, utility_tools) -> None:
        result = utility_tools["calculate"]("1+1; import os")
        assert "rejected" in result.lower()

    def test_whitespace_is_stripped(self, utility_tools) -> None:
        assert utility_tools["calculate"]("  3 * 3  ") == "9"


class TestWebSearch:
    def test_returns_formatted_results(self, utility_tools) -> None:
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "answer": "Python is a programming language.",
            "results": [
                {
                    "title": "Python.org",
                    "url": "https://python.org",
                    "content": "Official Python website.",
                    "score": 0.95,
                }
            ],
        }
        mock_response.raise_for_status = MagicMock()

        with (
            patch("server.tools.utility._get_tavily_api_key", return_value="fake-key"),
            patch("server.tools.utility.httpx.Client") as mock_client_cls,
        ):
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.post.return_value = mock_response
            mock_client_cls.return_value = mock_client

            result = utility_tools["web_search"]("python programming")

        assert "Python.org" in result
        assert "https://python.org" in result

    def test_empty_results_returns_graceful_message(self, utility_tools) -> None:
        mock_response = MagicMock()
        mock_response.json.return_value = {"results": []}
        mock_response.raise_for_status = MagicMock()

        with (
            patch("server.tools.utility._get_tavily_api_key", return_value="fake-key"),
            patch("server.tools.utility.httpx.Client") as mock_client_cls,
        ):
            mock_client = MagicMock()
            mock_client.__enter__ = lambda s: mock_client
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.post.return_value = mock_response
            mock_client_cls.return_value = mock_client

            result = utility_tools["web_search"]("obscure query with no results")

        assert "No results found" in result

    def test_missing_api_key_returns_error_string(self, utility_tools) -> None:
        with patch(
            "server.tools.utility._get_tavily_api_key",
            side_effect=ValueError("TAVILY_API_KEY is not set"),
        ):
            result = utility_tools["web_search"]("anything")
        assert "TAVILY_API_KEY" in result


# ---------------------------------------------------------------------------
# Analysis tool: analyse
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def analysis_tools() -> dict:
    from server.tools.analysis import register_analysis_tools
    mcp = _CaptureMCP()
    register_analysis_tools(mcp)
    return mcp._tools


class TestAnalyse:
    def test_returns_error_when_e2b_key_missing(self, analysis_tools, monkeypatch) -> None:
        monkeypatch.delenv("E2B_API_KEY", raising=False)
        with patch("server.tools.analysis.settings") as mock_settings:
            mock_settings.e2b_api_key = None
            result = analysis_tools["analyse"](
                question="what is 1+1?",
                python_code="print(1+1)",
            )
        assert result["ok"] is False
        assert "E2B_API_KEY" in result["error"]

    def test_returns_error_when_e2b_not_installed(self, analysis_tools, monkeypatch) -> None:
        monkeypatch.setenv("E2B_API_KEY", "fake-key")
        with (
            patch("server.tools.analysis.settings") as mock_settings,
            patch.dict("sys.modules", {"e2b_code_interpreter": None}),
        ):
            mock_settings.e2b_api_key = "fake-key"
            result = analysis_tools["analyse"](
                question="what is 1+1?",
                python_code="print(1+1)",
            )
        assert result["ok"] is False

    def test_returns_charts_key_in_response(self, analysis_tools, monkeypatch) -> None:
        import base64
        import sys

        monkeypatch.setenv("E2B_API_KEY", "fake-key")

        # Build a minimal fake PNG (4 magic bytes + padding)
        fake_png = b"\x89PNG" + b"\x00" * 10
        fake_b64 = base64.b64encode(fake_png).decode()

        fake_result = MagicMock()
        fake_result.results = [MagicMock(png=fake_b64)]
        fake_result.to_json.return_value = json.dumps(
            {"logs": "{}", "charts": [fake_b64], "ok": True}
        )

        mock_sandbox_instance = MagicMock()
        mock_sandbox_instance.__enter__ = lambda s: mock_sandbox_instance
        mock_sandbox_instance.__exit__ = MagicMock(return_value=False)
        mock_sandbox_instance.run_code.return_value = fake_result

        mock_sandbox_cls = MagicMock()
        mock_sandbox_cls.create.return_value = mock_sandbox_instance

        mock_e2b_module = MagicMock()
        mock_e2b_module.Sandbox = mock_sandbox_cls

        with (
            patch("server.tools.analysis.settings") as mock_settings,
            patch.dict(sys.modules, {"e2b_code_interpreter": mock_e2b_module}),
        ):
            mock_settings.e2b_api_key = "fake-key"
            mock_settings.e2b_analysis_timeout_seconds = 30

            result = analysis_tools["analyse"](
                question="test question",
                python_code="print('hello')",
            )

        assert "charts" in result


# ---------------------------------------------------------------------------
# RaV-IDP tool: rav_idp_process_and_ingest
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def rav_idp_tools() -> dict:
    from server.tools.rav_idp import register_rav_idp_tools
    mcp = _CaptureMCP()
    register_rav_idp_tools(mcp)
    return mcp._tools


class TestRavIdpProcessAndIngest:
    def test_returns_error_when_file_not_found(self, rav_idp_tools) -> None:
        result = rav_idp_tools["rav_idp_process_and_ingest"](
            document_path="/nonexistent/file.pdf"
        )
        assert result["ok"] is False
        assert "not found" in result["error"]

    def test_writes_output_json_on_success(self, rav_idp_tools, tmp_path) -> None:
        dummy_pdf = tmp_path / "sample.pdf"
        dummy_pdf.write_bytes(b"%PDF-1.4 fake pdf content")

        mock_record = MagicMock()
        mock_record.model_dump.return_value = {"entity_type": "text", "fidelity_score": 0.9}

        with (
            patch("server.tools.rav_idp.build_rav_idp_pipeline") as mock_build,
            patch("server.tools.rav_idp._resolve_output_dir", return_value=tmp_path),
            patch("server.tools.rav_idp.settings") as mock_settings,
        ):
            mock_pipeline = MagicMock()
            mock_pipeline.run.return_value = [mock_record]
            mock_build.return_value = mock_pipeline
            mock_settings.rav_idp_mode = "full"

            result = rav_idp_tools["rav_idp_process_and_ingest"](
                document_path=str(dummy_pdf)
            )

        assert result["ok"] is True
        assert "output_path" in result
        assert Path(result["output_path"]).exists()

    def test_output_json_contains_expected_keys(self, rav_idp_tools, tmp_path) -> None:
        dummy_pdf = tmp_path / "doc.pdf"
        dummy_pdf.write_bytes(b"%PDF-1.4 content")

        mock_record = MagicMock()
        mock_record.model_dump.return_value = {"entity_type": "table", "fidelity_score": 0.8}

        with (
            patch("server.tools.rav_idp.build_rav_idp_pipeline") as mock_build,
            patch("server.tools.rav_idp._resolve_output_dir", return_value=tmp_path),
            patch("server.tools.rav_idp.settings") as mock_settings,
        ):
            mock_pipeline = MagicMock()
            mock_pipeline.run.return_value = [mock_record]
            mock_build.return_value = mock_pipeline
            mock_settings.rav_idp_mode = "full"

            result = rav_idp_tools["rav_idp_process_and_ingest"](
                document_path=str(dummy_pdf)
            )

        output_data = json.loads(Path(result["output_path"]).read_text())
        assert "source_document" in output_data
        assert "records" in output_data
        assert "summary" in output_data

    def test_pipeline_exception_returns_error(self, rav_idp_tools, tmp_path) -> None:
        dummy_pdf = tmp_path / "fail.pdf"
        dummy_pdf.write_bytes(b"%PDF-1.4 content")

        with patch("server.tools.rav_idp.build_rav_idp_pipeline") as mock_build:
            mock_pipeline = MagicMock()
            mock_pipeline.run.side_effect = RuntimeError("extraction failed")
            mock_build.return_value = mock_pipeline

            result = rav_idp_tools["rav_idp_process_and_ingest"](
                document_path=str(dummy_pdf)
            )

        assert result["ok"] is False
        assert "extraction failed" in result["error"]
