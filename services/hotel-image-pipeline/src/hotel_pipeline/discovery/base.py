from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from urllib.parse import quote_plus, urlparse

import requests
from bs4 import BeautifulSoup

from hotel_pipeline.config import Settings, get_settings
from hotel_pipeline.models import DiscoveredImage, HotelListing
from hotel_pipeline.utils.hash_utils import RobotsChecker
from hotel_pipeline.utils.logging_setup import get_event_logger

logger = get_event_logger("downloads")


class SourceAdapter(ABC):
    source_name: str = "generic"

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.robots = RobotsChecker(self.settings)

    def _headers(self) -> dict[str, str]:
        return {"User-Agent": self.settings.user_agent, "Accept-Language": "en-US,en;q=0.9"}

    def fetch_html(self, url: str) -> str | None:
        if not self.robots.can_fetch(url):
            logger.info("robots.txt disallows fetch: %s", url)
            return None
        html = self._fetch_html_requests(url)
        if html and self._needs_playwright(url, html):
            playwright_html = self._fetch_html_playwright(url)
            if playwright_html:
                return playwright_html
        return html

    def _fetch_html_requests(self, url: str) -> str | None:
        try:
            resp = requests.get(
                url,
                headers=self._headers(),
                timeout=self.settings.request_timeout_sec,
            )
            if resp.status_code != 200:
                logger.warning("HTTP %s for %s", resp.status_code, url)
                return None
            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                return None
            return resp.text
        except requests.RequestException as exc:
            logger.error("fetch failed %s: %s", url, exc)
            return None

    def _needs_playwright(self, url: str, html: str) -> bool:
        domain = urlparse(url).netloc.lower()
        if "agoda.com" in domain or "booking.com" in domain:
            return len(html) < 5000 or "agoda" in domain
        return False

    def _fetch_html_playwright(self, url: str) -> str | None:
        try:
            from playwright.sync_api import sync_playwright

            with sync_playwright() as p:
                browser = p.chromium.launch(headless=self.settings.playwright_headless)
                page = browser.new_page(user_agent=self.settings.user_agent)
                page.goto(url, wait_until="networkidle", timeout=60000)
                page.wait_for_timeout(2000)
                html = page.content()
                browser.close()
                return html
        except Exception as exc:
            logger.warning("playwright fetch failed %s: %s", url, exc)
            return None

    @abstractmethod
    def parse_listing(self, url: str, html: str, hotel: dict[str, Any]) -> HotelListing:
        ...

    def extract_images_from_html(
        self, soup: BeautifulSoup, page_url: str
    ) -> list[tuple[str, str | None, str | None]]:
        results: list[tuple[str, str | None, str | None]] = []
        seen: set[str] = set()

        def add_src(raw: str | None, alt: str | None = None, title: str | None = None) -> None:
            if not raw or raw.startswith("data:"):
                return
            src = raw.strip()
            if src.startswith("//"):
                src = "https:" + src
            elif src.startswith("/"):
                parsed = urlparse(page_url)
                src = f"{parsed.scheme}://{parsed.netloc}{src}"
            if src in seen:
                return
            seen.add(src)
            results.append((src, alt, title))

        for img in soup.find_all("img"):
            alt = (img.get("alt") or "").strip() or None
            title = (img.get("title") or "").strip() or None
            for attr in ("src", "data-src", "data-lazy-src", "data-splide-lazy", "data-zoom-image"):
                add_src(img.get(attr), alt, title)
            srcset = img.get("srcset") or img.get("data-srcset")
            if srcset:
                for part in srcset.split(","):
                    url_part = part.strip().split(" ")[0]
                    add_src(url_part, alt, title)

        for tag in soup.find_all(style=True):
            style = tag.get("style", "")
            if "url(" in style:
                import re

                for match in re.findall(r"url\(['\"]?(.*?)['\"]?\)", style):
                    add_src(match)

        return results


class GenericSourceAdapter(SourceAdapter):
    source_name = "generic"

    def parse_listing(self, url: str, html: str, hotel: dict[str, Any]) -> HotelListing:
        soup = BeautifulSoup(html, "lxml")
        images = self.extract_images_from_html(soup, url)
        room_names: list[str] = []
        facility_names: list[str] = []

        for heading in soup.find_all(["h2", "h3", "h4"]):
            text = heading.get_text(strip=True)
            lower = text.lower()
            if any(k in lower for k in ("room", "suite", "villa", "bungalow", "studio")):
                room_names.append(text)
            if any(
                k in lower
                for k in ("pool", "spa", "restaurant", "gym", "lobby", "breakfast", "bar", "garden")
            ):
                facility_names.append(text)

        domain = urlparse(url).netloc.lower().removeprefix("www.")
        return HotelListing(
            hotel_id=hotel["id"],
            hotel_name=hotel["name"],
            source=domain,
            page_url=url,
            location=hotel.get("location"),
            room_names=list(dict.fromkeys(room_names))[:50],
            facility_names=list(dict.fromkeys(facility_names))[:50],
            image_urls=[i[0] for i in images],
            captions=[i[2] or "" for i in images],
            alt_texts=[i[1] or "" for i in images],
        )


class BookingSourceAdapter(GenericSourceAdapter):
    source_name = "booking.com"


class AgodaSourceAdapter(GenericSourceAdapter):
    source_name = "agoda.com"

    def parse_listing(self, url: str, html: str, hotel: dict[str, Any]) -> HotelListing:
        listing = super().parse_listing(url, html, hotel)
        soup = BeautifulSoup(html, "lxml")

        for node in soup.select("[data-selenium], [class*='room'], [class*='Room']"):
            text = node.get_text(strip=True)
            if not text or len(text) > 120:
                continue
            lower = text.lower()
            if any(k in lower for k in ("room", "suite", "villa", "bungalow", "deluxe", "superior")):
                listing.room_names.append(text)

        for node in soup.select("h2, h3, h4, [data-element-name]"):
            text = node.get_text(strip=True)
            lower = text.lower()
            if any(k in lower for k in ("pool", "restaurant", "spa", "lobby", "beach", "garden")):
                listing.facility_names.append(text)

        listing.room_names = list(dict.fromkeys(listing.room_names))[:50]
        listing.facility_names = list(dict.fromkeys(listing.facility_names))[:50]
        return listing


def get_adapter_for_url(url: str, settings: Settings | None = None) -> SourceAdapter:
    domain = urlparse(url).netloc.lower()
    if "booking.com" in domain:
        return BookingSourceAdapter(settings)
    if "agoda.com" in domain:
        return AgodaSourceAdapter(settings)
    return GenericSourceAdapter(settings)


def listing_to_discovered_images(listing: HotelListing) -> list[DiscoveredImage]:
    images: list[DiscoveredImage] = []
    for idx, url in enumerate(listing.image_urls):
        caption = listing.captions[idx] if idx < len(listing.captions) else None
        alt = listing.alt_texts[idx] if idx < len(listing.alt_texts) else None
        room_hint = None
        facility_hint = None
        combined = f"{caption or ''} {alt or ''}".lower()
        for room in listing.room_names:
            if room.lower() in combined:
                room_hint = room
                break
        for fac in listing.facility_names:
            if fac.lower() in combined:
                facility_hint = fac
                break
        images.append(
            DiscoveredImage(
                hotel_id=listing.hotel_id,
                hotel_name=listing.hotel_name,
                source=listing.source,
                page_url=listing.page_url,
                image_url=url,
                caption=caption or None,
                alt_text=alt or None,
                room_name_hint=room_hint,
                facility_hint=facility_hint,
            )
        )
    return images
