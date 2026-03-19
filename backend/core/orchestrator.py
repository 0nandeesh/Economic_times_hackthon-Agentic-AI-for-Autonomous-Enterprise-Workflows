from backend.core.workflow_state import WorkflowState
from backend.core.audit import AuditStore
from backend.core.monitor import monitoring_agent
from backend.agents.decision_agent import decision_agent
from backend.core.executor import action_agent


def monitoring_cycle(state: WorkflowState, audit: AuditStore) -> None:
    issues = monitoring_agent(state, audit)
    decisions = decision_agent(issues, state, audit)
    action_agent(decisions, state, audit)

