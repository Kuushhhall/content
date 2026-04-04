"""
Google AI Search client using Playwright.
Handles CAPTCHA auto-retry, extracts full AI response.

Usage:
    client = GoogleAIClient()
    result = await client.search("Past 3 days Indian legal news...")
"""

import asyncio
import json
import logging
import random
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Optional

from playwright.async_api import async_playwright

log = logging.getLogger(__name__)

# Queries to run
SEARCH_QUERIES = [
    "Past 24 hours Indian legal news that is getting traction on social media",
    "Past 3 days Indian legal news that is getting traction on social media",
    "Past 7 days Indian legal news that is getting traction on social media",
]

# Output directory
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


async def human_delay(min_sec: float = 1.0, max_sec: float = 2.0):
    """Small random delay to seem human-like."""
    await asyncio.sleep(random.uniform(min_sec, max_sec))


async def type_like_human(page, text: str):
    """Type text character by character with random delays."""
    for char in text:
        await page.keyboard.type(char, delay=random.randint(50, 150))
        await asyncio.sleep(random.uniform(0.02, 0.08))
    await human_delay(0.3, 0.8)


async def move_mouse_randomly(page):
    """Move mouse in natural pattern."""
    for _ in range(3):
        x = random.randint(100, 800)
        y = random.randint(200, 600)
        await page.mouse.move(x, y)
        await asyncio.sleep(random.uniform(0.1, 0.3))


async def scroll_naturally(page):
    """Scroll in natural increments."""
    for _ in range(random.randint(2, 4)):
        scroll_amount = random.randint(300, 600)
        await page.mouse.wheel(0, scroll_amount)
        await human_delay(0.5, 1.5)


