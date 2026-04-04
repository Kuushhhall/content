import asyncio
import json
import logging
import re

from openai import AsyncOpenAI

from app.core.config import Settings
from app.models.article import ContentIntelligence, NormalizedArticle
from app.models.cycle import CycleProgress
from app.models.draft import ContentDraft
from app.state.store import StateStore

log = logging.getLogger(__name__)


def _client(settings: Settings) -> AsyncOpenAI:
    kwargs = {}
    if settings.openai_api_key:
        kwargs["api_key"] = settings.openai_api_key
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return AsyncOpenAI(**kwargs)


async def _complete_with_usage(settings: Settings, system_msg: str, user: str) -> tuple[str, dict]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY not configured")
    client = _client(settings)
    resp = await client.chat.completions.create(
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


async def _complete(settings: Settings, system_msg: str, user: str) -> str:
    text, _ = await _complete_with_usage(settings, system_msg, user)
    return text


async def rank_articles_by_title(
    articles: list[NormalizedArticle], settings: Settings, cycle_id: str, store: StateStore
) -> list[str]:
    """Send all titles to LLM, get back top 10 ranked article IDs."""
    log.info("[%s] Ranking %d articles via LLM...", cycle_id, len(articles))
    numbered = "\n".join(
        f"{i+1}. [{a.source}] {a.title}"
        for i, a in enumerate(articles)
    )
    prompt = f"""You are a legal news editor. Below are {len(articles)} Indian legal news article titles.
Pick the TOP 10 that will generate the most engagement and are most newsworthy. pick based on the clickbait potential of the title and the importance of the news behind it. do not pick same news reported in multiple titles. 

Try to pick news from the below categories if available, but prioritize engagement potential:
- Litigation
- AI in Legal
- Legal Tech & AI
- Regulatory
- Legal Guides
- Judgements & Cases
- Disputes & Enforcement
- Compliance & Risk
- Commercial & Transactions
- Legal Updates

Articles:
{numbered}

Respond with ONLY the numbers of the top 10 articles, one per line, in order of importance.
Example:
3
1
7
..."""

    resp_text, usage = await _complete_with_usage(settings, "You are a helpful assistant.", prompt)
    store.record_llm_cost(cycle_id, settings.llm_model or "unknown", "rank_articles", usage)
    log.info("[%s] LLM ranking complete: %d tokens used", cycle_id, usage.get("total_tokens", 0))

    numbers = re.findall(r'\b(\d+)\b', resp_text)
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
    log.info("[%s] Selected top 10: %s", cycle_id, selected_ids)
    return selected_ids[:10]


GENERATOR_SYSTEM_PROMPT = """You are "Lawxy Times Reporter" — sharp, analytical, with dry wit.

Voice: Insider speaking to other smart professionals
Tone: Clear factual news first, then interpretation and implications
Wit: Subtle, intelligent, never forced
Hard rules: No corporate tone, no generic takeaways
Style: Short paragraphs, high signal, focus on "why" and "so what"

Follow instructions exactly. Output only what is asked."""


async def generate_linkedin_post(article: NormalizedArticle, settings: Settings, cycle_id: str, store: StateStore) -> str:
    """Generate a single LinkedIn post for an article."""
    content = article.full_content or article.summary_hint or article.title
    prompt = f"""You are "Lawxy Times Reporter." Write a viral, high-engagement LinkedIn post about this Indian legal news. Hook hard. Keep it punchy. Make people stop scrolling.

Article:
{article.title}
{article.url}

Content:
{content[:6000]}

━━━━━━━━━━━━━━━━━━━━━━
UNICODE BOLD RULES — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━
To make text bold on LinkedIn you MUST use Unicode bold characters. Do NOT use ** asterisks **.

Unicode bold alphabet (use these exact characters):
𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭
𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇
𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵

Examples of correct Unicode bold usage:
- "𝗗𝗲𝗹𝗵𝗶 𝗛𝗶𝗴𝗵 𝗖𝗼𝘂𝗿𝘁" not "**Delhi High Court**"
- "𝗜𝗻𝗰𝗼𝗺𝗲 𝗧𝗮𝘅" not "**Income Tax**"
- "𝗦𝘂𝗽𝗿𝗲𝗺𝗲 𝗖𝗼𝘂𝗿𝘁" not "**Supreme Court**"

Only bold 3-6 key terms per post — the ones that carry the most weight or will catch a skimming eye. Do NOT bold every noun.

━━━━━━━━━━━━━━━━━━━━━━
POST STRUCTURE (no labels, no headers — just raw flowing text)
━━━━━━━━━━━━━━━━━━━━━━

1. HOOK (1 sentence, max 15 words)
   - Drop the most shocking or counterintuitive fact from the story.
   - Make it feel urgent. Make it feel like something just changed.
   - Examples of hook energy: "A court just told a regulator to explain itself." / "India's top court froze a tax demand — and the reason matters more than the order."

2. CONTEXT (2-3 short paragraphs, 2 sentences max each)
   - What happened. Why it happened. What system failure or tension caused it.
   - No fluff. Every sentence must add information.

3. THE REAL STORY (1-2 paragraphs)
   - What's actually at stake. The non-obvious angle. The second-order consequence most people miss.
   - This is where your sharpest insight goes.

4. THE SO WHAT (1 tight paragraph)
   - What this signals for the future. One clean, memorable takeaway.

5. CLOSING QUESTION (1 sentence)
   - A sharp, specific question that makes someone want to reply.
   - Not generic ("what do you think?"). Something that shows you've thought about it.

6. HASHTAGS
   - 5-7 relevant hashtags on a new line. No "hashtag#" prefix — just #Tag format.

━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE RULES
━━━━━━━━━━━━━━━━━━━━━━
- Zero ** asterisks ** anywhere. Unicode bold only.
- No section labels ("THE BREAKDOWN", "THE IMPACT", "For Lawyers:", "For Citizens:" etc.)
- No "Here is your post" or any meta-commentary.
- No bullet point lists anywhere in the post body.
- Each paragraph separated by one blank line.
- Total length: 180-280 words (tight, punchy, scroll-stopping).
"""
    body, usage = await _complete_with_usage(settings, GENERATOR_SYSTEM_PROMPT, prompt)
    store.record_llm_cost(cycle_id, settings.llm_model or "unknown", "linkedin_post", usage)
    return body


async def generate_framer_content(article: NormalizedArticle, settings: Settings, cycle_id: str, store: StateStore) -> dict:
    """Generate Framer CMS article content as JSON."""
    content = article.full_content or article.summary_hint or article.title
    prompt = f"""You are "Lawxy Times Reporter" - a sharp, highly intelligent legal mind with dry wit.

Voice:
- Think: top-tier law firm partner who sees second-order consequences
- Decode the news in simple language for a broad audience while providing deep insight.

Tone:
- Opening: sharp observation or framing (only slightly witty if appropriate)
- Body: clear, structured breakdown
- Analysis: deep, non-obvious implications
- Ending: pattern recognition or forward-looking insight

Wit: Dry, controlled, minimal — used only to expose irony or inefficiency
Sensitivity override: If serious topic, remove wit entirely

Hard rules:
- NEVER mention any product or company
- No filler, no generic commentary
- No exaggerated claims

---

### INPUT ARTICLE:
Title: {article.title}
Source: {article.source}
URL: {article.url}
Content: {content[:6000]}

---

### INSTRUCTIONS

#### 1. Classify Content Type (choose ONE):
news / explainer / opinion / guide

#### 2. Select Categories (MAX 3, only from this list):
Litigation, AI in Legal, Legal Tech & AI, Regulatory, Legal Guides, Judgements & Cases, Disputes & Enforcement, Compliance & Risk, Commercial & Transactions, Legal Updates

#### 3. Write Article Body (700-900 words)
Use HTML tags for all headers and paragraphs.
Organize into 4-5 distinct sections with original, journalistic headers.
Do NOT use generic headers like "Overview" or "Impact".
Cover: Introduction & Context → Core Dispute/Event → Plain English Breakdown → Multi-Stakeholder Impact → Forward-Looking Analysis
End with: <em>By Lawxy Times Reporter</em>

#### 4. Write Excerpt — exactly 2 lines, engaging, captures core insight

#### 5. Add Sources — 1-3 real sources, format: title + url

---

### OUTPUT FORMAT (STRICT JSON ONLY)
{{
  "type": "news",
  "categories": ["Litigation"],
  "title": "Analytical headline",
  "excerpt": "2-line engaging summary",
  "content": "<h2>...</h2><p>...</p>",
  "sources": [{{"title": "...", "url": "{article.url}"}}]
}}

### HARD RULES
- Return ONLY valid JSON (no markdown blocks, no explanation)
- content field must use HTML tags only (NO markdown)
- Max 3 categories
- Type must be exactly: news/guide/opinion/explainer
- Include source link naturally in content: {article.url}
- No fluff, no repetition

Note: Image available at: {article.image_url or "No image available"}

Return ONLY the JSON object. No other text."""

    raw, usage = await _complete_with_usage(settings, GENERATOR_SYSTEM_PROMPT, prompt)
    store.record_llm_cost(cycle_id, settings.llm_model or "unknown", "framer_post", usage)
    parsed = _extract_json_block(raw)
    try:
        data = json.loads(parsed)
        if "slug" not in data:
            import hashlib
            slug_base = re.sub(r"[^a-z0-9\-]", "", article.title.lower().replace(" ", "-")[:50])
            data["slug"] = slug_base + "-" + hashlib.sha256(article.id.encode()).hexdigest()[:6]
        return data
    except json.JSONDecodeError:
        log.warning("Framer JSON parse failed, using fallback")
        import hashlib
        slug_base = re.sub(r"[^a-z0-9\-]", "", article.title.lower().replace(" ", "-")[:50])
        return {
            "type": "news",
            "categories": ["Legal Updates"],
            "title": article.title,
            "slug": slug_base + "-" + hashlib.sha256(article.id.encode()).hexdigest()[:6],
            "excerpt": article.summary_hint[:200] if article.summary_hint else "",
            "content": f"<p>{content[:2000]}</p><em>By Lawxy Times Reporter</em>",
            "sources": [{"title": article.source, "url": article.url}],
        }


async def generate_x_thread(article: NormalizedArticle, settings: Settings, cycle_id: str, store: StateStore) -> str:
    """Generate an X/Twitter thread (3-5 tweets) separated by ---."""
    content = article.full_content or article.summary_hint or article.title
    prompt = f"""You are "Lawxy Times Reporter". Write an elite 3-5 tweet legal analysis thread for X in simple language and high wit.

###  STRICT NEGATIVE CONSTRAINTS (IMPORTANT):
- DO NOT use labels like "TWEET 1", "Tweet 1/5", "NEWS HOOK", or "What happened:".
- DO NOT use prefixes or headers of any kind. 
- ONLY output the raw text of the tweets separated by "---".
- NO introductory or concluding remarks (e.g., "Here is your thread").

### THREAD ARCHITECTURE:
1. **The Hook**: Lead with the bombshell. High impact, low word count. (1 hashtag)
2. **The Logic**: Explain the legal mechanism or precedent in plain English.
3. **The Ripple**: Reveal the non-obvious or second-order consequences.
4. **The Strategy**: What this means for legal practice or compliance.
5. **The Closing**: Summarize the core insight + a thought-provoking question .

### QUALITY RULES:
- Max 280 characters per tweet.
- Separate each tweet with exactly: ---
- No repetition. Every word must earn its place.

### ARTICLE DATA:
Title: {article.title}
Content: {content[:4000]}
Original Source: {article.url}

Write the thread now."""

    body, usage = await _complete_with_usage(settings, GENERATOR_SYSTEM_PROMPT, prompt)
    store.record_llm_cost(cycle_id, settings.llm_model or "unknown", "x_thread", usage)
    parts = [p.strip() for p in body.split("---")]
    parts = [p for p in parts if p]
    formatted = []
    for p in parts:
        clean = p[:277] + "..." if len(p) > 280 else p
        formatted.append(clean)
    return "\n---\n".join(formatted) if formatted else body


def _enforce_staircase_spacing(body: str) -> str:
    """Normalize spacing: ensure exactly one blank line between paragraphs."""
    if not body:
        return body
    # Collapse 3+ newlines to 2
    body = re.sub(r'\n{3,}', '\n\n', body)
    # Split on double newlines, strip each paragraph, drop empties
    paragraphs = [p.strip() for p in body.split('\n\n') if p.strip()]
    return '\n\n'.join(paragraphs)


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
    cycle_id: str,
) -> ContentDraft:
    """Generate content for a platform and save as draft with cost tracking."""
    from datetime import UTC, datetime

    log.info("[%s] Generating %s draft for: %s", cycle_id, platform, article.title[:60])

    if platform == "linkedin":
        body = await generate_linkedin_post(article, settings, cycle_id, store)
    elif platform == "framer":
        data = await generate_framer_content(article, settings, cycle_id, store)
        if article.image_url:
            data["image_url"] = article.image_url
        body = json.dumps(data)
    elif platform == "x":
        body = await generate_x_thread(article, settings, cycle_id, store)
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
    log.info("[%s] Saved %s draft: %s", cycle_id, platform, draft.id)
    return draft


