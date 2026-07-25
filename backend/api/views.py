"""
API Views for AI Search Engine.

Endpoints:
    POST   /api/query/               – Execute a search query
    POST   /api/stream-query/        – SSE streaming search query
    GET    /api/health/              – Health check
    POST   /api/similar-queries/     – Vector-similarity search
    GET    /api/history/             – List search history
    GET    /api/history/<id>/        – Single history entry
    DELETE /api/history/<id>/        – Delete history entry
    DELETE /api/history/clear/       – Clear all history
    GET    /api/bookmarks/           – List bookmarks
    POST   /api/bookmarks/           – Create bookmark
    DELETE /api/bookmarks/<id>/      – Remove bookmark
    POST   /api/export/              – Export results (JSON / Markdown / PDF)
    GET    /api/analytics/summary/   – Analytics summary
    GET    /api/analytics/trends/    – Trend data
    GET    /api/preferences/         – Get user preferences
    PUT    /api/preferences/         – Update user preferences
    POST   /api/auth/login/          – Login
    POST   /api/auth/refresh         – Token refresh
    POST   /api/users/register/      – Register
    GET    /api/users/me/            – Current user
    GET    /api/forms/               – List forms
    --- Collections (Collaboration) ---
    GET/POST  /api/collections/           – List / create
    GET/PUT/DELETE /api/collections/<id>/  – Detail / update / delete
    POST   /api/collections/<id>/add-query/       – Add query
    POST   /api/collections/<id>/add-collaborator/ – Add collaborator
    POST   /api/collections/<id>/comments/        – Add comment
    GET    /api/collections/shared/<token>/        – Access via share link
    --- Topic Alerts ---
    GET/POST /api/alerts/            – List / create
    GET/PUT/DELETE /api/alerts/<id>/ – Detail / update / delete
    POST   /api/alerts/<id>/check/   – Manually trigger alert check
    GET    /api/notifications/       – List notifications
    POST   /api/notifications/<id>/read/ – Mark read
    --- Fact Checking ---
    POST   /api/fact-check/          – Run fact check on a query
    GET    /api/fact-check/<query_id>/ – Get fact checks for query
    --- Plugins ---
    GET    /api/plugins/             – List available plugins
    GET    /api/plugins/installed/   – User's installed plugins
    POST   /api/plugins/install/     – Install a plugin
    DELETE /api/plugins/<id>/uninstall/ – Uninstall
    --- API Keys ---
    GET/POST /api/api-keys/          – List / create
    DELETE   /api/api-keys/<id>/     – Revoke
"""

import asyncio
import json
import logging
import time
from collections import Counter
from datetime import timedelta
from io import BytesIO

from django.contrib.auth.models import User
from django.db.models import Avg, Count, Q
from django.http import JsonResponse, StreamingHttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import (
    AlertNotification,
    APIKey,
    Bookmark,
    CollectionComment,
    FactCheck,
    Plugin,
    SearchCollection,
    SearchQuery,
    TopicAlert,
    TrendSnapshot,
    UserPlugin,
    UserPreference,
)
from .rag_pipeline import RAGPipeline
from .utils.api_keys import authenticate_api_key
from .utils.plugins import apply_plugins_to_options
from .utils.query_cache import build_cache_key, get_cached_result, set_cached_result
from .serializers import (
    AlertNotificationSerializer,
    AnalyticsSummarySerializer,
    APIKeyCreateSerializer,
    APIKeySerializer,
    BookmarkCreateSerializer,
    BookmarkSerializer,
    CollectionAddCollaboratorSerializer,
    CollectionAddQuerySerializer,
    CollectionCommentCreateSerializer,
    CollectionCommentSerializer,
    ExportRequestSerializer,
    FactCheckRequestSerializer,
    FactCheckSerializer,
    LoginSerializer,
    PluginInstallSerializer,
    PluginSerializer,
    QueryResponseSerializer,
    QuerySerializer,
    RegisterSerializer,
    SearchCollectionCreateSerializer,
    SearchCollectionSerializer,
    SearchHistoryListSerializer,
    SearchHistorySerializer,
    SimilarQuerySerializer,
    TopicAlertCreateSerializer,
    TopicAlertSerializer,
    TrendSnapshotSerializer,
    UserPluginSerializer,
    UserPreferenceSerializer,
    UserSerializer,
)

logger = logging.getLogger("api.views")

# Singleton pipeline – avoids re-initialising on every request
_rag_pipeline = None


def _get_pipeline() -> RAGPipeline:
    global _rag_pipeline  # noqa: PLW0603
    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline()
    return _rag_pipeline


def _get_session_key(request) -> str:
    """Stable session key for anonymous users."""
    if hasattr(request, "user") and request.user.is_authenticated:
        return ""
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key or ""


def _extract_tags(query: str) -> list:
    """Extract simple topic tags from a query string."""
    import re
    stop_words = {
        "what", "is", "are", "how", "does", "do", "the", "a", "an", "in",
        "of", "to", "and", "or", "for", "on", "with", "about", "can",
        "why", "when", "where", "which", "who", "it", "its", "this",
        "that", "be", "was", "were", "been", "has", "have", "had",
        "will", "would", "could", "should", "may", "might", "shall",
        "me", "my", "i", "you", "your", "we", "our", "they", "their",
        "explain", "tell", "please", "give", "show", "find", "get",
    }
    words = re.findall(r"\b[a-zA-Z]{3,}\b", query.lower())
    tags = []
    seen = set()
    for w in words:
        if w not in stop_words and w not in seen:
            seen.add(w)
            tags.append(w)
        if len(tags) >= 5:
            break
    return tags


