#!/usr/bin/env python3
"""
Run the content pipeline and save drafts to state.json.
This script should be run BEFORE the Playwright automation.

Usage:
    python run_pipeline.py
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import get_settings
from app.llm.pipeline import run_full_cycle
from app.state.store import StateStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)-20s | %(message)s",
)
log = logging.getLogger(__name__)


async def main():
    """Run the pipeline and save drafts to state.json."""
    log.info("=" * 60)
    log.info("STARTING PIPELINE RUN")
    log.info("=" * 60)
    
    settings = get_settings()
    store = StateStore(settings.state_path)
    
    try:
        result = await run_full_cycle(store, settings)
        
        log.info("=" * 60)
        log.info("PIPELINE COMPLETE")
        log.info(f"Total articles: {result['total_articles']}")
        log.info(f"Drafts created: {result['drafts_created']}")
        log.info(f"Errors: {len(result['errors'])}")
        log.info("=" * 60)
        
        # List drafts by platform
        drafts = store.list_drafts()
        linkedin_drafts = [d for d in drafts if d.platform == "linkedin"]
        x_drafts = [d for d in drafts if d.platform == "x"]
        framer_drafts = [d for d in drafts if d.platform == "framer"]
        
        log.info(f"LinkedIn drafts: {len(linkedin_drafts)}")
        log.info(f"X/Twitter drafts: {len(x_drafts)}")
        log.info(f"Framer drafts: {len(framer_drafts)}")
        
        if result['errors']:
            log.warning("Errors encountered:")
            for error in result['errors']:
                log.warning(f"  - {error}")
        
        return result
        
    except Exception as e:
        log.error(f"Pipeline failed: {e}")
        raise


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)