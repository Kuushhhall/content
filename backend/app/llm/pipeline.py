import asyncio
import json
import logging
import re

from openai import AsyncOpenAI

from app.core.config import Settings
from app.llm.prompts.system_prompts import GENERATOR_SYSTEM_PROMPT
from app.models.article import NormalizedArticle
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


async def generate_linkedin_post(article: NormalizedArticle, settings: Settings) -> str:
    """Generate a single LinkedIn post for an article."""
    content = article.full_content or article.summary_hint or article.title
    prompt = f"""You are "Lawxy Times Reporter" — sharp, analytical, with dry wit.

Voice:
Insider speaking to other smart professionals

Tone:
First line: clear, factual statement of the news
Then: your interpretation and implications
Add light dry wit or banter where natural

Wit:
Subtle, intelligent, never forced

Hard rules:
No corporate tone
No generic "takeaways"

Style:
Short paragraphs
High signal

Structure:
1. First line: the core news (clear, factual)
2. Brief context
3. What actually matters (your spin)
4. Impact on three groups: experienced lawyers, everyday citizens, law students
5. Slightly witty or sharp closing line with a question

MANDATORY: Add TWO line breaks between EVERY SINGLE SENTENCE. Each line should be a complete thought.

Rules:
- Max ~1200-1800 characters
- First line MUST clearly state the news
- Insight > summary
- Focus on implications
- No corporate tone, no generic takeaways
- Add ONE relevant hashtag at the end
- Use simple language — no complex legal jargon

Article:
{article.title}
{article.url}

Content:
{content[:3000]}

Write only the post body. Double line breaks between EVERY sentence."""

    body = await _complete(settings, GENERATOR_SYSTEM_PROMPT, prompt)
    return _enforce_staircase_spacing(body)


async def generate_framer_content(article: NormalizedArticle, settings: Settings) -> dict:
    """Generate Framer CMS article content as JSON."""
    content = article.full_content or article.summary_hint or article.title
    prompt = f"""You are "Lawxy Times Reporter" — a sharp legal mind with dry wit.

Voice:
Think: elite law firm partner explaining what others miss
You decode news, not just report it

Tone:
First line: crisp, factual statement of what happened (no fluff, no wit)
Then: controlled analysis, implications, and insight
Wit only appears later if appropriate

Wit:
Dry, minimal, used to expose irony and make it funny

Hard rules:
No products, no pitching
No filler or generic phrasing
No complex legal jargon — use simple language

Sensitivity override:
Remove wit entirely if topic is serious

Style:
High clarity, high intelligence
Tight but layered writing

INPUT ARTICLE:
Title: {article.title}
Source: {article.source}
URL: {article.url}
Content: {content[:4000]}

INSTRUCTIONS:
Write a 500-800 word article with this EXACT structure:

1. **First Line (News Statement)**: Exact news event — clean, factual, no spin
2. **What Happened**: Expanded clarity on the event
3. **Simplified Explanation**: Explain what is actually happening here in plain, simple language. No legal jargon. Imagine explaining to a smart 18-year-old. What does this ruling/development actually mean on the ground?
4. **What This Means for Lawyers**: Practical implications for experienced lawyers — what changes in practice, what to watch for, how to advise clients
5. **What This Means for Citizens**: Everyday impact — how does this affect regular people, their rights, their obligations
6. **What This Means for Students**: Learning and career relevance — what law students should understand, how this shapes the legal landscape they'll enter
7. **Deeper Implications**: Second-order effects, what this signals going forward
8. **Closing Line**: Sharp, composed

OUTPUT FORMAT - STRICT JSON ONLY:
{{
  "title": "Analytical but clear headline",
  "slug": "url-friendly-slug-here",
  "excerpt": "2-line engaging summary that captures the core insight",
  "body_md": "# What Happened\\n\\n...\\n\\n## Simplified Explanation\\n\\n...\\n\\n## What This Means for Lawyers\\n\\n...\\n\\n## What This Means for Citizens\\n\\n...\\n\\n## What This Means for Students\\n\\n...\\n\\n## What This Signals Going Forward\\n\\n...\\n\\n*By Lawxy Times Reporter*",
  "sources": [{{"title": "Source Name", "url": "{article.url}"}}]
}}

Rules for body_md:
- Use Markdown formatting (NOT HTML)
- 500-800 words total
- First line MUST read like a precise news statement
- Simplified Explanation section must use ZERO legal jargon
- Include source link once
- End with: *By Lawxy Times Reporter*
- Focus on non-obvious insights
- Make each section substantive — no filler

Return ONLY valid JSON. No markdown blocks, no explanation."""

    raw = await _complete(settings, GENERATOR_SYSTEM_PROMPT, prompt)
    parsed = _extract_json_block(raw)
    try:
        data = json.loads(parsed)
        # Ensure body_md has proper sections
        if "body_md" not in data:
            data["body_md"] = data.get("content", "")
        if "slug" not in data:
            import hashlib
            slug_base = re.sub(r"[^a-z0-9\-]", "", article.title.lower().replace(" ", "-")[:50])
            data["slug"] = slug_base + "-" + hashlib.sha256(article.id.encode()).hexdigest()[:6]
        return data
    except json.JSONDecodeError:
        log.warning("Framer JSON parse failed, using fallback")
        return {
            "title": article.title,
            "slug": re.sub(r"[^a-z0-9\-]", "", article.title.lower().replace(" ", "-")[:50]),
            "excerpt": article.summary_hint[:200] if article.summary_hint else "",
            "body_md": f"# {article.title}\n\n{content[:2000]}\n\n*By Lawxy Times Reporter*",
            "sources": [{"title": article.source, "url": article.url}],
        }


