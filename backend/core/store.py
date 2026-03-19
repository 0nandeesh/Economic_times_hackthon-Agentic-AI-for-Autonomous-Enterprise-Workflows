from backend.core.workflow_state import WorkflowState
from backend.core.audit import AuditStore


class InMemoryStore:
    """
    Database-free store for demo: keep all workflow state and audit logs in memory.
    """

    def __init__(self):
        self.state = WorkflowState()
        self.audit = AuditStore()

    def reset(self) -> None:
        self.state = WorkflowState()


STORE = InMemoryStore()

