from datetime import datetime
from typing import Any, Dict, List
import uuid

from backend.core.workflow_state import AuditLog


class AuditStore:
    def __init__(self):
        self.logs: List[AuditLog] = []

    def log_action(self, agent: str, action: str, details: Dict[str, Any], reasoning: str) -> None:
        log = AuditLog(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            agent=agent,
            action=action,
            details=details,
            reasoning=reasoning,
        )
        self.logs.append(log)

