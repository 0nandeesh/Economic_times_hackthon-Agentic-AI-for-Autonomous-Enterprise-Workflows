from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from backend.core.store import STORE
from backend.core.workflow_state import WorkflowState, AuditLog
from backend.agents.understanding_agent import understanding_agent
from backend.agents.planning_agent import planning_agent
from backend.core.executor import execution_agent
from backend.core.orchestrator import monitoring_cycle


router = APIRouter()


class MeetingInput(BaseModel):
    text: str


class DelaySimulation(BaseModel):
    task_id: Optional[str] = None


@router.post("/process-meeting", response_model=WorkflowState)
def process_meeting(meeting: MeetingInput):
    STORE.reset()

    extracted_tasks = understanding_agent(meeting.text, STORE.audit)
    planned_tasks = planning_agent(extracted_tasks, STORE.audit)
    STORE.state.tasks = planned_tasks

    execution_agent(STORE.state, STORE.audit)
    monitoring_cycle(STORE.state, STORE.audit)

    return STORE.state


@router.get("/workflow", response_model=WorkflowState)
def get_workflow():
    return STORE.state


@router.post("/simulate-delay", response_model=WorkflowState)
def simulate_delay(payload: DelaySimulation):
    target_task = None
    if payload.task_id:
        target_task = next((t for t in STORE.state.tasks if t.id == payload.task_id), None)
    else:
        target_task = next((t for t in STORE.state.tasks if t.status == "in_progress"), None)

    if target_task:
        target_task.deadline = datetime.utcnow() - timedelta(minutes=1)
        STORE.audit.log_action(
            agent="simulation",
            action="force_delay",
            details={"task_id": target_task.id},
            reasoning="Simulated delay for demo purposes.",
        )

    monitoring_cycle(STORE.state, STORE.audit)
    return STORE.state


@router.get("/logs", response_model=List[AuditLog])
def get_logs():
    return STORE.audit.logs

