from __future__ import annotations

import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from hotel_pipeline.config import Settings, load_pipeline_settings, get_settings
from hotel_pipeline.models import ImageRecord, ImageStatus
from hotel_pipeline.utils.logging_setup import get_event_logger

logger = get_event_logger("downloads")


class QualityFilter:
    """Reject logos, tiny thumbs, blur, maps, ads, etc."""

    REJECT_KEYWORDS = re.compile(
        r"\b(logo|icon|map|floor\s*plan|advert|banner|sprite|avatar|badge|"
        r"placeholder|thumbnail|qr\s*code|screenshot)\b",
        re.I,
    )

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        cfg = load_pipeline_settings(self.settings).get("quality", {})
        self.min_width = int(cfg.get("min_width", 400))
        self.min_height = int(cfg.get("min_height", 300))
        self.min_file_bytes = int(cfg.get("min_file_bytes", 15000))
        self.max_aspect_ratio = float(cfg.get("max_aspect_ratio", 4.0))
        self.blur_threshold = float(cfg.get("blur_threshold", 80.0))

    def _blur_score(self, path: Path) -> float:
        img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 0.0
        return float(cv2.Laplacian(img, cv2.CV_64F).var())

    def evaluate(self, record: ImageRecord) -> tuple[bool, str | None]:
        if record.status != ImageStatus.DOWNLOADED or not record.local_path:
            return False, record.skip_reason or "not downloaded"

        path = Path(record.local_path)
        if not path.exists():
            return False, "file missing"

        meta_text = " ".join(
            filter(None, [record.caption, record.alt_text, record.image_url, path.name])
        )
        if self.REJECT_KEYWORDS.search(meta_text):
            return False, "keyword reject"

        if record.file_bytes and record.file_bytes < self.min_file_bytes:
            return False, "file too small"

        if record.width and record.height:
            if record.width < self.min_width or record.height < self.min_height:
                return False, "resolution too low"
            ratio = max(record.width, record.height) / max(1, min(record.width, record.height))
            if ratio > self.max_aspect_ratio:
                return False, "extreme aspect ratio"

        blur = self._blur_score(path)
        if blur < self.blur_threshold:
            return False, f"blurry ({blur:.1f})"

        try:
            with Image.open(path) as img:
                if img.mode == "P" and img.size[0] < 200:
                    return False, "palette icon"
        except OSError:
            return False, "invalid image"

        return True, None

    def apply(self, records: list[ImageRecord]) -> list[ImageRecord]:
        kept: list[ImageRecord] = []
        for record in records:
            ok, reason = self.evaluate(record)
            if ok:
                kept.append(record)
            else:
                record.status = ImageStatus.REJECTED
                record.skip_reason = reason
                logger.info("rejected %s: %s", record.local_path, reason)
        return kept
