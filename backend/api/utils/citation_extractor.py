"""
📎 Citation Extractor Module
Extracts and validates citations from sources and generated content
"""

import re
from typing import List, Dict
from urllib.parse import urlparse


class CitationExtractor:
    """
    Extracts, validates, and formats citations from sources and answers
    """
    
    def __init__(self):
        self.citation_pattern = re.compile(r'\[(\d+)\]')
    
    def extract_citations(self, answer: str, sources: List[Dict]) -> Dict:
        """
        Extract citations from answer and match with sources
        
        Args:
            answer: Generated answer text with citation markers
            sources: List of source documents
            
        Returns:
            Dictionary with formatted sources and citation mapping
        """
        # Find all citation numbers in the answer
        cited_indices = set()
        for match in self.citation_pattern.finditer(answer):
            idx = int(match.group(1)) - 1  # Convert to 0-based index
            if 0 <= idx < len(sources):
                cited_indices.add(idx)
        
        # Build formatted sources list
        formatted_sources = []
        
        for idx, source in enumerate(sources):
            is_cited = idx in cited_indices
            
            formatted_source = {
                'id': idx + 1,
                'url': source.get('url', ''),
                'title': source.get('title', 'Untitled'),
                'snippet': source.get('snippet', '')[:300],  # Limit snippet length
                'domain': self._extract_domain(source.get('url', '')),
                'score': source.get('score', 0.0),
                'cited': is_cited,
                'published_date': source.get('published_date', '')
            }
            
            formatted_sources.append(formatted_source)
        
        # Sort: cited sources first, then by score
        formatted_sources.sort(
            key=lambda x: (not x['cited'], -x['score'])
        )
        
        return {
            'sources': formatted_sources,
            'total_sources': len(sources),
            'cited_sources': len(cited_indices)
        }
    
    def calculate_trust_score(
        self, 
        sources: List[Dict], 
        answer: str,
        cited_count: int
    ) -> int:
        """
        Calculate trust/confidence score (0-100)
        
        Based on:
        - Number of high-quality sources
        - Source diversity (different domains)
        - Citation usage
        - Source relevance scores
        
        Args:
            sources: List of source documents
            answer: Generated answer
            cited_count: Number of sources actually cited
            
        Returns:
            Trust score from 0 to 100
        """
        if not sources:
            return 20
        
        # Component scores
        scores = {
            'source_count': 0,
            'source_quality': 0,
            'domain_diversity': 0,
            'citation_usage': 0,
            'relevance': 0
        }
        
        # 1. Source count score (max 20 points)
        source_count = len(sources)
        scores['source_count'] = min(source_count * 2, 20)
        
        # 2. Source quality score (max 25 points)
        avg_score = sum(s.get('score', 0) for s in sources) / len(sources)
        scores['source_quality'] = int(avg_score * 25)
        
        # 3. Domain diversity score (max 20 points)
        domains = set(self._extract_domain(s.get('url', '')) for s in sources)
        domain_count = len(domains)
        scores['domain_diversity'] = min(domain_count * 4, 20)
        
        # 4. Citation usage score (max 20 points)
        if source_count > 0:
            citation_ratio = cited_count / min(source_count, 10)
            scores['citation_usage'] = int(citation_ratio * 20)
        
        # 5. Relevance score (max 15 points)
        # Check if answer length is reasonable (not too short, not too long)
        answer_length = len(answer)
        if 200 <= answer_length <= 2000:
            scores['relevance'] = 15
        elif 100 <= answer_length < 200:
            scores['relevance'] = 10
        else:
            scores['relevance'] = 5
        
        # Calculate total
        total_score = sum(scores.values())
        
        # Cap at 100
        return min(total_score, 100)
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain name from URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc
            # Remove www. prefix
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except (ValueError, TypeError):
            return 'unknown'
    
    def validate_sources(self, sources: List[Dict]) -> List[Dict]:
        """
        Validate and clean source data
        
        Args:
            sources: Raw source list
            
        Returns:
            Validated and cleaned source list
        """
        validated = []
        
        for source in sources:
            # Ensure required fields exist
            if not source.get('url') or not source.get('snippet'):
                continue
            
            # Validate URL
            if not self._is_valid_url(source['url']):
                continue
            
            # Clean snippet
            snippet = source.get('snippet', '').strip()
            if len(snippet) < 20:  # Too short to be useful
                continue
            
            validated.append(source)
        
        return validated
    
    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is valid"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except (ValueError, TypeError):
            return False
    
    def format_for_frontend(
        self, 
        sources: List[Dict], 
        max_display: int = 10
    ) -> List[Dict]:
        """
        Format sources for frontend display
        
        Args:
            sources: Source list
            max_display: Maximum sources to include
            
        Returns:
            Frontend-formatted source list
        """
        formatted = []
        
        for source in sources[:max_display]:
            formatted.append({
                'id': source.get('id', 0),
                'url': source.get('url', ''),
                'title': source.get('title', 'Untitled')[:100],
                'snippet': source.get('snippet', '')[:250] + '...',
                'domain': source.get('domain', 'unknown'),
                'favicon': f"https://www.google.com/s2/favicons?domain={source.get('url', '')}",
                'cited': source.get('cited', False)
            })
        
        return formatted
