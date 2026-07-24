from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    pipeline_env: str = "development"
    dataset_dir: Path = Path("./dataset")
    log_dir: Path = Path("./logs")
    config_dir: Path = Path("./config")

    database_url: str = "sqlite:///./pipeline.db"

    user_agent: str = "EStaysImageBot/1.0 (+https://www.estayshotels.com/bot)"
    request_timeout_sec: int = 30
    max_concurrent_downloads: int = 4
    requests_per_domain_per_min: int = 20
    respect_robots_txt: bool = True
    playwright_headless: bool = True

    clip_model: str = "ViT-B-32"
    clip_pretrained: str = "openai"
    clip_device: str = "cpu"
    enable_clip: bool = True
    enable_captioning: bool = True
    min_classification_confidence: float = 0.25

    api_host: str = "0.0.0.0"
    api_port: int = 8100
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


def load_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_hotels_config(settings: Settings | None = None) -> list[dict[str, Any]]:
    settings = settings or get_settings()
    data = load_yaml(settings.config_dir / "hotels.yaml")
    return data.get("hotels", [])


def load_pipeline_settings(settings: Settings | None = None) -> dict[str, Any]:
    settings = settings or get_settings()
    return load_yaml(settings.config_dir / "settings.yaml")
