"""
Data models for the AI Search Engine API.

Includes: SearchQuery (history), Bookmark, SearchAnalytics,
UserPreference, SharedSearch, SearchCollection, TopicAlert,
UserInterest, FactCheck, Plugin, APIKey, TrendSnapshot,
and the existing Form / FormSubmission models.
"""

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Search History
# ---------------------------------------------------------------------------

class SearchQuery(models.Model):
    """Persisted search query with full response payload."""

    SEARCH_MODE_CHOICES = [
        ("text", "Text"),
        ("image", "Image"),
        ("academic", "Academic"),
        ("news", "News"),
        ("code", "Code"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    query = models.TextField(db_index=True)
    answer = models.TextField()
    trust_score = models.FloatField(default=0)
    sources = models.JSONField(default=list)
    followups = models.JSONField(default=list)
    model_used = models.CharField(max_length=64, blank=True, default="")
    response_time_ms = models.PositiveIntegerField(default=0, help_text="Response time in ms")
    search_mode = models.CharField(max_length=16, choices=SEARCH_MODE_CHOICES, default="text")
    fact_checked = models.BooleanField(default=False)
    fact_check_result = models.JSONField(default=dict, blank=True)
    tags = models.JSONField(default=list, blank=True, help_text="Auto-generated topic tags")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="search_queries",
    )
    session_key = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True,
        help_text="Anon session identifier when user is not authenticated",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Search queries"
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["session_key", "-created_at"]),
            models.Index(fields=["search_mode"]),
        ]

    def __str__(self):
        return f"{self.query[:80]}…"


# ---------------------------------------------------------------------------
# Bookmarks
# ---------------------------------------------------------------------------

class Bookmark(models.Model):
    """User-saved search result bookmark."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    search_query = models.ForeignKey(
        SearchQuery,
        on_delete=models.CASCADE,
        related_name="bookmarks",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="bookmarks",
    )
    session_key = models.CharField(max_length=64, blank=True, default="", db_index=True)
    note = models.TextField(blank=True, default="", help_text="Optional user note")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["search_query", "user"],
                condition=models.Q(user__isnull=False),
                name="unique_bookmark_per_user",
            ),
            models.UniqueConstraint(
                fields=["search_query", "session_key"],
                condition=models.Q(session_key__gt=""),
                name="unique_bookmark_per_session",
            ),
        ]

    def __str__(self):
        return f"Bookmark: {self.search_query.query[:60]}"


# ---------------------------------------------------------------------------
# Search Analytics
# ---------------------------------------------------------------------------

class SearchAnalytics(models.Model):
    """Aggregated daily analytics for search usage."""

    date = models.DateField(default=timezone.now, db_index=True)
    total_queries = models.PositiveIntegerField(default=0)
    unique_users = models.PositiveIntegerField(default=0)
    avg_trust_score = models.FloatField(default=0)
    avg_response_time_ms = models.PositiveIntegerField(default=0)
    top_queries = models.JSONField(default=list, help_text="Top 10 queries of the day")
    error_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-date"]
        verbose_name_plural = "Search analytics"

    def __str__(self):
        return f"Analytics {self.date}: {self.total_queries} queries"


# ---------------------------------------------------------------------------
# User Preferences
# ---------------------------------------------------------------------------

class UserPreference(models.Model):
    """Per-user search preferences (filters, defaults)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="search_preferences",
    )
    default_max_sources = models.PositiveSmallIntegerField(default=10)
    min_trust_score = models.PositiveSmallIntegerField(default=0)
    preferred_source_types = models.JSONField(
        default=list,
        help_text='e.g. ["academic","news","general"]',
    )
    enable_voice_search = models.BooleanField(default=True)
    enable_auto_followups = models.BooleanField(default=True)
    enable_fact_checking = models.BooleanField(default=False)
    default_search_mode = models.CharField(max_length=16, default="text")
    enable_topic_alerts = models.BooleanField(default=True)
    interests = models.JSONField(
        default=list,
        blank=True,
        help_text='User interest tags for personalization',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Prefs: {self.user.username}"


# ---------------------------------------------------------------------------
# Shared Searches & Collections (Collaboration)
# ---------------------------------------------------------------------------

class SearchCollection(models.Model):
    """A named collection of search queries, sharable among users."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_collections",
    )
    collaborators = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="shared_collections",
    )
    is_public = models.BooleanField(default=False)
    share_token = models.CharField(
        max_length=64, unique=True, blank=True, default="",
        help_text="Public share link token",
    )
    queries = models.ManyToManyField(SearchQuery, blank=True, related_name="collections")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Collection: {self.name}"

    def save(self, *args, **kwargs):
        if not self.share_token:
            self.share_token = uuid.uuid4().hex[:16]
        super().save(*args, **kwargs)


class CollectionComment(models.Model):
    """Comments on a search within a collection."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    collection = models.ForeignKey(
        SearchCollection,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    search_query = models.ForeignKey(
        SearchQuery,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="comments",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="collection_comments",
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment by {self.user.username}: {self.content[:40]}"


# ---------------------------------------------------------------------------
# Topic Alerts (Real-time Monitoring)
# ---------------------------------------------------------------------------

class TopicAlert(models.Model):
    """Users subscribe to topics and get notified when new info appears."""

    FREQUENCY_CHOICES = [
        ("realtime", "Real-time"),
        ("daily", "Daily"),
        ("weekly", "Weekly"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="topic_alerts",
    )
    topic = models.CharField(max_length=500, db_index=True)
    keywords = models.JSONField(default=list, help_text="Additional keywords to monitor")
    frequency = models.CharField(max_length=16, choices=FREQUENCY_CHOICES, default="daily")
    is_active = models.BooleanField(default=True)
    last_checked = models.DateTimeField(null=True, blank=True)
    last_results = models.JSONField(default=list, blank=True)
    notification_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self):
        return f"Alert: {self.topic[:60]} ({self.frequency})"


class AlertNotification(models.Model):
    """Individual notification generated by a topic alert."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alert = models.ForeignKey(
        TopicAlert,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=500)
    summary = models.TextField()
    sources = models.JSONField(default=list)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification: {self.title[:60]}"


# ---------------------------------------------------------------------------
# Fact Checking
# ---------------------------------------------------------------------------

class FactCheck(models.Model):
    """Fact-check result for a claim extracted from a search answer."""

    VERDICT_CHOICES = [
        ("true", "True"),
        ("mostly_true", "Mostly True"),
        ("mixed", "Mixed"),
        ("mostly_false", "Mostly False"),
        ("false", "False"),
        ("unverifiable", "Unverifiable"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    search_query = models.ForeignKey(
        SearchQuery,
        on_delete=models.CASCADE,
        related_name="fact_checks",
    )
    claim = models.TextField()
    verdict = models.CharField(max_length=20, choices=VERDICT_CHOICES, default="unverifiable")
    confidence = models.FloatField(default=0.0)
    explanation = models.TextField(blank=True)
    evidence_sources = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"FactCheck: {self.claim[:60]} → {self.verdict}"


# ---------------------------------------------------------------------------
# Plugins / Integrations
# ---------------------------------------------------------------------------

class Plugin(models.Model):
    """Registered plugin that extends search capabilities."""

    CATEGORY_CHOICES = [
        ("search", "Search Provider"),
        ("transform", "Content Transform"),
        ("export", "Export Format"),
        ("tool", "Utility Tool"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=16, choices=CATEGORY_CHOICES, default="tool")
    icon = models.CharField(max_length=64, blank=True, default="puzzle")
    author = models.CharField(max_length=255, blank=True)
    version = models.CharField(max_length=32, default="1.0.0")
    config_schema = models.JSONField(default=dict, blank=True, help_text="JSON schema for config")
    is_active = models.BooleanField(default=True)
    is_builtin = models.BooleanField(default=False, help_text="System-provided plugin")
    install_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-install_count", "name"]

    def __str__(self):
        return f"Plugin: {self.name} v{self.version}"


class UserPlugin(models.Model):
    """User installation / activation of a plugin."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="installed_plugins",
    )
    plugin = models.ForeignKey(
        Plugin,
        on_delete=models.CASCADE,
        related_name="installations",
    )
    config = models.JSONField(default=dict, blank=True)
    is_enabled = models.BooleanField(default=True)
    installed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "plugin"]

    def __str__(self):
        return f"{self.user.username} → {self.plugin.name}"


