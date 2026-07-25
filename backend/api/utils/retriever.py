"""
Web Retriever Module
Fetches relevant web sources using Tavily API.
"""

import asyncio
import os
from typing import Any, Dict, List, Optional

import requests


# Allow mock sources only when explicitly enabled (local demos without API keys).
ALLOW_MOCK_SEARCH = os.getenv("ALLOW_MOCK_SEARCH", "False").lower() in ("1", "true", "yes")

# Tavily topic / domain hints per search mode
_MODE_CONFIG: Dict[str, Dict[str, Any]] = {
    "text": {"topic": "general", "search_depth": "advanced"},
    "news": {"topic": "news", "search_depth": "advanced", "days": 14},
    "academic": {
        "topic": "general",
        "search_depth": "advanced",
        "include_domains": [
            "arxiv.org",
            "scholar.google.com",
            "pubmed.ncbi.nlm.nih.gov",
            "nature.com",
            "science.org",
            "ieee.org",
            "acm.org",
            "springer.com",
            "sciencedirect.com",
        ],
    },
    "code": {
        "topic": "general",
        "search_depth": "advanced",
        "include_domains": [
            "stackoverflow.com",
            "github.com",
            "docs.python.org",
            "developer.mozilla.org",
            "learn.microsoft.com",
            "stackoverflow.com",
            "dev.to",
        ],
    },
    "image": {"topic": "general", "search_depth": "basic", "include_images": True},
}


class RetrievalError(Exception):
    """Raised when web retrieval fails and mocks are disabled."""

    def __init__(self, message: str, *, degraded_reason: str = "retrieval_failed"):
        super().__init__(message)
        self.degraded_reason = degraded_reason


class WebRetriever:
    """Retrieves web search results via Tavily."""

    def __init__(self, api_key: Optional[str] = None):
        self.tavily_api_key = api_key or os.getenv("TAVILY_API_KEY")
        self.tavily_url = "https://api.tavily.com/search"

    async def search(
        self,
        query: str,
        max_results: int = 10,
        search_mode: str = "text",
        source_types: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Search the web for relevant documents.

        Returns:
            {
              "results": [...],
              "degraded": bool,
              "degraded_reason": str | None,
            }
        """
        if not self.tavily_api_key:
            if ALLOW_MOCK_SEARCH:
                return {
                    "results": self._mock_search(query, max_results),
                    "degraded": True,
                    "degraded_reason": "missing_tavily_key",
                }
            raise RetrievalError(
                "Tavily API key is not configured. Set TAVILY_API_KEY or ALLOW_MOCK_SEARCH=true.",
                degraded_reason="missing_tavily_key",
            )

        mode_cfg = dict(_MODE_CONFIG.get(search_mode, _MODE_CONFIG["text"]))

        # Prefer explicit source_types from the client / preferences
        if source_types:
            if "news" in source_types:
                mode_cfg["topic"] = "news"
            if "academic" in source_types and search_mode == "text":
                mode_cfg["include_domains"] = _MODE_CONFIG["academic"]["include_domains"]

        payload: Dict[str, Any] = {
            "api_key": self.tavily_api_key,
            "query": query,
            "search_depth": mode_cfg.get("search_depth", "advanced"),
            "max_results": max_results,
            "include_answer": False,
            "include_raw_content": False,
            "include_images": bool(mode_cfg.get("include_images", False)),
            "topic": mode_cfg.get("topic", "general"),
        }
        if "days" in mode_cfg:
            payload["days"] = mode_cfg["days"]
        if mode_cfg.get("include_domains"):
            payload["include_domains"] = mode_cfg["include_domains"]

        try:

            def do_post():
                response = requests.post(self.tavily_url, json=payload, timeout=30)
                response.raise_for_status()
                return response.json()

            data = await asyncio.to_thread(do_post)

            results = []
            for item in data.get("results", []):
                results.append(
                    {
                        "url": item.get("url", ""),
                        "title": item.get("title", ""),
                        "snippet": item.get("content", ""),
                        "score": item.get("score", 0.0),
                        "published_date": item.get("published_date", ""),
                    }
                )

            if not results:
                return {
                    "results": [],
                    "degraded": True,
                    "degraded_reason": "no_results",
                }

            return {"results": results, "degraded": False, "degraded_reason": None}

        except Exception as exc:
            print(f"Error in Tavily search: {exc}")
            if ALLOW_MOCK_SEARCH:
                return {
                    "results": self._mock_search(query, max_results),
                    "degraded": True,
                    "degraded_reason": "tavily_error",
                }
            raise RetrievalError(
                f"Web search failed: {exc}",
                degraded_reason="tavily_error",
            ) from exc

    def _mock_search(self, query: str, max_results: int) -> List[Dict]:
        """Fallback mock search results for local development only."""
        return [
            {
                "url": f"https://example.com/article-{i}",
                "title": f"[MOCK] Result {i}: {query}",
                "snippet": (
                    f'This is a mock snippet for "{query}". '
                    "Configure TAVILY_API_KEY for real web results."
                ),
                "score": 0.9 - (i * 0.1),
                "published_date": "2025-01-01",
            }
            for i in range(1, min(max_results + 1, 6))
        ]


class PineconeRetriever:
    """Retrieves relevant documents from Pinecone vector database."""

    def __init__(self):
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_env = os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp")
        self.index_name = os.getenv("PINECONE_INDEX_NAME", "ai-search-engine")
        self.index = None

    def initialize(self):
        """Initialize Pinecone connection."""
        try:
            from pinecone import Pinecone, ServerlessSpec

            if not self.pinecone_api_key:
                print("Warning: PINECONE_API_KEY not set")
                return False

            pc = Pinecone(api_key=self.pinecone_api_key)

            if self.index_name not in pc.list_indexes().names():
                pc.create_index(
                    name=self.index_name,
                    dimension=1536,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                )

            self.index = pc.Index(self.index_name)
            return True

        except ImportError:
            print("Warning: pinecone-client not installed")
            return False
        except Exception as e:
            print(f"Error initializing Pinecone: {e}")
            return False

    def search(self, query_embedding: List[float], top_k: int = 10) -> List[Dict]:
        if not self.index:
            return []

        try:
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
            )

            documents = []
            for match in results.get("matches", []):
                documents.append(
                    {
                        "id": match.get("id", ""),
                        "score": match.get("score", 0.0),
                        "metadata": match.get("metadata", {}),
                        "url": match.get("metadata", {}).get("url", ""),
                        "snippet": match.get("metadata", {}).get("text", ""),
                    }
                )
            return documents
        except Exception as e:
            print(f"Error querying Pinecone: {e}")
            return []
