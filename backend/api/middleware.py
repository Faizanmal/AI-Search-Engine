"""
Rate Limiting Middleware for AI Search Engine.

Implements a sliding-window rate limiter using Django's cache framework.
Configurable per-endpoint limits via environment variables.
"""

import time
import hashlib
import logging

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger("api.middleware.rate_limit")


class RateLimitMiddleware:
    """
    Sliding-window rate limiter middleware.

    Limits are applied per IP address (or per authenticated user when available).
    Different limits can be configured for different URL path prefixes.

    Settings (via environment or Django settings):
        RATE_LIMIT_QUERY_PER_MINUTE  – max requests to /api/query/ per minute
        RATE_LIMIT_AUTH_PER_MINUTE   – max requests to /api/auth/ per minute
        RATE_LIMIT_EXPORT_PER_MINUTE – max requests to /api/export/ per minute
        RATE_LIMIT_DEFAULT           – fallback limit for all other /api/ routes
    """

    WINDOW_SECONDS = 60  # 1-minute sliding window

    def __init__(self, get_response):
        self.get_response = get_response
        self.limits = {
            "/api/query/": getattr(settings, "RATE_LIMIT_QUERY_PER_MINUTE", 20),
            "/api/stream-query/": getattr(settings, "RATE_LIMIT_QUERY_PER_MINUTE", 20),
            "/api/auth/": getattr(settings, "RATE_LIMIT_AUTH_PER_MINUTE", 10),
            "/api/export/": getattr(settings, "RATE_LIMIT_EXPORT_PER_MINUTE", 5),
            "/api/history/": getattr(settings, "RATE_LIMIT_DEFAULT", 30),
            "/api/bookmarks/": getattr(settings, "RATE_LIMIT_DEFAULT", 30),
            "/api/analytics/": getattr(settings, "RATE_LIMIT_DEFAULT", 30),
        }
        self.default_limit = getattr(settings, "RATE_LIMIT_DEFAULT", 60)

    def __call__(self, request):
        # Only rate-limit API paths
        if not request.path.startswith("/api/"):
            return self.get_response(request)

        # Skip health-check
        if request.path == "/api/health/":
            return self.get_response(request)

        identifier = self._get_identifier(request)
        limit = self._get_limit(request.path)
        cache_key = self._build_cache_key(identifier, request.path)

        now = time.time()
        window_start = now - self.WINDOW_SECONDS

        # Retrieve existing timestamps from cache
        timestamps: list = cache.get(cache_key, [])
        # Remove entries outside the current window
        timestamps = [ts for ts in timestamps if ts > window_start]

        if len(timestamps) >= limit:
            retry_after = int(timestamps[0] - window_start) + 1
            logger.warning(
                "Rate limit exceeded for %s on %s (%d/%d)",
                identifier,
                request.path,
                len(timestamps),
                limit,
            )
            return JsonResponse(
                {
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Please retry after {retry_after} seconds.",
                    "retry_after": retry_after,
                },
                status=429,
            )

        timestamps.append(now)
        cache.set(cache_key, timestamps, timeout=self.WINDOW_SECONDS + 10)

        response = self.get_response(request)
        response["X-RateLimit-Limit"] = str(limit)
        response["X-RateLimit-Remaining"] = str(max(limit - len(timestamps), 0))
        response["X-RateLimit-Reset"] = str(int(window_start + self.WINDOW_SECONDS))
        return response

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_identifier(self, request) -> str:
        """Return a stable identifier: authenticated user id or IP."""
        if hasattr(request, "user") and request.user.is_authenticated:
            return f"user:{request.user.pk}"
        return f"ip:{self._get_client_ip(request)}"

    @staticmethod
    def _get_client_ip(request) -> str:
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")

    def _get_limit(self, path: str) -> int:
        for prefix, limit in self.limits.items():
            if path.startswith(prefix):
                return limit
        return self.default_limit

    @staticmethod
    def _build_cache_key(identifier: str, path: str) -> str:
        # Prefix-based bucket so /api/query/ and /api/auth/ have separate counters
        bucket = path.strip("/").replace("/", ":")
        raw = f"ratelimit:{bucket}:{identifier}"
        return hashlib.md5(raw.encode()).hexdigest()


class SecurityHeadersMiddleware:
    """
    Adds production-grade security headers to every response.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"
        response["X-XSS-Protection"] = "1; mode=block"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )
        if not settings.DEBUG:
            response["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        return response


class RequestLoggingMiddleware:
    """
    Logs every request with method, path, status, and duration for observability.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = logging.getLogger("api.middleware.request")

    def __call__(self, request):
        start = time.time()
        response = self.get_response(request)
        duration_ms = (time.time() - start) * 1000

        self.logger.info(
            "%s %s %s %.1fms (user=%s)",
            request.method,
            request.path,
            response.status_code,
            duration_ms,
            getattr(request.user, "pk", "anon") if hasattr(request, "user") else "anon",
        )
        return response
