from typing import Protocol

from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult


class PlatformPublisher(Protocol):
    def publish(self, draft: ContentDraft, settings: Settings) -> PublishResult: ...
