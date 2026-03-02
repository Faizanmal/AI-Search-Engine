"""
Serializers for the AI Search Engine API.

Covers: queries, responses, history, bookmarks, export, analytics,
authentication, user preferences, collections, alerts, fact-checks,
plugins, API keys, trends, and forms.
"""

from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    AlertNotification,
    APIKey,
    Bookmark,
    CollectionComment,
    FactCheck,
    Form,
    FormSubmission,
    Plugin,
    SearchAnalytics,
    SearchCollection,
    SearchQuery,
    TopicAlert,
    TrendSnapshot,
    UserPlugin,
    UserPreference,
)
from .utils.sanitizer import sanitize_query


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

class QuerySerializer(serializers.Serializer):
    """Incoming search query."""

    query = serializers.CharField(max_length=1000, required=True, help_text="User's search query")
    max_sources = serializers.IntegerField(min_value=1, max_value=20, default=10, required=False)
    search_mode = serializers.ChoiceField(
        choices=["text", "image", "academic", "news", "code"],
        default="text",
        required=False,
    )
    source_types = serializers.ListField(
        child=serializers.ChoiceField(choices=["general", "academic", "news"]),
        required=False,
        default=list,
        help_text='Filter sources by type: "general", "academic", "news"',
    )
    enable_fact_check = serializers.BooleanField(default=False, required=False)

    def validate_query(self, value):
        cleaned = sanitize_query(value)
        if not cleaned:
            raise serializers.ValidationError("Query cannot be empty after sanitization.")
        return cleaned


class SourceSerializer(serializers.Serializer):
    """Individual source / citation."""

    url = serializers.URLField(required=True)
    title = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    snippet = serializers.CharField(required=False, allow_blank=True, default="")
    position = serializers.IntegerField(required=False, min_value=1)
    domain = serializers.CharField(required=False, allow_blank=True, default="")
    favicon = serializers.URLField(required=False, allow_blank=True, default="")
    score = serializers.FloatField(required=False, default=0.0)
    cited = serializers.BooleanField(required=False, default=False)


class QueryResponseSerializer(serializers.Serializer):
    """Response envelope for a search query."""

    answer = serializers.CharField(required=True)
    sources = SourceSerializer(many=True, required=True)
    trust_score = serializers.IntegerField(min_value=0, max_value=100, required=True)
    followups = serializers.ListField(
        child=serializers.CharField(max_length=500),
        required=True,
        allow_empty=True,
    )
    query_id = serializers.UUIDField(required=False, help_text="ID of persisted SearchQuery")
    response_time_ms = serializers.IntegerField(required=False, min_value=0)
    search_mode = serializers.CharField(required=False)
    fact_check_result = serializers.DictField(required=False)
    tags = serializers.ListField(child=serializers.CharField(), required=False)


class SimilarQuerySerializer(serializers.Serializer):
    """Request for similar past queries."""

    query = serializers.CharField(max_length=1000, required=True)
    k = serializers.IntegerField(min_value=1, max_value=10, default=3)


# ---------------------------------------------------------------------------
# Search History
# ---------------------------------------------------------------------------

class SearchHistorySerializer(serializers.ModelSerializer):
    """Read-only serializer for search history entries."""

    class Meta:
        model = SearchQuery
        fields = [
            "id",
            "query",
            "answer",
            "trust_score",
            "sources",
            "followups",
            "model_used",
            "response_time_ms",
            "search_mode",
            "fact_checked",
            "tags",
            "created_at",
        ]
        read_only_fields = fields


class SearchHistoryListSerializer(serializers.ModelSerializer):
    """Lightweight list view (omits full answer & sources for speed)."""

    class Meta:
        model = SearchQuery
        fields = [
            "id",
            "query",
            "trust_score",
            "response_time_ms",
            "search_mode",
            "tags",
            "created_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Bookmarks
# ---------------------------------------------------------------------------

class BookmarkSerializer(serializers.ModelSerializer):
    """Full bookmark with nested search data."""

    search_query = SearchHistorySerializer(read_only=True)

    class Meta:
        model = Bookmark
        fields = ["id", "search_query", "note", "created_at"]
        read_only_fields = ["id", "created_at"]


class BookmarkCreateSerializer(serializers.Serializer):
    """Create a new bookmark."""

    search_query_id = serializers.UUIDField(required=True)
    note = serializers.CharField(max_length=500, required=False, default="")


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

class ExportRequestSerializer(serializers.Serializer):
    """Request to export search results."""

    FORMAT_CHOICES = [("json", "JSON"), ("markdown", "Markdown"), ("pdf", "PDF")]

    query_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text="Specific query IDs to export. Empty = export all history.",
    )
    format = serializers.ChoiceField(choices=FORMAT_CHOICES, default="json")
    include_sources = serializers.BooleanField(default=True)


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class SearchAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchAnalytics
        fields = "__all__"
        read_only_fields = fields


class AnalyticsSummarySerializer(serializers.Serializer):
    """Aggregated analytics summary."""

    total_queries = serializers.IntegerField()
    total_bookmarks = serializers.IntegerField()
    avg_trust_score = serializers.FloatField()
    avg_response_time_ms = serializers.FloatField()
    queries_today = serializers.IntegerField()
    queries_this_week = serializers.IntegerField()
    top_queries = serializers.ListField(child=serializers.DictField())
    search_mode_distribution = serializers.DictField(required=False)
    daily_volume = serializers.ListField(child=serializers.DictField(), required=False)
    top_domains = serializers.ListField(child=serializers.DictField(), required=False)
    avg_sources_per_query = serializers.FloatField(required=False)
    fact_check_count = serializers.IntegerField(required=False)


# ---------------------------------------------------------------------------
# Trend Snapshots
# ---------------------------------------------------------------------------

class TrendSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrendSnapshot
        fields = "__all__"
        read_only_fields = fields


# ---------------------------------------------------------------------------
# User Preferences
# ---------------------------------------------------------------------------

class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = [
            "default_max_sources",
            "min_trust_score",
            "preferred_source_types",
            "enable_voice_search",
            "enable_auto_followups",
            "enable_fact_checking",
            "default_search_mode",
            "enable_topic_alerts",
            "interests",
        ]


# ---------------------------------------------------------------------------
# Collections (Collaboration)
# ---------------------------------------------------------------------------

class CollectionCommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = CollectionComment
        fields = ["id", "collection", "search_query", "username", "content", "created_at"]
        read_only_fields = ["id", "username", "created_at"]


class SearchCollectionSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    query_count = serializers.SerializerMethodField()
    collaborator_usernames = serializers.SerializerMethodField()
    comments = CollectionCommentSerializer(many=True, read_only=True)

    class Meta:
        model = SearchCollection
        fields = [
            "id", "name", "description", "owner_username",
            "collaborator_usernames", "is_public", "share_token",
            "query_count", "comments", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner_username", "share_token", "created_at", "updated_at"]

    def get_query_count(self, obj):
        return obj.queries.count()

    def get_collaborator_usernames(self, obj):
        return list(obj.collaborators.values_list("username", flat=True))


class SearchCollectionCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, default="")
    is_public = serializers.BooleanField(default=False)


class CollectionAddQuerySerializer(serializers.Serializer):
    query_id = serializers.UUIDField()


class CollectionAddCollaboratorSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)


class CollectionCommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=2000)
    search_query_id = serializers.UUIDField(required=False)


# ---------------------------------------------------------------------------
# Topic Alerts
# ---------------------------------------------------------------------------

class AlertNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertNotification
        fields = ["id", "title", "summary", "sources", "is_read", "created_at"]
        read_only_fields = fields


class TopicAlertSerializer(serializers.ModelSerializer):
    recent_notifications = serializers.SerializerMethodField()

    class Meta:
        model = TopicAlert
        fields = [
            "id", "topic", "keywords", "frequency", "is_active",
            "last_checked", "notification_count", "recent_notifications",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "last_checked", "notification_count", "created_at", "updated_at"]

    def get_recent_notifications(self, obj):
        notifs = obj.notifications.all()[:5]
        return AlertNotificationSerializer(notifs, many=True).data


class TopicAlertCreateSerializer(serializers.Serializer):
    topic = serializers.CharField(max_length=500)
    keywords = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        default=list,
    )
    frequency = serializers.ChoiceField(
        choices=["realtime", "daily", "weekly"],
        default="daily",
    )


# ---------------------------------------------------------------------------
# Fact Checking
# ---------------------------------------------------------------------------

class FactCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = FactCheck
        fields = [
            "id", "search_query", "claim", "verdict", "confidence",
            "explanation", "evidence_sources", "created_at",
        ]
        read_only_fields = fields


class FactCheckRequestSerializer(serializers.Serializer):
    query_id = serializers.UUIDField()


# ---------------------------------------------------------------------------
# Plugins
# ---------------------------------------------------------------------------

class PluginSerializer(serializers.ModelSerializer):
    is_installed = serializers.SerializerMethodField()

    class Meta:
        model = Plugin
        fields = [
            "id", "name", "slug", "description", "category", "icon",
            "author", "version", "config_schema", "is_active",
            "is_builtin", "install_count", "is_installed",
            "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_is_installed(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return UserPlugin.objects.filter(user=request.user, plugin=obj).exists()
        return False


class UserPluginSerializer(serializers.ModelSerializer):
    plugin = PluginSerializer(read_only=True)

    class Meta:
        model = UserPlugin
        fields = ["id", "plugin", "config", "is_enabled", "installed_at"]
        read_only_fields = ["id", "installed_at"]


class PluginInstallSerializer(serializers.Serializer):
    plugin_id = serializers.UUIDField()
    config = serializers.DictField(required=False, default=dict)


# ---------------------------------------------------------------------------
# API Keys
# ---------------------------------------------------------------------------

class APIKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = [
            "id", "name", "key", "tier", "requests_today",
            "requests_total", "daily_limit", "is_active",
            "last_used", "created_at",
        ]
        read_only_fields = [
            "id", "key", "requests_today", "requests_total",
            "last_used", "created_at",
        ]


class APIKeyCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    tier = serializers.ChoiceField(
        choices=["free", "pro", "enterprise"],
        default="free",
    )


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "username", "first_name", "last_name"]
        read_only_fields = ["id"]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            user = User.objects.get(email=data["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "User not found"})
        if not user.check_password(data["password"]):
            raise serializers.ValidationError({"password": "Invalid password"})
        return {"user": user}


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=10)
    password2 = serializers.CharField(write_only=True, min_length=10)
    first_name = serializers.CharField(max_length=150, required=False, default="")
    last_name = serializers.CharField(max_length=150, required=False, default="")

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError({"email": "Email already registered"})
        if User.objects.filter(username=data["username"]).exists():
            raise serializers.ValidationError({"username": "Username already taken"})
        return data

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )


class AuthTokenSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


# ---------------------------------------------------------------------------
# Forms
# ---------------------------------------------------------------------------

class FormSerializer(serializers.ModelSerializer):
    class Meta:
        model = Form
        fields = [
            "id",
            "title",
            "description",
            "schema_json",
            "slug",
            "created_at",
            "updated_at",
            "published_at",
            "views_count",
            "submissions_count",
            "conversion_rate",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "views_count",
            "submissions_count",
            "conversion_rate",
        ]


class FormSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormSubmission
        fields = ["id", "form", "data", "created_at"]
        read_only_fields = ["id", "created_at"]
