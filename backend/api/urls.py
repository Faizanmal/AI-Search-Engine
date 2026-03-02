"""
URL routing for API endpoints.

All paths are prefixed by ``/api/`` in the root URL conf.
"""

from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from .views import (
    # Search
    QueryView,
    StreamQueryView,
    SimilarQueriesView,
    # Health
    HealthCheckView,
    # History
    SearchHistoryListView,
    SearchHistoryDetailView,
    SearchHistoryClearView,
    # Bookmarks
    BookmarkListCreateView,
    BookmarkDeleteView,
    # Export
    ExportView,
    # Analytics
    AnalyticsSummaryView,
    TrendListView,
    # Preferences
    UserPreferenceView,
    # Auth
    LoginView,
    RegisterView,
    UserMeView,
    RefreshTokenView,
    # Forms
    FormListView,
    # Collections / Collaboration
    CollectionListCreateView,
    CollectionDetailView,
    CollectionAddQueryView,
    CollectionAddCollaboratorView,
    CollectionCommentView,
    CollectionSharedView,
    # Topic Alerts
    TopicAlertListCreateView,
    TopicAlertDetailView,
    TopicAlertCheckView,
    NotificationListView,
    NotificationMarkReadView,
    # Fact Checking
    FactCheckView,
    FactCheckResultView,
    # Plugins
    PluginListView,
    InstalledPluginListView,
    PluginInstallView,
    PluginUninstallView,
    # API Keys
    APIKeyListCreateView,
    APIKeyDeleteView,
)

urlpatterns = [
    # ---- Search -----------------------------------------------------------
    path("query/", QueryView.as_view(), name="query"),
    path("stream-query/", StreamQueryView.as_view(), name="stream-query"),
    path("similar-queries/", SimilarQueriesView.as_view(), name="similar-queries"),

    # ---- Health -----------------------------------------------------------
    path("health/", HealthCheckView.as_view(), name="health"),

    # ---- History ----------------------------------------------------------
    path("history/", SearchHistoryListView.as_view(), name="history-list"),
    path("history/clear/", SearchHistoryClearView.as_view(), name="history-clear"),
    path("history/<uuid:pk>/", SearchHistoryDetailView.as_view(), name="history-detail"),

    # ---- Bookmarks --------------------------------------------------------
    path("bookmarks/", BookmarkListCreateView.as_view(), name="bookmark-list-create"),
    path("bookmarks/<uuid:pk>/", BookmarkDeleteView.as_view(), name="bookmark-delete"),

    # ---- Export -----------------------------------------------------------
    path("export/", ExportView.as_view(), name="export"),

    # ---- Analytics --------------------------------------------------------
    path("analytics/summary/", AnalyticsSummaryView.as_view(), name="analytics-summary"),
    path("analytics/trends/", TrendListView.as_view(), name="analytics-trends"),

    # ---- Preferences ------------------------------------------------------
    path("preferences/", UserPreferenceView.as_view(), name="preferences"),

    # ---- Auth -------------------------------------------------------------
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh", RefreshTokenView.as_view(), name="token-refresh"),
    path("users/register/", RegisterView.as_view(), name="register"),
    path("users/me/", UserMeView.as_view(), name="user-me"),

    # ---- Forms ------------------------------------------------------------
    path("forms/", FormListView.as_view(), name="form-list"),

    # ---- Collections / Collaboration --------------------------------------
    path("collections/", CollectionListCreateView.as_view(), name="collection-list-create"),
    path("collections/shared/<str:token>/", CollectionSharedView.as_view(), name="collection-shared"),
    path("collections/<uuid:pk>/", CollectionDetailView.as_view(), name="collection-detail"),
    path("collections/<uuid:pk>/add-query/", CollectionAddQueryView.as_view(), name="collection-add-query"),
    path("collections/<uuid:pk>/add-collaborator/", CollectionAddCollaboratorView.as_view(), name="collection-add-collaborator"),
    path("collections/<uuid:pk>/comments/", CollectionCommentView.as_view(), name="collection-comments"),

    # ---- Topic Alerts -----------------------------------------------------
    path("alerts/", TopicAlertListCreateView.as_view(), name="alert-list-create"),
    path("alerts/<uuid:pk>/", TopicAlertDetailView.as_view(), name="alert-detail"),
    path("alerts/<uuid:pk>/check/", TopicAlertCheckView.as_view(), name="alert-check"),
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/<uuid:pk>/read/", NotificationMarkReadView.as_view(), name="notification-read"),

    # ---- Fact Checking ----------------------------------------------------
    path("fact-check/", FactCheckView.as_view(), name="fact-check"),
    path("fact-check/<uuid:query_id>/", FactCheckResultView.as_view(), name="fact-check-result"),

    # ---- Plugins ----------------------------------------------------------
    path("plugins/", PluginListView.as_view(), name="plugin-list"),
    path("plugins/installed/", InstalledPluginListView.as_view(), name="plugin-installed"),
    path("plugins/install/", PluginInstallView.as_view(), name="plugin-install"),
    path("plugins/<uuid:pk>/uninstall/", PluginUninstallView.as_view(), name="plugin-uninstall"),

    # ---- API Keys ---------------------------------------------------------
    path("api-keys/", APIKeyListCreateView.as_view(), name="api-key-list-create"),
    path("api-keys/<uuid:pk>/", APIKeyDeleteView.as_view(), name="api-key-delete"),

    # ---- OpenAPI / Swagger ------------------------------------------------
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
