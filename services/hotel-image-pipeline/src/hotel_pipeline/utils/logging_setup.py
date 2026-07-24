from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from hotel_pipeline.config import Settings, get_settings


def setup_logging(settings: Settings | None = None, name: str = "hotel_pipeline") -> logging.Logger:
    settings = settings or get_settings()
    settings.log_dir.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console = logging.StreamHandler()
    console.setFormatter(formatter)
    logger.addHandler(console)

    for log_file in ("pipeline.log", "downloads.log", "classification.log", "errors.log"):
        handler = RotatingFileHandler(
            settings.log_dir / log_file,
            maxBytes=5_000_000,
            backupCount=5,
            encoding="utf-8",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


def get_event_logger(event: str, settings: Settings | None = None) -> logging.Logger:
    settings = settings or get_settings()
    settings.log_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger(f"hotel_pipeline.{event}")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    handler = RotatingFileHandler(
        settings.log_dir / f"{event}.log",
        maxBytes=5_000_000,
        backupCount=3,
        encoding="utf-8",
    )
    handler.setFormatter(
        logging.Formatter("%(asctime)s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    )
    logger.addHandler(handler)
    return logger
