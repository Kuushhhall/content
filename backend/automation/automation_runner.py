"""
Automation Runner - Main automation logic for daily content cycle.
Runs at 10 AM: fetch articles → generate drafts
Posts throughout the day: LinkedIn (11 AM, 5 PM), Framer (10:30 AM - 3:00 PM every 30 min)
Tracks all posts with titles, clears state after completion.
"""

import asyncio
import json
import logging
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import pytz

IST = pytz.timezone('Asia/Kolkata')

BASE_DIR = Path(__file__).parent.parent.parent
BACKEND_DIR = Path(__file__).parent.parent

# Use the same data directory as the FastAPI app (DATA_DIR env var, defaults to content-1/data/)
def _get_data_dir() -> Path:
    import os
    data_dir_env = os.environ.get("DATA_DIR")
    if data_dir_env:
        p = Path(data_dir_env)
        return p if p.is_absolute() else (BACKEND_DIR / p).resolve()
    return BASE_DIR / "data"

DATA_DIR = _get_data_dir()
STATE_PATH = DATA_DIR / "state.json"
POSTED_FILE = DATA_DIR / "automation_status.json"
CYCLE_HISTORY_FILE = DATA_DIR / "cycle_history.json"

log = logging.getLogger(__name__)


def load_automation_status() -> dict:
    """Load current automation status."""
    if POSTED_FILE.exists():
        with open(POSTED_FILE, "r") as f:
            return json.load(f)
    return {
        "cycle_id": None,
        "started_at": None,
        "status": "idle",
        "is_paused": False,
        "queue": [],
        "posted": [],
        "failed": [],
        "cleared_at": None
    }


def save_automation_status(status: dict):
    """Save automation status."""
    with open(POSTED_FILE, "w") as f:
        json.dump(status, f, indent=2)


def get_queue_for_today() -> list:
    """Get posting queue for the day based on time slots."""
    queue = [
        {"time": "10:00", "platform": "pipeline", "action": "run_pipeline", "title": "Run Content Pipeline"},
        {"time": "10:30", "platform": "framer", "action": "post", "title": None},
        {"time": "11:00", "platform": "linkedin", "action": "post", "title": None},
        {"time": "11:00", "platform": "framer", "action": "post", "title": None},
        {"time": "11:30", "platform": "framer", "action": "post", "title": None},
        {"time": "12:00", "platform": "framer", "action": "post", "title": None},
        {"time": "12:30", "platform": "framer", "action": "post", "title": None},
        {"time": "13:00", "platform": "framer", "action": "post", "title": None},
        {"time": "13:30", "platform": "framer", "action": "post", "title": None},
        {"time": "14:00", "platform": "framer", "action": "post", "title": None},
        {"time": "14:30", "platform": "framer", "action": "post", "title": None},
        {"time": "15:00", "platform": "framer", "action": "post", "title": None},
        {"time": "17:00", "platform": "linkedin", "action": "post", "title": None},
    ]
    return queue


