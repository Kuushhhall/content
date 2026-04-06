import json
import logging
import os
import time
import tempfile
from pathlib import Path

from app.state.models import RuntimeState

log = logging.getLogger(__name__)


def atomic_write_json(path: Path, data: dict, max_retries: int = 3, retry_delay: float = 0.1) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    
    for attempt in range(max_retries):
        fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".state_", suffix=".json")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=_json_default)
            os.replace(tmp, path)
            return  # Success
        except PermissionError as e:
            # On Windows, file may be locked - retry
            if os.path.exists(tmp):
                try:
                    os.unlink(tmp)
                except OSError:
                    pass
            if attempt < max_retries - 1:
                log.warning(f"[PERSISTENCE] File locked, retrying (%d/%d): %s", attempt + 1, max_retries, e)
                time.sleep(retry_delay)
            else:
                # Last attempt - try direct write as fallback
                log.warning("[PERSISTENCE] Atomic write failed, using direct write fallback")
                try:
                    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=_json_default), encoding="utf-8")
                except Exception as e2:
                    log.error("[PERSISTENCE] Both atomic and direct write failed: %s", e2)
                    raise e2 from None
        finally:
            # Clean up temp file if it still exists
            if os.path.exists(tmp):
                try:
                    os.unlink(tmp)
                except OSError:
                    pass


def _json_default(obj):
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def load_state(path: Path) -> RuntimeState:
    if not path.exists():
        log.info("No state file at %s - starting empty", path)
        return RuntimeState()
    try:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        return RuntimeState.from_snapshot(data)
    except Exception:
        log.exception("Failed to load state from %s - starting empty", path)
        return RuntimeState()


def save_state(path: Path, state: RuntimeState) -> None:
    snap = state.to_snapshot()
    atomic_write_json(path, snap)
