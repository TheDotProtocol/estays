from __future__ import annotations

import argparse
import asyncio

from hotel_pipeline.config import get_settings
from hotel_pipeline.pipeline.runner import PipelineRunner
from hotel_pipeline.utils.logging_setup import setup_logging


def main() -> None:
    parser = argparse.ArgumentParser(description="Run hotel image collection pipeline")
    parser.add_argument("--hotel", action="append", dest="hotels", help="Hotel id(s) to process")
    parser.add_argument("--discover-only", action="store_true", help="Only run discovery step")
    args = parser.parse_args()

    settings = get_settings()
    setup_logging(settings)
    runner = PipelineRunner(settings)

    if args.discover_only:
        from hotel_pipeline.config import load_hotels_config
        from hotel_pipeline.discovery.search import ListingDiscovery

        hotels = load_hotels_config(settings)
        if args.hotels:
            hotels = [h for h in hotels if h["id"] in args.hotels]
        discovery = ListingDiscovery(settings)
        allowed = runner.pipeline_cfg.get("allowed_sources", [])
        for hotel in hotels:
            listings, images = discovery.discover_for_hotel(hotel, allowed)
            print(f"{hotel['name']}: {len(listings)} listings, {len(images)} images")
        return

    stats = asyncio.run(runner.run(hotel_ids=args.hotels))
    print(stats.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
