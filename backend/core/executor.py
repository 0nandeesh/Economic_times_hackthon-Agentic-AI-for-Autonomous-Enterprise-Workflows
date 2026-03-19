from backend.core.workflow_state import WorkflowState
from backend.core.audit import AuditStore


def execution_agent(state: WorkflowState, audit: AuditStore) -> None:
    for task in state.tasks:
        if task.status == "pending" and not task.dependencies:
            task.status = "in_progress"
        elif task.status == "pending":
            deps_done = all(
                next((t for t in state.tasks if t.id == dep_id), None)
                and next((t for t in state.tasks if t.id == dep_id), None).status == "done"
                for dep_id in task.dependencies
            )
            if deps_done:
                task.status = "in_progress"

    audit.log_action(
        agent="execution_agent",
        action="assign_and_start_tasks",
        details={"tasks": [t.id for t in state.tasks]},
        reasoning="Moved eligible tasks from pending to in_progress based on dependencies.",
    )


def action_agent(decisions: list[dict], state: WorkflowState, audit: AuditStore) -> None:
    for decision in decisions:
        task = next((t for t in state.tasks if t.id == decision["task_id"]), None)
        if not task:
            continue

        if decision["type"] == "reassign":
            old_owner = task.owner
            task.owner = "AutoFlow Bot"
            audit.log_action(
                agent="action_agent",
                action="reassign",
                details={"task_id": task.id, "old_owner": old_owner, "new_owner": task.owner},
                reasoning=decision["reason"],
            )
        elif decision["type"] == "auto_assign":
            old_owner = task.owner
            task.owner = decision.get("owner", "AutoFlow Bot")
            audit.log_action(
                agent="action_agent",
                action="auto_assign",
                details={"task_id": task.id, "old_owner": old_owner, "new_owner": task.owner},
                reasoning=decision["reason"],
            )
        elif decision["type"] == "escalate":
            audit.log_action(
                agent="action_agent",
                action="escalate",
                details={"task_id": task.id},
                reasoning=decision["reason"],
            )

