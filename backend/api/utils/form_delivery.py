"""Deliver form submissions to configured integrations."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Any, Dict, Optional

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from api.models import FormIntegration, FormSubmission, WebhookLog

logger = logging.getLogger("api.form_delivery")


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def sign_payload(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def _mark_integration_ok(integration: FormIntegration) -> None:
    integration.last_triggered_at = timezone.now()
    integration.error_message = ""
    integration.save(update_fields=["last_triggered_at", "error_message", "updated_at"])


def _mark_integration_error(integration: FormIntegration, message: str) -> None:
    integration.error_message = (message or "")[:500]
    integration.save(update_fields=["error_message", "updated_at"])


def deliver_webhook(integration: FormIntegration, payload: Dict[str, Any]) -> WebhookLog:
    url = (integration.config or {}).get("url", "")
    secret = (integration.config or {}).get("secret", "") or ""
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "FormForge-Webhook/1.0",
    }
    if secret:
        headers["X-FormForge-Signature"] = sign_payload(body, secret)

    log = WebhookLog.objects.create(
        integration=integration,
        payload=payload,
        status="pending",
    )
    try:
        resp = requests.post(url, data=body, headers=headers, timeout=15)
    except Exception as exc:  # noqa: BLE001
        log.status = "failed"
        log.error_message = str(exc)[:500]
        _mark_integration_error(integration, str(exc))
        logger.exception("Webhook delivery failed")
        log.save()
        return log

    log.response_status_code = resp.status_code
    if 200 <= resp.status_code < 300:
        log.status = "success"
        _mark_integration_ok(integration)
    else:
        log.status = "failed"
        log.error_message = resp.text[:500]
        _mark_integration_error(integration, f"HTTP {resp.status_code}")
    log.save()
    return log


def deliver_email(integration: FormIntegration, payload: Dict[str, Any], form_title: str) -> None:
    recipients = (integration.config or {}).get("recipients") or []
    if isinstance(recipients, str):
        recipients = [r.strip() for r in recipients.split(",") if r.strip()]
    if not recipients:
        return

    lines = [f"New submission for: {form_title}", ""]
    for key, value in (payload.get("data") or {}).items():
        if isinstance(value, dict) and value.get("name"):
            lines.append(f"{key}: [file] {value.get('name')} ({value.get('size', '?')} bytes)")
        else:
            lines.append(f"{key}: {value}")
    body = "\n".join(lines)
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@formforge.local")
    try:
        send_mail(
            subject=f"[FormForge] New submission — {form_title}",
            message=body,
            from_email=from_email,
            recipient_list=recipients,
            fail_silently=True,
        )
        _mark_integration_ok(integration)
    except Exception as exc:  # noqa: BLE001
        _mark_integration_error(integration, str(exc))
        logger.exception("Email delivery failed")


def _refresh_google_token(integration: FormIntegration) -> Optional[str]:
    """Refresh Google OAuth access token when possible. Returns access_token."""
    cfg = dict(integration.config or {})
    access = cfg.get("access_token") or ""
    refresh = cfg.get("refresh_token") or ""
    if not refresh:
        return access or None

    client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or ""
    client_secret = getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "") or ""
    if not client_id or not client_secret:
        return access or None

    try:
        resp = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh,
                "grant_type": "refresh_token",
            },
            timeout=20,
        )
        if resp.status_code >= 400:
            return access or None
        tokens = resp.json()
        new_access = tokens.get("access_token") or access
        cfg["access_token"] = new_access
        if tokens.get("expires_in"):
            cfg["expires_in"] = tokens["expires_in"]
        integration.config = cfg
        integration.save(update_fields=["config", "updated_at"])
        return new_access
    except Exception:  # noqa: BLE001
        logger.exception("Google token refresh failed")
        return access or None


def deliver_google_sheets(integration: FormIntegration, payload: Dict[str, Any]) -> None:
    cfg = integration.config or {}
    spreadsheet_id = cfg.get("spreadsheet_id") or ""
    access_token = _refresh_google_token(integration)
    if not spreadsheet_id or not access_token:
        _mark_integration_error(
            integration,
            "Missing spreadsheet_id or access_token. Reconnect Google Sheets and set a spreadsheet ID.",
        )
        return

    data = payload.get("data") or {}
    headers_row = list(data.keys())
    values_row = []
    for key in headers_row:
        val = data[key]
        if isinstance(val, dict) and val.get("name"):
            values_row.append(f"[file] {val.get('name')}")
        elif isinstance(val, (list, dict)):
            values_row.append(json.dumps(val))
        else:
            values_row.append("" if val is None else str(val))

    # Ensure header row exists on first write, then append data
    range_name = (cfg.get("sheet_range") or "Sheet1").strip() or "Sheet1"
    url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}"
        f"/values/{range_name}!A1:append"
    )
    try:
        # Write header + row if sheet looks empty; otherwise just values
        meta = requests.get(
            f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_name}!A1:Z1",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=20,
        )
        rows = [values_row]
        if meta.status_code < 300:
            existing = (meta.json() or {}).get("values") or []
            if not existing:
                rows = [headers_row, values_row]
        else:
            rows = [headers_row, values_row]

        resp = requests.post(
            url,
            params={"valueInputOption": "USER_ENTERED", "insertDataOption": "INSERT_ROWS"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"values": rows},
            timeout=20,
        )
        if resp.status_code >= 400:
            _mark_integration_error(integration, f"Sheets API {resp.status_code}: {resp.text[:300]}")
            return
        _mark_integration_ok(integration)
    except Exception as exc:  # noqa: BLE001
        _mark_integration_error(integration, str(exc))
        logger.exception("Google Sheets delivery failed")


def deliver_slack(integration: FormIntegration, payload: Dict[str, Any]) -> None:
    cfg = integration.config or {}
    webhook_url = cfg.get("webhook_url") or cfg.get("url") or ""
    if not webhook_url:
        _mark_integration_error(integration, "Missing Slack webhook_url")
        return

    lines = [f"*New FormForge submission:* {payload.get('form_title')}", ""]
    for key, value in (payload.get("data") or {}).items():
        if isinstance(value, dict) and value.get("name"):
            lines.append(f"• *{key}:* [file] {value.get('name')}")
        else:
            lines.append(f"• *{key}:* {value}")
    text = "\n".join(lines)
    try:
        resp = requests.post(webhook_url, json={"text": text}, timeout=15)
        if resp.status_code >= 400:
            _mark_integration_error(integration, f"Slack HTTP {resp.status_code}: {resp.text[:200]}")
            return
        _mark_integration_ok(integration)
    except Exception as exc:  # noqa: BLE001
        _mark_integration_error(integration, str(exc))
        logger.exception("Slack delivery failed")


def deliver_notion(integration: FormIntegration, payload: Dict[str, Any]) -> None:
    cfg = integration.config or {}
    api_key = cfg.get("api_key") or ""
    database_id = cfg.get("database_id") or ""
    if not api_key or not database_id:
        _mark_integration_error(integration, "Missing Notion api_key or database_id")
        return

    # Notion databases require typed properties; use a Title + a rich text dump.
    title = f"Submission {payload.get('submission_id', '')[:8]}"
    props: Dict[str, Any] = {
        "Name": {"title": [{"text": {"content": title[:2000]}}]},
    }
    # Optional generic property if the DB has a "Response" rich_text column
    summary_parts = []
    for key, value in (payload.get("data") or {}).items():
        if isinstance(value, dict) and value.get("name"):
            summary_parts.append(f"{key}: [file] {value.get('name')}")
        else:
            summary_parts.append(f"{key}: {value}")
    summary = "\n".join(summary_parts)[:1900]
    props["Response"] = {"rich_text": [{"text": {"content": summary}}]}

    try:
        resp = requests.post(
            "https://api.notion.com/v1/pages",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
            },
            json={"parent": {"database_id": database_id}, "properties": props},
            timeout=20,
        )
        if resp.status_code >= 400:
            # Retry with Title-only if Response property missing
            if "Response" in (resp.text or ""):
                props.pop("Response", None)
                resp = requests.post(
                    "https://api.notion.com/v1/pages",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json",
                    },
                    json={
                        "parent": {"database_id": database_id},
                        "properties": props,
                        "children": [
                            {
                                "object": "block",
                                "type": "paragraph",
                                "paragraph": {
                                    "rich_text": [{"type": "text", "text": {"content": summary}}]
                                },
                            }
                        ],
                    },
                    timeout=20,
                )
            if resp.status_code >= 400:
                _mark_integration_error(
                    integration, f"Notion HTTP {resp.status_code}: {resp.text[:300]}"
                )
                return
        _mark_integration_ok(integration)
    except Exception as exc:  # noqa: BLE001
        _mark_integration_error(integration, str(exc))
        logger.exception("Notion delivery failed")


def deliver_zapier(integration: FormIntegration, payload: Dict[str, Any]) -> None:
    """Zapier Catch Hooks accept any JSON POST."""
    cfg = integration.config or {}
    url = cfg.get("hook_url") or cfg.get("url") or ""
    if not url:
        _mark_integration_error(integration, "Missing Zapier hook_url")
        return
    body = json.dumps(payload).encode("utf-8")
    try:
        resp = requests.post(
            url,
            data=body,
            headers={"Content-Type": "application/json", "User-Agent": "FormForge-Zapier/1.0"},
            timeout=15,
        )
        if resp.status_code >= 400:
            _mark_integration_error(integration, f"Zapier HTTP {resp.status_code}: {resp.text[:200]}")
            WebhookLog.objects.create(
                integration=integration,
                payload=payload,
                status="failed",
                response_status_code=resp.status_code,
                error_message=resp.text[:500],
            )
            return
        _mark_integration_ok(integration)
        WebhookLog.objects.create(
            integration=integration,
            payload=payload,
            status="success",
            response_status_code=resp.status_code,
        )
    except Exception as exc:  # noqa: BLE001
        _mark_integration_error(integration, str(exc))
        WebhookLog.objects.create(
            integration=integration,
            payload=payload,
            status="failed",
            error_message=str(exc)[:500],
        )
        logger.exception("Zapier delivery failed")


def process_stripe_payment(
    submission: FormSubmission, integration: FormIntegration
) -> Optional[str]:
    """
    Create a Stripe Checkout Session for payment fields.
    Returns checkout URL when created; updates submission payment fields.
    """
    cfg = integration.config or {}
    secret_key = (cfg.get("secret_key") or "").strip()
    if not secret_key:
        _mark_integration_error(integration, "Missing Stripe secret_key")
        return None

    schema_fields = (submission.form.schema_json or {}).get("fields") or []
    amount = submission.payment_amount
    currency = "usd"
    product_name = submission.form.title
    for field in schema_fields:
        if isinstance(field, dict) and field.get("type") == "payment":
            amount = int(field.get("amount") or amount or 0)
            currency = (field.get("currency") or "usd").lower()
            product_name = field.get("label") or product_name
            break

    if not amount or amount <= 0:
        _mark_integration_error(integration, "Payment amount must be > 0")
        return None

    frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    success_url = (
        f"{frontend}/form/{submission.form.slug}"
        f"?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
    )
    cancel_url = f"{frontend}/form/{submission.form.slug}?payment=cancelled"

    try:
        resp = requests.post(
            "https://api.stripe.com/v1/checkout/sessions",
            auth=(secret_key, ""),
            data={
                "mode": "payment",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "line_items[0][price_data][currency]": currency,
                "line_items[0][price_data][unit_amount]": str(amount),
                "line_items[0][price_data][product_data][name]": product_name[:120],
                "line_items[0][quantity]": "1",
                "metadata[submission_id]": str(submission.id),
                "metadata[form_id]": str(submission.form_id),
                "client_reference_id": str(submission.id),
            },
            timeout=20,
        )
        if resp.status_code >= 400:
            _mark_integration_error(integration, f"Stripe {resp.status_code}: {resp.text[:300]}")
            submission.payment_status = "failed"
            submission.save(update_fields=["payment_status"])
            return None

        session = resp.json()
        submission.payment_id = session.get("id", "")
        submission.payment_status = "pending"
        submission.payment_amount = amount
        submission.save(update_fields=["payment_id", "payment_status", "payment_amount"])
        _mark_integration_ok(integration)
        return session.get("url")
    except Exception as exc:  # noqa: BLE001
        _mark_integration_error(integration, str(exc))
        submission.payment_status = "failed"
        submission.save(update_fields=["payment_status"])
        logger.exception("Stripe checkout failed")
        return None


def run_integrations(submission: FormSubmission) -> Optional[str]:
    """
    Fire all active integrations for a submission.
    Returns an optional Stripe Checkout URL when payment is required.
    """
    form = submission.form
    payload = {
        "event": "form.submitted",
        "form_id": str(form.id),
        "form_slug": form.slug,
        "form_title": form.title,
        "submission_id": str(submission.id),
        "data": submission.data,
        "created_at": submission.created_at.isoformat(),
        "payment_status": submission.payment_status,
        "payment_amount": submission.payment_amount,
    }
    checkout_url: Optional[str] = None
    integrations = form.integrations.filter(is_active=True)
    for integration in integrations:
        try:
            itype = integration.integration_type
            if itype == "webhook":
                deliver_webhook(integration, payload)
            elif itype == "email":
                deliver_email(integration, payload, form.title)
            elif itype == "google_sheets":
                deliver_google_sheets(integration, payload)
            elif itype == "slack":
                deliver_slack(integration, payload)
            elif itype == "notion":
                deliver_notion(integration, payload)
            elif itype == "zapier":
                deliver_zapier(integration, payload)
            elif itype == "stripe":
                url = process_stripe_payment(submission, integration)
                if url:
                    checkout_url = url
        except Exception:  # noqa: BLE001
            logger.exception(
                "Integration %s failed for submission %s",
                integration.integration_type,
                submission.id,
            )
    return checkout_url
