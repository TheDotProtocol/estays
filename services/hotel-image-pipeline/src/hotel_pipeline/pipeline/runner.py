from __future__ import annotations

import asyncio
import uuid
from typing import Any

from hotel_pipeline.classify.facility_classifier import FacilityClassifier
from hotel_pipeline.classify.room_detector import RoomDetector
from hotel_pipeline.config import Settings, get_settings, load_hotels_config, load_pipeline_settings
from hotel_pipeline.db.database import HotelRow, get_session, upsert_image
from hotel_pipeline.dedupe.deduplicator import Deduplicator
from hotel_pipeline.discovery.search import ListingDiscovery
from hotel_pipeline.download.downloader import ImageDownloader
from hotel_pipeline.models import ImageRecord, ImageStatus, PipelineStats
from hotel_pipeline.organize.organizer import DatasetOrganizer
from hotel_pipeline.quality.filter import QualityFilter
from hotel_pipeline.utils.logging_setup import setup_logging


class PipelineRunner:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.logger = setup_logging(self.settings)
        self.pipeline_cfg = load_pipeline_settings(self.settings)
        self.license_note = self.pipeline_cfg.get("license_note", "")

    def _persist_record(self, record: ImageRecord) -> str:
        record_id = record.id or str(uuid.uuid4())
        record.id = record_id
        session = get_session()
        upsert_image(
            session,
            record_id,
            {
                "hotel_id": record.hotel_id,
                "hotel_name": record.hotel_name,
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
                "sha256": record.sha256,
                "phash": record.phash,
                "status": record.status.value,
                "skip_reason": record.skip_reason,
                "license_note": record.license_note,
                "download_date": record.download_date,
                "width": record.width,
                "height": record.height,
                "file_bytes": record.file_bytes,
                "extra": {"clip_embedding": record.clip_embedding is not None},
            },
        )
        session.close()
        return record_id

    def _seed_hotels(self, hotels: list[dict[str, Any]]) -> None:
        session = get_session()
        for hotel in hotels:
            row = session.get(HotelRow, hotel["id"])
            if row is None:
                session.add(
                    HotelRow(
                        id=hotel["id"],
                        name=hotel["name"],
                        location=hotel.get("location"),
                    )
                )
        session.commit()
        session.close()

    async def run(self, hotel_ids: list[str] | None = None) -> PipelineStats:
        stats = PipelineStats()
        hotels = load_hotels_config(self.settings)
        if hotel_ids:
            hotels = [h for h in hotels if h["id"] in hotel_ids]

        self.settings.dataset_dir.mkdir(parents=True, exist_ok=True)
        self._seed_hotels(hotels)

        discovery = ListingDiscovery(self.settings)
        downloader = ImageDownloader(self.settings)
        quality = QualityFilter(self.settings)
        deduper = Deduplicator(self.settings)
        room_detector = RoomDetector()
        facility_classifier = FacilityClassifier(room_detector.classifier)
        organizer = DatasetOrganizer(self.settings)

        allowed = self.pipeline_cfg.get("allowed_sources") or load_yaml_domains(self.settings)
        all_records: list[ImageRecord] = []

        for hotel in hotels:
            stats.hotels_processed += 1
            self.logger.info("Processing hotel: %s", hotel["name"])

            try:
                listings, discovered = discovery.discover_for_hotel(hotel, allowed)
                stats.listings_found += len(listings)
                stats.images_discovered += len(discovered)

                if not discovered:
                    self.logger.warning("No images discovered for %s", hotel["name"])
                    continue

                downloaded = await downloader.download_batch(discovered, self.license_note)
                stats.images_downloaded += sum(1 for r in downloaded if r.status == ImageStatus.DOWNLOADED)

                passed = quality.apply(downloaded)
                stats.images_rejected += sum(1 for r in downloaded if r.status == ImageStatus.REJECTED)

                unique = deduper.dedupe(passed)
                stats.duplicates_removed += sum(1 for r in passed if r.status == ImageStatus.DUPLICATE)

                for record in unique:
                    room_detector.detect(record)
                    facility_classifier.classify_record(record)
                    stats.images_classified += 1
                    self._persist_record(record)

                organized = organizer.organize(unique)
                stats.images_organized += len(organized)
                all_records.extend(organized)

                for record in organized:
                    self._persist_record(record)

            except Exception as exc:
                stats.errors += 1
                self.logger.exception("Hotel pipeline failed for %s: %s", hotel["name"], exc)

        organizer.write_metadata(all_records)
        self.logger.info("Pipeline complete: %s", stats.model_dump())
        return stats


def load_yaml_domains(settings: Settings) -> list[str]:
    from hotel_pipeline.config import load_yaml

    data = load_yaml(settings.config_dir / "hotels.yaml")
    return data.get("allowed_sources", [])
