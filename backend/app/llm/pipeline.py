import json
import logging
import re

from openai import OpenAI

from app.core.config import Settings
from app.llm.prompts.system_prompts import GENERATOR_SYSTEM_PROMPT
from app.models.article import NormalizedArticle
from app.models.draft import ContentDraft
from app.state.store import StateStore

log = logging.getLogger(__name__)


def _client(settings: Settings) -> OpenAI:
    kwargs = {}
    if settings.openai_api_key:
        kwargs["api_key"] = settings.openai_api_key
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return OpenAI(**kwargs)


def _complete_with_usage(settings: Settings, system_msg: str, user: str) -> tuple[str, dict]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY not configured")
    client = _client(settings)
    resp = client.chat.completions.create(
        model=settings.llm_model or "",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user},
        ],
    )
    usage = resp.usage
    return (resp.choices[0].message.content or "").strip(), {
        "prompt_tokens": usage.prompt_tokens if usage else 0,
        "completion_tokens": usage.completion_tokens if usage else 0,
        "total_tokens": usage.total_tokens if usage else 0,
    }


def _complete(settings: Settings, system_msg: str, user: str) -> str:
    text, _ = _complete_with_usage(settings, system_msg, user)
    return text


def rank_articles_by_title(articles: list[NormalizedArticle], settings: Settings) -> list[str]:
    """Send 30 titles to LLM, get back top 10 ranked article IDs."""
    numbered = "\n".join(
        f"{i+1}. [{a.source}] {a.title}"
        for i, a in enumerate(articles)
    )
    prompt = f"""You are a legal news editor. Below are 30 Indian legal news article titles.
Pick the TOP 10 that will generate the most engagement and are most newsworthy.

Criteria:
- Landmark judgments, major legislation, high-stakes disputes
- Broadly relevant to lawyers, law students, and businesses in India
- Genuinely newsworthy and timely

Articles:
{numbered}

Respond with ONLY the numbers of the top 10 articles, one per line, in order of importance.
Example:
3
1
7
..."""

    resp = _complete(settings, "You are a helpful assistant.", prompt)
    numbers = re.findall(r'\b(\d+)\b', resp)
    selected_ids = []
    for n in numbers[:10]:
        idx = int(n) - 1
        if 0 <= idx < len(articles):
            selected_ids.append(articles[idx].id)
    if len(selected_ids) < 10:
        for a in articles:
            if a.id not in selected_ids:
                selected_ids.append(a.id)
            if len(selected_ids) >= 10:
                break
    return selected_ids[:10]


def generate_linkedin_post(article: NormalizedArticle, settings: Settings) -> str:
    """Generate a single LinkedIn post for an article."""
    content = article.full_content or article.summary_hint or article.title
    prompt = f"""Write a LinkedIn post about this legal news.

STRUCTURE:
1. First line: the core news (clear, factual)
2. Brief context
3. What actually matters (your spin)
4. Implication / behavior change
5. Slightly witty or sharp closing line with a question

MANDATORY: Add TWO line breaks between EVERY SINGLE SENTENCE. Each line should be a complete thought.

Rules:
- Max ~1200-1800 characters
- First line MUST clearly state the news
- Insight > summary
- Focus on implications
- No corporate tone, no generic takeaways
- Add ONE relevant hashtag at the end

Article:
{article.title}
{article.url}

Content:
{content[:3000]}

Write only the post body. Double line breaks between EVERY sentence."""

    body = _complete(settings, GENERATOR_SYSTEM_PROMPT, prompt)
    return _enforce_staircase_spacing(body)


