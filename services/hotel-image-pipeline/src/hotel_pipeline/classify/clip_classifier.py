from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image

from hotel_pipeline.config import Settings, load_pipeline_settings, get_settings
from hotel_pipeline.models import ClassificationResult, ImageRecord
from hotel_pipeline.utils.logging_setup import get_event_logger

logger = get_event_logger("classification")

_clip_model = None
_clip_preprocess = None
_clip_tokenizer = None
_caption_model = None
_caption_processor = None


@lru_cache(maxsize=1)
def _load_clip(settings: Settings) -> tuple[Any, Any, Any]:
    global _clip_model, _clip_preprocess, _clip_tokenizer
    import open_clip

    model, _, preprocess = open_clip.create_model_and_transforms(
        settings.clip_model,
        pretrained=settings.clip_pretrained,
    )
    tokenizer = open_clip.get_tokenizer(settings.clip_model)
    device = settings.clip_device
    model = model.to(device).eval()
    _clip_model, _clip_preprocess, _clip_tokenizer = model, preprocess, tokenizer
    return model, preprocess, tokenizer


def _load_caption(settings: Settings) -> tuple[Any, Any]:
    global _caption_model, _caption_processor
    if _caption_model is not None:
        return _caption_model, _caption_processor
    from transformers import BlipForConditionalGeneration, BlipProcessor

    processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
    model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
    model = model.to(settings.clip_device).eval()
    _caption_model, _caption_processor = model, processor
    return model, processor


class ClipClassifier:
    ROOM_TYPES = [
        "Standard Room",
        "Superior Room",
        "Deluxe Room",
        "Executive Room",
        "Suite",
        "Family Room",
        "Twin Room",
        "Double Room",
        "Queen Room",
        "King Room",
        "Villa",
        "Bungalow",
        "Dormitory",
        "Studio",
        "Apartment",
        "Unknown Room",
    ]

    FACILITY_TYPES = [
        "Pool",
        "Restaurant",
        "Spa",
        "Gym",
        "Lobby",
        "Reception",
        "Cafe",
        "Kids Play Area",
        "Business Center",
        "Conference Hall",
        "Laundry",
        "Parking",
        "Beach Access",
        "Garden",
        "Terrace",
        "Rooftop",
        "Bar",
        "Breakfast",
        "Exterior",
        "Landscape",
    ]

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        pipeline_cfg = load_pipeline_settings(self.settings)
        self.primary_categories = pipeline_cfg.get("primary_categories", [])
        self.min_confidence = self.settings.min_classification_confidence

    def _encode_text_probs(self, image_path: Path, labels: list[str]) -> tuple[str, float]:
        import open_clip

        model, preprocess, tokenizer = _load_clip(self.settings)
        device = self.settings.clip_device
        image = preprocess(Image.open(image_path).convert("RGB")).unsqueeze(0).to(device)
        text = tokenizer([f"a hotel photo of {label}" for label in labels]).to(device)

        with torch.no_grad():
            image_features = model.encode_image(image)
            text_features = model.encode_text(text)
            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)
            probs = (100.0 * image_features @ text_features.T).softmax(dim=-1).cpu().numpy()[0]

        idx = int(np.argmax(probs))
        return labels[idx], float(probs[idx])

    def generate_caption(self, image_path: Path) -> str | None:
        if not self.settings.enable_captioning:
            return None
        try:
            model, processor = _load_caption(self.settings)
            image = Image.open(image_path).convert("RGB")
            inputs = processor(image, return_tensors="pt").to(self.settings.clip_device)
            with torch.no_grad():
                out = model.generate(**inputs, max_new_tokens=40)
            return processor.decode(out[0], skip_special_tokens=True)
        except Exception as exc:
            logger.warning("caption failed for %s: %s", image_path, exc)
            return None

    def _text_hints(self, record: ImageRecord) -> str:
        parts = [record.caption or "", record.alt_text or "", record.room_type or ""]
        return " ".join(parts).lower()

    def _infer_room_from_text(self, text: str) -> str | None:
        mapping = {
            r"\bdeluxe\b": "Deluxe Room",
            r"\bsuperior\b": "Superior Room",
            r"\bstandard\b": "Standard Room",
            r"\bexecutive\b": "Executive Room",
            r"\bsuite\b": "Suite",
            r"\bfamily\b": "Family Room",
            r"\btwin\b": "Twin Room",
            r"\bdouble\b": "Double Room",
            r"\bqueen\b": "Queen Room",
            r"\bking\b": "King Room",
            r"\bvilla\b": "Villa",
            r"\bbungalow\b": "Bungalow",
            r"\bdorm\b": "Dormitory",
            r"\bstudio\b": "Studio",
            r"\bapartment\b": "Apartment",
        }
        for pattern, room in mapping.items():
            if re.search(pattern, text):
                return room
        return None

    def classify(self, record: ImageRecord) -> ClassificationResult:
        if not record.local_path:
            return ClassificationResult(primary_category="Unknown", confidence=0.0)

        path = Path(record.local_path)
        text_hint = self._text_hints(record)
        signals: dict[str, Any] = {"text_hint": text_hint}

        if self.settings.enable_clip and path.exists():
            primary, primary_conf = self._encode_text_probs(path, self.primary_categories)
            room_type = None
            facility_type = None

            if primary in ("Rooms", "Bathroom", "Balcony", "Corridor", "View"):
                room_type, room_conf = self._encode_text_probs(path, self.ROOM_TYPES)
                signals["room_clip_conf"] = room_conf
            else:
                facility_type, fac_conf = self._encode_text_probs(path, self.FACILITY_TYPES)
                signals["facility_clip_conf"] = fac_conf

            text_room = self._infer_room_from_text(text_hint)
            if text_room and (room_type is None or text_room != "Unknown Room"):
                room_type = text_room
                signals["room_text_match"] = text_room

            caption = self.generate_caption(path)
            if caption:
                signals["generated_caption"] = caption
                if not text_room:
                    inferred = self._infer_room_from_text(caption.lower())
                    if inferred:
                        room_type = inferred

            confidence = max(primary_conf, signals.get("room_clip_conf", 0), signals.get("facility_clip_conf", 0))
            if confidence < self.min_confidence:
                primary = "Unknown"

            return ClassificationResult(
                primary_category=primary,
                room_type=room_type,
                facility_type=facility_type,
                confidence=confidence,
                signals=signals,
            )

        text_room = self._infer_room_from_text(text_hint)
        return ClassificationResult(
            primary_category="Rooms" if text_room else "Unknown",
            room_type=text_room or "Unknown Room",
            confidence=0.4 if text_room else 0.1,
            signals=signals,
        )

    def embedding(self, image_path: Path) -> list[float] | None:
        if not self.settings.enable_clip or not image_path.exists():
            return None
        model, preprocess, _ = _load_clip(self.settings)
        device = self.settings.clip_device
        image = preprocess(Image.open(image_path).convert("RGB")).unsqueeze(0).to(device)
        with torch.no_grad():
            features = model.encode_image(image)
            features /= features.norm(dim=-1, keepdim=True)
        return features.cpu().numpy()[0].tolist()
