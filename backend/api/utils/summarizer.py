"""🧠 Summarizer Module
Generates concise summaries and synthesizes information from multiple sources
"""

import os
from typing import List, Dict, Optional
from openai import OpenAI


class AnswerSummarizer:
    """
    Uses LangChain LLM to summarize and synthesize information from retrieved sources
    """
    
    def __init__(self, llm):
        self.llm = llm
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4-turbo-preview')
        self.temperature = 0.2
        
    async def generate_answer(
        self, 
        query: str, 
        context: str,
        sources: List[Dict],
        conversation_history: Optional[List[Dict]] = None,
        search_mode: str = "text"
    ) -> Dict:
        """
        Generate a comprehensive summary from multiple sources
        
        Args:
            query: User's original query
            sources: List of retrieved source documents
            conversation_history: Optional chat history for context
            
        Returns:
            Dictionary with answer, confidence, and metadata
        """
        if not self.llm:
            return self._mock_summary(query, context, sources)
        
        try:
            # Use provided context
            
            # Create system prompt based on search mode
            mode_instructions = {
                "text": "Provide a comprehensive, general-purpose answer.",
                "academic": "Focus on peer-reviewed sources, cite methodologies, and use formal academic language. Prioritize research papers and scholarly articles.",
                "news": "Focus on the most recent news and developments. Prioritize timeliness and provide event context with dates.",
                "code": "Focus on code examples, technical documentation, and implementation details. Include code snippets in markdown code blocks.",
                "image": "Describe visual content, provide relevant image context, and explain visual elements referenced in sources.",
            }
            mode_instruction = mode_instructions.get(search_mode, mode_instructions["text"])

            system_prompt = f"""You are an expert AI research assistant similar to Perplexity AI.
Your task is to provide accurate, well-researched answers based on the provided sources.

SEARCH MODE: {search_mode.upper()}
{mode_instruction}

GUIDELINES:
1. Synthesize information from multiple sources
2. Be concise yet comprehensive
3. Use markdown formatting for readability
4. Include specific facts and data when available
5. Cite sources using [1], [2], etc. notation
6. Admit uncertainty when sources conflict or lack information
7. Focus on the most relevant and recent information

Always prioritize accuracy and cite your sources."""

            # Build user message
            user_message = f"""Query: {query}

Sources:
{context}

Please provide a comprehensive answer to the query based on the sources above. Use inline citations like [1], [2] to reference specific sources."""

            # Add conversation history if provided
            messages = [{"role": "system", "content": system_prompt}]
            
            if conversation_history:
                messages.extend(conversation_history)
            
            messages.append({"role": "user", "content": user_message})
            
            # Generate response
            response = await self.llm.ainvoke(messages)
            
            answer = response.content
            
            return {
                'answer': answer,
                'model_used': self.model,
                'tokens_used': getattr(response, 'usage', {}).get('total_tokens', 0) if hasattr(response, 'usage') else 0
            }
            
        except Exception as e:
            print(f"Error in summarization: {str(e)}")
            return self._mock_summary(query, context, sources)
    
    async def generate_followups(self, query: str, answer: str) -> List[str]:
        """
        Generate follow-up questions based on the query and answer
        
        Args:
            query: Original user query
            answer: Generated answer
            
        Returns:
            List of suggested follow-up questions
        """
        if not self.llm:
            return self._mock_followups(query)
        
        try:
            prompt = f"""Based on this query and answer, suggest 3 relevant follow-up questions that a user might ask next.

Query: {query}

Answer: {answer}

Generate exactly 3 short, specific follow-up questions (one per line, no numbering):"""

            response = await self.llm.ainvoke([{"role": "user", "content": prompt}])
            
            followups = response.content.strip().split('\n')
            # Clean up and limit to 3
            followups = [q.strip().lstrip('- ').lstrip('• ').lstrip('* ') 
                        for q in followups if q.strip()][:3]
            
            return followups
            
        except Exception as e:
            print(f"Error generating follow-ups: {str(e)}")
            return self._mock_followups(query)
    
    def _build_context(self, sources: List[Dict]) -> str:
        """Build formatted context from sources"""
        context_parts = []
        
        for idx, source in enumerate(sources[:10], 1):
            title = source.get('title', 'Untitled')
            snippet = source.get('snippet', '')
            url = source.get('url', '')
            
            context_parts.append(
                f"[{idx}] {title}\n"
                f"URL: {url}\n"
                f"{snippet}\n"
            )
        
        return '\n'.join(context_parts)
    
    async def stream_answer(
        self, 
        query: str, 
        context: str,
        sources: List[Dict],
        conversation_history: Optional[List[Dict]] = None
    ):
        """
        Stream the answer generator from retrieved sources
        
        Args:
            query: User's original query
            context: Formatted context from sources
            sources: List of retrieved source documents
            conversation_history: Optional chat history for context
            
        Yields:
            Chunks of the generated answer
        """
        if not self.llm:
            # Mock stream
            mock_resp = self._mock_summary(query, context, sources)['answer']
            import asyncio
            for char in mock_resp:
                yield char
                await asyncio.sleep(0.01)
            return
        
        try:
            # Create system prompt
            system_prompt = """You are an expert AI research assistant similar to Perplexity AI.
Your task is to provide accurate, well-researched answers based on the provided sources.

GUIDELINES:
1. Synthesize information from multiple sources
2. Be concise yet comprehensive
3. Use markdown formatting for readability
4. Include specific facts and data when available
5. Cite sources using [1], [2], etc. notation
6. Admit uncertainty when sources conflict or lack information
7. Focus on the most relevant and recent information

Always prioritize accuracy and cite your sources."""

            # Build user message
            user_message = f"""Query: {query}

Sources:
{context}

Please provide a comprehensive answer to the query based on the sources above. Use inline citations like [1], [2] to reference specific sources."""

            # Add conversation history if provided
            messages = [{"role": "system", "content": system_prompt}]
            
            if conversation_history:
                messages.extend(conversation_history)
            
            messages.append({"role": "user", "content": user_message})
            
            # Generate response stream
            async for chunk in self.llm.astream(messages):
                if chunk.content:
                    yield chunk.content
            
        except Exception as e:
            print(f"Error in streaming summarization: {str(e)}")
            yield "I encountered an error while synthesizing the answer. Please try again."

    def _mock_summary(self, query: str, context: str, sources: List[Dict]) -> Dict:
        """Fallback mock summary for development"""
        source_count = len(sources)
        
        answer = f"""Based on the available sources, here's what I found about "{query}":

The research indicates several key points about this topic [1][2]. Multiple sources confirm the relevance and importance of this subject matter [3].

**Key Findings:**
- Primary insight from source analysis
- Secondary supporting information
- Additional context and details

This information is synthesized from {source_count} sources to provide a comprehensive overview.

*Note: Using mock response mode. Configure OPENAI_API_KEY for full functionality.*"""
        
        return {
            'answer': answer,
            'model_used': 'mock',
            'tokens_used': 0
        }
    
    def _mock_followups(self, query: str) -> List[str]:
        """Fallback mock follow-ups"""
        return [
            f"What are the implications of {query}?",
            f"How does {query} compare to alternatives?",
            f"What are the latest developments in {query}?"
        ]
