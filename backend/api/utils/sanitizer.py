"""
Input Sanitization Utilities for AI Search Engine.

Production-grade sanitisation that strips dangerous HTML / script payloads
while still allowing plain-text searches.
"""

import re
from typing import Optional


# Pre-compiled patterns for efficiency
_SCRIPT_TAG_RE = re.compile(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", re.IGNORECASE | re.DOTALL)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_SQL_INJECTION_RE = re.compile(
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b\s)",
    re.IGNORECASE,
)
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_EXCESS_WHITESPACE_RE = re.compile(r"\s{2,}")


def sanitize_query(raw_input: str, max_length: int = 1000) -> str:
    """
    Sanitize a user search query.

    Steps:
        1. Strip leading/trailing whitespace
        2. Remove control characters
        3. Strip embedded script tags and HTML
        4. Collapse excess whitespace
        5. Enforce max length

    Note: Do not html.escape — that turns "&" into "&amp;" and hurts retrieval.
    HTML is already stripped; escaping is for display, not search queries.

    Args:
        raw_input: The raw query string from the user.
        max_length: Maximum allowed character length.

    Returns:
        Sanitized, safe string.
    """
    if not raw_input:
        return ""

    text = raw_input.strip()
    text = _CONTROL_CHARS_RE.sub("", text)
    text = _SCRIPT_TAG_RE.sub("", text)
    text = _HTML_TAG_RE.sub("", text)
    text = _EXCESS_WHITESPACE_RE.sub(" ", text).strip()
    return text[:max_length]


def sanitize_html_content(raw_html: str, max_length: int = 50000) -> str:
    """
    Sanitize HTML content (e.g., answer text) – removes script/style but
    allows safe markdown-rendered content.
    """
    if not raw_html:
        return ""

    text = _SCRIPT_TAG_RE.sub("", raw_html)
    style_re = re.compile(r"<\s*style[^>]*>.*?<\s*/\s*style\s*>", re.IGNORECASE | re.DOTALL)
    text = style_re.sub("", text)
    text = _CONTROL_CHARS_RE.sub("", text)
    return text[:max_length]


def detect_injection_attempt(text: str) -> bool:
    """
    Heuristic check for SQL injection patterns. Returns True if suspicious.
    """
    return bool(_SQL_INJECTION_RE.search(text))


def sanitize_url(url: str) -> Optional[str]:
    """
    Validate and sanitize a URL. Returns None if invalid.
    """
    if not url:
        return None
    url = url.strip()
    if url.startswith(("javascript:", "data:", "vbscript:")):
        return None
    if not url.startswith(("http://", "https://")):
        return None
    # Remove control chars
    url = _CONTROL_CHARS_RE.sub("", url)
    return url[:2048]
