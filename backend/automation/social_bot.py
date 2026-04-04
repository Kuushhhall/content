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


async def post_to_linkedin(content: str, company_id: Optional[str] = "112519238") -> dict:
    """
    Post to LinkedIn company page using saved session.
    
    Args:
        content: The post content to publish
        company_id: Company page ID (default: 112519238)
    
    Returns:
        dict with success status and details
    """
    import json
    session_file = SESSIONS_DIR / "linkedin_auth.json"
    
    if not session_file.exists():
        return {"success": False, "error": "No LinkedIn session found. Run auth_generator.py first."}
    
    log.info("Posting to LinkedIn company page...")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(storage_state=str(session_file))
            page = await context.new_page()
            
            company_page_url = f"https://www.linkedin.com/showcase/{company_id}/admin/page-posts/published/"
            await page.goto(company_page_url, wait_until="domcontentloaded")
            await _human_delay(4, 6)
            
            post_buttons = ["Create a post", "Start a post", "Create post", "New post"]
            clicked = False
            
            for btn_text in post_buttons:
                try:
                    btn = page.get_by_role("button", name=btn_text, exact=False)
                    if await btn.count() > 0:
                        await btn.click()
                        log.info(f"Clicked '{btn_text}'")
                        clicked = True
                        break
                except Exception:
                    continue
            
            if not clicked:
                admin_area = page.locator("main").first
                any_post_btn = admin_area.get_by_role("button", name="post", exact=False)
                if await any_post_btn.count() > 0:
                    await any_post_btn.first.click()
                    log.info("Clicked fallback post button")
                    clicked = True
            
            if not clicked:
                await browser.close()
                return {"success": False, "error": "Could not find post creation button"}
            
            await _human_delay(2, 3)
            
            editor = page.get_by_role("textbox", name="Text editor")
            await editor.wait_for(state="visible", timeout=10000)
            await editor.click()
            await _human_delay(1, 2)
            
            await page.evaluate(f"navigator.clipboard.writeText({json.dumps(content)})")
            await _human_delay(0.5, 1)
            await page.keyboard.press("Control+V")
            await _human_delay(2, 3)
            
            dialog = page.locator('div[role="dialog"]').last
            if await dialog.count() > 0:
                post_btn = dialog.locator("button.share-actions__primary-action")
            else:
                post_btn = page.locator("button.share-actions__primary-action")
            
            await post_btn.wait_for(state="visible", timeout=10000)
            await post_btn.click()
            await _human_delay(3, 5)
            
            log.info("LinkedIn company page post successful!")
            await browser.close()
            
            return {
                "success": True,
                "platform": "linkedin",
                "message": "Post published successfully",
            }
    
    except Exception as e:
        log.error(f"Failed to post to LinkedIn: {e}")
        return {"success": False, "error": str(e)}


async def post_to_twitter(content: str) -> dict:
    """
    Post a single tweet to X/Twitter using saved session.
    
    Args:
        content: The tweet content (max 280 characters)
    
    Returns:
        dict with success status and details
    """
    session_file = SESSIONS_DIR / "twitter_auth.json"
    
    if not session_file.exists():
        return {"success": False, "error": "No Twitter session found. Run auth_generator.py first."}
    
    log.info("Posting to Twitter/X...")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(storage_state=str(session_file))
            page = await context.new_page()
            
            # Navigate to compose tweet
            await page.goto("https://x.com/compose/post")
            await _human_delay(2, 4)
            
            # Find and fill tweet box
            tweet_box = page.locator('div[data-testid="tweetTextarea_0"]')
            await tweet_box.wait_for(state="visible")
            await tweet_box.click()
            await _human_delay(0.5, 1)
            
            # Type content
            await tweet_box.fill(content[:280])
            await _human_delay(1, 2)
            
            # Click Tweet button
            tweet_btn = page.locator('div[data-testid="tweetButton"]')
            await tweet_btn.click()
            await _human_delay(2, 3)
            
            log.info("Tweet posted successfully!")
            await browser.close()
            
            return {
                "success": True,
                "platform": "twitter",
                "message": "Tweet posted successfully",
            }
    
    except Exception as e:
        log.error(f"Failed to post to Twitter: {e}")
        return {"success": False, "error": str(e)}


