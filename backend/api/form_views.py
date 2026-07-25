"""
FormForge API views — forms, submissions, templates, integrations.
"""

from __future__ import annotations

import json
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Form,
    FormIntegration,
    FormSubmission,
    FormTemplate,
    WebhookLog,
)
from .serializers import (
    FormCreateSerializer,
    FormGenerateSerializer,
    FormIntegrationCreateSerializer,
    FormIntegrationSerializer,
    FormSchemaSerializer,
    FormSerializer,
    FormSubmissionSerializer,
    FormTemplateSerializer,
    PublicSubmitSerializer,
    WebhookLogSerializer,
)
from .utils.form_delivery import _client_ip, run_integrations
from .utils.form_generator import (
    BUILTIN_TEMPLATES,
    generate_form_schema,
    unique_slug,
)
from .utils.form_spam import (
    check_submit_rate_limit,
    is_honeypot_tripped,
    strip_honeypot_fields,
)

logger = logging.getLogger("api.form_views")


def _get_owned_form(user, pk) -> Form | None:
    try:
        return Form.objects.get(pk=pk, user=user)
    except Form.DoesNotExist:
        return None


def _ensure_builtin_templates() -> None:
    if FormTemplate.objects.exists():
        return
    for item in BUILTIN_TEMPLATES:
        FormTemplate.objects.create(**item)


def _frontend_base() -> str:
    return getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")


# ===================================================================
# Forms CRUD
# ===================================================================


@extend_schema(tags=["Forms"])
class FormListCreateView(APIView):
    """List and create forms (AI generate when prompt is provided)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        forms = Form.objects.filter(user=request.user)
        serializer = FormSerializer(forms, many=True)
        return Response({"results": serializer.data})

    @extend_schema(request=FormCreateSerializer, responses=FormSerializer)
    def post(self, request):
        serializer = FormCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        prompt = (data.get("prompt") or "").strip()
        context = (data.get("context") or "").strip()

        if prompt:
            schema = generate_form_schema(prompt, context)
            title = data.get("title") or schema.get("title") or "Untitled Form"
            description = data.get("description") or schema.get("description") or ""
            schema_json = schema
            settings_json = schema.get("settings") or {}
        else:
            schema_json = data.get("schema_json") or {
                "title": data.get("title") or "Untitled Form",
                "description": data.get("description") or "",
                "fields": [],
                "settings": {"redirect": "/thank-you"},
            }
            title = data.get("title") or schema_json.get("title") or "Untitled Form"
            description = data.get("description") or schema_json.get("description") or ""
            settings_json = data.get("settings_json") or schema_json.get("settings") or {}

        form = Form.objects.create(
            user=request.user,
            title=title,
            description=description,
            schema_json=schema_json,
            settings_json=settings_json,
            slug=unique_slug(title, Form),
            is_active=True,
        )
        return Response(FormSerializer(form).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Forms"])
class FormDetailView(APIView):
    """Retrieve, update, or delete a form."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        form = _get_owned_form(request.user, pk)
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(FormSerializer(form).data)

    def patch(self, request, pk):
        form = _get_owned_form(request.user, pk)
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)

        allowed = {
            "title",
            "description",
            "schema_json",
            "settings_json",
            "is_active",
            "slug",
        }
        for key, value in request.data.items():
            if key in allowed:
                setattr(form, key, value)

        if "schema_json" in request.data and isinstance(form.schema_json, dict):
            settings = form.schema_json.get("settings")
            if settings and not request.data.get("settings_json"):
                form.settings_json = settings
            if form.schema_json.get("title") and "title" not in request.data:
                form.title = form.schema_json["title"]
            if "description" not in request.data and form.schema_json.get("description") is not None:
                form.description = form.schema_json.get("description") or ""

        form.save()
        return Response(FormSerializer(form).data)

    def delete(self, request, pk):
        form = _get_owned_form(request.user, pk)
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)
        form.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Forms"])
