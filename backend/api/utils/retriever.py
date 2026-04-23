"""
🔍 Web Retriever Module
Fetches relevant web sources using Tavily API or SerpAPI
"""

import os
import requests
from typing import List, Dict, Optional


class WebRetriever:
    """
    Retrieves web search results for a given query using Tavily API.

    Args:
        api_key: Optional API key to override environment variable.

    Note: `search` is async and should be awaited by the caller.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.tavily_api_key = api_key or os.getenv('TAVILY_API_KEY')
        self.tavily_url = "https://api.tavily.com/search"
        
    async def search(self, query: str, max_results: int = 10) -> List[Dict]:
        """
        Async search the web for relevant documents
        
        Args:
            query: User search query
            max_results: Maximum number of results to return
            
        Returns:
            List of dictionaries containing search results with url, title, snippet
        """
        if not self.tavily_api_key:
            # Fallback to mock data if no API key
            return self._mock_search(query, max_results)
        
        try:
            payload = {
                "api_key": self.tavily_api_key,
                "query": query,
                "search_depth": "advanced",
                "max_results": max_results,
                "include_answer": False,
                "include_raw_content": False,
                "include_images": False
            }

            # Run blocking requests.post in thread pool to avoid blocking event loop
            def do_post():
                response = requests.post(self.tavily_url, json=payload, timeout=30)
                response.raise_for_status()
                return response.json()

            data = await __import__('asyncio').to_thread(do_post)

            results = []
            for item in data.get('results', []):
                results.append({
                    'url': item.get('url', ''),
                    'title': item.get('title', ''),
                    'snippet': item.get('content', ''),
                    'score': item.get('score', 0.0),
                    'published_date': item.get('published_date', '')
                })
            
            return results
            
        except Exception as e:
            print(f"Error in Tavily search: {str(e)}")
            return self._mock_search(query, max_results)
    
    def _mock_search(self, query: str, max_results: int) -> List[Dict]:
        """
        Fallback mock search results for development/testing
        """
        return [
            {
                'url': f'https://example.com/article-{i}',
                'title': f'Result {i}: {query}',
                'snippet': f'This is a relevant snippet for "{query}". It contains useful information about the topic.',
                'score': 0.9 - (i * 0.1),
                'published_date': '2025-01-01'
            }
            for i in range(1, min(max_results + 1, 6))
        ]


class PineconeRetriever:
    """
    Retrieves relevant documents from Pinecone vector database
    """
    
    def __init__(self):
        self.pinecone_api_key = os.getenv('PINECONE_API_KEY')
        self.pinecone_env = os.getenv('PINECONE_ENVIRONMENT', 'us-west1-gcp')
        self.index_name = os.getenv('PINECONE_INDEX', 'perplexity-ai')
        self.index = None
        
    def initialize(self):
        """Initialize Pinecone connection"""
        try:
            from pinecone import Pinecone, ServerlessSpec
            
            if not self.pinecone_api_key:
                print("Warning: PINECONE_API_KEY not set")
                return False
            
            pc = Pinecone(api_key=self.pinecone_api_key)
            
            # Check if index exists, create if not
            if self.index_name not in pc.list_indexes().names():
                pc.create_index(
                    name=self.index_name,
                    dimension=1536,  # OpenAI embedding dimension
                    metric='cosine',
                    spec=ServerlessSpec(
                        cloud='aws',
                        region='us-east-1'
                    )
                )
            
            self.index = pc.Index(self.index_name)
            return True
            
        except ImportError:
            print("Warning: pinecone-client not installed")
            return False
        except Exception as e:
            print(f"Error initializing Pinecone: {str(e)}")
            return False
    
    def search(self, query_embedding: List[float], top_k: int = 10) -> List[Dict]:
        """
        Search Pinecone for similar vectors
        
        Args:
            query_embedding: Query vector embedding
            top_k: Number of results to return
            
        Returns:
            List of matching documents with metadata
        """
        if not self.index:
            return []
        
        try:
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
            
            documents = []
            for match in results.get('matches', []):
                documents.append({
                    'id': match.get('id', ''),
                    'score': match.get('score', 0.0),
                    'metadata': match.get('metadata', {}),
                    'url': match.get('metadata', {}).get('url', ''),
                    'snippet': match.get('metadata', {}).get('text', '')
                })
            
            return documents
            
        except Exception as e:
            print(f"Error querying Pinecone: {str(e)}")
            return []