async def post_twitter_thread(tweets: list[str]) -> dict:
    """
    Post a thread of tweets to X/Twitter.
    
    Args:
        tweets: List of tweet contents (each max 280 characters)
    
    Returns:
        dict with success status and details
    """
    session_file = SESSIONS_DIR / "twitter_auth.json"
    
    if not session_file.exists():
        return {"success": False, "error": "No Twitter session found. Run auth_generator.py first."}
    
    log.info(f"Posting Twitter thread with {len(tweets)} tweets...")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(storage_state=str(session_file))
            page = await context.new_page()
            
            posted_urls = []
            
            for i, tweet in enumerate(tweets):
                log.info(f"Posting tweet {i+1}/{len(tweets)}...")
                
                if i == 0:
                    # First tweet: compose new
                    await page.goto("https://x.com/compose/post")
                    await _human_delay(2, 4)
                    
                    tweet_box = page.locator('div[data-testid="tweetTextarea_0"]')
                    await tweet_box.wait_for(state="visible")
                    await tweet_box.click()
                    await _human_delay(0.5, 1)
                    await tweet_box.fill(tweet[:280])
                    await _human_delay(1, 2)
                    
                    # Click Tweet button
                    tweet_btn = page.locator('div[data-testid="tweetButton"]')
                    await tweet_btn.click()
                    await _human_delay(2, 3)
                    
                else:
                    # Reply to previous tweet
                    # Click Reply button on the last tweet
                    reply_btn = page.locator('div[data-testid="reply"]').last
                    await reply_btn.click()
                    await _human_delay(1, 2)
                    
                    # Fill reply
                    reply_box = page.locator('div[data-testid="tweetTextarea_0"]')
                    await reply_box.wait_for(state="visible")
                    await reply_box.click()
                    await _human_delay(0.5, 1)
                    await reply_box.fill(tweet[:280])
                    await _human_delay(1, 2)
                    
                    # Click Reply button
                    reply_submit = page.locator('div[data-testid="tweetButton"]')
                    await reply_submit.click()
                    await _human_delay(2, 3)
                
                log.info(f"Tweet {i+1} posted!")
            
            log.info("Twitter thread posted successfully!")
            await browser.close()
            
            return {
                "success": True,
                "platform": "twitter",
                "tweets_posted": len(tweets),
                "message": f"Thread with {len(tweets)} tweets posted successfully",
            }
    
    except Exception as e:
        log.error(f"Failed to post Twitter thread: {e}")
        return {"success": False, "error": str(e)}


# async def post_thread_sequential(tweets: list[str]) -> list[dict]:
#     """
#     Post tweets one by one with delays (for manual thread creation).
    
#     Args:
#         tweets: List of tweet contents
    
#     Returns:
#         List of results for each tweet
#     """
#     results = []
    
#     for i, tweet in enumerate(tweets):
#         log.info(f"Posting tweet {i+1}/{len(tweets)}...")
#         result = await post_to_twitter(tweet)
#         results.append(result)
        
#         if not result["success"]:
#             log.error(f"Failed at tweet {i+1}, stopping thread")
#             break
        
#         # Wait between tweets
#         if i < len(tweets) - 1:
#             await _human_delay(3, 5)
    
#     return results


# CLI interface for manual posting
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python social_bot.py <platform> <content>")
        print("Platforms: linkedin, twitter")
        print("\nFor Twitter threads, use: python social_bot.py twitter-thread <tweet1> <tweet2> ...")
        sys.exit(1)
    
    platform = sys.argv[1].lower()
    content = " ".join(sys.argv[2:])
    
    if platform == "linkedin":
        result = asyncio.run(post_to_linkedin(content))
    elif platform == "twitter":
        result = asyncio.run(post_to_twitter(content))
    elif platform == "twitter-thread":
        tweets = sys.argv[2:]
        result = asyncio.run(post_twitter_thread(tweets))
    else:
        print(f"Unknown platform: {platform}")
        sys.exit(1)
    
    if result["success"]:
        print(f"\n✓ {platform.upper()} post successful!")
    else:
        print(f"\n✗ {platform.upper()} post failed: {result.get('error')}")