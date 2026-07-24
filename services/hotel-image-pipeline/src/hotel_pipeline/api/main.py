from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import or_, select

from hotel_pipeline.config import get_settings
from hotel_pipeline.db.database import HotelRow, ImageRow, get_session


class HotelOut(BaseModel):
    id: str
    name: str
    location: str | None = None
    image_count: int = 0


class ImageOut(BaseModel):
    id: str
    hotel_id: str
    hotel_name: str
    source: str
    page_url: str
    image_url: str
    local_path: str | None
    organized_path: str | None
    primary_category: str
    room_type: str | None
    facility_type: str | None
    caption: str | None
    alt_text: str | None
    confidence: float
    hash: str | None
    download_date: str | None
    license_note: str | None


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Hotel Image Pipeline API",
        description="Browse classified hotel image datasets",
        version="1.0.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def row_to_image(row: ImageRow) -> ImageOut:
        return ImageOut(
            id=row.id,
            hotel_id=row.hotel_id,
            hotel_name=row.hotel_name,
            source=row.source,
            page_url=row.page_url,
            image_url=row.image_url,
            local_path=row.local_path,
            organized_path=row.organized_path,
            primary_category=row.primary_category,
            room_type=row.room_type,
            facility_type=row.facility_type,
            caption=row.caption,
            alt_text=row.alt_text,
            confidence=row.confidence,
            hash=row.sha256,
            download_date=row.download_date.isoformat() if row.download_date else None,
            license_note=row.license_note,
        )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/hotels", response_model=list[HotelOut])
    def list_hotels() -> list[HotelOut]:
        session = get_session()
        hotels = session.execute(select(HotelRow)).scalars().all()
        result: list[HotelOut] = []
        for hotel in hotels:
            count = session.query(ImageRow).filter(ImageRow.hotel_id == hotel.id).count()
            result.append(HotelOut(id=hotel.id, name=hotel.name, location=hotel.location, image_count=count))
        session.close()
        return result

    @app.get("/hotel/{hotel_id}", response_model=HotelOut)
    def get_hotel(hotel_id: str) -> HotelOut:
        session = get_session()
        hotel = session.get(HotelRow, hotel_id)
        if not hotel:
            session.close()
            raise HTTPException(404, "Hotel not found")
        count = session.query(ImageRow).filter(ImageRow.hotel_id == hotel_id).count()
        session.close()
        return HotelOut(id=hotel.id, name=hotel.name, location=hotel.location, image_count=count)

    @app.get("/hotel/{hotel_id}/rooms", response_model=list[ImageOut])
    def hotel_rooms(hotel_id: str) -> list[ImageOut]:
        session = get_session()
        rows = (
            session.query(ImageRow)
            .filter(ImageRow.hotel_id == hotel_id, ImageRow.room_type.isnot(None))
            .all()
        )
        session.close()
        return [row_to_image(r) for r in rows]

    @app.get("/hotel/{hotel_id}/facilities", response_model=list[ImageOut])
    def hotel_facilities(hotel_id: str) -> list[ImageOut]:
        session = get_session()
        rows = (
            session.query(ImageRow)
            .filter(ImageRow.hotel_id == hotel_id, ImageRow.facility_type.isnot(None))
            .all()
        )
        session.close()
        return [row_to_image(r) for r in rows]

    @app.get("/hotel/{hotel_id}/images", response_model=list[ImageOut])
    def hotel_images(
        hotel_id: str,
        category: str | None = None,
        min_confidence: float = Query(0.0, ge=0, le=1),
    ) -> list[ImageOut]:
        session = get_session()
        q = session.query(ImageRow).filter(ImageRow.hotel_id == hotel_id)
        if category:
            q = q.filter(
                or_(
                    ImageRow.primary_category == category,
                    ImageRow.room_type == category,
                    ImageRow.facility_type == category,
                )
            )
        q = q.filter(ImageRow.confidence >= min_confidence)
        rows = q.all()
        session.close()
        return [row_to_image(r) for r in rows]

    @app.get("/search", response_model=list[ImageOut])
    def search_images(
        room: str | None = None,
        facility: str | None = None,
        hotel_id: str | None = None,
        q: str | None = None,
        min_confidence: float = Query(0.0, ge=0, le=1),
    ) -> list[ImageOut]:
        session = get_session()
        query = session.query(ImageRow).filter(ImageRow.confidence >= min_confidence)
        if hotel_id:
            query = query.filter(ImageRow.hotel_id == hotel_id)
        if room:
            query = query.filter(ImageRow.room_type.ilike(f"%{room}%"))
        if facility:
            query = query.filter(ImageRow.facility_type.ilike(f"%{facility}%"))
        if q:
            like = f"%{q}%"
            query = query.filter(
                or_(ImageRow.caption.ilike(like), ImageRow.alt_text.ilike(like), ImageRow.hotel_name.ilike(like))
            )
        rows = query.limit(200).all()
        session.close()
        return [row_to_image(r) for r in rows]

    @app.get("/images/{image_id}/file")
    def serve_image(image_id: str) -> FileResponse:
        session = get_session()
        row = session.get(ImageRow, image_id)
        session.close()
        if not row:
            raise HTTPException(404, "Image not found")
        path_str = row.organized_path or row.local_path
        if not path_str:
            raise HTTPException(404, "No local file")
        path = Path(path_str)
        if not path.exists():
            raise HTTPException(404, "File missing on disk")
        return FileResponse(path)

    @app.get("/metadata/export")
    def export_metadata(hotel_id: str | None = None) -> list[dict]:
        session = get_session()
        q = session.query(ImageRow)
        if hotel_id:
            q = q.filter(ImageRow.hotel_id == hotel_id)
        rows = q.all()
        session.close()
        return [
            {
                "hotel": r.hotel_name,
                "hotel_id": r.hotel_id,
                "source": r.source,
                "page_url": r.page_url,
                "image_url": r.image_url,
                "local_path": r.local_path,
                "organized_path": r.organized_path,
                "room_type": r.room_type,
                "facility_type": r.facility_type,
                "caption": r.caption,
                "alt_text": r.alt_text,
                "confidence": r.confidence,
                "hash": r.sha256,
                "download_date": r.download_date.isoformat() if r.download_date else None,
                "license_note": r.license_note,
            }
            for r in rows
        ]

    return app


app = create_app()
