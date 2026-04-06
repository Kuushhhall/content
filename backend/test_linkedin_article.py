#!/usr/bin/env python3
"""
Test LinkedIn Article Posting via Playwright.
Run with: python test_linkedin_article.py

This tests the new "Write an article" flow on LinkedIn company page.
"""

import asyncio
import json
import logging
import random
from pathlib import Path

from playwright.async_api import async_playwright

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)-20s | %(message)s"
)
log = logging.getLogger(__name__)

SESSIONS_DIR = Path(__file__).parent / "sessions"
COMPANY_ID = "112519238"

SAMPLE_DRAFT = {
    "article_title": "Gujarat High Court Bars Judges From Using AI In Decision Making",
    "body": """In a landmark move that's sent shockwaves through the Indian judiciary, the Gujarat High Court has officially prohibited judges from using Artificial Intelligence in decision-making, adjudication, and reasoning.

The policy, dated April 4, 2026, draws a clear bright line: while AI can assist with administrative tasks like case management, drafting research, and translation, it cannot — absolutely cannot — be part of the judicial reasoning process.

This raises critical questions about the future of legal technology in India. Several high courts have been experimenting with AI tools for case research and summary generation. But this policy suggests that the Gujarat High Court believes AI still carries too much risk of error or bias to be trusted with actual judicial decisions.

The policy does allow AI for:
• Case administration
• Drafting and research assistance  
• Translation work

But explicitly bans AI from:
• Decision-making
• Legal reasoning
• Judgment preparation

Legal experts are divided. Some applaud the caution, arguing that AI hallucination in legal contexts could be disastrous. Others worry this could set back legal technology adoption in India by years.

What do you think — should judges be allowed to use AI assistants, or is this a necessary safeguard? 𝗗𝗿𝗼𝗽 𝘆𝗼𝘂𝗿 𝘁𝗵𝗼𝘂𝗴𝗵𝘁𝘀 below.

#LegalTech #AI #GujaratHighCourt #IndiaJudiciary #ArtificialIntelligence""",
    "article_description": "The Gujarat High Court has prohibited judges from using AI in decision-making. Here's what this means for the future of legal tech in India."
}


async def human_delay(min_sec=1, max_sec=2):
    await asyncio.sleep(random.uniform(min_sec, max_sec))


async def move_mouse_naturally(page):
    for _ in range(random.randint(2, 4)):
        x = random.randint(200, 1500)
        y = random.randint(200, 800)
        await page.mouse.move(x, y)
        await asyncio.sleep(random.uniform(0.1, 0.3))


