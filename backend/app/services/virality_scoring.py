"""
Simple virality scoring service for legal articles.
Manual on-demand scoring, not automatic.
"""

import re
import logging
from typing import List, Tuple

from app.models.article import NormalizedArticle

logger = logging.getLogger(__name__)


class ViralityScoringService:
    """Service for calculating virality scores for legal articles"""
    
    def __init__(self):
        # Keywords that indicate high virality potential
        self.high_virality_keywords = [
            # Court indicators
            r'\bSupreme Court\b', r'\bHigh Court\b', r'\bSC\b', r'\bHC\b',
            # Case types
            r'\blandmark\b', r'\bprecedent\b', r'\bconstitutional\b', r'\bfundamental rights\b',
            # High-interest topics
            r'\bprivacy\b', r'\bfree speech\b', r'\bcorruption\b', r'\bcorporate\b',
            r'\bstartup\b', r'\btech\b', r'\bAI\b', r'\bdata protection\b',
            # Emotional triggers
            r'\bcontroversial\b', r'\bshocking\b', r'\bbreaking\b', r'\bexclusive\b'
        ]
        
        # Keywords that indicate lower virality
        self.low_virality_keywords = [
            r'\bprocedural\b', r'\btechnical\b', r'\badministrative\b', r'\bminor\b',
            r'\broutine\b', r'\bstandard\b', r'\binternal\b'
        ]
    
    def calculate_virality_score(self, article: NormalizedArticle) -> float:
        """Calculate virality score for an article (0.0 to 1.0)"""
        content = f"{article.title} {article.summary_hint or ''} {article.raw_excerpt or ''}"
        content_lower = content.lower()
        
        score = 0.0
        
        # Base score based on content length and richness
        if len(content) > 200:
            score += 0.2
        elif len(content) > 100:
            score += 0.1
        
        # High virality keyword scoring
        high_virality_hits = 0
        for keyword in self.high_virality_keywords:
            if re.search(keyword, content_lower, re.IGNORECASE):
                high_virality_hits += 1
        
        score += min(high_virality_hits * 0.15, 0.5)  # Max 0.5 from keywords
        
        # Low virality keyword penalty
        low_virality_hits = 0
        for keyword in self.low_virality_keywords:
            if re.search(keyword, content_lower, re.IGNORECASE):
                low_virality_hits += 1
        
        score -= min(low_virality_hits * 0.1, 0.3)  # Max 0.3 penalty
        
        # Source authority bonus
        if article.source and any(auth in article.source.lower() 
                                 for auth in ['supreme court', 'high court', 'sc', 'hc']):
            score += 0.2
        
        # Normalize to 0.0-1.0 range
        score = max(0.0, min(1.0, score))
        
        return round(score, 2)
    
    def filter_high_virality_articles(self, articles: List[NormalizedArticle], 
                                    threshold: float = 0.5) -> List[Tuple[NormalizedArticle, float]]:
        """Filter articles with virality score above threshold"""
        scored_articles = []
        for article in articles:
            score = self.calculate_virality_score(article)
            if score >= threshold:
                scored_articles.append((article, score))
        
        # Sort by score descending
        scored_articles.sort(key=lambda x: x[1], reverse=True)
        return scored_articles