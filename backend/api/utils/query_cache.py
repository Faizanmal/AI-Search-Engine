"""Cache helpers for expensive search queries."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List, Optional

from django.core.cache import cache

# Cache successful non-degraded answers for 15 minutes
QUERY_CACHE_TTL = 60 * 15


def _normalize_history(history: Optional[List[Dict]]) -> List[Dict]:
    if not history:
        return []
    cleaned = []
    for turn in history[-6:]:
        if not isinstance(turn, dict):
            continue
        role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            cleaned.append({"role": role, "content": content[:2000]})
    return cleaned


def build_cache_key(
    *,
    query: str,
    search_mode: str,
    max_sources: int,
    source_types: Optional[List[str]],
    enable_fact_check: bool,
    conversation_history: Optional[List[Dict]] = None,
    plugins: Optional[List[str]] = None,
) -> str:
    payload = {
        "q": query.strip().lower(),
        "mode": search_mode,
        "max": max_sources,
        "types": sorted(source_types or []),
        "fc": bool(enable_fact_check),
        "hist": _normalize_history(conversation_history),
        "plugins": sorted(plugins or []),
    }
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, ensure_ascii=True).encode("utf-8")
    ).hexdigest()[:32]
    return f"search:query:{digest}"


def get_cached_result(key: str) -> Optional[Dict[str, Any]]:
    data = cache.get(key)
    return data if isinstance(data, dict) else None


def set_cached_result(key: str, result: Dict[str, Any]) -> None:
    if not result or result.get("degraded"):
        return
    # Don't cache empty answers
    if not (result.get("answer") or "").strip():
        return
    cache.set(key, result, QUERY_CACHE_TTL)
