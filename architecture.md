## AutoFlow AI — Architecture Document

### 1. High-Level System Overview

AutoFlow AI is a **multi-agent, database-free workflow engine** that converts unstructured meeting input into an executable workflow, monitors its health, and self-corrects using LLM-powered agents.  
All state is held in memory in the backend during a session and visualized in a lightweight React frontend.

```text
React Frontend (dashboard)
    └─> FastAPI Backend (workflow API)
            ├─> Agents (Understanding, Planning, Monitoring, Decision, Action)
            ├─> Core (State, Store, Orchestrator, Executor)
            ├─> Services (Groq LLM)
            └─> In-memory Store (workflow + audit logs)
```

### 2. Component Diagram (Logical)

```text
             ┌───────────────────┐
             │   React Frontend  │
             │  - Meeting Input  │
             │  - Tasks View     │
             │  - Health Chip    │
             │  - Audit Log      │
             └────────┬──────────┘
                      │ HTTP (JSON)
                      ▼
           ┌────────────────────────┐
           │     FastAPI Backend    │
           │  (main app + router)   │
           └────────┬───────────────┘
                    │
         ┌──────────┼───────────────────────────────┐
         ▼          ▼                               ▼
 ┌────────────┐┌──────────────┐             ┌────────────────┐
 │ routes/    ││ core/        │             │ services/      │
 │ workflow_  ││ - store      │             │ - GroqService  │
 │ routes.py  ││ - state      │             └────────────────┘
 └─────┬──────┘│ - monitor    │
       │       │ - executor   │
       │       │ - orchestrator
       │       └──────────────┘
       │                ▲
       ▼                │
 ┌─────────────────────────────┐
 │ agents/                     │
 │ - understanding_agent.py    │
 │ - planning_agent.py         │
 │ - decision_agent.py         │
 │ (monitoring/execution live  │
 │  in core for simplicity)    │
 └─────────────────────────────┘
```

### 3. Agent Roles and Communication

- **Understanding Agent (`agents/understanding_agent.py`)**
  - Input: raw meeting text from `/process-meeting`.
  - Logic:
    - If Groq is configured, calls `GroqService.chat()` with a structured prompt to extract tasks (title, owner, deadline) as JSON.
    - If Groq is not available or parsing fails, falls back to deterministic parsing (each `-` line becomes a task, `(Owner)` is parsed as owner).
  - Output: list of `Task` objects stored in `WorkflowState.tasks`.
  - Logging: writes an `AuditLog` entry with counts and reasoning.

- **Planning Agent (`agents/planning_agent.py`)**
  - Input: list of tasks from Understanding Agent.
  - Logic: assigns priorities (high/medium/low) and sequential dependencies (`task[i]` depends on `task[i-1]`).
  - Output: enriched `Task` list.
  - Logging: logs which tasks were planned and how.

- **Execution Agent (`core/executor.py`)**
  - Input: `WorkflowState`.
  - Logic: moves tasks from `pending` → `in_progress` when dependencies are completed (or when they have none).
  - Output: updated task statuses in `WorkflowState`.
  - Logging: records assignment and status transitions.

- **Monitoring Agent (`core/monitor.py`)**
  - Input: `WorkflowState`.
  - Logic:
    - Checks for:
      - Missed deadlines → mark as `delayed`.
      - Missing owners → track for auto-assignment.
      - Explicitly blocked tasks.
    - Computes:
      - `health_score = max(0, 100 - delayed_tasks * 10)`.
      - `status ∈ {healthy, risk, critical}` based on `health_score`.
  - Output: `issues` dict with lists of task IDs for each problem type.
  - Logging: logs detected issues and the new health score.

- **Decision Agent (`agents/decision_agent.py`)**
  - Input: `issues` + `WorkflowState`.
  - Logic:
    - If Groq is configured:
      - Asks LLM: “Given these tasks and issues, output actions as JSON objects with type + task_id (+ optional owner).”
      - Parses response into a list of decisions; on error, falls back.
    - Fallback rule-based logic:
      - Delayed tasks → `reassign`.
      - Missing owners → `auto_assign` to `AutoFlow Bot`.
      - Blocked tasks → `escalate`.
  - Output: list of decisions consumed by Action Agent.
  - Logging: records LLM decisions or rule-based decisions with full reasoning.

- **Action Agent (`core/executor.py`)**
  - Input: list of decisions, `WorkflowState`.
  - Logic:
    - `reassign` → change `owner` to `AutoFlow Bot`.
    - `auto_assign` → set `owner` where missing.
    - `escalate` → mark escalation (for now, just audit entry).
  - Output: mutated `WorkflowState`.
  - Logging: detailed before/after for owners and escalation info.

- **Audit Agent (`core/audit.py`)**
  - Centralized `AuditStore` used by all agents via `STORE.audit`.
  - Every agent writes `AuditLog` entries: `agent`, `action`, `details`, `reasoning`, `timestamp`.

### 4. Tool Integrations

- **Groq LLM (`services/GroqService`)**
  - Configured via `.env` (`GROQ_API_KEY`) and `Settings`.
  - Exposed as `STORE.groq`, so any agent can use LLM capability while keeping a consistent interface.
  - Used by:
    - Understanding Agent → meeting → structured tasks.
    - Decision Agent → issues + tasks → remediation strategy.

- **React + Tailwind Frontend**
  - Calls backend APIs via `fetch`:
    - `POST /process-meeting`
    - `GET /workflow`
    - `POST /simulate-delay`
    - `GET /logs`
  - Displays:
    - Workflow tasks and statuses.
    - Health chip and score.
    - Ordered audit log of multi-agent decisions.

### 5. Error Handling and Failure Modes

- **LLM Unavailable or Misconfigured**
  - `GroqService.is_configured()` returns `False` if no API key.
  - Understanding / Decision agents detect this and **fall back** to deterministic heuristics.
  - System still works end-to-end without LLM, preserving robustness.

- **LLM Response Parse Errors**
  - When JSON parsing of Groq responses fails:
    - Exceptions are caught.
    - Agents log an `AuditLog` entry describing the failure.
    - They revert to rule-based fallback behavior for that cycle.

- **Workflow Errors**
  - If a task cannot be found for a decision, Action Agent skips it and logs an error-like audit entry.
  - Deadlines and statuses are recomputed every monitoring cycle, so transient issues are self-healing once input is corrected.

- **Frontend/API Errors**
  - Frontend shows error banners when API calls fail.
  - Backend returns standard HTTP error responses (via FastAPI) if something goes wrong before the agents run.

### 6. Monitoring Loop Summary

At the heart of the architecture is a continuous monitoring loop, implemented in `core/orchestrator.py`:

```text
monitoring_cycle():
    issues = Monitoring Agent → scan workflow
    decisions = Decision Agent → propose actions (Groq + fallback)
    Action Agent → apply decisions to WorkflowState
    Audit Agent → log everything
```

This loop is called:

- Once after a new meeting is processed.
- Again after simulated delays are triggered.
- Can be extended to run on a timer or webhook in a production system.

