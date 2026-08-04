from __future__ import annotations

import asyncio

from spade.browser_manager import BrowserManager
from spade.config import SpadeSettings


async def _smoke() -> None:
    manager = BrowserManager(SpadeSettings())
    await manager.start()
    try:
        final_url = await manager.navigate("https://example.com")
        assert "example.com" in final_url

        image_base64 = await manager.screenshot_base64()
        assert len(image_base64) > 100

        execution_result = await manager.execute("() => document.title")
        assert execution_result == "Example Domain"
    finally:
        await manager.stop()


if __name__ == "__main__":
    asyncio.run(_smoke())
    print("Smoke test passed.")
