from __future__ import annotations

import pytest
from PIL import Image

from hotel_pipeline.config import Settings
from hotel_pipeline.models import ImageRecord, ImageStatus
from hotel_pipeline.quality.filter import QualityFilter


@pytest.fixture
def quality_filter(tmp_path) -> QualityFilter:
    settings = Settings(dataset_dir=tmp_path)
    return QualityFilter(settings)


def test_reject_small_image(quality_filter: QualityFilter, tmp_path) -> None:
    img_path = tmp_path / "small.jpg"
    Image.new("RGB", (100, 100), color="red").save(img_path)
    record = ImageRecord(
        hotel_id="h1",
        hotel_name="Hotel",
        source="test",
        page_url="https://example.com",
        image_url="https://example.com/img.jpg",
        local_path=str(img_path),
        status=ImageStatus.DOWNLOADED,
        width=100,
        height=100,
        file_bytes=5000,
    )
    ok, reason = quality_filter.evaluate(record)
    assert ok is False
    assert reason in ("resolution too low", "file too small")
