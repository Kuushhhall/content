"""
Scheduler for automated social media posting.
Uses APScheduler with Indian timezone (IST).
Integrates with automation_runner for complete daily cycle.
Handles catch-up for missed schedules.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from automation import automation_runner

log = logging.getLogger(__name__)

IST = pytz.timezone('Asia/Kolkata')

SCHEDULE = [
    {"time": "10:00", "platform": "pipeline", "action": "run_pipeline"},
    {"time": "10:30", "platform": "framer", "action": "post"},
    {"time": "11:00", "platform": "linkedin", "action": "post"},
    {"time": "11:00", "platform": "framer", "action": "post"},
    {"time": "11:30", "platform": "framer", "action": "post"},
    {"time": "12:00", "platform": "framer", "action": "post"},
    {"time": "12:30", "platform": "framer", "action": "post"},
    {"time": "13:00", "platform": "framer", "action": "post"},
    {"time": "13:30", "platform": "framer", "action": "post"},
    {"time": "14:00", "platform": "framer", "action": "post"},
    {"time": "14:30", "platform": "framer", "action": "post"},
    {"time": "15:00", "platform": "framer", "action": "post"},
    {"time": "17:00", "platform": "linkedin", "action": "post"},
]


def run_async_action(time: str, platform: str, action: str):
    """Wrapper to run async action from scheduler."""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(automation_runner.execute_scheduled_action(time, platform, action))
        finally:
            loop.close()
    except Exception as e:
        log.error(f"Error running async action {time}-{platform}-{action}: {e}")


def parse_time(time_str: str) -> tuple[int, int]:
    """Parse time string 'HH:MM' to hours and minutes."""
    h, m = map(int, time_str.split(':'))
    return h, m


def is_time_passed(time_str: str) -> bool:
    """Check if the given time has passed today in IST."""
    h, m = parse_time(time_str)
    now = datetime.now(IST)
    scheduled = now.replace(hour=h, minute=m, second=0, microsecond=0)
    return now > scheduled


def get_missed_schedules() -> list:
    """Get all schedules that have been missed today."""
    missed = []
    for item in SCHEDULE:
        if is_time_passed(item["time"]):
            missed.append(item)
    return missed


async def catch_up_missed():
    """Catch up on any missed schedules for today."""
    log.info("Checking for missed schedules...")
    
    status = automation_runner.get_status()
    
    if status.get("status") != "running":
        log.info("No cycle running, skipping catch-up")
        return
    
    missed = get_missed_schedules()
    
    # Filter out pipeline - it was already run in fetch_news_and_start
    missed = [m for m in missed if m.get("action") != "run_pipeline"]
    
    if not missed:
        log.info("No missed post schedules (pipeline already run)")
        return
    
    log.info(f"Found {len(missed)} missed schedules, catching up...")
    
    for item in missed:
        time = item["time"]
        platform = item["platform"]
        action = item["action"]
        
        try:
            log.info(f"Catching up: {time} - {platform} - {action}")
            result = await automation_runner.execute_scheduled_action(time, platform, action)
            
            if result.get("success"):
                log.info(f"Caught up: {time} - {platform} - success")
            else:
                log.warning(f"Caught up: {time} - {platform} - failed: {result.get('error')}")
            
            await asyncio.sleep(2)
            
        except Exception as e:
            log.error(f"Error catching up {time} - {platform}: {e}")


def get_scheduler() -> AsyncIOScheduler:
    """Create and configure the scheduler with all daily jobs."""
    scheduler = AsyncIOScheduler(timezone=IST)
    
    scheduler.add_job(
        lambda: run_async_action("10:00", "pipeline", "run_pipeline"),
        CronTrigger(hour=10, minute=0, timezone=IST),
        id="cycle_start",
        name="Start Daily Cycle (10 AM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("10:30", "framer", "post"),
        CronTrigger(hour=10, minute=30, timezone=IST),
        id="framer_1",
        name="Framer Post #1 (10:30 AM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("11:00", "linkedin", "post"),
        CronTrigger(hour=11, minute=0, timezone=IST),
        id="linkedin_1",
        name="LinkedIn Post #1 (11 AM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("11:00", "framer", "post"),
        CronTrigger(hour=11, minute=0, timezone=IST),
        id="framer_2",
        name="Framer Post #2 (11 AM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("11:30", "framer", "post"),
        CronTrigger(hour=11, minute=30, timezone=IST),
        id="framer_3",
        name="Framer Post #3 (11:30 AM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("12:00", "framer", "post"),
        CronTrigger(hour=12, minute=0, timezone=IST),
        id="framer_4",
        name="Framer Post #4 (12 PM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("12:30", "framer", "post"),
        CronTrigger(hour=12, minute=30, timezone=IST),
        id="framer_5",
        name="Framer Post #5 (12:30 PM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("13:00", "framer", "post"),
        CronTrigger(hour=13, minute=0, timezone=IST),
        id="framer_6",
        name="Framer Post #6 (1 PM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("13:30", "framer", "post"),
        CronTrigger(hour=13, minute=30, timezone=IST),
        id="framer_7",
        name="Framer Post #7 (1:30 PM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("14:00", "framer", "post"),
        CronTrigger(hour=14, minute=0, timezone=IST),
        id="framer_8",
        name="Framer Post #8 (2 PM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("14:30", "framer", "post"),
        CronTrigger(hour=14, minute=30, timezone=IST),
        id="framer_9",
        name="Framer Post #9 (2:30 PM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("15:00", "framer", "post"),
        CronTrigger(hour=15, minute=0, timezone=IST),
        id="framer_10",
        name="Framer Post #10 (3 PM IST)",
        replace_existing=True,
    )
    
    scheduler.add_job(
        lambda: run_async_action("17:00", "linkedin", "post"),
        CronTrigger(hour=17, minute=0, timezone=IST),
        id="linkedin_2",
        name="LinkedIn Post #2 (5 PM IST)",
        replace_existing=True,
    )
    
    return scheduler


def manual_start_with_catchup() -> dict:
    """Manually start cycle with catch-up if needed."""
    now = datetime.now(IST)
    current_time = now.strftime("%H:%M")
    
    log.info(f"Manual start at {current_time} IST")
    
    result = automation_runner.start_new_cycle()
    
    if not result.get("success"):
        return result
    
    if current_time > "10:00":
        log.info("Past 10 AM - triggering catch-up for missed schedules")
        asyncio.create_task(catch_up_missed())
    
    return result


def get_status() -> dict:
    """Get current automation status."""
    status = automation_runner.get_status()
    status["current_time"] = datetime.now(IST).strftime("%H:%M")
    return status


def print_schedule():
    """Print the daily schedule."""
    print("=" * 50)
    print("DAILY AUTOMATION SCHEDULE")
    print("=" * 50)
    for item in SCHEDULE:
        print(f"  {item['time']:6s} - {item['platform']:10s} - {item['action']}")
    print("=" * 50)


if __name__ == "__main__":
    print("Social Media Automation")
    print_schedule()
    
    now = datetime.now(IST)
    print(f"\nCurrent time: {now.strftime('%H:%M IST')}")
    
    status = get_status()
    print(f"Status: {status.get('status')}")
    print(f"Cycle: {status.get('cycle_id')}")
    print(f"Posted: {len(status.get('posted', []))}")
    print(f"Queue: {len(status.get('queue', []))}")
    
    if now.hour >= 10 and status.get("status") != "running":
        print("\n⚠️  Past 10 AM and no cycle running!")
        print("Run manual_start_with_catchup() to start with catch-up")
    
    scheduler = get_scheduler()
    scheduler.start()
    
    print("\n✅ Scheduler started. Press Ctrl+C to stop.")
    
    try:
        asyncio.get_event_loop().run_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        scheduler.shutdown()
