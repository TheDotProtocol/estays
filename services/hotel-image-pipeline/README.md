# Hotel Image Pipeline

Production-grade hotel image **collection**, **classification**, and **browsing** system for E Stays.

Collects publicly accessible images from OTA listing pages (Booking.com, Agoda, Hotels.com, Expedia, Trip.com, Traveloka) and official hotel websites — **without bypassing authentication, paywalls, or CAPTCHAs**. Respects `robots.txt` and rate limits.

## Target hotels

- E Stays Sandcastle Mara Lodge
- E Stays Grand Sunset Phuket
- E Stays Keraton Jimbaran
- E Stays Tri-Shawa Resort
- E Stays Berjaya Langkawi Resort

## Architecture

```
config/hotels.yaml          → hotel search queries + seed URLs
src/hotel_pipeline/
  discovery/                → locate public listings, extract metadata
  download/                 → concurrent downloads + SHA256
  quality/                  → reject logos, blur, tiny thumbs
  dedupe/                   → SHA256 + pHash + CLIP embeddings
  classify/                 → CLIP + BLIP captioning + text hints
  organize/                 → Rooms/ + Facilities/ folder tree
  pipeline/runner.py        → end-to-end orchestration
  api/main.py               → FastAPI browse/search API
dashboard/                  → React gallery UI
dataset/                    → organized images + metadata.json
```

## Quick start

```bash
cd services/hotel-image-pipeline
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
playwright install chromium
cp .env.example .env
```

### Run full pipeline

```bash
hotel-pipeline
# or single hotel:
hotel-pipeline --hotel keraton-jimbaran
```

### Discovery only (no download)

```bash
hotel-pipeline --discover-only
```

### Start API

```bash
uvicorn hotel_pipeline.api.main:app --reload --port 8100
```

### Start dashboard

```bash
cd dashboard && npm install && npm run dev
```

Open http://localhost:5173

## Docker

```bash
docker compose up --build
```

- API: http://localhost:8100
- Dashboard: http://localhost:5173
- Docs: http://localhost:8100/docs

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hotels` | List hotels |
| GET | `/hotel/{id}` | Hotel detail |
| GET | `/hotel/{id}/rooms` | Room images |
| GET | `/hotel/{id}/facilities` | Facility images |
| GET | `/hotel/{id}/images` | All images (+ filters) |
| GET | `/search?room=Deluxe` | Search across dataset |
| GET | `/images/{id}/file` | Serve image file |
| GET | `/metadata/export` | Download metadata JSON |

## Output structure

```
dataset/
  E Stays Keraton Jimbaran/
    Rooms/
      Deluxe/
      Suite/
      Unknown/
    Facilities/
      Pool/
      Restaurant/
      Exterior/
    metadata.json
  metadata.json
```

## Configuration

- `config/hotels.yaml` — hotels, search queries, optional `seed_urls`
- `config/settings.yaml` — categories, quality thresholds, dedupe settings
- `.env` — paths, DB, CLIP device, rate limits

**Tip:** Add verified public listing URLs to `seed_urls` for reliable discovery when search results are sparse.

## Classification

- **Primary:** CLIP zero-shot over 23 categories
- **Rooms:** CLIP + caption/alt/OTA text + bed/feature heuristics
- **Facilities:** CLIP + category mapping
- **Dedup:** SHA256 → perceptual hash → CLIP cosine similarity

Set `ENABLE_CLIP=false` for faster runs without GPU (text-only fallback).

## Tests

```bash
pytest tests/ -v
```

## Legal & compliance

- Public pages only; `robots.txt` enforced by default
- Rate limited per domain
- `license_note` stored on every image — verify rights before commercial use
- Do not use to scrape logged-in, paywalled, or CAPTCHA-protected content

## Logs

```
logs/
  pipeline.log
  downloads.log
  classification.log
  errors.log
  duplicates.log
```

## Next steps

1. Add `seed_urls` for each hotel from verified public listing pages
2. Run pipeline locally or via Docker
3. Review classified dataset in dashboard
4. Import curated images into E Stays partner onboarding (future integration)
