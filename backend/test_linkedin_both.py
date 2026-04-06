#!/usr/bin/env python3
"""
Test both LinkedIn flows: POST and ARTICLE
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

SAMPLE_POST = {
    "body": """🚨 Big development in Indian legal world!

The Gujarat High Court just dropped a bombshell ruling that's going to change how judges use AI in courts. No more AI-powered judgments for now.

This is HUGE because:
• Judges CAN'T use AI for legal reasoning anymore
• But CAN use it for admin work like case management
• First High Court in India to draw this line

What do you think about this? Is it too restrictive or absolutely necessary? 𝗗𝗿𝗼𝗽 your thoughts below 👇

#LegalTech #AI #GujaratHighCourt #IndiaJudiciary"""
}

SAMPLE_ARTICLE = {
    "article_title": "Gujarat High Court Just Banned AI in Judicial Decisions - Here's Why It Matters",
    "body": """In a landmark move that's sending shockwaves through India's legal system, the Gujarat High Court has officially prohibited judges from using Artificial Intelligence in decision-making, adjudication, and legal reasoning.

The policy, dated April 4, 2026, draws a clear bright line: while AI can assist with administrative tasks like case management, drafting research, and translation, it cannot—absolutely cannot—be part of the judicial reasoning process.

This raises critical questions about the future of legal technology in India. Several high courts have been experimenting with AI tools for case research and summary generation. But this policy suggests that the Gujarat High Court believes AI still carries too much risk of error or bias to be trusted with actual judicial decisions.

The policy explicitly allows AI for:
• Case administration and management
• Drafting and research assistance
• Translation work

But explicitly bans AI from:
• Decision-making in any form
• Legal reasoning or interpretation
• Judgment preparation

Legal experts are divided on this. Some applaud the caution, arguing that AI hallucination in legal contexts could be disastrous—with potentially life-altering consequences for litigants. Others worry this could set back legal technology adoption in India by years, at a time when courts are drowning in caseloads.

The timing is particularly interesting. Just last month, the Supreme Court of India expressed concerns about AI-generated content in legal proceedings. The Gujarat HC's policy seems to be the first concrete action by any high court in response to these concerns.

What do you think—is this a necessary safeguard for judicial integrity, or an overreaction that will hinder courts from leveraging powerful new tools?

Let me know your thoughts in the comments. 👇

#LegalTech #ArtificialIntelligence #GujaratHighCourt #IndianJudiciary #AIInLaw""",
    "article_description": "The Gujarat High Court has prohibited judges from using AI in decision-making. Here's what this means for the future of legal tech in India."
}


async def human_delay(min_sec=1, max_sec=2):
    await asyncio.sleep(random.uniform(min_sec, max_sec))


async def test_linkedin_post():
    """Test simple LinkedIn POST flow"""
    log.info("=" * 60)
    log.info("TESTING: LinkedIn POST flow")
    log.info("=" * 60)
    
    session_file = SESSIONS_DIR / "linkedin_auth.json"
    if not session_file.exists():
        return {"success": False, "error": "No LinkedIn session found"}
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(storage_state=str(session_file))
            page = await context.new_page()
            
            # Go to company page
            await page.goto("https://www.linkedin.com/showcase/112519238/admin/page-posts/published/", wait_until="domcontentloaded")
            await human_delay(4, 6)
            
            # Try different selectors for "Create a post"
            post_selectors = [
                "Create a post",
                "Start a post", 
                "Create post",
                "post"
            ]
            
            for sel in post_selectors:
                try:
                    btn = page.get_by_role("button", name=sel, exact=False)
                    if await btn.count() > 0:
                        await btn.first.click()
                        log.info(f"Clicked '{sel}'")
                        break
                except:
                    continue
            
            await human_delay(3, 5)
            
            # Take screenshot to see what's on screen
            await page.screenshot(path=str(SESSIONS_DIR.parent / "post_test.png"))
            log.info("Screenshot saved")
            
            # Try to find the text editor and fill content
            textboxes = [
                page.locator('div[role="textbox"]').first,
                page.locator("div[contenteditable='true']").first,
            ]
            
            for tb in textboxes:
                try:
                    if await tb.count() > 0:
                        await tb.click()
                        await human_delay(1, 2)
                        content = SAMPLE_POST["body"]
                        await page.evaluate(f"navigator.clipboard.writeText({json.dumps(content)})")
                        await human_delay(0.5, 1)
                        await page.keyboard.press("Control+V")
                        log.info("Content pasted")
                        break
                except:
                    continue
            
            await human_delay(2, 3)
            
            # Look for Post/Submit button - try multiple selectors
            post_buttons = [
                "Post",
                "Submit",
                "Share"
            ]
            
            for sel in post_buttons:
                try:
                    post_btn = page.get_by_role("button", name=sel, exact=False)
                    if await post_btn.count() > 0:
                        await post_btn.first.click()
                        log.info(f"Clicked '{sel}'")
                        await human_delay(3, 5)
                        break
                except:
                    continue
            
            log.info("POST complete! URL: %s", page.url)
            await browser.close()
            return {"success": True, "type": "post", "url": page.url}
            
    except Exception as e:
        log.error("POST failed: %s", e)
        return {"success": False, "type": "post", "error": str(e)}


