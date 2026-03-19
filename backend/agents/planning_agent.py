from typing import List

from backend.core.workflow_state import Task
from backend.core.audit import AuditStore


def planning_agent(tasks: List[Task], audit: AuditStore) -> List[Task]:
    for i, task in enumerate(tasks):
        if i == 0:
            task.priority = "high"
        elif i == 1:
            task.priority = "medium"
        else:
            task.priority = "low"

        if i > 0:
            task.dependencies = [tasks[i - 1].id]

    audit.log_action(
        agent="planning_agent",
        action="plan_workflow",
        details={"task_ids": [t.id for t in tasks]},
        reasoning="Assigned priorities and sequential dependencies to tasks.",
    )
    return tasks

