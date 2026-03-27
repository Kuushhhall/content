from datetime import datetime
from typing import List, Optional
import re
import logging

from app.models.article import NormalizedArticle, ContentIntelligence
from app.llm.service import LLMService
from app.llm.prompts.prompts import build_structured_summary_prompt, build_metadata_intelligence_prompt
from app.llm.prompts.system_prompts import EDITOR_SYSTEM_PROMPT, INTELLIGENCE_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class ContentIntelligenceService:
    """Service for extracting structured metadata from legal articles"""
    
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
    
    async def process_article(self, article: NormalizedArticle) -> NormalizedArticle:
        """Process article and extract structured content intelligence"""
        try:
            # Extract basic metadata
            article = self._extract_basic_metadata(article)
            
            # Generate structured summary
            article.structured_summary = await self._generate_structured_summary(article)
            
            # Extract facts and entities
            article = self._extract_facts_and_entities(article)
            
            # Generate content intelligence
            article.content_intelligence = await self._generate_content_intelligence(article)
            
            logger.info(f"Processed article {article.id} with content intelligence")
            return article
            
        except Exception as e:
            logger.error(f"Error processing article {article.id}: {e}")
            return article
    
    def _extract_basic_metadata(self, article: NormalizedArticle) -> NormalizedArticle:
        """Extract basic metadata from article content"""
        content = article.full_content or article.summary_hint or article.title
        
        # Extract court name
        court_patterns = [
            r'(Supreme Court of India|Delhi High Court|Bombay High Court|Madras High Court|Kolkata High Court|Allahabad High Court)',
            r'(SC|HC)\s*[&\-\s]*India',
            r'Court of\s+([A-Z][a-z]+)'
        ]
        
        for pattern in court_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                article.court_name = match.group(1) if match.group(1) else match.group(0)
                break
        
        # Extract case number
        case_patterns = [
            r'Case No\.\s*([A-Z0-9/\-\s]+)',
            r'([A-Z]{2,}\s*\d{1,4}/\d{4})',
            r'Civil\s+Appeal\s+No\.\s*(\d{1,4}/\d{4})'
        ]
        
        for pattern in case_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                article.case_number = match.group(1)
                break
        
        # Extract judges
        judge_patterns = [
            r'(Justice\s+[A-Z][a-z]+\s+[A-Z][a-z]+)',
            r'(J\.\s*[A-Z][a-z]+\s*[A-Z][a-z]+)',
            r'(CJI\s*[A-Z][a-z]+\s*[A-Z][a-z]+)'
        ]
        
        judges = []
        for pattern in judge_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            judges.extend([m.replace('Justice ', '').replace('J. ', '').replace('CJI ', '') for m in matches])
        
        article.judges_involved = list(set(judges))[:5]  # Limit to 5 judges
        
        # Extract parties
        party_patterns = [
            r'(Petitioner|Appellant|Respondent|Applicant)\s*[:\-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'(State of\s+[A-Z][a-z]+|Union of India|Central Government)'
        ]
        
        parties = []
        for pattern in party_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    parties.append(match[1] if len(match) > 1 else match[0])
                else:
                    parties.append(match)
        
        article.parties = list(set(parties))[:10]  # Limit to 10 parties
        
        # Extract jurisdiction
        jurisdiction_patterns = [
            r'(Supreme Court|High Court of [A-Z][a-z]+|District Court)',
            r'(SC|HC|DC)\s*India'
        ]
        
        for pattern in jurisdiction_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                article.jurisdiction = match.group(1) if match.group(1) else match.group(0)
                break
        
        return article
    
    def _extract_facts_and_entities(self, article: NormalizedArticle) -> NormalizedArticle:
        """Extract key facts and entities from article"""
        content = article.full_content or article.summary_hint or article.title
        
        # Extract key facts (sentences that contain legal information)
        sentences = re.split(r'[.!?]+', content)
        key_facts = []
        
        fact_indicators = [
            r'\b(according to|held that|observed that|stated that|noted that)\b',
            r'\b(section\s+\d+|article\s+\d+|clause\s+\d+)\b',
            r'\b(court|judge|petitioner|respondent)\b'
        ]
        
        for sentence in sentences[:20]:  # Limit to first 20 sentences
            sentence = sentence.strip()
            if len(sentence) > 20:  # Skip very short sentences
                for indicator in fact_indicators:
                    if re.search(indicator, sentence, re.IGNORECASE):
                        key_facts.append(sentence)
                        break
        
        article.extracted_facts = key_facts[:10]  # Limit to 10 key facts
        
        return article
    
    async def _generate_structured_summary(self, article: NormalizedArticle) -> str:
        """Generate a structured summary of the article"""
        prompt = build_structured_summary_prompt(
            article_title=article.title,
            article_content=article.full_content if article.full_content else article.summary_hint
        )
        
        try:
            response = await self.llm_service.generate(prompt, system_prompt=EDITOR_SYSTEM_PROMPT)
            return response.strip()
        except Exception as e:
            logger.error(f"Error generating structured summary: {e}")
            return article.summary_hint or article.title
    
    async def _generate_content_intelligence(self, article: NormalizedArticle) -> ContentIntelligence:
        """Generate content intelligence metadata"""
        prompt = build_metadata_intelligence_prompt(
            article_title=article.title,
            article_summary=article.structured_summary,
            article_content=article.full_content if article.full_content else article.summary_hint
        )
        
        try:
            response = await self.llm_service.generate(prompt, system_prompt=INTELLIGENCE_SYSTEM_PROMPT)
            
            # Parse the response (simple parsing for now)
            intelligence = ContentIntelligence()
            
            # Extract topic
            topic_match = re.search(r'Topic:\s*([^\n]+)', response, re.IGNORECASE)
            if topic_match:
                intelligence.topic = topic_match.group(1).strip()
            
            # Extract legal area
            legal_area_match = re.search(r'Legal Area:\s*([^\n]+)', response, re.IGNORECASE)
            if legal_area_match:
                intelligence.legal_area = legal_area_match.group(1).strip()
            
            # Extract audience
            audience_match = re.search(r'Audience:\s*([^\n]+)', response, re.IGNORECASE)
            if audience_match:
                audience_text = audience_match.group(1).strip()
                intelligence.audience = [a.strip() for a in audience_text.split(',') if a.strip()]
            
            # Extract angle
            angle_match = re.search(r'Angle:\s*([^\n]+)', response, re.IGNORECASE)
            if angle_match:
                intelligence.angle = angle_match.group(1).strip()
            
            # Extract complexity level
            complexity_match = re.search(r'Complexity Level:\s*([^\n]+)', response, re.IGNORECASE)
            if complexity_match:
                complexity = complexity_match.group(1).strip().lower()
                if complexity in ['beginner', 'intermediate', 'expert']:
                    intelligence.complexity_level = complexity
            
            # Extract scores
            virality_match = re.search(r'Virality Score:\s*([0-9.]+)', response, re.IGNORECASE)
            if virality_match:
                try:
                    intelligence.virality_score = float(virality_match.group(1))
                except ValueError:
                    pass
            
            relevance_match = re.search(r'Relevance Score:\s*([0-9.]+)', response, re.IGNORECASE)
            if relevance_match:
                try:
                    intelligence.relevance_score = float(relevance_match.group(1))
                except ValueError:
                    pass
            
            # Extract key insights
            insights_match = re.search(r'Key Insights:\s*([\s\S]*?)(?=Affected Parties:|$)', response, re.IGNORECASE)
            if insights_match:
                insights_text = insights_match.group(1).strip()
                # Extract bullet points
                bullet_points = re.findall(r'[•\-]\s*(.+)', insights_text)
                intelligence.key_insights = [point.strip() for point in bullet_points[:5]]
            
            # Extract affected parties
            parties_match = re.search(r'Affected Parties:\s*([^\n]+)', response, re.IGNORECASE)
            if parties_match:
                parties_text = parties_match.group(1).strip()
                intelligence.affected_parties = [p.strip() for p in parties_text.split(',') if p.strip()]
            
            # Extract legal implications
            implications_match = re.search(r'Legal Implications:\s*([\s\S]*?)(?=Suggested Hashtags:|$)', response, re.IGNORECASE)
            if implications_match:
                implications_text = implications_match.group(1).strip()
                # Extract bullet points
                bullet_points = re.findall(r'[•\-]\s*(.+)', implications_text)
                intelligence.legal_implications = [point.strip() for point in bullet_points[:5]]
            
            # Extract hashtags
            hashtags_match = re.search(r'Suggested Hashtags:\s*([^\n]+)', response, re.IGNORECASE)
            if hashtags_match:
                hashtags_text = hashtags_match.group(1).strip()
                intelligence.suggested_hashtags = [h.strip().replace('#', '') for h in hashtags_text.split(',') if h.strip()]
            
            return intelligence
            
        except Exception as e:
            logger.error(f"Error generating content intelligence: {e}")
            return ContentIntelligence()