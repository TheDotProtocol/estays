from __future__ import annotations

import re
from pathlib import Path

from hotel_pipeline.classify.clip_classifier import ClipClassifier
from hotel_pipeline.models import ClassificationResult, ImageRecord, ImageStatus
from hotel_pipeline.utils.logging_setup import get_event_logger

logger = get_event_logger("classification")


class RoomDetector:
    """Infer room type using CLIP, captions, alt text, and OTA room titles."""

    BED_PATTERNS = {
        "Twin Room": re.compile(r"\btwin\b|\b2 single\b", re.I),
        "Double Room": re.compile(r"\bdouble bed\b|\bdouble room\b", re.I),
        "Queen Room": re.compile(r"\bqueen\b", re.I),
        "King Room": re.compile(r"\bking\b", re.I),
    }

    FEATURE_PATTERNS = {
        "balcony": re.compile(r"\bbalcony\b|\bterrace\b", re.I),
        "bathroom": re.compile(r"\bbathroom\b|\bensuite\b", re.I),
        "workspace": re.compile(r"\bdesk\b|\bwork\s*space\b", re.I),
        "kitchenette": re.compile(r"\bkitchenette\b|\bkitchen\b", re.I),
    }

    def __init__(self, classifier: ClipClassifier | None = None) -> None:
        self.classifier = classifier or ClipClassifier()

    def detect(self, record: ImageRecord) -> ClassificationResult:
        result = self.classifier.classify(record)
        combined = " ".join(
            filter(
                None,
                [record.caption, record.alt_text, result.signals.get("generated_caption")],
            )
        ).lower()

        for room, pattern in self.BED_PATTERNS.items():
            if pattern.search(combined):
                result.room_type = room
                result.signals["bed_hint"] = room

        features = [k for k, p in self.FEATURE_PATTERNS.items() if p.search(combined)]
        if features:
            result.signals["room_features"] = features

        if result.primary_category in ("Rooms", "Bathroom", "Balcony", "View") and not result.room_type:
            result.room_type = "Unknown Room"

        record.primary_category = result.primary_category
        record.room_type = result.room_type
        record.facility_type = result.facility_type
        record.confidence = result.confidence
        record.status = ImageStatus.CLASSIFIED
        logger.info(
            "classified %s -> %s / %s (%.2f)",
            record.local_path,
            result.primary_category,
            result.room_type or result.facility_type,
            result.confidence,
        )
        return result
