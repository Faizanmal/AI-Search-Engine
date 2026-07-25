"""Lightweight spam guards for public FormForge submissions."""

from __future__ import annotations

import time
from typing import Optional, Tuple

from django.core.cache import cache


# Honeypot field name — must stay empty for humans
HONEYPOT_FIELD = "website_url"

# Soft IP rate limit for public submits
SUBMIT_RATE_LIMIT = 8          # max submissions
SUBMIT_RATE_WINDOW_SEC = 600   # per 10 minutes


def is_honeypot_tripped(payload: dict | None, raw_body: dict | None = None) -> bool:
    """
    Return True if the honeypot was filled (bot).
    Checks both nested payload and top-level body.
    """
    candidates = []
    if isinstance(payload, dict):
        candidates.append(payload.get(HONEYPOT_FIELD))
        candidates.append(payload.get("_gotcha"))
    if isinstance(raw_body, dict):
        candidates.append(raw_body.get(HONEYPOT_FIELD))
        candidates.append(raw_body.get("_gotcha"))
    return any(bool(str(v).strip()) for v in candidates if v is not None)


def strip_honeypot_fields(payload: dict) -> dict:
    """Remove spam-trap keys before persisting submission data."""
    if not isinstance(payload, dict):
        return payload
    cleaned = dict(payload)
    cleaned.pop(HONEYPOT_FIELD, None)
    cleaned.pop("_gotcha", None)
    return cleaned


def check_submit_rate_limit(ip: Optional[str]) -> Tuple[bool, int]:
    """
    Sliding-ish fixed window rate limit by IP.

    Returns:
        (allowed, retry_after_seconds)
    """
    if not ip:
        return True, 0

    cache_key = f"formforge:submit:{ip}"
    data = cache.get(cache_key)
    now = time.time()

    if not data:
        cache.set(cache_key, {"count": 1, "started": now}, SUBMIT_RATE_WINDOW_SEC)
        return True, 0

    count = int(data.get("count", 0))
    started = float(data.get("started", now))
    elapsed = now - started

    if elapsed >= SUBMIT_RATE_WINDOW_SEC:
        cache.set(cache_key, {"count": 1, "started": now}, SUBMIT_RATE_WINDOW_SEC)
        return True, 0

    if count >= SUBMIT_RATE_LIMIT:
        retry_after = max(1, int(SUBMIT_RATE_WINDOW_SEC - elapsed))
        return False, retry_after

    data["count"] = count + 1
    cache.set(
        cache_key,
        data,
        max(1, int(SUBMIT_RATE_WINDOW_SEC - elapsed)),
    )
    return True, 0
