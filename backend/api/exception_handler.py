"""
Centralised DRF exception handler.

Provides consistent JSON error shapes across all API endpoints,
logs server errors, and forwards to Sentry when configured.
"""

import logging
import traceback

from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("api.views")


def custom_exception_handler(exc, context):
    """
    A DRF exception handler that:
    - Returns a uniform ``{"error": ..., "details": ...}`` envelope.
    - Logs 5xx errors at ERROR level with tracebacks.
    - Passes through DRF's built-in handling for standard exceptions.
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = _format_drf_error(exc, response)
        response.data = error_payload
        return response

    # Unhandled exception → 500
    logger.error(
        "Unhandled exception in %s: %s\n%s",
        _view_name(context),
        exc,
        traceback.format_exc(),
    )

    return Response(
        {
            "error": "Internal server error",
            "details": str(exc) if _is_debug() else "An unexpected error occurred.",
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _format_drf_error(exc, response) -> dict:
    """Convert DRF exception data to the standard error envelope."""
    if isinstance(exc, ValidationError):
        return {
            "error": "Validation error",
            "details": response.data,
        }
    if isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
        return {
            "error": "Authentication required",
            "details": str(exc.detail),
        }
    if isinstance(exc, PermissionDenied):
        return {
            "error": "Permission denied",
            "details": str(exc.detail),
        }
    if isinstance(exc, Throttled):
        return {
            "error": "Rate limit exceeded",
            "details": f"Request was throttled. Retry after {exc.wait} seconds.",
            "retry_after": int(exc.wait) if exc.wait else 60,
        }
    if isinstance(exc, Http404):
        return {
            "error": "Not found",
            "details": "The requested resource was not found.",
        }
    # Generic API exception
    return {
        "error": getattr(exc, "default_detail", "Error"),
        "details": str(exc.detail) if hasattr(exc, "detail") else str(exc),
    }


def _view_name(context) -> str:
    view = context.get("view")
    if view:
        return view.__class__.__name__
    return "unknown"


def _is_debug() -> bool:
    from django.conf import settings
    return getattr(settings, "DEBUG", False)
