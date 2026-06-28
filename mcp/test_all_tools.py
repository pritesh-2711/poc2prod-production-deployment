"""Smoke-test MCP tools through the stdio client.

Examples:
  python test_all_tools.py
  python test_all_tools.py --web
  python test_all_tools.py --analysis
  python test_all_tools.py --pdf /absolute/path/to/file.pdf
  python test_all_tools.py --all --pdf /absolute/path/to/file.pdf
"""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def _text(result: Any) -> str:
    if not result.content:
        return ""
    return getattr(result.content[0], "text", str(result.content[0]))


def _print_result(name: str, result: Any, max_chars: int = 1200) -> None:
    text = _text(result)
    if len(text) > max_chars:
        text = text[:max_chars] + f"\n...[truncated, total {len(_text(result))} chars]"
    print(f"\n=== {name} ===")
    print(text)


async def _call(
    session: ClientSession,
    name: str,
    args: dict[str, Any],
    timeout_seconds: int,
) -> Any:
    try:
        result = await asyncio.wait_for(
            session.call_tool(name, args),
            timeout=timeout_seconds,
        )
    except TimeoutError:
        print(f"\n=== {name} ===")
        print(f"TIMEOUT after {timeout_seconds}s")
        return None
    except Exception as exc:
        print(f"\n=== {name} ===")
        print(f"ERROR: {exc}")
        return None
    _print_result(name, result)
    return result


async def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke-test MCP tools.")
    parser.add_argument("--pdf", help="PDF path for RaV-IDP tools.")
    parser.add_argument("--web", action="store_true", help="Test Tavily/webpage tools.")
    parser.add_argument("--analysis", action="store_true", help="Test E2B analysis tool.")
    parser.add_argument("--all", action="store_true", help="Run every configured test.")
    parser.add_argument("--timeout", type=int, default=120, help="Per-tool timeout in seconds.")
    args = parser.parse_args()

    server_params = StdioServerParameters(command="python", args=["mcp_server.py"])

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            print("Tools:", [tool.name for tool in tools.tools])

            await _call(
                session,
                "calculate",
                {"expression": "sqrt(81) + log(100, 10)"},
                args.timeout,
            )

            if args.web or args.all:
                await _call(
                    session,
                    "web_search",
                    {
                        "query": "Model Context Protocol official documentation",
                        "max_results": 2,
                        "include_domains": ["modelcontextprotocol.io"],
                    },
                    args.timeout,
                )
                await _call(
                    session,
                    "fetch_webpage",
                    {"url": "https://modelcontextprotocol.io", "max_chars": 1200},
                    args.timeout,
                )

            if args.analysis or args.all:
                await _call(
                    session,
                    "analyse",
                    {
                        "question": "Compute summary stats for a tiny dataset.",
                        "dataset_csv": "x,y\n1,2\n2,4\n3,8\n",
                        "python_code": (
                            "import pandas as pd\n"
                            "df = pd.read_csv('dataset.csv')\n"
                            "print(df.describe().to_string())\n"
                            "print({'corr': round(df['x'].corr(df['y']), 4)})\n"
                        ),
                    },
                    args.timeout,
                )

            if args.pdf:
                pdf = Path(args.pdf).expanduser().resolve()
                await _call(
                    session,
                    "rav_idp_get_document_fidelity",
                    {"document_path": str(pdf)},
                    args.timeout,
                )
                result = await _call(
                    session,
                    "rav_idp_process_and_ingest",
                    {"document_path": str(pdf), "output_name": pdf.stem},
                    args.timeout,
                )
                if result is not None:
                    try:
                        payload = json.loads(_text(result))
                        print("Output path:", payload.get("output_path"))
                    except json.JSONDecodeError:
                        pass


if __name__ == "__main__":
    asyncio.run(main())
