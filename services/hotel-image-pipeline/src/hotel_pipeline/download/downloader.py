from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from hotel_pipeline.config import Settings, get_settings
from hotel_pipeline.models import DiscoveredImage, ImageRecord, ImageStatus
from hotel_pipeline.utils.hash_utils import RobotsChecker, sha256_bytes, slugify
from hotel_pipeline.utils.logging_setup import get_event_logger
from hotel_pipeline.utils.rate_limit import DomainRateLimiter

logger = get_event_logger("downloads")
error_logger = get_event_logger("errors")


class ImageDownloader:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.robots = RobotsChecker(self.settings)
        self.rate_limiter = DomainRateLimiter(self.settings.requests_per_domain_per_min)

    def _raw_dir(self, hotel_name: str) -> Path:
        path = self.settings.dataset_dir / hotel_name / "_raw"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def _fetch_bytes(self, session: aiohttp.ClientSession, url: str) -> bytes:
        await self.rate_limiter.acquire(url)
        async with session.get(
            url,
            timeout=aiohttp.ClientTimeout(total=self.settings.request_timeout_sec),
            headers={"User-Agent": self.settings.user_agent},
        ) as resp:
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if not content_type.startswith("image/"):
                raise ValueError(f"Not an image: {content_type}")
            return await resp.read()

    def _extension_from_url(self, url: str) -> str:
        path = urlparse(url).path.lower()
        for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
            if path.endswith(ext):
                return ext.replace(".jpeg", ".jpg")
        return ".jpg"

    async def download_one(
        self, session: aiohttp.ClientSession, image: DiscoveredImage, license_note: str
    ) -> ImageRecord | None:
        if not self.robots.can_fetch(image.image_url):
            logger.info("skip download (robots): %s", image.image_url)
            return ImageRecord(
                hotel_id=image.hotel_id,
                hotel_name=image.hotel_name,
                source=image.source,
                page_url=image.page_url,
                image_url=image.image_url,
                caption=image.caption,
                alt_text=image.alt_text,
                status=ImageStatus.SKIPPED,
                skip_reason="robots.txt",
                license_note=license_note,
            )

        try:
            data = await self._fetch_bytes(session, image.image_url)
        except Exception as exc:
            error_logger.error("download failed %s: %s", image.image_url, exc)
            return ImageRecord(
                hotel_id=image.hotel_id,
                hotel_name=image.hotel_name,
                source=image.source,
                page_url=image.page_url,
                image_url=image.image_url,
                caption=image.caption,
                alt_text=image.alt_text,
                status=ImageStatus.SKIPPED,
                skip_reason=str(exc),
                license_note=license_note,
            )

        digest = sha256_bytes(data)
        ext = self._extension_from_url(image.image_url)
        filename = f"{digest[:16]}{ext}"
        local_path = self._raw_dir(image.hotel_name) / filename
        local_path.write_bytes(data)

        from PIL import Image

        with Image.open(local_path) as img:
            width, height = img.size

        return ImageRecord(
            hotel_id=image.hotel_id,
            hotel_name=image.hotel_name,
            source=image.source,
            page_url=image.page_url,
            image_url=image.image_url,
            local_path=str(local_path),
            caption=image.caption,
            alt_text=image.alt_text,
            sha256=digest,
            status=ImageStatus.DOWNLOADED,
            license_note=license_note,
            download_date=datetime.now(timezone.utc),
            width=width,
            height=height,
            file_bytes=len(data),
        )

    async def download_batch(
        self, images: list[DiscoveredImage], license_note: str
    ) -> list[ImageRecord]:
        sem = asyncio.Semaphore(self.settings.max_concurrent_downloads)
        results: list[ImageRecord] = []

        async with aiohttp.ClientSession() as session:

            async def worker(img: DiscoveredImage) -> None:
                async with sem:
                    record = await self.download_one(session, img, license_note)
                    if record:
                        results.append(record)
                        if record.status == ImageStatus.DOWNLOADED:
                            logger.info("downloaded %s -> %s", img.image_url, record.local_path)

            await asyncio.gather(*[worker(img) for img in images])

        return results
