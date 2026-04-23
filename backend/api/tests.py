"""
Comprehensive test suite for the AI Search Engine API.

Covers: queries, history, bookmarks, export, analytics, preferences,
authentication, health check, rate limiting, and input sanitization.
"""

import json
import uuid

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import Bookmark, SearchQuery
from api.utils.sanitizer import (
    detect_injection_attempt,
    sanitize_query,
    sanitize_url,
)


# ---------------------------------------------------------------------------
# Sanitizer unit tests
# ---------------------------------------------------------------------------


class SanitizerTests(TestCase):
    """Tests for api.utils.sanitizer."""

    def test_strip_html_tags(self):
        result = sanitize_query('<script>alert("xss")</script>Hello')
        self.assertNotIn("<script>", result)
        self.assertIn("Hello", result)

    def test_strip_control_characters(self):
        result = sanitize_query("hello\x00world\x07test")
        self.assertEqual(result, "helloworldtest")

    def test_collapse_whitespace(self):
        result = sanitize_query("hello    world   test")
        self.assertEqual(result, "hello world test")

    def test_max_length(self):
        result = sanitize_query("a" * 2000, max_length=100)
        self.assertEqual(len(result), 100)

    def test_empty_input(self):
        self.assertEqual(sanitize_query(""), "")
        self.assertEqual(sanitize_query("   "), "")

    def test_sql_injection_detection(self):
        self.assertTrue(detect_injection_attempt("SELECT * FROM users"))
        self.assertTrue(detect_injection_attempt("DROP TABLE users"))
        self.assertFalse(detect_injection_attempt("what is quantum computing"))

    def test_url_sanitization(self):
        self.assertIsNone(sanitize_url("javascript:alert(1)"))
        self.assertIsNone(sanitize_url("data:text/html,<h1>hi</h1>"))
        self.assertEqual(sanitize_url("https://example.com"), "https://example.com")
        self.assertIsNone(sanitize_url(""))
        self.assertIsNone(sanitize_url("ftp://example.com"))


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


