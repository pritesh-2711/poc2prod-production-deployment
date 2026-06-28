# MCP Tools Library

Standalone MCP tools hub for the research assistant application.

The application should connect to this server as an MCP client. New tools can be
added here without coupling their implementation to the main API process.

## Current Tools

- `rav_idp_process_and_ingest`: runs RaV-IDP on a local document and writes entity records to JSON.
- `rav_idp_get_document_fidelity`: runs RaV-IDP and returns document-level fidelity metrics.
- `analyse`: runs Python/pandas analysis code inside an E2B sandbox.
- `calculate`: safe mathematical expression evaluator.
- `web_search`: Tavily-backed web search.
- `fetch_webpage`: simple readable-text extraction for webpages.

## Shutdown

The server handles `SIGINT` (Ctrl+C) and `SIGTERM` cleanly — a single Ctrl+C
is enough to stop it. A `try/except KeyboardInterrupt` around `mcp.run()` and
`signal.signal` handlers on both signals ensure the event loop exits on the
first interrupt rather than requiring multiple presses.

## Local Development

```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -e .
python mcp_server.py
```

For MCP inspector/dev workflows:

```bash
mcp dev mcp_server.py
```

## Configuration

Set these values in `.env` or the process environment:

- `TAVILY_API_KEY`: required for `web_search`.
- `RAV_IDP_MODE`: `full`, `gate_only`, or `no_rav`.
- `RAV_IDP_OUTPUT_DIR`: where RaV-IDP JSON outputs are written.
- `E2B_API_KEY`: required for `analyse`.

## Data Analysis Tool Design

`analyse` intentionally runs in E2B, not on the host application machine. The
tool accepts a question, Python code, and optional CSV text. The sandbox writes
the CSV into its own filesystem and executes the supplied code there.

This keeps EDA isolated from the app server while still allowing pandas,
matplotlib, scipy, sklearn, and similar packages to be used in the sandbox
environment.

### Chart output

When the Python code calls `plt.show()`, the sandbox captures the rendered plot
as a base64-encoded PNG and returns it in the `charts` key of the tool response.
The application backend validates each image against the PNG magic bytes
(`\x89PNG`) before passing it to the frontend.

**Important:** always use `plt.show()` — never `plt.savefig()`. The sandbox
returns display output only; filesystem writes are not returned to the caller.

Use `plt.figure(figsize=(8, 5))` as the standard figure size to keep chart
dimensions consistent across responses.

## RaV-IDP Notes

The Python module is named `server/tools/rav_idp.py` because hyphenated filenames
are not importable Python modules. The MCP-facing tool names still use `rav_idp`
so callers do not need to care about the implementation filename.

`rav_idp_process_and_ingest` currently processes and persists JSON records in
this repository's output directory. It does not insert into the main application
database yet; that decision can be made after validating the extracted entity
schema and fidelity metrics.

The RaV-IDP package is vendored in this repository under `rav_idp/`; it is not
loaded from a sibling checkout or absolute local path. Install RaV-IDP extras
with:

```bash
pip install -e ".[rav-idp]"
```

RaV-IDP may also require system OCR/layout dependencies from its own repo, such
as Tesseract, depending on the document mode being used.
