# ShadowSpark Production

This repository primarily contains the ShadowSpark production web application, and now also includes **Spade**: a self-contained Python MCP server for Playwright-based browser automation.

## Spade

Spade is a production-grade MCP server built with:
- Python 3.11+
- FastMCP from the `mcp` package
- Playwright async API with Chromium
- Pydantic v2 + `pydantic-settings`
- `python-dotenv` configuration

### Files

- `pyproject.toml`
- `run.py`
- `src/spade/`
- `tests/smoke_test.py`
- `.env.example`

### Configuration

Add these variables to your local `.env` file as needed:

```bash
SPADE_HEADLESS=true
SPADE_TIMEOUT_MS=30000
SPADE_SCREENSHOT_QUALITY=90
SPADE_START_URL=about:blank
```

### Install

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e .
playwright install chromium
```

### Run

```bash
python run.py
```

or via the console script:

```bash
spade
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector python run.py
```

If your inspector expects a command/args configuration, point it at either `python run.py` or the installed `spade` executable.

### Smoke test

```bash
python tests/smoke_test.py
```

### Exposed MCP tools

- `browser_navigate(url)`
- `browser_click(selector)`
- `browser_type(selector, text)`
- `browser_screenshot(full_page=False)`
- `browser_execute(script)`
