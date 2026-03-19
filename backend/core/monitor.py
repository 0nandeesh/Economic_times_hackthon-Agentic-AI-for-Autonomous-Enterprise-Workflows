from datetime import datetime
from typing import Any, Dict

from backend.core.workflow_state import WorkflowState
from backend.core.audit import AuditStore


def monitoring_agent(state: WorkflowState, audit: AuditStore) -> Dict[str, Any]:
    now = datetime.utcnow()
    delayed_tasks: list[str] = []
    missing_owner_tasks: list[str] = []
    blocked_tasks: list[str] = []

    for task in state.tasks:
        if task.deadline and now > task.deadline and task.status not in ["done"]:
            task.status = "delayed"
            delayed_tasks.append(task.id)
        if not task.owner:
            missing_owner_tasks.append(task.id)
        if task.status == "blocked":
            blocked_tasks.append(task.id)

    penalty = len(delayed_tasks) * 10
    state.health_score = max(0, 100 - penalty)
    if state.health_score >= 80:
        state.status = "healthy"
    elif state.health_score >= 50:
        state.status = "risk"
    else:
        state.status = "critical"

    issues = {
        "delayed_tasks": delayed_tasks,
        "missing_owner_tasks": missing_owner_tasks,
        "blocked_tasks": blocked_tasks,
    }

    audit.log_action(
        agent="monitoring_agent",
        action="scan_workflow_health",
        details=issues | {"health_score": state.health_score, "status": state.status},
        reasoning="Scanned tasks for delays, missing owners, and blocked status, then updated health score.",
    )
    return issues

