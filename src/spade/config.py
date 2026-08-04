from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class SpadeSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    headless: bool = Field(default=True, alias="SPADE_HEADLESS")
    timeout_ms: int = Field(default=30_000, alias="SPADE_TIMEOUT_MS", ge=1_000, le=180_000)
    screenshot_quality: int = Field(
        default=90,
        alias="SPADE_SCREENSHOT_QUALITY",
        ge=1,
        le=100,
    )
    start_url: str = Field(default="about:blank", alias="SPADE_START_URL")
