"""Tool registration package."""

from mcp.server.fastmcp import FastMCP

from .analysis import register_analysis_tools
from .rav_idp import register_rav_idp_tools
from .utility import register_utility_tools


def register_tools(mcp: FastMCP) -> None:
    register_utility_tools(mcp)
    register_rav_idp_tools(mcp)
    register_analysis_tools(mcp)
