from __future__ import annotations

import re
from typing import Any
from urllib.parse import quote_plus, urlparse

import requests
from bs4 import BeautifulSoup

from hotel_pipeline.config import Settings, get_settings
from hotel_pipeline.discovery.base import get_adapter_for_url, listing_to_discovered_images
from hotel_pipeline.models import DiscoveredImage, HotelListing
from hotel_pipeline.utils.hash_utils import RobotsChecker
from hotel_pipeline.utils.logging_setup import get_event_logger

logger = get_event_logger("downloads")


class ListingDiscovery:
    """Discover public hotel listing URLs and extract image metadata."""

    OTA_PATTERNS = {
        "booking.com": re.compile(r"https?://(?:www\.)?booking\.com/hotel/[^\s\"']+", re.I),
        "agoda.com": re.compile(r"https?://(?:www\.)?agoda\.com/[^\s\"']+", re.I),
        "hotels.com": re.compile(r"https?://(?:www\.)?hotels\.com/[^\s\"']+", re.I),
        "expedia.com": re.compile(r"https?://(?:www\.)?expedia\.com/[^\s\"']+", re.I),
        "trip.com": re.compile(r"https?://(?:www\.)?trip\.com/[^\s\"']+", re.I),
        "traveloka.com": re.compile(r"https?://(?:www\.)?traveloka\.com/[^\s\"']+", re.I),
    }

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.robots = RobotsChecker(self.settings)

    def _headers(self) -> dict[str, str]:
        return {"User-Agent": self.settings.user_agent}

    def search_public_urls(self, query: str, allowed_domains: list[str]) -> list[str]:
        """
        Search via DuckDuckGo HTML (public results). Does not bypass CAPTCHAs.
        Returns listing URLs matching allowed OTA domains.
        """
        if not self.robots.can_fetch("https://html.duckduckgo.com/html/"):
            logger.warning("robots.txt blocks DuckDuckGo HTML search")
            return []

        url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        try:
            resp = requests.post(
                url,
                headers=self._headers(),
                timeout=self.settings.request_timeout_sec,
                data={"q": query},
            )
            if resp.status_code != 200:
                return []
            soup = BeautifulSoup(resp.text, "lxml")
            found: list[str] = []
            for link in soup.select("a.result__a"):
                href = link.get("href", "")
                if not href.startswith("http"):
                    continue
                domain = urlparse(href).netloc.lower().removeprefix("www.")
                if any(d in domain for d in allowed_domains):
                    if href not in found:
                        found.append(href)
            return found[:5]
        except requests.RequestException as exc:
            logger.error("search failed for %r: %s", query, exc)
            return []

    def discover_for_hotel(
        self, hotel: dict[str, Any], allowed_domains: list[str]
    ) -> tuple[list[HotelListing], list[DiscoveredImage]]:
        listings: list[HotelListing] = []
        all_images: list[DiscoveredImage] = []
        candidate_urls: list[str] = list(hotel.get("seed_urls") or [])

        for query in hotel.get("search_queries", []):
            candidate_urls.extend(self.search_public_urls(query, allowed_domains))

        seen_pages: set[str] = set()
        for page_url in candidate_urls:
            if page_url in seen_pages:
                continue
            seen_pages.add(page_url)
            if not self.robots.can_fetch(page_url):
                logger.info("skip (robots): %s", page_url)
                continue

            adapter = get_adapter_for_url(page_url, self.settings)
            html = adapter.fetch_html(page_url)
            if not html:
                continue

            listing = adapter.parse_listing(page_url, html, hotel)
            if listing.image_urls:
                listings.append(listing)
                all_images.extend(listing_to_discovered_images(listing))

        return listings, all_images
