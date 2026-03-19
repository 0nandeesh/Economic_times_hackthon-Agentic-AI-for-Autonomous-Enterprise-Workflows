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

### 2.1 Role Communication (Data Flow Figure)

```text
User/UI
  │  (POST /process-meeting with raw notes)
  ▼
backend/main.py
  ├─ understanding_agent()  ──► parses tasks (Groq or deterministic bullet parsing)
  ├─ planning_agent()       ──► computes dependencies + critical path flags
  ├─ execution_agent()      ──► moves eligible tasks into "in_progress"
  └─ monitoring_cycle()
       ├─ monitoring_agent()  ──► derives issues (delayed, missing owner, blocked, overload, stalls)
       ├─ decision_agent()    ──► creates remediation actions (Groq + deterministic fallback)
       ├─ action_agent()      ──► mutates task owners/statuses + optionally spawns mitigation tasks
       ├─ verification_agent()──► if health degraded => rollback_agent()
       └─ build_workflow_summary() + log_action() (audit + health telemetry)

Frontend
  ├─ GET /workflow  (renders Sprint Board + Task Matrix)
  └─ GET /logs      (renders audit trail)
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

### 5. Error Handling Logic (Deterministic Fallback + Verification/Rollback)

AutoFlow is designed to be demo-safe: when the LLM is unavailable, incomplete, or wrong, the system reverts to deterministic parsing and then uses health-based verification to prevent bad mutations.

- **LLM Unavailable / Misconfigured**
  - When Groq is missing/unreachable, agents automatically use heuristic parsing and rule-based remediation.
  - The same end-to-end API calls still work: `POST /process-meeting`, `POST /simulate-delay`, `POST /inject-exception`.

- **LLM Response Parse Errors**
  - If Groq returns invalid JSON or parsing fails:
    - exceptions are caught,
    - the system records an audit entry,
    - the cycle falls back to heuristic extraction / remediation.

- **Incomplete Task Extraction (Groq truncation)**
  - For multi-bullet inputs, extraction is intentionally made deterministic:
    - if there are multiple bullet lines (>= 2), the Understanding step skips Groq and uses bullet parsing directly.
  - If Groq extraction returns fewer tasks than the number of detected bullet lines, the system falls back to the heuristic parser (and logs `bullet_count_mismatch`).

- **Missing Owner Handling**
  - Monitoring detects tasks where `owner` is empty/`None` and flags them as `missing_owner_tasks`.
  - The Decision Agent forces a `reassign` action for these tasks (instead of “extend deadline”), and infers a role from title keywords:
    - testing/QA/quality -> `Testing`
    - design/creative/UI/UX -> `Design Team`
    - deploy/deployment/release/ship -> `Deployment`
    - marketing/campaign/ads -> `Marketing`
  - The Action Agent sanitizes invalid `recommended_owner` values so the sprint board never renders “No team member …” style placeholders.

- **Health-Based Safety Rollback**
  - After Action Agent mutations, a verification step compares workflow health before vs. after remediation.
  - If health degraded, the system restores a pre-mutation snapshot via the Rollback Agent (and records the rollback in the audit trail).

- **Workflow Errors**
  - If the Action Agent cannot find the task id referenced in a decision, it skips the mutation and continues.
  - The monitoring cycle recomputes SLA/delay/health so transient issues self-heal on the next sweep.

- **Frontend/API Errors**
  - Frontend surfaces API failures.
  - Backend uses FastAPI request/response validation and returns standard HTTP errors when a call fails before agents execute.

### 6. Monitoring & Remediation Loop Summary

At the heart of the architecture is the health sweep + remediation loop (implemented in `backend/main.py` via `monitoring_cycle()`):

```text
monitoring_cycle():
    issues = monitoring_agent(state) → scan workflow (delays, missing owners, blocked, overload, stalls)
    decisions = decision_agent(issues, state) → propose remediation actions (Groq + deterministic fallback)
    action_agent(decisions, state) → mutate owners/status/deadlines/spawn mitigation
    build_workflow_summary(state) → compute summary + write audit telemetry
```

This loop is called:

- Once after a new meeting is processed.
- Again after simulated delays are triggered.
- Can be extended to run on a timer or webhook in a production system.

