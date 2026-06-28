# test_client.py
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    server_params = StdioServerParameters(
        command="python",
        args=["mcp_server.py"],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            print("Tools:", [tool.name for tool in tools.tools])

            result = await session.call_tool(
                "calculate",
                {"expression": "sqrt(81) + log(100, 10)"},
            )
            print("Calculate:", result.content[0].text)

            # Example RaV-IDP call:
            result = await session.call_tool(
                "rav_idp_get_document_fidelity",
                {"document_path": "/home/pritesh-jha/Downloads/llama2-page-6.pdf"},
            )
            print(result.content[0].text)


asyncio.run(main())
