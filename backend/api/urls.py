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
from .form_views import (
    FormListCreateView,
    FormDetailView,
    FormPublishView,
    FormEmbedView,
    FormAnalyticsView,
    FormGenerateView,
    PublicFormBySlugView,
    PublicSubmitView,
    FormSubmissionListView,
    FormSubmissionDetailView,
    FormSubmissionExportView,
    TemplateListView,
    TemplateDetailView,
    TemplateUseView,
    FormIntegrationsListView,
    IntegrationListCreateView,
    IntegrationDetailView,
    IntegrationTestView,
    GoogleSheetsAuthView,
    GoogleSheetsConnectView,
    WebhookLogListView,
    WebhookLogRetryView,
    StripeCheckoutConfirmView,
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
    path("forms/", FormListCreateView.as_view(), name="form-list-create"),
    path("forms/<int:pk>/", FormDetailView.as_view(), name="form-detail"),
    path("forms/<int:pk>/publish/", FormPublishView.as_view(), name="form-publish"),
    path("forms/<int:pk>/embed/", FormEmbedView.as_view(), name="form-embed"),
    path("forms/<int:pk>/analytics/", FormAnalyticsView.as_view(), name="form-analytics"),
    path("forms/<int:form_id>/submissions/", FormSubmissionListView.as_view(), name="form-submissions"),
    path(
        "forms/<int:form_id>/submissions/export/",
        FormSubmissionExportView.as_view(),
        name="form-submissions-export",
    ),
    path(
        "forms/<int:form_id>/submissions/<int:submission_id>/",
        FormSubmissionDetailView.as_view(),
        name="form-submission-detail",
    ),
    path(
        "forms/<int:form_id>/integrations/",
        FormIntegrationsListView.as_view(),
        name="form-integrations",
    ),
    path("generate/", FormGenerateView.as_view(), name="form-generate"),
    path("public/forms/<slug:slug>/", PublicFormBySlugView.as_view(), name="public-form"),
    path("public/submit/<slug:slug>/", PublicSubmitView.as_view(), name="public-submit"),
    path("templates/", TemplateListView.as_view(), name="template-list"),
    path("templates/<uuid:pk>/", TemplateDetailView.as_view(), name="template-detail"),
    path("templates/<uuid:pk>/use/", TemplateUseView.as_view(), name="template-use"),
    path("integrations/", IntegrationListCreateView.as_view(), name="integration-list-create"),
    path("integrations/<uuid:pk>/", IntegrationDetailView.as_view(), name="integration-detail"),
    path("integrations/<uuid:pk>/test/", IntegrationTestView.as_view(), name="integration-test"),
    path(
        "integrations/google_sheets_auth/",
        GoogleSheetsAuthView.as_view(),
        name="google-sheets-auth",
    ),
    path(
        "integrations/google_sheets_connect/",
        GoogleSheetsConnectView.as_view(),
        name="google-sheets-connect",
    ),
    path(
        "integrations/stripe/confirm/",
        StripeCheckoutConfirmView.as_view(),
        name="stripe-confirm",
    ),
    path("integrations/webhook-logs/", WebhookLogListView.as_view(), name="webhook-log-list"),
    path(
        "integrations/webhook-logs/<uuid:log_id>/retry/",
        WebhookLogRetryView.as_view(),
        name="webhook-log-retry",
    ),

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
