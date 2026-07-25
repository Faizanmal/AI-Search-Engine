"""Generate FormForge schemas from natural-language prompts."""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from typing import Any, Dict, Optional

logger = logging.getLogger("api.form_generator")

SYSTEM_PROMPT = """You are FormForge, an expert form designer.
Return ONLY valid JSON matching this schema (no markdown fences):
{
  "title": "string",
  "description": "string",
  "fields": [
    {
      "id": "field_1",
      "type": "text|email|phone|textarea|number|date|time|select|multiselect|checkbox|radio|url",
      "label": "string",
      "placeholder": "string",
      "required": true,
      "options": ["only for select/radio/multiselect"],
      "help": "optional"
    }
  ],
  "logic": [],
  "settings": {
    "consent_text": "",
    "redirect": "/thank-you"
  }
}
Create 4-10 practical fields. Use snake_case-style ids like field_name.
"""


def _fallback_schema(prompt: str, context: str = "") -> Dict[str, Any]:
    title = (prompt[:80] + "…") if len(prompt) > 80 else prompt or "Untitled Form"
    title = title.strip().rstrip("…") or "Untitled Form"
    return {
        "title": title.title() if len(title) < 60 else "Custom Form",
        "description": context or f"Form generated from: {prompt[:200]}",
        "fields": [
            {
                "id": "full_name",
                "type": "text",
                "label": "Full Name",
                "placeholder": "Jane Doe",
                "required": True,
            },
            {
                "id": "email",
                "type": "email",
                "label": "Email",
                "placeholder": "you@example.com",
                "required": True,
            },
            {
                "id": "phone",
                "type": "phone",
                "label": "Phone",
                "placeholder": "+1 555 000 0000",
                "required": False,
            },
            {
                "id": "message",
                "type": "textarea",
                "label": "Additional Details",
                "placeholder": "Tell us more…",
                "required": False,
            },
        ],
        "logic": [],
        "settings": {
            "consent_text": "By submitting, you agree to be contacted about this request.",
            "redirect": "/thank-you",
        },
    }


def _extract_json(text: str) -> Dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _normalize_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    fields = schema.get("fields") or []
    normalized = []
    for i, field in enumerate(fields):
        if not isinstance(field, dict):
            continue
        fid = str(field.get("id") or f"field_{i + 1}")
        ftype = str(field.get("type") or "text")
        item: Dict[str, Any] = {
            "id": fid,
            "type": ftype,
            "label": str(field.get("label") or fid.replace("_", " ").title()),
            "required": bool(field.get("required", False)),
        }
        if field.get("placeholder"):
            item["placeholder"] = str(field["placeholder"])
        if field.get("help"):
            item["help"] = str(field["help"])
        if field.get("options") and isinstance(field["options"], list):
            item["options"] = [str(o) for o in field["options"]]
        if ftype == "payment":
            item["amount"] = int(field.get("amount") or 0)
            item["currency"] = str(field.get("currency") or "usd")
        normalized.append(item)

    return {
        "title": str(schema.get("title") or "Untitled Form"),
        "description": str(schema.get("description") or ""),
        "fields": normalized,
        "logic": schema.get("logic") or [],
        "settings": schema.get("settings")
        or {"consent_text": "", "redirect": "/thank-you"},
    }


def generate_form_schema(prompt: str, context: str = "") -> Dict[str, Any]:
    """Generate a form schema via OpenAI, with deterministic fallback."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    placeholder_keys = ("your_openai", "your-api", "changeme", "sk-xxx")
    if not api_key or any(p in api_key.lower() for p in placeholder_keys):
        logger.warning("OPENAI_API_KEY missing/invalid — using fallback form schema")
        return _normalize_schema(_fallback_schema(prompt, context))

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        user_content = f"Prompt: {prompt}"
        if context:
            user_content += f"\nContext: {context}"

        response = client.chat.completions.create(
            model=model,
            temperature=0.3,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        schema = _extract_json(content)
        return _normalize_schema(schema)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Form generation failed: %s", exc)
        return _normalize_schema(_fallback_schema(prompt, context))


def unique_slug(base: str, model_cls, exclude_pk: Optional[Any] = None) -> str:
    """Create a unique slug from a title."""
    from django.utils.text import slugify

    slug = slugify(base)[:200] or f"form-{uuid.uuid4().hex[:8]}"
    candidate = slug
    n = 1
    qs = model_cls.objects.all()
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    while qs.filter(slug=candidate).exists():
        n += 1
        candidate = f"{slug}-{n}"
    return candidate


# Seed templates used when DB has none
BUILTIN_TEMPLATES = [
    {
        "name": "Client Intake — Photography",
        "description": "Wedding / event photography intake with package interest.",
        "category": "photography",
        "is_featured": True,
        "schema_json": {
            "title": "Photography Client Intake",
            "description": "Tell us about your upcoming event.",
            "fields": [
                {"id": "client_name", "type": "text", "label": "Client Name", "required": True},
                {"id": "email", "type": "email", "label": "Email", "required": True},
                {"id": "event_date", "type": "date", "label": "Event Date", "required": True},
                {"id": "location", "type": "text", "label": "Location", "required": True},
                {
                    "id": "guests",
                    "type": "number",
                    "label": "Estimated Guest Count",
                    "required": False,
                },
                {
                    "id": "package",
                    "type": "select",
                    "label": "Package Interest",
                    "required": True,
                    "options": ["Basic", "Standard", "Premium"],
                },
            ],
            "settings": {"redirect": "/thank-you", "consent_text": ""},
        },
    },
    {
        "name": "Gym Membership Sign-up",
        "description": "Fitness membership form with goals and medical notes.",
        "category": "fitness",
        "is_featured": True,
        "schema_json": {
            "title": "Gym Membership Sign-up",
            "description": "Join our gym in a few steps.",
            "fields": [
                {"id": "full_name", "type": "text", "label": "Full Name", "required": True},
                {"id": "email", "type": "email", "label": "Email", "required": True},
                {"id": "phone", "type": "phone", "label": "Phone", "required": True},
                {
                    "id": "goals",
                    "type": "textarea",
                    "label": "Fitness Goals",
                    "required": False,
                },
                {
                    "id": "medical",
                    "type": "textarea",
                    "label": "Medical History / Notes",
                    "required": False,
                },
            ],
            "settings": {"redirect": "/thank-you"},
        },
    },
    {
        "name": "General Contact Form",
        "description": "Simple contact / inquiry form.",
        "category": "general",
        "is_featured": False,
        "schema_json": {
            "title": "Contact Us",
            "description": "We typically reply within one business day.",
            "fields": [
                {"id": "name", "type": "text", "label": "Name", "required": True},
                {"id": "email", "type": "email", "label": "Email", "required": True},
                {"id": "subject", "type": "text", "label": "Subject", "required": False},
                {"id": "message", "type": "textarea", "label": "Message", "required": True},
            ],
            "settings": {"redirect": "/thank-you"},
        },
    },
]
