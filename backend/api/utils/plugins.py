"""Resolve installed user plugins into search pipeline options."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set

from api.models import UserPlugin

# Slug → effect on retrieval / generation
PLUGIN_EFFECTS = {
    "academic-papers": {
        "force_mode": "academic",
        "source_types": ["academic"],
        "max_sources_boost": 3,
    },
    "news-pulse": {
        "force_mode": "news",
        "source_types": ["news"],
    },
    "citation-cleaner": {
        "dedupe_citations": True,
    },
    "fact-check-assist": {
        "enable_fact_check": True,
    },
}


def get_enabled_plugin_slugs(user) -> Set[str]:
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    return set(
        UserPlugin.objects.filter(user=user, is_enabled=True, plugin__is_active=True)
        .select_related("plugin")
        .values_list("plugin__slug", flat=True)
    )


def apply_plugins_to_options(
    *,
    user,
    search_mode: str,
    source_types: Optional[List[str]],
    max_sources: int,
    enable_fact_check: bool,
) -> Dict[str, Any]:
    """
    Merge enabled plugin effects into request options.

    Explicit client choices win for mode unless plugin is installed and
    mode is still the default "text".
    """
    slugs = get_enabled_plugin_slugs(user)
    effects = [PLUGIN_EFFECTS[s] for s in slugs if s in PLUGIN_EFFECTS]

    merged_types = list(source_types or [])
    dedupe = False
    mode = search_mode
    fact_check = enable_fact_check
    sources = max_sources

    for effect in effects:
        if effect.get("force_mode") and mode == "text":
            mode = effect["force_mode"]
        for st in effect.get("source_types") or []:
            if st not in merged_types:
                merged_types.append(st)
        if effect.get("enable_fact_check"):
            fact_check = True
        if effect.get("dedupe_citations"):
            dedupe = True
        boost = int(effect.get("max_sources_boost") or 0)
        if boost:
            sources = min(20, sources + boost)

    return {
        "search_mode": mode,
        "source_types": merged_types,
        "max_sources": sources,
        "enable_fact_check": fact_check,
        "dedupe_citations": dedupe,
        "active_plugins": sorted(slugs),
    }


def dedupe_sources(sources: List[Dict]) -> List[Dict]:
    """Drop duplicate URLs / near-duplicate titles (Citation Cleaner plugin)."""
    seen_urls: Set[str] = set()
    seen_titles: Set[str] = set()
    out: List[Dict] = []
    for src in sources:
        url = (src.get("url") or "").rstrip("/").lower()
        title = (src.get("title") or "").strip().lower()
        if url and url in seen_urls:
            continue
        if title and title in seen_titles:
            continue
        if url:
            seen_urls.add(url)
        if title:
            seen_titles.add(title)
        out.append(src)
    # Re-number positions / ids for citation alignment
    for idx, src in enumerate(out, 1):
        src["id"] = idx
        src["position"] = idx
    return out
