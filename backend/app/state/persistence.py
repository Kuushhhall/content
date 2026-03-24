import json
import logging
import os
import tempfile
from pathlib import Path

from app.state.models import AppStateSnapshot, RuntimeState

log = logging.getLogger(__name__)


def atomic_write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".state_", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=_json_default)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try:
                os.unlink(tmp)
            except OSError:
                pass


def _json_default(obj):  # noqa: ANN001
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def load_state(path: Path) -> RuntimeState:
    if not path.exists():
        log.info("No state file at %s — starting empty", path)
        return RuntimeState()
    try:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw)
        snap = AppStateSnapshot.model_validate(data)
        return RuntimeState.from_snapshot(snap)
    except Exception:
        log.exception("Failed to load state from %s — starting empty", path)
        return RuntimeState()


def save_state(path: Path, state: RuntimeState) -> None:
    snap = state.to_snapshot()
    atomic_write_json(path, snap.model_dump(mode="json"))
