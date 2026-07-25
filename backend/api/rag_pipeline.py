"""
RAG Pipeline for AI Search Engine
Orchestrates retrieval, summarization, and citation extraction
"""

import os
from typing import Dict, List, Any, Optional
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
# from langchain.chains import RetrievalQA
# from langchain.prompts import PromptTemplate
from pinecone import Pinecone
import asyncio
from .utils.retriever import WebRetriever
from .utils.summarizer import AnswerSummarizer
from .utils.citation_extractor import CitationExtractor


class RAGPipeline:
    """
    Main RAG pipeline orchestrator for the AI search engine
    """
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.pinecone_api_key = os.getenv('PINECONE_API_KEY')
        self.tavily_api_key = os.getenv('TAVILY_API_KEY')
        
        # Initialize AI provider (Groq preferred, OpenAI fallback)
        self.primary_ai = os.getenv('PRIMARY_AI_PROVIDER', 'openai').lower()
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        self.groq_model = os.getenv('GROQ_MODEL', 'groq-1')
        self.openai_model = os.getenv('OPENAI_MODEL', 'gpt-4-turbo-preview')
        self.ai_fallback_to_openai = os.getenv('AI_FALLBACK_TO_OPENAI', 'True').lower() in ('1','true','yes')

        class GroqAdapter:
            def __init__(self, api_key, model, temperature=0.2):
                self.api_key = api_key
                self.model = model
                self.temperature = temperature
                self.client = None
                try:
                    # Try official groq client (imported lazily to avoid hard dependency)
                    import groq
                    ClientClass = getattr(groq, 'Client', getattr(groq, 'GroqClient', None))
                    if ClientClass is None:
                        raise RuntimeError('No compatible Groq client class found in package')
                    self.client = ClientClass(api_key=api_key)
                except Exception as e:
                    raise RuntimeError(f"Groq client initialization failed: {e}")

            async def ainvoke(self, messages):
                # Concatenate messages into a single prompt
                prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
                try:
                    # Try common client APIs in a best-effort way
                    if hasattr(self.client, 'chat') and hasattr(self.client.chat, 'create'):
                        resp = self.client.chat.create(model=self.model, messages=[{'role':'user','content':prompt}], temperature=self.temperature)
                    elif hasattr(self.client, 'create'):
                        resp = self.client.create(model=self.model, input=prompt, temperature=self.temperature)
                    else:
                        resp = self.client
                except Exception:
                    raise

                class Resp:
                    pass

                r = Resp()
                r.content = getattr(resp, 'text', getattr(resp, 'content', str(resp)))
                r.usage = getattr(resp, 'usage', {})
                return r

            async def astream(self, messages):
                # Non-streaming fallback: yield full content as one chunk
                r = await self.ainvoke(messages)
                yield r.content

        # Select LLM
        try:
            if self.primary_ai == 'groq' and self.groq_api_key:
                try:
                    self.llm = GroqAdapter(self.groq_api_key, self.groq_model, temperature=0.2)
                except Exception as e:
                    print(f"Groq init failed: {e}")
                    if self.ai_fallback_to_openai:
                        self.llm = ChatOpenAI(model=self.openai_model, temperature=0.2, openai_api_key=self.openai_api_key)
                    else:
                        raise
            else:
                # Default to OpenAI
                self.llm = ChatOpenAI(model=self.openai_model, temperature=0.2, openai_api_key=self.openai_api_key)
        except Exception as e:
            print(f"LLM initialization failed, falling back to a mock/no-op LLM: {e}")
            self.llm = None

        # Initialize embeddings (OpenAI by default)
        self.embeddings = None
        try:
            if self.openai_api_key:
                self.embeddings = OpenAIEmbeddings(openai_api_key=self.openai_api_key)
            else:
                print("OPENAI_API_KEY not set, skipping OpenAI embeddings initialization.")
        except Exception as e:
            print(f"OpenAIEmbeddings initialization failed: {e}")
            self.embeddings = None
        
        # Initialize utilities
        self.web_retriever = WebRetriever(self.tavily_api_key)
        self.summarizer = AnswerSummarizer(self.llm)
        self.citation_extractor = CitationExtractor()
        
        # Initialize Pinecone if available
        self._init_pinecone()
    
    def _init_pinecone(self):
        """Initialize Pinecone vector store"""
        try:
            if self.pinecone_api_key:
                pc = Pinecone(api_key=self.pinecone_api_key)
                index_name = os.getenv('PINECONE_INDEX_NAME', 'ai-search-engine')
                
                # Check if index exists, create if not
                if index_name not in pc.list_indexes().names():
                    pc.create_index(
                        name=index_name,
                        dimension=1536,  # OpenAI embedding dimension
                        metric='cosine'
                    )

                if self.embeddings:
                    self.vector_store = PineconeVectorStore(
                        index_name=index_name,
                        embedding=self.embeddings
                    )
                else:
                    print("Pinecone API key provided but embeddings client not initialized; skipping vector store.")
                    self.vector_store = None
            else:
                self.vector_store = None
        except Exception as e:
            print(f"Pinecone initialization failed: {e}")
            self.vector_store = None
    
    async def process_query_stream(
        self,
        query: str,
        search_mode: str = "text",
        max_sources: int = 10,
        source_types: Optional[List[str]] = None,
        enable_followups: bool = True,
        conversation_history: Optional[List[Dict]] = None,
        dedupe_citations: bool = False,
    ):
        """
        Process query and stream results

        Yields:
            Dict events: sources, answer_chunk, metadata, status
        """
        from .utils.plugins import dedupe_sources

        yield {"type": "status", "data": "searching"}

        retrieval = await self.web_retriever.search(
            query,
            max_results=max_sources,
            search_mode=search_mode,
            source_types=source_types or [],
        )
        web_results = retrieval["results"]
        degraded = retrieval.get("degraded", False)
        degraded_reason = retrieval.get("degraded_reason")

        validated_sources = self.citation_extractor.validate_sources(web_results)
        if dedupe_citations:
            validated_sources = dedupe_sources(validated_sources)
        formatted_sources = self.citation_extractor.format_for_frontend(validated_sources)

        yield {"type": "sources", "data": formatted_sources}

        yield {"type": "status", "data": "generating"}
        context = self._create_context(validated_sources)

        full_answer = ""
        async for chunk in self.summarizer.stream_answer(
            query, context, validated_sources, conversation_history=conversation_history
        ):
            full_answer += chunk
            yield {"type": "answer_chunk", "data": chunk}

        citation_info = self.citation_extractor.extract_citations(full_answer, validated_sources)
        trust_score = self.citation_extractor.calculate_trust_score(
            validated_sources, full_answer, citation_info.get("cited_sources", 0)
        )

        followups: List[str] = []
        if enable_followups:
            followups = await self.summarizer.generate_followups(query, full_answer)

        if self.vector_store:
            await self._store_interaction(query, full_answer, validated_sources)

        yield {
            "type": "metadata",
            "data": {
                "trust_score": trust_score,
                "followups": followups,
                "degraded": degraded,
                "degraded_reason": degraded_reason,
            },
        }

    async def process_query(
        self,
        query: str,
        search_mode: str = "text",
        max_sources: int = 10,
        source_types: Optional[List[str]] = None,
        enable_followups: bool = True,
        conversation_history: Optional[List[Dict]] = None,
        dedupe_citations: bool = False,
    ) -> Dict[str, Any]:
        """
        Main entry point for processing user queries.
        """
        from .utils.plugins import dedupe_sources

        # Academic mode defaults to more sources if caller didn't raise the cap
        effective_max = max_sources
        if search_mode == "academic" and max_sources < 15:
            effective_max = min(15, max(max_sources, 12))

        retrieval = await self.web_retriever.search(
            query,
            max_results=effective_max,
            search_mode=search_mode,
            source_types=source_types or [],
        )
        web_results = retrieval["results"]
        degraded = bool(retrieval.get("degraded", False))
        degraded_reason = retrieval.get("degraded_reason")

        validated_sources = self.citation_extractor.validate_sources(web_results)
        if dedupe_citations:
            validated_sources = dedupe_sources(validated_sources)
        context = self._create_context(validated_sources)

        answer_payload = await self.summarizer.generate_answer(
            query,
            context,
            validated_sources,
            conversation_history=conversation_history,
            search_mode=search_mode,
        )
        if isinstance(answer_payload, dict):
            model_used = answer_payload.get("model_used", "")
            answer = answer_payload.get("answer", "")
            if answer_payload.get("degraded"):
                degraded = True
                degraded_reason = answer_payload.get("degraded_reason") or degraded_reason
        else:
            model_used = ""
            answer = answer_payload

        citation_info = self.citation_extractor.extract_citations(answer, validated_sources)
        trust_score = self.citation_extractor.calculate_trust_score(
            validated_sources, answer, citation_info.get("cited_sources", 0)
        )

        followups: List[str] = []
        if enable_followups:
            followups = await self.summarizer.generate_followups(query, answer)

        if self.vector_store:
            await self._store_interaction(query, answer, validated_sources)

        formatted_sources = self.citation_extractor.format_for_frontend(
            citation_info.get("sources", validated_sources)
        )

        return {
            "answer": answer,
            "sources": formatted_sources,
            "trust_score": trust_score,
            "followups": followups,
            "model_used": model_used,
            "degraded": degraded,
            "degraded_reason": degraded_reason,
        }

    async def fact_check_answer(
        self, query: str, answer: str, sources: List[Dict]
    ) -> Dict[str, Any]:
        """
        Fact-check claims in an answer by cross-referencing with sources.
        
        Returns:
            Dict with overall_verdict and list of claims with verdicts.
        """
        if not self.llm:
            return {"overall_verdict": "unverifiable", "claims": []}
        
        try:
            prompt = f"""Analyze the following answer for factual accuracy. Extract up to 5 key claims
and verify each one against the provided sources.

Query: {query}

Answer: {answer}

Sources:
{self._create_context(sources) if isinstance(sources, list) and sources and isinstance(sources[0], dict) else str(sources)[:2000]}

For each claim, respond with a JSON array of objects with keys:
- "claim": the specific claim text
- "verdict": one of "true", "mostly_true", "mixed", "mostly_false", "false", "unverifiable"
- "confidence": a float 0.0 to 1.0
- "explanation": brief reason for the verdict

Respond ONLY with a valid JSON object like:
{{"overall_verdict": "mostly_true", "claims": [...]}}"""

            response = await self.llm.ainvoke([{"role": "user", "content": prompt}])
            content = response.content.strip()
            
            # Try to parse JSON from the response
            import json
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return result
            
            return {"overall_verdict": "unverifiable", "claims": []}
        except Exception as e:
            print(f"Fact check failed: {e}")
            return {"overall_verdict": "unverifiable", "claims": []}
    
    def _create_context(self, web_results: List[Dict]) -> str:
        """
        Create formatted context from web results
        
        Args:
            web_results: List of retrieved documents
            
        Returns:
            Formatted context string
        """
        context_parts = []
        
        for idx, result in enumerate(web_results[:10], 1):
            title = result.get('title', 'No title')
            content = result.get('content', result.get('snippet', ''))
            url = result.get('url', '')
            
            context_parts.append(
                f"[{idx}] {title}\n"
                f"Source: {url}\n"
                f"Content: {content}\n"
            )
        
        return "\n---\n".join(context_parts)
    
    def _calculate_trust_score(self, web_results: List[Dict], answer: str) -> int:
        """
        Calculate trust score based on result consistency and quality
        
        Args:
            web_results: Retrieved documents
            answer: Generated answer
            
        Returns:
            Trust score (0-100)
        """
        score = 50  # Base score
        
        # Factor 1: Number of sources (max +20)
        num_sources = len(web_results)
        score += min(num_sources * 2, 20)
        
        # Factor 2: Source diversity (check domain variety)
        domains = set()
        for result in web_results:
            url = result.get('url', '')
            if url:
                domain = url.split('/')[2] if len(url.split('/')) > 2 else ''
                domains.add(domain)
        
        domain_diversity = len(domains)
        score += min(domain_diversity * 3, 15)
        
        # Factor 3: Content relevance (check if key terms appear in multiple sources)
        if len(web_results) >= 3:
            score += 10
        
        # Factor 4: Answer length and completeness
        if len(answer) > 200:
            score += 5
        
        return min(max(score, 0), 100)
    
    async def _store_interaction(self, query: str, answer: str, sources: List[Dict]):
        """
        Store query-answer pair in vector database
        
        Args:
            query: User query
            answer: Generated answer
            sources: List of sources
        """
        try:
            if self.vector_store:
                metadata = {
                    'query': query,
                    'answer': answer,
                    'source_count': len(sources),
                    'timestamp': str(asyncio.get_event_loop().time())
                }
                
                # Store the interaction
                await asyncio.to_thread(
                    self.vector_store.add_texts,
                    texts=[f"{query}\n{answer}"],
                    metadatas=[metadata]
                )
        except Exception as e:
            print(f"Failed to store interaction: {e}")
    
    def get_similar_queries(self, query: str, k: int = 3) -> List[Dict]:
        """
        Retrieve similar past queries from vector store
        
        Args:
            query: Current query
            k: Number of similar queries to retrieve
            
        Returns:
            List of similar past interactions
        """
        if not self.vector_store:
            return []
        
        try:
            results = self.vector_store.similarity_search(query, k=k)
            return [
                {
                    'query': doc.metadata.get('query', ''),
                    'answer': doc.metadata.get('answer', ''),
                    'relevance': 'high'
                }
                for doc in results
            ]
        except Exception as e:
            print(f"Failed to retrieve similar queries: {e}")
            return []