# ===================================================================
# Search
# ===================================================================


@extend_schema(tags=["Search"])
@method_decorator(csrf_exempt, name="dispatch")
class QueryView(APIView):
    """Execute a search query through the RAG pipeline."""

    permission_classes = [AllowAny]

    @extend_schema(request=QuerySerializer, responses={200: QueryResponseSerializer})
    def post(self, request):
        api_key, key_error = authenticate_api_key(request)
        if key_error:
            return Response(
                {"error": key_error, "retry_after": 86400},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = QuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        query = serializer.validated_data["query"]
        search_mode = serializer.validated_data.get("search_mode", "text")
        max_sources = serializer.validated_data.get("max_sources", 10)
        source_types = serializer.validated_data.get("source_types") or []
        enable_fact_check = serializer.validated_data.get("enable_fact_check", False)
        conversation_history = serializer.validated_data.get("conversation_history") or []
        enable_followups = True
        start = time.time()

        # Merge authenticated user preferences when the client omitted overrides
        user = request.user if request.user.is_authenticated else None
        if api_key and not user:
            user = api_key.user
        if user and user.is_authenticated:
            prefs, _ = UserPreference.objects.get_or_create(user=user)
            if "search_mode" not in request.data:
                search_mode = prefs.default_search_mode or search_mode
            if "max_sources" not in request.data:
                max_sources = prefs.default_max_sources or max_sources
            if "source_types" not in request.data and prefs.preferred_source_types:
                source_types = list(prefs.preferred_source_types)
            if "enable_fact_check" not in request.data:
                enable_fact_check = bool(prefs.enable_fact_checking)
            enable_followups = bool(prefs.enable_auto_followups)

        plugin_opts = apply_plugins_to_options(
            user=user,
            search_mode=search_mode,
            source_types=source_types,
            max_sources=max_sources,
            enable_fact_check=enable_fact_check,
        )
        search_mode = plugin_opts["search_mode"]
        source_types = plugin_opts["source_types"]
        max_sources = plugin_opts["max_sources"]
        enable_fact_check = plugin_opts["enable_fact_check"]
        dedupe_citations = plugin_opts["dedupe_citations"]
        active_plugins = plugin_opts["active_plugins"]

        cache_key = build_cache_key(
            query=query,
            search_mode=search_mode,
            max_sources=max_sources,
            source_types=source_types,
            enable_fact_check=enable_fact_check,
            conversation_history=conversation_history,
            plugins=active_plugins,
        )
        cached = get_cached_result(cache_key)

        try:
            pipeline = _get_pipeline()

            if cached:
                result = dict(cached)
                fact_check_result = result.get("fact_check_result") or {}
                result["cached"] = True
                elapsed_ms = int((time.time() - start) * 1000)
            else:

                async def _run():
                    result = await pipeline.process_query(
                        query,
                        search_mode=search_mode,
                        max_sources=max_sources,
                        source_types=source_types,
                        enable_followups=enable_followups,
                        conversation_history=conversation_history,
                        dedupe_citations=dedupe_citations,
                    )
                    fact_check_result = {}
                    if enable_fact_check:
                        fact_check_result = await pipeline.fact_check_answer(
                            query, result.get("answer", ""), result.get("sources", [])
                        )
                    return result, fact_check_result

                result, fact_check_result = asyncio.run(_run())
                result["fact_check_result"] = fact_check_result
                result["cached"] = False
                set_cached_result(cache_key, result)
                elapsed_ms = int((time.time() - start) * 1000)

            tags = _extract_tags(query)

            sq = SearchQuery.objects.create(
                query=query,
                answer=result.get("answer", ""),
                trust_score=result.get("trust_score", 0),
                sources=result.get("sources", []),
                followups=result.get("followups", []),
                model_used=result.get("model_used", ""),
                response_time_ms=elapsed_ms,
                search_mode=search_mode,
                tags=tags,
                user=user if user and user.is_authenticated else None,
                session_key=_get_session_key(request),
                fact_checked=bool(fact_check_result),
                fact_check_result=fact_check_result or {},
            )

            result["query_id"] = str(sq.id)
            result["response_time_ms"] = elapsed_ms
            result["search_mode"] = search_mode
            result["tags"] = tags
            result["fact_check_result"] = fact_check_result
            result["degraded"] = bool(result.get("degraded", False))
            result["degraded_reason"] = result.get("degraded_reason")
            result["active_plugins"] = active_plugins

            response_serializer = QueryResponseSerializer(data=result)
            if response_serializer.is_valid():
                logger.info(
                    "Query processed in %dms%s: %s",
                    elapsed_ms,
                    " (cached)" if result.get("cached") else "",
                    query[:80],
                )
                response = Response(response_serializer.data, status=status.HTTP_200_OK)
                if api_key:
                    response["X-RateLimit-Limit"] = str(api_key.daily_limit)
                    response["X-RateLimit-Remaining"] = str(api_key.remaining_today)
                if result.get("cached"):
                    response["X-Cache"] = "HIT"
                else:
                    response["X-Cache"] = "MISS"
                return response

            return Response(
                {"error": "Invalid response format", "details": response_serializer.errors},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as exc:
            logger.exception("Query processing failed: %s", query[:80])
            return Response(
                {"error": f"Query processing failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@extend_schema(tags=["Search"])
@method_decorator(csrf_exempt, name="dispatch")
class StreamQueryView(View):
    """SSE streaming version of QueryView."""

    async def post(self, request):
        from asgiref.sync import sync_to_async
        from .utils.sanitizer import sanitize_query

        api_key, key_error = await sync_to_async(authenticate_api_key)(request)
        if key_error:
            return JsonResponse(
                {"error": key_error, "retry_after": 86400},
                status=429,
            )

        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, TypeError):
            return JsonResponse({"error": "Invalid JSON body"}, status=400)

        query = sanitize_query(body.get("query", ""))
        if not query:
            return JsonResponse({"error": "Query is required"}, status=400)

        search_mode = body.get("search_mode", "text")
        max_sources = int(body.get("max_sources", 10) or 10)
        source_types = body.get("source_types") or []
        enable_followups = body.get("enable_followups", True)
        enable_fact_check = bool(body.get("enable_fact_check", False))
        raw_history = body.get("conversation_history") or []
        conversation_history = []
        for turn in raw_history[-6:]:
            if isinstance(turn, dict):
                role = turn.get("role")
                content = (turn.get("content") or "").strip()
                if role in ("user", "assistant") and content:
                    conversation_history.append({"role": role, "content": content[:2000]})

        def _resolve_user_and_plugins():
            user = None
            if api_key:
                user = api_key.user
            elif hasattr(request, "user") and getattr(request.user, "is_authenticated", False):
                user = request.user
            opts = apply_plugins_to_options(
                user=user,
                search_mode=search_mode,
                source_types=source_types,
                max_sources=max_sources,
                enable_fact_check=enable_fact_check,
            )
            return user, opts

        user, plugin_opts = await sync_to_async(_resolve_user_and_plugins)()
        search_mode = plugin_opts["search_mode"]
        source_types = plugin_opts["source_types"]
        max_sources = plugin_opts["max_sources"]
        dedupe_citations = plugin_opts["dedupe_citations"]
        active_plugins = plugin_opts["active_plugins"]

        start = time.time()
        pipeline = _get_pipeline()

        async def event_stream():
            full_answer = ""
            sources = []
            trust_score = 0
            followups = []
            degraded = False
            degraded_reason = None
            try:
                async for event in pipeline.process_query_stream(
                    query,
                    search_mode=search_mode,
                    max_sources=max_sources,
                    source_types=source_types,
                    enable_followups=bool(enable_followups),
                    conversation_history=conversation_history,
                    dedupe_citations=dedupe_citations,
                ):
                    etype = event.get("type")
                    data = event.get("data")
                    if etype == "sources":
                        sources = data or []
                    elif etype == "answer_chunk":
                        full_answer += data or ""
                    elif etype == "metadata" and isinstance(data, dict):
                        trust_score = data.get("trust_score", 0)
                        followups = data.get("followups") or []
                        degraded = bool(data.get("degraded", False))
                        degraded_reason = data.get("degraded_reason")
                    yield f"data: {json.dumps(event)}\n\n"

                elapsed_ms = int((time.time() - start) * 1000)
                tags = _extract_tags(query)

                def _persist():
                    return SearchQuery.objects.create(
                        query=query,
                        answer=full_answer,
                        trust_score=trust_score,
                        sources=sources,
                        followups=followups,
                        response_time_ms=elapsed_ms,
                        search_mode=search_mode,
                        tags=tags,
                        user=user,
                        session_key=request.COOKIES.get("sessionid", "")[:40],
                    )

                sq = await sync_to_async(_persist)()
                yield (
                    "data: "
                    + json.dumps(
                        {
                            "type": "done",
                            "data": {
                                "query_id": str(sq.id),
                                "response_time_ms": elapsed_ms,
                                "search_mode": search_mode,
                                "tags": tags,
                                "trust_score": trust_score,
                                "followups": followups,
                                "sources": sources,
                                "degraded": degraded,
                                "degraded_reason": degraded_reason,
                                "active_plugins": active_plugins,
                            },
                        }
                    )
                    + "\n\n"
                )
            except Exception as exc:
                logger.exception("Stream query error")
                yield f'data: {json.dumps({"type": "error", "data": str(exc)})}\n\n'

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


@extend_schema(tags=["Search"])
class SimilarQueriesView(APIView):
    """Retrieve similar past queries via vector similarity."""

    permission_classes = [AllowAny]

    @extend_schema(request=SimilarQuerySerializer)
    def post(self, request):
        serializer = SimilarQuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        query = serializer.validated_data["query"]
        k = serializer.validated_data.get("k", 3)

        try:
            pipeline = _get_pipeline()
            similar = pipeline.get_similar_queries(query, k=k)
            return Response({"similar_queries": similar}, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Similar queries failed")
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===================================================================
# Health
# ===================================================================


@extend_schema(tags=["Health"])
class HealthCheckView(APIView):
    """System health check."""

    permission_classes = [AllowAny]

    def get(self, request):
        pipeline = _get_pipeline()
        return Response(
            {
                "status": "healthy",
                "service": "AI Search Engine API",
                "version": "2.0.0",
                "components": {
                    "llm": pipeline.llm is not None,
                    "embeddings": pipeline.embeddings is not None,
                    "vector_store": pipeline.vector_store is not None,
                },
            },
            status=status.HTTP_200_OK,
        )


# ===================================================================
# Search History
# ===================================================================


@extend_schema(tags=["History"])
class SearchHistoryListView(APIView):
    """List and clear search history."""

    permission_classes = [AllowAny]

    @extend_schema(
        parameters=[
            OpenApiParameter("page", int, description="Page number"),
            OpenApiParameter("search", str, description="Filter by query text"),
        ],
        responses={200: SearchHistoryListSerializer(many=True)},
    )
    def get(self, request):
        qs = self._get_queryset(request)
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(query__icontains=search)

        # Simple pagination
        page = int(request.query_params.get("page", 1))
        page_size = 20
        start = (page - 1) * page_size
        end = start + page_size
        items = qs[start:end]
        total = qs.count()

        serializer = SearchHistoryListSerializer(items, many=True)
        return Response({
            "results": serializer.data,
            "count": total,
            "page": page,
            "page_size": page_size,
        })

    def _get_queryset(self, request):
        if request.user.is_authenticated:
            return SearchQuery.objects.filter(user=request.user)
        session_key = _get_session_key(request)
        return SearchQuery.objects.filter(session_key=session_key)


@extend_schema(tags=["History"])
class SearchHistoryDetailView(APIView):
    """Retrieve or delete a single history entry."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        entry = self._get_entry(request, pk)
        if entry is None:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = SearchHistorySerializer(entry)
        return Response(serializer.data)

    def delete(self, request, pk):
        entry = self._get_entry(request, pk)
        if entry is None:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _get_entry(self, request, pk):
        try:
            qs = SearchQuery.objects.all()
            if request.user.is_authenticated:
                qs = qs.filter(user=request.user)
            else:
                qs = qs.filter(session_key=_get_session_key(request))
            return qs.get(pk=pk)
        except SearchQuery.DoesNotExist:
            return None


@extend_schema(tags=["History"])
class SearchHistoryClearView(APIView):
    """Clear all search history."""

    permission_classes = [AllowAny]

    def delete(self, request):
        if request.user.is_authenticated:
            count, _ = SearchQuery.objects.filter(user=request.user).delete()
        else:
            count, _ = SearchQuery.objects.filter(
                session_key=_get_session_key(request)
            ).delete()
        return Response({"deleted": count}, status=status.HTTP_200_OK)


# ===================================================================
# Bookmarks
# ===================================================================


@extend_schema(tags=["Bookmarks"])
class BookmarkListCreateView(APIView):
    """List bookmarks or create a new one."""

    permission_classes = [AllowAny]

    def get(self, request):
        qs = self._get_queryset(request)
        serializer = BookmarkSerializer(qs, many=True)
        return Response(serializer.data)

    @extend_schema(request=BookmarkCreateSerializer, responses={201: BookmarkSerializer})
    def post(self, request):
        serializer = BookmarkCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            sq = SearchQuery.objects.get(pk=serializer.validated_data["search_query_id"])
        except SearchQuery.DoesNotExist:
            return Response({"error": "Search query not found"}, status=status.HTTP_404_NOT_FOUND)

        bookmark, created = Bookmark.objects.get_or_create(
            search_query=sq,
            user=request.user if request.user.is_authenticated else None,
            session_key=_get_session_key(request) if not request.user.is_authenticated else "",
            defaults={"note": serializer.validated_data.get("note", "")},
        )
        out = BookmarkSerializer(bookmark)
        return Response(out.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def _get_queryset(self, request):
        if request.user.is_authenticated:
            return Bookmark.objects.filter(user=request.user).select_related("search_query")
        return Bookmark.objects.filter(
            session_key=_get_session_key(request)
        ).select_related("search_query")


@extend_schema(tags=["Bookmarks"])
class BookmarkDeleteView(APIView):
    """Delete a bookmark by ID."""

    permission_classes = [AllowAny]

    def delete(self, request, pk):
        try:
            qs = Bookmark.objects.all()
            if request.user.is_authenticated:
                qs = qs.filter(user=request.user)
            else:
                qs = qs.filter(session_key=_get_session_key(request))
            bookmark = qs.get(pk=pk)
        except Bookmark.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        bookmark.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ===================================================================
# Export
# ===================================================================


@extend_schema(tags=["Export"])
@method_decorator(csrf_exempt, name="dispatch")
class ExportView(APIView):
    """Export search history in JSON, Markdown, or PDF."""

    permission_classes = [AllowAny]

    @extend_schema(request=ExportRequestSerializer)
    def post(self, request):
        serializer = ExportRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        fmt = serializer.validated_data["format"]
        query_ids = serializer.validated_data.get("query_ids", [])
        include_sources = serializer.validated_data.get("include_sources", True)

        if request.user.is_authenticated:
            qs = SearchQuery.objects.filter(user=request.user)
        else:
            qs = SearchQuery.objects.filter(session_key=_get_session_key(request))

        if query_ids:
            qs = qs.filter(pk__in=query_ids)

        entries = list(qs.order_by("-created_at")[:100])

        if not entries:
            return Response({"error": "No data to export"}, status=status.HTTP_404_NOT_FOUND)

        if fmt == "json":
            return self._export_json(entries, include_sources)
        if fmt == "markdown":
            return self._export_markdown(entries, include_sources)
        if fmt == "pdf":
            return self._export_pdf(entries, include_sources)

        return Response({"error": "Unsupported format"}, status=status.HTTP_400_BAD_REQUEST)

    # ---- Format handlers ----

    def _export_json(self, entries, include_sources):
        data = []
        for e in entries:
            item = {
                "id": str(e.id),
                "query": e.query,
                "answer": e.answer,
                "trust_score": e.trust_score,
                "followups": e.followups,
                "created_at": e.created_at.isoformat(),
            }
            if include_sources:
                item["sources"] = e.sources
            data.append(item)

        response = JsonResponse(data, safe=False, json_dumps_params={"indent": 2})
        response["Content-Disposition"] = 'attachment; filename="search_export.json"'
        return response

    def _export_markdown(self, entries, include_sources):
        lines = ["# Search History Export\n"]
        lines.append(f"*Exported on {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}*\n\n---\n")

        for i, e in enumerate(entries, 1):
            lines.append(f"## {i}. {e.query}\n")
            lines.append(f"**Trust Score:** {e.trust_score}/100  ")
            lines.append(f"**Date:** {e.created_at.strftime('%Y-%m-%d %H:%M')}\n")
            lines.append(f"\n{e.answer}\n")

            if include_sources and e.sources:
                lines.append("\n### Sources\n")
                for j, src in enumerate(e.sources, 1):
                    title = src.get("title", "Untitled")
                    url = src.get("url", "")
                    lines.append(f"{j}. [{title}]({url})")
                lines.append("")

            if e.followups:
                lines.append("\n### Follow-up Questions\n")
                for fq in e.followups:
                    lines.append(f"- {fq}")
                lines.append("")

            lines.append("\n---\n")

        content = "\n".join(lines)
        response = StreamingHttpResponse(
            iter([content.encode("utf-8")]),
            content_type="text/markdown; charset=utf-8",
        )
        response["Content-Disposition"] = 'attachment; filename="search_export.md"'
        return response

    def _export_pdf(self, entries, include_sources):
        """Generate a proper PDF export using reportlab."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
            from reportlab.lib.units import mm
            from reportlab.platypus import (
                Paragraph,
                SimpleDocTemplate,
                Spacer,
            )
        except ImportError:
            # Fallback: return markdown when reportlab not installed
            logger.warning("reportlab not installed – falling back to markdown export")
            return self._export_markdown(entries, include_sources)

        buf = BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("CustomTitle", parent=styles["Heading1"], fontSize=18, spaceAfter=12)
        heading_style = ParagraphStyle("CustomH2", parent=styles["Heading2"], fontSize=13, spaceAfter=8)
        body_style = ParagraphStyle("CustomBody", parent=styles["BodyText"], fontSize=10, leading=14)

        story = []
        story.append(Paragraph("Search History Export", title_style))
        story.append(Paragraph(f"Exported: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}", body_style))
        story.append(Spacer(1, 12))

        for i, e in enumerate(entries, 1):
            story.append(Paragraph(f"{i}. {e.query}", heading_style))
            story.append(Paragraph(f"<b>Trust Score:</b> {e.trust_score}/100 | <b>Date:</b> {e.created_at.strftime('%Y-%m-%d %H:%M')}", body_style))
            story.append(Spacer(1, 6))

            # Truncate very long answers for PDF
            answer_text = e.answer[:3000].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(answer_text, body_style))
            story.append(Spacer(1, 8))

            if include_sources and e.sources:
                story.append(Paragraph("<b>Sources:</b>", body_style))
                for j, src in enumerate(e.sources[:5], 1):
                    title = src.get("title", "Untitled")
                    url = src.get("url", "")
                    story.append(Paragraph(f'{j}. <a href="{url}">{title}</a>', body_style))
                story.append(Spacer(1, 6))

            story.append(Spacer(1, 12))

        doc.build(story)
        buf.seek(0)

        response = StreamingHttpResponse(buf, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="search_export.pdf"'
        return response


# ===================================================================
# Analytics
# ===================================================================


@extend_schema(tags=["Analytics"])
class AnalyticsSummaryView(APIView):
    """Aggregated analytics summary for the current user."""

    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            qs = SearchQuery.objects.filter(user=request.user)
            bookmark_count = Bookmark.objects.filter(user=request.user).count()
        else:
            session_key = _get_session_key(request)
            qs = SearchQuery.objects.filter(session_key=session_key)
            bookmark_count = Bookmark.objects.filter(session_key=session_key).count()

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)

        agg = qs.aggregate(
            avg_trust=Avg("trust_score"),
            avg_response=Avg("response_time_ms"),
        )

        # Top queries (most recent, deduplicated)
        recent = qs.order_by("-created_at").values_list("query", flat=True)[:50]
        query_counts = {}
        for q in recent:
            query_counts[q] = query_counts.get(q, 0) + 1
        top_queries = [
            {"query": q, "count": c}
            for q, c in sorted(query_counts.items(), key=lambda x: -x[1])[:10]
        ]

        # Search mode distribution
        mode_dist = dict(
            qs.values_list("search_mode")
            .annotate(cnt=Count("id"))
            .values_list("search_mode", "cnt")
        )

        # Daily volume for last 14 days
        fourteen_days_ago = today_start - timedelta(days=14)
        daily_qs = (
            qs.filter(created_at__gte=fourteen_days_ago)
            .extra(select={"day": "date(created_at)"})
            .values("day")
            .annotate(count=Count("id"), avg_trust=Avg("trust_score"))
            .order_by("day")
        )
        daily_volume = [
            {"date": str(d["day"]), "count": d["count"], "avg_trust": round(d["avg_trust"] or 0, 1)}
            for d in daily_qs
        ]

        # Top domains from sources
        domain_counter = Counter()
        for sources in qs.order_by("-created_at").values_list("sources", flat=True)[:100]:
            if isinstance(sources, list):
                for s in sources:
                    domain = s.get("domain", "") or ""
                    if domain:
                        domain_counter[domain] += 1
        top_domains = [
            {"domain": d, "count": c}
            for d, c in domain_counter.most_common(10)
        ]

        # Average sources per query
        source_counts = [
            len(s) for s in qs.order_by("-created_at").values_list("sources", flat=True)[:100]
            if isinstance(s, list)
        ]
        avg_sources = round(sum(source_counts) / max(len(source_counts), 1), 1)

        # Fact check count
        fact_check_count = qs.filter(fact_checked=True).count()

        data = {
            "total_queries": qs.count(),
            "total_bookmarks": bookmark_count,
            "avg_trust_score": round(agg["avg_trust"] or 0, 1),
            "avg_response_time_ms": round(agg["avg_response"] or 0, 1),
            "queries_today": qs.filter(created_at__gte=today_start).count(),
            "queries_this_week": qs.filter(created_at__gte=week_start).count(),
            "top_queries": top_queries,
            "search_mode_distribution": mode_dist,
            "daily_volume": daily_volume,
            "top_domains": top_domains,
            "avg_sources_per_query": avg_sources,
            "fact_check_count": fact_check_count,
        }

        serializer = AnalyticsSummarySerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


# ===================================================================
# User Preferences
# ===================================================================


@extend_schema(tags=["Search"])
class UserPreferenceView(APIView):
    """Get or update user preferences."""

    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response(UserPreferenceSerializer(UserPreference()).data)
        prefs, _ = UserPreference.objects.get_or_create(user=request.user)
        return Response(UserPreferenceSerializer(prefs).data)

    @extend_schema(request=UserPreferenceSerializer)
    def put(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required to save preferences"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        prefs, _ = UserPreference.objects.get_or_create(user=request.user)
        serializer = UserPreferenceSerializer(prefs, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ===================================================================
# Authentication
# ===================================================================


@extend_schema(tags=["Auth"])
class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=LoginSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Auth"])
class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=RegisterSerializer)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response(
                {
                    "user": UserSerializer(user).data,
                    "tokens": {
                        "access": str(refresh.access_token),
                        "refresh": str(refresh),
                    },
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(tags=["Auth"])
class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


@extend_schema(tags=["Auth"])
class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            })
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)


# ===================================================================
# Trends
# ===================================================================


@extend_schema(tags=["Analytics"])
class TrendListView(APIView):
    """List trend snapshots."""

    permission_classes = [AllowAny]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        cutoff = timezone.now() - timedelta(days=days)
        trends = TrendSnapshot.objects.filter(date__gte=cutoff)
        serializer = TrendSnapshotSerializer(trends, many=True)
        return Response(serializer.data)


# ===================================================================
# Collections / Collaboration
# ===================================================================


@extend_schema(tags=["Collections"])
class CollectionListCreateView(APIView):
    """List and create search collections."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        owned = SearchCollection.objects.filter(owner=request.user)
        shared = SearchCollection.objects.filter(collaborators=request.user)
        qs = (owned | shared).distinct().prefetch_related("queries", "collaborators", "comments")
        serializer = SearchCollectionSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @extend_schema(request=SearchCollectionCreateSerializer)
    def post(self, request):
        serializer = SearchCollectionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        collection = SearchCollection.objects.create(
            name=serializer.validated_data["name"],
            description=serializer.validated_data.get("description", ""),
            is_public=serializer.validated_data.get("is_public", False),
            owner=request.user,
        )
        out = SearchCollectionSerializer(collection, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Collections"])
class CollectionDetailView(APIView):
    """Retrieve, update, or delete a collection."""

    permission_classes = [IsAuthenticated]

    def _get_collection(self, request, pk):
        try:
            return SearchCollection.objects.prefetch_related(
                "queries", "collaborators", "comments"
            ).get(pk=pk, owner=request.user)
        except SearchCollection.DoesNotExist:
            # Check if collaborator
            try:
                return SearchCollection.objects.prefetch_related(
                    "queries", "collaborators", "comments"
                ).get(pk=pk, collaborators=request.user)
            except SearchCollection.DoesNotExist:
                return None

    def get(self, request, pk):
        collection = self._get_collection(request, pk)
        if not collection:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = SearchCollectionSerializer(collection, context={"request": request})
        return Response(serializer.data)

    def put(self, request, pk):
        collection = self._get_collection(request, pk)
        if not collection or collection.owner != request.user:
            return Response({"error": "Not found or not owner"}, status=status.HTTP_404_NOT_FOUND)
        for field in ("name", "description", "is_public"):
            if field in request.data:
                setattr(collection, field, request.data[field])
        collection.save()
        serializer = SearchCollectionSerializer(collection, context={"request": request})
        return Response(serializer.data)

    def delete(self, request, pk):
        collection = self._get_collection(request, pk)
        if not collection or collection.owner != request.user:
            return Response({"error": "Not found or not owner"}, status=status.HTTP_404_NOT_FOUND)
        collection.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Collections"])
class CollectionAddQueryView(APIView):
    """Add a search query to a collection."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=CollectionAddQuerySerializer)
    def post(self, request, pk):
        try:
            collection = SearchCollection.objects.get(
                Q(pk=pk) & (Q(owner=request.user) | Q(collaborators=request.user))
            )
        except SearchCollection.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = CollectionAddQuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            sq = SearchQuery.objects.get(pk=serializer.validated_data["query_id"])
        except SearchQuery.DoesNotExist:
            return Response({"error": "Query not found"}, status=status.HTTP_404_NOT_FOUND)

        collection.queries.add(sq)
        return Response({"status": "added"}, status=status.HTTP_200_OK)


@extend_schema(tags=["Collections"])
class CollectionAddCollaboratorView(APIView):
    """Add a collaborator to a collection."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=CollectionAddCollaboratorSerializer)
    def post(self, request, pk):
        try:
            collection = SearchCollection.objects.get(pk=pk, owner=request.user)
        except SearchCollection.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = CollectionAddCollaboratorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=serializer.validated_data["username"])
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        collection.collaborators.add(user)
        return Response({"status": "added"}, status=status.HTTP_200_OK)


@extend_schema(tags=["Collections"])
class CollectionCommentView(APIView):
    """Add a comment to a collection."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=CollectionCommentCreateSerializer)
    def post(self, request, pk):
        try:
            collection = SearchCollection.objects.get(
                Q(pk=pk) & (Q(owner=request.user) | Q(collaborators=request.user))
            )
        except SearchCollection.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = CollectionCommentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        search_query = None
        if "search_query_id" in serializer.validated_data:
            try:
                search_query = SearchQuery.objects.get(
                    pk=serializer.validated_data["search_query_id"]
                )
            except SearchQuery.DoesNotExist:
                pass

        comment = CollectionComment.objects.create(
            collection=collection,
            search_query=search_query,
            user=request.user,
            content=serializer.validated_data["content"],
        )
        out = CollectionCommentSerializer(comment)
        return Response(out.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Collections"])
class CollectionSharedView(APIView):
    """Access a collection via public share token (no auth required)."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            collection = SearchCollection.objects.prefetch_related(
                "queries", "comments"
            ).get(share_token=token, is_public=True)
        except SearchCollection.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = SearchCollectionSerializer(collection, context={"request": request})
        return Response(serializer.data)


# ===================================================================
# Topic Alerts
# ===================================================================


@extend_schema(tags=["Alerts"])
class TopicAlertListCreateView(APIView):
    """List and create topic alerts."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        alerts = TopicAlert.objects.filter(user=request.user).prefetch_related("notifications")
        serializer = TopicAlertSerializer(alerts, many=True)
        return Response(serializer.data)

    @extend_schema(request=TopicAlertCreateSerializer)
    def post(self, request):
        serializer = TopicAlertCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        alert = TopicAlert.objects.create(
            user=request.user,
            topic=serializer.validated_data["topic"],
            keywords=serializer.validated_data.get("keywords", []),
            frequency=serializer.validated_data.get("frequency", "daily"),
        )
        out = TopicAlertSerializer(alert)
        return Response(out.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Alerts"])
class TopicAlertDetailView(APIView):
    """Retrieve, update, or delete a topic alert."""

    permission_classes = [IsAuthenticated]

    def _get_alert(self, request, pk):
        try:
            return TopicAlert.objects.get(pk=pk, user=request.user)
        except TopicAlert.DoesNotExist:
            return None

    def get(self, request, pk):
        alert = self._get_alert(request, pk)
        if not alert:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(TopicAlertSerializer(alert).data)

    def put(self, request, pk):
        alert = self._get_alert(request, pk)
        if not alert:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        for field in ("topic", "keywords", "frequency", "is_active"):
            if field in request.data:
                setattr(alert, field, request.data[field])
        alert.save()
        return Response(TopicAlertSerializer(alert).data)

    def delete(self, request, pk):
        alert = self._get_alert(request, pk)
        if not alert:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        alert.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Alerts"])
class TopicAlertCheckView(APIView):
    """Manually trigger an alert check — runs search and creates notification."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            alert = TopicAlert.objects.get(pk=pk, user=request.user)
        except TopicAlert.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            pipeline = _get_pipeline()
            result = asyncio.run(pipeline.process_query(alert.topic, search_mode="news"))

            notification = AlertNotification.objects.create(
                alert=alert,
                title=f"Update: {alert.topic[:100]}",
                summary=result.get("answer", "")[:1000],
                sources=result.get("sources", [])[:5],
            )
            alert.last_checked = timezone.now()
            alert.notification_count += 1
            alert.last_results = result.get("sources", [])[:5]
            alert.save(update_fields=["last_checked", "notification_count", "last_results"])

            return Response(AlertNotificationSerializer(notification).data, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Alert check failed: %s", alert.topic[:60])
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(tags=["Alerts"])
class NotificationListView(APIView):
    """List all notifications for the current user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifs = AlertNotification.objects.filter(
            alert__user=request.user
        ).select_related("alert").order_by("-created_at")[:50]
        serializer = AlertNotificationSerializer(notifs, many=True)
        return Response(serializer.data)


@extend_schema(tags=["Alerts"])
class NotificationMarkReadView(APIView):
    """Mark a notification as read."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = AlertNotification.objects.get(pk=pk, alert__user=request.user)
        except AlertNotification.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"status": "read"})


# ===================================================================
# Fact Checking
# ===================================================================


@extend_schema(tags=["FactCheck"])
@method_decorator(csrf_exempt, name="dispatch")
class FactCheckView(APIView):
    """Run fact-check on an existing query."""

    permission_classes = [AllowAny]

    @extend_schema(request=FactCheckRequestSerializer)
    def post(self, request):
        serializer = FactCheckRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            sq = SearchQuery.objects.get(pk=serializer.validated_data["query_id"])
        except SearchQuery.DoesNotExist:
            return Response({"error": "Query not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            pipeline = _get_pipeline()
            fact_result = asyncio.run(
                pipeline.fact_check_answer(sq.query, sq.answer, sq.sources)
            )

            # Store individual claims
            claims = fact_result.get("claims", [])
            fact_checks = []
            for claim_data in claims:
                fc = FactCheck.objects.create(
                    search_query=sq,
                    claim=claim_data.get("claim", ""),
                    verdict=claim_data.get("verdict", "unverifiable"),
                    confidence=claim_data.get("confidence", 0.0),
                    explanation=claim_data.get("explanation", ""),
                    evidence_sources=claim_data.get("evidence_sources", []),
                )
                fact_checks.append(fc)

            sq.fact_checked = True
            sq.fact_check_result = fact_result
            sq.save(update_fields=["fact_checked", "fact_check_result"])

            return Response(FactCheckSerializer(fact_checks, many=True).data, status=status.HTTP_200_OK)
        except Exception as exc:
            logger.exception("Fact check failed")
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(tags=["FactCheck"])
class FactCheckResultView(APIView):
    """Get fact checks for a specific query."""

    permission_classes = [AllowAny]

    def get(self, request, query_id):
        checks = FactCheck.objects.filter(search_query_id=query_id)
        serializer = FactCheckSerializer(checks, many=True)
        return Response(serializer.data)


# ===================================================================
# Plugins
# ===================================================================


@extend_schema(tags=["Plugins"])
class PluginListView(APIView):
    """List all available plugins."""

    permission_classes = [AllowAny]

    def get(self, request):
        plugins = Plugin.objects.filter(is_active=True)
        serializer = PluginSerializer(plugins, many=True, context={"request": request})
        return Response(serializer.data)


@extend_schema(tags=["Plugins"])
class InstalledPluginListView(APIView):
    """List user's installed plugins."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_plugins = UserPlugin.objects.filter(user=request.user).select_related("plugin")
        serializer = UserPluginSerializer(user_plugins, many=True)
        return Response(serializer.data)


@extend_schema(tags=["Plugins"])
class PluginInstallView(APIView):
    """Install a plugin for the current user."""

    permission_classes = [IsAuthenticated]

    @extend_schema(request=PluginInstallSerializer)
    def post(self, request):
        serializer = PluginInstallSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            plugin = Plugin.objects.get(pk=serializer.validated_data["plugin_id"], is_active=True)
        except Plugin.DoesNotExist:
            return Response({"error": "Plugin not found"}, status=status.HTTP_404_NOT_FOUND)

        user_plugin, created = UserPlugin.objects.get_or_create(
            user=request.user,
            plugin=plugin,
            defaults={"config": serializer.validated_data.get("config", {})},
        )
        if not created:
            user_plugin.config = serializer.validated_data.get("config", user_plugin.config)
            user_plugin.is_enabled = True
            user_plugin.save()

        if created:
            plugin.install_count += 1
            plugin.save(update_fields=["install_count"])

        out = UserPluginSerializer(user_plugin)
        return Response(out.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@extend_schema(tags=["Plugins"])
class PluginUninstallView(APIView):
    """Uninstall a plugin."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            user_plugin = UserPlugin.objects.get(pk=pk, user=request.user)
        except UserPlugin.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        plugin = user_plugin.plugin
        user_plugin.delete()
        plugin.install_count = max(0, plugin.install_count - 1)
        plugin.save(update_fields=["install_count"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ===================================================================
# API Keys
# ===================================================================


@extend_schema(tags=["APIKeys"])
class APIKeyListCreateView(APIView):
    """List and create API keys."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        keys = APIKey.objects.filter(user=request.user)
        serializer = APIKeySerializer(keys, many=True)
        return Response(serializer.data)

    @extend_schema(request=APIKeyCreateSerializer)
    def post(self, request):
        serializer = APIKeyCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tier = serializer.validated_data.get("tier", "free")
        daily_limits = {"free": 100, "pro": 1000, "enterprise": 10000}

        key = APIKey(
            user=request.user,
            name=serializer.validated_data["name"],
            tier=tier,
            daily_limit=daily_limits.get(tier, 100),
        )
        key.save()

        out = APIKeySerializer(key)
        return Response(out.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["APIKeys"])
class APIKeyDeleteView(APIView):
    """Revoke an API key."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            key = APIKey.objects.get(pk=pk, user=request.user)
        except APIKey.DoesNotExist:
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        key.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
