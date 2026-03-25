from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
import re

from app.models.engagement import Engagement
from app.models.article import NormalizedArticle
from app.llm.pipeline import LLMService
from app.platforms.dispatch import PlatformDispatcher
from app.core.logging import get_logger
from app.llm.prompts.engagement import build_reply_prompt
from app.llm.prompts.system import RESPONDER_SYSTEM_PROMPT

logger = get_logger(__name__)


class EngagementService:
    """Service for managing engagement and automated replies"""
    
    def __init__(self, llm_service: LLMService, dispatcher: PlatformDispatcher):
        self.llm_service = llm_service
        self.dispatcher = dispatcher
    
    async def fetch_comments(self, article_id: str, platforms: List[str]) -> List[Engagement]:
        """Fetch comments from all platforms for a given article"""
        all_comments = []
        
        for platform in platforms:
            try:
                comments = await self._fetch_comments_from_platform(article_id, platform)
                all_comments.extend(comments)
            except Exception as e:
                logger.error(f"Error fetching comments from {platform}: {e}")
        
        return all_comments
    
    async def _fetch_comments_from_platform(self, article_id: str, platform: str) -> List[Engagement]:
        """Fetch comments from a specific platform"""
        # This would integrate with platform-specific APIs
        # For now, return empty list as placeholder
        return []
    
    def filter_high_intent_comments(self, comments: List[Engagement]) -> List[Engagement]:
        """Filter comments that are likely to be high-intent or questions"""
        high_intent_keywords = [
            'how', 'what', 'why', 'when', 'where', 'who', 'can', 'will', 'should',
            'explain', 'clarify', 'help', 'advice', 'opinion', 'thoughts',
            'question', 'doubt', 'confused', 'not sure', 'understand'
        ]
        
        filtered_comments = []
        
        for comment in comments:
            comment_text = comment.content.lower()
            
            # Check for question marks
            if '?' in comment.content:
                filtered_comments.append(comment)
                continue
            
            # Check for high-intent keywords
            for keyword in high_intent_keywords:
                if keyword in comment_text:
                    filtered_comments.append(comment)
                    break
            
            # Check for engagement indicators
            engagement_indicators = ['great', 'interesting', 'thanks', 'agree', 'disagree']
            for indicator in engagement_indicators:
                if indicator in comment_text and len(comment.content) > 20:
                    filtered_comments.append(comment)
                    break
        
        return filtered_comments
    
    async def generate_ai_reply(self, comment: Engagement, article: NormalizedArticle) -> str:
        """Generate AI-powered reply to a comment"""
        prompt = build_reply_prompt(
            article_topic=article.content_intelligence.topic if article.content_intelligence else "Legal Discussion",
            article_summary=article.structured_summary,
            comment_content=comment.content,
            comment_author=comment.author,
            platform=comment.platform
        )
        
        try:
            response = await self.llm_service.generate(prompt, system_prompt=RESPONDER_SYSTEM_PROMPT)
            return response.strip()
        except Exception as e:
            logger.error(f"Error generating reply for comment {comment.id}: {e}")
            return "Thank you for your comment! We appreciate your engagement with our content."
    
    async def post_reply(self, comment: Engagement, reply_text: str, auto_approve: bool = True) -> bool:
        """Post a reply to a comment"""
        try:
            # For now, this is a placeholder - would integrate with platform APIs
            logger.info(f"Would reply to comment {comment.id} on {comment.platform}: {reply_text[:50]}...")
            
            if auto_approve:
                # In a real implementation, this would post the reply
                return True
            else:
                # Store for manual approval
                logger.info(f"Reply stored for manual approval: {reply_text[:50]}...")
                return False
                
        except Exception as e:
            logger.error(f"Error posting reply to comment {comment.id}: {e}")
            return False
    
    async def run_engagement_cycle(self, article_id: str, platforms: List[str], 
                                 auto_approve: bool = True) -> Dict[str, int]:
        """Run a complete engagement cycle"""
        results = {
            'fetched': 0,
            'filtered': 0,
            'replied': 0,
            'failed': 0
        }
        
        try:
            # 1. Fetch comments
            comments = await self.fetch_comments(article_id, platforms)
            results['fetched'] = len(comments)
            
            # 2. Filter high-intent comments
            filtered_comments = self.filter_high_intent_comments(comments)
            results['filtered'] = len(filtered_comments)
            
            # 3. Generate and post replies
            for comment in filtered_comments:
                try:
                    # Get the article for context
                    article = self._get_article_by_id(article_id)
                    
                    # Generate reply
                    reply_text = await self.generate_ai_reply(comment, article)
                    
                    # Post reply
                    success = await self.post_reply(comment, reply_text, auto_approve)
                    
                    if success:
                        results['replied'] += 1
                    else:
                        results['failed'] += 1
                        
                except Exception as e:
                    logger.error(f"Error processing comment {comment.id}: {e}")
                    results['failed'] += 1
            
            logger.info(f"Engagement cycle completed: {results}")
            
        except Exception as e:
            logger.error(f"Error in engagement cycle: {e}")
        
        return results
    
    def _get_article_by_id(self, article_id: str) -> NormalizedArticle:
        """Get article by ID - placeholder implementation"""
        # This would integrate with the state store
        return NormalizedArticle(
            id=article_id,
            source="placeholder",
            title="Placeholder Article",
            url="",
            summary_hint="",
            content_intelligence=None,
            full_content="",
            structured_summary=""
        )
    
    def analyze_engagement_metrics(self, engagements: List[Engagement]) -> Dict[str, any]:
        """Analyze engagement metrics"""
        if not engagements:
            return {
                'total_comments': 0,
                'avg_response_time': 0,
                'engagement_rate': 0,
                'top_platforms': [],
                'peak_hours': []
            }
        
        # Calculate basic metrics
        total_comments = len(engagements)
        
        # Analyze by platform
        platform_counts = {}
        for engagement in engagements:
            platform = engagement.platform
            platform_counts[platform] = platform_counts.get(platform, 0) + 1
        
        top_platforms = sorted(platform_counts.items(), key=lambda x: x[1], reverse=True)
        
        # Analyze timing
        hour_counts = [0] * 24
        for engagement in engagements:
            if engagement.created_at:
                hour = engagement.created_at.hour
                hour_counts[hour] += 1
        
        peak_hours = [i for i, count in enumerate(hour_counts) if count == max(hour_counts)]
        
        return {
            'total_comments': total_comments,
            'avg_response_time': 0,  # Would calculate from actual response times
            'engagement_rate': len([e for e in engagements if e.is_reply]) / total_comments,
            'top_platforms': top_platforms,
            'peak_hours': peak_hours
        }
    
    async def generate_engagement_report(self, article_id: str, days: int = 7) -> Dict[str, any]:
        """Generate an engagement report for an article"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Fetch engagements in date range
        engagements = self._get_engagements_by_date_range(article_id, start_date, end_date)
        
        # Analyze metrics
        metrics = self.analyze_engagement_metrics(engagements)
        
        # Generate insights
        insights = []
        
        if metrics['engagement_rate'] > 0.1:
            insights.append("High engagement rate - content resonated well with audience")
        
        if metrics['top_platforms']:
            top_platform = metrics['top_platforms'][0][0]
            insights.append(f"Best performing platform: {top_platform}")
        
        if metrics['peak_hours']:
            peak_hour = metrics['peak_hours'][0]
            insights.append(f"Peak engagement time: {peak_hour}:00")
        
        return {
            'article_id': article_id,
            'period': f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            'metrics': metrics,
            'insights': insights,
            'generated_at': datetime.now().isoformat()
        }
    
    def _get_engagements_by_date_range(self, article_id: str, start_date: datetime, 
                                     end_date: datetime) -> List[Engagement]:
        """Get engagements in a date range - placeholder implementation"""
        # This would integrate with the state store
        return []