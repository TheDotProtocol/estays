from __future__ import annotations

from hotel_pipeline.discovery.base import GenericSourceAdapter, listing_to_discovered_images
from hotel_pipeline.models import HotelListing
from hotel_pipeline.utils.hash_utils import sha256_bytes, slugify


def test_slugify() -> None:
    assert slugify("Grand Sunset Inn") == "grand-sunset-inn"


def test_sha256_bytes() -> None:
    assert len(sha256_bytes(b"test")) == 64


def test_parse_listing_extracts_images() -> None:
    html = """
    <html><body>
      <h3>Deluxe Room</h3>
      <h3>Swimming Pool</h3>
      <img src="https://cdn.example.com/room.jpg" alt="deluxe king room" />
      <img src="https://cdn.example.com/pool.jpg" alt="infinity pool" />
    </body></html>
    """
    adapter = GenericSourceAdapter()
    hotel = {"id": "test", "name": "Test Hotel", "location": "Test"}
    listing = adapter.parse_listing("https://www.booking.com/hotel/test.html", html, hotel)
    assert len(listing.image_urls) == 2
    assert "Deluxe Room" in listing.room_names
    images = listing_to_discovered_images(listing)
    assert images[0].alt_text == "deluxe king room"


def test_listing_to_discovered_room_hint() -> None:
    listing = HotelListing(
        hotel_id="h1",
        hotel_name="Hotel",
        source="booking.com",
        page_url="https://booking.com/h/x",
        room_names=["Suite"],
        image_urls=["https://x/img.jpg"],
        alt_texts=["luxury suite bedroom"],
    )
    images = listing_to_discovered_images(listing)
    assert images[0].room_name_hint == "Suite"