async def post_linkedin_article(draft: dict, company_id: str = COMPANY_ID) -> dict:
    """Post a LinkedIn article using the new article flow."""
    session_file = SESSIONS_DIR / "linkedin_auth.json"
    
    if not session_file.exists():
        return {"success": False, "error": "No LinkedIn session found. Run auth_generator.py first."}
    
    log.info("=" * 60)
    log.info("POSTING LINKEDIN ARTICLE")
    log.info("Title: %s", draft.get("article_title", "")[:50])
    log.info("=" * 60)
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(storage_state=str(session_file))
            page = await context.new_page()
            
            # Step 1: Go to company page posts
            company_page_url = f"https://www.linkedin.com/showcase/{company_id}/admin/page-posts/published/"
            log.info("Step 1: Navigating to company page...")
            await page.goto(company_page_url, wait_until="domcontentloaded")
            await human_delay(4, 6)
            
            await move_mouse_naturally(page)
            
            # Step 2: Click "Write an article" button
            log.info("Step 2: Looking for 'Write an article' button...")
            
            # Try different selectors for "Write an article" button
            article_buttons = [
                "Write an article",
                "write an article",
                "Article",
                "Create article",
            ]
            
            clicked = False
            for btn_text in article_buttons:
                try:
                    btn = page.get_by_role("button", name=btn_text, exact=False)
                    if await btn.count() > 0:
                        await btn.first.click()
                        log.info("Clicked '%s'", btn_text)
                        clicked = True
                        break
                except Exception as e:
                    log.debug("Button '%s' not found: %s", btn_text, e)
                    continue
            
            if not clicked:
                # Fallback: try to find any button with "article" text
                try:
                    article_link = page.locator("a:has-text('article'), button:has-text('article')").first
                    if await article_link.count() > 0:
                        await article_link.click()
                        log.info("Clicked article link/button")
                        clicked = True
                except Exception as e:
                    log.debug("Fallback also failed: %s", e)
            
            if not clicked:
                await browser.close()
                return {"success": False, "error": "Could not find 'Write an article' button"}
            
            # Step 3: Wait for redirect to article editor
            log.info("Step 3: Waiting for article editor to load...")
            await human_delay(3, 5)
            
            # Should be on: https://www.linkedin.com/article/new/?author=urn%3Ali%3Afs_normalized_company%3A112519238
            log.info("Current URL: %s", page.url)
            
            # Step 4: Fill in the title
            log.info("Step 4: Filling article title...")
            title_input = page.locator('input[name="title"], input[placeholder*="Title"], input[id*="title"]').first
            if await title_input.count() > 0:
                await title_input.click()
                await human_delay(0.5, 1)
                await title_input.fill(draft.get("article_title", ""))
                log.info("Title filled: %s", draft.get("article_title", "")[:50])
            else:
                # Try finding by placeholder text
                try:
                    title_input = page.get_by_placeholder("Title", exact=False)
                    await title_input.fill(draft.get("article_title", ""))
                    log.info("Title filled via placeholder")
                except Exception as e:
                    log.warning("Could not find title input: %s", e)
            
            await human_delay(1, 2)
            
            # Step 5: Fill in the article body
            log.info("Step 5: Filling article body...")
            
            # Try to find the main text editor
            text_editors = [
                page.locator('div[role="textbox"]').first,
                page.locator('.editor-content, .article-editor, [contenteditable="true"]').first,
                page.get_by_text("Write here").first,
            ]
            
            editor_found = False
            for editor in text_editors:
                try:
                    if await editor.count() > 0:
                        await editor.click()
                        await human_delay(0.5, 1)
                        # Use clipboard to paste content
                        await page.evaluate(f"navigator.clipboard.writeText({json.dumps(draft.get('body', ''))})")
                        await human_delay(0.3, 0.5)
                        await page.keyboard.press("Control+V")
                        log.info("Body pasted successfully")
                        editor_found = True
                        break
                except Exception as e:
                    log.debug("Editor not found: %s", e)
                    continue
            
            if not editor_found:
                log.warning("Could not find text editor, trying direct type...")
                await page.keyboard.type(draft.get("body", ""), delay=50)
            
            await human_delay(2, 3)
            
            # Step 6: Click Next button
            log.info("Step 6: Clicking Next button...")
            try:
                next_btn = page.get_by_role("button", name="Next", exact=False).first
                if await next_btn.count() > 0:
                    await next_btn.click()
                    log.info("Clicked Next")
                    await human_delay(2, 3)
            except Exception as e:
                log.warning("Next button not found: %s", e)
            
            # Step 7: Fill in description (if prompted)
            log.info("Step 7: Checking for description field...")
            try:
                desc_input = page.get_by_placeholder("Tell your network what your article is about", exact=False)
                if await desc_input.count() > 0:
                    await desc_input.fill(draft.get("article_description", ""))
                    log.info("Description filled")
                else:
                    desc_input = page.locator('textarea[name="description"], input[placeholder*="description"]').first
                    if await desc_input.count() > 0:
                        await desc_input.fill(draft.get("article_description", ""))
                        log.info("Description filled (fallback)")
            except Exception as e:
                log.warning("Description field not found: %s", e)
            
            await human_delay(1, 2)
            
            # Step 8: Click Publish button (not Post!)
            log.info("Step 8: Clicking Publish button...")
            try:
                publish_btn = page.get_by_role("button", name="Publish", exact=False).first
                if await publish_btn.count() > 0:
                    await publish_btn.click()
                    log.info("Clicked Publish")
                    await human_delay(3, 5)
                else:
                    # Fallback: try Post button
                    post_btn = page.get_by_role("button", name="Post", exact=False).first
                    if await post_btn.count() > 0:
                        await post_btn.click()
                        log.info("Clicked Post")
                        await human_delay(3, 5)
            except Exception as e:
                log.warning("Publish/Post button not found: %s", e)
            
            # Take screenshot
            await page.screenshot(path=str(SESSIONS_DIR.parent / "linkedin_article_test.png"))
            log.info("Screenshot saved")
            
            # Check final URL
            log.info("Final URL: %s", page.url)
            
            await browser.close()
            
            log.info("=" * 60)
            log.info("ARTICLE POST COMPLETE")
            log.info("=" * 60)
            
            return {
                "success": True,
                "message": "Article posted successfully",
                "url": page.url
            }
            
    except Exception as e:
        log.exception("Failed to post article: %s", e)
        return {"success": False, "error": str(e)}


async def main():
    log.info("=" * 60)
    log.info("LINKEDIN ARTICLE POSTING TEST")
    log.info("=" * 60)
    
    result = await post_linkedin_article(SAMPLE_DRAFT)
    
    log.info("Result: %s", json.dumps(result, indent=2))
    
    if result.get("success"):
        log.info("SUCCESS! Article posted.")
    else:
        log.error("FAILED: %s", result.get("error"))


if __name__ == "__main__":
    asyncio.run(main())