def load_state_drafts() -> dict:
    """Load drafts from state.json."""
    if not STATE_PATH.exists():
        return {"drafts": []}
    with open(STATE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_drafts_by_platform(platform: str) -> list:
    """Get available drafts for a platform."""
    state = load_state_drafts()
    drafts = state.get("drafts", [])
    status = load_automation_status()
    
    posted_ids = [p["draft_id"] for p in status.get("posted", [])]
    
    platform_drafts = [d for d in drafts if d.get("platform") == platform]
    available = [d for d in platform_drafts if d.get("id") not in posted_ids]
    
    return available


def get_next_draft(platform: str) -> Optional[dict]:
    """Get next available draft for a platform."""
    available = get_drafts_by_platform(platform)
    if available:
        return available[0]
    return None


async def run_pipeline() -> dict:
    """Run the content pipeline to fetch articles and generate drafts."""
    log.info("=" * 50)
    log.info("RUNNING CONTENT PIPELINE")
    log.info("=" * 50)
    
    try:
        result = subprocess.run(
            [sys.executable, str(BASE_DIR / "backend" / "run_pipeline.py")],
            capture_output=True,
            text=True,
            timeout=600,
            cwd=str(BASE_DIR)
        )
        
        if result.returncode == 0:
            log.info("Pipeline completed successfully")
            return {"success": True, "output": result.stdout}
        else:
            log.error(f"Pipeline failed: {result.stderr}")
            return {"success": False, "error": result.stderr}
    
    except Exception as e:
        log.error(f"Pipeline error: {e}")
        return {"success": False, "error": str(e)}


async def post_to_linkedin(draft: dict) -> dict:
    """Post a draft to LinkedIn. Uses subprocess to avoid nested asyncio."""
    import subprocess
    import json
    
    content = draft.get("body", "")
    
    script = f'''
import sys
sys.path.insert(0, {json.dumps(str(BASE_DIR / "backend"))})
import asyncio
import json
from automation.social_bot import post_to_linkedin
async def main():
    result = await post_to_linkedin({json.dumps(content)})
    print("RESULT:" + json.dumps(result))
asyncio.run(main())
'''
    
    try:
        result = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=str(BASE_DIR)
        )
        
        if result.returncode == 0:
            output = result.stdout
            if "RESULT:" in output:
                result_data = json.loads(output.split("RESULT:")[1])
                return {
                    "draft_id": draft.get("id"),
                    "title": draft.get("summary", "")[:80] or draft.get("body", "")[:80],
                    "platform": "linkedin",
                    "success": result_data.get("success", False),
                    "external_id": None,
                    "error": result_data.get("error") if not result_data.get("success") else None
                }
        
        return {
            "draft_id": draft.get("id"),
            "title": draft.get("summary", "")[:80] or draft.get("body", "")[:80],
            "platform": "linkedin",
            "success": False,
            "external_id": None,
            "error": result.stderr or "Post failed"
        }
        
    except Exception as e:
        return {
            "draft_id": draft.get("id"),
            "title": draft.get("summary", "")[:80] or draft.get("body", "")[:80],
            "platform": "linkedin",
            "success": False,
            "external_id": None,
            "error": str(e)
        }


def post_to_framer(draft: dict) -> dict:
    """Post a draft to Framer CMS."""
    import uuid
    from app.core.config import get_settings
    from app.models.draft import ContentDraft
    from app.platforms.framer import publish
    
    settings = get_settings()
    
    draft_obj = ContentDraft(
        id=draft.get("id", str(uuid.uuid4())),
        article_id=draft.get("article_id", ""),
        platform="framer",
        body=draft.get("body", ""),
        summary=draft.get("summary", ""),
    )
    
    result = publish(draft_obj, settings)
    
    return {
        "draft_id": draft.get("id"),
        "title": draft.get("summary", "")[:80] or draft.get("body", "")[:80],
        "platform": "framer",
        "success": result.success,
        "external_id": result.external_id,
        "error": result.message if not result.success else None
    }


def generate_cycle_id() -> str:
    """Generate a unique cycle ID."""
    import uuid
    return f"cycle_{datetime.now(IST).strftime('%Y%m%d')}_{str(uuid.uuid4())[:6]}"


def start_new_cycle() -> dict:
    """Start a new automation cycle."""
    status = load_automation_status()
    
    if status.get("status") == "running":
        log.warning("Cycle already running")
        return {"success": False, "error": "Cycle already running"}
    
    cycle_id = generate_cycle_id()
    now = datetime.now(IST).isoformat()
    
    new_status = {
        "cycle_id": cycle_id,
        "started_at": now,
        "status": "running",
        "is_paused": False,
        "queue": get_queue_for_today(),
        "posted": [],
        "failed": [],
        "cleared_at": None
    }
    
    save_automation_status(new_status)
    log.info(f"Started new cycle: {cycle_id}")
    
    return {"success": True, "cycle_id": cycle_id}


