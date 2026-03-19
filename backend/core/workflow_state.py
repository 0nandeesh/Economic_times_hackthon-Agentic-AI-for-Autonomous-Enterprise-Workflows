from __future__ import annotations

from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime


class Task(BaseModel):
    id: str
    title: str
    owner: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Literal["low", "medium", "high"] = "medium"
    status: Literal["pending", "in_progress", "done", "blocked", "delayed"] = "pending"
    dependencies: List[str] = []
    reason: Optional[str] = None


class Event(BaseModel):
    id: str
    type: str
    timestamp: datetime
    data: Dict[str, Any]


class AuditLog(BaseModel):
    id: str
    timestamp: datetime
    agent: str
    action: str
    details: Dict[str, Any]
    reasoning: str


class WorkflowState(BaseModel):
    tasks: List[Task] = []
    events: List[Event] = []
    health_score: int = 100
    status: Literal["healthy", "risk", "critical"] = "healthy"

