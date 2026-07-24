from __future__ import annotations

from hotel_pipeline.utils.signature import verify_signature


def test_verify_signature_valid() -> None:
    # Known Razorpay test vector pattern
    secret = "test_secret"
    order_id = "order_123"
    payment_id = "pay_456"
    import hmac
    import hashlib

    body = f"{order_id}|{payment_id}"
    sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    assert verify_signature(order_id, payment_id, sig, secret) is True


def test_verify_signature_invalid() -> None:
    assert verify_signature("order_1", "pay_1", "bad", "secret") is False