def update_queue_titles(status: dict) -> dict:
    """Update queue with actual draft titles."""
    state = load_state_drafts()
    drafts = state.get("drafts", [])
    
    posted_ids = [p["draft_id"] for p in status.get("posted", [])]
    failed_ids = [p["draft_id"] for p in status.get("failed", [])]
    used_ids = posted_ids + failed_ids
    
    linkedin_drafts = [d for d in drafts if d.get("platform") == "linkedin" and d.get("id") not in used_ids]
    framer_drafts = [d for d in drafts if d.get("platform") == "framer" and d.get("id") not in used_ids]
    
    linkedin_idx = 0
    framer_idx = 0
    
    for item in status.get("queue", []):
        if item.get("action") == "post":
            if item.get("platform") == "linkedin" and linkedin_idx < len(linkedin_drafts):
                draft = linkedin_drafts[linkedin_idx]
                item["title"] = (draft.get("summary", "") or draft.get("body", "")[:80]) if draft else "No draft available"
                item["draft_id"] = draft.get("id") if draft else None
                linkedin_idx += 1
            elif item.get("platform") == "framer" and framer_idx < len(framer_drafts):
                draft = framer_drafts[framer_idx]
                item["title"] = (draft.get("summary", "") or draft.get("body", "")[:80]) if draft else "No draft available"
                item["draft_id"] = draft.get("id") if draft else None
                framer_idx += 1
    
    return status


def record_posted(post_result: dict):
    """Record a successfully posted draft."""
    status = load_automation_status()
    
    posted_entry = {
        "draft_id": post_result.get("draft_id"),
        "title": post_result.get("title"),
        "platform": post_result.get("platform"),
        "posted_at": datetime.now(IST).isoformat(),
        "external_id": post_result.get("external_id"),
        "error": post_result.get("error")
    }
    
    status["posted"].append(posted_entry)
    
    status["queue"] = [
        q for q in status["queue"]
        if not (q.get("draft_id") == post_result.get("draft_id") and q.get("platform") == post_result.get("platform"))
    ]
    
    if not post_result.get("success"):
        status["failed"].append(posted_entry)
    
    save_automation_status(status)
    log.info(f"Recorded post: {post_result.get('title')} to {post_result.get('platform')}")


def record_failed(draft_id: str, platform: str, error: str):
    """Record a failed post."""
    status = load_automation_status()
    
    failed_entry = {
        "draft_id": draft_id,
        "title": "Unknown",
        "platform": platform,
        "posted_at": datetime.now(IST).isoformat(),
        "external_id": None,
        "error": error
    }
    
    status["failed"].append(failed_entry)
    save_automation_status(status)


def clear_state_json():
    """Clear state.json after cycle completion."""
    if STATE_PATH.exists():
        backup_path = STATE_PATH.parent / f"state_backup_{datetime.now(IST).strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(STATE_PATH, "r", encoding="utf-8") as f:
                backup_data = json.load(f)
            
            with open(backup_path, "w", encoding="utf-8") as f:
                json.dump(backup_data, f, indent=2)
        except Exception as e:
            log.warning(f"Could not backup state.json: {e}")
        
        with open(STATE_PATH, "w", encoding="utf-8") as f:
            json.dump({"articles": [], "drafts": []}, f)
        
        log.info("Cleared state.json")


def clear_for_new_cycle():
    """Prepare for new cycle - clear state and reset status."""
    clear_state_json()
    
    status = load_automation_status()
    status["status"] = "completed"
    status["cleared_at"] = datetime.now(IST).isoformat()
    save_automation_status(status)
    
    add_to_cycle_history(status)
    
    new_status = {
        "cycle_id": None,
        "started_at": None,
        "status": "idle",
        "is_paused": False,
        "queue": [],
        "posted": [],
        "failed": [],
        "cleared_at": None
    }
    save_automation_status(new_status)
    
    log.info("Ready for new cycle")


def full_reset():
    """Complete reset of all automation state."""
    log.info("=" * 50)
    log.info("FULL RESET - Clearing all state")
    log.info("=" * 50)
    
    clear_state_json()
    
    if POSTED_FILE.exists():
        with open(POSTED_FILE, "w") as f:
            json.dump([], f)
        log.info("Cleared posted_drafts.json")
    
    new_status = {
        "cycle_id": None,
        "started_at": None,
        "status": "idle",
        "is_paused": False,
        "queue": [],
        "posted": [],
        "failed": [],
        "cleared_at": None
    }
    save_automation_status(new_status)
    
    log.info("Full reset complete")
    return {"success": True, "message": "All state cleared"}