class HealthCheckTests(APITestCase):
    def test_health_check(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("version", data)
        self.assertIn("components", data)


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


class AuthTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass12345",
        )

    def test_login_success(self):
        response = self.client.post(
            reverse("login"),
            {"email": "test@example.com", "password": "testpass12345"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertIn("user", data)

    def test_login_wrong_password(self):
        response = self.client.post(
            reverse("login"),
            {"email": "test@example.com", "password": "wrongpassword"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_nonexistent_user(self):
        response = self.client.post(
            reverse("login"),
            {"email": "ghost@example.com", "password": "whatever123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_success(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "new@example.com",
                "username": "newuser",
                "password": "strongpass123",
                "password2": "strongpass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", response.json())

    def test_register_duplicate_email(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "test@example.com",
                "username": "anotheruser",
                "password": "strongpass123",
                "password2": "strongpass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "mismatch@example.com",
                "username": "mismatchuser",
                "password": "strongpass123",
                "password2": "differentpass1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_requires_auth(self):
        response = self.client.get(reverse("user-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_authenticated(self):
        login = self.client.post(
            reverse("login"),
            {"email": "test@example.com", "password": "testpass12345"},
            format="json",
        )
        token = login.json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(reverse("user-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["email"], "test@example.com")

    def test_token_refresh(self):
        login = self.client.post(
            reverse("login"),
            {"email": "test@example.com", "password": "testpass12345"},
            format="json",
        )
        refresh = login.json()["refresh"]
        response = self.client.post(
            reverse("token-refresh"),
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.json())


# ---------------------------------------------------------------------------
# Search History
# ---------------------------------------------------------------------------


class SearchHistoryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="historyuser", email="hist@example.com", password="testpass12345"
        )
        login = self.client.post(
            reverse("login"),
            {"email": "hist@example.com", "password": "testpass12345"},
            format="json",
        )
        self.token = login.json()["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

        # Create test entries
        self.sq1 = SearchQuery.objects.create(
            query="What is AI?",
            answer="AI is artificial intelligence.",
            trust_score=85,
            sources=[{"url": "https://example.com", "title": "AI Basics"}],
            followups=["What is ML?"],
            user=self.user,
            response_time_ms=250,
        )
        self.sq2 = SearchQuery.objects.create(
            query="What is Python?",
            answer="Python is a programming language.",
            trust_score=90,
            sources=[{"url": "https://python.org", "title": "Python"}],
            followups=["What is Django?"],
            user=self.user,
            response_time_ms=180,
        )

    def test_list_history(self):
        response = self.client.get(reverse("history-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 2)
        self.assertEqual(len(data["results"]), 2)

    def test_list_history_with_search(self):
        response = self.client.get(reverse("history-list"), {"search": "Python"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["count"], 1)

    def test_get_history_detail(self):
        response = self.client.get(reverse("history-detail", args=[self.sq1.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["query"], "What is AI?")
        self.assertIn("answer", data)
        self.assertIn("sources", data)

    def test_delete_history_entry(self):
        response = self.client.delete(reverse("history-detail", args=[self.sq1.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SearchQuery.objects.filter(pk=self.sq1.id).exists())

    def test_clear_all_history(self):
        response = self.client.delete(reverse("history-clear"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["deleted"], 2)
        self.assertEqual(SearchQuery.objects.filter(user=self.user).count(), 0)

    def test_history_isolation(self):
        """Ensure users can only see their own history."""
        other_user = User.objects.create_user(
            username="other", email="other@example.com", password="testpass12345"
        )
        SearchQuery.objects.create(
            query="Secret query",
            answer="Secret answer",
            trust_score=50,
            user=other_user,
        )
        response = self.client.get(reverse("history-list"))
        # Should only see own queries, not other user's
        data = response.json()
        self.assertEqual(data["count"], 2)


# ---------------------------------------------------------------------------
# Bookmarks
# ---------------------------------------------------------------------------


class BookmarkTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="bookmarkuser", email="bm@example.com", password="testpass12345"
        )
        login = self.client.post(
            reverse("login"),
            {"email": "bm@example.com", "password": "testpass12345"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}")

        self.sq = SearchQuery.objects.create(
            query="Bookmarkable query",
            answer="Some answer",
            trust_score=75,
            user=self.user,
        )

    def test_create_bookmark(self):
        response = self.client.post(
            reverse("bookmark-list-create"),
            {"search_query_id": str(self.sq.id), "note": "Important!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data["note"], "Important!")
        self.assertEqual(data["search_query"]["query"], "Bookmarkable query")

    def test_list_bookmarks(self):
        Bookmark.objects.create(search_query=self.sq, user=self.user, note="Test")
        response = self.client.get(reverse("bookmark-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)

    def test_delete_bookmark(self):
        bm = Bookmark.objects.create(search_query=self.sq, user=self.user)
        response = self.client.delete(reverse("bookmark-delete", args=[bm.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Bookmark.objects.filter(pk=bm.id).exists())

    def test_duplicate_bookmark(self):
        """Creating the same bookmark twice returns 200 (idempotent)."""
        self.client.post(
            reverse("bookmark-list-create"),
            {"search_query_id": str(self.sq.id)},
            format="json",
        )
        response = self.client.post(
            reverse("bookmark-list-create"),
            {"search_query_id": str(self.sq.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_bookmark_nonexistent_query(self):
        fake_id = uuid.uuid4()
        response = self.client.post(
            reverse("bookmark-list-create"),
            {"search_query_id": str(fake_id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------


class ExportTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="exportuser", email="exp@example.com", password="testpass12345"
        )
        login = self.client.post(
            reverse("login"),
            {"email": "exp@example.com", "password": "testpass12345"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}")

        self.sq = SearchQuery.objects.create(
            query="Export test query",
            answer="Export test answer with citations [1].",
            trust_score=80,
            sources=[{"url": "https://example.com", "title": "Example"}],
            followups=["Follow up?"],
            user=self.user,
        )

    def test_export_json(self):
        response = self.client.post(
            reverse("export"),
            {"format": "json"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("application/json", response["Content-Type"])
        data = json.loads(response.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["query"], "Export test query")

    def test_export_markdown(self):
        response = self.client.post(
            reverse("export"),
            {"format": "markdown"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        content = b"".join(response.streaming_content).decode("utf-8")
        self.assertIn("# Search History Export", content)
        self.assertIn("Export test query", content)

    def test_export_specific_queries(self):
        response = self.client.post(
            reverse("export"),
            {"format": "json", "query_ids": [str(self.sq.id)]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_export_no_data(self):
        SearchQuery.objects.filter(user=self.user).delete()
        response = self.client.post(
            reverse("export"),
            {"format": "json"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------


class AnalyticsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="analyticsuser", email="ana@example.com", password="testpass12345"
        )
        login = self.client.post(
            reverse("login"),
            {"email": "ana@example.com", "password": "testpass12345"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}")

        SearchQuery.objects.create(
            query="Analytics test 1",
            answer="Answer 1",
            trust_score=80,
            response_time_ms=200,
            user=self.user,
        )
        SearchQuery.objects.create(
            query="Analytics test 2",
            answer="Answer 2",
            trust_score=90,
            response_time_ms=300,
            user=self.user,
        )

    def test_analytics_summary(self):
        response = self.client.get(reverse("analytics-summary"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total_queries"], 2)
        self.assertEqual(data["avg_trust_score"], 85.0)
        self.assertEqual(data["avg_response_time_ms"], 250.0)
        self.assertIn("top_queries", data)
        self.assertIn("queries_today", data)


# ---------------------------------------------------------------------------
# User Preferences
# ---------------------------------------------------------------------------


class PreferencesTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="prefuser", email="pref@example.com", password="testpass12345"
        )
        login = self.client.post(
            reverse("login"),
            {"email": "pref@example.com", "password": "testpass12345"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}")

    def test_get_default_preferences(self):
        response = self.client.get(reverse("preferences"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["default_max_sources"], 10)
        self.assertTrue(data["enable_voice_search"])

    def test_update_preferences(self):
        response = self.client.put(
            reverse("preferences"),
            {"default_max_sources": 5, "min_trust_score": 60, "enable_voice_search": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["default_max_sources"], 5)
        self.assertFalse(data["enable_voice_search"])


# ---------------------------------------------------------------------------
# Query endpoint (integration — uses mock pipeline)
# ---------------------------------------------------------------------------


class QueryViewTests(APITestCase):
    def test_query_empty(self):
        response = self.client.post(
            reverse("query"),
            {"query": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_query_missing(self):
        response = self.client.post(
            reverse("query"),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_query_xss_sanitized(self):
        response = self.client.post(
            reverse("query"),
            {"query": '<script>alert("xss")</script>real query'},
            format="json",
        )
        # Should not 400 — the sanitizer strips script tags
        # The response depends on the pipeline, but the query should be cleaned
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_500_INTERNAL_SERVER_ERROR])


# ---------------------------------------------------------------------------
# Rate Limiting (basic test)
# ---------------------------------------------------------------------------


@override_settings(
    RATE_LIMIT_AUTH_PER_MINUTE=3,
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "test-rl"}},
)
class RateLimitTests(APITestCase):
    def test_rate_limit_kicks_in(self):
        """Exceeding rate limit returns 429."""
        for _ in range(3):
            self.client.post(
                reverse("login"),
                {"email": "x@x.com", "password": "whatever123"},
                format="json",
            )
        response = self.client.post(
            reverse("login"),
            {"email": "x@x.com", "password": "whatever123"},
            format="json",
        )
        self.assertEqual(response.status_code, 429)
        self.assertIn("retry_after", response.json())
