"""Seed builtin search plugins and FormForge templates."""

from django.core.management.base import BaseCommand

from api.models import FormTemplate, Plugin
from api.utils.form_generator import BUILTIN_TEMPLATES


DEFAULT_PLUGINS = [
    {
        "name": "Academic Papers Boost",
        "slug": "academic-papers",
        "description": "Prioritize peer-reviewed and academic sources in search results.",
        "category": "search",
        "icon": "graduation-cap",
        "author": "SearchEngine",
        "version": "1.0.0",
        "is_builtin": True,
    },
    {
        "name": "News Pulse",
        "slug": "news-pulse",
        "description": "Bias retrieval toward recent news articles and press coverage.",
        "category": "search",
        "icon": "newspaper",
        "author": "SearchEngine",
        "version": "1.0.0",
        "is_builtin": True,
    },
    {
        "name": "Citation Cleaner",
        "slug": "citation-cleaner",
        "description": "Normalize and deduplicate source citations in answers.",
        "category": "transform",
        "icon": "filter",
        "author": "SearchEngine",
        "version": "1.1.0",
        "is_builtin": True,
    },
    {
        "name": "Markdown Exporter",
        "slug": "markdown-export",
        "description": "Export search answers as clean Markdown with footnotes.",
        "category": "export",
        "icon": "file-text",
        "author": "SearchEngine",
        "version": "1.0.0",
        "is_builtin": True,
    },
    {
        "name": "PDF Briefing Pack",
        "slug": "pdf-briefing",
        "description": "Generate a concise PDF briefing from a search thread.",
        "category": "export",
        "icon": "file-down",
        "author": "SearchEngine",
        "version": "1.0.0",
        "is_builtin": True,
    },
    {
        "name": "Fact Check Assist",
        "slug": "fact-check-assist",
        "description": "Run an extra claim verification pass on high-stakes answers.",
        "category": "tool",
        "icon": "shield-check",
        "author": "SearchEngine",
        "version": "1.0.0",
        "is_builtin": True,
    },
]


class Command(BaseCommand):
    help = "Seed builtin plugins and FormForge templates"

    def handle(self, *args, **options):
        created_plugins = 0
        for item in DEFAULT_PLUGINS:
            _, was_created = Plugin.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    **item,
                    "is_active": True,
                    "config_schema": {},
                },
            )
            if was_created:
                created_plugins += 1

        created_templates = 0
        for tpl in BUILTIN_TEMPLATES:
            schema = tpl.get("schema_json") or {}
            name = tpl.get("name") or schema.get("title") or "Untitled"
            _, was_created = FormTemplate.objects.update_or_create(
                name=name,
                defaults={
                    "description": tpl.get("description") or schema.get("description") or "",
                    "category": tpl.get("category") or "general",
                    "schema_json": schema,
                    "is_featured": bool(tpl.get("is_featured", False)),
                    "thumbnail_url": tpl.get("thumbnail_url") or "",
                },
            )
            if was_created:
                created_templates += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Plugins: {created_plugins} created / {len(DEFAULT_PLUGINS)} total. "
                f"Templates: {created_templates} created / {len(BUILTIN_TEMPLATES)} total."
            )
        )