async def fetch_news_and_start() -> dict:
    """Fetch news (run pipeline), then start cycle with catch-up."""
    log.info("=" * 50)
    log.info("FETCHING NEWS AND STARTING CYCLE")
    log.info("=" * 50)
    
    full_reset()
    
    log.info("Running pipeline to fetch news...")
    pipeline_result = await run_pipeline()
    
    if not pipeline_result.get("success"):
        return {"success": False, "error": f"Pipeline failed: {pipeline_result.get('error')}"}
    
    log.info("Pipeline complete. Starting cycle...")
    cycle_result = start_new_cycle()
    
    if not cycle_result.get("success"):
        return {"success": False, "error": f"Start cycle failed: {cycle_result.get('error')}"}
    
    cycle_id = cycle_result.get("cycle_id")
    
    now = datetime.now(IST)
    current_time = now.strftime("%H:%M")
    
    if current_time > "10:00":
        log.info(f"Past 10 AM ({current_time}) - catching up missed schedules...")
        from automation.scheduler import catch_up_missed
        await catch_up_missed()
    
    return {
        "success": True,
        "cycle_id": cycle_id,
        "message": f"News fetched, cycle started, catch-up triggered if needed"
    }


async def post_now_override() -> dict:
    """Override: run pipeline and post immediately to all available platforms."""
    log.info("=" * 50)
    log.info("POST NOW OVERRIDE - Immediate pipeline + posting")
    log.info("=" * 50)
    
    full_reset()
    
    log.info("Running pipeline to fetch news...")
    pipeline_result = await run_pipeline()
    
    if not pipeline_result.get("success"):
        return {"success": False, "error": f"Pipeline failed: {pipeline_result.get('error')}"}
    
    log.info("Pipeline complete. Starting cycle...")
    cycle_result = start_new_cycle()
    
    if not cycle_result.get("success"):
        return {"success": False, "error": f"Start cycle failed: {cycle_result.get('error')}"}
    
    cycle_id = cycle_result.get("cycle_id")
    
    state = load_state_drafts()
    drafts = state.get("drafts", [])
    
    linkedin_drafts = [d for d in drafts if d.get("platform") == "linkedin"]
    framer_drafts = [d for d in drafts if d.get("platform") == "framer"]
    
    log.info(f"Found drafts - LinkedIn: {len(linkedin_drafts)}, Framer: {len(framer_drafts)}")
    
    posted_count = 0
    
    for draft in linkedin_drafts:
        try:
            result = await post_to_linkedin(draft)
            record_posted(result)
            if result.get("success"):
                posted_count += 1
            log.info(f"Posted LinkedIn: {draft.get('id')[:8]}...")
            await asyncio.sleep(2)
        except Exception as e:
            log.error(f"Failed to post LinkedIn: {e}")
    
    for draft in framer_drafts:
        try:
            result = post_to_framer(draft)
            record_posted({
                "draft_id": draft.get("id"),
                "title": draft.get("summary", "")[:80],
                "platform": "framer",
                "success": result.success,
                "external_id": result.external_id,
                "error": result.message if not result.success else None
            })
            if result.success:
                posted_count += 1
            log.info(f"Posted Framer: {draft.get('id')[:8]}...")
            await asyncio.sleep(2)
        except Exception as e:
            log.error(f"Failed to post Framer: {e}")
    
    return {
        "success": True,
        "cycle_id": cycle_id,
        "message": f"Posted {posted_count} items immediately",
        "posts_published": posted_count
    }


