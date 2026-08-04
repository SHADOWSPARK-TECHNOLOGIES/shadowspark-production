from __future__ import annotations

import asyncio
import logging
from typing import Any

from dotenv import load_dotenv
from mcp.server.mcpserver import MCPServer
from pydantic import AnyUrl, BaseModel, Field, ValidationError

from .browser_manager import BrowserManager, BrowserManagerError
from .config import SpadeSettings

load_dotenv()

logger = logging.getLogger("spade")
logging.basicConfig(level=logging.INFO)

settings = SpadeSettings()
browser_manager = BrowserManager(settings)
mcp = MCPServer(name="spade", title="Spade", description="Playwright browser automation MCP server")


class NavigateInput(BaseModel):
    url: AnyUrl


class ClickInput(BaseModel):
    selector: str = Field(min_length=1)


class TypeInput(BaseModel):
    selector: str = Field(min_length=1)
    text: str


class ScreenshotInput(BaseModel):
    full_page: bool = False


class ExecuteInput(BaseModel):
    script: str = Field(min_length=1)


@mcp.tool()
async def browser_navigate(url: str) -> dict[str, str]:
    """Navigate to a URL and return the final resolved URL."""
    try:
        payload = NavigateInput(url=url)
        final_url = await browser_manager.navigate(str(payload.url))
        return {"final_url": final_url}
    except ValidationError as exc:
        raise ValueError(f"Invalid input for browser_navigate: {exc}") from exc
    except BrowserManagerError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Unexpected error in browser_navigate: {exc}") from exc


@mcp.tool()
async def browser_click(selector: str) -> dict[str, str]:
    """Click an element using a CSS selector."""
    try:
        payload = ClickInput(selector=selector)
        await browser_manager.click(payload.selector)
        return {"status": "ok"}
    except ValidationError as exc:
        raise ValueError(f"Invalid input for browser_click: {exc}") from exc
    except BrowserManagerError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Unexpected error in browser_click: {exc}") from exc


@mcp.tool()
async def browser_type(selector: str, text: str) -> dict[str, str]:
    """Fill an input field using a CSS selector."""
    try:
        payload = TypeInput(selector=selector, text=text)
        await browser_manager.type(payload.selector, payload.text)
        return {"status": "ok"}
    except ValidationError as exc:
        raise ValueError(f"Invalid input for browser_type: {exc}") from exc
    except BrowserManagerError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Unexpected error in browser_type: {exc}") from exc


@mcp.tool()
async def browser_screenshot(full_page: bool = False) -> dict[str, Any]:
    """Return a base64-encoded PNG screenshot."""
    try:
        payload = ScreenshotInput(full_page=full_page)
        image_base64 = await browser_manager.screenshot_base64(full_page=payload.full_page)
        return {"content_type": "image/png", "image_base64": image_base64}
    except ValidationError as exc:
        raise ValueError(f"Invalid input for browser_screenshot: {exc}") from exc
    except BrowserManagerError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Unexpected error in browser_screenshot: {exc}") from exc


@mcp.tool()
async def browser_execute(script: str) -> dict[str, Any]:
    """Execute JavaScript in the active page context and return its result."""
    try:
        payload = ExecuteInput(script=script)
        result = await browser_manager.execute(payload.script)
        return {"result": result}
    except ValidationError as exc:
        raise ValueError(f"Invalid input for browser_execute: {exc}") from exc
    except BrowserManagerError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Unexpected error in browser_execute: {exc}") from exc


async def _run() -> None:
    await browser_manager.start()
    try:
        await mcp.run_stdio_async()
    finally:
        await browser_manager.stop()


def main() -> None:
    try:
        asyncio.run(_run())
    except KeyboardInterrupt:
        logger.info("Spade server interrupted; exiting gracefully.")
