from __future__ import annotations

import hashlib
import hmac


def verify_signature(order_id: str, payment_id: str, signature: str, secret: str) -> bool:
    body = f"{order_id}|{payment_id}"
    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
