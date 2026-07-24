#!/usr/bin/env python3
"""Scrape Agoda / official site data for AR Hospitality hotels."""
from __future__ import annotations

import html as htmlmod
import json
import re
import sys
from pathlib import Path
import re
from typing import Any, Optional
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

HOTELS = [
    {
        "slug": "sandcastle-mara-lodge",
        "url": "https://sandcastlemaralodge.com/",
        "source": "official",
    },
    {
        "slug": "grand-sunset-phuket",
        "url": "https://www.agoda.com/en-in/grand-sunset-hotel/hotel/phuket-th.html",
        "source": "agoda",
    },
    {
        "slug": "keraton-jimbaran",
        "url": "https://www.agoda.com/en-in/keraton-jimbaran-resort/hotel/bali-id.html",
        "source": "agoda",
    },
    {
        "slug": "tri-shawa-resort",
        "url": "https://www.agoda.com/en-in/tri-shawa-resort/hotel/prachuap-khiri-khan-th.html",
        "source": "agoda",
    },
    {
        "slug": "berjaya-langkawi-resort",
        "url": "https://www.agoda.com/en-in/berjaya-langkawi-resort/hotel/langkawi-my.html",
        "source": "agoda",
    },
]

OUT_PATH = (
    Path(__file__).resolve().parents[3]
    / "packages/database/src/data/ar-agoda-import.json"
)

INR_PER_USD = 83.5

BLOCKED_PHOTO_PATTERNS = (
    re.compile(p, re.I)
    for p in (
        r"agoda-logo",
        r"cdn-design-system",
        r"/images/mobile/",
        r"/images/default/",
        r"/generic/",
        r"/flag-",
        r"\.svg(\?|$)",
    )
)


def is_valid_photo_url(url: str) -> bool:
    if not url:
        return False
    lower = url.lower()
    if not re.search(r"\.(jpe?g|png|webp)(\?|$)", lower):
        return False
    return not any(p.search(lower) for p in BLOCKED_PHOTO_PATTERNS)


def normalize_image_url(raw: str) -> str:
    if not raw:
        return ""
    url = htmlmod.unescape(raw).replace("&amp;", "&").strip()
    if url.startswith("//"):
        url = "https:" + url
    if ", http" in url:
        url = url.split(",")[0].strip().split(" ")[0]
    url = re.sub(r"s=\d+x\d+", "s=1024x768", url)
    return url.rstrip(";")


def image_key(url: str) -> str:
    parsed = urlparse(url)
    return parsed.path


