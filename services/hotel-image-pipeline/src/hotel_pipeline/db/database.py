from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from hotel_pipeline.config import get_settings


class Base(DeclarativeBase):
    pass


class HotelRow(Base):
    __tablename__ = "hotels"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)


class ImageRow(Base):
    __tablename__ = "images"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    hotel_id: Mapped[str] = mapped_column(String(64), index=True)
    hotel_name: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(128))
    page_url: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str] = mapped_column(Text)
    local_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    organized_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    primary_category: Mapped[str] = mapped_column(String(64), default="Unknown")
    room_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    facility_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    alt_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    phash: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="discovered")
    skip_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    license_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    download_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extra: Mapped[dict | None] = mapped_column(JSON, nullable=True)


_engine = None
_SessionLocal = None


def get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        settings = get_settings()
        connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
        _engine = create_engine(settings.database_url, connect_args=connect_args)
        Base.metadata.create_all(_engine)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
    return _engine


def get_session() -> Session:
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal()


def upsert_image(session: Session, record_id: str, data: dict) -> None:
    row = session.get(ImageRow, record_id)
    if row is None:
        row = ImageRow(id=record_id, **data)
        session.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)
    session.commit()