async def generate_x_thread(article: NormalizedArticle, settings: Settings) -> str:
    """Generate an X/Twitter thread (3-5 tweets) separated by ---."""
    content = article.full_content or article.summary_hint or article.title
    prompt = f"""You are "Lawxy Times Reporter" — creating sharp, insightful legal threads for X.

THREAD ARCHITECTURE (3-5 tweets):
1. NEWS HOOK: Sharp hook + core news point (≤260 chars). Include 1 hashtag.
2. CLARIFY FACTS: Explain what actually happened in plain terms.
3. DEEPER IMPLICATIONS: Reveal non-obvious consequences and second-order effects.
4. STRATEGIC INSIGHTS: What this means for lawyers, citizens, students.
5. CLOSING: Sharp remark + thought-provoking question. Include source link.

RULES:
- Max 280 characters per tweet
- Each tweet adds new information
- No repetition, no filler
- Include 1-2 relevant hashtags total (spread across tweets)
- Separate tweets with: ---
- DO NOT include labels like "TWEET 1" in output
- Use simple language — no complex legal jargon
- Keep sentences tight and punchy

Article:
Title: {article.title}
Source: {article.source}
URL: {article.url}
Content: {content[:3000]}

Write the thread. Just the tweets separated by ---."""

    body = await _complete(settings, GENERATOR_SYSTEM_PROMPT, prompt)
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
    cycle_id: str,
) -> ContentDraft:
    """Generate content for a platform and save as draft with cost tracking."""
    from datetime import UTC, datetime

    log.info("[%s] Generating %s draft for: %s", cycle_id, platform, article.title[:60])

    if platform == "linkedin":
        body = await generate_linkedin_post(article, settings)
    elif platform == "framer":
        data = await generate_framer_content(article, settings)
        body = json.dumps(data)
    elif platform == "x":
        body = await generate_x_thread(article, settings)
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


