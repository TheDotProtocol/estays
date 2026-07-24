from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from hotel_pipeline.config import Settings, get_settings
from hotel_pipeline.models import ImageRecord, ImageStatus
from hotel_pipeline.utils.logging_setup import get_event_logger

logger = get_event_logger("downloads")


class DatasetOrganizer:
    ROOM_FOLDER_MAP = {
        "Standard Room": "Standard",
        "Superior Room": "Superior",
        "Deluxe Room": "Deluxe",
        "Executive Room": "Executive",
        "Suite": "Suite",
        "Family Room": "Family",
        "Twin Room": "Twin",
        "Double Room": "Double",
        "Queen Room": "Queen",
        "King Room": "King",
        "Villa": "Villa",
        "Bungalow": "Bungalow",
        "Dormitory": "Dormitory",
        "Studio": "Studio",
        "Apartment": "Apartment",
        "Unknown Room": "Unknown",
    }

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _hotel_dir(self, hotel_name: str) -> Path:
        return self.settings.dataset_dir / hotel_name

    def organize(self, records: list[ImageRecord]) -> list[ImageRecord]:
        organized: list[ImageRecord] = []
        for record in records:
            if record.status not in (ImageStatus.CLASSIFIED, ImageStatus.DOWNLOADED):
                continue
            if not record.local_path:
                continue

            src = Path(record.local_path)
            if not src.exists():
                continue

            hotel_dir = self._hotel_dir(record.hotel_name)
            if record.primary_category == "Rooms" or record.room_type:
                folder = self.ROOM_FOLDER_MAP.get(record.room_type or "Unknown Room", "Unknown")
                dest_dir = hotel_dir / "Rooms" / folder
            else:
                fac = (record.facility_type or record.primary_category or "Unknown").strip()
                safe_fac = re.sub(r"[^\w\s-]", "", fac).strip() or "Unknown"
                dest_dir = hotel_dir / "Facilities" / safe_fac.replace(" ", "")

            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / src.name
            if not dest.exists():
                shutil.copy2(src, dest)
            record.organized_path = str(dest)
            record.status = ImageStatus.ORGANIZED
            organized.append(record)
            logger.info("organized -> %s", dest)

        return organized

    def write_metadata(self, records: list[ImageRecord]) -> Path:
        by_hotel: dict[str, list[dict]] = {}
        for record in records:
            if record.status not in (ImageStatus.ORGANIZED, ImageStatus.CLASSIFIED):
                continue
            by_hotel.setdefault(record.hotel_name, []).append(
                {
                    "hotel": record.hotel_name,
                    "hotel_id": record.hotel_id,
                    "source": record.source,
                    "page_url": record.page_url,
                    "image_url": record.image_url,
                    "local_path": record.local_path,
                    "organized_path": record.organized_path,
                    "primary_category": record.primary_category,
                    "room_type": record.room_type,
                    "facility_type": record.facility_type,
                    "caption": record.caption,
                    "alt_text": record.alt_text,
                    "confidence": record.confidence,
                    "hash": record.sha256,
                    "phash": record.phash,
                    "download_date": record.download_date.isoformat() if record.download_date else None,
                    "license_note": record.license_note,
                    "width": record.width,
                    "height": record.height,
                    "file_bytes": record.file_bytes,
                }
            )

        for hotel_name, items in by_hotel.items():
            meta_path = self._hotel_dir(hotel_name) / "metadata.json"
            meta_path.parent.mkdir(parents=True, exist_ok=True)
            meta_path.write_text(json.dumps(items, indent=2), encoding="utf-8")
            logger.info("metadata written: %s (%d images)", meta_path, len(items))

        root_meta = self.settings.dataset_dir / "metadata.json"
        all_items = [item for items in by_hotel.values() for item in items]
        root_meta.write_text(json.dumps(all_items, indent=2), encoding="utf-8")
        return root_meta