class GoogleAIClient:
    """Google AI Search via Playwright with CAPTCHA handling."""
    
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.browser = None
        self.context = None
        self.page = None
    
    async def __aenter__(self):
        await self._launch_browser()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def _launch_browser(self):
        """Launch browser in incognito mode."""
        log.info("Launching browser (incognito)...")
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--incognito',  # Use incognito mode
            ],
        )
        # Incognito context - no cookies, no history
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1200},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='Asia/Kolkata',
        )
        self.page = await self.context.new_page()
        log.info("Browser launched in incognito mode")
    
    async def close(self):
        """Close browser."""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        log.info("Browser closed")
    
    async def search(self, query: str, max_retries: int = 10) -> dict:
        """
        Search Google AI with auto-retry for CAPTCHA.
        
        Args:
            query: Search query
            max_retries: Maximum CAPTCHA retry attempts
            
        Returns:
            dict with query, timestamp, raw_content, cleaned_content
        """
        log.info("=" * 60)
        log.info(f"SEARCHING: {query}")
        log.info("=" * 60)
        
        attempt = 0
        wait_time = 5  # Start with 5 seconds
        
        while attempt < max_retries:
            attempt += 1
            log.info(f"Attempt {attempt}/{max_retries}")
            
            try:
                # Go to Google
                await self.page.goto("https://www.google.com", wait_until="domcontentloaded", timeout=20000)
                await human_delay(2, 4)  # Wait longer for page to fully load
                
                # Move mouse randomly to seem human
                await move_mouse_randomly(self.page)
                
                # Accept cookies if present
                try:
                    accept = self.page.locator("text='Accept all'").first
                    if await accept.count() > 0:
                        await accept.click()
                        log.info("Accepted cookies")
                        await human_delay(1, 2)
                except Exception:
                    pass
                
                # Move mouse again before typing
                await move_mouse_randomly(self.page)
                await human_delay(0.5, 1)
                
                # Type query like a human - character by character
                log.info("Typing query...")
                search_box = self.page.locator("textarea[name='q']").first
                await search_box.click()
                await human_delay(0.3, 0.6)
                await type_like_human(self.page, query)
                
                # Wait a bit after typing
                await human_delay(0.5, 1)
                
                # Press enter
                await self.page.keyboard.press("Enter")
                log.info("Pressed Enter")
                
                # Wait for results - longer delay
                await self.page.wait_for_load_state("domcontentloaded", timeout=15000)
                await human_delay(4, 6)  # Longer wait for content to render
                
                # Random scroll after search
                await scroll_naturally(self.page)
                
                # Check for CAPTCHA
                if await self._check_captcha():
                    log.warning(f"⚠️ CAPTCHA detected! Waiting {wait_time}s before retry...")
                    await self.page.screenshot(path=str(DATA_DIR / f"captcha_{attempt}.png"))
                    await asyncio.sleep(wait_time)
                    wait_time = min(wait_time * 2, 60)  # Exponential backoff, max 60s
                    continue
                
                # No CAPTCHA - proceed to extract AI content
                log.info("No CAPTCHA - extracting AI content...")
                break
                
            except Exception as e:
                log.error(f"Error on attempt {attempt}: {e}")
                await asyncio.sleep(wait_time)
                wait_time = min(wait_time * 2, 60)
        
        if attempt >= max_retries:
            raise RuntimeError(f"Max CAPTCHA retries ({max_retries}) exceeded")
        
        # Navigate to AI mode
        await self._navigate_to_ai(query)
        
        # Extract content
        raw_content = await self._extract_ai_content()
        cleaned_content = self._clean_text(raw_content)
        
        result = {
            "query": query,
            "timestamp": datetime.now(UTC).isoformat(),
            "raw_content": raw_content,
            "cleaned_content": cleaned_content,
            "attempt": attempt,
        }
        
        # Save to file
        self._save_result(result)
        
        return result
    
    async def _check_captcha(self) -> bool:
        """Check if we're on CAPTCHA/sorry page."""
        selectors = ["text='sorry'", "text='Are you a robot'", "text='Are you a human'", "#captcha-form"]
        for sel in selectors:
            try:
                if await self.page.locator(sel).count() > 0:
                    return True
            except Exception:
                pass
        return False
    
    async def _navigate_to_ai(self, query: str):
        """Navigate to full AI mode - click Show more then Dive deeper."""
        log.info("Navigating to AI mode...")
        
        # Scroll down naturally
        await scroll_naturally(self.page)
        await human_delay(1, 2)
        
        # Try to find and click Show more - with human-like waiting
        try:
            show_more = self.page.get_by_text("Show more", exact=False).first
            if await show_more.count() > 0:
                # Hover first
                await show_more.hover()
                await human_delay(0.5, 1)
                # Then click
                await show_more.click()
                log.info("Clicked 'Show more'")
                await human_delay(3, 5)
        except Exception as e:
            log.debug("Show more not found: %s", e)
        
        # Scroll more naturally
        await scroll_naturally(self.page)
        await human_delay(1, 2)
        
        # Click Dive deeper / Deep dive - with hover
        log.info("Looking for Dive deeper button...")
        for text in ["Deep dive", "Dive deeper", "dive deeper"]:
            try:
                dive_btn = self.page.get_by_text(text, exact=False).first
                if await dive_btn.count() > 0:
                    # Hover first
                    await dive_btn.hover()
                    await human_delay(0.5, 1)
                    # Then click
                    await dive_btn.click()
                    log.info(f"Clicked '{text}'!")
                    await human_delay(6, 10)  # Wait longer for full AI content to load
                    break
            except Exception:
                pass
        
        # Take screenshot for debugging
        await self.page.screenshot(path=str(DATA_DIR / "ai_result.png"))
        log.info("Screenshot saved to data/ai_result.png")
    
    async def _extract_ai_content(self) -> str:
        """Extract EVERYTHING from AI response."""
        log.info("Extracting AI content...")
        
        # Try multiple methods to get AI content
        
        # Method 1: Find by "Searching..." text (AI always starts with this)
        try:
            ai_element = self.page.get_by_text("Searching", exact=False).first
            if await ai_element.count() > 0:
                # Get parent and all children
                parent = await ai_element.locator("..").first
                text = await parent.text_content(timeout=5000)
                if text and len(text) > 100:
                    log.info("Found AI content via 'Searching' text")
                    return text
        except Exception as e:
            log.debug("Method 1 failed: %s", e)
        
        # Method 2: Try CSS selectors for AI container
        selectors = [".I6Teqe", ".CwhRMe", "g-answer", "div[role='complementary']"]
        for sel in selectors:
            try:
                el = self.page.locator(sel).first
                if await el.count() > 0:
                    text = await el.text_content(timeout=5000)
                    if text and len(text) > 100:
                        log.info(f"Found AI content via selector {sel}")
                        return text
            except Exception:
                pass
        
        # Method 3: Get body text and find AI section
        try:
            body = self.page.locator("body")
            if await body.count() > 0:
                full_text = await body.text_content(timeout=5000)
                # Find position of "Searching" and extract from there
                idx = full_text.find("Searching")
                if idx >= 0:
                    log.info("Found AI content via body text search")
                    return full_text[idx:]
                # If no "Searching", return first 50k chars
                return full_text[:50000]
        except Exception as e:
            log.debug("Method 3 failed: %s", e)
        
        # Fallback: just get page content
        log.warning("Using fallback - getting all page text")
        return await self.page.content()
    
    def _clean_text(self, raw: str) -> str:
        """Clean up extracted text."""
        if not raw:
            return ""
        
        lines = raw.split('\n')
        seen = set()
        cleaned = []
        
        for line in lines:
            line = line.strip()
            # Skip very short lines and common UI text
            if len(line) < 30:
                continue
            if line in seen:
                continue
            # Skip common UI/footer elements
            skip_patterns = [
                "Your feedback helps",
                "Privacy Policy",
                "Terms of Service",
                "Learn more",
                "Show more",
                "function(",
                "var ",
                ".css",
                "display:",
                "background:",
            ]
            if any(p in line for p in skip_patterns):
                continue
            
            seen.add(line)
            cleaned.append(line)
        
        return '\n'.join(cleaned)
    
    def _save_result(self, result: dict):
        """Save result to JSON file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = DATA_DIR / f"google_ai_{timestamp}.json"
        
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        log.info(f"Saved to: {filename}")
    
    async def search_all(self) -> list[dict]:
        """Run all 3 queries."""
        results = []
        
        for query in SEARCH_QUERIES:
            try:
                result = await self.search(query)
                results.append(result)
                log.info(f"✓ Completed: {query[:50]}...")
            except Exception as e:
                log.error(f"✗ Failed: {query[:50]}... - {e}")
                results.append({
                    "query": query,
                    "error": str(e),
                })
            
            # Wait between queries - longer for human-like behavior
            await human_delay(8, 15)
        
        # Save combined results
        combined_file = DATA_DIR / "google_ai_all_results.json"
        with open(combined_file, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        log.info(f"All results saved to: {combined_file}")
        return results


async def main():
    """Test the client."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(name)-20s | %(message)s"
    )
    
    async with GoogleAIClient(headless=False) as client:
        result = await client.search("Past 3 days Indian legal news that is getting traction on social media")
        print("\n" + "=" * 60)
        print("EXTRACTED CONTENT (first 2000 chars):")
        print("=" * 60)
        print(result["cleaned_content"][:2000])


if __name__ == "__main__":
    asyncio.run(main())