async def test_linkedin_article():
    """Test LinkedIn ARTICLE flow"""
    log.info("=" * 60)
    log.info("TESTING: LinkedIn ARTICLE flow")
    log.info("=" * 60)
    
    session_file = SESSIONS_DIR / "linkedin_auth.json"
    if not session_file.exists():
        return {"success": False, "error": "No LinkedIn session found"}
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(storage_state=str(session_file))
            page = await context.new_page()
            
            # Go to company page
            await page.goto("https://www.linkedin.com/showcase/112519238/admin/page-posts/published/", wait_until="domcontentloaded")
            await human_delay(4, 6)
            
            # Click "Write an article"
            article_link = page.locator("a:has-text('article'), button:has-text('article')").first
            if await article_link.count() > 0:
                await article_link.click()
                log.info("Clicked 'Write an article'")
            
            await human_delay(3, 5)
            
            # Fill title
            title_input = page.get_by_placeholder("Title", exact=False)
            await title_input.fill(SAMPLE_ARTICLE["article_title"])
            log.info("Title filled")
            
            await human_delay(1, 2)
            
            # Fill body
            text_editor = page.locator('div[role="textbox"]').first
            await text_editor.click()
            await human_delay(0.5, 1)
            await page.evaluate(f"navigator.clipboard.writeText({json.dumps(SAMPLE_ARTICLE['body'])})")
            await human_delay(0.3, 0.5)
            await page.keyboard.press("Control+V")
            log.info("Body pasted")
            
            await human_delay(2, 3)
            
            # Click Next
            next_btn = page.get_by_role("button", name="Next", exact=False).first
            if await next_btn.count() > 0:
                await next_btn.click()
                log.info("Clicked Next")
                await human_delay(2, 3)
            
            # Fill description
            desc_input = page.get_by_placeholder("Tell your network what your article is about", exact=False)
            if await desc_input.count() > 0:
                await desc_input.fill(SAMPLE_ARTICLE["article_description"])
                log.info("Description filled")
            
            await human_delay(1, 2)
            
            # Click Publish
            publish_btn = page.get_by_role("button", name="Publish", exact=False).first
            if await publish_btn.count() > 0:
                await publish_btn.click()
                log.info("Clicked Publish")
                await human_delay(3, 5)
            
            log.info("ARTICLE complete! URL: %s", page.url)
            await browser.close()
            return {"success": True, "type": "article", "url": page.url}
            
    except Exception as e:
        log.error("ARTICLE failed: %s", e)
        return {"success": False, "type": "article", "error": str(e)}


async def main():
    log.info("=" * 60)
    log.info("LINKEDIN FLOW TEST - POST + ARTICLE")
    log.info("=" * 60)
    
    # Test POST first
    post_result = await test_linkedin_post()
    log.info("POST RESULT: %s", json.dumps(post_result, indent=2))
    
    await asyncio.sleep(3)
    
    # Then test ARTICLE
    article_result = await test_linkedin_article()
    log.info("ARTICLE RESULT: %s", json.dumps(article_result, indent=2))
    
    # Summary
    log.info("=" * 60)
    log.info("SUMMARY")
    log.info("=" * 60)
    log.info("POST: %s", "✅ SUCCESS" if post_result.get("success") else "❌ FAILED")
    log.info("ARTICLE: %s", "✅ SUCCESS" if article_result.get("success") else "❌ FAILED")


if __name__ == "__main__":
    asyncio.run(main())