def add_to_cycle_history(status: dict):
    """Add completed cycle to history."""
    history = []
    if CYCLE_HISTORY_FILE.exists():
        with open(CYCLE_HISTORY_FILE, "r") as f:
            history = json.load(f)
    
    history.append({
        "cycle_id": status.get("cycle_id"),
        "started_at": status.get("started_at"),
        "completed_at": datetime.now(IST).isoformat(),
        "posts_published": len(status.get("posted", [])),
        "posts_failed": len(status.get("failed", [])),
        "platforms": list(set([p["platform"] for p in status.get("posted", [])]))
    })
    
    history = history[-30:]
    
    with open(CYCLE_HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


def is_cycle_complete() -> bool:
    """Check if all drafts have been posted."""
    status = load_automation_status()
    
    if status.get("status") != "running":
        return False
    
    state = load_state_drafts()
    total_drafts = len(state.get("drafts", []))
    total_posted = len(status.get("posted", []))
    total_failed = len(status.get("failed", []))
    
    return (total_posted + total_failed) >= total_drafts and total_drafts > 0


def get_status() -> dict:
    """Get current automation status."""
    status = load_automation_status()
    
    if status.get("status") == "running":
        status = update_queue_titles(status)
        save_automation_status(status)
    
    state = load_state_drafts()
    drafts = state.get("drafts", [])
    
    status["total_drafts"] = len(drafts)
    status["linkedin_drafts"] = len([d for d in drafts if d.get("platform") == "linkedin"])
    status["framer_drafts"] = len([d for d in drafts if d.get("platform") == "framer"])
    status["x_drafts"] = len([d for d in drafts if d.get("platform") in ("x", "twitter")])

    return status


def pause_cycle() -> dict:
    """Pause the current cycle."""
    status = load_automation_status()
    if status.get("status") != "running":
        return {"success": False, "error": "No running cycle to pause"}
    
    status["is_paused"] = True
    save_automation_status(status)
    log.info("Cycle paused")
    return {"success": True, "message": "Cycle paused"}


def resume_cycle() -> dict:
    """Resume a paused cycle."""
    status = load_automation_status()
    if status.get("status") != "running":
        return {"success": False, "error": "No running cycle to resume"}
    
    if not status.get("is_paused"):
        return {"success": False, "error": "Cycle is not paused"}
    
    status["is_paused"] = False
    save_automation_status(status)
    log.info("Cycle resumed")
    return {"success": True, "message": "Cycle resumed"}


def skip_current_post() -> dict:
    """Skip the current scheduled post and move to next."""
    status = load_automation_status()
    if status.get("status") != "running":
        return {"success": False, "error": "No running cycle"}
    
    if status.get("is_paused"):
        return {"success": False, "error": "Cycle is paused"}
    
    if status.get("queue"):
        skipped = status["queue"].pop(0)
        save_automation_status(status)
        log.info(f"Skipped: {skipped}")
        return {"success": True, "skipped": skipped}
    
    return {"success": False, "error": "No items in queue to skip"}


def retry_failed_post(draft_id: Optional[str] = None) -> dict:
    """Retry a failed post or the most recent failed post."""
    status = load_automation_status()
    
    if status.get("status") != "running":
        return {"success": False, "error": "No running cycle"}
    
    failed = status.get("failed", [])
    if not failed:
        return {"success": False, "error": "No failed posts to retry"}
    
    if draft_id:
        post_to_retry = next((f for f in failed if f.get("draft_id") == draft_id), None)
    else:
        post_to_retry = failed[0]
    
    if not post_to_retry:
        return {"success": False, "error": "Failed post not found"}
    
    platform = post_to_retry.get("platform")
    draft = get_next_draft(platform)
    
    if not draft:
        return {"success": False, "error": f"No {platform} draft available for retry"}
    
    import asyncio
    if platform == "linkedin":
        result = asyncio.run(post_to_linkedin(draft))
    elif platform == "framer":
        result = post_to_framer(draft)
    else:
        return {"success": False, "error": f"Retry not supported for {platform}"}
    
    if result.get("success"):
        status["failed"] = [f for f in failed if f.get("draft_id") != post_to_retry.get("draft_id")]
        save_automation_status(status)
        record_posted(result)
        return {"success": True, "message": f"Retry successful for {platform}"}
    
    return {"success": False, "error": result.get("error", "Retry failed")}


def get_draft_content(draft_id: str) -> dict:
    """Get full draft content for preview."""
    state = load_state_drafts()
    drafts = state.get("drafts", [])
    
    draft = next((d for d in drafts if d.get("id") == draft_id), None)
    
    if not draft:
        return {"success": False, "error": "Draft not found"}
    
    return {
        "success": True,
        "draft": {
            "id": draft.get("id"),
            "platform": draft.get("platform"),
            "title": draft.get("summary"),
            "body": draft.get("body"),
            "article_id": draft.get("article_id")
        }
    }


async def post_specific_draft(draft_id: str) -> dict:
    """Post a specific draft by ID."""
    state = load_state_drafts()
    drafts = state.get("drafts", [])
    
    draft = next((d for d in drafts if d.get("id") == draft_id), None)
    
    if not draft:
        return {"success": False, "error": "Draft not found"}
    
    platform = draft.get("platform")
    log.info(f"Posting specific draft: {draft_id} to {platform}")
    
    try:
        if platform == "linkedin":
            result = await post_to_linkedin(draft)
        elif platform == "framer":
            result = post_to_framer(draft)
            result = {
                "draft_id": draft.get("id"),
                "title": draft.get("summary", "")[:80],
                "platform": "framer",
                "success": result.success,
                "external_id": result.external_id,
                "error": result.message if not result.success else None
            }
        elif platform in ["x", "twitter"]:
            return {"success": False, "error": "Twitter posting disabled"}
        else:
            return {"success": False, "error": f"Unknown platform: {platform}"}
        
        if result.get("success"):
            record_posted(result)
            return {"success": True, "message": f"Posted to {platform}", "result": result}
        else:
            record_posted({
                "draft_id": draft_id,
                "title": draft.get("summary", "")[:80],
                "platform": platform,
                "success": False,
                "external_id": None,
                "error": result.get("error")
            })
            return {"success": False, "error": result.get("error", "Post failed")}
    
    except Exception as e:
        log.error(f"Failed to post draft {draft_id}: {e}")
        record_posted({
            "draft_id": draft_id,
            "title": draft.get("summary", "")[:80],
            "platform": platform,
            "success": False,
            "external_id": None,
            "error": str(e)
        })
        return {"success": False, "error": str(e)}


async def execute_scheduled_action(time_slot: str, platform: str, action: str) -> dict:
    """Execute a scheduled action."""
    log.info(f"Executing: {time_slot} - {platform} - {action}")
    
    status = load_automation_status()
    
    if status.get("is_paused"):
        return {"success": False, "error": "Cycle is paused. Resume to continue."}
    
    if action == "run_pipeline":
        result = await run_pipeline()
        if result.get("success"):
            status = load_automation_status()
            status = update_queue_titles(status)
            save_automation_status(status)
        return result
    
    if action == "post":
        draft = get_next_draft(platform)
        
        if not draft:
            log.warning(f"No available {platform} draft")
            return {"success": False, "error": "No draft available"}
        
        if platform == "linkedin":
            result = await post_to_linkedin(draft)
        elif platform == "framer":
            result = post_to_framer(draft)
        else:
            return {"success": False, "error": f"Unknown platform: {platform}"}
        
        record_posted(result)
        
        if is_cycle_complete():
            log.info("Cycle complete - clearing state")
            clear_for_new_cycle()
        
        return result
    
    return {"success": False, "error": "Unknown action"}


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Automation Runner")
    parser.add_argument("command", choices=["start", "status", "execute", "clear"], help="Command to run")
    parser.add_argument("--time", help="Time slot for execute")
    parser.add_argument("--platform", help="Platform for execute")
    parser.add_argument("--action", help="Action for execute")
    
    args = parser.parse_args()
    
    if args.command == "start":
        result = start_new_cycle()
        print(json.dumps(result))
    elif args.command == "status":
        print(json.dumps(get_status(), indent=2))
    elif args.command == "execute":
        if not args.time or not args.platform or not args.action:
            print("Error: --time, --platform, and --action required")
            sys.exit(1)
        result = asyncio.run(execute_scheduled_action(args.time, args.platform, args.action))
        print(json.dumps(result))
    elif args.command == "clear":
        clear_for_new_cycle()
        print(json.dumps({"success": True}))
