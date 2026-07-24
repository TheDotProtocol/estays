from __future__ import annotations

from pathlib import Path

import imagehash
import numpy as np
from PIL import Image

from hotel_pipeline.classify.clip_classifier import ClipClassifier
from hotel_pipeline.config import Settings, load_pipeline_settings, get_settings
from hotel_pipeline.models import ImageRecord, ImageStatus
from hotel_pipeline.utils.logging_setup import get_event_logger

logger = get_event_logger("duplicates")


class Deduplicator:
    def __init__(self, settings: Settings | None = None, classifier: ClipClassifier | None = None) -> None:
        self.settings = settings or get_settings()
        cfg = load_pipeline_settings(self.settings).get("dedupe", {})
        self.phash_threshold = int(cfg.get("phash_hamming_threshold", 8))
        self.clip_threshold = float(cfg.get("clip_cosine_threshold", 0.97))
        self.classifier = classifier or ClipClassifier()
        self._sha_seen: set[str] = set()
        self._phash_seen: list[tuple[imagehash.ImageHash, str]] = []
        self._clip_seen: list[tuple[np.ndarray, str]] = []

    def _cosine(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))

    def is_duplicate(self, record: ImageRecord) -> tuple[bool, str | None]:
        if record.sha256 and record.sha256 in self._sha_seen:
            return True, "sha256"

        if record.local_path and Path(record.local_path).exists():
            try:
                ph = imagehash.phash(Image.open(record.local_path))
                for existing, _ in self._phash_seen:
                    if ph - existing <= self.phash_threshold:
                        return True, "phash"
                record.phash = str(ph)
                self._phash_seen.append((ph, record.sha256 or record.local_path))
            except OSError:
                pass

            if self.settings.enable_clip:
                emb = self.classifier.embedding(Path(record.local_path))
                if emb:
                    vec = np.array(emb, dtype=np.float32)
                    record.clip_embedding = emb
                    for existing, _ in self._clip_seen:
                        if self._cosine(vec, existing) >= self.clip_threshold:
                            return True, "clip_embedding"
                    self._clip_seen.append((vec, record.sha256 or record.local_path))

        if record.sha256:
            self._sha_seen.add(record.sha256)
        return False, None

    def dedupe(self, records: list[ImageRecord]) -> list[ImageRecord]:
        unique: list[ImageRecord] = []
        for record in records:
            if record.status not in (ImageStatus.DOWNLOADED, ImageStatus.CLASSIFIED):
                continue
            dup, reason = self.is_duplicate(record)
            if dup:
                record.status = ImageStatus.DUPLICATE
                record.skip_reason = reason
                logger.info("duplicate %s (%s)", record.local_path, reason)
            else:
                unique.append(record)
        return unique
