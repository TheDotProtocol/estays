from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class ImageStatus(str, Enum):
    DISCOVERED = "discovered"
    DOWNLOADED = "downloaded"
    CLASSIFIED = "classified"
    ORGANIZED = "organized"
    SKIPPED = "skipped"
    DUPLICATE = "duplicate"
    REJECTED = "rejected"


class HotelListing(BaseModel):
    hotel_id: str
    hotel_name: str
    source: str
    page_url: str
    location: str | None = None
    room_names: list[str] = Field(default_factory=list)
    facility_names: list[str] = Field(default_factory=list)
    image_urls: list[str] = Field(default_factory=list)
    captions: list[str] = Field(default_factory=list)
    alt_texts: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class DiscoveredImage(BaseModel):
    hotel_id: str
    hotel_name: str
    source: str
    page_url: str
    image_url: str
    caption: str | None = None
    alt_text: str | None = None
    room_name_hint: str | None = None
    facility_hint: str | None = None


class ImageRecord(BaseModel):
    id: str | None = None
    hotel_id: str
    hotel_name: str
    source: str
    page_url: str
    image_url: str
    local_path: str | None = None
    organized_path: str | None = None
    primary_category: str = "Unknown"
    room_type: str | None = None
    facility_type: str | None = None
    caption: str | None = None
    alt_text: str | None = None
    confidence: float = 0.0
    sha256: str | None = None
    phash: str | None = None
    clip_embedding: list[float] | None = None
    status: ImageStatus = ImageStatus.DISCOVERED
    skip_reason: str | None = None
    license_note: str | None = None
    download_date: datetime | None = None
    width: int | None = None
    height: int | None = None
    file_bytes: int | None = None


class ClassificationResult(BaseModel):
    primary_category: str
    room_type: str | None = None
    facility_type: str | None = None
    confidence: float
    signals: dict[str, Any] = Field(default_factory=dict)


class PipelineStats(BaseModel):
    hotels_processed: int = 0
    listings_found: int = 0
    images_discovered: int = 0
    images_downloaded: int = 0
    images_classified: int = 0
    images_organized: int = 0
    duplicates_removed: int = 0
    images_rejected: int = 0
    errors: int = 0