async def run_full_cycle(store: StateStore, settings: Settings) -> dict:
    """Run the complete content cycle: fetch -> rank -> generate drafts.
    
    Updates persistent cycle progress so frontend can restore state on page revisit.
    """
    import uuid
    from datetime import UTC, datetime
    from app.sources import tavily_client

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

    SEARCH_QUERIES = [
        "Latest breaking high-impact legal news in India involving Supreme Court or High Court rulings, constitutional bench decisions, fundamental rights, public interest litigation, or landmark judgments with significant social or legal impact",
        "Breaking legal and regulatory news in India involving RBI or SEBI actions, corporate litigation, antitrust cases, startup or technology law issues, data privacy regulations, taxation, or major policy changes affecting business and financial markets",
        "Latest controversial or high-profile legal news in India involving ED or CBI investigations, arrests, raids, government actions, criminal cases, political or corporate disputes, or major court observations generating strong public or media reaction",
    ]

    try:
        # Step 1: Run 3 Tavily searches concurrently
        progress.step = "fetching_articles"
        progress.step_detail = "Running 3 Tavily searches..."
        store.set_cycle_progress(progress)
        log.info("[%s] Step 1/3: Running 3 Tavily searches...", cycle_id)

        search_tasks = [
            tavily_client.search_exa_async(settings, q, 10, 3)
            for q in SEARCH_QUERIES
        ]
        search_results = await asyncio.gather(*search_tasks, return_exceptions=True)

        all_articles = []
        for i, result in enumerate(search_results):
            if isinstance(result, Exception):
                log.warning("[%s] Tavily search %d failed: %s", cycle_id, i + 1, result)
            elif isinstance(result, list):
                count = len(result)
                all_articles.extend(result)
                log.info("[%s] Search %d returned %d articles", cycle_id, i + 1, count)
                progress.articles_fetched += count
                store.set_cycle_progress(progress)

        # Deduplicate by URL
        seen_urls = set()
        unique_articles = []
        for a in all_articles:
            if a.url not in seen_urls:
                seen_urls.add(a.url)
                unique_articles.append(a)

        log.info("[%s] Found %d unique articles from %d total", cycle_id, len(unique_articles), len(all_articles))
        progress.total_articles = len(unique_articles)
        progress.step_detail = f"Found {len(unique_articles)} articles"
        store.set_cycle_progress(progress)

        # Save all articles to store
        for a in unique_articles:
            store.upsert_article(a)

        if len(unique_articles) < 10:
            raise RuntimeError(f"Only found {len(unique_articles)} articles, need at least 10")

        # Step 2: LLM ranks top 10
        progress.step = "ranking_articles"
        progress.step_detail = f"LLM ranking {len(unique_articles)} articles..."
        store.set_cycle_progress(progress)
        log.info("[%s] Step 2/3: Ranking %d articles via LLM...", cycle_id, len(unique_articles))

        top_10_ids = await rank_articles_by_title(unique_articles, settings, cycle_id, store)
        top_10 = [a for a in unique_articles if a.id in top_10_ids]
        progress.top_10_ids = top_10_ids
        progress.step_detail = f"Selected top 10 from {len(unique_articles)} articles"
        store.set_cycle_progress(progress)
        log.info("[%s] Top 10 selected", cycle_id)

        # Step 3: Generate drafts
        progress.step = "generating_drafts"
        progress.step_detail = "Generating 22 drafts..."
        store.set_cycle_progress(progress)
        log.info("[%s] Step 3/3: Generating 22 drafts (2 LinkedIn + 10 Framer + 10 X)...", cycle_id)

        drafts_created = []
        errors = []

        # 2 LinkedIn posts from top 2 articles
        for i, article in enumerate(top_10[:2]):
            try:
                draft = await generate_and_save_draft(store, settings, article, "linkedin", cycle_id)
                drafts_created.append(draft)
                progress.drafts_created = len(drafts_created)
                progress.step_detail = f"LinkedIn {i+1}/2 done"
                store.set_cycle_progress(progress)
            except Exception as e:
                log.error("[%s] Failed LinkedIn draft for '%s': %s", cycle_id, article.title[:40], e)
                errors.append(f"LinkedIn: {article.title[:40]} - {e}")

        # 10 Framer posts - generate concurrently
        async def gen_framer(article):
            try:
                draft = await generate_and_save_draft(store, settings, article, "framer", cycle_id)
                return draft
            except Exception as e:
                log.error("[%s] Failed Framer draft for '%s': %s", cycle_id, article.title[:40], e)
                errors.append(f"Framer: {article.title[:40]} - {e}")
                return None

        framer_tasks = [gen_framer(a) for a in top_10]
        framer_results = await asyncio.gather(*framer_tasks)
        framer_done = [d for d in framer_results if d is not None]
        drafts_created.extend(framer_done)
        progress.drafts_created = len(drafts_created)
        progress.step_detail = f"Framer {len(framer_done)}/10 done"
        store.set_cycle_progress(progress)

        # 10 X threads - generate concurrently
        async def gen_x(article):
            try:
                draft = await generate_and_save_draft(store, settings, article, "x", cycle_id)
                return draft
            except Exception as e:
                log.error("[%s] Failed X draft for '%s': %s", cycle_id, article.title[:40], e)
                errors.append(f"X: {article.title[:40]} - {e}")
                return None

        x_tasks = [gen_x(a) for a in top_10]
        x_results = await asyncio.gather(*x_tasks)
        x_done = [d for d in x_results if d is not None]
        drafts_created.extend(x_done)
        progress.drafts_created = len(drafts_created)
        progress.step_detail = f"X {len(x_done)}/10 done"
        store.set_cycle_progress(progress)

        # Mark completed
        progress.status = "completed"
        progress.finished_at = datetime.now(UTC).isoformat()
        progress.step = "complete"
        progress.step_detail = f"Cycle complete: {len(drafts_created)} drafts, {len(errors)} errors"
        progress.errors = errors
        store.set_cycle_progress(progress)

        log.info("[%s] CYCLE COMPLETE: %d drafts, %d errors", cycle_id, len(drafts_created), len(errors))
        log.info("=" * 60)

        return {
            "cycle_id": cycle_id,
            "total_articles": len(unique_articles),
            "top_10_ids": top_10_ids,
            "drafts_created": len(drafts_created),
            "draft_ids": [d.id for d in drafts_created],
            "errors": errors,
            "timestamp": datetime.now(UTC).isoformat(),
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
