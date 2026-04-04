"""
Session creator for LinkedIn and X/Twitter.
Run this script ONCE for each platform to save login sessions.
"""

import asyncio
import json
import logging
from pathlib import Path
from playwright.async_api import async_playwright

log = logging.getLogger(__name__)

SESSIONS_DIR = Path(__file__).parent.parent / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)

PLATFORM_URLS = {
    "linkedin": "https://www.linkedin.com/login",
    "twitter": "https://x.com/login",
}


async def save_session(platform: str, timeout_seconds: int = 120) -> dict:
    """
    Open browser, wait for manual login, save session to JSON file.
    
    Args:
        platform: "linkedin" or "twitter"
        timeout_seconds: How long to wait for manual login (default 2 minutes)
    
    Returns:
        dict with success status and file path
    """
    if platform not in PLATFORM_URLS:
        return {"success": False, "error": f"Unknown platform: {platform}"}
    
    url = PLATFORM_URLS[platform]
    session_file = SESSIONS_DIR / f"{platform}_auth.json"
    
    log.info(f"Opening browser for {platform} login...")
    log.info(f"Please log in manually. You have {timeout_seconds} seconds.")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context()
            page = await context.new_page()
            
            await page.goto(url)
            print(f"\n{'='*60}")
            print(f"Please log into {platform.upper()} manually in the browser.")
            print(f"You have {timeout_seconds} seconds to complete login.")
            print(f"{'='*60}\n")
            
            # Wait for manual login
            await page.wait_for_timeout(timeout_seconds * 1000)
            
            # Save session
            await context.storage_state(path=str(session_file))
            
            print(f"\nSession saved to: {session_file}")
            log.info(f"Session saved to {session_file}")
            
            await browser.close()
            
            return {
                "success": True,
                "platform": platform,
                "session_file": str(session_file),
            }
    
    except Exception as e:
        log.error(f"Failed to save session for {platform}: {e}")
        return {"success": False, "error": str(e)}


async def check_session(platform: str) -> bool:
    """
    Verify if saved session is still valid.
    
    Args:
        platform: "linkedin" or "twitter"
    
    Returns:
        True if session is valid, False otherwise
    """
    session_file = SESSIONS_DIR / f"{platform}_auth.json"
    
    if not session_file.exists():
        log.warning(f"No session file found for {platform}")
        return False
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(storage_state=str(session_file))
            page = await context.new_page()
            
            # Try to access the feed
            if platform == "linkedin":
                await page.goto("https://www.linkedin.com/feed/")
                # Check if we're logged in by looking for the feed
                is_valid = "feed" in page.url
            elif platform == "twitter":
                await page.goto("https://x.com/home")
                # Check if we're logged in by looking for the home page
                is_valid = "home" in page.url
            else:
                is_valid = False
            
            await browser.close()
            
            if is_valid:
                log.info(f"Session for {platform} is valid")
            else:
                log.warning(f"Session for {platform} is invalid or expired")
            
            return is_valid
    
    except Exception as e:
        log.error(f"Error checking session for {platform}: {e}")
        return False


async def get_session_status() -> dict:
    """
    Get status of all platform sessions.
    
    Returns:
        dict with platform names and their session status
    """
    status = {}
    for platform in ["linkedin", "twitter"]:
        session_file = SESSIONS_DIR / f"{platform}_auth.json"
        if session_file.exists():
            is_valid = await check_session(platform)
            status[platform] = {
                "exists": True,
                "valid": is_valid,
                "file": str(session_file),
            }
        else:
            status[platform] = {
                "exists": False,
                "valid": False,
                "file": None,
            }
    return status


# CLI interface for manual session creation
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python auth_generator.py <platform>")
        print("Platforms: linkedin, twitter")
        sys.exit(1)
    
    platform = sys.argv[1].lower()
    
    if platform not in PLATFORM_URLS:
        print(f"Unknown platform: {platform}")
        print("Platforms: linkedin, twitter")
        sys.exit(1)
    
    result = asyncio.run(save_session(platform))
    
    if result["success"]:
        print(f"\n✓ {platform.upper()} session saved successfully!")
    else:
        print(f"\n✗ Failed to save {platform.upper()} session: {result.get('error')}")