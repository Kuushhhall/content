"""
Auto-poster for LinkedIn and X/Twitter using saved sessions.
Uses Playwright to automate posting with human-like behavior.
Handles nested asyncio by running in thread executor.
"""

import asyncio
import logging
import random
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional
from playwright.async_api import async_playwright

log = logging.getLogger(__name__)

SESSIONS_DIR = Path(__file__).parent.parent / "sessions"

_executor = ThreadPoolExecutor(max_workers=2)


def _run_async_in_executor(coro):
    """Run async coroutine in thread executor to avoid nested asyncio issues."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_in_executor(_executor, lambda: loop.run_until_complete(coro))
    finally:
        loop.close()


async def _human_delay(min_seconds: float = 1.0, max_seconds: float = 3.0):
    """Add human-like random delay between actions."""
    delay = random.uniform(min_seconds, max_seconds)
    await asyncio.sleep(delay)


async def post_to_linkedin(draft: dict, company_id: Optional[str] = "112519238") -> dict:
    """
    Post to LinkedIn company page using saved session.
    
    Supports both simple posts and articles:
    - Simple post: {"body": "content string"}
    - Article: {"article_title": "...", "body": "...", "article_description": "..."}
    
    Args:
        draft: Dictionary with post/article content
        company_id: Company page ID (default: 112519238)
    
    Returns:
        dict with success status and details
    """
    import json
    
    # Handle both dict (new format) and string (old format)
    if isinstance(draft, str):
        # Old format: just body content
        content = draft
        article_title = None
        article_description = None
    else:
        # New format: dict with article_title, body, article_description
        article_title = draft.get("article_title")
        article_description = draft.get("article_description")
        content = draft.get("body", "")
    
    session_file = SESSIONS_DIR / "linkedin_auth.json"
    
    if not session_file.exists():
        return {"success": False, "error": "No LinkedIn session found. Run auth_generator.py first."}
    
    # Determine which flow to use based on whether we have article_title
    use_article_flow = bool(article_title)
    
    log.info("Posting to LinkedIn company page... (article_flow: %s)", use_article_flow)
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(storage_state=str(session_file))
            page = await context.new_page()
            
            company_page_url = f"https://www.linkedin.com/showcase/{company_id}/admin/page-posts/published/"
            await page.goto(company_page_url, wait_until="domcontentloaded")
            await _human_delay(4, 6)
            
            if use_article_flow:
                # === ARTICLE FLOW ===
                log.info("Using Article flow...")
                
                # Click "Write an article" button
                article_buttons = ["Write an article", "Article", "Create article"]
                clicked = False
                
                for btn_text in article_buttons:
                    try:
                        btn = page.get_by_role("button", name=btn_text, exact=False)
                        if await btn.count() > 0:
                            await btn.first.click()
                            log.info("Clicked '%s'", btn_text)
                            clicked = True
                            break
                    except Exception:
                        continue
                
                if not clicked:
                    # Fallback: try link with article text
                    try:
                        article_link = page.locator("a:has-text('article'), button:has-text('article')").first
                        if await article_link.count() > 0:
                            await article_link.click()
                            log.info("Clicked article link/button")
                            clicked = True
                    except Exception:
                        pass
                
                if not clicked:
                    await browser.close()
                    return {"success": False, "error": "Could not find 'Write an article' button"}
                
                await _human_delay(3, 5)
                log.info("Article editor URL: %s", page.url)
                
                # Fill title
                try:
                    title_input = page.get_by_placeholder("Title", exact=False)
                    await title_input.fill(article_title or "")
                    log.info("Title filled")
                except Exception as e:
                    log.warning("Title input not found: %s", e)
                
                await _human_delay(1, 2)
                
                # Fill body
                try:
                    text_editor = page.locator('div[role="textbox"]').first
                    await text_editor.click()
                    await _human_delay(0.5, 1)
                    await page.evaluate(f"navigator.clipboard.writeText({json.dumps(content)})")
                    await _human_delay(0.3, 0.5)
                    await page.keyboard.press("Control+V")
                    log.info("Body pasted")
                except Exception as e:
                    log.warning("Text editor not found, typing directly: %s", e)
                    await page.keyboard.type(content, delay=50)
                
                await _human_delay(2, 3)
                
                # Click Next
                try:
                    next_btn = page.get_by_role("button", name="Next", exact=False).first
                    if await next_btn.count() > 0:
                        await next_btn.click()
                        log.info("Clicked Next")
                        await _human_delay(2, 3)
                except Exception as e:
                    log.warning("Next button not found: %s", e)
                
                # Fill description
                try:
                    desc_input = page.get_by_placeholder("Tell your network what your article is about", exact=False)
                    if await desc_input.count() > 0:
                        await desc_input.fill(article_description or "")
                        log.info("Description filled")
                except Exception as e:
                    log.warning("Description field not found: %s", e)
                
                await _human_delay(1, 2)
                
                # Click Post
                try:
                    publish_btn = page.get_by_role("button", name="Publish", exact=False).first
                    if await publish_btn.count() > 0:
                        await publish_btn.click()
                        log.info("Clicked Publish")
                        await _human_delay(3, 5)
                    else:
                        post_btn = page.get_by_role("button", name="Post", exact=False).first
                        if await post_btn.count() > 0:
                            await post_btn.click()
                            log.info("Clicked Post")
                            await _human_delay(3, 5)
                except Exception as e:
                    log.warning("Publish/Post button not found: %s", e)
                    
            else:
                # === SIMPLE POST FLOW (original) ===
                log.info("Using Simple Post flow...")
                
                # Step 1: Click "Start a post" or similar button
                post_buttons = ["Start a post", "Create a post", "Create post", "New post", "Post"]
                clicked = False
                
                for btn_text in post_buttons:
                    try:
                        btn = page.get_by_role("button", name=btn_text, exact=False)
                        if await btn.count() > 0:
                            await btn.first.click()
                            log.info(f"Clicked '{btn_text}'")
                            clicked = True
                            break
                    except Exception:
                        continue
                
                if not clicked:
                    # Fallback: try to find any button with post text
                    try:
                        admin_area = page.locator("main").first
                        any_post_btn = admin_area.get_by_role("button", name="post", exact=False)
                        if await any_post_btn.count() > 0:
                            await any_post_btn.first.click()
                            log.info("Clicked fallback post button")
                            clicked = True
                    except Exception:
                        pass
                
                if not clicked:
                    await browser.close()
                    return {"success": False, "error": "Could not find post creation button"}
                
                await _human_delay(3, 5)
                
                # Step 2: Find and click the text editor area
                try:
                    # Try to find the textbox
                    textboxes = [
                        page.locator('div[role="textbox"]').first,
                        page.locator("div[contenteditable='true']").first,
                    ]
                    
                    for tb in textboxes:
                        try:
                            if await tb.count() > 0:
                                await tb.click()
                                log.info("Clicked text editor")
                                break
                        except:
                            continue
                    
                    await _human_delay(1, 2)
                    
                    # Step 3: Paste content
                    await page.evaluate(f"navigator.clipboard.writeText({json.dumps(content)})")
                    await _human_delay(0.5, 1)
                    await page.keyboard.press("Control+V")
                    await _human_delay(2, 3)
                    
                except Exception as e:
                    log.warning("Could not paste into editor, trying direct type: %s", e)
                    await page.keyboard.type(content, delay=50)
                
                # Step 4: Click Post button
                await _human_delay(2, 3)
                post_submit_buttons = ["Post", "Submit", "Share", "Publish"]
                
                for btn_text in post_submit_buttons:
                    try:
                        post_btn = page.get_by_role("button", name=btn_text, exact=False)
                        if await post_btn.count() > 0:
                            await post_btn.first.click()
                            log.info(f"Clicked '{btn_text}'")
                            break
                    except Exception:
                        continue
                
                await _human_delay(3, 5)
                await post_btn.click()
                await _human_delay(3, 5)
            
            log.info("Post complete. URL: %s", page.url)
            
            await browser.close()
            
            return {
                "success": True,
                "message": "Posted successfully",
                "url": page.url
            }
            
    except Exception as e:
        log.exception("Failed to post: %s", e)
        return {"success": False, "error": str(e)}


async def post_to_twitter(content: str) -> dict:
    """Post a single tweet to X/Twitter."""
    session_file = SESSIONS_DIR / "twitter_auth.json"
    
    if not session_file.exists():
        return {"success": False, "error": "No Twitter session found. Run auth_generator.py first."}
    
    log.info("Posting to Twitter/X...")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(storage_state=str(session_file))
            page = await context.new_page()
            
            await page.goto("https://x.com/compose/post")
            await _human_delay(2, 4)
            
            tweet_box = page.locator('div[data-testid="tweetTextarea_0"]')
            await tweet_box.wait_for(state="visible")
            await tweet_box.click()
            await _human_delay(0.5, 1)
            
            await tweet_box.fill(content[:280])
            await _human_delay(1, 2)
            
            tweet_btn = page.locator('div[data-testid="tweetButton"]')
            await tweet_btn.click()
            await _human_delay(2, 3)
            
            log.info("Tweet posted successfully!")
            await browser.close()
            
            return {"success": True, "platform": "twitter", "message": "Tweet posted successfully"}
    
    except Exception as e:
        log.error(f"Failed to post to Twitter: %s", e)
        return {"success": False, "error": str(e)}


async def post_twitter_thread(tweets: list[str]) -> dict:
    """Post a thread of tweets to X/Twitter."""
    session_file = SESSIONS_DIR / "twitter_auth.json"
    
    if not session_file.exists():
        return {"success": False, "error": "No Twitter session found"}
    
    log.info("Posting Twitter thread (%d tweets)...", len(tweets))
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(storage_state=str(session_file))
            page = await context.new_page()
            
            await page.goto("https://x.com/home")
            await _human_delay(3, 5)
            
            for i, tweet in enumerate(tweets):
                if i == 0:
                    try:
                        await page.goto("https://x.com/compose/tweet")
                        await _human_delay(2, 3)
                    except:
                        pass
                
                tweet_box = page.locator('div[data-testid="tweetTextarea_0"]')
                await tweet_box.wait_for(state="visible")
                await tweet_box.fill(tweet[:280])
                await _human_delay(1, 2)
                
                tweet_submit = page.locator('div[data-testid="tweetButton"]')
                await tweet_submit.click()
                log.info(f"Tweet {i+1} posted!")
                
                await _human_delay(2, 3)
            
            log.info("Twitter thread posted successfully!")
            await browser.close()
            
            return {"success": True, "platform": "twitter", "message": f"Thread of {len(tweets)} tweets posted"}
    
    except Exception as e:
        log.error(f"Failed to post Twitter thread: %s", e)
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python social_bot.py <platform> <content>")
        print("Platforms: linkedin, twitter")
        print("\nFor Twitter threads: python social_bot.py twitter-thread <tweet1> <tweet2> ...")
        sys.exit(1)
    
    platform = sys.argv[1].lower()
    content = " ".join(sys.argv[2:])
    
    if platform == "linkedin":
        result = asyncio.run(post_to_linkedin({"body": content}))
    elif platform == "twitter":
        result = asyncio.run(post_to_twitter(content))
    elif platform == "twitter-thread":
        tweets = sys.argv[2:]
        result = asyncio.run(post_twitter_thread(tweets))
    else:
        print(f"Unknown platform: {platform}")
        sys.exit(1)
    
    if result.get("success"):
        print(f"\n✓ {platform.upper()} post successful!")
    else:
        print(f"\n✗ {platform.upper()} post failed: {result.get('error')}")