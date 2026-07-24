from __future__ import annotations

import hashlib
import re
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests

from hotel_pipeline.config import Settings, get_settings
from hotel_pipeline.utils.logging_setup import get_event_logger

logger = get_event_logger("errors")


class RobotsChecker:
    """Respects robots.txt before fetching public pages."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._parsers: dict[str, RobotFileParser] = {}

    def _get_parser(self, domain: str) -> RobotFileParser:
        if domain not in self._parsers:
            rp = RobotFileParser()
            robots_url = f"https://{domain}/robots.txt"
            try:
                resp = requests.get(
                    robots_url,
                    headers={"User-Agent": self.settings.user_agent},
                    timeout=self.settings.request_timeout_sec,
                )
                if resp.status_code == 200:
                    rp.parse(resp.text.splitlines())
                else:
                    rp.parse([])
            except requests.RequestException as exc:
                logger.warning("robots.txt fetch failed for %s: %s", domain, exc)
                rp.parse([])
            self._parsers[domain] = rp
        return self._parsers[domain]

    def can_fetch(self, url: str) -> bool:
        if not self.settings.respect_robots_txt:
            return True
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        domain = parsed.netloc.lower().removeprefix("www.")
        parser = self._get_parser(domain)
        return parser.can_fetch(self.settings.user_agent, url)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "-", text).strip("-")
