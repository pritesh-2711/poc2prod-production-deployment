"""Stateless MCP utility tools migrated from the application tool layer."""

from __future__ import annotations

import math
import os
import re
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

from ..config import settings

_TAVILY_BASE_URL = "https://api.tavily.com"
_DEFAULT_SEARCH_DEPTH = "advanced"
_DEFAULT_MAX_RESULTS = 5
_FETCH_TIMEOUT_SECONDS = 15
_MAX_CONTENT_CHARS = 8000

_SAFE_MATH_GLOBALS: dict[str, Any] = {"__builtins__": {}}
_SAFE_MATH_LOCALS: dict[str, Any] = {
    name: getattr(math, name)
    for name in dir(math)
    if not name.startswith("_")
}


def _get_tavily_api_key() -> str:
    key = settings.tavily_api_key or os.getenv("TAVILY_API_KEY", "")
    if not key:
        raise ValueError(
            "TAVILY_API_KEY is not set. Add it to mcp-tools-library/.env "
            "or the process environment."
        )
    return key


def register_utility_tools(mcp: FastMCP) -> None:
    @mcp.tool()
    def calculate(expression: str) -> str:
        """Evaluate a mathematical expression with Python math functions."""

        expression = expression.strip()
        if re.search(r"[;]|import|exec|eval|open|os\.|sys\.", expression):
            return "Expression rejected: contains disallowed keywords or operators."

        try:
            result = eval(expression, _SAFE_MATH_GLOBALS, _SAFE_MATH_LOCALS)  # noqa: S307
        except ZeroDivisionError:
            return "Error: division by zero."
        except (SyntaxError, NameError, TypeError, ValueError) as exc:
            return f"Could not evaluate expression: {exc}"
        except Exception as exc:
            return f"Unexpected error: {exc}"

        if isinstance(result, float):
            return f"{result:.10g}"
        return str(result)

    @mcp.tool()
    def web_search(
        query: str,
        max_results: int = _DEFAULT_MAX_RESULTS,
        include_domains: list[str] | None = None,
        search_depth: str = _DEFAULT_SEARCH_DEPTH,
    ) -> str:
        """Search the web for current information using Tavily."""

        try:
            api_key = _get_tavily_api_key()
        except ValueError as exc:
            return str(exc)

        max_results = min(max(max_results, 1), 10)
        payload: dict[str, Any] = {
            "api_key": api_key,
            "query": query,
            "search_depth": search_depth,
            "max_results": max_results,
            "include_answer": True,
            "include_raw_content": False,
        }
        if include_domains:
            payload["include_domains"] = include_domains

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(f"{_TAVILY_BASE_URL}/search", json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as exc:
            return f"Search failed: HTTP {exc.response.status_code} from Tavily API."
        except httpx.RequestError as exc:
            return f"Search failed: Could not reach Tavily API. {exc}"

        results = data.get("results", [])
        if not results:
            return f"No results found for query: {query!r}"

        lines: list[str] = []
        if data.get("answer"):
            lines.append(f"Summary: {data['answer']}\n")

        for index, result in enumerate(results, 1):
            title = result.get("title", "No title")
            url = result.get("url", "")
            content = result.get("content", "")
            score = result.get("score", 0.0)
            lines.append(f"[{index}] {title}")
            lines.append(f"    URL: {url}")
            lines.append(f"    Relevance: {score:.2f}")
            if content:
                snippet = content[:300].replace("\n", " ")
                lines.append(f"    Excerpt: {snippet}...")
            lines.append("")

        return "\n".join(lines)

    @mcp.tool()
    def fetch_webpage(url: str, max_chars: int = _MAX_CONTENT_CHARS) -> str:
        """Fetch and extract readable text from a webpage."""

        if not url.startswith(("http://", "https://")):
            return f"Invalid URL: {url!r}. URL must start with http:// or https://"
        if url.lower().endswith(".pdf"):
            return "This URL points to a PDF file. Download and process the PDF directly."

        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (compatible; ResearchAssistantMCP/1.0; "
                    "+https://github.com/pritesh-2711/genai-poc-to-prod)"
                )
            }
            with httpx.Client(timeout=_FETCH_TIMEOUT_SECONDS, follow_redirects=True) as client:
                response = client.get(url, headers=headers)
                response.raise_for_status()
                html = response.text
        except httpx.HTTPStatusError as exc:
            return f"Failed to fetch page: HTTP {exc.response.status_code} at {url}"
        except httpx.RequestError as exc:
            return f"Failed to fetch page: {exc}"

        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(html, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()
            text = soup.get_text(separator="\n", strip=True)
            lines = [line for line in text.splitlines() if line.strip()]
            content = "\n".join(lines)
        except ImportError:
            content = re.sub(r"<[^>]+>", " ", html)
            content = re.sub(r"\s+", " ", content).strip()

        max_chars = min(max(max_chars, 1), 50000)
        if len(content) > max_chars:
            content = content[:max_chars] + f"\n\n[Truncated at {max_chars} characters]"
        if not content.strip():
            return f"No readable text content found at {url}"
        return f"Content from {url}:\n\n{content}"
