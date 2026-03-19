from typing import Any, Dict, List

from backend.core.workflow_state import WorkflowState
from backend.core.audit import AuditStore


def decision_agent(issues: Dict[str, Any], state: WorkflowState, audit: AuditStore) -> List[Dict[str, Any]]:
    decisions: List[Dict[str, Any]] = []

    for task_id in issues.get("delayed_tasks", []):
        decisions.append(
            {
                "type": "reassign",
                "task_id": task_id,
                "reason": "Task is delayed; reassigning to keep workflow moving.",
            }
        )

    for task_id in issues.get("missing_owner_tasks", []):
        decisions.append(
            {
                "type": "auto_assign",
                "task_id": task_id,
                "owner": "AutoFlow Bot",
                "reason": "Task has no owner; assigning default owner.",
            }
        )

    for task_id in issues.get("blocked_tasks", []):
        decisions.append(
            {
                "type": "escalate",
                "task_id": task_id,
                "reason": "Task is blocked; escalating to project lead.",
            }
        )

    audit.log_action(
        agent="decision_agent",
        action="propose_actions",
        details={"decisions": decisions},
        reasoning="Generated remediation actions for detected workflow issues.",
    )
    return decisions

