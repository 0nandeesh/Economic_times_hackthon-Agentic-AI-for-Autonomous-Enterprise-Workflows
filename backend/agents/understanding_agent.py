from datetime import datetime, timedelta
from typing import List
import uuid

from backend.core.workflow_state import Task
from backend.core.audit import AuditStore


def understanding_agent(meeting_text: str, audit: AuditStore) -> List[Task]:
    """
    Simulated Groq LLM task extraction:
    Each line starting with '-' becomes a task; owner can be provided as '(Name)'.
    """
    lines = [l.strip() for l in meeting_text.splitlines() if l.strip()]
    tasks: List[Task] = []
    default_deadline = datetime.utcnow() + timedelta(days=3)

    for line in lines:
        if not line.startswith("-"):
            continue

        content = line.lstrip("-").strip()
        owner = None
        if "(" in content and ")" in content:
            try:
                before, after = content.split("(", 1)
                owner, _ = after.split(")", 1)
                content = before.strip()
                owner = owner.strip()
            except ValueError:
                pass

        tasks.append(
            Task(
                id=str(uuid.uuid4()),
                title=content,
                owner=owner,
                deadline=default_deadline,
            )
        )

    audit.log_action(
        agent="understanding_agent",
        action="extract_tasks",
        details={"task_count": len(tasks)},
        reasoning="Parsed meeting text into structured tasks using simple heuristics (LLM placeholder).",
    )
    return tasks