# ---------------------------------------------------------------------------
# API Keys (Developer / SaaS tiers)
# ---------------------------------------------------------------------------

class APIKey(models.Model):
    """Developer API keys with rate-limit tiers."""

    TIER_CHOICES = [
        ("free", "Free"),
        ("pro", "Pro"),
        ("enterprise", "Enterprise"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    key = models.CharField(max_length=64, unique=True, db_index=True)
    name = models.CharField(max_length=255, help_text="Friendly name for this key")
    tier = models.CharField(max_length=16, choices=TIER_CHOICES, default="free")
    requests_today = models.PositiveIntegerField(default=0)
    requests_total = models.PositiveIntegerField(default=0)
    daily_limit = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)
    last_used = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "API Key"
        verbose_name_plural = "API Keys"

    def __str__(self):
        return f"APIKey: {self.name} ({self.tier})"

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = f"ask_{uuid.uuid4().hex}"
        super().save(*args, **kwargs)


# ---------------------------------------------------------------------------
# Trend Snapshots (Enhanced Analytics)
# ---------------------------------------------------------------------------

class TrendSnapshot(models.Model):
    """Periodic snapshot of trending topics and usage patterns."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(default=timezone.now, db_index=True)
    trending_topics = models.JSONField(default=list)
    query_volume = models.PositiveIntegerField(default=0)
    avg_trust_score = models.FloatField(default=0)
    avg_response_time_ms = models.PositiveIntegerField(default=0)
    top_domains = models.JSONField(default=list)
    search_mode_distribution = models.JSONField(default=dict)
    user_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        unique_together = ["date"]

    def __str__(self):
        return f"Trend: {self.date} ({self.query_volume} queries)"


# ---------------------------------------------------------------------------
# Forms (existing)
# ---------------------------------------------------------------------------

class Form(models.Model):
    """Model for storing AI-generated forms."""

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    schema_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    published_at = models.DateTimeField(null=True, blank=True)
    slug = models.SlugField(unique=True)
    views_count = models.IntegerField(default=0)
    submissions_count = models.IntegerField(default=0)
    conversion_rate = models.FloatField(default=0.0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class FormSubmission(models.Model):
    """Model for storing form submissions."""

    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name="submissions")
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Submission for {self.form.title}"
