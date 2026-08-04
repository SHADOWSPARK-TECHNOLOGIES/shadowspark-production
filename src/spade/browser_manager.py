from __future__ import annotations

import asyncio
import base64
from contextlib import suppress
from dataclasses import dataclass
from typing import Any

from playwright.async_api import (
    Browser,
    BrowserContext,
    Error as PlaywrightError,
    Page,
    Playwright,
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)

from .config import SpadeSettings


class BrowserManagerError(RuntimeError):
    """Raised when browser lifecycle or browser actions fail."""


@dataclass(slots=True)
class BrowserState:
    playwright: Playwright
    browser: Browser
    context: BrowserContext
    page: Page


class BrowserManager:
    def __init__(self, settings: SpadeSettings) -> None:
        self._settings = settings
        self._state: BrowserState | None = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        async with self._lock:
            if self._state is not None:
                return

            playwright = await async_playwright().start()
            browser = await playwright.chromium.launch(headless=self._settings.headless)
            context = await browser.new_context()
            page = await context.new_page()
            page.set_default_timeout(self._settings.timeout_ms)

            if self._settings.start_url:
                await page.goto(self._settings.start_url, wait_until="domcontentloaded")

            self._state = BrowserState(
                playwright=playwright,
                browser=browser,
                context=context,
                page=page,
            )

    async def stop(self) -> None:
        async with self._lock:
            if self._state is None:
                return

            state = self._state
            self._state = None

            with suppress(Exception):
                await state.page.close()
            with suppress(Exception):
                await state.context.close()
            with suppress(Exception):
                await state.browser.close()
            with suppress(Exception):
                await state.playwright.stop()

    async def _get_page(self) -> Page:
        if self._state is None:
            raise BrowserManagerError("Browser is not started.")
        return self._state.page

    async def navigate(self, url: str) -> str:
        page = await self._get_page()
        try:
            response = await page.goto(url, wait_until="domcontentloaded")
            return response.url if response is not None else page.url
        except PlaywrightTimeoutError as exc:
            raise BrowserManagerError(f"Navigation timeout for url={url}") from exc
        except PlaywrightError as exc:
            raise BrowserManagerError(f"Navigation failed for url={url}: {exc}") from exc

    async def click(self, selector: str) -> None:
        page = await self._get_page()
        try:
            await page.locator(selector).first.click()
        except PlaywrightTimeoutError as exc:
            raise BrowserManagerError(f"Click timeout for selector={selector}") from exc
        except PlaywrightError as exc:
            raise BrowserManagerError(f"Click failed for selector={selector}: {exc}") from exc

    async def type(self, selector: str, text: str) -> None:
        page = await self._get_page()
        try:
            await page.locator(selector).first.fill(text)
        except PlaywrightTimeoutError as exc:
            raise BrowserManagerError(f"Type timeout for selector={selector}") from exc
        except PlaywrightError as exc:
            raise BrowserManagerError(f"Type failed for selector={selector}: {exc}") from exc

    async def screenshot_base64(self, *, full_page: bool = False) -> str:
        page = await self._get_page()
        try:
            image_bytes = await page.screenshot(type="png", full_page=full_page)
            return base64.b64encode(image_bytes).decode("utf-8")
        except PlaywrightError as exc:
            raise BrowserManagerError(f"Screenshot failed: {exc}") from exc

    async def execute(self, script: str) -> Any:
        page = await self._get_page()
        try:
            return await page.evaluate(script)
        except PlaywrightTimeoutError as exc:
            raise BrowserManagerError("Script execution timed out.") from exc
        except PlaywrightError as exc:
            raise BrowserManagerError(f"Script execution failed: {exc}") from exc