def generate_framer_content(article: NormalizedArticle, settings: Settings) -> dict:
    """Generate Framer CMS article content as JSON."""
    content = article.full_content or article.summary_hint or article.title
    prompt = f"""You are writing a deep-dive legal analysis article for lawxy.com.

INPUT ARTICLE:
Title: {article.title}
Source: {article.source}
URL: {article.url}
Content: {content[:4000]}

INSTRUCTIONS:
1. Classify: news, explainer, opinion, or guide
2. Pick MAX 3 categories from: Litigation, AI in Legal, Legal Tech & AI, Regulatory, Legal Guides, Judgements & Cases, Disputes & Enforcement, Compliance & Risk, Commercial & Transactions, Legal Updates
3. Write 800-1200 word article with this HTML structure:
<h2>Overview</h2><p>...</p>
<h2>What Happened</h2><p>...</p>
<h2>Simplified Explanation</h2><p>...</p>
<h2>Impact</h2><h3>For Citizens</h3><p>...</p><h3>For Legal Professionals</h3><p>...</p><h3>For Businesses</h3><p>...</p>
<h2>What Happens Next</h2><p>...</p>
<p><em>By Lawxy Times Reporter</em></p>
4. Write a 2-line engaging excerpt
5. Add sources list with title+url (include the original article URL)

OUTPUT FORMAT - STRICT JSON ONLY:
{{
  "type": "news",
  "categories": ["Litigation"],
  "title": "Analytical headline",
  "excerpt": "2-line engaging summary",
  "content": "<h2>Overview</h2><p>...</p>",
  "sources": [{{"title": "...", "url": "..."}}]
}}

Return ONLY valid JSON. No markdown blocks, no explanation."""

    raw = _complete(settings, GENERATOR_SYSTEM_PROMPT, prompt)
    parsed = _extract_json_block(raw)
    try:
        return json.loads(parsed)
    except json.JSONDecodeError:
        log.warning("Framer JSON parse failed, using fallback")
        return {
            "type": "news",
            "categories": ["Legal Updates"],
            "title": article.title,
            "excerpt": article.summary_hint[:200] if article.summary_hint else "",
            "content": f"<p>{content[:2000]}</p>",
            "sources": [{"title": article.source, "url": article.url}],
        }


def generate_x_thread(article: NormalizedArticle, settings: Settings) -> str:
    """Generate an X/Twitter thread (3-5 tweets) separated by ---."""
    content = article.full_content or article.summary_hint or article.title
    prompt = f"""Create an X (Twitter) thread about this legal news.

THREAD ARCHITECTURE (3-5 tweets):
1. NEWS HOOK: Lead with the most impactful development. Strong declarative language. Include 1 hashtag.
2. CONTEXT: Explain what this means in plain terms.
3. DEEPER IMPLICATIONS: Reveal non-obvious consequences and second-order effects.
4. STRATEGIC INSIGHTS: What this means for legal practice, compliance, citizens.
5. FINAL TWEET: Summarize key insight + thought-provoking question.

RULES:
- Max 280 characters per tweet
- Each tweet adds new information
- No repetition, no filler
- Include 1-2 relevant hashtags total
- Separate tweets with: ---
- DO NOT include labels like "TWEET 1" in output

Article:
Title: {article.title}
Source: {article.source}
URL: {article.url}
Content: {content[:3000]}

Write the thread. Just the tweets separated by ---."""

    body = _complete(settings, GENERATOR_SYSTEM_PROMPT, prompt)
    parts = [p.strip() for p in body.split("---")]
    parts = [p for p in parts if p]
    formatted = []
    for p in parts:
        clean = p[:277] + "..." if len(p) > 280 else p
        formatted.append(clean)
    return "\n---\n".join(formatted) if formatted else body


def _enforce_staircase_spacing(body: str) -> str:
    """Ensure double line breaks between sentences."""
    if not body:
        return body
    body = re.sub(r'\n{3,}', '\n\n', body)
    paragraphs = [p.strip() for p in body.split('\n\n') if p.strip()]
    final = []
    for para in paragraphs:
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9])', para)
        for s in sentences:
            s = s.strip()
            if s:
                final.append(s)
    return '\n\n'.join(final)


def _extract_json_block(text: str) -> str:
    text = text.strip()
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return text
    blob = m.group(0)
    try:
        json.loads(blob)
        return blob
    except json.JSONDecodeError:
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', blob)
        try:
            json.loads(cleaned)
            return cleaned
        except json.JSONDecodeError:
            return text


async def generate_and_save_draft(
    store: StateStore,
    settings: Settings,
    article: NormalizedArticle,
    platform: str,
) -> ContentDraft:
    """Generate content for a platform and save as draft."""
    from datetime import UTC, datetime

    if platform == "linkedin":
        body = generate_linkedin_post(article, settings)
    elif platform == "framer":
        data = generate_framer_content(article, settings)
        body = json.dumps(data)
    elif platform == "x":
        body = generate_x_thread(article, settings)
    else:
        raise ValueError(f"Unknown platform: {platform}")

    draft = ContentDraft(
        id=store.new_id("d_"),
        article_id=article.id,
        platform=platform,
        body=body,
        summary=article.title,
        updated_at=datetime.now(UTC),
    )
    store.upsert_draft(draft)
    return draft
