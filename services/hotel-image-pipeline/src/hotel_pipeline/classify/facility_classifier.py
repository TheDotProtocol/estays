from __future__ import annotations

from hotel_pipeline.classify.clip_classifier import ClipClassifier
from hotel_pipeline.models import ImageRecord, ImageStatus
from hotel_pipeline.utils.logging_setup import get_event_logger

logger = get_event_logger("classification")


class FacilityClassifier:
    FACILITY_MAP = {
        "Swimming Pool": "Pool",
        "Restaurant": "Restaurant",
        "Bar": "Bar",
        "Spa": "Spa",
        "Gym": "Gym",
        "Lobby": "Lobby",
        "Reception": "Reception",
        "Cafe": "Cafe",
        "Kids Area": "Kids Play Area",
        "Conference Room": "Conference Hall",
        "Parking": "Parking",
        "Beach": "Beach Access",
        "Garden": "Garden",
        "Breakfast": "Breakfast",
        "Exterior": "Exterior",
        "Dining": "Restaurant",
        "Common Area": "Lobby",
    }

    def __init__(self, classifier: ClipClassifier | None = None) -> None:
        self.classifier = classifier or ClipClassifier()

    def classify_record(self, record: ImageRecord) -> ImageRecord:
        if record.primary_category == "Rooms":
            return record

        result = self.classifier.classify(record)
        mapped = self.FACILITY_MAP.get(result.primary_category, result.facility_type)
        record.facility_type = mapped or result.facility_type or "Landscape"
        record.primary_category = result.primary_category
        record.confidence = result.confidence
        record.status = ImageStatus.CLASSIFIED
        logger.info("facility %s -> %s", record.local_path, record.facility_type)
        return record