class FormPublishView(APIView):
    """Publish a form (sets published_at and is_active)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        form = _get_owned_form(request.user, pk)
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)
        form.published_at = timezone.now()
        form.is_active = True
        form.save(update_fields=["published_at", "is_active", "updated_at"])
        return Response(
            {
                "status": "published",
                "published_at": form.published_at.isoformat(),
            }
        )


@extend_schema(tags=["Forms"])
class FormEmbedView(APIView):
    """Return embed snippet and hosted link."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        form = _get_owned_form(request.user, pk)
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)
        base = _frontend_base()
        hosted = f"{base}/form/{form.slug}"
        embed_code = (
            f'<div id="formforge-{form.slug}"></div>\n'
            f'<script src="{base}/embed.js"></script>\n'
            f"<script>\n"
            f"  FormForge.embed({{ container: '#formforge-{form.slug}', "
            f"slug: '{form.slug}', apiUrl: '{base}' }});\n"
            f"</script>"
        )
        return Response(
            {
                "embed_code": embed_code,
                "hosted_link": hosted,
                "slug": form.slug,
            }
        )


@extend_schema(tags=["Forms"])
class FormAnalyticsView(APIView):
    """Form analytics summary."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        form = _get_owned_form(request.user, pk)
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)

        week_ago = timezone.now() - timedelta(days=7)
        recent = form.submissions.filter(created_at__gte=week_ago).count()
        last = form.submissions.order_by("-created_at").first()
        form.refresh_conversion_rate()
        form.save(update_fields=["conversion_rate"])

        return Response(
            {
                "views": form.views_count,
                "submissions": form.submissions_count,
                "conversion_rate": form.conversion_rate,
                "recent_submissions": recent,
                "last_submission": last.created_at.isoformat() if last else None,
            }
        )


@extend_schema(tags=["Forms"], request=FormGenerateSerializer, responses=FormSchemaSerializer)
class FormGenerateView(APIView):
    """Generate a schema without persisting."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FormGenerateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        schema = generate_form_schema(
            serializer.validated_data["prompt"],
            serializer.validated_data.get("context", ""),
        )
        return Response(schema)


# ===================================================================
# Public form + submit
# ===================================================================