def strip_html(text: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = htmlmod.unescape(re.sub(r"\s+", " ", text)).strip()
    return text


def brand_description(text: str, property_name: str, e_stays_name: str) -> str:
    cleaned = strip_html(text)
    if property_name and property_name in cleaned:
        cleaned = cleaned.replace(property_name, e_stays_name)
    if not cleaned.startswith("E Stays"):
        cleaned = f"Book {e_stays_name} with E Stays. {cleaned}"
    return cleaned[:2000]


def walk_image_urls(obj: Any, seen: set[str], images: list[dict[str, str]], caption: str = "") -> None:
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in ("url", "imageUrl", "originalImageUrl", "thumbnailUrl") and isinstance(value, str):
                if any(token in value for token in ("hotelImages", "agoda.net/property", "bstatic.com")):
                    url = normalize_image_url(value)
                    if not is_valid_photo_url(url):
                        continue
                    key_id = image_key(url)
                    if key_id not in seen:
                        seen.add(key_id)
                        images.append({"url": url, "caption": caption})
            else:
                walk_image_urls(value, seen, images, caption)
    elif isinstance(obj, list):
        for item in obj:
            walk_image_urls(item, seen, images, caption)


def parse_room_grid(room_grid: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    rooms: list[dict[str, Any]] = []
    images: list[dict[str, str]] = []
    seen_images: set[str] = set()

    for room_type in room_grid.get("rooms", []):
        name = (room_type.get("name") or "").strip()
        if not name:
            continue

        room_image_url: Optional[str] = None
        room_image_urls: list[str] = []
        for img in room_type.get("images", []):
            url = normalize_image_url(img.get("url", ""))
            key = image_key(url)
            if url and key not in seen_images:
                seen_images.add(key)
                images.append({"url": url, "caption": name})
                room_image_urls.append(url)
                if not room_image_url:
                    room_image_url = url

        price_inr: Optional[int] = None
        offer_features: list[str] = []
        for offer in room_type.get("offers", []):
            final_price = offer.get("price", {}).get("final", {})
            amount = final_price.get("amountNumber")
            if amount is None and final_price.get("amount"):
                amount = float(str(final_price["amount"]).replace(",", ""))
            if isinstance(amount, (int, float)) and amount > 0:
                amount_int = int(amount)
                if price_inr is None or amount_int < price_inr:
                    price_inr = amount_int
            for key in ("benefits", "inclusions", "features", "sellingPoints"):
                items = offer.get(key) or []
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, str) and item.strip():
                            offer_features.append(item.strip())
                        elif isinstance(item, dict):
                            text = (item.get("text") or item.get("name") or item.get("title") or "").strip()
                            if text:
                                offer_features.append(text)

        max_occ = 2
        bed_type = "King"
        size_text = ""
        room_features: list[str] = []
        for feature in room_type.get("features", []):
            text = (feature.get("text") or feature.get("name") or "").strip()
            if not text:
                continue
            room_features.append(text)
            lower = text.lower()
            if "adult" in lower:
                match = re.search(r"(\d+)", text)
                if match:
                    max_occ = int(match.group(1))
            if "m²" in text or "ft²" in text:
                size_text = text
            if "bed" in lower and "max" not in lower:
                bed_type = text.replace(" bed", "").strip() or bed_type

        merged_features = list(dict.fromkeys(room_features + offer_features))[:12]

        description_parts = [p for p in [size_text, f"Up to {max_occ} guests"] if p]
        description = f"{name} — {', '.join(description_parts)}. Book with E Stays."

        rooms.append(
            {
                "name": name,
                "description": description[:500],
                "maxOccupancy": max_occ,
                "bedType": bed_type[:50],
                "priceInr": price_inr,
                "basePriceUsd": round(price_inr / INR_PER_USD, 2) if price_inr else None,
                "imageUrl": room_image_url,
                "imageUrls": room_image_urls[:12],
                "features": merged_features,
            }
        )

    return rooms, images


def extract_overview(secondary: dict[str, Any]) -> str:
    overview = ""

    def walk(obj: Any) -> None:
        nonlocal overview
        if overview:
            return
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key == "overview" and isinstance(value, str) and len(value) > 80:
                    overview = value
                    return
                walk(value)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(secondary)
    return overview


def extract_all_page_images(page, seen: set[str]) -> list[dict[str, str]]:
    """Pull every Agoda/Bstatic image URL from rendered DOM."""
    raw_urls = page.evaluate(
        """() => {
        const urls = new Set();
        const add = (u) => {
          if (!u || typeof u !== 'string') return;
          if (u.startsWith('//')) u = 'https:' + u;
          if (/agoda\\.net|bstatic\\.com/i.test(u)) urls.add(u);
        };
        document.querySelectorAll('img[src], img[data-src], source[srcset]').forEach(el => {
          if (el.src) add(el.src);
          if (el.dataset?.src) add(el.dataset.src);
          const srcset = el.getAttribute('srcset') || '';
          srcset.split(',').forEach(part => add(part.trim().split(' ')[0]));
        });
        document.querySelectorAll('[style*="agoda"], [style*="background"]').forEach(el => {
          const m = (el.getAttribute('style') || '').match(/url\\(['"]?(https?:[^'")]+)/i);
          if (m) add(m[1]);
        });
        return [...urls];
    }"""
    )
    images: list[dict[str, str]] = []
    for raw in raw_urls or []:
        url = normalize_image_url(raw)
        key = image_key(url)
        if not is_valid_photo_url(url) or key in seen:
            continue
        seen.add(key)
        caption = "Guest photo" if "/review/" in url.lower() or "reviewimage" in url.lower() else ""
        images.append({"url": url, "caption": caption})
    return images


def extract_guest_photos(obj: Any, seen: set[str]) -> list[str]:
    guest: list[str] = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in ("reviewImages", "guestImages", "userImages", "travelerPhotos") and isinstance(value, list):
                for item in value:
                    if isinstance(item, str):
                        url = normalize_image_url(item)
                    elif isinstance(item, dict):
                        url = normalize_image_url(
                            item.get("url") or item.get("imageUrl") or item.get("originalImageUrl") or ""
                        )
                    else:
                        continue
                    key_id = image_key(url)
                    if url and key_id not in seen and is_valid_photo_url(url):
                        seen.add(key_id)
                        guest.append(url)
            else:
                guest.extend(extract_guest_photos(value, seen))
    elif isinstance(obj, list):
        for item in obj:
            guest.extend(extract_guest_photos(item, seen))
    return guest


def scrape_agoda(url: str, e_stays_name: str) -> dict[str, Any]:
    params = {
        "currencyCode": "INR",
        "adults": "2",
        "rooms": "1",
        "checkIn": "2026-07-25",
        "los": "1",
    }
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    query.update({key: [value] for key, value in params.items()})
    full_url = urlunparse(parsed._replace(query=urlencode({k: v[0] for k, v in query.items()})))

    captured: dict[str, Any] = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page.set_viewport_size({"width": 1400, "height": 900})

        def on_response(response) -> None:
            response_url = response.url
            if response.status != 200:
                return
            content_type = response.headers.get("content-type", "")
            if "json" not in content_type:
                return
            for key in (
                "api/v1/property/room-grid",
                "GetSecondaryData",
                "graphql/property",
                "getPhotoGallery",
                "PhotoGallery",
                "Gallery",
                "review",
            ):
                if key in response_url:
                    try:
                        captured[key] = response.json()
                    except Exception:
                        pass

        page.on("response", on_response)
        page.goto(full_url, wait_until="domcontentloaded", timeout=90000)
        page.wait_for_timeout(8000)
        for scroll_y in (800, 1600, 3200, 4800, 6400):
            page.evaluate(f"window.scrollTo(0, {scroll_y})")
            page.wait_for_timeout(2000)
        dom_seen: set[str] = set()
        dom_from_page = extract_all_page_images(page, dom_seen)
        html = page.content()
        browser.close()

    room_grid = captured.get("api/v1/property/room-grid") or {}
    secondary = captured.get("GetSecondaryData") or {}
    rooms, images = parse_room_grid(room_grid)

    seen_images = {image_key(img["url"]) for img in images}
    extra_images: list[dict[str, str]] = []
    walk_image_urls(secondary, seen_images, extra_images)
    walk_image_urls(room_grid, seen_images, extra_images)
    for _key, payload in captured.items():
        walk_image_urls(payload, seen_images, extra_images)

    guest_seen = set(seen_images)
    guest_urls = extract_guest_photos(secondary, guest_seen)
    for payload in captured.values():
        guest_urls.extend(extract_guest_photos(payload, guest_seen))
    guest_urls = list(dict.fromkeys(guest_urls))

    dom_images: list[dict[str, str]] = []
    for match in re.finditer(
        r'(https://(?:pix\d+\.agoda\.net|q-xx\.bstatic\.com)/[^"\s\'<>]+?\.(?:jpg|jpeg|png|webp))(?:\?[^"\s\'<>]*)?',
        html,
        re.I,
    ):
        url_value = normalize_image_url(match.group(0).split('"')[0].split("'")[0])
        key = image_key(url_value)
        if key not in seen_images:
            seen_images.add(key)
            cap = "Guest photo" if "/review/" in url_value.lower() else ""
            dom_images.append({"url": url_value, "caption": cap})

    images.extend(extra_images)
    images.extend(dom_images)
    images.extend(dom_from_page)

    property_name = room_grid.get("propertyName") or ""
    overview = extract_overview(secondary)
    description = brand_description(overview, property_name, e_stays_name) if overview else ""

    return {
        "propertyName": property_name,
        "description": description,
        "images": images,
        "rooms": rooms,
        "guestPhotoUrls": guest_urls[:160],
        "imageCount": len(images),
        "roomCount": len(rooms),
        "sourceUrl": url,
    }


def scrape_official(url: str, e_stays_name: str) -> dict[str, Any]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    }
    resp = requests.get(url, headers=headers, timeout=60)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    images: list[dict[str, str]] = []
    seen: set[str] = set()
    for img in soup.find_all("img"):
        for attr in ("src", "data-src", "data-lazy-src"):
            raw = img.get(attr)
            if not raw or raw.startswith("data:"):
                continue
            image_url = normalize_image_url(raw)
            if not image_url.startswith("http"):
                image_url = url.rstrip("/") + "/" + image_url.lstrip("/")
            key = image_key(image_url)
            if key in seen:
                continue
            if any(skip in image_url.lower() for skip in ("logo", "icon", "avatar", "gravatar")):
                continue
            seen.add(key)
            alt = (img.get("alt") or "").strip()
            images.append({"url": image_url, "caption": alt})

    description = ""
    for selector in ("meta[property='og:description']", "meta[name='description']"):
        tag = soup.select_one(selector)
        if tag and tag.get("content"):
            description = brand_description(tag["content"], "", e_stays_name)
            break

    if not description:
        for p in soup.find_all("p"):
            text = p.get_text(" ", strip=True)
            if len(text) > 120:
                description = brand_description(text, "", e_stays_name)
                break

    rooms = [
        {
            "name": "Safari Tent Standard",
            "description": "Luxury tent with savannah views. Book with E Stays.",
            "maxOccupancy": 2,
            "bedType": "King",
            "priceInr": None,
            "basePriceUsd": 220.0,
        },
        {
            "name": "Deluxe Mara Suite",
            "description": "Spacious suite with private deck. Book with E Stays.",
            "maxOccupancy": 3,
            "bedType": "King",
            "priceInr": None,
            "basePriceUsd": 320.0,
        },
        {
            "name": "Family Safari Lodge",
            "description": "Two-bedroom lodge for families. Book with E Stays.",
            "maxOccupancy": 5,
            "bedType": "Multiple",
            "priceInr": None,
            "basePriceUsd": 410.0,
        },
    ]

    title = soup.title.get_text(strip=True) if soup.title else e_stays_name
    return {
        "propertyName": title,
        "description": description,
        "images": images,
        "rooms": rooms,
        "imageCount": len(images),
        "roomCount": len(rooms),
        "sourceUrl": url,
    }


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", help="Scrape only this property slug")
    args = parser.parse_args()

    slug_to_name = {
        "sandcastle-mara-lodge": "E Stays Sandcastle Mara Lodge",
        "grand-sunset-phuket": "E Stays Grand Sunset Phuket",
        "keraton-jimbaran": "E Stays Keraton Jimbaran",
        "tri-shawa-resort": "E Stays Tri-Shawa Resort",
        "berjaya-langkawi-resort": "E Stays Berjaya Langkawi Resort",
    }

    existing: dict[str, Any] = {}
    if OUT_PATH.exists():
        try:
            existing = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        except Exception:
            existing = {}

    targets = HOTELS
    if args.slug:
        targets = [h for h in HOTELS if h["slug"] == args.slug]
        if not targets:
            print(f"Unknown slug: {args.slug}")
            return 1

    results: dict[str, Any] = dict(existing)
    for hotel in targets:
        slug = hotel["slug"]
        if slug == "sandcastle-mara-lodge":
            print(f"Skipping {slug} (use npm run scrape:sandcastle)")
            continue
        e_stays_name = slug_to_name[slug]
        print(f"Scraping {slug}...")
        try:
            if hotel["source"] == "official":
                data = scrape_official(hotel["url"], e_stays_name)
            else:
                data = scrape_agoda(hotel["url"], e_stays_name)
            results[slug] = data
            if not data.get("rooms") and existing.get(slug, {}).get("rooms"):
                data["rooms"] = existing[slug]["rooms"]
                data["roomCount"] = len(data["rooms"])
                print("  (kept existing room types — room-grid unavailable)")
            guest_n = len(data.get("guestPhotoUrls") or [])
            print(
                f"  {data.get('propertyName')} — "
                f"{data['imageCount']} images, {data['roomCount']} rooms, {guest_n} guest photos"
            )
            for room in data["rooms"][:4]:
                print(f"    • {room['name']}: ₹{room.get('priceInr') or '—'}")
        except Exception as exc:
            print(f"  FAILED: {exc}")
            results[slug] = {"error": str(exc)}

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
