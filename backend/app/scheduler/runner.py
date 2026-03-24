import logging
import traceback
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from app.state.store import StateStore

log = logging.getLogger(__name__)


def run_safe(job_name: str, fn: Callable[[], None]) -> None:
    try:
        log.debug("Job start: %s", job_name)
        fn()
        log.debug("Job done: %s", job_name)
    except Exception:
        log.error("Job failed: %s\n%s", job_name, traceback.format_exc())