async def search_and_rank_articles(
    settings: Settings, cycle_id: str, store: StateStore
) -> list[NormalizedArticle]:
    """Single OpenAI Responses API call with web_search_preview.

    Fetches + ranks top 10 Indian legal news articles in one call.
    Uses real OpenAI endpoint (not Groq) since web_search_preview requires it.
    """
    import hashlib
    from datetime import UTC, datetime

    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY not configured")

    # Always use real OpenAI for Responses API (web_search_preview not available on Groq)
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    query = """Find the top 10 Indian legal news articles from the past 7 days \
(prioritizing past 24 hours > past 3 days > past 7 days) that are getting traction \
on social media from these sources: livelaw.in, barandbench.com, indialegallive.com, \
economictimes.indiatimes.com.

Select articles with the highest viral/engagement potential. Prioritize:
- High-stakes litigation, landmark judgements
- AI & Legal Tech developments in India
- Regulatory changes affecting lawyers or citizens
- Controversial or surprising legal decisions

Return ONLY a valid JSON array of exactly 10 objects with no extra text:
[
  {
    "rank": 1,
    "title": "exact article title",
    "url": "exact article URL",
    "source": "LiveLaw or BarAndBench or IndiaLegalLive or EconomicTimes",
    "content": "2-3 sentence factual summary of the news",
    "virality_score": 8,
    "category": "Litigation"
  }
]

virality_score is 1-10 (10 = highest viral potential).
category must be one of: Litigation, AI in Legal, Regulatory, Legal Guides, Judgements & Cases, Disputes & Enforcement, Compliance & Risk, Commercial & Transactions, Legal Updates"""

    search_model = settings.llm_model or "gpt-4o"
    log.info("[%s] Calling OpenAI Responses API (model=%s) with web_search_preview...", cycle_id, search_model)
    resp = await client.responses.create(
        model=search_model,
        tools=[{"type": "web_search_preview", "search_context_size": "medium"}],
        input=query,
    )

    # Record cost — Responses API exposes usage on resp.usage
    try:
        usage_obj = resp.usage
        usage = {
            "prompt_tokens": getattr(usage_obj, "input_tokens", 0) or 0,
            "completion_tokens": getattr(usage_obj, "output_tokens", 0) or 0,
            "total_tokens": getattr(usage_obj, "total_tokens", 0) or 0,
        }
    except Exception:
        usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    store.record_llm_cost(cycle_id, search_model, "web_search_rank", usage)

    raw = resp.output_text
    log.info("[%s] Responses API returned %d chars, tokens=%s", cycle_id, len(raw), usage)

    # Parse JSON from response
    parsed = _extract_json_array(raw)
    try:
        items = json.loads(parsed)
        if not isinstance(items, list):
            raise ValueError("Expected JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        log.error("[%s] Failed to parse Responses API JSON: %s\nRaw: %s", cycle_id, e, raw[:500])
        raise RuntimeError(f"OpenAI Responses API returned invalid JSON: {e}") from e

    articles = []
    for item in items[:10]:
        url = item.get("url", "")
        if not url:
            continue
        article_id = "os_" + hashlib.sha256(url.encode()).hexdigest()[:12]
        ci = ContentIntelligence(
            virality_score=float(item.get("virality_score", 5)),
            topic=item.get("category", "Legal Updates"),
            legal_area=item.get("category", ""),
        )
        article = NormalizedArticle(
            id=article_id,
            source=item.get("source", "OpenAI Search"),
            title=item.get("title", ""),
            url=url,
            summary_hint=item.get("content", "")[:600],
            full_content=item.get("content", ""),
            full_content_fetched=True,
            kind="openai_search",
            fetched_at=datetime.now(UTC),
            content_intelligence=ci,
            tags=[item.get("category", "")],
        )
        articles.append(article)
        store.upsert_article(article)

    log.info("[%s] Parsed %d articles from Responses API", cycle_id, len(articles))
    return articles


def _extract_json_array(text: str) -> str:
    """Extract a JSON array from text."""
    text = text.strip()
    m = re.search(r"\[[\s\S]*\]", text)
    if not m:
        return text
    blob = m.group(0)
    try:
        json.loads(blob)
        return blob
    except json.JSONDecodeError:
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', blob)
        return cleaned


async def run_full_cycle(store: StateStore, settings: Settings) -> dict:
    """Run the complete content cycle: fetch+rank (1 OpenAI Responses call) -> generate drafts.

    Updates persistent cycle progress so frontend can restore state on page revisit.
    """
    import uuid
    from datetime import UTC, datetime

    cycle_id = str(uuid.uuid4())[:8]
    log.info("=" * 60)
    log.info("[%s] STARTING CONTENT CYCLE", cycle_id)
    log.info("=" * 60)

    # Set running state
    progress = CycleProgress(
        cycle_id=cycle_id,
        status="running",
        started_at=datetime.now(UTC).isoformat(),
        step="initializing",
        step_detail="Starting content cycle...",
    )
    store.set_cycle_progress(progress)

    try:
        # Step 1: Single OpenAI Responses API call to search + rank top 10
        progress.step = "fetching_articles"
        progress.step_detail = "Searching for top 10 Indian legal news via OpenAI web search..."
        store.set_cycle_progress(progress)
        log.info("[%s] Step 1/2: Fetching + ranking articles via OpenAI Responses API...", cycle_id)

        top_10 = await search_and_rank_articles(settings, cycle_id, store)

        if len(top_10) < 2:
            raise RuntimeError(f"Only found {len(top_10)} articles, need at least 2")

        top_10_ids = [a.id for a in top_10]
        progress.articles_fetched = len(top_10)
        progress.total_articles = len(top_10)
        progress.top_10_ids = top_10_ids
        progress.step_detail = f"Found {len(top_10)} articles"
        store.set_cycle_progress(progress)
        log.info("[%s] Top %d articles fetched and ranked", cycle_id, len(top_10))

        # Step 2: Generate drafts concurrently
        progress.step = "generating_drafts"
        num_articles = min(len(top_10), 10)
        num_linkedin = min(2, num_articles)
        num_framer = num_articles
        num_x = num_articles
        progress.step_detail = f"Generating {num_linkedin + num_framer + num_x} drafts..."
        store.set_cycle_progress(progress)
        log.info("[%s] Step 2/2: Generating %d drafts (%d LinkedIn + %d Framer + %d X)...",
                 cycle_id, num_linkedin + num_framer + num_x, num_linkedin, num_framer, num_x)

        drafts_created = []
        errors = []

        # LinkedIn posts from top articles (up to 2)
        for i, article in enumerate(top_10[:num_linkedin]):
            try:
                draft = await generate_and_save_draft(store, settings, article, "linkedin", cycle_id)
                drafts_created.append(draft)
                progress.drafts_created = len(drafts_created)
                progress.step_detail = f"LinkedIn {i+1}/2 done"
                store.set_cycle_progress(progress)
            except Exception as e:
                log.error("[%s] Failed LinkedIn draft for '%s': %s", cycle_id, article.title[:40], e)
                errors.append(f"LinkedIn: {article.title[:40]} - {e}")

        # Framer posts - generate concurrently
        log.info("[%s] Starting Framer draft generation for %d articles", cycle_id, num_framer)
        async def gen_framer(article):
            try:
                log.info("[%s] Generating Framer for: %s", cycle_id, article.title[:40])
                draft = await generate_and_save_draft(store, settings, article, "framer", cycle_id)
                log.info("[%s] Framer draft done: %s", cycle_id, draft.id)
                return draft
            except Exception as e:
                log.error("[%s] Failed Framer draft for '%s': %s", cycle_id, article.title[:40], e)
                errors.append(f"Framer: {article.title[:40]} - {e}")
                return None

        framer_tasks = [gen_framer(a) for a in top_10[:num_framer]]
        framer_results = await asyncio.gather(*framer_tasks)
        framer_done = [d for d in framer_results if d is not None]
        log.info("[%s] Framer drafts created: %d/%d", cycle_id, len(framer_done), num_framer)
        drafts_created.extend(framer_done)
        progress.drafts_created = len(drafts_created)
        progress.step_detail = f"Framer {len(framer_done)}/{num_framer} done"
        store.set_cycle_progress(progress)

        # X threads - generate concurrently
        async def gen_x(article):
            try:
                draft = await generate_and_save_draft(store, settings, article, "x", cycle_id)
                return draft
            except Exception as e:
                log.error("[%s] Failed X draft for '%s': %s", cycle_id, article.title[:40], e)
                errors.append(f"X: {article.title[:40]} - {e}")
                return None

        x_tasks = [gen_x(a) for a in top_10[:num_x]]
        x_results = await asyncio.gather(*x_tasks)
        x_done = [d for d in x_results if d is not None]
        drafts_created.extend(x_done)
        progress.drafts_created = len(drafts_created)
        progress.step_detail = f"X {len(x_done)}/{num_x} done"
        store.set_cycle_progress(progress)

        # Compute cycle cost from all tracked records
        cycle_cost = store.get_cycle_cost(cycle_id)

        # Mark completed
        progress.status = "completed"
        progress.finished_at = datetime.now(UTC).isoformat()
        progress.step = "complete"
        progress.cycle_cost_usd = cycle_cost["total_usd"]
        progress.cycle_cost_inr = cycle_cost["total_inr"]
        progress.step_detail = (
            f"Cycle complete: {len(drafts_created)} drafts, {len(errors)} errors "
            f"| Cost: ₹{cycle_cost['total_inr']:.4f} (${cycle_cost['total_usd']:.6f})"
        )
        progress.errors = errors
        store.set_cycle_progress(progress)

        log.info("[%s] CYCLE COMPLETE: %d drafts, %d errors | Cost: ₹%.4f ($%.6f)",
                 cycle_id, len(drafts_created), len(errors),
                 cycle_cost["total_inr"], cycle_cost["total_usd"])
        log.info("=" * 60)

        return {
            "cycle_id": cycle_id,
            "total_articles": len(top_10),
            "top_10_ids": top_10_ids,
            "drafts_created": len(drafts_created),
            "draft_ids": [d.id for d in drafts_created],
            "errors": errors,
            "timestamp": datetime.now(UTC).isoformat(),
            "cost_usd": cycle_cost["total_usd"],
            "cost_inr": cycle_cost["total_inr"],
            "total_tokens": cycle_cost["total_tokens"],
        }

    except Exception as e:
        log.exception("[%s] CYCLE FAILED: %s", cycle_id, e)
        progress.status = "failed"
        progress.finished_at = datetime.now(UTC).isoformat()
        progress.step = "failed"
        progress.step_detail = str(e)
        progress.errors.append(str(e))
        store.set_cycle_progress(progress)
        raise