@extend_schema(tags=["Forms"])
class PublicFormBySlugView(APIView):
    """Public published form by slug (increments view count)."""

    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            form = Form.objects.get(slug=slug, is_active=True, published_at__isnull=False)
        except Form.DoesNotExist:
            # Allow preview of owner's unpublished forms when authenticated
            if request.user.is_authenticated:
                try:
                    form = Form.objects.get(slug=slug, user=request.user)
                except Form.DoesNotExist:
                    return Response(
                        {"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND
                    )
            else:
                return Response(
                    {"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND
                )

        Form.objects.filter(pk=form.pk).update(views_count=form.views_count + 1)
        form.views_count += 1
        return Response(FormSerializer(form).data)


@extend_schema(tags=["Forms"], request=PublicSubmitSerializer)
class PublicSubmitView(APIView):
    """Accept a public form submission."""

    permission_classes = [AllowAny]

    def post(self, request, slug):
        try:
            form = Form.objects.get(slug=slug, is_active=True, published_at__isnull=False)
        except Form.DoesNotExist:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)

        ip = _client_ip(request)
        allowed, retry_after = check_submit_rate_limit(ip)
        if not allowed:
            return Response(
                {
                    "error": "Too many submissions from this network. Please try again later.",
                    "retry_after": retry_after,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = PublicSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        payload = serializer.validated_data["payload"]
        if is_honeypot_tripped(payload, request.data if isinstance(request.data, dict) else None):
            # Silent success for bots — don't reveal the trap
            logger.info("Honeypot tripped on form %s from %s", slug, ip)
            return Response(
                {
                    "id": "0",
                    "message": "Thank you! Your response has been recorded.",
                    "redirect": "/thank-you",
                    "checkout_url": None,
                },
                status=status.HTTP_201_CREATED,
            )

        payload = strip_honeypot_fields(payload)
        schema_fields = (form.schema_json or {}).get("fields") or []
        required_ids = [
            f["id"] for f in schema_fields if isinstance(f, dict) and f.get("required")
        ]
        missing = [fid for fid in required_ids if not payload.get(fid)]
        if missing:
            return Response(
                {"error": f"Missing required fields: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_amount = None
        payment_status = ""
        for field in schema_fields:
            if isinstance(field, dict) and field.get("type") == "payment":
                payment_amount = int(field.get("amount") or 0)
                payment_status = "pending"
                break

        submission = FormSubmission.objects.create(
            form=form,
            data=payload,
            processed_at=timezone.now(),
            ip_address=ip,
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:1000],
            payment_status=payment_status,
            payment_amount=payment_amount,
        )

        form.submissions_count = form.submissions.count()
        form.refresh_conversion_rate()
        form.save(update_fields=["submissions_count", "conversion_rate", "updated_at"])

        checkout_url = None
        try:
            checkout_url = run_integrations(submission)
        except Exception:  # noqa: BLE001
            logger.exception("Post-submit integrations failed")

        settings_json = form.settings_json or {}
        if not settings_json:
            settings_json = (form.schema_json or {}).get("settings") or {}
        redirect = settings_json.get("redirect") or "/thank-you"
        if checkout_url:
            redirect = checkout_url

        return Response(
            {
                "id": str(submission.id),
                "message": "Thank you! Your response has been recorded.",
                "redirect": redirect,
                "checkout_url": checkout_url,
            },
            status=status.HTTP_201_CREATED,
        )


# ===================================================================
# Submissions
# ===================================================================


@extend_schema(tags=["Forms"])
class FormSubmissionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, form_id):
        form = _get_owned_form(request.user, form_id)
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)
        qs = form.submissions.all()
        return Response({"results": FormSubmissionSerializer(qs, many=True).data})


@extend_schema(tags=["Forms"])
class FormSubmissionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, form_id, submission_id):
        form = _get_owned_form(request.user, form_id)
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)
        try:
            submission = form.submissions.get(pk=submission_id)
        except FormSubmission.DoesNotExist:
            return Response(
                {"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(FormSubmissionSerializer(submission).data)


@extend_schema(tags=["Forms"])
class FormSubmissionExportView(APIView):
    """Download all submissions for a form as CSV."""

    permission_classes = [IsAuthenticated]

    def get(self, request, form_id):
        import csv
        from django.http import HttpResponse

        form = _get_owned_form(request.user, form_id)
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)

        fields = (form.schema_json or {}).get("fields") or []
        field_ids = [f.get("id") for f in fields if isinstance(f, dict) and f.get("id")]
        field_labels = {
            f.get("id"): f.get("label") or f.get("id")
            for f in fields
            if isinstance(f, dict) and f.get("id")
        }

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        filename = f"{form.slug or form.id}-submissions.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response.write("\ufeff")  # Excel-friendly BOM

        writer = csv.writer(response)
        header = [
            "Submission ID",
            "Created At",
            "Payment Status",
            "Payment Amount (cents)",
            "IP Address",
            *[field_labels.get(fid, fid) for fid in field_ids],
        ]
        writer.writerow(header)

        for sub in form.submissions.all().iterator():
            data = sub.data or {}
            row = [
                str(sub.id),
                sub.created_at.isoformat() if sub.created_at else "",
                sub.payment_status or "",
                sub.payment_amount if sub.payment_amount is not None else "",
                sub.ip_address or "",
            ]
            for fid in field_ids:
                value = data.get(fid, "")
                if isinstance(value, (list, dict)):
                    value = json.dumps(value, ensure_ascii=False)
                row.append(value)
            writer.writerow(row)

        return response


# ===================================================================
# Templates
# ===================================================================


@extend_schema(tags=["Forms"])
class TemplateListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _ensure_builtin_templates()
        qs = FormTemplate.objects.all()
        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        return Response({"results": FormTemplateSerializer(qs, many=True).data})


@extend_schema(tags=["Forms"])
class TemplateDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        _ensure_builtin_templates()
        try:
            template = FormTemplate.objects.get(pk=pk)
        except FormTemplate.DoesNotExist:
            return Response(
                {"error": "Template not found"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(FormTemplateSerializer(template).data)


@extend_schema(tags=["Forms"])
class TemplateUseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        _ensure_builtin_templates()
        try:
            template = FormTemplate.objects.get(pk=pk)
        except FormTemplate.DoesNotExist:
            return Response(
                {"error": "Template not found"}, status=status.HTTP_404_NOT_FOUND
            )

        schema = template.schema_json or {}
        title = schema.get("title") or template.name
        form = Form.objects.create(
            user=request.user,
            title=title,
            description=schema.get("description") or template.description,
            schema_json=schema,
            settings_json=schema.get("settings") or {},
            slug=unique_slug(title, Form),
            is_active=True,
        )
        FormTemplate.objects.filter(pk=template.pk).update(
            usage_count=template.usage_count + 1
        )
        return Response(FormSerializer(form).data, status=status.HTTP_201_CREATED)


# ===================================================================
# Integrations
# ===================================================================


@extend_schema(tags=["Forms"])
class FormIntegrationsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, form_id):
        form = _get_owned_form(request.user, form_id)
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)
        qs = form.integrations.all()
        return Response({"results": FormIntegrationSerializer(qs, many=True).data})


@extend_schema(tags=["Forms"])
class IntegrationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        form_id = request.query_params.get("form")
        qs = FormIntegration.objects.filter(form__user=request.user)
        if form_id:
            qs = qs.filter(form_id=form_id)
        return Response({"results": FormIntegrationSerializer(qs, many=True).data})

    @extend_schema(request=FormIntegrationCreateSerializer)
    def post(self, request):
        serializer = FormIntegrationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        form = _get_owned_form(request.user, data["form"])
        if not form:
            return Response({"error": "Form not found"}, status=status.HTTP_404_NOT_FOUND)

        name = data.get("name") or data["integration_type"].replace("_", " ").title()
        integration, created = FormIntegration.objects.update_or_create(
            form=form,
            integration_type=data["integration_type"],
            defaults={
                "name": name,
                "config": data.get("config") or {},
                "is_active": data.get("is_active", True),
                "error_message": "",
            },
        )
        return Response(
            FormIntegrationSerializer(integration).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


@extend_schema(tags=["Forms"])
class IntegrationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, request, pk):
        try:
            return FormIntegration.objects.get(pk=pk, form__user=request.user)
        except FormIntegration.DoesNotExist:
            return None

    def patch(self, request, pk):
        integration = self._get(request, pk)
        if not integration:
            return Response(
                {"error": "Integration not found"}, status=status.HTTP_404_NOT_FOUND
            )
        for key in ("name", "config", "is_active"):
            if key in request.data:
                setattr(integration, key, request.data[key])
        integration.save()
        return Response(FormIntegrationSerializer(integration).data)

    def delete(self, request, pk):
        integration = self._get(request, pk)
        if not integration:
            return Response(
                {"error": "Integration not found"}, status=status.HTTP_404_NOT_FOUND
            )
        integration.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Forms"])
class IntegrationTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            integration = FormIntegration.objects.get(pk=pk, form__user=request.user)
        except FormIntegration.DoesNotExist:
            return Response(
                {"error": "Integration not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if integration.integration_type == "webhook":
            from .utils.form_delivery import deliver_webhook

            log = deliver_webhook(
                integration,
                {
                    "event": "form.test",
                    "form_id": str(integration.form_id),
                    "message": "Test webhook from FormForge",
                },
            )
            ok = log.status == "success"
            return Response(
                {
                    "status": "ok" if ok else "failed",
                    "message": "Webhook delivered" if ok else (log.error_message or "Failed"),
                },
                status=status.HTTP_200_OK if ok else status.HTTP_400_BAD_REQUEST,
            )

        if integration.integration_type == "email":
            return Response(
                {
                    "status": "ok",
                    "message": "Email integration is configured. A real email is sent on submit.",
                }
            )

        if integration.integration_type == "stripe":
            cfg = integration.config or {}
            if cfg.get("secret_key"):
                return Response(
                    {
                        "status": "ok",
                        "message": "Stripe is configured. Submissions with payment fields open Checkout.",
                    }
                )
            return Response(
                {"status": "failed", "message": "Add a Stripe secret key first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if integration.integration_type == "google_sheets":
            cfg = integration.config or {}
            if cfg.get("access_token") and cfg.get("spreadsheet_id"):
                return Response(
                    {"status": "ok", "message": "Google Sheets is ready to receive rows on submit."}
                )
            return Response(
                {
                    "status": "failed",
                    "message": "Connect OAuth and set a spreadsheet_id first.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if integration.integration_type == "slack":
            cfg = integration.config or {}
            if not (cfg.get("webhook_url") or cfg.get("url")):
                return Response(
                    {"status": "failed", "message": "Add a Slack Incoming Webhook URL."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            from .utils.form_delivery import deliver_slack

            deliver_slack(
                integration,
                {
                    "event": "form.test",
                    "form_title": integration.form.title,
                    "data": {"test": "FormForge Slack test"},
                },
            )
            ok = not integration.error_message
            return Response(
                {
                    "status": "ok" if ok else "failed",
                    "message": "Test message sent to Slack" if ok else integration.error_message,
                },
                status=status.HTTP_200_OK if ok else status.HTTP_400_BAD_REQUEST,
            )

        if integration.integration_type in ("notion", "zapier"):
            cfg = integration.config or {}
            required = (
                ("api_key", "database_id")
                if integration.integration_type == "notion"
                else ("hook_url",)
            )
            missing = [k for k in required if not cfg.get(k) and not (k == "hook_url" and cfg.get("url"))]
            if missing:
                return Response(
                    {
                        "status": "failed",
                        "message": f"Missing config: {', '.join(missing)}",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {
                "status": "ok",
                "message": f"{integration.integration_type} integration is saved.",
            }
        )


@extend_schema(tags=["Forms"])
class GoogleSheetsAuthView(APIView):
    """Return OAuth start URL when Google credentials are configured."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        form_id = request.query_params.get("form_id")
        if not form_id or not _get_owned_form(request.user, form_id):
            return Response({"error": "Invalid form_id"}, status=status.HTTP_400_BAD_REQUEST)

        client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or ""
        redirect_uri = (
            getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "")
            or f"{_frontend_base()}/auth/google-callback"
        )
        if not client_id:
            return Response(
                {
                    "error": "Google OAuth is not configured on the server. "
                    "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET."
                },
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        import urllib.parse
        import secrets

        state = secrets.token_urlsafe(16)
        params = urllib.parse.urlencode(
            {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "https://www.googleapis.com/auth/spreadsheets",
                "access_type": "offline",
                "prompt": "consent",
                "state": state,
            }
        )
        return Response(
            {
                "authorization_url": f"https://accounts.google.com/o/oauth2/v2/auth?{params}",
                "state": state,
            }
        )


@extend_schema(tags=["Forms"])
class GoogleSheetsConnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        form_id = request.data.get("form_id")
        code = request.data.get("code")
        form = _get_owned_form(request.user, form_id) if form_id else None
        if not form or not code:
            return Response(
                {"error": "form_id and code are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or ""
        client_secret = getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "") or ""
        redirect_uri = (
            getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "")
            or f"{_frontend_base()}/auth/google-callback"
        )
        if not client_id or not client_secret:
            return Response(
                {"error": "Google OAuth is not configured on the server."},
                status=status.HTTP_501_NOT_IMPLEMENTED,
            )

        import requests

        token_resp = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=20,
        )
        if token_resp.status_code >= 400:
            return Response(
                {"error": "Failed to exchange OAuth code", "details": token_resp.text[:300]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tokens = token_resp.json()
        spreadsheet_id = (request.data.get("spreadsheet_id") or "").strip()
        sheet_range = (request.data.get("sheet_range") or "Sheet1").strip() or "Sheet1"
        existing = FormIntegration.objects.filter(
            form=form, integration_type="google_sheets"
        ).first()
        prev_cfg = (existing.config if existing else {}) or {}
        if not spreadsheet_id:
            spreadsheet_id = prev_cfg.get("spreadsheet_id") or ""

        integration, _ = FormIntegration.objects.update_or_create(
            form=form,
            integration_type="google_sheets",
            defaults={
                "name": "Google Sheets",
                "config": {
                    "access_token": tokens.get("access_token", ""),
                    "refresh_token": tokens.get("refresh_token", "")
                    or prev_cfg.get("refresh_token", ""),
                    "token_type": tokens.get("token_type", ""),
                    "expires_in": tokens.get("expires_in"),
                    "spreadsheet_id": spreadsheet_id,
                    "sheet_range": sheet_range,
                },
                "is_active": True,
                "error_message": "",
            },
        )
        return Response(FormIntegrationSerializer(integration).data)


@extend_schema(tags=["Forms"])
class WebhookLogListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = WebhookLog.objects.filter(integration__form__user=request.user)
        integration_id = request.query_params.get("integration")
        if integration_id:
            qs = qs.filter(integration_id=integration_id)
        qs = qs[:50]
        return Response({"results": WebhookLogSerializer(qs, many=True).data})


@extend_schema(tags=["Forms"])
class WebhookLogRetryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, log_id):
        try:
            log = WebhookLog.objects.get(
                pk=log_id, integration__form__user=request.user
            )
        except WebhookLog.DoesNotExist:
            return Response({"error": "Log not found"}, status=status.HTTP_404_NOT_FOUND)

        from .utils.form_delivery import deliver_webhook

        new_log = deliver_webhook(log.integration, log.payload)
        return Response({"status": new_log.status})


@extend_schema(tags=["Forms"])
class StripeCheckoutConfirmView(APIView):
    """Confirm Stripe Checkout Session and mark the related submission paid."""

    permission_classes = [AllowAny]

    def post(self, request):
        session_id = (request.data.get("session_id") or "").strip()
        if not session_id:
            return Response(
                {"error": "session_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            submission = FormSubmission.objects.select_related("form").get(
                payment_id=session_id
            )
        except FormSubmission.DoesNotExist:
            return Response(
                {"error": "Submission not found for this session"},
                status=status.HTTP_404_NOT_FOUND,
            )

        integration = submission.form.integrations.filter(
            integration_type="stripe", is_active=True
        ).first()
        secret_key = ((integration.config or {}).get("secret_key") if integration else "") or ""
        if not secret_key:
            return Response(
                {"error": "Stripe is not configured for this form"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import requests

        resp = requests.get(
            f"https://api.stripe.com/v1/checkout/sessions/{session_id}",
            auth=(secret_key, ""),
            timeout=20,
        )
        if resp.status_code >= 400:
            return Response(
                {"error": "Unable to verify Stripe session", "details": resp.text[:200]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = resp.json()
        if session.get("payment_status") == "paid" or session.get("status") == "complete":
            submission.payment_status = "paid"
            submission.save(update_fields=["payment_status"])
            return Response({"status": "paid", "submission_id": str(submission.id)})

        return Response(
            {
                "status": submission.payment_status or "pending",
                "submission_id": str(submission.id),
            }
        )