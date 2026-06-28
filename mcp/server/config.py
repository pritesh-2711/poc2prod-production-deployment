"""Configuration for the standalone MCP tools server."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")


class Settings(BaseSettings):
    """Environment-backed settings for tool dependencies."""

    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    mcp_server_name: str = "mcp-tools-library"
    mcp_transport: Literal["stdio", "sse", "streamable-http"] = "stdio"
    mcp_host: str = "127.0.0.1"
    mcp_port: int = 8001

    tavily_api_key: str = ""

    rav_idp_mode: Literal["full", "gate_only", "no_rav"] = "full"
    rav_idp_output_dir: Path = Path(".mcp-data/rav-idp")

    e2b_api_key: str = ""
    e2b_analysis_timeout_seconds: int = 300


settings = Settings()
