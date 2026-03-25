#!/usr/bin/env python3
"""
Test script for the enhanced content intelligence system.
This script tests the new features without breaking existing functionality.
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

from app.models.article import NormalizedArticle, ContentIntelligence
from app.services.content_intelligence import ContentIntelligenceService
from app.llm.service import LLMService
from app.sources import rss as rss_sources
from app.core.config import get_settings


async def test_content_intelligence():
    """Test the content intelligence service"""
    print("🧪 Testing Content Intelligence System")
    print("=" * 50)
    
    # Create a mock LLM service (using stub for testing)
    llm_service = LLMService()
    
    # Create a test article
    test_article = NormalizedArticle(
        id="test-article-001",
        source="TestSource",
        title="Supreme Court delivers landmark judgment on data privacy rights",
        url="https://example.com/test-article",
        summary_hint="In a historic decision, the Supreme Court has ruled on...",
        published_at=datetime.now(),
        full_content="""
        In a landmark judgment that could reshape India's digital landscape, the Supreme Court 
        delivered a comprehensive ruling on data privacy rights today. The bench, comprising 
        Chief Justice D.Y. Chandrachud and Justices L. Nageswara Rao and S. Ravindra Bhat, 
        held that the right to privacy is an intrinsic part of the right to life and personal 
        liberty under Article 21 of the Constitution.
        
        The case, which has been pending for over two years, arose from a challenge to the 
        government's Aadhaar biometric identification program. The petitioners argued that 
        the mandatory linking of Aadhaar with various services violated citizens' fundamental 
        right to privacy.
        
        Key aspects of the judgment:
        1. The Court held that privacy is a fundamental right protected under Article 21
        2. The ruling sets strict guidelines for data collection and processing by both 
           government and private entities
        3. The Court emphasized the need for informed consent in data collection
        4. The judgment provides a framework for balancing national security concerns with 
           individual privacy rights
        
        Legal experts are calling this one of the most significant privacy judgments in 
        India's history, comparing it to the Puttaswamy judgment of 2017 that first 
        recognized privacy as a fundamental right.
        
        The ruling is expected to have far-reaching implications for various sectors 
        including technology, finance, healthcare, and e-commerce, which rely heavily 
        on personal data collection and processing.
        """
    )
    
    # Test the content intelligence service
    intelligence_service = ContentIntelligenceService(llm_service)
    
    print(" Processing article with content intelligence...")
    try:
        processed_article = await intelligence_service.process_article(test_article)
        
        print(" Article processed successfully!")
        print(f"   - Article ID: {processed_article.id}")
        print(f"   - Court: {processed_article.court_name}")
        print(f"   - Judges: {', '.join(processed_article.judges_involved)}")
        print(f"   - Structured Summary: {processed_article.structured_summary[:100]}...")
        
        intelligence = processed_article.content_intelligence
        print(f"   - Topic: {intelligence.topic}")
        print(f"   - Legal Area: {intelligence.legal_area}")
        print(f"   - Audience: {', '.join(intelligence.audience)}")
        print(f"   - Angle: {intelligence.angle}")
        print(f"   - Virality Score: {intelligence.virality_score}")
        print(f"   - Key Insights: {len(intelligence.key_insights)} insights extracted")
        
        return True
        
    except Exception as e:
        print(f" Error processing article: {e}")
        return False


async def test_rss_enhancement():
    """Test the enhanced RSS functionality"""
    print("\n Testing Enhanced RSS Processing")
    print("=" * 50)
    
    try:
        # Test deduplication
        articles = [
            NormalizedArticle(
                id="dup1", source="Test", title="Test Article", url="http://test1.com", 
                summary_hint="Test content"
            ),
            NormalizedArticle(
                id="dup2", source="Test", title="Test Article", url="http://test2.com", 
                summary_hint="Test content"
            )
        ]
        
        unique_articles = rss_sources.deduplicate_articles(articles)
        print(f" Deduplication: {len(articles)} → {len(unique_articles)} articles")
        
        # Test virality scoring
        scored_articles = rss_sources.score_articles_for_virality(unique_articles)
        for article in scored_articles:
            print(f"   - Article '{article.title}': Virality Score = {article.content_intelligence.virality_score}")
        
        return True
        
    except Exception as e:
        print(f" Error in RSS enhancement: {e}")
        return False


async def test_engagement_service():
    """Test the engagement service"""
    print("\n Testing Engagement Service")
    print("=" * 50)
    
    try:
        from app.services.engagement import EngagementService
        from app.models.engagement import Engagement
        
        # Create mock services
        llm_service = LLMService()
        # Note: PlatformDispatcher would need to be mocked for full testing
        
        engagement_service = EngagementService(llm_service, None)
        
        # Test comment filtering
        test_comments = [
            Engagement(id="c1", content="This is a great article!", platform="linkedin", author="User1"),
            Engagement(id="c2", content="How does this affect startups?", platform="twitter", author="User2"),
            Engagement(id="c3", content="What is the timeline for implementation?", platform="linkedin", author="User3"),
            Engagement(id="c4", content="Thanks for sharing this information.", platform="twitter", author="User4"),
        ]
        
        filtered = engagement_service.filter_high_intent_comments(test_comments)
        print(f" Comment filtering: {len(test_comments)} → {len(filtered)} high-intent comments")
        
        for comment in filtered:
            print(f"   - '{comment.content}' ({comment.platform})")
        
        return True
        
    except Exception as e:
        print(f" Error in engagement service: {e}")
        return False


async def main():
    """Run all tests"""
    print("Starting Enhanced Content Intelligence Tests")
    print("=" * 60)
    
    results = []
    
    # Test 1: Content Intelligence
    results.append(await test_content_intelligence())
    
    # Test 2: RSS Enhancement
    results.append(await test_rss_enhancement())
    
    # Test 3: Engagement Service
    results.append(await test_engagement_service())
    
    # Summary
    print("\n Test Results Summary")
    print("=" * 50)
    
    test_names = ["Content Intelligence", "RSS Enhancement", "Engagement Service"]
    for i, (name, result) in enumerate(zip(test_names, results)):
        status = " PASSED" if result else "❌ FAILED"
        print(f"{i+1}. {name}: {status}")
    
    total_passed = sum(results)
    print(f"\n Overall: {total_passed}/{len(results)} tests passed")
    
    if total_passed == len(results):
        print(" All tests passed! Enhanced content intelligence is working correctly.")
    else:
        print(" Some tests failed. Please check the implementation.")
    
    return total_passed == len(results)


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)